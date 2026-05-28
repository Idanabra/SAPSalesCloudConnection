import type { SAPConnectionSettings, ConnectionTestResult } from '../types'

/**
 * Whether we are running as a fully static site (GitHub Pages / no Express backend).
 * In that mode we call SAP directly from the browser using Basic Auth.
 * In dev/production-with-backend mode we call our own /api route (no CORS issue).
 */
const IS_STATIC = import.meta.env.PROD && !import.meta.env.VITE_HAS_BACKEND

export async function testSAPConnection(
  settings: SAPConnectionSettings
): Promise<ConnectionTestResult> {
  return IS_STATIC
    ? testDirect(settings)
    : testViaBackend(settings)
}

// ── Via Express backend (dev or self-hosted production) ─────────────────────

async function testViaBackend(
  settings: SAPConnectionSettings
): Promise<ConnectionTestResult> {
  let response: Response
  try {
    response = await fetch('/api/sap/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseUrl: settings.baseUrl.trim(),
        username: settings.username.trim(),
        password: settings.password,
      }),
    })
  } catch (networkErr) {
    return {
      success: false,
      code: 'CLIENT_NETWORK_ERROR',
      error: `Cannot reach the local server: ${(networkErr as Error).message}. Make sure the backend is running.`,
    }
  }

  try {
    return (await response.json()) as ConnectionTestResult
  } catch {
    return {
      success: false,
      code: 'PARSE_ERROR',
      error: `Server returned an unreadable response (HTTP ${response.status}).`,
    }
  }
}

// ── Direct browser fetch (GitHub Pages / static) ────────────────────────────

async function testDirect(
  settings: SAPConnectionSettings
): Promise<ConnectionTestResult> {
  const normalizedBase = settings.baseUrl.trim().replace(/\/+$/, '')
  const endpoint = `https://${normalizedBase}/sap/c4c/api/v1/account-service/accounts?$top=1`
  const basicToken = btoa(`${settings.username.trim()}:${settings.password}`)

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${basicToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    })
  } catch (err) {
    const msg = (err as Error).message || String(err)
    const isTimeout = msg.toLowerCase().includes('timeout') || (err as Error).name === 'TimeoutError'
    const isCors =
      msg.toLowerCase().includes('cors') ||
      msg.toLowerCase().includes('failed to fetch') ||
      msg.toLowerCase().includes('network')

    if (isCors && !isTimeout) {
      return {
        success: false,
        code: 'CORS_BLOCKED',
        error:
          'The browser blocked the request (CORS). ' +
          'To fix this either: (1) run the app locally with npm run dev so requests go through the Express backend, ' +
          'or (2) ask your SAP administrator to add this origin to the allowed CORS origins on the tenant.',
        endpoint,
      }
    }
    return {
      success: false,
      code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      error: isTimeout
        ? `Request timed out after 15 s. Check that the SAP host is reachable: ${normalizedBase}`
        : `Network error: ${msg}`,
      endpoint,
    }
  }

  const statusCode = response.status
  let bodyText = ''
  try { bodyText = await response.text() } catch { /* ignore */ }

  if (statusCode === 200 || statusCode === 201) {
    let data: unknown = null
    try { data = JSON.parse(bodyText) } catch { /* ignore */ }
    return { success: true, message: 'Connection successful', statusCode, data }
  }

  const detail = mapSapError(statusCode, bodyText)
  return {
    success: false,
    error: detail.message,
    code: detail.code,
    statusCode,
    rawResponse: bodyText.slice(0, 2000),
    endpoint,
  }
}

// ── Error mapping ────────────────────────────────────────────────────────────

function mapSapError(status: number, body: string): { code: string; message: string } {
  switch (status) {
    case 401:
      return { code: 'UNAUTHORIZED', message: 'Authentication failed (401). The username or password is incorrect, or the user does not have API access.' }
    case 403:
      return { code: 'FORBIDDEN', message: 'Access forbidden (403). The user exists but does not have permission to access the Accounts API. Check user roles in SAP Sales Cloud.' }
    case 404:
      return { code: 'NOT_FOUND', message: 'Endpoint not found (404). Verify the Base URL is correct and the Account Service API is available on this tenant.' }
    case 429:
      return { code: 'RATE_LIMITED', message: 'Too many requests (429). The SAP API rate limit has been reached. Try again later.' }
    case 500:
      return { code: 'SAP_SERVER_ERROR', message: `SAP internal server error (500). ${extractSapMessage(body)}` }
    case 503:
      return { code: 'SERVICE_UNAVAILABLE', message: 'SAP Sales Cloud service is temporarily unavailable (503). Try again in a few minutes.' }
    default:
      return { code: `HTTP_${status}`, message: `Unexpected response from SAP (HTTP ${status}). ${extractSapMessage(body)}` }
  }
}

function extractSapMessage(body: string): string {
  if (!body) return ''
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>
    const err = parsed?.error as Record<string, unknown> | undefined
    const msg = err?.message as Record<string, unknown> | string | undefined
    return (
      (typeof msg === 'object' ? (msg?.value as string) : msg) ||
      (parsed?.message as string) ||
      ''
    )
  } catch {
    return body.slice(0, 300)
  }
}

// ── Settings persistence ─────────────────────────────────────────────────────

const STORAGE_KEY = 'sap_connection_settings'

export function loadSettings(): Partial<SAPConnectionSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<SAPConnectionSettings>
  } catch {
    return {}
  }
}

export function saveSettings(settings: SAPConnectionSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function clearSettings(): void {
  localStorage.removeItem(STORAGE_KEY)
}
