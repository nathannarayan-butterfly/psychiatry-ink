import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { applyAppearanceSettings } from './data/appearancePresets'
import { defaultLanguage, languageOptions } from './data/languages'
import { defaultAppearanceSettings } from './types/settings'
import './styles/globals.css'
import './styles/notion-preview.css'
import './styles/landing.css'

const APPEARANCE_KEY = 'psychiatry-ink-appearance'
const LANGUAGE_KEY = 'psychiatry-ink-language'

try {
  const saved = localStorage.getItem(APPEARANCE_KEY)
  applyAppearanceSettings(
    saved ? { ...defaultAppearanceSettings, ...JSON.parse(saved) } : defaultAppearanceSettings,
  )
} catch {
  applyAppearanceSettings(defaultAppearanceSettings)
}

try {
  const savedLang = localStorage.getItem(LANGUAGE_KEY)
  const match = languageOptions.find((option) => option.value === savedLang)
  document.documentElement.lang = match?.value ?? defaultLanguage
} catch {
  document.documentElement.lang = defaultLanguage
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
