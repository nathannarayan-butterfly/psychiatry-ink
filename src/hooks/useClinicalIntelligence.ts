/**
 * Clinical Intelligence — React state hook (per case).
 *
 * Owns the in-memory CI state for a case:
 *   - latest run result
 *   - rejected dimension/mechanism ids (persisted across runs)
 *   - audit trail
 *
 * Persists to localStorage and rehydrates on case change. Subscribes to the
 * change event so other tabs/components stay in sync.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ClinicalIntelligenceCaseState,
  ClinicalIntelligenceDimensionId,
  ClinicalIntelligenceMechanismId,
  ClinicalIntelligenceRunResponse,
  CiDiscussMessage,
  CompactEvidencePayload,
  DimensionalFinding,
  MechanismHypothesis,
} from '../types/clinicalIntelligence'
import { useTranslation } from '../context/TranslationContext'
import {
  acceptAllPendingDimensions as acceptAllPendingDimensionsOp,
  acceptAllPendingMechanisms as acceptAllPendingMechanismsOp,
  acceptDimension as acceptDimensionOp,
  acceptMechanism as acceptMechanismOp,
  editDimension as editDimensionOp,
  editMechanism as editMechanismOp,
  rejectDimension as rejectDimensionOp,
  rejectMechanism as rejectMechanismOp,
  saveAcceptedFindings as saveAcceptedFindingsOp,
  saveClinicianComment as saveClinicianCommentOp,
  setDiscussMessages as setDiscussMessagesOp,
} from '../utils/clinicalIntelligence/audit'
import {
  CLINICAL_INTELLIGENCE_CHANGED_EVENT,
  loadClinicalIntelligenceState,
  saveClinicalIntelligenceState,
  type ClinicalIntelligenceChangedDetail,
} from '../utils/clinicalIntelligence/storage'
import { ensureDemoClinicalIntelligenceForCase } from '../demo/ensureDemoClinicalIntelligence'
import {
  buildCompactEvidenceForCase,
  ClinicalIntelligenceEvidenceMissingError,
  runClinicalIntelligencePipeline,
  type RunPipelineResult,
} from '../services/clinicalIntelligence/pipeline'
import {
  CompactEvidenceFilterError,
  assertCompactEvidenceOnly,
  safeAssertCompactEvidence,
} from '../utils/clinicalIntelligence/evidenceFilter'

export type CiRunStatus = 'idle' | 'running' | 'success' | 'error'

/** Which layer(s) `acceptAll` should bulk-accept. */
export type CiAcceptAllLayer = 'dimensional' | 'mechanism' | 'all'

export interface CiAcceptAllResult {
  dimensionsAccepted: number
  mechanismsAccepted: number
}

export interface UseClinicalIntelligenceResult {
  state: ClinicalIntelligenceCaseState
  status: CiRunStatus
  error: { code: string; message: string } | null
  /** Last computed compact evidence preview (rebuilt on demand). */
  evidence: CompactEvidencePayload | null
  evidenceError: CompactEvidenceFilterError | null
  hasEvidenceBase: boolean
  hasLatestRun: boolean
  latestRun: ClinicalIntelligenceRunResponse | null

  refreshEvidencePreview: () => void
  runPipeline: () => Promise<RunPipelineResult>

  acceptDimension: (id: ClinicalIntelligenceDimensionId) => void
  editDimension: (
    id: ClinicalIntelligenceDimensionId,
    patch: Partial<
      Pick<
        DimensionalFinding,
        'clinicalSummary' | 'longitudinalPattern' | 'uncertainty' | 'missingData' | 'severity' | 'confidence'
      >
    >,
  ) => void
  rejectDimension: (id: ClinicalIntelligenceDimensionId, notes?: string) => void

  acceptMechanism: (id: ClinicalIntelligenceMechanismId) => void
  editMechanism: (
    id: ClinicalIntelligenceMechanismId,
    patch: Partial<
      Pick<MechanismHypothesis, 'clinicalImplication' | 'treatmentRelevance' | 'uncertainty' | 'confidence'>
    >,
  ) => void
  rejectMechanism: (id: ClinicalIntelligenceMechanismId, notes?: string) => void

