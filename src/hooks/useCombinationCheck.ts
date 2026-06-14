import { useCallback, useMemo, useState } from 'react'
import type { MedicationEntry, MedicationPlanState } from '../types/medicationPlan'
import { isMedicationVisible } from '../utils/medication/planOps'
import type {
  CombinationCheckAIResult,
  PatientCombinationCheckFinding,
} from '../types/combinationCheck'
import {
  acceptCombinationAiRun,
  rejectCombinationAiRun,
  runCombinationCheck,
  type CombinationCheckMedicationInput,
} from '../services/combinationCheckApi'
import { getClinicalApiLanguage } from '../services/clinicalApiFetch'
import {
  loadCombinationCheckStore,
  mergeCombinationCheckRunResult,
  saveCombinationCheckStore,
} from '../utils/combinationCheck/storage'
import { translateMedicationUi } from '../data/medicationUiTranslations'
import type { UiLanguage } from '../types/settings'

function toMedicationInput(med: MedicationEntry): CombinationCheckMedicationInput {
  return {
    id: med.id,
    substance: med.substance,
    strength: med.strength,
    doseLineGerman: med.doseLineGerman,
    formulation: med.formulation,
    status: med.status,
  }
}

function activeMedications(medications: MedicationEntry[]): MedicationEntry[] {
  return medications.filter(
    (m) =>
      isMedicationVisible(m) &&
      (m.status === 'active' || m.status === 'reduced' || m.status === 'increased'),
  )
}

const EMPTY_RISK_PATTERNS = [
  'keine relevante wechselwirkung',
  'keine wechselwirkung',
  'no relevant interaction',
]

function isEmptyMainRisk(mainRisk: string): boolean {
  const normalized = mainRisk.trim().toLowerCase()
  if (!normalized) return true
  return EMPTY_RISK_PATTERNS.some((pattern) => normalized.includes(pattern))
}

function hasClinicalContent(finding: PatientCombinationCheckFinding): boolean {
  return Boolean(
    finding.mechanism?.trim() ||
      finding.monitoring?.trim() ||
      finding.clinicalManagement?.trim(),
  )
}

/** Pairs worth an expandable row: findings, KB hits, or pending KI review. */
export function isSignificantCombinationFinding(finding: PatientCombinationCheckFinding): boolean {
  if (finding.status === 'pending_clinician_review') return true
  if (finding.severity !== 'none') return true
  if (hasClinicalContent(finding) && !isEmptyMainRisk(finding.mainRisk)) return true
  return false
}

export function partitionCombinationFindings(findings: PatientCombinationCheckFinding[]): {
  significant: PatientCombinationCheckFinding[]
  none: PatientCombinationCheckFinding[]
} {
  const significant: PatientCombinationCheckFinding[] = []
  const none: PatientCombinationCheckFinding[] = []
  for (const finding of findings) {
    if (isSignificantCombinationFinding(finding)) {
      significant.push(finding)
    } else {
      none.push(finding)
    }
  }
  return { significant, none }
}

export function formatCombinationPairLabel(finding: PatientCombinationCheckFinding): string {
  return `${finding.substanceAName} + ${finding.substanceBName}`
}

export function formatNoneCombinationSummary(
  findings: PatientCombinationCheckFinding[],
  language: UiLanguage = getClinicalApiLanguage(),
): string {
  if (findings.length === 0) return ''
  const labels = findings.map(formatCombinationPairLabel)
  const pairList =
    labels.length <= 4
      ? labels.join(', ')
      : translateMedicationUi(language, 'medCombinationNoneSummaryMany')
          .replace('{pairs}', labels.slice(0, 4).join(', '))
          .replace('{count}', String(labels.length))
  return translateMedicationUi(language, 'medCombinationNoneSummary').replace('{pairs}', pairList)
}

