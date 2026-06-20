/**
 * Clinical Intelligence — review status aggregation for the right rail.
 *
 * Counts evidence_based findings only in the main stats. Rejected items are
 * tracked via rejected*Ids because rejectDimension/rejectMechanism removes them
 * from active lists.
 */

import type {
  ClinicalIntelligenceCaseState,
  ClinicalIntelligenceRunResponse,
} from '../../types/clinicalIntelligence'

export interface CiLayerReviewCounts {
  accepted: number
  pending: number
  rejected: number
}

export interface CiReviewCounts {
  dimensional: CiLayerReviewCounts
  mechanism: CiLayerReviewCounts
  exploratoryDimensional: number
  exploratoryMechanism: number
}

function countEvidenceBasedLayer<T extends { source: string; reviewStatus: string }>(
  items: T[],
): Pick<CiLayerReviewCounts, 'accepted' | 'pending'> {
  let accepted = 0
  let pending = 0
  for (const item of items) {
    if (item.source !== 'evidence_based') continue
    if (item.reviewStatus === 'accepted' || item.reviewStatus === 'edited') {
      accepted += 1
    } else if (item.reviewStatus === 'pending') {
      pending += 1
    }
  }
  return { accepted, pending }
}

export function computeCiReviewCounts(
  state: ClinicalIntelligenceCaseState,
  run: ClinicalIntelligenceRunResponse | null,
): CiReviewCounts {
  const dimensional = run
    ? countEvidenceBasedLayer(run.dimensional.activeDimensions)
    : { accepted: 0, pending: 0 }
  const mechanism = run
    ? countEvidenceBasedLayer(run.mechanism.activeMechanisms)
    : { accepted: 0, pending: 0 }

  return {
    dimensional: {
      ...dimensional,
      rejected: state.rejectedDimensionIds.length,
    },
    mechanism: {
      ...mechanism,
      rejected: state.rejectedMechanismIds.length,
    },
    exploratoryDimensional: run?.dimensional.exploratoryInsufficientEvidence.length ?? 0,
    exploratoryMechanism: run?.mechanism.exploratoryInsufficientEvidence.length ?? 0,
  }
}
