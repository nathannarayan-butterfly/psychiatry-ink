import type {
  LabCorrelationFindingSource,
  LabCorrelationStrength,
  PatientMedicationLabCorrelationFinding,
} from '../../types/labMedicationCorrelation'

export const STRENGTH_LABELS: Record<LabCorrelationStrength, string> = {
  none: 'Keine',
  possible: 'Möglich',
  plausible: 'Plausibel',
  monitoring_required: 'Monitoring',
  concerning: 'Bedenklich',
}

export const SOURCE_LABELS: Record<LabCorrelationFindingSource, string> = {
  knowledge_base: 'Wissensdatenbank',
  ai_suggestion: 'KI-Vorschlag',
  clinician_accepted: 'Ärztlich akzeptiert',
}

export const STATUS_LABELS: Record<PatientMedicationLabCorrelationFinding['status'], string> = {
  verified_kb: 'Verifiziert (KB)',
  pending_clinician_review: 'Prüfung ausstehend',
  accepted: 'Akzeptiert',
  rejected: 'Verworfen',
  not_relevant: 'Nicht relevant',
}

export const ABNORMALITY_LABELS: Record<PatientMedicationLabCorrelationFinding['abnormality'], string> = {
  high: 'Erhöht',
  low: 'Erniedrigt',
  critical: 'Kritisch',
  normal: 'Normal',
  normal_but_changed: 'Verändert',
  unknown: 'Unklar',
}

export function strengthClass(strength: LabCorrelationStrength): string {
  if (strength === 'concerning') return 'lab-med-correlation__strength--high'
  if (strength === 'monitoring_required' || strength === 'plausible') return 'lab-med-correlation__strength--moderate'
  if (strength === 'possible') return 'lab-med-correlation__strength--low'
  return 'lab-med-correlation__strength--none'
}

export function formatValueRef(finding: PatientMedicationLabCorrelationFinding): string {
  const value = `${finding.labValue}${finding.labUnit ? ` ${finding.labUnit}` : ''}`
  return finding.refRange ? `${value} (Ref. ${finding.refRange})` : value
}

export function formatCaseRef(caseId: string): string {
  const trimmed = caseId.trim()
  if (!trimmed) return '—'
  return trimmed.length > 12 ? `${trimmed.slice(0, 8)}…` : trimmed
}
