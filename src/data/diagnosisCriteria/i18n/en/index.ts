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
import { enPsychoticSpecifiers } from '../psychoticSpecifiersI18n'
import { gapEN } from '../gapCoverage/en'
import { augmentIcd11TreeI18n } from '../icd11AutoI18n'

/** Full EN translation map (merged ICD-10 block modules). */
export const en: DisorderTranslationMap = augmentIcd11TreeI18n(
  {
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
    ...enPsychoticSpecifiers,
    ...gapEN,
  },
  'en',
)
