/**
 * Clinical Intelligence graph helpers — severity / confidence → CSS class mapping.
 *
 * Dimensional bars: severity (0–4) drives fill colour; confidence is the conf-dot.
 * Mechanism bars: confidence drives both bar length and fill colour (traffic-light).
 */
import type {
  CiConfidence,
  CiSeverity,
  ClinicalIntelligenceDimensionId,
  DimensionalFinding,
  MechanismHypothesis,
} from '../../types/clinicalIntelligence'
import { CI_SEVERITY_VALUES } from '../../types/clinicalIntelligence'

export type SeverityBarFillClass =
  | 'ci-graph-row__bar-fill--sev-0'
  | 'ci-graph-row__bar-fill--sev-1'
  | 'ci-graph-row__bar-fill--sev-2'
  | 'ci-graph-row__bar-fill--sev-3'
  | 'ci-graph-row__bar-fill--sev-4'

export type ConfidenceBarFillClass =
  | 'ci-graph-row__bar-fill--conf-low'
  | 'ci-graph-row__bar-fill--conf-moderate'
  | 'ci-graph-row__bar-fill--conf-high'

const SEVERITY_CLASS: Record<CiSeverity, SeverityBarFillClass> = {
  0: 'ci-graph-row__bar-fill--sev-0',
  1: 'ci-graph-row__bar-fill--sev-1',
  2: 'ci-graph-row__bar-fill--sev-2',
  3: 'ci-graph-row__bar-fill--sev-3',
  4: 'ci-graph-row__bar-fill--sev-4',
}

/** Clamp an arbitrary number to the CI severity ordinal 0–4. */
export function clampCiSeverity(value: number): CiSeverity {
  const rounded = Math.round(value)
  if (rounded <= 0) return 0
  if (rounded >= 4) return 4
  return rounded as CiSeverity
}

/** Map severity 0–4 to the fixed semantic bar-fill CSS class. */
export function severityBarFillClass(severity: number): SeverityBarFillClass {
  return SEVERITY_CLASS[clampCiSeverity(severity)]
}

const CONFIDENCE_CLASS: Record<CiConfidence, ConfidenceBarFillClass> = {
  low: 'ci-graph-row__bar-fill--conf-low',
  moderate: 'ci-graph-row__bar-fill--conf-moderate',
  high: 'ci-graph-row__bar-fill--conf-high',
}

/** Map hypothesis confidence to the traffic-light bar-fill CSS class. */
export function confidenceBarFillClass(confidence: CiConfidence): ConfidenceBarFillClass {
  return CONFIDENCE_CLASS[confidence]
}

export const CI_SEVERITY_LEGEND_VALUES = CI_SEVERITY_VALUES

export const CI_CONFIDENCE_LEGEND_VALUES: readonly CiConfidence[] = [
  'low',
  'moderate',
  'high',
] as const

/** Build a lookup of dimensionId → severity from active dimensional findings. */
export function dimensionSeverityMap(
  findings: readonly DimensionalFinding[],
): Map<ClinicalIntelligenceDimensionId, CiSeverity> {
  return new Map(findings.map((f) => [f.dimensionId, f.severity]))
}

/**
 * Max severity among dimensions linked to a mechanism hypothesis.
 * Returns 0 when no linked dimensions match active findings.
 */
export function maxLinkedDimensionSeverity(
  hypothesis: Pick<MechanismHypothesis, 'linkedDimensions'>,
  severityByDimension: ReadonlyMap<ClinicalIntelligenceDimensionId, CiSeverity>,
): CiSeverity {
  if (hypothesis.linkedDimensions.length === 0) return 0
  let max = 0
  for (const id of hypothesis.linkedDimensions) {
    const sev = severityByDimension.get(id)
    if (sev !== undefined && sev > max) max = sev
  }
  return clampCiSeverity(max)
}
