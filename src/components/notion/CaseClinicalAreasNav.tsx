import { useMemo } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { isClinicalIntelligenceAvailableForCase } from '../../demo/demoFeatureFlags'
import type { TopNavTabId } from './CaseTopNav'

/**
 * Base list of case-sidebar nav entries in display order.
 *
 * The optional `featureFlag` field gates an entry behind a runtime feature
 * flag (used for Clinical Intelligence V1 today). Entries without
 * `featureFlag` are always rendered.
 */
const BASE_CLINICAL_AREA_TABS: {
  id: TopNavTabId
  labelKey: UiTranslationKey
  featureFlag?: 'clinicalIntelligenceV1'
}[] = [
  { id: 'overview', labelKey: 'topNavOverview' },
  { id: 'workspace', labelKey: 'topNavWorkspaceFall' },
  { id: 'verlauf', labelKey: 'topNavVerlauf' },
  { id: 'labor', labelKey: 'topNavLabor' },
  { id: 'diagnose', labelKey: 'topNavDiagnose' },
  // Clinical Intelligence sits directly after Diagnose so clinicians can pivot
  // from diagnosis review into mechanistic/dimensional reasoning. Top-nav
  // duplicate is removed; sidebar is the canonical entry point.
  { id: 'ci', labelKey: 'topNavClinicalIntelligence', featureFlag: 'clinicalIntelligenceV1' },
  { id: 'medikation', labelKey: 'topNavMedikation' },
  { id: 'therapie', labelKey: 'topNavTherapie' },
  { id: 'dokumente', labelKey: 'topNavDokumente' },
  { id: 'discuss', labelKey: 'topNavDiscuss' },
]

export const CLINICAL_AREA_TABS: { id: TopNavTabId; labelKey: UiTranslationKey }[] =
  BASE_CLINICAL_AREA_TABS.map(({ id, labelKey }) => ({ id, labelKey }))

interface CaseClinicalAreasNavProps {
  activeTab: TopNavTabId
  onTabSelect: (tab: TopNavTabId) => void
  hasPatient?: boolean
  caseId?: string
}

/** Primary clinical-area navigation — always first in the case sidebar. */
export function CaseClinicalAreasNav({
  activeTab,
  onTabSelect,
  hasPatient = true,
  caseId,
}: CaseClinicalAreasNavProps) {
  const { t } = useTranslation()
  const ciEnabled = isClinicalIntelligenceAvailableForCase(caseId)
  const flagEnabled = useMemo(
    () => ({ clinicalIntelligenceV1: ciEnabled }),
    [ciEnabled],
  )
  const allowedTabs = useMemo(
    () =>
      BASE_CLINICAL_AREA_TABS.filter(
        (tab) => !tab.featureFlag || flagEnabled[tab.featureFlag],
      ),
    [flagEnabled],
  )
  const visibleTabs = hasPatient
    ? allowedTabs
    : allowedTabs.filter((tab) => tab.id === 'workspace')

  return (
    <nav className="case-sidebar-nav" aria-label={t('patientDashboardQuickAccess')}>
      <p className="case-sidebar-nav__heading">{t('patientDashboardQuickAccess')}</p>
      {visibleTabs.map((area) => {
        const isActive = activeTab === area.id
        const label = t(area.labelKey)
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
            title={label}
          >
            <span className="case-sidebar-nav__link-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
