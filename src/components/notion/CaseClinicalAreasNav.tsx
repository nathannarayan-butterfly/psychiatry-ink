import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import type { TopNavTabId } from './CaseTopNav'

export const CLINICAL_AREA_TABS: { id: TopNavTabId; labelKey: UiTranslationKey }[] = [
  { id: 'overview', labelKey: 'topNavOverview' },
  { id: 'workspace', labelKey: 'topNavWorkspaceFall' },
  { id: 'verlauf', labelKey: 'topNavVerlauf' },
  { id: 'labor', labelKey: 'topNavLabor' },
  { id: 'diagnose', labelKey: 'topNavDiagnose' },
  { id: 'medikation', labelKey: 'topNavMedikation' },
  { id: 'therapie', labelKey: 'topNavTherapie' },
  { id: 'dokumente', labelKey: 'topNavDokumente' },
  { id: 'discuss', labelKey: 'topNavDiscuss' },
]

interface CaseClinicalAreasNavProps {
  activeTab: TopNavTabId
  onTabSelect: (tab: TopNavTabId) => void
  hasPatient?: boolean
}

/** Primary clinical-area navigation — always first in the case sidebar. */
export function CaseClinicalAreasNav({
  activeTab,
  onTabSelect,
  hasPatient = true,
}: CaseClinicalAreasNavProps) {
  const { t } = useTranslation()
  const visibleTabs = hasPatient
    ? CLINICAL_AREA_TABS
    : CLINICAL_AREA_TABS.filter((tab) => tab.id === 'workspace')

  return (
    <nav className="case-sidebar-nav" aria-label={t('patientDashboardQuickAccess')}>
      <p className="case-sidebar-nav__heading">{t('patientDashboardQuickAccess')}</p>
      {visibleTabs.map((area) => {
        const isActive = activeTab === area.id
        return (
          <button
            key={area.id}
            type="button"
            className={[
              'case-sidebar-nav__link',
              isActive ? 'case-sidebar-nav__link--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onTabSelect(area.id)}
            aria-current={isActive ? 'page' : undefined}
            data-area={area.id}
          >
            <span className="case-sidebar-nav__link-label">{t(area.labelKey)}</span>
          </button>
        )
      })}
    </nav>
  )
}
