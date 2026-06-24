import type {
  MedicationChangeType,
  MedicationDeleteReasonCode,
  MedicationEntry,
  MedicationFormulation,
  MedicationPlan,
  MedicationPlanState,
  MedicationStatus,
  SideEffectReport,
} from '../../types/medicationPlan'
import {
  createEmptyDoseSchedule,
  createEmptyMedicationPlanState,
  MEDICATION_PLAN_STATE_VERSION,
} from '../../types/medicationPlan'
import { formatDoseLineGerman } from './doseLine'
import { buildReadableClinicalSentence } from './doseLine'
import {
  formatPrnScheduleGerman,
  hasStructuredPrnFields,
  normalizePrnScheduleForSave,
  parseLegacyPrnDoseText,
} from './prnDose'
import type { UiLanguage } from '../../types/settings'

export interface MedicationDraft {
  substance: string
  kbDrugId?: string
  substanceId?: string
  displayBrandName?: string
  formulation: MedicationEntry['formulation']
  strength: string
  doseSchedule: MedicationEntry['doseSchedule']
  prn: boolean
  depotInterval: string
  startDate: string
  indication: string
  status: MedicationEntry['status']
  reasonForChange: string
  sideEffects: string[]
  adherenceNote: string
  freeTextLine: string
  changeType: MedicationChangeType
}

export function createDefaultMedicationDraft(): MedicationDraft {
  return {
    substance: '',
    formulation: 'tablet',
    strength: '',
    doseSchedule: createEmptyDoseSchedule(),
    prn: false,
    depotInterval: '',
    startDate: new Date().toISOString().slice(0, 10),
    indication: '',
    status: 'active',
    reasonForChange: '',
    sideEffects: [],
    adherenceNote: '',
    freeTextLine: '',
    changeType: 'start',
  }
}

function stripSubstancePrefix(line: string, substance: string): string {
  const trimmed = line.trim()
  if (!trimmed || !substance) return trimmed
  if (trimmed.startsWith(substance)) return trimmed.slice(substance.length).trim()
  return trimmed
}

/** Resolve PRN dose text for legacy single-field input or composed structured PRN line. */
export function resolvePrnDoseInput(entry: Pick<MedicationEntry, 'substance' | 'doseSchedule' | 'doseLineGerman' | 'prn' | 'strength'>): string {
  if (hasStructuredPrnFields(entry.doseSchedule)) {
    return formatPrnScheduleGerman(entry.doseSchedule)
  }

  const fromMorning = entry.doseSchedule.morning.trim()
  if (fromMorning) return fromMorning

  const isPrn = entry.doseSchedule.prn || entry.prn
  if (!isPrn) return ''

  const stripped = stripSubstancePrefix(entry.doseLineGerman, entry.substance.trim())
  if (!stripped) return ''

  const fallback = entry.strength.trim()
    ? `${entry.strength.trim()} b.B.`
    : 'b.B.'
  if (stripped === fallback) return ''

  return stripped
}

function hydrateStructuredPrnFields(
  doseSchedule: MedicationEntry['doseSchedule'],
  legacyText: string,
): MedicationEntry['doseSchedule'] {
  if (hasStructuredPrnFields(doseSchedule)) return doseSchedule

  const parsed = parseLegacyPrnDoseText(legacyText)
  if (!parsed.prnBasisDose && !parsed.prnMaxSingleDose && !parsed.prnMaxDailyDose) {
    return doseSchedule
  }

  return {
    ...doseSchedule,
    prnBasisDose: parsed.prnBasisDose,
    prnMaxSingleDose: parsed.prnMaxSingleDose,
    prnMaxDailyDose: parsed.prnMaxDailyDose,
    morning: '',
  }
}

