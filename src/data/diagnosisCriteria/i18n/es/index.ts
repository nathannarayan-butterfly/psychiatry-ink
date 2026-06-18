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

/** Full ES translation map (merged ICD-10 block modules). */
export const es: DisorderTranslationMap = {
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
}
