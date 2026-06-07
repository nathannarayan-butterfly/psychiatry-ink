import { useCallback, useEffect } from 'react'
import { AuthPage } from './components/auth/AuthPage'
import { LandingPage } from './components/landing/LandingPage'
import { TranslationProvider } from './context/TranslationContext'
import { WorkspaceSessionProvider } from './context/WorkspaceSessionContext'
import { useAuth } from './context/AuthContext'
import { useLanguageSettings } from './hooks/useLanguageSettings'
import { usePrivacySettings } from './hooks/usePrivacySettings'
import { isAppRoute, useAppRouter } from './hooks/useAppRouter'
import { DEFAULT_CASE_ID } from './utils/caseContext'
import { CaseWorkspacePage } from './components/CaseWorkspacePage'
import { DashboardPage } from './components/dashboard/DashboardPage'
import { ensureDefaultCase } from './hooks/useCaseRegistry'

export default function App() {
  const languageSettings = useLanguageSettings()
  const privacy = usePrivacySettings()
  const { route, navigate } = useAppRouter()
  const { user, loading: authLoading, isConfigured, plan } = useAuth()

  useEffect(() => {
    ensureDefaultCase()
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!isConfigured) return

    const onAppRoute = isAppRoute(route)
    const onAuthPage = route.view === 'login' || route.view === 'signup'

    if (!user && onAppRoute) {
      const redirect = encodeURIComponent(
        `${window.location.pathname}${window.location.search}`,
      )
      navigate(`/login?redirect=${redirect}`, true)
      return
    }

    if (user && onAuthPage) {
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect')
      navigate(redirect && redirect.startsWith('/') ? redirect : '/dashboard', true)
    }
  }, [authLoading, isConfigured, navigate, route, user])

  const showDashboard = route.view === 'dashboard'
  const caseId = route.view === 'case' ? route.caseId : DEFAULT_CASE_ID

  const handleNavigateHome = useCallback(() => {
    if (route.view === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    navigate('/dashboard')
  }, [navigate, route.view])

  if (route.view === 'landing') {
    return (
      <TranslationProvider language={languageSettings.language}>
        <LandingPage
          onLogin={() => navigate('/login')}
          onSignup={() => navigate('/signup')}
          showDevEntry={!isConfigured}
          onEnterApp={!isConfigured ? () => navigate('/dashboard') : undefined}
        />
      </TranslationProvider>
    )
  }

  if (route.view === 'login' || route.view === 'signup') {
    return (
      <TranslationProvider language={languageSettings.language}>
        <AuthPage
          mode={route.view}
          onBack={() => navigate('/')}
          onSuccess={() => {
            const params = new URLSearchParams(window.location.search)
            const redirect = params.get('redirect')
            navigate(redirect && redirect.startsWith('/') ? redirect : '/dashboard', true)
          }}
          onSwitchMode={(mode) => navigate(mode === 'login' ? '/login' : '/signup')}
        />
      </TranslationProvider>
    )
  }

  if (authLoading && isConfigured) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-secondary text-sm">
        Laden…
      </div>
    )
  }

  return (
    <TranslationProvider language={languageSettings.language}>
      <WorkspaceSessionProvider>
        {showDashboard ? (
          <DashboardPage
            privacy={privacy}
            languageSettings={languageSettings}
            plan={plan}
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
            onNavigateNewCase={(id, page) => {
              const base = `/case/${encodeURIComponent(id)}`
              navigate(page ? `${base}?page=${encodeURIComponent(page)}` : base)
            }}
          />
        )}
      </WorkspaceSessionProvider>
    </TranslationProvider>
  )
}
