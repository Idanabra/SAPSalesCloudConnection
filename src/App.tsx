import { SAPConnectionSettings } from './components/SAPConnectionSettings'
import type { SAPConnectionSettings as SAPSettings } from './types'
import './App.css'

export default function App() {
  const handleSave = (settings: SAPSettings) => {
    console.log('Settings saved:', { ...settings, password: '***' })
  }

  return (
    <div className="appShell">
      <SAPConnectionSettings onSave={handleSave} />
    </div>
  )
}
