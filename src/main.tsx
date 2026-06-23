import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { OrganisationProvider } from './contexts/PermissionContext'
import { ActiveAppointmentProvider } from './contexts/ActiveAppointmentContext'
import { defaultLanguage } from './data/languages'
import { registerClinicalLanguageResolver } from './services/clinicalApiFetch'
import { loadStoredUiLanguage } from './utils/clinicalLanguage'
import { reapplyDevicePreferences } from './utils/devicePreferences'
import './styles/globals.css'
import './styles/aura-theme.css'
import './styles/action-buttons.css'
import './styles/notion-preview.css'
import './styles/case-sidebar.css'
import './styles/clinical-ui.css'
import './styles/landing.css'
import './styles/homepage.css'
import './styles/kb-admin.css'
import './styles/discuss-case.css'
import './styles/consultation.css'
import './styles/document-templates.css'
import './styles/clinical-template-builder.css'
import './styles/team-settings.css'
import './styles/budget-manager.css'
import './styles/diagnostik-befunde.css'
import './styles/audit-debug.css'
import './styles/enterprise.css'
import './styles/calendar.css'
import './styles/todos.css'
import './styles/combination-check.css'
import './styles/lab-med-correlation.css'
import './styles/medication-color.css'
import './styles/medication-minimal.css'
import './styles/prior-therapies.css'
import './styles/clinical-minimal.css'
import './styles/overview-dashboard.css'
import './styles/anforderungen.css'
import './styles/diagnosis-typography.css'
import './styles/butterfly.css'
import './styles/butterfly-logo.css'
import './styles/diagnose-minimal.css'
import './styles/ask-butterfly-chat.css'
import './styles/dokumente-inline.css'
import './styles/document-import.css'
import './styles/inline-ai-edit.css'
import './styles/clinical-intelligence.css'
import './styles/patient-panel-bordered.css'
import './styles/workspace-panel-bordered.css'
import './styles/arztbrief.css'
import './styles/medication-education.css'

registerClinicalLanguageResolver(loadStoredUiLanguage)

reapplyDevicePreferences()

try {
  document.documentElement.lang = loadStoredUiLanguage()
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
