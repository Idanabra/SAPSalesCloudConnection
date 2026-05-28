require('dotenv').config()

const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')
const path = require('path')

const app = express()
const PORT = process.env.SERVER_PORT || 3001

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000' }))
app.use(express.json())

/**
 * SAP Sales Cloud connection test endpoint.
 * The browser calls /api/sap/test-connection (same-origin in prod, Vite-proxied in dev).
 * This server makes the actual HTTPS request to SAP — no browser CORS involved.
 */
app.post('/api/sap/test-connection', async (req, res) => {
  const { baseUrl, username, password } = req.body

  if (!baseUrl || !username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: baseUrl, username, password',
      code: 'MISSING_FIELDS',
    })
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '')
  const endpoint = `https://${normalizedBase}/sap/c4c/api/v1/account-service/accounts?$top=1`

  const basicToken = Buffer.from(`${username}:${password}`).toString('base64')

  let sapResponse
  try {
    sapResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${basicToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    })
  } catch (networkErr) {
    const msg = networkErr.message || String(networkErr)
    const isTimeout = msg.toLowerCase().includes('timeout') || networkErr.type === 'request-timeout'
    return res.status(502).json({
      success: false,
      error: isTimeout
        ? `Request timed out after 15 s. Check that the SAP host is reachable: ${normalizedBase}`
        : `Network error reaching SAP host: ${msg}`,
      code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
      endpoint,
    })
  }

  const statusCode = sapResponse.status
  let bodyText = ''
  try {
    bodyText = await sapResponse.text()
  } catch (_) {
    bodyText = ''
  }

  if (statusCode === 200 || statusCode === 201) {
    let parsed = null
    try { parsed = JSON.parse(bodyText) } catch (_) {}
    return res.json({
      success: true,
      message: 'Connection successful',
      statusCode,
      data: parsed,
    })
  }

  // Map common SAP HTTP status codes to human-friendly messages
  const errorDetails = mapSapError(statusCode, bodyText)
  return res.status(200).json({
    success: false,
    error: errorDetails.message,
    code: errorDetails.code,
    statusCode,
    rawResponse: bodyText.slice(0, 2000),
    endpoint,
  })
})

// Serve built React app in production
if (process.env.NODE_ENV === 'production') {
  const clientDir = path.join(__dirname, '..', 'dist', 'client')
  app.use(express.static(clientDir))
  app.get('*', (_req, res) => res.sendFile(path.join(clientDir, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`SAP Sales Cloud server running on http://localhost:${PORT}`)
})

function mapSapError(status, body) {
  switch (status) {
    case 401:
      return {
        code: 'UNAUTHORIZED',
        message:
          'Authentication failed (401). The username or password is incorrect, or the user does not have API access.',
      }
    case 403:
      return {
        code: 'FORBIDDEN',
        message:
          'Access forbidden (403). The user exists but does not have permission to access the Accounts API. Check user roles in SAP Sales Cloud.',
      }
    case 404:
      return {
        code: 'NOT_FOUND',
        message:
          'Endpoint not found (404). Verify the Base URL is correct and the Account Service API is available on this tenant.',
      }
    case 429:
      return {
        code: 'RATE_LIMITED',
        message: 'Too many requests (429). The SAP API rate limit has been reached. Try again later.',
      }
    case 500:
      return {
        code: 'SAP_SERVER_ERROR',
        message: `SAP internal server error (500). ${extractSapMessage(body)}`,
      }
    case 503:
      return {
        code: 'SERVICE_UNAVAILABLE',
        message: 'SAP Sales Cloud service is temporarily unavailable (503). Try again in a few minutes.',
      }
    default:
      return {
        code: `HTTP_${status}`,
        message: `Unexpected response from SAP (HTTP ${status}). ${extractSapMessage(body)}`,
      }
  }
}

function extractSapMessage(body) {
  if (!body) return ''
  try {
    const parsed = JSON.parse(body)
    return (
      parsed?.error?.message?.value ||
      parsed?.error?.message ||
      parsed?.message ||
      ''
    )
  } catch (_) {
    return body.slice(0, 300)
  }
}
