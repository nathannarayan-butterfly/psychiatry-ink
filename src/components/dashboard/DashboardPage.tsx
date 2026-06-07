import {
  Clock,
  Download,
  Palette,
  PenLine,
  Plus,
  Shield,
  Sparkles,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useWorkspaceSession } from '../../context/WorkspaceSessionContext'
import { NOTION_PAGES } from '../notion/notionPages'
import type { NotionPageId } from '../notion/notionPages'
import { useAccountDisplayName } from '../../hooks/useAccountDisplayName'
import { useAppearanceSettings } from '../../hooks/useAppearanceSettings'
import { useCaseRegistry } from '../../hooks/useCaseRegistry'
import { useCredits } from '../../hooks/useCredits'
import { useDashboardSettings } from '../../hooks/useDashboardSettings'
import { useKiInstructions } from '../../hooks/useKiInstructions'
import { useSettingsPanel } from '../../hooks/useSettingsPanel'
import { useWorkspaceSettings } from '../../hooks/useWorkspaceSettings'
import { useWorkspaceVault } from '../../hooks/useWorkspaceVault'
import type { usePrivacySettings } from '../../hooks/usePrivacySettings'
import type { useLanguageSettings } from '../../hooks/useLanguageSettings'
import { allowsWorkspaceDbSnapshot } from '../../data/privacyRegions'
import type { SubscriptionPlan } from '../../data/subscriptionPlans'
import { DEFAULT_CASE_ID } from '../../utils/caseContext'
import { shouldShowBackupReminder } from '../../utils/workspaceVault'
import { AppLogo } from '../AppLogo'
import { EncryptionDisclaimer } from '../EncryptionDisclaimer'
import { SettingsPage } from '../settings/SettingsPage'
import { CreditsPurchaseDialog } from '../notion/CreditsPurchaseDialog'
import { NewCaseWorkflowDialog } from './NewCaseWorkflowDialog'
import { PatientCaseCard } from './PatientCaseCard'

const CREDITS_DEFAULT_MAX = 500
const DOCUMENTATION_DAY_GOAL_SECONDS = 8 * 60 * 60
const AI_AUTO_MODE_KEY = 'psychiatry-ink:ai-auto-mode'

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
  onOpenCase: (caseId: string, page?: NotionPageId) => void
  onNavigateHome?: () => void
  onOpenSettings?: () => void
}

function UsageBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="dashboard-usage__bar" role="presentation">
      <div className="dashboard-usage__bar-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

