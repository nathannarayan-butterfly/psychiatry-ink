/**
 * ICD-11 substance-use (F1 / 6C4x) i18n generator.
 *
 * The F1 criteria data is factory-generated per substance (see
 * `blocks/substanceUse.ts`), and its ICD-11 dependence (6C4x.2) and harmful-
 * pattern (6C4x.1) sets share an identical STRUCTURE across substances (only the
 * substance name varies). To keep the en/fr/es translations complete and unable
 * to drift from the generated ids, we generate the ICD-11 translation fragments
 * here from the SAME id derivation and merge them into each language's hand-
 * authored ICD-10 map. German remains the source of truth in the data layer.
 */

import type { DisorderTranslation, DisorderTranslationMap } from './types'

/** Mirror of `idp` in the data layer: "6C43.2" → "6c43_2". */
function idp(code: string): string {
  return code.toLowerCase().replace(/\./g, '_')
}

const DEP_SUFFIX = '.2'
const HARM_SUFFIX = '.1'

/** Disorders carrying a distinct ICD-11 dependence set (6C4x.2). */
export const ICD11_DEPENDENCE_DISORDERS: ReadonlyArray<{ disorderId: string; icd11Stem: string }> = [
  { disorderId: 'alcohol_dependence', icd11Stem: '6C40' },
  { disorderId: 'opioids_dependence', icd11Stem: '6C43' },
  { disorderId: 'cannabinoids_dependence', icd11Stem: '6C41' },
  { disorderId: 'sedatives_dependence', icd11Stem: '6C44' },
  { disorderId: 'cocaine_dependence', icd11Stem: '6C45' },
  { disorderId: 'stimulants_dependence', icd11Stem: '6C46' },
  { disorderId: 'nicotine_dependence', icd11Stem: '6C4A' },
  { disorderId: 'volatile_solvents_dependence', icd11Stem: '6C4B' },
  { disorderId: 'multiple_substances_dependence', icd11Stem: '6C4E' },
]

/** Disorders carrying a distinct ICD-11 harmful-pattern set (6C4x.1). */
export const ICD11_HARMFUL_USE_DISORDERS: ReadonlyArray<{ disorderId: string; icd11Stem: string }> = [
  { disorderId: 'opioids_harmful_use', icd11Stem: '6C43' },
  { disorderId: 'cannabinoids_harmful_use', icd11Stem: '6C41' },
  { disorderId: 'sedatives_harmful_use', icd11Stem: '6C44' },
  { disorderId: 'cocaine_harmful_use', icd11Stem: '6C45' },
  { disorderId: 'stimulants_harmful_use', icd11Stem: '6C46' },
  { disorderId: 'hallucinogens_harmful_use', icd11Stem: '6C49' },
  { disorderId: 'nicotine_harmful_use', icd11Stem: '6C4A' },
  { disorderId: 'volatile_solvents_harmful_use', icd11Stem: '6C4B' },
  { disorderId: 'multiple_substances_harmful_use', icd11Stem: '6C4E' },
]

/** Language-specific text pack for the (structurally identical) ICD-11 fragments. */
export interface Icd11SubstanceTextPack {
  /** Localized substance name (as used in "consumption of …"), keyed by disorder id. */
  substanceNames: Record<string, string>
  depGroupLabel: string
  depImpairedControl: (substance: string) => string
  depSalience: string
  depPhysiological: string
  harmPatternGroupLabel: string
  harmGroupLabel: string
  exclusionsGroupLabel: string
  usePattern: (substance: string) => string
  harmSelf: string
  harmOthers: string
  excludeDependence: (depCode: string) => string
}

function mergeEntry(base: DisorderTranslation | undefined, add: DisorderTranslation): DisorderTranslation {
  if (!base) return add
  return {
    ...base,
    groups: { ...base.groups, ...add.groups },
    criteria: { ...base.criteria, ...add.criteria },
  }
}

/**
 * Merge the generated ICD-11 F1 translation fragments into a language's
 * hand-authored ICD-10 map. Existing name/differentials/ICD-10 groups+criteria
 * are preserved; the ICD-11 group/criterion ids are added side-by-side.
 */
export function withIcd11SubstanceTranslations(
  base: DisorderTranslationMap,
  text: Icd11SubstanceTextPack,
): DisorderTranslationMap {
  const out: DisorderTranslationMap = { ...base }

  for (const { disorderId, icd11Stem } of ICD11_DEPENDENCE_DISORDERS) {
    const code = `${icd11Stem}${DEP_SUFFIX}`
    const p = idp(code)
    const substance = text.substanceNames[disorderId] ?? ''
    out[disorderId] = mergeEntry(out[disorderId], {
      name: '',
      differentials: [],
      groups: { [`${p}.dependence`]: text.depGroupLabel },
      criteria: {
        [`${p}.impaired_control`]: text.depImpairedControl(substance),
        [`${p}.salience`]: text.depSalience,
        [`${p}.physiological`]: text.depPhysiological,
      },
    })
  }

  for (const { disorderId, icd11Stem } of ICD11_HARMFUL_USE_DISORDERS) {
    const code = `${icd11Stem}${HARM_SUFFIX}`
    const depCode = `${icd11Stem}${DEP_SUFFIX}`
    const p = idp(code)
    const substance = text.substanceNames[disorderId] ?? ''
    out[disorderId] = mergeEntry(out[disorderId], {
      name: '',
      differentials: [],
      groups: {
        [`${p}.pattern`]: text.harmPatternGroupLabel,
        [`${p}.harm`]: text.harmGroupLabel,
        [`${p}.exclusions`]: text.exclusionsGroupLabel,
      },
      criteria: {
        [`${p}.use_pattern`]: text.usePattern(substance),
        [`${p}.harm_self`]: text.harmSelf,
        [`${p}.harm_others`]: text.harmOthers,
        [`${p}.exclude_dependence`]: text.excludeDependence(depCode),
      },
    })
  }

  return out
}
