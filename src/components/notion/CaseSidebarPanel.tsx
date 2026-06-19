import type { ReactNode } from 'react'
import { AppLogo } from '../AppLogo'
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
  children: ReactNode
  /** Accessible label for the sidebar landmark. */
  ariaLabel?: string
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
  children,
  ariaLabel,
}: CaseSidebarPanelProps) {
  return (
    <aside className="case-sidebar-panel" aria-label={ariaLabel}>
      <div className="case-sidebar-panel__logo-row">
        <div className="case-sidebar-panel__logo">
          <AppLogo onClick={onNavigateHome} variant="light" />
        </div>
      </div>

      <div className="case-sidebar-panel__nav">
        <CaseClinicalAreasNav
          activeTab={activeTab}
          onTabSelect={onTabSelect}
          hasPatient={hasPatient}
        />
        {!hasPatient && onCreatePatient ? (
          <div className="case-sidebar-assign">
            <button
              type="button"
              className="case-sidebar-nav__link"
              onClick={onCreatePatient}
            >
              + Zuordnen
            </button>
            <button
              type="button"
              className="case-sidebar-nav__link"
              onClick={onBackToPatients}
            >
              Vorhandener Patient
            </button>
          </div>
        ) : null}
      </div>

      <div className="case-sidebar-panel__content">{children}</div>

      <div className="case-sidebar-panel__widgets">
        <PanelDateCard layout="sidebar-footer" />
      </div>

      <CaseSidebarUserFooter creditBalance={creditBalance} onOpenSettings={onOpenSettings} />
    </aside>
  )
}