  /**
   * Bulk-accept every pending dimensional and/or mechanism finding. Returns
   * the number of items newly accepted per layer. Exploratory items and
   * already-rejected items are never touched.
   */
  acceptAll: (layer?: CiAcceptAllLayer) => CiAcceptAllResult

  saveClinicianComment: (comment: string) => void
  saveAcceptedFindings: (savedAt?: string) => void
  setDiscussMessages: (messages: CiDiscussMessage[]) => void
}

export function useClinicalIntelligence(caseId: string): UseClinicalIntelligenceResult {
  const { language } = useTranslation()
  const [state, setState] = useState<ClinicalIntelligenceCaseState>(() =>
    ensureDemoClinicalIntelligenceForCase(caseId, loadClinicalIntelligenceState(caseId)),
  )
  const [status, setStatus] = useState<CiRunStatus>('idle')
  const [error, setError] = useState<{ code: string; message: string } | null>(null)
  const [evidence, setEvidence] = useState<CompactEvidencePayload | null>(null)
  const [evidenceError, setEvidenceError] = useState<CompactEvidenceFilterError | null>(null)
  const runningRef = useRef(false)

  const persist = useCallback((next: ClinicalIntelligenceCaseState) => {
    saveClinicalIntelligenceState(next)
    setState(next)
  }, [])

  useEffect(() => {
    setState(ensureDemoClinicalIntelligenceForCase(caseId, loadClinicalIntelligenceState(caseId)))
    setStatus('idle')
    setError(null)
  }, [caseId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    function handle(event: Event) {
      const detail = (event as CustomEvent<ClinicalIntelligenceChangedDetail>).detail
      if (detail?.caseId === caseId) {
        setState(detail.state)
      }
    }
    window.addEventListener(CLINICAL_INTELLIGENCE_CHANGED_EVENT, handle)
    return () => window.removeEventListener(CLINICAL_INTELLIGENCE_CHANGED_EVENT, handle)
  }, [caseId])

  const refreshEvidencePreview = useCallback(() => {
    try {
      const compact = buildCompactEvidenceForCase({ caseId })
      const safe = safeAssertCompactEvidence(compact)
      if (safe.ok) {
        setEvidence(safe.data)
        setEvidenceError(null)
      } else {
        setEvidence(compact)
        setEvidenceError(safe.error)
      }
    } catch (caught) {
      setEvidence(null)
      setEvidenceError(
        caught instanceof CompactEvidenceFilterError
          ? caught
          : new CompactEvidenceFilterError('invalid_shape', String((caught as Error)?.message ?? caught)),
      )
    }
  }, [caseId])

  useEffect(() => {
    refreshEvidencePreview()
  }, [refreshEvidencePreview])

  const runPipeline = useCallback(async (): Promise<RunPipelineResult> => {
    if (runningRef.current) {
      return {
        ok: false,
        state,
        error: new Error('Clinical Intelligence run already in progress'),
        reason: 'unknown',
      }
    }
    runningRef.current = true
    setStatus('running')
    setError(null)
    try {
      let compact: CompactEvidencePayload | null = null
      try {
        compact = assertCompactEvidenceOnly(buildCompactEvidenceForCase({ caseId }))
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : 'Evidence base missing or invalid'
        const code =
          caught instanceof CompactEvidenceFilterError ? caught.code : 'evidence_invalid'
        setError({ code, message })
        setStatus('error')
        runningRef.current = false
        return {
          ok: false,
          state,
          error:
            caught instanceof Error
              ? caught
              : new ClinicalIntelligenceEvidenceMissingError(message),
          reason: code === 'empty' ? 'evidence_base_missing' : 'evidence_invalid',
        }
      }

      const result = await runClinicalIntelligencePipeline({
        caseId,
        language,
        state,
        evidence: compact,
      })

      persist(result.state)
      if (result.ok) {
        setStatus('success')
        setError(null)
      } else {
        setStatus('error')
        setError({ code: result.reason, message: result.error.message })
      }
      return result
    } finally {
      runningRef.current = false
    }
  }, [caseId, language, persist, state])

  const acceptDimension = useCallback(
    (id: ClinicalIntelligenceDimensionId) => {
      persist(acceptDimensionOp(state, id))
    },
    [persist, state],
  )

  const editDimension = useCallback(
    (
      id: ClinicalIntelligenceDimensionId,
      patch: Partial<
        Pick<
          DimensionalFinding,
          'clinicalSummary' | 'longitudinalPattern' | 'uncertainty' | 'missingData' | 'severity' | 'confidence'
        >
      >,
    ) => {
      persist(editDimensionOp(state, id, patch))
    },
    [persist, state],
  )

  const rejectDimension = useCallback(
    (id: ClinicalIntelligenceDimensionId, notes?: string) => {
      persist(rejectDimensionOp(state, id, notes))
    },
    [persist, state],
  )

  const acceptMechanism = useCallback(
    (id: ClinicalIntelligenceMechanismId) => {
      persist(acceptMechanismOp(state, id))
    },
    [persist, state],
  )

  const editMechanism = useCallback(
    (
      id: ClinicalIntelligenceMechanismId,
      patch: Partial<
        Pick<MechanismHypothesis, 'clinicalImplication' | 'treatmentRelevance' | 'uncertainty' | 'confidence'>
      >,
    ) => {
      persist(editMechanismOp(state, id, patch))
    },
    [persist, state],
  )

  const rejectMechanism = useCallback(
    (id: ClinicalIntelligenceMechanismId, notes?: string) => {
      persist(rejectMechanismOp(state, id, notes))
    },
    [persist, state],
  )

  const acceptAll = useCallback(
    (layer: CiAcceptAllLayer = 'all'): CiAcceptAllResult => {
      let working = state
      let dimensionsAccepted = 0
      let mechanismsAccepted = 0
      if (layer === 'dimensional' || layer === 'all') {
        const result = acceptAllPendingDimensionsOp(working)
        working = result.state
        dimensionsAccepted = result.acceptedIds.length
      }
      if (layer === 'mechanism' || layer === 'all') {
        const result = acceptAllPendingMechanismsOp(working)
        working = result.state
        mechanismsAccepted = result.acceptedIds.length
      }
      if (dimensionsAccepted > 0 || mechanismsAccepted > 0) {
        persist(working)
      }
      return { dimensionsAccepted, mechanismsAccepted }
    },
    [persist, state],
  )

  const saveClinicianComment = useCallback(
    (comment: string) => {
      persist(saveClinicianCommentOp(state, comment))
    },
    [persist, state],
  )

  const saveAcceptedFindings = useCallback(
    (savedAt?: string) => {
      persist(saveAcceptedFindingsOp(state, savedAt))
    },
    [persist, state],
  )

  const setDiscussMessages = useCallback(
    (messages: CiDiscussMessage[]) => {
      persist(setDiscussMessagesOp(state, messages))
    },
    [persist, state],
  )

  const hasLatestRun = useMemo(() => Boolean(state.latestRun), [state.latestRun])
  const hasEvidenceBase = useMemo(() => {
    if (!evidence) return false
    return evidence.items.some((item) => item.text.trim().length >= 20)
  }, [evidence])

  return {
    state,
    status,
    error,
    evidence,
    evidenceError,
    hasEvidenceBase,
    hasLatestRun,
    latestRun: state.latestRun,
    refreshEvidencePreview,
    runPipeline,
    acceptDimension,
    editDimension,
    rejectDimension,
    acceptMechanism,
    editMechanism,
    rejectMechanism,
    acceptAll,
    saveClinicianComment,
    saveAcceptedFindings,
    setDiscussMessages,
  }
}
