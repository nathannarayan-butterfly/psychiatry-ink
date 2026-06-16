import {
  Activity,
  ArrowRight,
  Clock,
  Download,
  FlaskConical,
  LayoutGrid,
  List,
  Palette,
  PenLine,
  Plus,
  Search,
  Shield,
  Sparkles,
  Building2,
  ClipboardList,
  FileText,
  Plug,
  Users,
  CalendarDays,
} from 'lucide-react'
import { useCallback, useMemo, useState, type ChangeEvent } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useWorkspaceSession } from '../../context/WorkspaceSessionContext'
import { NOTION_PAGES } from '../notion/notionPages'
import type { NotionPageId } from '../notion/notionPages'
import { useAssessmentStandardSettings } from '../../hooks/useAssessmentStandardSettings'
import { useAppearanceSettings } from '../../hooks/useAppearanceSettings'
import { useAccountDisplayName } from '../../hooks/useAccountDisplayName'
import { getCaseMeta, isListedPatientCase, useCaseRegistry } from '../../hooks/useCaseRegistry'
import type { DashboardCase } from '../../hooks/useCaseRegistry'
import { useCredits } from '../../hooks/useCredits'
import { useKiInstructions } from '../../hooks/useKiInstructions'
import { useSettingsPanel } from '../../hooks/useSettingsPanel'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { useWorkspaceVault } from '../../hooks/useWorkspaceVault'
import type { usePrivacySettings } from '../../hooks/usePrivacySettings'
import type { useLanguageSettings } from '../../hooks/useLanguageSettings'
import type { SubscriptionPlan } from '../../data/subscriptionPlans'
import { hasIntegrationCapability } from '../../data/org/planCapabilities'
import { DEFAULT_CASE_ID } from '../../utils/caseContext'
import { formatSiteLocaleDate } from '../../utils/siteTimezone'
import { SettingsPage } from '../settings/SettingsPage'
import { CreditsPurchaseDialog } from '../notion/CreditsPurchaseDialog'
import { IdentifierStorageOnboarding } from '../privacy/IdentifierStorageOnboarding'
import { needsIdentifierStorageOnboarding } from '../../utils/identifierStorage'
import { DashboardHinweise } from './DashboardHinweise'
import { DashboardTopBar } from './DashboardTopBar'
import { KnowledgeBaseTile } from './KnowledgeBase'
import { isKbAdminApiEnabled } from '../../services/kbAdminApi'
import { useKbAdminAccess } from '../../hooks/useKbAdminAccess'
import { useCurrentOrganisation } from '../../hooks/permissions'
import { setDevOrganisationTier } from '../../services/orgApi'
import { useAuditDebugAccess } from '../../hooks/useAuditDebugAccess'
import { useAuth } from '../../context/AuthContext'
import { isCaseListedOnDashboard } from '../../hooks/useDemoPatient'
import { isDemoCase } from '../../demo'
import {
  archivePatientCase,
  deletePatientCasePermanently,
  isPatientCaseArchived,
  patientCaseMetaToEditData,
} from '../../utils/casePatientLifecycle'
import { useEnterpriseFeatures } from '../../hooks/useEnterpriseFeatures'
import { NewPatientDialog } from './NewPatientDialog'
import type { NewPatientData } from './NewPatientDialog'
import { NewCaseWorkflowDialog } from './NewCaseWorkflowDialog'
import { PatientCaseCard } from './PatientCaseCard'
import { DaySchedulePanel } from '../calendar/DaySchedulePanel'

const CREDITS_DEFAULT_MAX = 500
const DOCUMENTATION_DAY_GOAL_SECONDS = 8 * 60 * 60
const AI_AUTO_MODE_KEY = 'psychiatry-ink:ai-auto-mode'
const RECENT_ACTIVITY_LIMIT = 5

type PatientViewMode = 'cards' | 'list'

function readAiAutoMode(): boolean {
  try {
    return localStorage.getItem(AI_AUTO_MODE_KEY) === 'on'
  } catch {
    return false
  }
}

type PrivacyState = ReturnType<typeof usePrivacySettings>
type LanguageState = ReturnType<typeof useLanguageSettings>

