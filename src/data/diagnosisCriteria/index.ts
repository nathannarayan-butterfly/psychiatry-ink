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
import { organicNeurocognitiveDisorders } from './blocks/organicNeurocognitive'
import { substanceUseDisorders } from './blocks/substanceUse'
import { psychoticDisorders } from './blocks/psychotic'
import { moodDisorders } from './blocks/mood'
import { neuroticStressSomatoformDisorders } from './blocks/neuroticStressSomatoform'
import { behaviouralSyndromesDisorders } from './blocks/behaviouralSyndromes'
import { personalityDisorders } from './blocks/personality'
import { intellectualDevelopmentDisorders } from './blocks/intellectualDevelopment'
import { neurodevelopmentalDisorders } from './blocks/neurodevelopmental'
import { childhoodOnsetDisorders } from './blocks/childhoodOnset'

/** Dataset version for the whole Butterfly criteria pack. */
export const DIAGNOSIS_CRITERIA_VERSION = 1

/** Feature/profile id — disambiguates the product ("Butterfly.ink") from this feature. */
export const BUTTERFLY_PROFILE_ID = 'butterfly_criteria_support'

/**
 * Full Butterfly criteria registry. The five disorders authored first
 * (depressive episode, GAD, alcohol dependence, panic disorder, schizophrenia)
 * lead the list; the comprehensive ICD-10 F0–F9 block modules follow, grouped
 * by chapter. Each block fills out its chapter completely (no sampling).
 */
export const DISORDER_CRITERIA: Disorder[] = [
  depressiveEpisode,
  generalizedAnxiety,
  alcoholDependence,
  panicDisorder,
  schizophrenia,
  ...organicNeurocognitiveDisorders,
  ...substanceUseDisorders,
  ...psychoticDisorders,
  ...moodDisorders,
  ...neuroticStressSomatoformDisorders,
  ...behaviouralSyndromesDisorders,
  ...personalityDisorders,
  ...intellectualDevelopmentDisorders,
  ...neurodevelopmentalDisorders,
  ...childhoodOnsetDisorders,
]

export function getDisorderById(id: string): Disorder | undefined {
  return DISORDER_CRITERIA.find((disorder) => disorder.id === id)
}

export * from './schema'
export * from './match'
export * from './version'
export * from './i18n'
