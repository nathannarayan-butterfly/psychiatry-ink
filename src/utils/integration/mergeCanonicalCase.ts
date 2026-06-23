/**
 * Merge canonical snapshot into encrypted local vault (client-side only).
 */

import type { CanonicalCaseSnapshot, DiagnosisItem, LabResult, MedicationItem } from '../../types/integration/canonicalClinical'
import type { LabEntry } from '../../types/lab'
import type { MedicationEntry, MedicationPlanState } from '../../types/medicationPlan'
import { createEmptyMedicationPlanState } from '../../types/medicationPlan'
import type { DiagnoseEntry } from '../diagnosenArchive'
import { saveDiagnosen } from '../diagnosenArchive'
import {
  inferDefaultCategoryForNewEntry,
  inferDefaultConfirmationForCategory,
  mergeDiagnosisClassificationFromExternal,
  syncLegacyClassificationFields,
} from '../diagnosisClassification'
import { saveLabGraphsList } from '../labPersistence'
import type { IntegrationMergeScope } from './canonicalScope'
import { filterSnapshotForMerge } from './canonicalScope'
import {
  applyWorkspacePayloadAsync,
  collectClinicalPayload,
  loadEncryptedWorkspace,
  saveEncryptedWorkspace,
  type ClinicalWorkspacePayload,
} from '../workspaceVault'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function mapDiagnosisToEntry(dx: DiagnosisItem, existingEntries: DiagnoseEntry[]): DiagnoseEntry {
  const now = new Date().toISOString()
  const category = inferDefaultCategoryForNewEntry(existingEntries)
  const confirmation = inferDefaultConfirmationForCategory(category)
  const base: DiagnoseEntry = {
    id: dx.id || generateId(),
    icd10: {
      code: dx.icd10Code ?? '',
      label: dx.icd10Label ?? dx.icd10Code ?? '',
      overridden: Boolean(dx.icd10Label),
    },
    icd11: {
      code: dx.icd11Code ?? '',
      label: dx.icd11Label ?? '',
      overridden: Boolean(dx.icd11Label),
    },
    dsm: {
      code: dx.dsmCode ?? '',
      label: dx.dsmLabel ?? '',
      overridden: Boolean(dx.dsmLabel),
    },
    createdAt: now,
    updatedAt: now,
  }
  return syncLegacyClassificationFields(base, category, confirmation)
}

function mergeDiagnoses(existing: DiagnoseEntry[], incoming: DiagnosisItem[]): DiagnoseEntry[] {
  const byCode = new Map(existing.map((entry) => [entry.icd10.code || entry.id, entry]))
  const merged = [...existing]
  for (const dx of incoming) {
    const key = dx.icd10Code || dx.id
    const match = byCode.get(key)
    if (match) {
      const updated = mergeDiagnosisClassificationFromExternal(match, {})
      if (updated !== match) {
        const idx = merged.findIndex((e) => e.id === match.id)
        if (idx >= 0) merged[idx] = updated
      }
      continue
    }
    const entry = mapDiagnosisToEntry(dx, merged)
    byCode.set(key, entry)
    merged.push(entry)
  }
  return merged
}

function parseReferenceRange(range?: string): { low: number | null; high: number | null } {
  if (!range) return { low: null, high: null }
  const match = range.match(/([\d.]+)\s*[–-]\s*([\d.]+)/)
  if (!match) return { low: null, high: null }
  const low = Number.parseFloat(match[1])
  const high = Number.parseFloat(match[2])
  return {
    low: Number.isFinite(low) ? low : null,
    high: Number.isFinite(high) ? high : null,
  }
}

function labResultToEntry(lab: LabResult): LabEntry {
  const { low, high } = parseReferenceRange(lab.referenceRange)
  const numeric = Number(lab.value)
  const now = new Date().toISOString()
  return {
    id: lab.id || generateId(),
    date: lab.observedAt?.slice(0, 10) || now.slice(0, 10),
    parameter: lab.name,
    value: Number.isFinite(numeric) ? numeric : 0,
    unit: lab.unit || '',
    referenceLow: low,
    referenceHigh: high,
    note: '',
    createdAt: now,
    updatedAt: now,
  }
}