interface DashboardPageProps {
  privacy: PrivacyState
  languageSettings: LanguageState
  plan: SubscriptionPlan
  onOpenCase: (caseId: string, page?: NotionPageId, showPatientDashboard?: boolean, appointmentId?: string) => void
  /** General documentation without a patient — opens /workspace (blank NotionApp canvas, not Vorlage Builder). */
  onOpenWorkspace?: () => void
  onNavigateHome?: () => void
  onOpenSettings?: () => void
  onOpenKbAdmin?: () => void
  onOpenAuditDebug?: () => void
  onOpenDemoPatient?: () => void
  onOpenTemplates?: () => void
  onOpenTeamSettings?: () => void
  onOpenIntegrations?: () => void
  onOpenBudget?: () => void
  onOpenCalendar?: () => void
  onOpenEnterprise?: () => void
}

function UsageBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="dashboard-kpi__bar" role="presentation">
      <div className="dashboard-kpi__bar-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

function matchesPatientSearch(caseItem: DashboardCase, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    caseItem.displayTitle,
    caseItem.localName,
    caseItem.localVorname,
    caseItem.localNachname,
    caseItem.pageHeading,
    caseItem.documentTypeSummary,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

export function DashboardPage({
  privacy,
  languageSettings,
  plan: _plan,
  onOpenCase,
  onOpenWorkspace,
  onNavigateHome,
  onOpenKbAdmin,
  onOpenAuditDebug,
  onOpenDemoPatient,
  onOpenTemplates,
  onOpenTeamSettings,
  onOpenIntegrations,
  onOpenBudget,
  onOpenCalendar,
  onOpenEnterprise,
}: DashboardPageProps) {
  const { t, language } = useTranslation()
  const displayName = useAccountDisplayName()
  const { organisation, refresh: refreshOrganisation } = useCurrentOrganisation()
  const { canAccessEnterpriseUi } = useEnterpriseFeatures()
  const settingsPanel = useSettingsPanel()
  const hasKbAdminAccess = useKbAdminAccess()
  const hasAuditDebugAccess = useAuditDebugAccess()
  const { user } = useAuth()
  const userId = user?.id ?? 'anonymous'
  const appearance = useAppearanceSettings()
  const assessmentStandardSettings = useAssessmentStandardSettings()
  const kiInstructions = useKiInstructions()
  const workspaceSettings = useWorkspaceSettings()
  const [aiAutoMode, setAiAutoMode] = useState(readAiAutoMode)
  const toggleAiAutoMode = useCallback(() => {
    setAiAutoMode((previous) => {
      const next = !previous
      try {
        localStorage.setItem(AI_AUTO_MODE_KEY, next ? 'on' : 'off')
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [])
  const { balance: creditBalance, loading: creditsLoading } = useCredits()
  const { todayTotalLabel, todayTotalSeconds } = useWorkspaceSession()
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false)
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false)
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null)
  const [workflowCaseId, setWorkflowCaseId] = useState<string | null>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [patientViewMode, setPatientViewMode] = useState<PatientViewMode>('cards')
  const [showIdentifierOnboarding, setShowIdentifierOnboarding] = useState(
    () => needsIdentifierStorageOnboarding(),
  )
  const [devTierSwitching, setDevTierSwitching] = useState(false)
  const [devTierNote, setDevTierNote] = useState<string | null>(null)

  const showDevTierSwitcher =
    import.meta.env.DEV && organisation != null && organisation.tier !== 'enterprise'
  const devTierValue = organisation?.tier === 'small_praxis' ? 'small_praxis' : 'single_use'

  const handleDevTierChange = useCallback(
    async (event: ChangeEvent<HTMLSelectElement>) => {
      const tier = event.target.value as 'single_use' | 'small_praxis'
      if (tier === devTierValue || devTierSwitching) return

      setDevTierSwitching(true)
      setDevTierNote(null)
      try {
        await setDevOrganisationTier(tier)
        await refreshOrganisation()
        setDevTierNote('Dev: Modus gewechselt')
        window.setTimeout(() => setDevTierNote(null), 2200)
      } catch (err) {
        setDevTierNote(err instanceof Error ? err.message : 'Dev: Wechsel fehlgeschlagen')
      } finally {
        setDevTierSwitching(false)
      }
    },
    [devTierSwitching, devTierValue, refreshOrganisation],
  )

  const documentTypeLabel = useCallback(
    (typeId: string | undefined) => {
      if (!typeId) return ''
      const page = NOTION_PAGES.find((item) => item.documentTypeId === typeId)
      return page ? t(page.labelKey) : typeId
    },
    [t],
  )

  const fallbackTitle = useCallback(
    (shortId: string) => t('dashboardCaseFallback').replace('{id}', shortId),
    [t],
  )

  const registry = useCaseRegistry({
    tier: privacy.tier,
    countryCode: privacy.countryCode,
    documentTypeLabel,
    fallbackTitle,
  })

  const workspaceVault = useWorkspaceVault({
    caseId: DEFAULT_CASE_ID,
    tier: privacy.tier,
    countryCode: privacy.countryCode,
    getLivePatch: () => ({
      documentTypeId: '',
      pageHeading: '',
      sectionContents: {},
    }),
    documentTypeLabel,
  })

  const handleNewPatientCreated = (patient: NewPatientData) => {
    const caseId = registry.addCase()
    if (patient.name || patient.vorname || patient.nachname || patient.geburtsdatum || patient.geschlecht) {
      registry.upsertCaseMeta(caseId, {
        localName: patient.name || undefined,
        localVorname: patient.vorname || undefined,
        localNachname: patient.nachname || undefined,
        localGeburtsdatum: patient.geburtsdatum || undefined,
        localGeschlecht: patient.geschlecht || undefined,
      })
    }
    setShowNewPatientDialog(false)
    setWorkflowCaseId(caseId)
  }

  const handleWorkflowSelect = useCallback(
    (pageId: NotionPageId) => {
      if (!workflowCaseId) return
      const caseId = workflowCaseId
      setWorkflowCaseId(null)
      onOpenCase(caseId, pageId, false)
    },
    [onOpenCase, workflowCaseId],
  )

  const handleWorkflowDismiss = useCallback(() => {
    setWorkflowCaseId(null)
  }, [])

  const listedCases = useMemo(
    () =>
      registry.cases
        .filter(isListedPatientCase)
        .filter((caseItem) => isCaseListedOnDashboard(caseItem.caseId, userId))
        .sort((a, b) => new Date(b.lastEditedAt).getTime() - new Date(a.lastEditedAt).getTime()),
    [registry.cases, userId],
  )

  const activePatients = useMemo(
    () => listedCases.filter((caseItem) => !isPatientCaseArchived(caseItem.caseId, userId)),
    [listedCases, userId],
  )

  const archivedPatients = useMemo(
    () => listedCases.filter((caseItem) => isPatientCaseArchived(caseItem.caseId, userId)),
    [listedCases, userId],
  )

  const handleArchivePatient = useCallback(
    (caseId: string) => {
      archivePatientCase(caseId, userId)
      void registry.refresh()
    },
    [registry, userId],
  )

  const handleDeletePatient = useCallback(
    async (caseId: string) => {
      await deletePatientCasePermanently(caseId, userId)
      await registry.refresh()
    },
    [registry, userId],
  )

  const handleEditPatient = useCallback((caseId: string) => {
    setEditingCaseId(caseId)
  }, [])

  const handleEditPatientSaved = useCallback(
    (patient: NewPatientData) => {
      if (!editingCaseId) return
      registry.upsertCaseMeta(editingCaseId, {
        localName: patient.name || undefined,
        localVorname: patient.vorname || undefined,
        localNachname: patient.nachname || undefined,
        localGeburtsdatum: patient.geburtsdatum || undefined,
        localGeschlecht: patient.geschlecht || undefined,
      })
      setEditingCaseId(null)
      void registry.refresh()
    },
    [editingCaseId, registry],
  )

  const editingPatientData = useMemo(() => {
    if (!editingCaseId) return undefined
    return patientCaseMetaToEditData(getCaseMeta(editingCaseId))
  }, [editingCaseId, registry.cases])

  const filteredPatients = useMemo(
    () => activePatients.filter((caseItem) => matchesPatientSearch(caseItem, patientSearch)),
    [activePatients, patientSearch],
  )

  const filteredArchivedPatients = useMemo(
    () => archivedPatients.filter((caseItem) => matchesPatientSearch(caseItem, patientSearch)),
    [archivedPatients, patientSearch],
  )

  const recentActivity = useMemo(
    () => activePatients.slice(0, RECENT_ACTIVITY_LIMIT),
    [activePatients],
  )

  const lastPatient = activePatients[0] ?? null
  const todayLabel = formatSiteLocaleDate(new Date().toISOString(), language)
  const greeting = t('dashboardGreeting').replace('{name}', displayName)
  const showTeamSettingsLink =
    Boolean(onOpenTeamSettings) && organisation?.tier === 'small_praxis'
  const showIntegrationsLink =
    Boolean(onOpenIntegrations) &&
    organisation != null &&
    organisation.tier !== 'enterprise' &&
    hasIntegrationCapability(organisation.tier, 'fileImportExport')
  const showDaySchedule =
    organisation?.tier === 'small_praxis' || (import.meta.env.DEV && organisation?.tier === 'single_use')
  const handleScheduleOpenCase = useCallback(
    (caseId: string, appointmentId?: string) => {
      onOpenCase(caseId, undefined, true, appointmentId)
    },
    [onOpenCase],
  )

  function genderSymbol(geschlecht: DashboardCase['localGeschlecht']): string | null {
    if (geschlecht === 'maennlich') return '♂'
    if (geschlecht === 'weiblich') return '♀'
    if (geschlecht === 'divers') return '⚧'
    return null
  }

  if (settingsPanel.isOpen) {
    return (
      <div className="settings-fullpage-host text-ink">
        <SettingsPage
          activeSection={settingsPanel.activeSection}
          onSectionChange={settingsPanel.setActiveSection}
          onClose={settingsPanel.closeSettings}
          creditBalance={creditBalance}
          appearance={appearance}
          privacy={privacy}
          workspace={workspaceSettings}
          aiAutoMode={aiAutoMode}
          onToggleAiAuto={toggleAiAutoMode}
          kiInstructions={kiInstructions}
          language={languageSettings.language}
          englishVariant={languageSettings.englishVariant}
          onSelectLanguage={languageSettings.selectLanguage}
          onSelectEnglishVariant={languageSettings.selectEnglishVariant}
          assessmentStandard={assessmentStandardSettings.assessmentStandard}
          onSelectAssessmentStandard={assessmentStandardSettings.selectAssessmentStandard}
          workspaceVault={workspaceVault}
        />
      </div>
    )
  }

  return (
    <div className="dashboard-page text-ink">
      {showIdentifierOnboarding ? (
        <IdentifierStorageOnboarding
          initialMode={privacy.identifierStorage}
          onConfirm={privacy.setIdentifierStorage}
          onDismiss={() => setShowIdentifierOnboarding(false)}
        />
      ) : null}
      <DashboardTopBar
        onOpenSettings={settingsPanel.openSettings}
        onNavigateHome={onNavigateHome}
      />

      <section className="dashboard-hero" aria-labelledby="dashboard-hero-title">
        <DashboardHinweise identifierStorage={privacy.identifierStorage} />
        <div className="dashboard-hero__copy fade-in-up">
          <p className="dashboard-hero__date">{todayLabel}</p>
          <h1 id="dashboard-hero-title" className="dashboard-hero__title">
            {greeting.trim()}
          </h1>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="dashboard-quick-actions">
        <h2 id="dashboard-quick-actions" className="dashboard-section__heading">
          {t('dashboardQuickActions')}
        </h2>
        <div className="dashboard-quick-actions">
          {lastPatient ? (
            <button
              type="button"
              className="dashboard-quick-action dashboard-quick-action--primary clinical-card clinical-card--interactive"
              onClick={() => onOpenCase(lastPatient.caseId, undefined, true)}
            >
              <span className="dashboard-quick-action__icon-wrap" aria-hidden>
                <Activity className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="dashboard-quick-action__text">
                <span className="dashboard-quick-action__label">{t('dashboardContinuePatient')}</span>
                <span className="dashboard-quick-action__subtitle">
                  {lastPatient.displayTitle}
                  {lastPatient.documentTypeSummary ? ` · ${lastPatient.documentTypeSummary}` : ''}
                </span>
              </span>
              <ArrowRight className="dashboard-quick-action__arrow h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}

          {/* Allgemeine Dokumentation ohne Patient → /workspace (blank canvas); not patient case, not Vorlage Builder */}
          <button
            type="button"
            className="dashboard-quick-action clinical-card clinical-card--interactive"
            onClick={() => onOpenWorkspace?.()}
          >
            <span className="dashboard-quick-action__icon-wrap" aria-hidden>
              <PenLine className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="dashboard-quick-action__text">
              <span className="dashboard-quick-action__label">{t('dashboardOpenWorkspace')}</span>
              <span className="dashboard-quick-action__subtitle">{t('dashboardOpenWorkspaceSubtitle')}</span>
            </span>
          </button>

          <button
            type="button"
            className="dashboard-quick-action clinical-card clinical-card--interactive"
            onClick={() => setShowNewPatientDialog(true)}
          >
            <span className="dashboard-quick-action__icon-wrap" aria-hidden>
              <Plus className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="dashboard-quick-action__text">
              <span className="dashboard-quick-action__label">{t('dashboardNewPatient')}</span>
              <span className="dashboard-quick-action__subtitle">{t('dashboardNewPatientSubtitle')}</span>
            </span>
          </button>
        </div>
      </section>

      <section className="dashboard-kpi-grid stagger-children" aria-label={t('dashboardSectionUsage')}>
        <article className="dashboard-kpi clinical-card">
          <Users className="dashboard-kpi__icon" strokeWidth={1.5} aria-hidden />
          <span className="dashboard-kpi__value">{activePatients.length}</span>
          <span className="dashboard-kpi__label">{t('dashboardStatPatients')}</span>
        </article>

        <article className="dashboard-kpi clinical-card">
          <Clock className="dashboard-kpi__icon" strokeWidth={1.5} aria-hidden />
          <span className="dashboard-kpi__value">{todayTotalLabel}</span>
          <span className="dashboard-kpi__label">{t('dashboardUsageDocumentation')}</span>
          <UsageBar value={todayTotalSeconds} max={DOCUMENTATION_DAY_GOAL_SECONDS} />
        </article>

        <article className="dashboard-kpi clinical-card">
          <Sparkles className="dashboard-kpi__icon" strokeWidth={1.75} aria-hidden />
          {creditsLoading ? (
            <span className="dashboard-kpi__value">…</span>
          ) : (
            <button
              type="button"
              className="dashboard-kpi__value dashboard-kpi__value--btn"
              onClick={() => setCreditsDialogOpen(true)}
            >
              {creditBalance}
            </button>
          )}
          <span className="dashboard-kpi__label">{t('dashboardUsageCredits')}</span>
          <UsageBar value={creditBalance} max={CREDITS_DEFAULT_MAX} />
        </article>

        <article className="dashboard-kpi clinical-card">
          <Download className="dashboard-kpi__icon" strokeWidth={1.5} aria-hidden />
          <span
            className={[
              'dashboard-kpi__value',
              'dashboard-kpi__value--status',
              workspaceVault.showBackupReminder ? 'dashboard-kpi__value--warn' : '',
            ].join(' ').trim()}
          >
            {workspaceVault.showBackupReminder ? t('dashboardBackupNeeded') : t('dashboardBackupOk')}
          </span>
          <span className="dashboard-kpi__label">{t('dashboardBackupStatus')}</span>
          {workspaceVault.lastExportAt ? (
            <span className="dashboard-kpi__hint">
              {formatSiteLocaleDate(workspaceVault.lastExportAt, language)}
            </span>
          ) : null}
        </article>
      </section>

      <section className="dashboard-section" aria-label={t('dashboardNavCards')}>
        <div className="dashboard-nav-cards">
          {onOpenCalendar ? (
            <button type="button" className="dashboard-nav-card dashboard-nav-card--calendar clinical-card clinical-card--interactive" onClick={onOpenCalendar}>
              <span className="dashboard-nav-card__icon-wrap" aria-hidden>
                <CalendarDays className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="dashboard-nav-card__body">
                <span className="dashboard-nav-card__title">{t('dashboardCalendarCardTitle')}</span>
                <span className="dashboard-nav-card__subtitle">{t('dashboardCalendarCardSubtitle')}</span>
              </span>
              <ArrowRight className="dashboard-nav-card__arrow h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}

          <KnowledgeBaseTile />

          {onOpenTemplates ? (
            <button type="button" className="dashboard-nav-card dashboard-nav-card--templates clinical-card clinical-card--interactive" onClick={onOpenTemplates}>
              <span className="dashboard-nav-card__icon-wrap" aria-hidden>
                <FileText className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="dashboard-nav-card__body">
                <span className="dashboard-nav-card__title">{t('templateOpenBuilder')}</span>
                <span className="dashboard-nav-card__subtitle">{t('templateDashboardSubtitle')}</span>
              </span>
              <ArrowRight className="dashboard-nav-card__arrow h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </div>
      </section>

      {showDaySchedule ? (
        <DaySchedulePanel cases={activePatients} onOpenCase={handleScheduleOpenCase} />
      ) : null}

      <section className="dashboard-section" aria-labelledby="dashboard-section-patients">
        <div className="dashboard-section__header-row">
          <h2 id="dashboard-section-patients" className="dashboard-section__heading">
            {t('dashboardRecentPatients')}
          </h2>
          <div className="dashboard-patients-toolbar">
            <label className="dashboard-patients-search">
              <Search className="dashboard-patients-search__icon h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              <input
                type="search"
                className="dashboard-patients-search__input"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder={t('dashboardSearchPatients')}
                aria-label={t('dashboardSearchPatients')}
              />
            </label>
            <div className="dashboard-patients-view-toggle" role="group" aria-label={t('patientRegistryViewToggle')}>
              <button
                type="button"
                className={[
                  'dashboard-patients-view-btn',
                  patientViewMode === 'list' ? 'dashboard-patients-view-btn--active' : '',
                ].join(' ').trim()}
                onClick={() => setPatientViewMode('list')}
                aria-pressed={patientViewMode === 'list'}
                title={t('patientRegistryViewList')}
              >
                <List className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                className={[
                  'dashboard-patients-view-btn',
                  patientViewMode === 'cards' ? 'dashboard-patients-view-btn--active' : '',
                ].join(' ').trim()}
                onClick={() => setPatientViewMode('cards')}
                aria-pressed={patientViewMode === 'cards'}
                title={t('patientRegistryViewCards')}
              >
                <LayoutGrid className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {registry.loading ? (
          <p className="dashboard-page__status">{t('dashboardLoading')}</p>
        ) : activePatients.length === 0 ? (
          <div className="clinical-empty-state-card">
            <span className="clinical-empty-state-card__icon" aria-hidden>
              <Users className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <p className="clinical-empty-state-card__text">{t('dashboardEmpty')}</p>
            <button
              type="button"
              className="dashboard-page__new-btn"
              onClick={() => setShowNewPatientDialog(true)}
            >
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
              {t('dashboardNewPatient')}
            </button>
          </div>
        ) : filteredPatients.length === 0 ? (
          <p className="dashboard-page__status">{t('dashboardSearchNoResults')}</p>
        ) : patientViewMode === 'cards' ? (
          <div className="dashboard-page__grid stagger-children">
            {filteredPatients.map((caseItem) => (
              <PatientCaseCard
                key={caseItem.caseId}
                caseItem={caseItem}
                onOpen={(caseId) => onOpenCase(caseId, undefined, true)}
                onEdit={handleEditPatient}
                onArchive={handleArchivePatient}
              />
            ))}
          </div>
        ) : (
          <ul className="dashboard-patients-list">
            {filteredPatients.map((caseItem) => {
              const symbol = genderSymbol(caseItem.localGeschlecht)
              const details = [
                caseItem.localGeburtsdatum
                  ? formatSiteLocaleDate(caseItem.localGeburtsdatum, language)
                  : null,
                symbol,
              ].filter(Boolean)

              return (
                <li key={caseItem.caseId}>
                  <button
                    type="button"
                    className="dashboard-patients-list__row"
                    onClick={() => onOpenCase(caseItem.caseId, undefined, true)}
                  >
                    <span className="dashboard-patients-list__main">
                      <span className="dashboard-patients-list__name">
                        {caseItem.displayTitle}
                        {isDemoCase(caseItem.caseId) ? (
                          <span className="demo-patient-chip">{t('demoCaseLabel')}</span>
                        ) : null}
                      </span>
                      {details.length > 0 ? (
                        <span className="dashboard-patients-list__meta">{details.join(' · ')}</span>
                      ) : null}
                    </span>
                    <span className="dashboard-patients-list__date">
                      {formatSiteLocaleDate(caseItem.lastEditedAt, language)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {registry.error ? (
          <p className="dashboard-page__error" role="alert">
            {registry.error}
          </p>
        ) : null}
      </section>

      {archivedPatients.length > 0 ? (
        <>
          <div className="dashboard-section__divider" role="separator" />
          <section className="dashboard-section dashboard-section--archive" aria-labelledby="dashboard-section-archive">
            <h2 id="dashboard-section-archive" className="dashboard-section__heading">
              {t('dashboardArchiveSection')}
            </h2>
            <p className="dashboard-section__intro">{t('dashboardArchiveIntro')}</p>
            {filteredArchivedPatients.length === 0 ? (
              <p className="dashboard-page__status">{t('dashboardSearchNoResults')}</p>
            ) : (
              <div className="dashboard-page__grid">
                {filteredArchivedPatients.map((caseItem) => (
                  <PatientCaseCard
                    key={caseItem.caseId}
                    caseItem={caseItem}
                    archived
                    onOpen={(caseId) => onOpenCase(caseId, undefined, true)}
                    onDelete={(caseId) => void handleDeletePatient(caseId)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      {recentActivity.length > 0 ? (
        <>
          <div className="dashboard-section__divider" role="separator" />
          <section className="dashboard-section" aria-labelledby="dashboard-section-activity">
            <h2 id="dashboard-section-activity" className="dashboard-section__heading">
              {t('dashboardSectionActivity')}
            </h2>
            <ul className="dashboard-activity-list">
              {recentActivity.map((caseItem) => (
                <li key={caseItem.caseId}>
                  <button
                    type="button"
                    className="dashboard-activity-list__row"
                    onClick={() => onOpenCase(caseItem.caseId, undefined, true)}
                  >
                    <span className="dashboard-activity-list__main">
                      <span className="dashboard-activity-list__title">{caseItem.displayTitle}</span>
                      {caseItem.documentTypeSummary ? (
                        <span className="dashboard-activity-list__meta">{caseItem.documentTypeSummary}</span>
                      ) : null}
                    </span>
                    <span className="dashboard-activity-list__date">
                      {formatSiteLocaleDate(caseItem.lastEditedAt, language)}
                    </span>
                    <span className="dashboard-activity-list__action">{t('dashboardActivityOpen')}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      <div className="dashboard-section__divider" role="separator" />

      <section className="dashboard-section dashboard-section--compact" aria-labelledby="dashboard-section-settings">
        <h2 id="dashboard-section-settings" className="dashboard-section__heading">
          {t('dashboardSectionSettings')}
        </h2>
        <div className="dashboard-settings-chips">
          <button
            type="button"
            className="dashboard-settings-chip"
            onClick={() => settingsPanel.openSettings('privacy')}
          >
            <Shield className="dashboard-settings-chip__icon" strokeWidth={1.5} aria-hidden />
            {t('dashboardSettingsPrivacy')}
          </button>
          <button
            type="button"
            className="dashboard-settings-chip"
            onClick={() => settingsPanel.openSettings('appearance')}
          >
            <Palette className="dashboard-settings-chip__icon" strokeWidth={1.5} aria-hidden />
            {t('dashboardSettingsAppearance')}
          </button>
          <button
            type="button"
            className="dashboard-settings-chip"
            onClick={() => settingsPanel.openSettings('privacy')}
          >
            <Download className="dashboard-settings-chip__icon" strokeWidth={1.5} aria-hidden />
            {t('dashboardSettingsVault')}
          </button>
          {showTeamSettingsLink ? (
            <button
              type="button"
              className="dashboard-settings-chip"
              onClick={onOpenTeamSettings}
            >
              <Users className="dashboard-settings-chip__icon" strokeWidth={1.5} aria-hidden />
              Team-Einstellungen
            </button>
          ) : null}
          {showIntegrationsLink && onOpenIntegrations ? (
            <button
              type="button"
              className="dashboard-settings-chip"
              onClick={onOpenIntegrations}
            >
              <Plug className="dashboard-settings-chip__icon" strokeWidth={1.5} aria-hidden />
              Integrationen
            </button>
          ) : null}
          {onOpenBudget ? (
            <button type="button" className="dashboard-settings-chip" onClick={onOpenBudget}>
              <Sparkles className="dashboard-settings-chip__icon" strokeWidth={1.5} aria-hidden />
              KI-Budget
            </button>
          ) : null}
          {hasKbAdminAccess && isKbAdminApiEnabled() && onOpenKbAdmin ? (
            <button type="button" className="dashboard-settings-chip" onClick={onOpenKbAdmin}>
              <FlaskConical className="dashboard-settings-chip__icon" strokeWidth={1.5} aria-hidden />
              KB Batch Review (Admin)
            </button>
          ) : null}
          {hasAuditDebugAccess && onOpenAuditDebug ? (
            <button type="button" className="dashboard-settings-chip" onClick={onOpenAuditDebug}>
              <ClipboardList className="dashboard-settings-chip__icon" strokeWidth={1.5} aria-hidden />
              Audit Logs (Dev)
            </button>
          ) : null}
          {hasAuditDebugAccess && onOpenDemoPatient ? (
            <button type="button" className="dashboard-settings-chip" onClick={onOpenDemoPatient}>
              <FlaskConical className="dashboard-settings-chip__icon" strokeWidth={1.5} aria-hidden />
              Demo Patient QA (Dev)
            </button>
          ) : null}
          {canAccessEnterpriseUi && onOpenEnterprise ? (
            <button
              type="button"
              className="dashboard-settings-chip"
              onClick={onOpenEnterprise}
            >
              <Building2 className="dashboard-settings-chip__icon" strokeWidth={1.5} aria-hidden />
              Enterprise
            </button>
          ) : null}
          {showDevTierSwitcher ? (
            <label className="dashboard-dev-tier">
              <span className="dashboard-dev-tier__label">Dev Modus</span>
              <select
                className="dashboard-dev-tier__select"
                value={devTierValue}
                disabled={devTierSwitching}
                onChange={handleDevTierChange}
                aria-label="Entwicklermodus: Organisations-Tier wechseln"
              >
                <option value="single_use">Einzelnutzung (Single Use)</option>
                <option value="small_praxis">Kleine Praxis (Small Praxis)</option>
              </select>
            </label>
          ) : null}
        </div>
        {devTierNote ? (
          <p className="dashboard-dev-tier__note" role="status">
            {devTierNote}
          </p>
        ) : null}
      </section>

      {showNewPatientDialog ? (
        <NewPatientDialog
          onSubmit={handleNewPatientCreated}
          onCancel={() => setShowNewPatientDialog(false)}
        />
      ) : null}

      {editingCaseId && editingPatientData ? (
        <NewPatientDialog
          mode="edit"
          initialData={editingPatientData}
          onSubmit={handleEditPatientSaved}
          onCancel={() => setEditingCaseId(null)}
        />
      ) : null}

      {workflowCaseId ? (
        <NewCaseWorkflowDialog
          onSelect={handleWorkflowSelect}
          onStayOnDashboard={handleWorkflowDismiss}
          onClose={handleWorkflowDismiss}
        />
      ) : null}

      {creditsDialogOpen ? (
        <CreditsPurchaseDialog
          onClose={() => setCreditsDialogOpen(false)}
          creditsExhausted={creditBalance <= 0}
          onUpgrade={() => {
            window.location.href = '/#pricing'
          }}
        />
      ) : null}

      <footer className="dashboard-footer">
        <span className="dashboard-footer__name">Psychiatry Ink Ltd</span>
        <span className="dashboard-footer__sep">·</span>
        <span className="dashboard-footer__address">
          71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom
        </span>
        <span className="dashboard-footer__sep">·</span>
        <span className="dashboard-footer__copy">
          © {new Date().getFullYear()} Psychiatry Ink Ltd. All rights reserved.
        </span>
      </footer>
    </div>
  )
}