function UsageSparkline({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0
  const bars = 10

  return (
    <svg
      className="dashboard-usage__sparkline"
      viewBox={`0 0 ${bars * 5} 14`}
      aria-hidden
    >
      {Array.from({ length: bars }, (_, index) => {
        const threshold = (index + 1) / bars
        const active = threshold <= ratio
        const height = active ? 4 + (index % 4) * 1.5 : 3
        return (
          <rect
            key={index}
            x={index * 5 + 0.5}
            y={14 - height}
            width={3.5}
            height={height}
            rx={0.75}
            className={active ? 'dashboard-usage__sparkline-bar--active' : 'dashboard-usage__sparkline-bar'}
          />
        )
      })}
    </svg>
  )
}

export function DashboardPage({
  privacy,
  languageSettings,
  plan: _plan,
  onOpenCase,
  onNavigateHome,
}: DashboardPageProps) {
  const { t } = useTranslation()
  const displayName = useAccountDisplayName()
  const dashboardSettings = useDashboardSettings()
  const settingsPanel = useSettingsPanel()
  const appearance = useAppearanceSettings()
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
  const [pendingCaseId, setPendingCaseId] = useState<string | null>(null)
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false)

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

  const handleNewCase = () => {
    const caseId = registry.addCase()
    if (dashboardSettings.openCaseDirectToWorkflow) {
      setPendingCaseId(caseId)
      return
    }
    onOpenCase(caseId)
  }

  const handleWorkflowSelect = (pageId: NotionPageId) => {
    if (!pendingCaseId) return
    onOpenCase(pendingCaseId, pageId)
    setPendingCaseId(null)
  }

  const handleStayOnDashboard = () => {
    if (!pendingCaseId) return
    onOpenCase(pendingCaseId)
    setPendingCaseId(null)
  }

  const handleCloseWorkflowDialog = () => {
    setPendingCaseId(null)
  }

  const handleOpenWorkspace = () => {
    onOpenCase(DEFAULT_CASE_ID)
  }

  const patientCases = useMemo(
    () => registry.cases.filter((caseItem) => caseItem.caseId !== DEFAULT_CASE_ID),
    [registry.cases],
  )

  const recentActivity = useMemo(() => {
    const sorted = [...registry.cases].sort(
      (a, b) => new Date(b.lastEditedAt).getTime() - new Date(a.lastEditedAt).getTime(),
    )
    return sorted[0] ?? null
  }, [registry.cases])

  const backupNeeded = shouldShowBackupReminder(
    allowsWorkspaceDbSnapshot(privacy.tier),
    false,
  )

  const greeting = t('dashboardGreeting').replace('{name}', displayName)

  return (
    <div className="dashboard-page text-ink">
      <header className="dashboard-topbar">
        <AppLogo onClick={onNavigateHome} />
        <span className="dashboard-topbar__greeting">{greeting}</span>
      </header>

      <EncryptionDisclaimer section="dashboard" bodyVariant="paragraph" />

      <section className="dashboard-section" aria-labelledby="dashboard-section-patients">
        <h2 id="dashboard-section-patients" className="dashboard-section__heading">
          {t('dashboardSectionPatients')}
        </h2>

        <div className="dashboard-page__actions">
          <button
            type="button"
            className="dashboard-page__workspace-card"
            onClick={handleOpenWorkspace}
          >
            <PenLine className="dashboard-page__workspace-icon" strokeWidth={1.5} aria-hidden />
            <span className="dashboard-page__workspace-text">
              <span className="dashboard-page__workspace-label">{t('dashboardOpenWorkspace')}</span>
              <span className="dashboard-page__workspace-subtitle">
                {t('dashboardOpenWorkspaceSubtitle')}
              </span>
            </span>
          </button>

          <button
            type="button"
            className="dashboard-page__new-btn"
            onClick={handleNewCase}
          >
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
            {t('dashboardNewPatient')}
          </button>
        </div>

        {registry.loading ? (
          <p className="dashboard-page__status">{t('dashboardLoading')}</p>
        ) : patientCases.length === 0 ? (
          <p className="dashboard-page__status">{t('dashboardEmpty')}</p>
        ) : (
          <div className="dashboard-page__grid">
            {patientCases.map((caseItem) => (
              <PatientCaseCard
                key={caseItem.caseId}
                caseItem={caseItem}
                onOpen={(caseId) => onOpenCase(caseId)}
              />
            ))}
          </div>
        )}

        {registry.error ? (
          <p className="dashboard-page__error" role="alert">
            {registry.error}
          </p>
        ) : null}
      </section>

      <div className="dashboard-section__divider" role="separator" />

      <section className="dashboard-section" aria-labelledby="dashboard-section-usage">
        <h2 id="dashboard-section-usage" className="dashboard-section__heading">
          {t('dashboardSectionUsage')}
        </h2>

        <div className="dashboard-usage">
          <div className="dashboard-usage__item">
            <div className="dashboard-usage__label-row">
              <span className="dashboard-usage__label">
                <Clock className="dashboard-usage__icon" strokeWidth={1.5} aria-hidden />
                {t('dashboardUsageDocumentation')}
              </span>
              <span className="dashboard-usage__value">{todayTotalLabel}</span>
            </div>
            <UsageBar value={todayTotalSeconds} max={DOCUMENTATION_DAY_GOAL_SECONDS} />
            <UsageSparkline value={todayTotalSeconds} max={DOCUMENTATION_DAY_GOAL_SECONDS} />
          </div>

          <div className="dashboard-usage__item">
            <div className="dashboard-usage__label-row">
              <span className="dashboard-usage__label">
                <Sparkles className="dashboard-usage__icon" strokeWidth={1.75} aria-hidden />
                {t('dashboardUsageCredits')}
              </span>
              {creditsLoading ? (
                <span className="dashboard-usage__value">…</span>
              ) : (
                <button
                  type="button"
                  className={
                    creditBalance >= 50
                      ? 'dashboard-usage__value notion-topbar__credits notion-topbar__credits--ok'
                      : 'dashboard-usage__value notion-topbar__credits notion-topbar__credits--low'
                  }
                  onClick={() => setCreditsDialogOpen(true)}
                  title={t('creditBalance')}
                  aria-label={t('creditsAddLabel')}
                >
                  {t('creditBalanceAmount').replace('{balance}', String(creditBalance))}
                </button>
              )}
            </div>
            <UsageBar value={creditBalance} max={CREDITS_DEFAULT_MAX} />
          </div>
        </div>
      </section>

      <div className="dashboard-section__divider" role="separator" />

      <section className="dashboard-section" aria-labelledby="dashboard-section-settings">
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

      <div className="dashboard-section__divider" role="separator" />

      <section className="dashboard-section" aria-labelledby="dashboard-section-activity">
        <h2 id="dashboard-section-activity" className="dashboard-section__heading">
          {t('dashboardSectionActivity')}
        </h2>

        <div className="dashboard-activity">
          {recentActivity ? (
            <button
              type="button"
              className="dashboard-activity__row"
              onClick={() => onOpenCase(recentActivity.caseId)}
            >
              <span className="dashboard-activity__title">{recentActivity.displayTitle}</span>
              {recentActivity.documentTypeSummary ? (
                <span className="dashboard-activity__meta">{recentActivity.documentTypeSummary}</span>
              ) : null}
              <span className="dashboard-activity__action">{t('dashboardActivityOpen')}</span>
            </button>
          ) : (
            <p className="dashboard-page__status">{t('dashboardActivityNone')}</p>
          )}

          <div className="dashboard-activity__backup">
            <span className="dashboard-activity__backup-label">{t('dashboardBackupStatus')}</span>
            <span
              className={
                backupNeeded
                  ? 'dashboard-activity__backup-value dashboard-activity__backup-value--warn'
                  : 'dashboard-activity__backup-value'
              }
            >
              {backupNeeded ? t('dashboardBackupNeeded') : t('dashboardBackupOk')}
            </span>
          </div>
        </div>
      </section>

      {pendingCaseId ? (
        <NewCaseWorkflowDialog
          onSelect={handleWorkflowSelect}
          onStayOnDashboard={handleStayOnDashboard}
          onClose={handleCloseWorkflowDialog}
        />
      ) : null}

      {settingsPanel.isOpen ? (
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
          onSelectLanguage={languageSettings.selectLanguage}
          workspaceVault={workspaceVault}
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
    </div>
  )
}
