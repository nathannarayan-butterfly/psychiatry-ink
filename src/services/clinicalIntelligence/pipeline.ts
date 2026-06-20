/**
 * Clinical Intelligence — pipeline orchestrator (client).
 *
 * Single entry point that:
 *   1. Builds the de-identified compact evidence base from the workspace.
 *   2. Refuses to run when the evidence base is missing or too thin.
 *   3. Calls the server `/api/clinical-intelligence/run` endpoint.
 *   4. Applies the result + audit entries to the per-case CI state.
 */

import { buildDiscussionPackage } from '../../utils/discussCase/buildPackage'
import { collectClinicalPayload } from '../../utils/workspaceVault'
import {
  CompactEvidencePayloadSchema,
  compactEvidenceFromDiscussPackage,
  hasUsableCompactEvidence,
  type ClinicalIntelligenceCaseState,
  type ClinicalIntelligenceRunResponse,
  type CompactEvidencePayload,
} from '../../types/clinicalIntelligence'
import {
  applyRunResult,
  recordEvidenceBaseMissing,
  recordRunFailed,
  recordRunStarted,
} from '../../utils/clinicalIntelligence/audit'
import {
  assertCompactEvidenceOnly,
} from '../../utils/clinicalIntelligence/evidenceFilter'
import { runClinicalIntelligence } from './api'
import type { UiLanguage } from '../../types/settings'

export class ClinicalIntelligenceEvidenceMissingError extends Error {
  readonly code = 'evidence_base_missing' as const
  constructor(message = 'Clinical Intelligence evidence base is missing or empty.') {
    super(message)
    this.name = 'ClinicalIntelligenceEvidenceMissingError'
  }
}

export interface BuildCompactEvidenceParams {
  caseId: string
}

/** Build a de-identified compact evidence payload from the workspace vault. */
export function buildCompactEvidenceForCase(
  params: BuildCompactEvidenceParams,
): CompactEvidencePayload {
  const payload = collectClinicalPayload(undefined, params.caseId)
  const { deidentified } = buildDiscussionPackage({
    caseId: params.caseId,
    payload,
    selectedSections: [
      'diagnosis',
      'anamnesis',
      'therapie-verlauf',
      'investigations',
      'current-therapy',
      'medication',
      'side-effects',
      'risk',
    ],
  })
  const compact = compactEvidenceFromDiscussPackage(deidentified)
  // Round-trip through the schema for normalised default fields.
  const parsed = CompactEvidencePayloadSchema.safeParse(compact)
  if (!parsed.success) {
    return compact
  }
  return parsed.data
}

export interface RunPipelineParams {
  caseId: string
  language: UiLanguage
  state: ClinicalIntelligenceCaseState
  /** Provided externally for tests / preview; falls back to building from the case. */
  evidence?: CompactEvidencePayload
}

export interface RunPipelineSuccess {
  ok: true
  state: ClinicalIntelligenceCaseState
  run: ClinicalIntelligenceRunResponse
  evidence: CompactEvidencePayload
}

export interface RunPipelineFailure {
  ok: false
  state: ClinicalIntelligenceCaseState
  error: Error
  reason:
    | 'evidence_base_missing'
    | 'evidence_invalid'
    | 'api_error'
    | 'unknown'
}

export type RunPipelineResult = RunPipelineSuccess | RunPipelineFailure

export async function runClinicalIntelligencePipeline(
  params: RunPipelineParams,
): Promise<RunPipelineResult> {
  const evidenceRaw = params.evidence ?? buildCompactEvidenceForCase({ caseId: params.caseId })

  // Hard rule: block when the evidence base is missing.
  if (!hasUsableCompactEvidence(evidenceRaw)) {
    const state = recordEvidenceBaseMissing(params.state)
    return {
      ok: false,
      state,
      error: new ClinicalIntelligenceEvidenceMissingError(),
      reason: 'evidence_base_missing',
    }
  }

  let evidence: CompactEvidencePayload
  try {
    evidence = assertCompactEvidenceOnly(evidenceRaw)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const state = recordRunFailed(params.state, message)
    return {
      ok: false,
      state,
      error: error instanceof Error ? error : new Error(message),
      reason: 'evidence_invalid',
    }
  }

  const stateAfterStart = recordRunStarted(params.state)

  try {
    const run = await runClinicalIntelligence({
      language: params.language,
      evidence,
      rejectedDimensionIds: stateAfterStart.rejectedDimensionIds,
      rejectedMechanismIds: stateAfterStart.rejectedMechanismIds,
      layers: ['dimensional', 'mechanism'],
    })
    const nextState = applyRunResult(stateAfterStart, run)
    return { ok: true, state: nextState, run, evidence }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const state = recordRunFailed(stateAfterStart, message)
    return {
      ok: false,
      state,
      error: error instanceof Error ? error : new Error(message),
      reason: 'api_error',
    }
  }
}
