import type {
  MedicationChangeType,
  MedicationEntry,
  MedicationPlan,
  MedicationPlanState,
  SideEffectReport,
} from '../../types/medicationPlan'
import {
  createEmptyDoseSchedule,
  createEmptyMedicationPlanState,
  MEDICATION_PLAN_STATE_VERSION,
} from '../../types/medicationPlan'
import { formatDoseLineGerman } from './doseLine'
import { buildReadableClinicalSentence } from './doseLine'
import type { UiLanguage } from '../../types/settings'

export interface MedicationDraft {
  substance: string
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

export function medicationDraftFromEntry(entry: MedicationEntry): MedicationDraft {
  return {
    substance: entry.substance,
    formulation: entry.formulation,
    strength: entry.strength,
    doseSchedule: { ...entry.doseSchedule },
    prn: entry.prn,
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
  const schedule = {
    ...draft.doseSchedule,
    prn: draft.prn,
    depotInterval: draft.depotInterval.trim() || undefined,
  }
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
