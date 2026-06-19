import type { ClinicalImportCandidate } from '../../schemas/documentImport/envelope'
import type { ReviewStatus } from '../../components/documentImport/CandidateReviewRow'

/** True when a candidate still needs clinician attention in the review step. */
export function candidateNeedsReview(
  candidate: ClinicalImportCandidate,
  status: ReviewStatus,
): boolean {
  if (status !== 'pending') return false
  if ((candidate.clarifications?.length ?? 0) > 0) return true
  if (candidate.confidence === 'low') return true
  if (candidate.module === 'document') return true
  if (candidate.aiSuggested) return true
  return false
}

/** Parser-detected candidates safe to bulk-accept without manual review. */
export function candidateIsAutoAcceptable(candidate: ClinicalImportCandidate): boolean {
  if ((candidate.clarifications?.length ?? 0) > 0) return false
  if (candidate.module === 'document') return false
  if (candidate.confidence === 'high') return true
  if (candidate.confidence === 'medium' && !candidate.aiSuggested) return true
  return false
}
