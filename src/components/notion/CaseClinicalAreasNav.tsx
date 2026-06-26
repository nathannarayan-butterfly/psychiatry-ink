import { useMemo } from 'react'
import {
  Activity,
  Brain,
  FlaskConical,
  type LucideIcon,
  LayoutDashboard,
  MessagesSquare,
  NotebookPen,
  Pill,
  Stethoscope,
  FileText,
  HeartPulse,
} from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { isClinicalIntelligenceAvailableForCase } from '../../utils/featureFlags'
import type { TopNavTabId } from './CaseTopNav'

/**
 * Base list of case-sidebar nav entries in display order.
 *
 * The optional `featureFlag` field gates an entry behind a runtime feature
 * flag (used for Clinical Intelligence V1 today). Entries without
 * `featureFlag` are always rendered. The `icon` represents the area in the
 * collapsed (icon-only) rail — see the collapsed styles in case-sidebar.css.
 */
const BASE_CLINICAL_AREA_TABS: {
  id: TopNavTabId
  labelKey: UiTranslationKey
  icon: LucideIcon
  featureFlag?: 'clinicalIntelligenceV1'
}[] = [
  { id: 'overview', labelKey: 'topNavOverview', icon: LayoutDashboard },
  { id: 'workspace', labelKey: 'topNavWorkspaceFall', icon: NotebookPen },
  { id: 'verlauf', labelKey: 'topNavVerlauf', icon: Activity },
  { id: 'labor', labelKey: 'topNavLabor', icon: FlaskConical },
  { id: 'diagnose', labelKey: 'topNavDiagnose', icon: Stethoscope },
  // Clinical Intelligence sits directly after Diagnose so clinicians can pivot
  // from diagnosis review into mechanistic/dimensional reasoning. Top-nav
  // duplicate is removed; sidebar is the canonical entry point.
  { id: 'ci', labelKey: 'topNavClinicalIntelligence', icon: Brain, featureFlag: 'clinicalIntelligenceV1' },
  { id: 'medikation', labelKey: 'topNavMedikation', icon: Pill },
  { id: 'therapie', labelKey: 'topNavTherapie', icon: HeartPulse },
  { id: 'dokumente', labelKey: 'topNavDokumente', icon: FileText },
  { id: 'discuss', labelKey: 'topNavDiscuss', icon: MessagesSquare },
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
        const Icon = area.icon
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
            <Icon className="case-sidebar-nav__link-icon" strokeWidth={1.75} aria-hidden />
            <span className="case-sidebar-nav__link-label">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
