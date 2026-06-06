import { useCallback, useEffect } from 'react'
import { TranslationProvider } from './context/TranslationContext'
import { WorkspaceSessionProvider } from './context/WorkspaceSessionContext'
import { useLanguageSettings } from './hooks/useLanguageSettings'
import { usePrivacySettings } from './hooks/usePrivacySettings'
import { useAppRouter } from './hooks/useAppRouter'
import { DEFAULT_CASE_ID } from './utils/caseContext'
import { CaseWorkspacePage } from './components/CaseWorkspacePage'
import { DashboardPage } from './components/dashboard/DashboardPage'
import { ensureDefaultCase } from './hooks/useCaseRegistry'

export default function App() {
  const languageSettings = useLanguageSettings()
  const privacy = usePrivacySettings()
  const { route, navigate } = useAppRouter()
  const isFullTier = privacy.tier === 'full'

  useEffect(() => {
    ensureDefaultCase()
  }, [])

  const showDashboard = route.view === 'dashboard'
  const caseId = route.view === 'case' ? route.caseId : DEFAULT_CASE_ID

  const handleNavigateHome = useCallback(() => {
    if (route.view === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    navigate('/dashboard')
  }, [navigate, route.view])

  return (
    <TranslationProvider language={languageSettings.language}>
      <WorkspaceSessionProvider>
        {showDashboard ? (
          <DashboardPage
            privacy={privacy}
            languageSettings={languageSettings}
            onNavigateHome={handleNavigateHome}
            onOpenCase={(id, page) => {
              const base = `/case/${encodeURIComponent(id)}`
              navigate(page ? `${base}?page=${encodeURIComponent(page)}` : base)
            }}
          />
        ) : (
          <CaseWorkspacePage
            key={caseId}
            caseId={caseId}
            initialPage={route.view === 'case' ? route.page : undefined}
            onNavigateDashboard={handleNavigateHome}
            onNavigateNewCase={
              isFullTier
                ? (id, page) => {
                    const base = `/case/${encodeURIComponent(id)}`
                    navigate(page ? `${base}?page=${encodeURIComponent(page)}` : base)
                  }
                : undefined
            }
          />
        )}
      </WorkspaceSessionProvider>
    </TranslationProvider>
  )
}
