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
  /** Whether a patient is linked to this case. Controls which tabs are visible. */
  hasPatient?: boolean
  /** Called when the "Patient anlegen" pseudo-tab is clicked. */
  onCreatePatient?: () => void
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
  hasPatient = true,
  onCreatePatient,
}: CaseTopNavProps) {
  const { t } = useTranslation()

  const displayName = patientName?.trim() || t('patientNavFallback')

  const visibleTabs = hasPatient ? TABS : TABS.filter((tab) => tab.id === 'workspace')

  return (
    <nav className="case-topnav" aria-label="Case navigation">
      {visibleTabs.map((tab) => (
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

      {!hasPatient && (
        <button
          type="button"
          className="case-topnav__create-patient-btn"
          onClick={onCreatePatient}
          title={t('topNavCreatePatient')}
        >
          ＋ {t('topNavCreatePatient')}
        </button>
      )}

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
