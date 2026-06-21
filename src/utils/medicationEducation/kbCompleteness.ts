import type {
  MedicationEducationKbApprovalStatus,
  MedicationEducationKbCoverageItem,
  MedicationEducationTemplate,
} from '../../types/medicationEducation'
import type { KnowledgeBaseDrug } from '../../types/knowledgeBase'

const REQUIRED_KB_FIELDS: Array<keyof MedicationEducationTemplate> = [
  'mechanismSimple',
  'commonSideEffects',
  'seriousWarnings',
  'monitoringRequirements',
  'howToTake',
]

const OPTIONAL_KB_FIELDS: Array<keyof MedicationEducationTemplate> = [
  'whyPrescribed',
  'whenEffect',
  'interactions',
  'dailyLife',
  'pregnancyLactation',
  'ifSideEffects',
  'missedDose',
  'drivingWork',
]

export function assessKbTemplateCompleteness(template: MedicationEducationTemplate | null): {
  coveragePercent: number
  missingFields: string[]
  isSufficientForAi: boolean
} {
  if (!template) {
    return { coveragePercent: 0, missingFields: [...REQUIRED_KB_FIELDS], isSufficientForAi: false }
  }
  const missing: string[] = []
  for (const field of REQUIRED_KB_FIELDS) {
    const val = template[field]
    if (typeof val !== 'string' || !val.trim()) missing.push(field)
  }
  const filledRequired = REQUIRED_KB_FIELDS.length - missing.length
  const filledOptional = OPTIONAL_KB_FIELDS.filter((f) => {
    const val = template[f]
    return typeof val === 'string' && val.trim().length > 0
  }).length
  const total = REQUIRED_KB_FIELDS.length + OPTIONAL_KB_FIELDS.length
  const coveragePercent = Math.round(((filledRequired + filledOptional) / total) * 100)
  return {
    coveragePercent,
    missingFields: missing,
    isSufficientForAi: missing.length === 0,
  }
}

export function isKbTemplateApproved(status?: MedicationEducationKbApprovalStatus): boolean {
  return status === 'approved' || status === 'clinician_reviewed'
}

export function buildKbCoverageItem(
  medicationId: string,
  substanceName: string,
  template: MedicationEducationTemplate | null,
): MedicationEducationKbCoverageItem {
  const assessment = assessKbTemplateCompleteness(template)
  return {
    medicationId,
    substanceName,
    templateId: template?.id,
    approvalStatus: template?.approvalStatus,
    coveragePercent: assessment.coveragePercent,
    missingFields: assessment.missingFields,
  }
}

/** Derive initial KB template fields from KnowledgeBaseDrug monograph sections. */
export function deriveKbTemplateFromDrug(
  drug: KnowledgeBaseDrug,
): Partial<MedicationEducationTemplate> {
  const section = (key: string) =>
    drug.sections.find((s) => s.key === key)?.content?.trim() ?? ''

  const sideEffectsSection = drug.sections.find((s) => s.key === 'nebenwirkungen')
  const sideEffectsText =
    sideEffectsSection?.content?.trim() ??
    (sideEffectsSection?.sideEffects?.length
      ? sideEffectsSection.sideEffects.map((e) => e.effect).join(', ')
      : '')

  return {
    substanceName: drug.genericName,
    brandNames: drug.brandNames ?? [],
    mechanismSimple: section('wirkmechanismus') || section('kurzprofil'),
    whyPrescribed: section('indikationen'),
    whenEffect: section('besonderheiten'),
    howToTake: section('dosierung'),
    commonSideEffects: sideEffectsText,
    seriousWarnings: section('kontraindikationen') || section('ueberdosierung'),
    monitoringRequirements: section('kontrollen'),
    interactions: section('wechselwirkungen'),
    dailyLife: section('merksaetze'),
    pregnancyLactation: section('schwangerschaft'),
    ifSideEffects: section('nebenwirkungen'),
    missedDose: section('absetzen'),
    drivingWork: section('besonderheiten'),
    fullLeafletText: drug.sections.map((s) => s.content).filter(Boolean).join('\n\n'),
  }
}

export function aggregateKbCoveragePercent(items: MedicationEducationKbCoverageItem[]): number {
  if (items.length === 0) return 0
  const sum = items.reduce((acc, i) => acc + i.coveragePercent, 0)
  return Math.round(sum / items.length)
}