export function medicationDraftFromEntry(entry: MedicationEntry): MedicationDraft {
  const prn = entry.prn || Boolean(entry.doseSchedule.prn)
  let doseSchedule = { ...entry.doseSchedule }
  if (prn) {
    const prnDose = resolvePrnDoseInput(entry)
    doseSchedule = hydrateStructuredPrnFields(doseSchedule, prnDose)
    if (!hasStructuredPrnFields(doseSchedule) && prnDose) {
      doseSchedule.morning = prnDose
    }
    doseSchedule.noon = ''
    doseSchedule.evening = ''
    doseSchedule.night = ''
  }

  return {
    substance: entry.substance,
    kbDrugId: entry.kbDrugId,
    substanceId: entry.substanceId,
    displayBrandName: entry.displayBrandName,
    formulation: entry.formulation,
    strength: entry.strength,
    doseSchedule,
    prn,
    depotInterval: entry.depotInterval ?? '',
    startDate: entry.startDate,
    indication: entry.indication,
    status: entry.status,
    reasonForChange: entry.reasonForChange,
    sideEffects: [...entry.sideEffects],
    adherenceNote: entry.adherenceNote,
    freeTextLine: entry.freeTextLine,
    changeType: entry.lastChangeType,
  }
}

function entrySnapshot(entry: MedicationEntry): MedicationEntry['history'][number]['snapshot'] {
  return {
    substance: entry.substance,
    formulation: entry.formulation,
    strength: entry.strength,
    doseSchedule: { ...entry.doseSchedule },
    doseLineGerman: entry.doseLineGerman,
    status: entry.status,
    reasonForChange: entry.reasonForChange,
  }
}

function buildEntryFromDraft(
  draft: MedicationDraft,
  existing: MedicationEntry | null,
  _language: UiLanguage,
): MedicationEntry {
  const now = new Date().toISOString()
  const schedule = normalizePrnScheduleForSave({
    ...draft.doseSchedule,
    prn: draft.prn,
    depotInterval: draft.depotInterval.trim() || undefined,
    ...(draft.prn
      ? { noon: '', evening: '', night: '' }
      : {}),
  })
  const doseLineGerman = formatDoseLineGerman(
    draft.substance,
    draft.formulation,
    draft.strength,
    schedule,
  )

  const base: MedicationEntry = existing ?? {
    id: crypto.randomUUID(),
    substance: '',
    formulation: 'tablet',
    strength: '',
    doseSchedule: createEmptyDoseSchedule(),
    doseLineGerman: '',
    prn: false,
    startDate: draft.startDate,
    indication: '',
    status: 'active',
    reasonForChange: '',
    sideEffects: [],
    adherenceNote: '',
    freeTextLine: '',
    introducedAt: now,
    lastChangeAt: now,
    lastChangeType: 'start',
    history: [],
  }

  const next: MedicationEntry = {
    ...base,
    substance: draft.substance.trim(),
    kbDrugId: draft.kbDrugId,
    substanceId: draft.substanceId ?? draft.kbDrugId,
    displayBrandName: draft.displayBrandName?.trim() || undefined,
    formulation: draft.formulation,
    strength: draft.strength.trim(),
    doseSchedule: schedule,
    doseLineGerman,
    prn: draft.prn,
    depotInterval: draft.depotInterval.trim() || undefined,
    startDate: draft.startDate,
    indication: draft.indication.trim(),
    status: draft.status,
    reasonForChange: draft.reasonForChange.trim(),
    sideEffects: draft.sideEffects.filter(Boolean),
    adherenceNote: draft.adherenceNote.trim(),
    freeTextLine: draft.freeTextLine.trim(),
    lastChangeAt: now,
    lastChangeType: existing ? draft.changeType : 'start',
  }

  const changeEvent = {
    id: crypto.randomUUID(),
    changedAt: now,
    changeType: existing ? draft.changeType : 'start',
    note: draft.reasonForChange.trim() || undefined,
    snapshot: entrySnapshot(next),
  }

  next.history = existing ? [...existing.history, changeEvent] : [changeEvent]
  return next
}

export function isMedicationVisible(entry: MedicationEntry): boolean {
  return !entry.deletedAt
}

export function visibleMedications(medications: MedicationEntry[]): MedicationEntry[] {
  return medications.filter(isMedicationVisible)
}

/** Statuses that count as part of the current active regimen (excludes paused / discontinued). */
export const ACTIVE_MEDICATION_STATUSES: readonly MedicationStatus[] = [
  'active',
  'reduced',
  'increased',
]

