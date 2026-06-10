import type { ClinicalWorkspacePayload } from '../workspaceVault'
import type { ClinicalImprintIndex } from '../../types/clinicalImprint'
import { buildImprintIndexFromJobs, collectPayloadImprintJobs } from './orchestrator'
import { applyClinicalImprintIndex } from './storage'

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
