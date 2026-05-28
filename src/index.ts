// Public API — import this module to use the skill in other projects
export { SAPConnectionSettings } from './components/SAPConnectionSettings'
export { testSAPConnection, loadSettings, saveSettings, clearSettings } from './services/sapConnectionService'
export type { SAPConnectionSettings as SAPConnectionSettingsType, ConnectionTestResult, ConnectionStatus } from './types'
