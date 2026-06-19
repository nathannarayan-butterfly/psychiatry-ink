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
import { KbAdminPage } from './components/kb-admin/KbAdminPage'
import { AuditDebugPage } from './components/audit/AuditDebugPage'
import { DemoPatientDevPage } from './components/demo/DemoPatientDevPage'
import { useAuditDebugAccess } from './hooks/useAuditDebugAccess'
import { ensureDemoPatientExists } from './demo'
import { useKbAdminAccess } from './hooks/useKbAdminAccess'
import { DiscussCaseInvitePage } from './components/discuss-case/DiscussCaseInvitePage'
import { ConsultantDashboard } from './components/consultation/ConsultantDashboard'
import { ConsultationInvitePage } from './components/consultation/ConsultationInvitePage'
import { TemplatesDashboardPage } from './components/templates/TemplatesDashboardPage'
import { TeamSettingsPage } from './components/settings/TeamSettingsPage'
import { TeamInvitePage } from './components/settings/TeamInvitePage'
import { useConsultationRole } from './hooks/useConsultationRole'
import { useEnterpriseFeatures } from './hooks/useEnterpriseFeatures'
import { isEnterpriseOrgHierarchyEnabled } from './utils/featureFlags'
import { ensureDefaultCase, hydrateCaseRegistry } from './hooks/useCaseRegistry'
import { EnterpriseDashboard } from './components/enterprise/EnterpriseDashboard'
import { EnterpriseSitesPage } from './components/enterprise/EnterpriseSitesPage'
import { EnterpriseCompliancePage } from './components/enterprise/EnterpriseCompliancePage'
import { EnterpriseIntegrationsPage } from './components/enterprise/EnterpriseIntegrationsPage'
import { EnterpriseSsoPlaceholder } from './components/enterprise/EnterpriseSsoPlaceholder'
import { BudgetManagerPage } from './components/settings/BudgetManagerPage'
import { IntegrationsPage } from './components/settings/IntegrationsPage'
import { CalendarPage } from './components/calendar/CalendarPage'
import { TodoPage } from './components/todos/TodoPage'

const ENTERPRISE_ROUTES_ENABLED = isEnterpriseOrgHierarchyEnabled()

export default function App() {
  const languageSettings = useLanguageSettings()
  const privacy = usePrivacySettings()
  const { route, navigate } = useAppRouter()
  const { user, loading: authLoading, isConfigured, plan } = useAuth()
  const hasKbAdminAccess = useKbAdminAccess()
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

  useEffect(() => {
    // The registry is encrypted-at-rest, so it must be decrypted asynchronously before the
    // default case is ensured — a synchronous `ensureDefaultCase()` here would read an empty
    // (not-yet-hydrated) map and overwrite the stored ciphertext with just the default case.
    void hydrateCaseRegistry().finally(() => ensureDefaultCase())
  }, [])

  useEffect(() => {
    if (!user?.id) return
    void ensureDemoPatientExists({
      userId: user.id,
      calendarScope: { userId: user.id, orgId: null },
    })
  }, [user?.id])

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

    if (user && route.view === 'audit-debug' && !hasAuditDebugAccess) {
      navigate('/dashboard', true)
    }

    if (user && route.view === 'demo-patient' && !hasAuditDebugAccess) {
      navigate('/dashboard', true)
    }

    if (user && route.view === 'kb-admin' && !hasKbAdminAccess) {
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
      navigate(redirect && redirect.startsWith('/') ? redirect : '/dashboard', true)
    }
  }, [authLoading, canAccessEnterpriseUi, hasAuditDebugAccess, hasKbAdminAccess, isConfigured, isEnterpriseRoute, isRestrictedConsultant, navigate, route, user])

  const showDashboard = route.view === 'dashboard'
  const showKbAdmin = route.view === 'kb-admin'
  const showAuditDebug = route.view === 'audit-debug'
  const showDemoPatient = route.view === 'demo-patient'
  const showTemplates = route.view === 'templates'
  const showTeamSettings = route.view === 'team-settings'
  const showIntegrations = route.view === 'integrations'
  const showBudget = route.view === 'budget'
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

  if (route.view === 'landing') {
    return (
      <TranslationProvider
        language={languageSettings.language}
        englishVariant={languageSettings.englishVariant}
      >
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
      <TranslationProvider
        language={languageSettings.language}
        englishVariant={languageSettings.englishVariant}
      >
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
    <TranslationProvider
      language={languageSettings.language}
      englishVariant={languageSettings.englishVariant}
    >
      <WorkspaceSessionProvider>
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
        ) : showDemoPatient && hasAuditDebugAccess ? (
          <DemoPatientDevPage onBack={() => navigate('/dashboard')} />
        ) : showKbAdmin && hasKbAdminAccess ? (
          <KbAdminPage onBack={() => navigate('/dashboard')} />
        ) : showTemplates ? (
          <TemplatesDashboardPage onBack={() => navigate('/dashboard')} />
        ) : showTeamSettings ? (
          <TeamSettingsPage onBack={() => navigate('/dashboard')} />
        ) : showIntegrations ? (
          <IntegrationsPage onBack={() => navigate('/dashboard')} />
        ) : showBudget ? (
          <BudgetManagerPage onBack={() => navigate('/dashboard')} />
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
            onOpenDemoPatient={() => navigate('/dev/demo-patient')}
            onOpenTemplates={() => navigate('/dashboard/templates')}
            onOpenTeamSettings={() => navigate('/dashboard/team')}
            onOpenIntegrations={() => navigate('/dashboard/integrations')}
            onOpenBudget={() => navigate('/dashboard/budget')}
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
      </WorkspaceSessionProvider>
    </TranslationProvider>
  )
}
