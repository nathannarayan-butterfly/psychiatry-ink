/**
 * Reusable, conservative predicate builders for the Butterfly criteria dataset.
 *
 * The core helper {@link domainSignal} encodes the engine's "never fabricate"
 * stance: a documented `present` finding → `met`, an explicit `absent` finding
 * (e.g. a "normal" psychopathology checkbox or a negated note) → `not_met`,
 * and silence → `unknown` (which becomes a clinician checkbox downstream).
 */

import type { IsdmPhenomenologyDomain } from '../../types/isdm'
import type { DisorderEvaluationContext } from '../../utils/diagnosisCriteria/context'
import { met, notMet, UNKNOWN, type CriterionSignal, type OperationalRule } from './schema'

/**
 * Present → met, explicit absent → not_met, otherwise unknown.
 * `presentMatch` narrows which findings count as positive evidence;
 * `absentMatch` narrows which findings count as explicit negative evidence
 * (e.g. a "euthym" / "verneint" normal checkbox). Defaults to `presentMatch`.
 */
export function domainSignal(
  domain: IsdmPhenomenologyDomain,
  presentMatch?: RegExp,
  absentMatch?: RegExp,
): OperationalRule {
  return (ctx: DisorderEvaluationContext): CriterionSignal => {
    const present = ctx.present(domain, presentMatch)
    if (present) return met(present.label)
    const absent = ctx.absent(domain, absentMatch ?? presentMatch)
    if (absent) return notMet(absent.label)
    return UNKNOWN
  }
}

/** True only when at least one of the supplied rules resolves to `met`. */
export function anySignal(...rules: OperationalRule[]): OperationalRule {
  return (ctx) => {
    let sawNotMet = false
    for (const rule of rules) {
      const result = rule(ctx)
      if (result.status === 'met') return result
      if (result.status === 'not_met') sawNotMet = true
    }
    return sawNotMet ? notMet() : UNKNOWN
  }
}

/** A minimum-duration (timeWindow) signal derived from the coarse course pattern. */
export function durationSignal(minDurationDays: number): OperationalRule {
  return (ctx) => {
    const meets = ctx.durationMeets(minDurationDays)
    if (meets === null) return UNKNOWN
    return meets ? met(ctx.coursePattern.summary) : notMet(ctx.coursePattern.summary)
  }
}
