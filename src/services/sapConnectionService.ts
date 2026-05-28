import type { SAPConnectionSettings, ConnectionTestResult } from '../types'

/**
 * Calls the same-origin backend endpoint that makes the SAP request server-side.
 * The server handles Basic Auth and the actual HTTPS call to SAP Sales Cloud,
 * so the browser never makes a cross-origin request (no CORS issue).
 */
export async function testSAPConnection(
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
    const data = await response.json() as ConnectionTestResult
    return data
  } catch {
    return {
      success: false,
      code: 'PARSE_ERROR',
      error: `Server returned an unreadable response (HTTP ${response.status}).`,
    }
  }
}

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
