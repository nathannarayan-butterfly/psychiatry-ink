/**
 * Butterfly criteria registry.
 *
 * Versioned, licensing-safe, clinician-reviewable operationalized references.
 * See {@link ./schema} for the licensing approach (original wording + sourceRef
 * citations; DSM kept as code/label crosswalk only). All records ship as
 * `status: 'draft'` until reviewed.
 */

import type { Disorder } from './schema'
import { depressiveEpisode } from './depressiveEpisode'
import { generalizedAnxiety } from './generalizedAnxiety'
import { alcoholDependence } from './alcoholDependence'
import { panicDisorder } from './panicDisorder'
import { schizophrenia } from './schizophrenia'

/** Dataset version for the whole Butterfly criteria pack. */
export const DIAGNOSIS_CRITERIA_VERSION = 1

/** Feature/profile id — disambiguates the product ("Butterfly.ink") from this feature. */
export const BUTTERFLY_PROFILE_ID = 'butterfly_criteria_support'

export const DISORDER_CRITERIA: Disorder[] = [
  depressiveEpisode,
  generalizedAnxiety,
  alcoholDependence,
  panicDisorder,
  schizophrenia,
]

export function getDisorderById(id: string): Disorder | undefined {
  return DISORDER_CRITERIA.find((disorder) => disorder.id === id)
}

export * from './schema'
export * from './match'