function mergeLabResults(payload: ClinicalWorkspacePayload, incoming: LabResult[]): boolean {
  if (incoming.length === 0) return false

  const labGraphs = [...(payload.labGraphs ?? [])]
  let targetIndex = 0
  if (incoming[0]?.graphId) {
    const idx = labGraphs.findIndex((graph) => graph.id === incoming[0].graphId)
    if (idx >= 0) targetIndex = idx
  }

  if (labGraphs.length === 0) {
    labGraphs.push({
      id: crypto.randomUUID(),
      title: 'Import Labor',
      entries: [],
      markers: [],
      selectedParameter: null,
      dateRangePreset: 'all',
      updatedAt: new Date().toISOString(),
    })
    targetIndex = 0
  }

  const target = labGraphs[targetIndex]
  const existingIds = new Set(target.entries.map((entry) => entry.id))
  const newEntries = incoming.map(labResultToEntry).filter((entry) => !existingIds.has(entry.id))
  if (newEntries.length === 0) return false

  labGraphs[targetIndex] = {
    ...target,
    entries: [...target.entries, ...newEntries],
    updatedAt: new Date().toISOString(),
  }
  payload.labGraphs = labGraphs
  if (!payload.activeLabGraphId) payload.activeLabGraphId = labGraphs[targetIndex].id
  return true
}

function mapMedicationItemToEntry(item: MedicationItem): MedicationEntry {
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  return {
    id: item.id || generateId(),
    substance: item.name,
    formulation: 'other',
    strength: item.dose || '',
    doseSchedule: {
      morning: '',
      noon: '',
      evening: '',
      night: '',
      unit: '',
      prn: item.frequency === 'PRN',
    },
    doseLineGerman: [item.dose, item.frequency, item.route].filter(Boolean).join(' '),
    prn: item.frequency === 'PRN',
    startDate: today,
    status:
      item.status === 'stopped' ? 'discontinued' : item.status === 'on-hold' ? 'paused' : 'active',
    indication: item.notes || '',
    reasonForChange: '',
    sideEffects: [],
    adherenceNote: '',
    freeTextLine: item.notes || '',
    introducedAt: now,
    lastChangeAt: now,
    lastChangeType: 'start',
    history: [],
  }
}

function mergeMedicationPlan(
  payload: ClinicalWorkspacePayload,
  caseId: string,
  incoming: MedicationItem[],
): boolean {
  if (incoming.length === 0) return false

  const state: MedicationPlanState =
    payload.medicationPlanState ?? createEmptyMedicationPlanState(caseId)

  let plan = state.plans.find((p) => p.id === state.currentPlanId) ?? state.plans[0]
  if (!plan) {
    const planId = crypto.randomUUID()
    plan = {
      id: planId,
      caseId,
      isCurrent: true,
      medications: [],
      createdAt: new Date().toISOString(),
    }
    state.plans = [plan]
    state.currentPlanId = planId
  }

  const existingIds = new Set(plan.medications.map((med) => med.id))
  const newMeds = incoming.map(mapMedicationItemToEntry).filter((med) => !existingIds.has(med.id))
  if (newMeds.length === 0) return false

  plan.medications = [...plan.medications, ...newMeds]
  state.updatedAt = new Date().toISOString()
  payload.medicationPlanState = state
  return true
}

export async function mergeCanonicalIntoVault(
  caseId: string,
  snapshot: CanonicalCaseSnapshot,
  scope: IntegrationMergeScope = 'full',
): Promise<{ mergedFields: string[]; payload: ClinicalWorkspacePayload }> {
  const scoped = filterSnapshotForMerge(snapshot, scope)
  const loaded = await loadEncryptedWorkspace(caseId)
  const payload = loaded?.payload ?? collectClinicalPayload(undefined, caseId)
  const mergedFields: string[] = []

  if (scoped.diagnoses.length > 0) {
    payload.diagnoses = mergeDiagnoses(payload.diagnoses ?? [], scoped.diagnoses)
    saveDiagnosen(caseId, payload.diagnoses)
    mergedFields.push('diagnoses')
  }

  if (scoped.labResults.length > 0 && mergeLabResults(payload, scoped.labResults)) {
    saveLabGraphsList(payload.labGraphs ?? [], caseId)
    mergedFields.push('labResults')
  }

  const medicationItems = scoped.medicationPlan?.items ?? []
  if (medicationItems.length > 0 && mergeMedicationPlan(payload, caseId, medicationItems)) {
    mergedFields.push('medicationPlan')
  }

  if (mergedFields.length > 0) {
    payload.updatedAt = new Date().toISOString()
    await applyWorkspacePayloadAsync(payload, caseId)
    await saveEncryptedWorkspace(undefined, caseId)
  }

  return { mergedFields, payload }
}
