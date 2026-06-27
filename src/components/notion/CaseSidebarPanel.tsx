import type { ReactNode } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { AppLogo } from '../AppLogo'
import { useTranslation } from '../../context/TranslationContext'
import { PanelDateCard } from '../PanelDateCard'
import { CaseClinicalAreasNav } from './CaseClinicalAreasNav'
import { CaseSidebarUserFooter } from './CaseSidebarUserFooter'
import type { TopNavTabId } from './CaseTopNav'
import type { SettingsSectionId } from '../../types/settings'

interface CaseSidebarPanelProps {
  onNavigateHome?: () => void
  onBackToPatients: () => void
  activeTab: TopNavTabId
  onTabSelect: (tab: TopNavTabId) => void
  hasPatient?: boolean
  onCreatePatient?: () => void
  creditBalance: number
  onOpenSettings: (section?: SettingsSectionId) => void
  onOpenCredits?: () => void
  children: ReactNode
  /** Accessible label for the sidebar landmark. */
  ariaLabel?: string
  /** Active patient case id (real caseId) for patient-linked quick to-dos. */
  todoCaseId?: string | null
  todoPatientLabel?: string | null
  /** Whether the sidebar is fully hidden (floating expand control only). */
  collapsed?: boolean
  /** Toggles between full sidebar and hidden (floating expand) states. */
  onToggleCollapsed?: () => void
}

/** Fixed dark left panel — logo, back link, clinical areas, tab content, user footer. */
export function CaseSidebarPanel({
  onNavigateHome,
  onBackToPatients,
  activeTab,
  onTabSelect,
  hasPatient = true,
  onCreatePatient,
  creditBalance,
  onOpenSettings,
  onOpenCredits,
  children,
  ariaLabel,
  todoCaseId = null,
  todoPatientLabel = null,
  collapsed = false,
  onToggleCollapsed,
}: CaseSidebarPanelProps) {
  const { t } = useTranslation()
  const collapseLabel = t('caseSidebarCollapseTooltip')
  const expandLabel = t('caseSidebarExpandTooltip')

  if (collapsed) {
    return onToggleCollapsed ? (
      <button
        type="button"
        className="case-sidebar-floating-expand"
        onClick={onToggleCollapsed}
        aria-label={expandLabel}
        aria-expanded={false}
        title={expandLabel}
      >
        <PanelLeftOpen aria-hidden strokeWidth={1.75} />
      </button>
    ) : null
  }

  return (
    <aside
      className="case-sidebar-panel"
      aria-label={ariaLabel}
      data-collapsed="false"
    >
      <div className="case-sidebar-panel__logo-row">
        <div className="case-sidebar-panel__logo">
          <AppLogo onClick={onNavigateHome} variant="light" />
        </div>
        {onToggleCollapsed ? (
          <button
            type="button"
            className="case-sidebar-panel__collapse-btn"
            onClick={onToggleCollapsed}
            aria-label={collapseLabel}
            aria-expanded
            title={collapseLabel}
          >
            <PanelLeftClose aria-hidden strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      <div className="case-sidebar-panel__nav">
        <CaseClinicalAreasNav
          activeTab={activeTab}
          onTabSelect={onTabSelect}
          hasPatient={hasPatient}
          caseId={todoCaseId ?? undefined}
        />
        {!hasPatient && onCreatePatient ? (
          <div className="case-sidebar-assign">
            <button
              type="button"
              className="case-sidebar-nav__link"
              onClick={onCreatePatient}
            >
              + {t('topNavCreatePatient')}
            </button>
            <button
              type="button"
              className="case-sidebar-nav__link"
              onClick={onBackToPatients}
            >
              {t('topNavExistingPatient')}
            </button>
          </div>
        ) : null}
      </div>

      <div className="case-sidebar-panel__content">{children}</div>

      <div className="case-sidebar-panel__widgets">
        <PanelDateCard layout="sidebar-footer" />
      </div>

      <CaseSidebarUserFooter
        creditBalance={creditBalance}
        onOpenSettings={onOpenSettings}
        onOpenCredits={onOpenCredits}
        todoCaseId={todoCaseId}
        todoPatientLabel={todoPatientLabel}
      />
    </aside>
  )
}
