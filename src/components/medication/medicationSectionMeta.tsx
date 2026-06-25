import {
  AlertTriangle,
  BookOpen,
  FlaskConical,
  Layers,
  type LucideIcon,
  Package,
  Pill,
  Radar,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { MedicationUiKey } from '../../data/medicationUiTranslations'
import type { MedicationSectionKey } from './MedicationLowerSections'

export interface MedicationSectionMeta {
  /** Icon shown in the sidebar nav, hero quick-links and section header. */
  Icon: LucideIcon
  /** Short title key (reuses the existing section label keys). */
  labelKey: MedicationUiKey
  /** One-line description key surfaced in section headers and quick-link cards. */
  descKey: MedicationUiKey
}

/**
 * Presentation metadata for every Medikation section. Drives the flagship
 * section-router: sidebar nav, the Plan hero quick-links, and the per-section
 * detail header all read from this single source of truth.
 */
export const MEDICATION_SECTION_META: Record<MedicationSectionKey, MedicationSectionMeta> = {
  plan: { Icon: Pill, labelKey: 'medPageTitle', descKey: 'medDescPlan' },
  combination: { Icon: Layers, labelKey: 'medSectionCombination', descKey: 'medDescCombination' },
  preparations: { Icon: Package, labelKey: 'medSectionPreparations', descKey: 'medDescPreparations' },
  receptor: { Icon: Radar, labelKey: 'medSectionReceptorProfile', descKey: 'medDescReceptor' },
  monitoring: { Icon: ShieldCheck, labelKey: 'medSectionMonitoringTimeline', descKey: 'medDescMonitoring' },
  sideEffects: { Icon: AlertTriangle, labelKey: 'medSectionSideEffects', descKey: 'medDescSideEffects' },
  lab: { Icon: FlaskConical, labelKey: 'medSectionLab', descKey: 'medDescLab' },
  intelligence: { Icon: Sparkles, labelKey: 'medSectionIntelligence', descKey: 'medDescIntelligence' },
  education: {
    Icon: BookOpen,
    labelKey: 'medEducationPanelTitle',
    descKey: 'medEducationPanelDesc',
  },
}