export function useCombinationCheck(
  caseId: string,
  medications: MedicationEntry[],
  state: MedicationPlanState,
  language: UiLanguage = getClinicalApiLanguage(),
) {
  const [store, setStore] = useState(() => loadCombinationCheckStore(caseId))
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = useMemo(() => activeMedications(medications), [medications])

  const visibleFindings = useMemo(() => {
    return store.findings.filter((f) => f.status !== 'rejected' && f.status !== 'not_relevant')
  }, [store.findings])

  const partitionedFindings = useMemo(
    () => partitionCombinationFindings(visibleFindings),
    [visibleFindings],
  )

  const pendingAiRuns = useMemo(
    () => store.aiRuns.filter((r) => r.status === 'pending_clinician_review'),
    [store.aiRuns],
  )

  const refreshStore = useCallback(() => {
    setStore(loadCombinationCheckStore(caseId))
  }, [caseId])

  const runCheck = useCallback(
    async (options?: { thorough?: boolean; combinationKey?: string }) => {
      if (active.length < 2) return
      setRunning(true)
      setError(null)
      try {
        const result = await runCombinationCheck({
          caseId,
          medications: active.map(toMedicationInput),
          labNotes: state.labCorrelationNotes,
          thorough: options?.thorough,
          combinationKey: options?.combinationKey,
          language,
        })
        const next = mergeCombinationCheckRunResult(caseId, result.findings, result.aiRuns)
        setStore(next)
        if (result.aiWarning) setError(result.aiWarning)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'KI-Anfrage fehlgeschlagen: Kombinationscheck fehlgeschlagen')
      } finally {
        setRunning(false)
      }
    },
    [active, caseId, language, state.labCorrelationNotes],
  )

  const acceptAi = useCallback(
    async (runId: string, options?: { clinicianNote?: string; editedResult?: CombinationCheckAIResult }) => {
      setError(null)
      try {
        const { run, finding } = await acceptCombinationAiRun(runId, options)
        const current = loadCombinationCheckStore(caseId)
        const findings = current.findings.filter(
          (f) => f.aiRunId !== runId && f.combinationKey !== finding.combinationKey,
        )
        findings.push(finding)
        const aiRuns = current.aiRuns.map((r) => (r.id === runId ? run : r))
        const next = { ...current, findings, aiRuns }
        saveCombinationCheckStore(next)
        setStore(next)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Akzeptieren fehlgeschlagen')
      }
    },
    [caseId],
  )

  const rejectAi = useCallback(
    async (runId: string, options?: { clinicianNote?: string; reRunThorough?: boolean; combinationKey?: string }) => {
      setError(null)
      try {
        const { run } = await rejectCombinationAiRun(runId, { clinicianNote: options?.clinicianNote })
        const current = loadCombinationCheckStore(caseId)
        const findings = current.findings.map((f) =>
          f.aiRunId === runId ? { ...f, status: 'rejected' as const, updatedAt: new Date().toISOString() } : f,
        )
        const aiRuns = current.aiRuns.map((r) => (r.id === runId ? run : r))
        saveCombinationCheckStore({ ...current, findings, aiRuns })
        setStore(loadCombinationCheckStore(caseId))

        if (options?.reRunThorough && options.combinationKey) {
          await runCheck({ thorough: true, combinationKey: options.combinationKey })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verwerfen fehlgeschlagen')
      }
    },
    [caseId, runCheck],
  )

  const updateFindingNote = useCallback(
    (findingId: string, clinicianNote: string) => {
      const current = loadCombinationCheckStore(caseId)
      const findings = current.findings.map((f) =>
        f.id === findingId
          ? { ...f, clinicianNote, updatedAt: new Date().toISOString() }
          : f,
      )
      saveCombinationCheckStore({ ...current, findings })
      setStore(loadCombinationCheckStore(caseId))
    },
    [caseId],
  )

  const markRelevance = useCallback(
    (findingId: string, isRelevant: boolean) => {
      const current = loadCombinationCheckStore(caseId)
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
      saveCombinationCheckStore({ ...current, findings })
      setStore(loadCombinationCheckStore(caseId))
    },
    [caseId],
  )

  return {
    visibleFindings,
    significantFindings: partitionedFindings.significant,
    noneFindings: partitionedFindings.none,
    pendingAiRuns,
    running,
    error,
    runCheck,
    acceptAi,
    rejectAi,
    updateFindingNote,
    markRelevance,
    refreshStore,
    canRun: active.length >= 2,
  }
}
