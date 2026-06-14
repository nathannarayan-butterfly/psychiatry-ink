import { getDrugsForSubstance } from '../../data/psychDrugReference/index'
import type {
  KnowledgeBaseDrug,
  MedicationMarketAvailability,
  PrescribingCountryCode,
} from '../../types/knowledgeBase'
import type { MedicationFormulation } from '../../types/medicationPlan'

export function normalizeDrugQuery(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9äöüß]/gi, '')
}

export interface KbDrugSuggestResult {
  key: string
  substance: string
  kbDrugId?: string
  substanceId?: string
  displayBrandName?: string
  brandNames: string[]
  formulation?: MedicationFormulation
  strength?: string
  unit?: string
  source: 'kb' | 'preparation' | 'reference'
  matchKind: 'generic' | 'brand'
}

function inferFormulationFromDosageForm(dosageForm: string): MedicationFormulation | undefined {
  const form = dosageForm.toLowerCase()
  if (form.includes('depot') || form.includes('lai')) return 'depot'
  if (form.includes('injektion') || form.includes('injection')) return 'injection'
  if (form.includes('patch') || form.includes('pflaster')) return 'patch'
  if (form.includes('kapsel') || form.includes('capsule')) return 'capsule'
  if (form.includes('lösung') || form.includes('solution')) return 'solution'
  if (form.includes('tropfen') || form.includes('drop')) return 'drops'
  if (form.includes('tablet')) return 'tablet'
  return undefined
}

function formatStrength(entry: Pick<MedicationMarketAvailability, 'strengthValue' | 'strengthUnit'>): string {
  return `${entry.strengthValue} ${entry.strengthUnit}`.trim()
}

function matchScore(normalizedQuery: string, normalizedCandidate: string): number {
  if (!normalizedCandidate) return 0
  if (normalizedCandidate === normalizedQuery) return 100
  if (normalizedCandidate.startsWith(normalizedQuery)) return 80
  if (normalizedCandidate.includes(normalizedQuery)) return 60
  if (normalizedQuery.includes(normalizedCandidate) && normalizedCandidate.length >= 4) return 40
  return 0
}

function stripBrandMarks(name: string): string {
  return name.replace(/[®™]/g, '').trim()
}

export function searchKbDrugSuggestions(params: {
  query: string
  kbDrugs: KnowledgeBaseDrug[]
  preparations: MedicationMarketAvailability[]
  countryCode?: PrescribingCountryCode
  limit?: number
}): KbDrugSuggestResult[] {
  const { query, kbDrugs, preparations, countryCode = 'DE', limit = 8 } = params
  const normalizedQuery = normalizeDrugQuery(query.trim())
  if (normalizedQuery.length < 2) return []

  const scored: Array<{ result: KbDrugSuggestResult; score: number }> = []
  const seenKeys = new Set<string>()

  function push(result: KbDrugSuggestResult, score: number): void {
    if (score <= 0 || seenKeys.has(result.key)) return
    seenKeys.add(result.key)
    scored.push({ result, score })
  }

  for (const drug of kbDrugs) {
    const genericScore = matchScore(normalizedQuery, normalizeDrugQuery(drug.genericName))
    if (genericScore > 0) {
      push(
        {
          key: `kb-generic:${drug.id}`,
          substance: drug.genericName,
          kbDrugId: drug.id,
          substanceId: drug.id,
          brandNames: drug.brandNames.map(stripBrandMarks),
          source: 'kb',
          matchKind: 'generic',
        },
        genericScore + 5,
      )
    }

    for (const brand of drug.brandNames) {
      const cleanBrand = stripBrandMarks(brand)
      const brandScore = matchScore(normalizedQuery, normalizeDrugQuery(cleanBrand))
      if (brandScore > 0) {
        push(
          {
            key: `kb-brand:${drug.id}:${normalizeDrugQuery(cleanBrand)}`,
            substance: drug.genericName,
            kbDrugId: drug.id,
            substanceId: drug.id,
            displayBrandName: cleanBrand,
            brandNames: drug.brandNames.map(stripBrandMarks),
            source: 'kb',
            matchKind: 'brand',
          },
          brandScore + 3,
        )
      }
    }
  }

  for (const prep of preparations) {
    if (prep.countryCode !== countryCode) continue

    const genericScore = matchScore(normalizedQuery, normalizeDrugQuery(prep.genericName))
    const tradeName = stripBrandMarks(prep.tradeName)
    const tradeScore = tradeName
      ? matchScore(normalizedQuery, normalizeDrugQuery(tradeName))
      : 0
    const score = Math.max(genericScore, tradeScore)
    if (score <= 0) continue

    const isBrandMatch = tradeScore >= genericScore && tradeScore > 0
    const strength = formatStrength(prep)
    const formulation = inferFormulationFromDosageForm(prep.dosageForm)

    push(
      {
        key: `prep:${prep.id}`,
        substance: prep.genericName,
        kbDrugId: prep.substanceId,
        substanceId: prep.substanceId,
        displayBrandName: isBrandMatch ? tradeName : undefined,
        brandNames: tradeName ? [tradeName] : [],
        formulation,
        strength,
        unit: prep.strengthUnit.includes('/ml') ? 'ml' : prep.strengthUnit,
        source: 'preparation',
        matchKind: isBrandMatch ? 'brand' : 'generic',
      },
      score + (isBrandMatch ? 2 : 1),
    )
  }

  for (const ref of getDrugsForSubstance(query.trim())) {
    const genericScore = matchScore(normalizedQuery, normalizeDrugQuery(ref.genericName))
    if (genericScore > 0) {
      push(
        {
          key: `ref-generic:${ref.id}`,
          substance: ref.genericName,
          brandNames: ref.brandNamesDACH ?? [],
          source: 'reference',
          matchKind: 'generic',
        },
        genericScore,
      )
    }

    for (const brand of ref.brandNamesDACH ?? []) {
      const brandScore = matchScore(normalizedQuery, normalizeDrugQuery(brand))
      if (brandScore > 0) {
        push(
          {
            key: `ref-brand:${ref.id}:${normalizeDrugQuery(brand)}`,
            substance: ref.genericName,
            displayBrandName: brand,
            brandNames: ref.brandNamesDACH ?? [],
            source: 'reference',
            matchKind: 'brand',
          },
          brandScore,
        )
      }
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ result }) => result)
}

/** Resolve a typed brand name to its generic substance when there is an exact match. */
export function resolveBrandToGeneric(params: {
  query: string
  kbDrugs: KnowledgeBaseDrug[]
  preparations: MedicationMarketAvailability[]
  countryCode?: PrescribingCountryCode
}): KbDrugSuggestResult | null {
  const normalizedQuery = normalizeDrugQuery(params.query.trim())
  if (normalizedQuery.length < 2) return null

  const brandMatches = searchKbDrugSuggestions({ ...params, limit: 20 }).filter(
    (item) => item.matchKind === 'brand',
  )

  return (
    brandMatches.find(
      (item) =>
        item.displayBrandName &&
        normalizeDrugQuery(item.displayBrandName) === normalizedQuery,
    ) ?? null
  )
}