export function isActiveMedication(entry: MedicationEntry): boolean {
  return isMedicationVisible(entry) && ACTIVE_MEDICATION_STATUSES.includes(entry.status)
}

export function activeMedications(medications: MedicationEntry[]): MedicationEntry[] {
  return medications.filter(isActiveMedication)
}

export interface MedicationDeleteInput {
  reasonCode: MedicationDeleteReasonCode
  reasonText?: string
  deletedBy: string
}

function formatDeleteReason(input: MedicationDeleteInput): string {
  if (input.reasonCode === 'wrong_entry') return 'Falsch Eintrag'
  if (input.reasonCode === 'duplicate') return 'Duplikat'
  const text = input.reasonText?.trim()
  return text || 'Sonstiges'
}

export function deleteMedicationFromPlan(
  state: MedicationPlanState,
  planId: string,
  medicationId: string,
  input: MedicationDeleteInput,
  language: UiLanguage = 'de',
): MedicationPlanState {
  const now = new Date().toISOString()
  return withUpdatedPlan(
    state,
    planId,
    (plan) => ({
      ...plan,
      medications: plan.medications.map((med) =>
        med.id === medicationId
          ? {
              ...med,
              deletedAt: now,
              deletedBy: input.deletedBy,
              deleteReason: formatDeleteReason(input),
            }
          : med,
      ),
    }),
    language,
  )
}

export function getCurrentPlan(state: MedicationPlanState): MedicationPlan | null {
  if (!state.currentPlanId) return state.plans[0] ?? null
  return state.plans.find((plan) => plan.id === state.currentPlanId) ?? state.plans[0] ?? null
}

export function withUpdatedPlan(
  state: MedicationPlanState,
  planId: string,
  updater: (plan: MedicationPlan) => MedicationPlan,
  language: UiLanguage = 'de',
): MedicationPlanState {
  const plans = state.plans.map((plan) => {
    if (plan.id !== planId) return plan
    const updated = updater(plan)
    return {
      ...updated,
      readableClinicalSentence: buildReadableClinicalSentence(updated, language),
    }
  })
  return {
    ...state,
    version: MEDICATION_PLAN_STATE_VERSION,
    updatedAt: new Date().toISOString(),
    plans,
  }
}

export function addMedicationToPlan(
  state: MedicationPlanState,
  planId: string,
  draft: MedicationDraft,
  language: UiLanguage = 'de',
): MedicationPlanState {
  const entry = buildEntryFromDraft(draft, null, language)
  return withUpdatedPlan(
    state,
    planId,
    (plan) => ({
      ...plan,
      medications: [...plan.medications, entry],
    }),
    language,
  )
}

export function updateMedicationInPlan(
  state: MedicationPlanState,
  planId: string,
  medicationId: string,
  draft: MedicationDraft,
  language: UiLanguage = 'de',
): MedicationPlanState {
  return withUpdatedPlan(
    state,
    planId,
    (plan) => ({
      ...plan,
      medications: plan.medications.map((med) =>
        med.id === medicationId ? buildEntryFromDraft(draft, med, language) : med,
      ),
    }),
    language,
  )
}

export function addSideEffectReport(
  state: MedicationPlanState,
  report: Omit<SideEffectReport, 'id'>,
): MedicationPlanState {
  return {
    ...state,
    version: MEDICATION_PLAN_STATE_VERSION,
    updatedAt: new Date().toISOString(),
    sideEffectReports: [...state.sideEffectReports, { ...report, id: crypto.randomUUID() }],
  }
}

export function copyMedicationPlan(
  state: MedicationPlanState,
  sourcePlanId: string,
  caseId: string,
  language: UiLanguage = 'de',
): MedicationPlanState {
  const source = state.plans.find((plan) => plan.id === sourcePlanId)
  if (!source) return state

  const now = new Date().toISOString()
  const newPlanId = crypto.randomUUID()
  const copiedMedications = source.medications.map((med) => ({
    ...med,
    id: crypto.randomUUID(),
    history: med.history.map((event) => ({ ...event, id: crypto.randomUUID() })),
  }))

  const newPlan: MedicationPlan = {
    id: newPlanId,
    caseId,
    createdAt: now,
    isCurrent: true,
    medications: copiedMedications,
    readableClinicalSentence: buildReadableClinicalSentence(
      { ...source, medications: copiedMedications },
      language,
    ),
  }

  const plans = state.plans.map((plan) => ({ ...plan, isCurrent: false }))
  plans.push(newPlan)

  return {
    ...state,
    version: MEDICATION_PLAN_STATE_VERSION,
    updatedAt: now,
    currentPlanId: newPlanId,
    plans,
  }
}

