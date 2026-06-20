/**
 * Butterfly criteria registry (no i18n re-exports — avoids circular imports).
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
import { allCrosswalkGapDisorders } from './blocks/gapCoverage'
import { icd11PsychoticSpecifierDisorders } from './blocks/icd11PsychoticSpecifiers'
import { attachGapIcd11Trees } from './factories/icd11GapFactories'
import { attachMergedIcd11Trees } from './icd11Merged/attach'

export const DIAGNOSIS_CRITERIA_VERSION = 1
export const BUTTERFLY_PROFILE_ID = 'butterfly_criteria_support'

export const DISORDER_CRITERIA: Disorder[] = attachMergedIcd11Trees(
  attachGapIcd11Trees([
    depressiveEpisode,
    generalizedAnxiety,
    alcoholDependence,
    panicDisorder,
    schizophrenia,
    ...organicNeurocognitiveDisorders,
    ...substanceUseDisorders,
    ...psychoticDisorders,
    ...icd11PsychoticSpecifierDisorders,
    ...moodDisorders,
    ...neuroticStressSomatoformDisorders,
    ...behaviouralSyndromesDisorders,
    ...personalityDisorders,
    ...intellectualDevelopmentDisorders,
    ...neurodevelopmentalDisorders,
    ...childhoodOnsetDisorders,
    ...allCrosswalkGapDisorders,
  ]),
)

export function getDisorderById(id: string): Disorder | undefined {
  return DISORDER_CRITERIA.find((disorder) => disorder.id === id)
}
