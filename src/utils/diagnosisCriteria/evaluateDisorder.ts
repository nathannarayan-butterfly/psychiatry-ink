/**
 * Butterfly deterministic evaluator.
 *
 * `evaluateDisorder` is a PURE function: given an authored {@link Disorder} and
 * a {@link DisorderEvaluationContext} (built from the ISDM analysis + clinician
 * attestations), it returns a per-criterion / per-group / overall verdict. It
 * never fabricates: a criterion that cannot be auto-derived and has not been
 * attested resolves to `unknown` and is surfaced as a clinician checkbox.
 *
 * Verdict logic:
 *  - inclusion groups must ALL be satisfied, AND
 *  - no exclusion group may be triggered,
 *  for `criteria_met`. A single definitively-unsatisfiable inclusion group OR a
 *  triggered exclusion yields `not_met`. Otherwise (unknowns dominate) the
 *  verdict is `insufficient_data` — the "stay silent until enough data" signal.
 */

import type {
  Criterion,
  CriterionGroup,
  CriterionStatus,
  Disorder,
} from '../../data/diagnosisCriteria/schema'
import type { DisorderEvaluationContext } from './context'

export type DisorderVerdict = 'criteria_met' | 'not_met' | 'insufficient_data'

export type CriterionResultSource = 'auto' | 'attested' | 'unanswered'

export interface PerCriterionResult {
  criterionId: string
  groupId: string
  text_de: string
  status: CriterionStatus
  source: CriterionResultSource
  evidence?: string
  attestable: boolean
}

/** For inclusion groups: yes/no/unknown. For exclusion groups: yes = triggered. */
export type GroupSatisfaction = 'yes' | 'no' | 'unknown'

export interface GroupResult {
  groupId: string
  label_de: string
  groupType: CriterionGroup['groupType']
  logic: CriterionGroup['logic']
  satisfaction: GroupSatisfaction
  metCount: number
  requiredCount: number
  metCriteria: string[]
  missingCriteria: string[]
}

export interface DisorderEvaluation {
  disorderId: string
  code: string
  name_de: string
  sourceRef: string
  status: Disorder['status']
  codingSystems: Disorder['codingSystems']
  differentials_de: string[]
  perCriterion: PerCriterionResult[]
  groupResults: GroupResult[]
  verdict: DisorderVerdict
  criteriaMet: string[]
  criteriaMissing: string[]
  /** Unknown + attestable criteria the clinician can resolve via checkbox. */
  openAttestations: PerCriterionResult[]
  /** True when ≥ 1 inclusion criterion is met (there is a real signal to speak about). */
  hasSignal: boolean
}

function evaluateCriterion(
  criterion: Criterion,
  group: CriterionGroup,
  ctx: DisorderEvaluationContext,
): PerCriterionResult {
  const attestation = criterion.allowClinicianAttest ? ctx.attestationFor(criterion.id) : undefined
  if (attestation) {
    return {
      criterionId: criterion.id,
      groupId: group.id,
      text_de: criterion.text_de,
      status: attestation,
      source: 'attested',
      attestable: criterion.allowClinicianAttest,
    }
  }

  if (criterion.operationalRule) {
    const signal = criterion.operationalRule(ctx)
    return {
      criterionId: criterion.id,
      groupId: group.id,
      text_de: criterion.text_de,
      status: signal.status,
      source: signal.status === 'unknown' ? 'unanswered' : 'auto',
      evidence: signal.evidence,
      attestable: criterion.allowClinicianAttest,
    }
  }

  return {
    criterionId: criterion.id,
    groupId: group.id,
    text_de: criterion.text_de,
    status: 'unknown',
    source: 'unanswered',
    attestable: criterion.allowClinicianAttest,
  }
}

function requiredCountFor(group: CriterionGroup): number {
  switch (group.logic) {
    case 'all_of':
      return group.criteria.length
    case 'any_of':
      return 1
    case 'at_least_n_of':
      return group.threshold ?? 1
    case 'none_of':
      return 0
  }
}

