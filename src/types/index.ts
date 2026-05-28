export interface SAPConnectionSettings {
  baseUrl: string
  username: string
  password: string
}

export interface ConnectionTestResult {
  success: boolean
  message?: string
  error?: string
  code?: string
  statusCode?: number
  rawResponse?: string
  endpoint?: string
  data?: unknown
}

export type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error'
