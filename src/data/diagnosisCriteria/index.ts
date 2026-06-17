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
import { f0OrganicDisorders } from './blocks/f0Organic'
import { f1SubstanceDisorders } from './blocks/f1Substance'
import { f2PsychoticDisorders } from './blocks/f2Psychotic'
import { f3MoodDisorders } from './blocks/f3Mood'
import { f4NeuroticStressDisorders } from './blocks/f4NeuroticStress'
import { f5BehaviouralDisorders } from './blocks/f5Behavioural'
import { f6PersonalityDisorders } from './blocks/f6Personality'
import { f7IntellectualDisorders } from './blocks/f7Intellectual'
import { f8DevelopmentalDisorders } from './blocks/f8Developmental'
import { f9ChildhoodOnsetDisorders } from './blocks/f9ChildhoodOnset'

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
  ...f0OrganicDisorders,
  ...f1SubstanceDisorders,
  ...f2PsychoticDisorders,
  ...f3MoodDisorders,
  ...f4NeuroticStressDisorders,
  ...f5BehaviouralDisorders,
  ...f6PersonalityDisorders,
  ...f7IntellectualDisorders,
  ...f8DevelopmentalDisorders,
  ...f9ChildhoodOnsetDisorders,
]

export function getDisorderById(id: string): Disorder | undefined {
  return DISORDER_CRITERIA.find((disorder) => disorder.id === id)
}

export * from './schema'
export * from './match'
export * from './i18n'
