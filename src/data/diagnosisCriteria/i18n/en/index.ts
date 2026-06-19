import type { DisorderTranslationMap } from '../types'
import { enOrganicNeurocognitive } from './organicNeurocognitive'
import { enSubstanceUse } from './substanceUse'
import { enPsychotic } from './psychotic'
import { enMood } from './mood'
import { enNeuroticStressSomatoform } from './neuroticStressSomatoform'
import { enBehaviouralSyndromes } from './behaviouralSyndromes'
import { enPersonality } from './personality'
import { enIntellectualDevelopment } from './intellectualDevelopment'
import { enNeurodevelopmental } from './neurodevelopmental'
import { enChildhoodOnset } from './childhoodOnset'
import { gapEN } from '../gapCoverage/en'

/** Full EN translation map (merged ICD-10 block modules). */
export const en: DisorderTranslationMap = {
  ...enOrganicNeurocognitive,
  ...enSubstanceUse,
  ...enPsychotic,
  ...enMood,
  ...enNeuroticStressSomatoform,
  ...enBehaviouralSyndromes,
  ...enPersonality,
  ...enIntellectualDevelopment,
  ...enNeurodevelopmental,
  ...enChildhoodOnset,
  ...gapEN,
}
