import type { DisorderTranslationMap } from '../types'
import { esOrganicNeurocognitive } from './organicNeurocognitive'
import { esSubstanceUse } from './substanceUse'
import { esPsychotic } from './psychotic'
import { esMood } from './mood'
import { esNeuroticStressSomatoform } from './neuroticStressSomatoform'
import { esBehaviouralSyndromes } from './behaviouralSyndromes'
import { esPersonality } from './personality'
import { esIntellectualDevelopment } from './intellectualDevelopment'
import { esNeurodevelopmental } from './neurodevelopmental'
import { esChildhoodOnset } from './childhoodOnset'
import { esPsychoticSpecifiers } from '../psychoticSpecifiersI18n'
import { gapES } from '../gapCoverage/es'
import { augmentIcd11TreeI18n } from '../icd11AutoI18n'

/** Full ES translation map (merged ICD-10 block modules). */
export const es: DisorderTranslationMap = augmentIcd11TreeI18n(
  {
    ...esOrganicNeurocognitive,
    ...esSubstanceUse,
    ...esPsychotic,
    ...esMood,
    ...esNeuroticStressSomatoform,
    ...esBehaviouralSyndromes,
    ...esPersonality,
    ...esIntellectualDevelopment,
    ...esNeurodevelopmental,
    ...esChildhoodOnset,
    ...esPsychoticSpecifiers,
    ...gapES,
  },
  'es',
)
