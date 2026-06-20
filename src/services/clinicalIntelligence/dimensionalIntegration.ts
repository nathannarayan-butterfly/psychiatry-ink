/**
 * Clinical Intelligence — Layer 1 client-side bindings.
 *
 * Holds Dimensional-Integration-specific helpers (filtering/sorting findings,
 * post-processing accepted lists) that don't belong in the React hook itself.
 */

import type {
  ClinicalIntelligenceDimensionId,
  DimensionalFinding,
  DimensionalIntegrationResult,
} from '../../types/clinicalIntelligence'
import {
  CLINICAL_INTELLIGENCE_DIMENSION_IDS,
} from '../../types/clinicalIntelligence'

const DIMENSION_ORDER_INDEX: Record<ClinicalIntelligenceDimensionId, number> =
  Object.fromEntries(
    CLINICAL_INTELLIGENCE_DIMENSION_IDS.map((id, index) => [id, index]),
  ) as Record<ClinicalIntelligenceDimensionId, number>

const CONFIDENCE_RANK: Record<DimensionalFinding['confidence'], number> = {
  high: 3,
  moderate: 2,
  low: 1,
}

/** Sort findings: severity desc → confidence desc → catalog order asc. */
export function sortDimensionalFindings(
  findings: DimensionalFinding[],
): DimensionalFinding[] {
  return [...findings].sort((a, b) => {
    if (a.severity !== b.severity) return b.severity - a.severity
    const aConf = CONFIDENCE_RANK[a.confidence] ?? 0
    const bConf = CONFIDENCE_RANK[b.confidence] ?? 0
    if (aConf !== bConf) return bConf - aConf
    return (DIMENSION_ORDER_INDEX[a.dimensionId] ?? 999) - (DIMENSION_ORDER_INDEX[b.dimensionId] ?? 999)
  })
}

export interface DimensionalSummaryStats {
  activeCount: number
  topDimensions: DimensionalFinding[]
  maxSeverity: number
  confidenceCounts: Record<DimensionalFinding['confidence'], number>
  pendingCount: number
  acceptedCount: number
  editedCount: number
  exploratoryCount: number
  missingDataCount: number
}

export function summarizeDimensional(
  result: DimensionalIntegrationResult | null | undefined,
): DimensionalSummaryStats {
  const empty: DimensionalSummaryStats = {
    activeCount: 0,
    topDimensions: [],
    maxSeverity: 0,
    confidenceCounts: { low: 0, moderate: 0, high: 0 },
    pendingCount: 0,
    acceptedCount: 0,
    editedCount: 0,
    exploratoryCount: 0,
    missingDataCount: 0,
  }
  if (!result) return empty
  const sorted = sortDimensionalFindings(result.activeDimensions)
  const confidenceCounts = { low: 0, moderate: 0, high: 0 } as DimensionalSummaryStats['confidenceCounts']
  let maxSeverity = 0
  let pendingCount = 0
  let acceptedCount = 0
  let editedCount = 0
  let missingDataCount = 0
  for (const finding of sorted) {
    confidenceCounts[finding.confidence]++
    if (finding.severity > maxSeverity) maxSeverity = finding.severity
    if (finding.reviewStatus === 'pending') pendingCount++
    else if (finding.reviewStatus === 'accepted') acceptedCount++
    else if (finding.reviewStatus === 'edited') editedCount++
    if (finding.missingData?.trim()) missingDataCount++
  }
  return {
    activeCount: sorted.length,
    topDimensions: sorted.slice(0, 3),
    maxSeverity,
    confidenceCounts,
    pendingCount,
    acceptedCount,
    editedCount,
    exploratoryCount: result.exploratoryInsufficientEvidence.length,
    missingDataCount,
  }
}