export function selectMedicationPlan(
  state: MedicationPlanState,
  planId: string,
): MedicationPlanState {
  return {
    ...state,
    updatedAt: new Date().toISOString(),
    currentPlanId: planId,
    plans: state.plans.map((plan) => ({ ...plan, isCurrent: plan.id === planId })),
  }
}

/**
 * A single medication line as it stood at one change point in the plan timeline.
 */
export interface PlanTimelineMed {
  id: string
  substance: string
  displayBrandName?: string
  formulation: MedicationFormulation
  strength: string
  doseLineGerman: string
  status: MedicationStatus
  /** This medication was one of the things that changed at this exact timestamp. */
  changedNow: boolean
  /** Change type of the latest event applied at-or-before this point (drives the row icon). */
  changeType: MedicationChangeType
}

/**
 * A whole-plan snapshot reconstructed for one change point ("Datum").
 */
export interface PlanTimelineEntry {
  changedAt: string
  medications: PlanTimelineMed[]
  /** What changed at this exact timestamp (used for the timeline summary line). */
  changes: { substance: string; changeType: MedicationChangeType; note?: string }[]
}

/**
 * Derives plan-level, time-stamped snapshots from the per-medication change log
 * that {@link buildEntryFromDraft} already records on every add / edit / discontinue.
 *
 * For each distinct change timestamp we reconstruct the full plan as it stood then:
 * every visible medication that already existed shows the latest event at-or-before
 * that moment. This avoids a parallel snapshot store and works retroactively for
 * existing patients without any data migration.
 */
export function derivePlanTimeline(medications: MedicationEntry[]): PlanTimelineEntry[] {
  const visible = visibleMedications(medications)
  const timestamps = Array.from(
    new Set(visible.flatMap((med) => med.history.map((event) => event.changedAt))),
  ).sort()

  return timestamps.map((timestamp) => {
    const changes: PlanTimelineEntry['changes'] = []
    const meds: PlanTimelineMed[] = []

    for (const med of visible) {
      const applicable = [...med.history]
        .filter((event) => event.changedAt <= timestamp)
        .sort((a, b) => a.changedAt.localeCompare(b.changedAt))
      if (applicable.length === 0) continue

      const last = applicable[applicable.length - 1]
      const eventsNow = med.history.filter((event) => event.changedAt === timestamp)
      const changedNow = eventsNow.length > 0
      for (const event of eventsNow) {
        changes.push({ substance: med.substance, changeType: event.changeType, note: event.note })
      }

      meds.push({
        id: med.id,
        substance: med.substance,
        displayBrandName: med.displayBrandName,
        formulation: last.snapshot.formulation,
        strength: last.snapshot.strength,
        doseLineGerman: last.snapshot.doseLineGerman,
        status: last.snapshot.status,
        changedNow,
        changeType: last.changeType,
      })
    }

    return { changedAt: timestamp, medications: meds, changes }
  })
}

export function ensureMedicationPlanState(
  raw: MedicationPlanState | null | undefined,
  caseId: string,
): MedicationPlanState {
  if (!raw?.plans?.length) return createEmptyMedicationPlanState(caseId)
  return {
    ...raw,
    version: raw.version ?? MEDICATION_PLAN_STATE_VERSION,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    currentPlanId: raw.currentPlanId ?? raw.plans[0]?.id ?? null,
    sideEffectReports: raw.sideEffectReports ?? [],
    curatedTargetReceptors: raw.curatedTargetReceptors,
    plans: raw.plans.map((plan) => ({
      ...plan,
      medications: (plan.medications ?? []).map((med) => ({
        ...med,
        history: med.history ?? [],
        sideEffects: med.sideEffects ?? [],
      })),
    })),
  }
}

export { createEmptyMedicationPlanState }
