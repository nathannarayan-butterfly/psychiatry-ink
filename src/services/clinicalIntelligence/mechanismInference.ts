/**
 * Clinical Intelligence — Layer 2 client-side bindings.
 *
 * Filtering and summary helpers for accepted/exploratory mechanism hypotheses.
 */

import type {
  ClinicalIntelligenceMechanismId,
  MechanismHypothesis,
  MechanismInferenceResult,
} from '../../types/clinicalIntelligence'
import { CLINICAL_INTELLIGENCE_MECHANISM_IDS } from '../../types/clinicalIntelligence'

const MECHANISM_ORDER_INDEX: Record<ClinicalIntelligenceMechanismId, number> =
  Object.fromEntries(
    CLINICAL_INTELLIGENCE_MECHANISM_IDS.map((id, index) => [id, index]),
  ) as Record<ClinicalIntelligenceMechanismId, number>

const CONFIDENCE_RANK: Record<MechanismHypothesis['confidence'], number> = {
  high: 3,
  moderate: 2,
  low: 1,
}

export function sortMechanismHypotheses(
  hypotheses: MechanismHypothesis[],
): MechanismHypothesis[] {
  return [...hypotheses].sort((a, b) => {
    const aConf = CONFIDENCE_RANK[a.confidence] ?? 0
    const bConf = CONFIDENCE_RANK[b.confidence] ?? 0
    if (aConf !== bConf) return bConf - aConf
    return (
      (MECHANISM_ORDER_INDEX[a.mechanismId] ?? 999) -
      (MECHANISM_ORDER_INDEX[b.mechanismId] ?? 999)
    )
  })
}

export interface MechanismSummaryStats {
  activeCount: number
  topMechanisms: MechanismHypothesis[]
  confidenceCounts: Record<MechanismHypothesis['confidence'], number>
  pendingCount: number
  acceptedCount: number
  rejectedCount: number
  editedCount: number
  exploratoryCount: number
  hasOnlyExploratory: boolean
}

export function summarizeMechanisms(
  result: MechanismInferenceResult | null | undefined,
  rejectedCount = 0,
): MechanismSummaryStats {
  const empty: MechanismSummaryStats = {
    activeCount: 0,
    topMechanisms: [],
    confidenceCounts: { low: 0, moderate: 0, high: 0 },
    pendingCount: 0,
    acceptedCount: 0,
    rejectedCount,
    editedCount: 0,
    exploratoryCount: 0,
    hasOnlyExploratory: false,
  }
  if (!result) return empty
  const sorted = sortMechanismHypotheses(result.activeMechanisms)
  const confidenceCounts = { low: 0, moderate: 0, high: 0 } as MechanismSummaryStats['confidenceCounts']
  let pending = 0
  let accepted = 0
  let edited = 0
  for (const hypothesis of sorted) {
    confidenceCounts[hypothesis.confidence]++
    if (hypothesis.reviewStatus === 'pending') pending++
    else if (hypothesis.reviewStatus === 'accepted') accepted++
    else if (hypothesis.reviewStatus === 'edited') edited++
  }
  return {
    activeCount: sorted.length,
    topMechanisms: sorted.slice(0, 3),
    confidenceCounts,
    pendingCount: pending,
    acceptedCount: accepted,
    rejectedCount,
    editedCount: edited,
    exploratoryCount: result.exploratoryInsufficientEvidence.length,
    hasOnlyExploratory:
      sorted.length === 0 && result.exploratoryInsufficientEvidence.length > 0,
  }
}
