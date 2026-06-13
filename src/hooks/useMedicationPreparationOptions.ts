import { useMemo } from 'react'
import { useKnowledgeBaseDrugs } from './useKnowledgeBaseDrugs'
import {
  formatPreparationStrength,
  isVerifiedPreparation,
  matchDosageFormToMedicationFormulation,
  useMedicationMarketAvailability,
} from './useMedicationMarketAvailability'
import type {
  MedicationMarketAvailability,
  PrescribingCountryCode,
} from '../types/knowledgeBase'
import type { MedicationFormulation } from '../types/medicationPlan'
import type { StrengthOption } from '../utils/medication/strengthOptions'

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9äöüß]/gi, '')
}

export function useMedicationPreparationOptions(
  substance: string,
  formulation: MedicationFormulation,
  countryCode: PrescribingCountryCode,
) {
  const { drugs } = useKnowledgeBaseDrugs()
  const { allPreparations } = useMedicationMarketAvailability()

  return useMemo(() => {
    const query = normalize(substance.trim())
    if (query.length < 2) {
      return {
        options: [] as StrengthOption[],
        verifiedPreparations: [] as MedicationMarketAvailability[],
        hasKbDrugMatch: false,
        hasVerifiedCountryData: false,
      }
    }

    const matchedDrugs = drugs.filter((drug) => {
      const names = [drug.genericName, ...drug.brandNames].map(normalize)
      return names.some((name) => name.includes(query) || query.includes(name))
    })
    const matchedIds = new Set(matchedDrugs.map((drug) => drug.id))

    const countryPreparations = allPreparations.filter(
      (entry) =>
        entry.countryCode === countryCode &&
        (matchedIds.has(entry.substanceId) || normalize(entry.genericName).includes(query)),
    )
    const verified = countryPreparations.filter(isVerifiedPreparation)
    const relevant = verified.filter((entry) =>
      matchDosageFormToMedicationFormulation(entry.dosageForm, formulation),
    )

    const seen = new Set<string>()
    const options: StrengthOption[] = relevant
      .map((entry): StrengthOption | null => {
        const strength = formatPreparationStrength(entry)
        const key = `${strength}|${entry.dosageForm}`
        if (seen.has(key)) return null
        seen.add(key)
        return {
          strength,
          unit: entry.strengthUnit.includes('/ml') ? 'ml' : entry.strengthUnit,
          label: `${strength} ${entry.dosageForm}${entry.tradeName ? ` · ${entry.tradeName}` : ''}`,
          source: 'kb' as const,
          sourceLabel: [
            entry.sourceName,
            entry.verificationStatus,
            entry.lastVerifiedAt ? new Date(entry.lastVerifiedAt).toLocaleDateString('de-DE') : '',
          ].filter(Boolean).join(' · '),
        }
      })
      .filter((option): option is StrengthOption => option != null)

    return {
      options,
      // All verified preparations for this substance + country (not filtered by
      // the selected formulation), for a read-only availability overview.
      verifiedPreparations: verified,
      hasKbDrugMatch: matchedDrugs.length > 0 || countryPreparations.length > 0,
      hasVerifiedCountryData: verified.length > 0,
    }
  }, [allPreparations, countryCode, drugs, formulation, substance])
}
