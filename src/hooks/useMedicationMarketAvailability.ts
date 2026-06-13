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

function preparationKey(entry: Pick<
  MedicationMarketAvailability,
  'substanceId' | 'countryCode' | 'tradeName' | 'genericName' | 'strengthValue' | 'strengthUnit' | 'dosageForm' | 'route'
>): string {
  return [
    entry.substanceId,
    entry.countryCode,
    entry.tradeName,
    entry.genericName,
    entry.strengthValue,
    entry.strengthUnit,
    entry.dosageForm,
    entry.route,
  ].map((value) => value.trim().toLowerCase()).join('|')
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

  const upsertGeneratedPreparations = useCallback(
    (drafts: Omit<MedicationMarketAvailability, 'id' | 'createdAt'>[]): {
      created: number
      updated: number
      skippedVerified: number
    } => {
      const now = new Date().toISOString()
      const next = [...preparations]
      const indexByKey = new Map(next.map((entry, index) => [preparationKey(entry), index]))
      const summary = { created: 0, updated: 0, skippedVerified: 0 }

      for (const rawDraft of drafts) {
        const draft: Omit<MedicationMarketAvailability, 'id' | 'createdAt'> = {
          ...rawDraft,
          verificationStatus:
            rawDraft.verificationStatus === 'manually_verified' ||
            rawDraft.verificationStatus === 'imported_verified'
              ? 'ai_draft'
              : rawDraft.verificationStatus,
          lastVerifiedAt: undefined,
        }
        const key = preparationKey(draft)
        const existingIndex = indexByKey.get(key)
        if (existingIndex != null) {
          const existing = next[existingIndex]
          if (!existing || isVerifiedPreparation(existing)) {
            summary.skippedVerified += 1
            continue
          }
          next[existingIndex] = {
            ...existing,
            ...draft,
            id: existing.id,
            createdAt: existing.createdAt,
            createdByUserId: existing.createdByUserId,
            createdByDisplayName: existing.createdByDisplayName,
            lastModifiedAt: now,
            lastModifiedByUserId: actor.userId,
            lastModifiedByDisplayName: actor.displayName,
          }
          summary.updated += 1
          continue
        }
        const entry: MedicationMarketAvailability = {
          ...draft,
          id: generateId(),
          createdAt: now,
          createdByUserId: actor.userId,
          createdByDisplayName: actor.displayName,
          lastModifiedAt: now,
          lastModifiedByUserId: actor.userId,
          lastModifiedByDisplayName: actor.displayName,
        }
        next.push(entry)
        indexByKey.set(key, next.length - 1)
        summary.created += 1
      }

      if (summary.created > 0 || summary.updated > 0) {
        persist(next)
      }
      return summary
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
    upsertGeneratedPreparations,
    updatePreparation,
    deletePreparation,
    byCountry,
  }
}

export function useCountrySpecificPreparations(substanceId?: string) {
  return useMedicationMarketAvailability(substanceId)
}
