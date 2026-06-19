import type { DisorderTranslationMap } from '../types'
import { frOrganicNeurocognitive } from './organicNeurocognitive'
import { frSubstanceUse } from './substanceUse'
import { frPsychotic } from './psychotic'
import { frMood } from './mood'
import { frNeuroticStressSomatoform } from './neuroticStressSomatoform'
import { frBehaviouralSyndromes } from './behaviouralSyndromes'
import { frPersonality } from './personality'
import { frIntellectualDevelopment } from './intellectualDevelopment'
import { frNeurodevelopmental } from './neurodevelopmental'
import { frChildhoodOnset } from './childhoodOnset'
import { gapFR } from '../gapCoverage/fr'

/** Full FR translation map (merged ICD-10 block modules). */
export const fr: DisorderTranslationMap = {
  ...frOrganicNeurocognitive,
  ...frSubstanceUse,
  ...frPsychotic,
  ...frMood,
  ...frNeuroticStressSomatoform,
  ...frBehaviouralSyndromes,
  ...frPersonality,
  ...frIntellectualDevelopment,
  ...frNeurodevelopmental,
  ...frChildhoodOnset,
  ...gapFR,
}
