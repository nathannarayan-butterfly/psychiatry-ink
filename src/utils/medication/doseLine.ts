import type {
  DoseSchedule,
  MedicationEntry,
  MedicationFormulation,
  MedicationPlan,
  SideEffectReport,
} from '../../types/medicationPlan'
import type { UiLanguage } from '../../types/settings'

const formulationGerman: Record<MedicationFormulation, string> = {
  tablet: 'Tablette',
  solution: 'Lösung',
  drops: 'Tropfen',
  depot: 'Depot',
  injection: 'Injektion',
  capsule: 'Kapsel',
  patch: 'Pflaster',
  other: '',
}

function formatDoseSegment(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return '0'
  return trimmed.replace('.', ',')
}

export function formatDoseScheduleGerman(schedule: DoseSchedule): string {
  const parts = [
    formatDoseSegment(schedule.morning),
    formatDoseSegment(schedule.noon),
    formatDoseSegment(schedule.evening),
    formatDoseSegment(schedule.night),
  ]
  const unit = schedule.unit.trim()
  const base = parts.join('-')
  if (schedule.prn) return `${base} ${unit} b.B.`.trim()
  if (schedule.depotInterval?.trim()) return `${base} ${unit} (${schedule.depotInterval})`.trim()
  return unit ? `${base} ${unit}`.trim() : base
}

export function formatDoseLineGerman(
  substance: string,
  formulation: MedicationFormulation,
  strength: string,
  schedule: DoseSchedule,
): string {
  const name = substance.trim()
  const form = formulationGerman[formulation]
  const strengthPart = strength.trim()
  const schedulePart = formatDoseScheduleGerman(schedule)
  const segments = [name, form, strengthPart, schedulePart].filter(Boolean)
  return segments.join(' ')
}

function statusSuffix(status: MedicationEntry['status'], language: UiLanguage): string {
  if (status === 'discontinued') {
    return language === 'de' ? ' (abgesetzt)' : ' (discontinued)'
  }
  if (status === 'paused') {
    return language === 'de' ? ' (pausiert)' : ' (paused)'
  }
  if (status === 'reduced') {
    return language === 'de' ? ' (reduziert)' : ' (reduced)'
  }
  if (status === 'increased') {
    return language === 'de' ? ' (gesteigert)' : ' (increased)'
  }
  return ''
}

function medicationPlanPrefix(language: UiLanguage): string {
  if (language === 'de') return 'Aktuelle Medikation:'
  if (language === 'fr') return 'Médication actuelle :'
  if (language === 'es') return 'Medicación actual:'
  return 'Current medication:'
}

export function buildMedicationEntryClinicalText(
  entry: MedicationEntry,
  language: UiLanguage = 'de',
): string {
  const parts: string[] = []
  const doseLine = entry.doseLineGerman.trim() || entry.substance.trim()
  if (!doseLine) return ''

  parts.push(`${doseLine}${statusSuffix(entry.status, language)}`)

  if (entry.indication.trim()) {
    parts.push(
      language === 'de'
        ? `Indikation: ${entry.indication.trim()}`
        : `Indication: ${entry.indication.trim()}`,
    )
  }

  const sideEffects = entry.sideEffects.filter(Boolean)
  if (sideEffects.length) {
    parts.push(
      language === 'de'
        ? `Nebenwirkungen: ${sideEffects.join(', ')}`
        : `Side effects: ${sideEffects.join(', ')}`,
    )
  }

  if (entry.adherenceNote.trim()) {
    parts.push(
      language === 'de'
        ? `Adhärenz: ${entry.adherenceNote.trim()}`
        : `Adherence: ${entry.adherenceNote.trim()}`,
    )
  }

  if (entry.reasonForChange.trim()) {
    parts.push(
      language === 'de'
        ? `Änderungsgrund: ${entry.reasonForChange.trim()}`
        : `Reason for change: ${entry.reasonForChange.trim()}`,
    )
  }

  return parts.join(' — ')
}

export function buildSideEffectClinicalText(
  report: SideEffectReport,
  medications: MedicationEntry[],
  language: UiLanguage = 'de',
): string {
  const parts: string[] = []
  const symptom = report.symptom.trim()
  if (!symptom) return ''

  parts.push(language === 'de' ? `Nebenwirkung: ${symptom}` : `Side effect: ${symptom}`)

  if (report.severity.trim()) {
    parts.push(
      language === 'de'
        ? `Schweregrad: ${report.severity.trim()}`
        : `Severity: ${report.severity.trim()}`,
    )
  }

  if (report.onsetDate.trim()) {
    parts.push(
      language === 'de'
        ? `Beginn: ${report.onsetDate.trim()}`
        : `Onset: ${report.onsetDate.trim()}`,
    )
  }

  const suspected = medications.find((med) => med.id === report.suspectedMedicationId)
  if (suspected?.substance.trim()) {
    parts.push(
      language === 'de'
        ? `Verdächtiges Präparat: ${suspected.substance.trim()}`
        : `Suspected medication: ${suspected.substance.trim()}`,
    )
  } else if (report.attribution === 'combination') {
    parts.push(
      language === 'de' ? 'Zuschreibung: Kombination' : 'Attribution: combination',
    )
  } else if (report.attribution === 'unknown') {
    parts.push(language === 'de' ? 'Zuschreibung: unklar' : 'Attribution: unknown')
  }

  if (report.temporalRelation.trim()) {
    parts.push(
      language === 'de'
        ? `Zeitlicher Zusammenhang: ${report.temporalRelation.trim()}`
        : `Temporal relation: ${report.temporalRelation.trim()}`,
    )
  }

  if (report.actionTaken.trim()) {
    parts.push(
      language === 'de'
        ? `Maßnahme: ${report.actionTaken.trim()}`
        : `Action taken: ${report.actionTaken.trim()}`,
    )
  }

  if (report.outcome.trim()) {
    parts.push(
      language === 'de' ? `Verlauf: ${report.outcome.trim()}` : `Outcome: ${report.outcome.trim()}`,
    )
  }

  if (report.note.trim()) {
    parts.push(report.note.trim())
  }

  return parts.join(' — ')
}

export function buildReadableClinicalSentence(plan: MedicationPlan, language: UiLanguage = 'de'): string {
  const visible = plan.medications.filter((med) => !med.deletedAt)
  if (visible.length === 0) {
    return language === 'de' ? 'Keine Medikation dokumentiert.' : 'No medication documented.'
  }

  const lines = visible.map((med) => buildMedicationEntryClinicalText(med, language))
  return `${medicationPlanPrefix(language)} ${lines.join('; ')}`
}
