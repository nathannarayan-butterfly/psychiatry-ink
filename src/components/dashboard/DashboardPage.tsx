import {
  Activity,
  ArrowRight,
  Clock,
  Download,
  LayoutGrid,
  List,
  Palette,
  PenLine,
  Plus,
  Search,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useWorkspaceSession } from '../../context/WorkspaceSessionContext'
import { NOTION_PAGES } from '../notion/notionPages'
import type { NotionPageId } from '../notion/notionPages'
import { useAssessmentStandardSettings } from '../../hooks/useAssessmentStandardSettings'
import { useAppearanceSettings } from '../../hooks/useAppearanceSettings'
import { useAccountDisplayName } from '../../hooks/useAccountDisplayName'
import { useCaseRegistry } from '../../hooks/useCaseRegistry'
import type { DashboardCase } from '../../hooks/useCaseRegistry'
import { useCredits } from '../../hooks/useCredits'
import { useKiInstructions } from '../../hooks/useKiInstructions'
import { useSettingsPanel } from '../../hooks/useSettingsPanel'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { useWorkspaceVault } from '../../hooks/useWorkspaceVault'
import type { usePrivacySettings } from '../../hooks/usePrivacySettings'
import type { useLanguageSettings } from '../../hooks/useLanguageSettings'
import type { SubscriptionPlan } from '../../data/subscriptionPlans'
import { DEFAULT_CASE_ID } from '../../utils/caseContext'
import { getCaseClinicalStats } from '../../utils/dashboardCaseStats'
import { formatSiteLocaleDate } from '../../utils/siteTimezone'
import { SettingsPage } from '../settings/SettingsPage'
import { CreditsPurchaseDialog } from '../notion/CreditsPurchaseDialog'
import { IdentifierStorageOnboarding } from '../privacy/IdentifierStorageOnboarding'
import { needsIdentifierStorageOnboarding } from '../../utils/identifierStorage'
import { DashboardHinweise } from './DashboardHinweise'
import { DashboardTopBar } from './DashboardTopBar'
import { NewPatientDialog } from './NewPatientDialog'
import type { NewPatientData } from './NewPatientDialog'
import { NewCaseWorkflowDialog } from './NewCaseWorkflowDialog'
import { PatientCaseCard } from './PatientCaseCard'

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
  onOpenCase: (caseId: string, page?: NotionPageId, showPatientDashboard?: boolean) => void
  onNavigateHome?: () => void
  onOpenSettings?: () => void
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

function genderLabel(
  geschlecht: DashboardCase['localGeschlecht'],
  t: (key: 'patientGeschlechtMaennlich' | 'patientGeschlechtWeiblich' | 'patientGeschlechtDivers') => string,
): string | null {
  if (geschlecht === 'maennlich') return t('patientGeschlechtMaennlich')
  if (geschlecht === 'weiblich') return t('patientGeschlechtWeiblich')
  if (geschlecht === 'divers') return t('patientGeschlechtDivers')
  return null
}

