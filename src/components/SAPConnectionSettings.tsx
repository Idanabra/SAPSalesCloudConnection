import { useState, useEffect } from 'react'
import type { SAPConnectionSettings, ConnectionStatus, ConnectionTestResult } from '../types'
import { testSAPConnection, loadSettings, saveSettings } from '../services/sapConnectionService'
import styles from './SAPConnectionSettings.module.css'

interface Props {
  onSave?: (settings: SAPConnectionSettings) => void
}

export function SAPConnectionSettings({ onSave }: Props) {
  const [baseUrl, setBaseUrl] = useState('my1001209.de1.demo.crm.cloud.sap')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [saved, setSaved] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    const stored = loadSettings()
    if (stored.baseUrl) setBaseUrl(stored.baseUrl)
    if (stored.username) setUsername(stored.username)
    if (stored.password) setPassword(stored.password)
  }, [])

  const markDirty = () => {
    setSaved(false)
    setIsDirty(true)
  }

  const handleTest = async () => {
    if (!baseUrl.trim() || !username.trim() || !password) {
      setTestResult({
        success: false,
        code: 'VALIDATION',
        error: 'Please fill in all fields before testing the connection.',
      })
      return
    }
    setStatus('testing')
    setTestResult(null)

    const result = await testSAPConnection({ baseUrl, username, password })
    setTestResult(result)
    setStatus(result.success ? 'success' : 'error')
  }

  const handleSave = () => {
    const settings: SAPConnectionSettings = { baseUrl, username, password }
    saveSettings(settings)
    setSaved(true)
    setIsDirty(false)
    onSave?.(settings)
  }

  const isTesting = status === 'testing'
  const canTest = baseUrl.trim() && username.trim() && password.length > 0

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.sapLogo}>SAP</span>
        <div>
          <h2 className={styles.title}>SAP Sales Cloud Connection</h2>
          <p className={styles.subtitle}>Configure your SAP Sales Cloud credentials</p>
        </div>
      </div>

      <div className={styles.form}>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="baseUrl">
            Base URL
          </label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputPrefix}>https://</span>
            <input
              id="baseUrl"
              type="text"
              className={styles.inputWithPrefix}
              value={baseUrl}
              onChange={(e) => { setBaseUrl(e.target.value); markDirty() }}
              placeholder="my1001209.de1.demo.crm.cloud.sap"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <span className={styles.hint}>
            Your SAP Sales Cloud tenant hostname (without https://)
          </span>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            className={styles.input}
            value={username}
            onChange={(e) => { setUsername(e.target.value); markDirty() }}
            placeholder="Enter SAP username"
            autoComplete="username"
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <div className={styles.passwordWrapper}>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className={styles.inputPassword}
              value={password}
              onChange={(e) => { setPassword(e.target.value); markDirty() }}
              placeholder="Enter SAP password"
              autoComplete="current-password"
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <span className={styles.hint}>
            Credentials are transmitted via HTTP Basic Authentication
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={handleTest}
          disabled={isTesting || !canTest}
        >
          {isTesting ? (
            <>
              <Spinner /> Testing…
            </>
          ) : (
            <>
              <ConnectIcon /> Test Connection
            </>
          )}
        </button>

        <button
          type="button"
          className={`${styles.btn} ${styles.btnSave} ${saved ? styles.btnSaved : ''}`}
          onClick={handleSave}
          disabled={!isDirty && !saved}
        >
          {saved ? (
            <>
              <CheckIcon /> Saved
            </>
          ) : (
            <>
              <SaveIcon /> Save Settings
            </>
          )}
        </button>
      </div>

      {testResult && (
        <div className={`${styles.result} ${testResult.success ? styles.resultSuccess : styles.resultError}`}>
          <div className={styles.resultHeader}>
            {testResult.success ? (
              <>
                <CheckCircleIcon className={styles.iconSuccess} />
                <strong>Connection successful</strong>
              </>
            ) : (
              <>
                <ErrorCircleIcon className={styles.iconError} />
                <strong>Connection failed</strong>
              </>
            )}
            {testResult.statusCode && (
              <span className={styles.statusBadge}>HTTP {testResult.statusCode}</span>
            )}
          </div>

          <p className={styles.resultMessage}>
            {testResult.success ? testResult.message : testResult.error}
          </p>

          {testResult.code && !testResult.success && (
            <div className={styles.errorDetail}>
              <DetailRow label="Error Code" value={testResult.code} />
              {testResult.endpoint && (
                <DetailRow label="Endpoint" value={testResult.endpoint} mono />
              )}
              {testResult.rawResponse && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>SAP Response</span>
                  <pre className={styles.rawResponse}>{testResult.rawResponse}</pre>
                </div>
              )}
            </div>
          )}

          {testResult.success && testResult.data != null && (
            <details className={styles.dataDetails}>
              <summary className={styles.dataSummary}>View response data</summary>
              <pre className={styles.rawResponse}>
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}:</span>
      <span className={mono ? styles.detailValueMono : styles.detailValue}>{value}</span>
    </div>
  )
}

// ── Inline SVG icons ────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

function ConnectIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function ErrorCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}
