import { useCallback, useEffect } from 'react'
import { AuthPage } from './components/auth/AuthPage'
import { AiCreditsHinweisePage } from './components/homepage/AiCreditsHinweisePage'
import { HomepagePage } from './components/homepage/HomepagePage'
import { TranslationProvider } from './context/TranslationContext'
import { WorkspaceSessionProvider } from './context/WorkspaceSessionContext'
import { useAuth } from './context/AuthContext'
import { useLanguageSettings } from './hooks/useLanguageSettings'
import { usePrivacySettings } from './hooks/usePrivacySettings'
import { isAppRoute, isPublicRoute, useAppRouter } from './hooks/useAppRouter'
import { resolveLocaleFromHost } from './config/domainConfig'
import { getEffectiveHostname } from './utils/resolveHostname'
import { DEFAULT_CASE_ID } from './utils/caseContext'
import { CaseWorkspacePage } from './components/CaseWorkspacePage'
import { DashboardPage } from './components/dashboard/DashboardPage'
import { KbAdminPage } from './components/kb-admin/KbAdminPage'
import { AuditDebugPage } from './components/audit/AuditDebugPage'
import { useAuditDebugAccess } from './hooks/useAuditDebugAccess'
import { useSystemAdminAccess } from './hooks/useSystemAdminAccess'
import { DiscussCaseInvitePage } from './components/discuss-case/DiscussCaseInvitePage'
import { ConsultantDashboard } from './components/consultation/ConsultantDashboard'
import { ConsultationInvitePage } from './components/consultation/ConsultationInvitePage'
import { ClinicalVorlageBuilderPage } from './components/templates/clinical/ClinicalVorlageBuilderPage'
import { TeamSettingsPage } from './components/settings/TeamSettingsPage'
import { TeamInvitePage } from './components/settings/TeamInvitePage'
import { useConsultationRole } from './hooks/useConsultationRole'
import { useEnterpriseFeatures } from './hooks/useEnterpriseFeatures'
import { isEnterpriseOrgHierarchyEnabled } from './utils/featureFlags'
import { translateUi } from './data/uiTranslations'
import { ensureDefaultCase, hydrateCaseRegistry } from './hooks/useCaseRegistry'
import { inferAccountIdentifierStorageFromServer } from './utils/accountBackup'
import { EnterpriseDashboard } from './components/enterprise/EnterpriseDashboard'
import { EnterpriseSitesPage } from './components/enterprise/EnterpriseSitesPage'
import { EnterpriseCompliancePage } from './components/enterprise/EnterpriseCompliancePage'
import { EnterpriseIntegrationsPage } from './components/enterprise/EnterpriseIntegrationsPage'
import { EnterpriseSsoPlaceholder } from './components/enterprise/EnterpriseSsoPlaceholder'
import { CreditsDashboardPage } from './components/settings/CreditsDashboardPage'
import { IntegrationsPage } from './components/settings/IntegrationsPage'
import { CalendarPage } from './components/calendar/CalendarPage'
import { TodoPage } from './components/todos/TodoPage'
import { AskButterflyProvider } from './contexts/AskButterflyContext'
import { AskButterflyShell } from './components/notion/AskButterflyShell'
import { redirectToCanonicalAppIfNeeded } from './utils/canonicalAppRedirect'

const ENTERPRISE_ROUTES_ENABLED = isEnterpriseOrgHierarchyEnabled()