export function DashboardPage({
  privacy,
  languageSettings,
  plan: _plan,
  onOpenCase,
  onNavigateHome,
}: DashboardPageProps) {
  const { t, language } = useTranslation()
  const displayName = useAccountDisplayName()
  const settingsPanel = useSettingsPanel()
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
  const [workflowCaseId, setWorkflowCaseId] = useState<string | null>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [patientViewMode, setPatientViewMode] = useState<PatientViewMode>('cards')
  const [showIdentifierOnboarding, setShowIdentifierOnboarding] = useState(
    () => needsIdentifierStorageOnboarding(),
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

  const patientCases = useMemo(
    () =>
      registry.cases
        .filter((caseItem) => caseItem.caseId !== DEFAULT_CASE_ID)
        .sort((a, b) => new Date(b.lastEditedAt).getTime() - new Date(a.lastEditedAt).getTime()),
    [registry.cases],
  )

  const filteredPatients = useMemo(
    () => patientCases.filter((caseItem) => matchesPatientSearch(caseItem, patientSearch)),
    [patientCases, patientSearch],
  )

  const clinicalStatsByCase = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getCaseClinicalStats>>()
    for (const caseItem of patientCases) {
      map.set(caseItem.caseId, getCaseClinicalStats(caseItem.caseId))
    }
    return map
  }, [patientCases])

  const recentActivity = useMemo(
    () => patientCases.slice(0, RECENT_ACTIVITY_LIMIT),
    [patientCases],
  )

  const lastPatient = patientCases[0] ?? null
  const todayLabel = formatSiteLocaleDate(new Date().toISOString(), language)
  const greeting = t('dashboardGreeting').replace('{name}', displayName)

  if (settingsPanel.isOpen) {
    return (
      <div className="settings-fullpage-host text-ink">
        <SettingsPage
          activeSection={settingsPanel.activeSection}
          onSectionChange={settingsPanel.setActiveSection}
          onClose={settingsPanel.closeSettings}
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
        creditBalance={creditBalance}
        creditsLoading={creditsLoading}
        onOpenCredits={() => setCreditsDialogOpen(true)}
        onOpenSettings={settingsPanel.openSettings}
        onNavigateHome={onNavigateHome}
      />

      <section className="dashboard-hero" aria-labelledby="dashboard-hero-title">
        <DashboardHinweise identifierStorage={privacy.identifierStorage} />
        <div className="dashboard-hero__copy">
          <p className="dashboard-hero__date">{todayLabel}</p>
          <h1 id="dashboard-hero-title" className="dashboard-hero__title">
            {greeting.trim()}
          </h1>
          <p className="dashboard-hero__intro">
            {t(
              privacy.identifierStorage === 'account'
                ? 'dashboardIntroAccount'
                : 'dashboardIntroDevice',
            )}
          </p>
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
              className="dashboard-quick-action dashboard-quick-action--primary"
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

          <button
            type="button"
            className="dashboard-quick-action"
            onClick={() => onOpenCase(DEFAULT_CASE_ID)}
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
            className="dashboard-quick-action"
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

      <section className="dashboard-kpi-grid" aria-label={t('dashboardSectionUsage')}>
        <article className="dashboard-kpi">
          <Users className="dashboard-kpi__icon" strokeWidth={1.5} aria-hidden />
          <span className="dashboard-kpi__value">{patientCases.length}</span>
          <span className="dashboard-kpi__label">{t('dashboardStatPatients')}</span>
        </article>

        <article className="dashboard-kpi">
          <Clock className="dashboard-kpi__icon" strokeWidth={1.5} aria-hidden />
          <span className="dashboard-kpi__value">{todayTotalLabel}</span>
          <span className="dashboard-kpi__label">{t('dashboardUsageDocumentation')}</span>
          <UsageBar value={todayTotalSeconds} max={DOCUMENTATION_DAY_GOAL_SECONDS} />
        </article>

        <article className="dashboard-kpi">
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

        <article className="dashboard-kpi">
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
        ) : patientCases.length === 0 ? (
          <div className="dashboard-page__empty">
            <p className="dashboard-page__status">{t('dashboardEmpty')}</p>
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
          <div className="dashboard-page__grid">
            {filteredPatients.map((caseItem) => (
              <PatientCaseCard
                key={caseItem.caseId}
                caseItem={caseItem}
                clinicalStats={clinicalStatsByCase.get(caseItem.caseId)}
                onOpen={(caseId) => onOpenCase(caseId, undefined, true)}
              />
            ))}
          </div>
        ) : (
          <ul className="dashboard-patients-list">
            {filteredPatients.map((caseItem) => {
              const stats = clinicalStatsByCase.get(caseItem.caseId)
              const gender = genderLabel(caseItem.localGeschlecht, t)
              const details = [
                caseItem.localGeburtsdatum
                  ? formatSiteLocaleDate(caseItem.localGeburtsdatum, language)
                  : null,
                gender,
              ].filter(Boolean)

              return (
                <li key={caseItem.caseId}>
                  <button
                    type="button"
                    className="dashboard-patients-list__row"
                    onClick={() => onOpenCase(caseItem.caseId, undefined, true)}
                  >
                    <span className="dashboard-patients-list__main">
                      <span className="dashboard-patients-list__name">{caseItem.displayTitle}</span>
                      {details.length > 0 ? (
                        <span className="dashboard-patients-list__meta">{details.join(' · ')}</span>
                      ) : null}
                      {caseItem.documentTypeSummary ? (
                        <span className="dashboard-patients-list__doc">{caseItem.documentTypeSummary}</span>
                      ) : null}
                    </span>
                    {stats ? (
                      <span className="dashboard-patients-list__stats">
                        {stats.diagnoses > 0 ? `${stats.diagnoses} Dx` : null}
                        {stats.documents > 0 ? `${stats.documents} Doc` : null}
                        {stats.verlauf > 0 ? `${stats.verlauf} Verl.` : null}
                      </span>
                    ) : null}
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
        </div>
      </section>

      {showNewPatientDialog ? (
        <NewPatientDialog
          onCreated={handleNewPatientCreated}
          onCancel={() => setShowNewPatientDialog(false)}
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
