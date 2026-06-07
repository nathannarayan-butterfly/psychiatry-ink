import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'

export type TopNavTabId = 'workspace' | 'verlauf' | 'labor' | 'therapie' | 'dokumente'

interface CaseTopNavProps {
  activeTab: TopNavTabId
  onTabSelect: (tab: TopNavTabId) => void
  /** Patient's local name to display in place of the new-case button. */
  patientName?: string
  /** Called when the patient name chip is clicked — typically navigates to dashboard. */
  onPatientClick?: () => void
}

interface TabConfig {
  id: TopNavTabId
  labelKey: UiTranslationKey
}

const TABS: TabConfig[] = [
  { id: 'workspace', labelKey: 'topNavWorkspaceFall' },
  { id: 'verlauf', labelKey: 'topNavVerlauf' },
  { id: 'labor', labelKey: 'topNavLabor' },
  { id: 'therapie', labelKey: 'topNavTherapie' },
  { id: 'dokumente', labelKey: 'topNavDokumente' },
]

export function CaseTopNav({
  activeTab,
  onTabSelect,
  patientName,
  onPatientClick,
}: CaseTopNavProps) {
  const { t } = useTranslation()

  const displayName = patientName?.trim() || t('patientNavFallback')

  return (
    <nav className="case-topnav" aria-label="Case navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={[
            'case-topnav__tab',
            activeTab === tab.id ? 'case-topnav__tab--active' : '',
          ]
            .join(' ')
            .trim()}
          onClick={() => onTabSelect(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          {t(tab.labelKey)}
        </button>
      ))}
      <button
        type="button"
        className="case-topnav__patient-name"
        onClick={onPatientClick}
        title={displayName}
        aria-label={displayName}
      >
        {displayName}
      </button>
    </nav>
  )
}