export default function App() {
  const languageSettings = useLanguageSettings()
  const privacy = usePrivacySettings()
  const { route, navigate } = useAppRouter()
  const { user, loading: authLoading, isConfigured, plan } = useAuth()
  const hasSystemAdminAccess = useSystemAdminAccess()
  const hasAuditDebugAccess = useAuditDebugAccess()
  const { isRestrictedConsultant } = useConsultationRole()
  const { canAccessEnterpriseUi } = useEnterpriseFeatures()

  const isEnterpriseRoute =
    ENTERPRISE_ROUTES_ENABLED &&
    (route.view === 'enterprise' ||
      route.view === 'enterprise-sites' ||
      route.view === 'enterprise-compliance' ||
      route.view === 'enterprise-integrations' ||
      route.view === 'enterprise-sso')

  // Local-dev convenience ONLY: skip the Supabase login when running an unconfigured
  // `vite dev` server. `import.meta.env.DEV` is statically `false` in a production
  // (`vite build`) bundle, so this whole branch is tree-shaken out of the shipped app.
  // Gating on DEV — not merely on `!isConfigured` — guarantees a production build can
  // NEVER drop a visitor into an authenticated account without a real Supabase session,
  // even if it was built/deployed without the VITE_SUPABASE_* env vars.
  const allowDevNoAuthEntry = import.meta.env.DEV && !isConfigured

  useEffect(() => {
    // The registry is encrypted-at-rest, so it must be decrypted asynchronously before the
    // default case is ensured — a synchronous `ensureDefaultCase()` here would read an empty
    // (not-yet-hydrated) map and overwrite the stored ciphertext with just the default case.
    void hydrateCaseRegistry().finally(() => ensureDefaultCase())
  }, [])

  useEffect(() => {
    if (!user?.id) return
    void inferAccountIdentifierStorageFromServer()
  }, [user?.id])

  useEffect(() => {
    if (authLoading) return
    // In a dev no-auth build the guard is intentionally skipped. In every production
    // build (configured OR not) the guard runs, so an unauthenticated visitor on an app
    // route is always bounced to /login instead of reaching authenticated UI.
    if (allowDevNoAuthEntry) return

    const onAppRoute = isAppRoute(route)
    const onAuthPage = route.view === 'login' || route.view === 'signup'

    if (!user && onAppRoute) {
      const redirect = encodeURIComponent(
        `${window.location.pathname}${window.location.search}`,
      )
      navigate(`/login?redirect=${redirect}`, true)
      return
    }

    if (user && route.view === 'audit-debug' && !hasAuditDebugAccess) {
      navigate('/dashboard', true)
    }

    if (user && route.view === 'kb-admin' && !hasSystemAdminAccess) {
      navigate('/dashboard', true)
    }

    if (user && isEnterpriseRoute && !canAccessEnterpriseUi) {
      navigate('/dashboard', true)
    }

    if (user && isRestrictedConsultant) {
      const allowed =
        route.view === 'consultant' ||
        route.view === 'consultant-invite' ||
        route.view === 'login' ||
        route.view === 'signup'
      if (!allowed) {
        navigate('/consultant/requests', true)
      }
    }

    if (user && onAuthPage) {
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect')
      const destination = redirect && redirect.startsWith('/') ? redirect : '/dashboard'
      if (redirectToCanonicalAppIfNeeded(destination)) return
      navigate(destination, true)
    }
  }, [allowDevNoAuthEntry, authLoading, canAccessEnterpriseUi, hasAuditDebugAccess, hasSystemAdminAccess, isEnterpriseRoute, isRestrictedConsultant, navigate, route, user])

  const showDashboard = route.view === 'dashboard'
  const showKbAdmin = route.view === 'kb-admin'
  const showAuditDebug = route.view === 'audit-debug'
  const showTemplates = route.view === 'templates'
  const showTeamSettings = route.view === 'team-settings'
  const showIntegrations = route.view === 'integrations'
  const showCredits = route.view === 'credits'
  const showCalendar = route.view === 'calendar'
  const showTodos = route.view === 'todos'
  const showTeamInvite = route.view === 'team-invite'
  const showDiscussInvite = route.view === 'discuss-invite'
  const showConsultantInvite = route.view === 'consultant-invite'
  const showConsultant = route.view === 'consultant'
  const caseId = route.view === 'case' ? route.caseId : DEFAULT_CASE_ID
  const discussId = route.view === 'case' ? route.discussId : undefined
  const discussMode = route.view === 'case' ? route.discussMode : false
  const konsilId = route.view === 'case' ? route.konsilId : undefined
  const konsilMode = route.view === 'case' ? route.konsilMode : false
  const consultantRequestId = route.view === 'consultant' ? route.requestId : undefined
  const appointmentId = route.view === 'case' ? route.appointmentId : undefined
  const showEnterprise = ENTERPRISE_ROUTES_ENABLED && route.view === 'enterprise'
  const showEnterpriseSites = ENTERPRISE_ROUTES_ENABLED && route.view === 'enterprise-sites'
  const showEnterpriseCompliance = ENTERPRISE_ROUTES_ENABLED && route.view === 'enterprise-compliance'
  const showEnterpriseIntegrations = ENTERPRISE_ROUTES_ENABLED && route.view === 'enterprise-integrations'
  const showEnterpriseSso = ENTERPRISE_ROUTES_ENABLED && route.view === 'enterprise-sso'

  const handleNavigateHome = useCallback(() => {
    if (route.view === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    navigate('/dashboard')
  }, [navigate, route.view])

  // Public/pre-auth pages (marketing homepage, AI-credits notice, login, signup)
  // render in the locale of the request domain — psychiatry.ink → en,
  // psychiatrie.ink → de — matching the server-rendered <html lang> shell so there
  // is no German-then-English flash. This is deliberately decoupled from the
  // persisted app UI-language pin (`languageSettings.language`): a stale or
  // unrelated localStorage pin must never override the domain for a public visitor.
  // The authenticated app below still honours the user's chosen language.
  const activeUiLanguage = isPublicRoute(route)
    ? resolveLocaleFromHost(getEffectiveHostname())
    : languageSettings.language

  // Keep <html lang> in sync with the language actually rendered. On public
  // routes this is the domain locale (above), so a stale UI-language pin can
  // never leave psychiatry.ink advertising lang="de" while showing English.
  useEffect(() => {
    document.documentElement.lang =
      activeUiLanguage === 'en'
        ? languageSettings.englishVariant === 'us'
          ? 'en-US'
          : 'en-GB'
        : activeUiLanguage
  }, [activeUiLanguage, languageSettings.englishVariant])

  const publicPageProps = {
    onLogin: () => navigate('/login'),
    onNavigate: navigate,
    isAuthenticated: Boolean(user),
    showDevEntry: allowDevNoAuthEntry,
    onEnterApp: allowDevNoAuthEntry ? () => navigate('/dashboard') : undefined,
  }

  if (route.view === 'landing') {
    return (
      <TranslationProvider
        language={activeUiLanguage}
        englishVariant={languageSettings.englishVariant}
      >
        <HomepagePage
          {...publicPageProps}
          onSignup={() => navigate('/signup')}
        />
      </TranslationProvider>
    )
  }

  if (route.view === 'ai-credits') {
    return (
      <TranslationProvider
        language={activeUiLanguage}
        englishVariant={languageSettings.englishVariant}
      >
        <AiCreditsHinweisePage {...publicPageProps} />
      </TranslationProvider>
    )
  }

  if (route.view === 'login' || route.view === 'signup') {
    return (
      <TranslationProvider
        language={activeUiLanguage}
        englishVariant={languageSettings.englishVariant}
      >
        <AuthPage
          mode={route.view}
          onBack={() => navigate('/')}
          onSuccess={() => {
            const params = new URLSearchParams(window.location.search)
            const redirect = params.get('redirect')
            const destination = redirect && redirect.startsWith('/') ? redirect : '/dashboard'
            if (redirectToCanonicalAppIfNeeded(destination)) return
            navigate(destination, true)
          }}
          onSwitchMode={(mode) => navigate(mode === 'login' ? '/login' : '/signup')}
        />
      </TranslationProvider>
    )
  }

  if (authLoading && isConfigured) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-secondary text-sm">
        {translateUi(languageSettings.language, 'aiUsageTrackerLoading')}
      </div>
    )
  }

  // Fail closed: an app route with no authenticated user must never render the
  // authenticated UI. The guard effect above redirects to /login; render nothing in
  // the meantime so no dashboard/case content flashes. The only exception is the
  // dev-only no-auth entry (compile-time false in production).
  if (isAppRoute(route) && !user && !allowDevNoAuthEntry) {
    return null
  }

  return (
    <TranslationProvider
      language={languageSettings.language}
      englishVariant={languageSettings.englishVariant}
    >
      <WorkspaceSessionProvider>
        <AskButterflyProvider>
          <AskButterflyShell hideGlobalTrigger={showCredits}>
        {showDiscussInvite ? (
          <DiscussCaseInvitePage
            token={route.view === 'discuss-invite' ? route.token : ''}
            onNavigate={navigate}
          />
        ) : showConsultantInvite ? (
          <ConsultationInvitePage
            token={route.view === 'consultant-invite' ? route.token : ''}
            onNavigate={navigate}
          />
        ) : showConsultant ? (
          <ConsultantDashboard requestId={consultantRequestId} onNavigate={navigate} />
        ) : showEnterprise && canAccessEnterpriseUi ? (
          <EnterpriseDashboard onNavigate={navigate} onBack={() => navigate('/dashboard')} />
        ) : showEnterpriseSites && canAccessEnterpriseUi ? (
          <EnterpriseSitesPage
            onBack={() => navigate('/dashboard/enterprise')}
            initialTab={route.view === 'enterprise-sites' ? route.tab : 'sites'}
          />
        ) : showEnterpriseCompliance && canAccessEnterpriseUi ? (
          <EnterpriseCompliancePage onBack={() => navigate('/dashboard/enterprise')} />
        ) : showEnterpriseIntegrations && canAccessEnterpriseUi ? (
          <EnterpriseIntegrationsPage onBack={() => navigate('/dashboard/enterprise')} />
        ) : showEnterpriseSso && canAccessEnterpriseUi ? (
          <EnterpriseSsoPlaceholder onBack={() => navigate('/dashboard/enterprise')} />
        ) : showAuditDebug && hasAuditDebugAccess ? (
          <AuditDebugPage onBack={() => navigate('/dashboard')} />
        ) : showKbAdmin && hasSystemAdminAccess ? (
          <KbAdminPage onBack={() => navigate('/dashboard')} />
        ) : showTemplates ? (
          <ClinicalVorlageBuilderPage onBack={() => navigate('/dashboard')} />
        ) : showTeamSettings ? (
          <TeamSettingsPage onBack={() => navigate('/dashboard')} />
        ) : showIntegrations ? (
          <IntegrationsPage onBack={() => navigate('/dashboard')} />
        ) : showCredits ? (
          <CreditsDashboardPage onBack={() => navigate('/dashboard')} />
        ) : showCalendar ? (
          <CalendarPage
            onBack={() => navigate('/dashboard')}
            onOpenCase={(caseId, apptId) => {
              let url = `/case/${encodeURIComponent(caseId)}?view=overview`
              if (apptId) url += `&appointment=${encodeURIComponent(apptId)}`
              navigate(url)
            }}
          />
        ) : showTodos ? (
          <TodoPage onBack={() => navigate('/dashboard')} />
        ) : showTeamInvite ? (
          <TeamInvitePage
            token={route.view === 'team-invite' ? route.token : ''}
            onNavigate={navigate}
          />
        ) : showDashboard ? (
          <DashboardPage
            privacy={privacy}
            languageSettings={languageSettings}
            plan={plan}
            onNavigateHome={handleNavigateHome}
            onOpenKbAdmin={() => navigate('/dashboard/kb-admin')}
            onOpenAuditDebug={() => navigate('/dev/audit-logs')}
            onOpenTemplates={() => navigate('/dashboard/templates')}
            onOpenTeamSettings={() => navigate('/dashboard/team')}
            onOpenIntegrations={() => navigate('/dashboard/integrations')}
            onOpenCredits={() => navigate('/dashboard/credits')}
            onOpenCalendar={() => navigate('/dashboard/calendar')}
            onOpenTodos={() => navigate('/dashboard/todos')}
            onOpenEnterprise={
              ENTERPRISE_ROUTES_ENABLED ? () => navigate('/dashboard/enterprise') : undefined
            }
            onOpenCase={(id, page, showPatientDashboard, appointmentId) => {
              const base = `/case/${encodeURIComponent(id)}`
              const params = new URLSearchParams()
              if (page) params.set('page', page)
              if (showPatientDashboard) params.set('view', 'overview')
              if (appointmentId) params.set('appointment', appointmentId)
              const qs = params.toString()
              navigate(qs ? `${base}?${qs}` : base)
            }}
            onOpenWorkspace={() => navigate('/workspace')}
          />
        ) : (
          <CaseWorkspacePage
            key={caseId}
            caseId={caseId}
            appointmentId={appointmentId}
            discussId={discussId}
            discussMode={discussMode}
            konsilId={konsilId}
            konsilMode={konsilMode}
            onNavigate={navigate}
            initialPage={route.view === 'case' ? route.page : undefined}
            initialShowPatientDashboard={route.view === 'case' ? route.initialView === 'overview' : false}
            onNavigateDashboard={handleNavigateHome}
            onNavigateNewCase={(id, page, showPatientDashboard, appointmentId) => {
              const base = `/case/${encodeURIComponent(id)}`
              const params = new URLSearchParams()
              if (page) params.set('page', page)
              if (showPatientDashboard) params.set('view', 'overview')
              if (appointmentId) params.set('appointment', appointmentId)
              const qs = params.toString()
              navigate(qs ? `${base}?${qs}` : base)
            }}
          />
        )}
          </AskButterflyShell>
        </AskButterflyProvider>
      </WorkspaceSessionProvider>
    </TranslationProvider>
  )
}
