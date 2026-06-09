import type { ClinicalWorkspacePayload } from '../workspaceVault'
import type { ClinicalImprintIndex } from '../../types/clinicalImprint'
import { buildImprintIndexFromJobs, collectPayloadImprintJobs } from './orchestrator'
import { applyClinicalImprintIndex, loadClinicalImprintIndex } from './storage'

/** Synchronously rebuild imprint index from a clinical payload (import / restore). */
export function buildImprintIndexFromPayload(
  caseId: string,
  payload: ClinicalWorkspacePayload,
): ClinicalImprintIndex {
  const jobs = collectPayloadImprintJobs(caseId, payload)
  return buildImprintIndexFromJobs(jobs)
}

/** Rebuild imprint index from a clinical payload (import / restore fallback). */
export function reindexClinicalPayload(caseId: string, payload: ClinicalWorkspacePayload): ClinicalImprintIndex {
  const index = buildImprintIndexFromPayload(caseId, payload)
  applyClinicalImprintIndex(index, caseId)
  return index
}

export function resolveImprintIndexForPayload(
  caseId: string,
  payload: ClinicalWorkspacePayload,
): ClinicalImprintIndex {
  if (payload.clinicalImprints?.imprints?.length) {
    return payload.clinicalImprints
  }

  const local = loadClinicalImprintIndex(caseId)
  if (local.imprints.length > 0) return local

  return reindexClinicalPayload(caseId, payload)
}