function evaluateGroup(
  group: CriterionGroup,
  results: PerCriterionResult[],
  ctx: DisorderEvaluationContext,
): GroupResult {
  const inGroup = results.filter((r) => r.groupId === group.id)
  const metCount = inGroup.filter((r) => r.status === 'met').length
  const notMetCount = inGroup.filter((r) => r.status === 'not_met').length
  const potentialCount = inGroup.filter(
    (r) => r.status === 'met' || r.status === 'unknown' || r.status === 'partially_met',
  ).length

  const requiredCount = requiredCountFor(group)
  const metCriteria = inGroup.filter((r) => r.status === 'met').map((r) => r.text_de)
  const missingCriteria = inGroup
    .filter((r) => r.status !== 'met')
    .map((r) => r.text_de)

  let satisfaction: GroupSatisfaction
  switch (group.logic) {
    case 'all_of':
      satisfaction = notMetCount > 0 ? 'no' : metCount === inGroup.length ? 'yes' : 'unknown'
      break
    case 'any_of':
      satisfaction = metCount > 0 ? 'yes' : notMetCount === inGroup.length ? 'no' : 'unknown'
      break
    case 'at_least_n_of':
      satisfaction =
        metCount >= requiredCount ? 'yes' : potentialCount < requiredCount ? 'no' : 'unknown'
      break
    case 'none_of':
      // Exclusion: "yes" means an exclusion criterion is positively present (triggered).
      satisfaction = metCount > 0 ? 'yes' : 'no'
      break
  }

  // Group-level minimum-duration (timeWindow) gate for inclusion groups.
  if (
    group.groupType !== 'exclusion' &&
    group.logic !== 'none_of' &&
    group.timeWindow?.minDurationDays
  ) {
    const meets = ctx.durationMeets(group.timeWindow.minDurationDays)
    if (meets === false) {
      satisfaction = 'no'
    } else if (meets === null && satisfaction === 'yes') {
      satisfaction = 'unknown'
    }
  }

  return {
    groupId: group.id,
    label_de: group.label_de,
    groupType: group.groupType,
    logic: group.logic,
    satisfaction,
    metCount,
    requiredCount,
    metCriteria,
    missingCriteria,
  }
}

export function evaluateDisorder(
  disorder: Disorder,
  ctx: DisorderEvaluationContext,
): DisorderEvaluation {
  const perCriterion: PerCriterionResult[] = []
  for (const group of disorder.groups) {
    for (const criterion of group.criteria) {
      perCriterion.push(evaluateCriterion(criterion, group, ctx))
    }
  }

  const groupResults = disorder.groups.map((group) => evaluateGroup(group, perCriterion, ctx))

  const inclusionGroups = groupResults.filter((g) => g.groupType !== 'exclusion')
  const exclusionGroups = groupResults.filter((g) => g.groupType === 'exclusion')

  const exclusionTriggered = exclusionGroups.some((g) => g.satisfaction === 'yes')
  const allInclusionYes =
    inclusionGroups.length > 0 && inclusionGroups.every((g) => g.satisfaction === 'yes')
  const anyInclusionNo = inclusionGroups.some((g) => g.satisfaction === 'no')

  let verdict: DisorderVerdict
  if (exclusionTriggered) {
    verdict = 'not_met'
  } else if (allInclusionYes) {
    verdict = 'criteria_met'
  } else if (anyInclusionNo) {
    verdict = 'not_met'
  } else {
    verdict = 'insufficient_data'
  }

  const inclusionResults = perCriterion.filter(
    (r) => !disorder.groups.find((g) => g.id === r.groupId && g.groupType === 'exclusion'),
  )

  const criteriaMet = [...new Set(inclusionResults.filter((r) => r.status === 'met').map((r) => r.text_de))]
  const criteriaMissing =
    verdict === 'criteria_met'
      ? []
      : [...new Set(inclusionResults.filter((r) => r.status !== 'met').map((r) => r.text_de))]

  const openAttestations = perCriterion.filter((r) => r.attestable && r.status === 'unknown')

  // A real "signal" is a met SYMPTOM criterion — course/duration-only criteria
  // (e.g. "Symptome ≥ 1 Monat") don't count, so an otherwise-empty case stays silent.
  const courseOnlyCriterionIds = new Set(
    disorder.groups
      .flatMap((g) => g.criteria)
      .filter((c) => c.mappingHints.length > 0 && c.mappingHints.every((h) => h.kind === 'course'))
      .map((c) => c.id),
  )
  const hasSignal = inclusionResults.some(
    (r) => r.status === 'met' && !courseOnlyCriterionIds.has(r.criterionId),
  )

  return {
    disorderId: disorder.id,
    code: disorder.code,
    name_de: disorder.name_de,
    sourceRef: disorder.sourceRef,
    status: disorder.status,
    codingSystems: disorder.codingSystems,
    differentials_de: disorder.differentials_de,
    perCriterion,
    groupResults,
    verdict,
    criteriaMet,
    criteriaMissing,
    openAttestations,
    hasSignal,
  }
}
