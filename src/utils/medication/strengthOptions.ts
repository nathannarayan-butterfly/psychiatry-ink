import {
  DEMO_MEDICATION_SUGGESTIONS,
  getFormulationLabel,
} from '../../data/medicationUiTranslations'
import { getDrugsForSubstance } from '../../data/psychDrugReference/index'
import type { UiLanguage } from '../../types/settings'
import type { MedicationFormulation } from '../../types/medicationPlan'

export const STRENGTH_CUSTOM_VALUE = '__custom__'

export interface StrengthOption {
  strength: string
  unit?: string
  label: string
  /** 'reference' = from curated drug DB, 'demo' = fallback placeholder data */
  source: 'reference' | 'demo'
}

/** Demo-only defaults per formulation — not a clinical reference. */
const DEMO_FORMULATION_STRENGTHS: Record<MedicationFormulation, readonly string[]> = {
  tablet: ['5 mg', '10 mg', '20 mg', '25 mg'],
  capsule: ['5 mg', '10 mg', '20 mg'],
  solution: ['2 mg/ml', '5 mg/ml', '10 mg/ml'],
  drops: ['5 mg/ml', '20 mg/ml'],
  depot: ['25 mg', '50 mg', '100 mg'],
  injection: ['1 mg/ml', '5 mg/ml'],
  patch: ['4 mg/24h', '8 mg/24h'],
  other: [],
}

const formulationDisplaySuffix: Record<MedicationFormulation, Partial<Record<UiLanguage, string>>> = {
  tablet: { de: 'Tabletten', en: 'tablets', fr: 'comprimés', es: 'comprimidos' },
  capsule: { de: 'Kapseln', en: 'capsules', fr: 'gélules', es: 'cápsulas' },
  solution: { de: 'Lösung', en: 'solution', fr: 'solution', es: 'solución' },
  drops: { de: 'Tropfen', en: 'drops', fr: 'gouttes', es: 'gotas' },
  depot: { de: 'Depot', en: 'depot', fr: 'dépôt', es: 'depósito' },
  injection: { de: 'Injektion', en: 'injection', fr: 'injection', es: 'inyección' },
  patch: { de: 'Pflaster', en: 'patch', fr: 'patch', es: 'parche' },
  other: {},
}

function formatStrengthLabel(
  strength: string,
  formulation: MedicationFormulation,
  language: UiLanguage,
): string {
  const suffix =
    formulationDisplaySuffix[formulation][language] ??
    getFormulationLabel(formulation, language)
  return suffix ? `${strength} ${suffix}` : strength
}

/** Infer unit from strength string (e.g. "2 mg/ml" → "ml", "5 mg" → "mg"). */
function inferUnit(strength: string): string | undefined {
  if (strength.includes('/ml')) return 'ml'
  if (strength.includes('mg')) return 'mg'
  if (strength.includes('µg')) return 'µg'
  return undefined
}

/**
 * Map a reference formulation string to a MedicationFormulation enum value.
 * Reference data uses German strings like "Tablette", "Lösung", etc.
 */
function matchReferenceFormulation(
  refFormulation: string,
  targetFormulation: MedicationFormulation,
): boolean {
  const f = refFormulation.toLowerCase()
  switch (targetFormulation) {
    case 'tablet':
      return f.includes('tablette') || f.includes('tablet') || f.includes('schmelztablette')
    case 'capsule':
      return f.includes('kapsel') || f.includes('capsule')
    case 'solution':
      return (f.includes('lösung') || f.includes('solution')) && !f.includes('tropfen')
    case 'drops':
      return f.includes('tropfen') || f.includes('drop')
    case 'depot':
      return f.includes('depot')
    case 'injection':
      return (f.includes('injektion') || f.includes('injection')) && !f.includes('depot')
    case 'patch':
      return f.includes('pflaster') || f.includes('patch')
    default:
      return false
  }
}

/**
 * Build strength options from the curated drug reference for a given substance+formulation.
 * Returns an empty array if no reference entry covers this substance.
 */
function getReferenceStrengthOptions(
  substance: string,
  formulation: MedicationFormulation,
  language: UiLanguage,
): StrengthOption[] {
  const matches = getDrugsForSubstance(substance)
  if (matches.length === 0) return []

  const seen = new Set<string>()
  const options: StrengthOption[] = []

  for (const drug of matches) {
    const relevantFormulations = drug.formulations.filter((f) =>
      matchReferenceFormulation(f, formulation),
    )
    if (relevantFormulations.length === 0 && formulation !== 'other') continue

    for (const strength of drug.strengthsDACH) {
      if (seen.has(strength)) continue
      seen.add(strength)
      options.push({
        strength,
        unit: inferUnit(strength),
        label: formatStrengthLabel(strength, formulation, language),
        source: 'reference',
      })
    }
  }

  return options
}

function findSubstanceSuggestions(substance: string) {
  const key = substance.trim().toLowerCase()
  if (key.length < 2) return undefined
  return Object.entries(DEMO_MEDICATION_SUGGESTIONS).find(
    ([name]) => key.includes(name) || name.includes(key),
  )?.[1]
}

/**
 * Get strength options for a substance+formulation, checking the curated reference DB first
 * and falling back to demo data. All options are tagged with `source`.
 */
export function getStrengthOptions(
  substance: string,
  formulation: MedicationFormulation,
  language: UiLanguage,
): StrengthOption[] {
  const refOptions = getReferenceStrengthOptions(substance, formulation, language)
  if (refOptions.length > 0) return refOptions

  const substanceItems = findSubstanceSuggestions(substance)?.filter(
    (item) => item.formulation === formulation,
  )

  const source =
    substanceItems && substanceItems.length > 0
      ? substanceItems
      : DEMO_FORMULATION_STRENGTHS[formulation].map((strength) => ({ strength, unit: undefined }))

  const seen = new Set<string>()
  const options: StrengthOption[] = []

  for (const item of source) {
    if (seen.has(item.strength)) continue
    seen.add(item.strength)
    options.push({
      strength: item.strength,
      unit: 'unit' in item ? item.unit : undefined,
      label: formatStrengthLabel(item.strength, formulation, language),
      source: 'demo',
    })
  }

  return options
}

export function isCustomStrengthValue(
  strength: string,
  options: StrengthOption[],
): boolean {
  if (!strength.trim()) return false
  return !options.some((option) => option.strength === strength)
}
