import { useTranslation } from '../../context/TranslationContext'
import type { SettingsSectionId } from '../../types/settings'
import { AppLogo } from '../AppLogo'
import { CaseSidebarUserFooter } from '../notion/CaseSidebarUserFooter'
import { SettingsSectionNav, type SettingsSectionGroup } from './SettingsSectionNav'

interface SettingsSidebarPanelProps {
  groups: SettingsSectionGroup[]
  activeSection: SettingsSectionId
  onSectionChange: (section: SettingsSectionId) => void
  /** Leave the settings view and return to the app. */
  onClose: () => void
  onOpenCredits: () => void
  creditBalance: number
}

/** Fixed dark left panel for the settings view — logo, section nav, user footer. */
export function SettingsSidebarPanel({
  groups,
  activeSection,
  onSectionChange,
  onClose,
  onOpenCredits,
  creditBalance,
}: SettingsSidebarPanelProps) {
  const { t } = useTranslation()

  return (
    <aside className="case-sidebar-panel" aria-label={t('settingsTitle')}>
      <div className="case-sidebar-panel__logo-row">
        <div className="case-sidebar-panel__logo">
          <AppLogo onClick={onClose} variant="light" />
        </div>
      </div>

      <div className="case-sidebar-panel__nav">
        <SettingsSectionNav
          groups={groups}
          activeSection={activeSection}
          onSectionChange={onSectionChange}
          ariaLabel={t('settingsTitle')}
        />
      </div>

      <div className="case-sidebar-panel__content" />

      <CaseSidebarUserFooter
        creditBalance={creditBalance}
        onOpenCredits={onOpenCredits}
        onOpenSettings={(section) => onSectionChange(section ?? 'appearance')}
      />
    </aside>
  )
}
