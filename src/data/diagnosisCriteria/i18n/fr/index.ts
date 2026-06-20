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
import { frPsychoticSpecifiers } from '../psychoticSpecifiersI18n'
import { gapFR } from '../gapCoverage/fr'
import { augmentIcd11TreeI18n } from '../icd11AutoI18n'

/** Full FR translation map (merged ICD-10 block modules). */
export const fr: DisorderTranslationMap = augmentIcd11TreeI18n(
  {
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
    ...frPsychoticSpecifiers,
    ...gapFR,
  },
  'fr',
)
