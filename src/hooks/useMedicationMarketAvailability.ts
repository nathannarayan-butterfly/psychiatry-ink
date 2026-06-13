import { useCallback, useEffect, useMemo, useState } from 'react'
import { KB_PREPARATION_SEED_DATA } from '../data/knowledgeBasePreparationSeedData'
import type {
  MedicationMarketAvailability,
  PrescribingCountryCode,
  PreparationVerificationStatus,
} from '../types/knowledgeBase'
import type { MedicationFormulation } from '../types/medicationPlan'
import { useKnowledgeBaseUserProfile } from './useKnowledgeBaseUserId'

const STORAGE_KEY = 'psychiatry-ink:medicationMarketAvailability'

const VERIFIED_STATUSES: PreparationVerificationStatus[] = [
  'manually_verified',
  'imported_verified',
]

function loadPreparations(): MedicationMarketAvailability[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return KB_PREPARATION_SEED_DATA
    const parsed = JSON.parse(raw) as MedicationMarketAvailability[]
    if (!Array.isArray(parsed)) return KB_PREPARATION_SEED_DATA
    const existingIds = new Set(parsed.map((item) => item.id))
    return [
      ...parsed,
      ...KB_PREPARATION_SEED_DATA.filter((seed) => !existingIds.has(seed.id)),
    ]
  } catch {
    return KB_PREPARATION_SEED_DATA
  }
}

function savePreparations(preparations: MedicationMarketAvailability[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preparations))
    window.dispatchEvent(new CustomEvent('psychiatry-ink:market-availability-changed'))
  } catch {
    // ignore storage errors
  }
}

function generateId(): string {
  return `prep-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function isVerifiedPreparation(entry: MedicationMarketAvailability): boolean {
  return VERIFIED_STATUSES.includes(entry.verificationStatus)
}

export function formatPreparationStrength(entry: MedicationMarketAvailability): string {
  return `${entry.strengthValue} ${entry.strengthUnit}`.trim()
}

export function matchDosageFormToMedicationFormulation(
  dosageForm: string,
  formulation: MedicationFormulation,
): boolean {
  const form = dosageForm.toLowerCase()
  switch (formulation) {
    case 'tablet':
      return form.includes('tablet')
    case 'capsule':
      return form.includes('capsule') || form.includes('kapsel')
    case 'solution':
      return form.includes('solution') || form.includes('lösung')
    case 'drops':
      return form.includes('drop') || form.includes('tropfen')
    case 'depot':
      return form.includes('depot') || form.includes('lai')
    case 'injection':
      return form.includes('injection') || form.includes('injektion')
    case 'patch':
      return form.includes('patch') || form.includes('pflaster')
    default:
      return true
  }
}

export function useMedicationMarketAvailability(substanceId?: string) {
  const actor = useKnowledgeBaseUserProfile()
  const [preparations, setPreparations] = useState<MedicationMarketAvailability[]>(loadPreparations)

  useEffect(() => {
    const handleChange = () => setPreparations(loadPreparations())
    window.addEventListener('psychiatry-ink:market-availability-changed', handleChange)
    window.addEventListener('storage', handleChange)
    return () => {
      window.removeEventListener('psychiatry-ink:market-availability-changed', handleChange)
      window.removeEventListener('storage', handleChange)
    }
  }, [])

  const persist = useCallback((next: MedicationMarketAvailability[]) => {
    setPreparations(next)
    savePreparations(next)
  }, [])

  const scopedPreparations = useMemo(
    () => (substanceId ? preparations.filter((item) => item.substanceId === substanceId) : preparations),
    [preparations, substanceId],
  )

  const addPreparation = useCallback(
    (draft: Omit<MedicationMarketAvailability, 'id' | 'createdAt'>): MedicationMarketAvailability => {
      const now = new Date().toISOString()
      const entry: MedicationMarketAvailability = {
        ...draft,
        id: generateId(),
        createdAt: now,
        createdByUserId: actor.userId,
        createdByDisplayName: actor.displayName,
        lastModifiedAt: now,
        lastModifiedByUserId: actor.userId,
        lastModifiedByDisplayName: actor.displayName,
        lastVerifiedAt: draft.verificationStatus === 'manually_verified' ? now : draft.lastVerifiedAt,
      }
      persist([...preparations, entry])
      return entry
    },
    [actor, persist, preparations],
  )

  const updatePreparation = useCallback(
    (entry: MedicationMarketAvailability) => {
      const now = new Date().toISOString()
      persist(preparations.map((item) =>
        item.id === entry.id
          ? {
              ...entry,
              lastModifiedAt: now,
              lastModifiedByUserId: actor.userId,
              lastModifiedByDisplayName: actor.displayName,
              lastVerifiedAt: entry.verificationStatus === 'manually_verified'
                ? (entry.lastVerifiedAt ?? now)
                : entry.lastVerifiedAt,
            }
          : item,
      ))
    },
    [actor, persist, preparations],
  )

  const deletePreparation = useCallback(
    (id: string) => {
      persist(preparations.filter((item) => item.id !== id))
    },
    [persist, preparations],
  )

  const byCountry = useCallback(
    (countryCode: PrescribingCountryCode, verifiedOnly = false) =>
      scopedPreparations.filter(
        (entry) => entry.countryCode === countryCode && (!verifiedOnly || isVerifiedPreparation(entry)),
      ),
    [scopedPreparations],
  )

  return {
    preparations: scopedPreparations,
    allPreparations: preparations,
    addPreparation,
    updatePreparation,
    deletePreparation,
    byCountry,
  }
}

export function useCountrySpecificPreparations(substanceId?: string) {
  return useMedicationMarketAvailability(substanceId)
}
