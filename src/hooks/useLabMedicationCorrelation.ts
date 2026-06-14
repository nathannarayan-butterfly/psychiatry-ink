import { useCallback, useMemo, useState } from 'react'
import type { MedicationEntry, MedicationPlanState } from '../types/medicationPlan'
import { isMedicationVisible } from '../utils/medication/planOps'
import type {
  LabCorrelationAIResult,
} from '../types/labMedicationCorrelation'
import {
  acceptLabCorrelationFinding,
  rejectLabCorrelationFinding,
  requestOpenAiSecondOpinion,
  runLabMedicationCorrelation,
  type LabCorrelationMedicationInput,
} from '../services/labMedicationCorrelationApi'
import { getClinicalApiLanguage } from '../services/clinicalApiFetch'
import {
  collectLabObservations,
  collectLastTwoLabSnapshots,
} from '../utils/labMedicationCorrelation/collectLabContext'
import type { UiLanguage } from '../types/settings'
import {
  loadLabMedCorrelationStore,
  mergeLabMedCorrelationRunResult,
  saveLabMedCorrelationStore,
} from '../utils/labMedicationCorrelation/storage'

function toMedicationInput(med: MedicationEntry): LabCorrelationMedicationInput {
  return {
    id: med.id,
    substance: med.substance,
    strength: med.strength,
    doseLineGerman: med.doseLineGerman,
    formulation: med.formulation,
    status: med.status,
    startDate: med.startDate,
    lastChangeAt: med.lastChangeAt,
    lastChangeType: med.lastChangeType,
  }
}

function activeMedications(medications: MedicationEntry[]): MedicationEntry[] {
  return medications.filter(
    (m) =>
      isMedicationVisible(m) &&
      (m.status === 'active' || m.status === 'reduced' || m.status === 'increased'),
  )
}

export function useLabMedicationCorrelation(
  caseId: string,
  medications: MedicationEntry[],
  state: MedicationPlanState,
  language: UiLanguage = getClinicalApiLanguage(),
) {
  const [store, setStore] = useState(() => loadLabMedCorrelationStore(caseId))
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoNote, setInfoNote] = useState<string | null>(null)

  const active = useMemo(() => activeMedications(medications), [medications])
  const lastTwoLabSnapshots = useMemo(() => collectLastTwoLabSnapshots(caseId), [caseId])
  const labObservations = useMemo(() => collectLabObservations(caseId), [caseId])

  const visibleFindings = useMemo(() => {
    return store.findings.filter(
      (f) =>
        (f.status !== 'rejected' && f.status !== 'not_relevant') ||
        (f.status === 'rejected' && f.deepseekRejected && !f.openaiRunId),
    )
  }, [store.findings])

  const pendingAiRuns = useMemo(
    () => store.aiRuns.filter((r) => r.status === 'pending_clinician_review'),
    [store.aiRuns],
  )

  const runCorrelation = useCallback(
    async (options?: { correlationKey?: string }) => {
      if (active.length === 0 || lastTwoLabSnapshots.length === 0) return
      setRunning(true)
      setError(null)
      setInfoNote(null)
      try {
        const result = await runLabMedicationCorrelation({
          caseId,
          medications: active.map(toMedicationInput),
          lastTwoLabSnapshots,
          labObservations,
          clinicalNotes: state.labCorrelationNotes,
          correlationKey: options?.correlationKey,
          language,
        })
        const next = mergeLabMedCorrelationRunResult(caseId, result.findings, result.aiRuns)
        setStore(next)
        if (result.infoNote) setInfoNote(result.infoNote)
        if (result.aiWarning) setError(result.aiWarning)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'KI-Anfrage fehlgeschlagen: Korrelationsprüfung fehlgeschlagen')
      } finally {
        setRunning(false)
      }
    },
    [active, caseId, labObservations, language, lastTwoLabSnapshots, state.labCorrelationNotes],
  )

  const acceptFinding = useCallback(
    async (findingId: string, options?: { clinicianNote?: string; editedResult?: LabCorrelationAIResult }) => {
      setError(null)
      try {
        const { run, finding } = await acceptLabCorrelationFinding(findingId, options)
        const current = loadLabMedCorrelationStore(caseId)
        const findings = current.findings.filter(
          (f) => f.id !== findingId && f.correlationKey !== finding.correlationKey,
        )
        findings.push(finding)
        const aiRuns = current.aiRuns.map((r) => (r.id === run.id ? run : r))
        const next = { ...current, findings, aiRuns }
        saveLabMedCorrelationStore(next)
        setStore(next)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Akzeptieren fehlgeschlagen')
      }
    },
    [caseId],
  )

  const rejectFinding = useCallback(
    async (findingId: string, options?: { clinicianNote?: string }) => {
      setError(null)
      try {
        const { run, finding } = await rejectLabCorrelationFinding(findingId, options)
        const current = loadLabMedCorrelationStore(caseId)
        const findings = current.findings.map((f) => (f.id === findingId ? finding : f))
        const aiRuns = current.aiRuns.map((r) => (r.id === run.id ? run : r))
        saveLabMedCorrelationStore({ ...current, findings, aiRuns })
        setStore(loadLabMedCorrelationStore(caseId))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verwerfen fehlgeschlagen')
      }
    },
    [caseId],
  )

  const startOpenAiSecondOpinion = useCallback(
    async (findingId: string) => {
      setError(null)
      try {
        const { run, finding } = await requestOpenAiSecondOpinion(findingId)
        const current = loadLabMedCorrelationStore(caseId)
        const findings = current.findings.map((f) => (f.id === findingId ? finding : f))
        const aiRuns = [...current.aiRuns.filter((r) => r.id !== run.id), run]
        saveLabMedCorrelationStore({ ...current, findings, aiRuns })
        setStore(loadLabMedCorrelationStore(caseId))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OpenAI-Zweitprüfung fehlgeschlagen')
      }
    },
    [caseId],
  )

  const updateFindingNote = useCallback(
    (findingId: string, clinicianNote: string) => {
      const current = loadLabMedCorrelationStore(caseId)
      const findings = current.findings.map((f) =>
        f.id === findingId ? { ...f, clinicianNote, updatedAt: new Date().toISOString() } : f,
      )
      saveLabMedCorrelationStore({ ...current, findings })
      setStore(loadLabMedCorrelationStore(caseId))
    },
    [caseId],
  )

  const markRelevance = useCallback(
    (findingId: string, isRelevant: boolean) => {
      const current = loadLabMedCorrelationStore(caseId)
      const findings = current.findings.map((f) =>
        f.id === findingId
          ? {
              ...f,
              isRelevant,
              status: isRelevant ? f.status : ('not_relevant' as const),
              updatedAt: new Date().toISOString(),
            }
          : f,
      )
      saveLabMedCorrelationStore({ ...current, findings })
      setStore(loadLabMedCorrelationStore(caseId))
    },
    [caseId],
  )

  return {
    visibleFindings,
    pendingAiRuns,
    running,
    error,
    infoNote,
    labObservations,
    lastTwoLabSnapshots,
    runCorrelation,
    acceptFinding,
    rejectFinding,
    startOpenAiSecondOpinion,
    updateFindingNote,
    markRelevance,
    canRun: active.length > 0 && lastTwoLabSnapshots.length > 0,
  }
}

/** Deferred: auto-run on lab import or medication change. */
export function maybeTriggerLabCorrelation(_caseId: string): void {
  // hook stub — wire when lab import / med-change events are centralized
}
