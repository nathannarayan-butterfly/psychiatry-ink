import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { OrganisationProvider } from './contexts/PermissionContext'
import { ActiveAppointmentProvider } from './contexts/ActiveAppointmentContext'
import { applyAppearanceSettings } from './data/appearancePresets'
import { defaultLanguage, languageOptions } from './data/languages'
import { registerClinicalLanguageResolver } from './services/clinicalApiFetch'
import { loadStoredUiLanguage, LANGUAGE_STORAGE_KEY } from './utils/clinicalLanguage'
import { defaultAppearanceSettings } from './types/settings'
import './styles/globals.css'
import './styles/notion-preview.css'
import './styles/clinical-ui.css'
import './styles/landing.css'
import './styles/kb-admin.css'
import './styles/discuss-case.css'
import './styles/consultation.css'
import './styles/document-templates.css'
import './styles/team-settings.css'
import './styles/diagnostik-befunde.css'
import './styles/audit-debug.css'
import './styles/enterprise.css'
import './styles/calendar.css'
import './styles/combination-check.css'
import './styles/lab-med-correlation.css'

const APPEARANCE_KEY = 'psychiatry-ink-appearance'

registerClinicalLanguageResolver(loadStoredUiLanguage)

try {
  const saved = localStorage.getItem(APPEARANCE_KEY)
  applyAppearanceSettings(
    saved ? { ...defaultAppearanceSettings, ...JSON.parse(saved) } : defaultAppearanceSettings,
  )
} catch {
  applyAppearanceSettings(defaultAppearanceSettings)
}

try {
  const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  const match = languageOptions.find((option) => option.value === savedLang)
  document.documentElement.lang = match?.value ?? defaultLanguage
} catch {
  document.documentElement.lang = defaultLanguage
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <OrganisationProvider>
          <ActiveAppointmentProvider>
            <App />
          </ActiveAppointmentProvider>
        </OrganisationProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
