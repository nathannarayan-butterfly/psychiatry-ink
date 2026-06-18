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

const SOLID_ORAL_FORMULATIONS = new Set<MedicationFormulation>(['tablet', 'capsule'])

const PIECE_UNITS = new Set([
  'stk.',
  'stk',
  'tab',
  'tablette',
  'tabletten',
  'kapsel',
  'kps.',
  'kps',
  'kaps.',
])

type DoseDisplayMode = 'mgPerSlot' | 'scheduleValues' | 'prn'

function formatDoseSegment(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return '0'
  return trimmed.replace('.', ',')
}

function parseStrengthMg(strength: string): number | null {
  const match = strength.trim().match(/^([\d.,]+)\s*mg\b/i)
  if (!match) return null
  const value = Number.parseFloat(match[1].replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

function isPieceUnit(unit: string): boolean {
  return PIECE_UNITS.has(unit.trim().toLowerCase())
}

function resolveDoseDisplayMode(
  formulation: MedicationFormulation,
  strength: string,
  schedule: DoseSchedule,
): DoseDisplayMode {
  if (schedule.prn) return 'prn'
  if (!SOLID_ORAL_FORMULATIONS.has(formulation)) return 'scheduleValues'
  const strengthMg = parseStrengthMg(strength)
  if (strengthMg === null) return 'scheduleValues'
  const unit = schedule.unit.trim().toLowerCase()
  if (isPieceUnit(schedule.unit) || unit === 'mg') return 'mgPerSlot'
  return 'scheduleValues'
}

function slotToDisplayAmount(value: string, strengthMg: number | null, unitIsPiece: boolean): string {
  const trimmed = value.trim()
  if (!trimmed) return '0'
  if (!unitIsPiece || strengthMg === null) return formatDoseSegment(trimmed)
  const count = Number.parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(count)) return formatDoseSegment(trimmed)
  const mg = count * strengthMg
  if (Number.isInteger(mg)) return String(mg)
  return formatDoseSegment(String(mg))
}

function scheduleSlots(
  schedule: DoseSchedule,
  mode: DoseDisplayMode,
  strength: string,
): [string, string, string, string] {
  const strengthMg = parseStrengthMg(strength)
  const unitIsPiece = isPieceUnit(schedule.unit)
  const toSlot = (value: string) =>
    mode === 'mgPerSlot'
      ? slotToDisplayAmount(value, strengthMg, unitIsPiece)
      : formatDoseSegment(value)

  return [
    toSlot(schedule.morning),
    toSlot(schedule.noon),
    toSlot(schedule.evening),
    toSlot(schedule.night),
  ]
}

export interface DoseScheduleFormatOptions {
  formulation?: MedicationFormulation
  strength?: string
}

export function formatDoseScheduleGerman(
  schedule: DoseSchedule,
  options?: DoseScheduleFormatOptions,
): string {
  const formulation = options?.formulation
  const strength = options?.strength ?? ''
  const mode =
    formulation !== undefined
      ? resolveDoseDisplayMode(formulation, strength, schedule)
      : schedule.prn
        ? 'prn'
        : 'scheduleValues'

  if (mode === 'prn') {
    const strengthPart = strength.trim()
    return strengthPart ? `${strengthPart} b.B.` : 'b.B.'
  }

  const parts = scheduleSlots(schedule, mode, strength)
  const unit = mode === 'mgPerSlot' ? 'mg' : schedule.unit.trim()
  const base = parts.join('-')
  if (schedule.depotInterval?.trim()) return `${base} ${unit} (${schedule.depotInterval})`.trim()
  return unit ? `${base} ${unit}`.trim() : base
}

function stripSubstancePrefix(line: string, substance: string): string {
  const trimmed = line.trim()
  if (!trimmed) return ''
  if (substance && trimmed.startsWith(substance)) {
    return trimmed.slice(substance.length).trim()
  }
  return trimmed
}

/**
 * Dose portion for Übersicht and other compact views where substance is shown separately.
 * Schedule-derived mg-per-slot notation is preferred over stored `doseLineGerman`, which may
 * be stale (e.g. duplicated strength or Stk. counts from older saves).
 */
export function formatMedicationOverviewDoseGerman(entry: MedicationEntry): string {
  const substance = entry.substance.trim()
  const scheduleDose = formatDoseScheduleGerman(entry.doseSchedule, {
    formulation: entry.formulation,
    strength: entry.strength,
  })
  const doseLine = entry.doseLineGerman.trim()
  const isPrn = entry.doseSchedule.prn || entry.prn

  if (isPrn) {
    const stripped = stripSubstancePrefix(doseLine, substance)
    if (stripped && stripped !== scheduleDose) return stripped
    return scheduleDose
  }

  if (scheduleDose) return scheduleDose

  const stripped = stripSubstancePrefix(doseLine, substance)
  return stripped || doseLine
}

export function formatDoseLineGerman(
  substance: string,
  formulation: MedicationFormulation,
  strength: string,
  schedule: DoseSchedule,
): string {
  const name = substance.trim()

  if (schedule.prn) {
    const schedulePart = formatDoseScheduleGerman(schedule, { formulation, strength })
    return schedulePart ? `${name} ${schedulePart}`.trim() : name
  }

  const mode = resolveDoseDisplayMode(formulation, strength, schedule)
  const schedulePart = formatDoseScheduleGerman(schedule, { formulation, strength })

  if (mode === 'mgPerSlot') {
    return `${name} ${schedulePart}`.trim()
  }

  const includeFormulation =
    formulation === 'solution' ||
    formulation === 'drops' ||
    formulation === 'depot' ||
    formulation === 'injection'
  const formPart = includeFormulation ? formulationGerman[formulation] : ''
  const segments = [name, formPart, schedulePart].filter(Boolean)
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
