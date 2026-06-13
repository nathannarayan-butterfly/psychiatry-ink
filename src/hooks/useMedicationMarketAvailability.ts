import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { KB_PREPARATION_SEED_DATA } from '../data/knowledgeBasePreparationSeedData'
import type {
  MedicationMarketAvailability,
  PrescribingCountryCode,
  PreparationVerificationStatus,
} from '../types/knowledgeBase'
import type { MedicationFormulation } from '../types/medicationPlan'
import { useKnowledgeBaseUserProfile } from './useKnowledgeBaseUserId'
import {
  deletePreparation as deletePreparationRemote,
  fetchAllPreparations,
  isPreparationsSupabaseReady,
  upsertPreparations,
} from '../services/knowledgeBasePreparationsApi'

const STORAGE_KEY = 'psychiatry-ink:medicationMarketAvailability'

const VERIFIED_STATUSES: PreparationVerificationStatus[] = [
  'manually_verified',
  'imported_verified',
]

/** Read whatever the browser currently has cached, merged with the seed. */
function loadCachedPreparations(): MedicationMarketAvailability[] {
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

/**
 * Raw localStorage entries (no seed fallback) — used ONLY for the one-time
 * migration of pre-existing browser entries into Supabase. Returns [] when the
 * cache is empty/unreadable so we never re-seed via this path.
 */
function loadRawLocalStoragePreparations(): MedicationMarketAvailability[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MedicationMarketAvailability[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveCache(preparations: MedicationMarketAvailability[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preparations))
  } catch {
    // ignore storage errors
  }
}

/** Merge two preparation lists by id; entries from `override` win over `base`. */
function mergeById(
  base: MedicationMarketAvailability[],
  override: MedicationMarketAvailability[],
): MedicationMarketAvailability[] {
  const byId = new Map<string, MedicationMarketAvailability>()
  for (const entry of base) byId.set(entry.id, entry)
  for (const entry of override) byId.set(entry.id, entry)
  return Array.from(byId.values())
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

// ── Shared module-level store ────────────────────────────────────────────────
// All hook instances subscribe to one store so edits propagate live across the
// app and the Supabase load/seed runs exactly once per session (avoiding
// duplicate seeding when several components mount the hook at the same time).

let storePreparations: MedicationMarketAvailability[] = loadCachedPreparations()
const listeners = new Set<() => void>()
let loadStarted = false
let loadPromise: Promise<void> | null = null

function emit(): void {
  for (const listener of listeners) listener()
}

function setStorePreparations(next: MedicationMarketAvailability[]): void {
  storePreparations = next
  saveCache(next)
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): MedicationMarketAvailability[] {
  return storePreparations
}

/**
 * Load preparations from Supabase exactly once. Seeds an empty table from
 * `KB_PREPARATION_SEED_DATA` if empty, migrates any pre-existing localStorage
 * entries into the shared table (idempotent by id). On any failure it keeps the
 * local cache/seed so the page stays usable.
 */
function ensureLoaded(): Promise<void> {
  if (loadStarted) return loadPromise ?? Promise.resolve()
  loadStarted = true
  loadPromise = (async () => {
    if (!isPreparationsSupabaseReady()) {
      console.error(
        '[knowledgeBasePreparations] Supabase nicht konfiguriert — Präparate nutzen lokalen Cache (nur dieses Gerät).',
      )
      return
    }
    try {
      const remote = await fetchAllPreparations()
      const localEntries = loadRawLocalStoragePreparations()

      if (remote.length === 0) {
        // Empty table → one-time seed (plus any pre-existing local entries).
        const seeded = mergeById(KB_PREPARATION_SEED_DATA, localEntries)
        await upsertPreparations(seeded)
        setStorePreparations(seeded)
        return
      }

      const remoteIds = new Set(remote.map((entry) => entry.id))
      const localOnly = localEntries.filter((entry) => !remoteIds.has(entry.id))

      if (localOnly.length > 0) {
        // Upload pre-existing browser entries the user created before this
        // feature landed so nothing is lost. Idempotent (matched by id).
        await upsertPreparations(localOnly)
        setStorePreparations(mergeById(remote, localOnly))
        return
      }

      setStorePreparations(remote)
    } catch (err) {
      console.error(
        '[knowledgeBasePreparations] Laden aus Supabase fehlgeschlagen — lokaler Cache wird verwendet.',
        err,
      )
    }
  })()
  return loadPromise
}

/** Fire-and-forget write-through to Supabase for one or more preparations. */
function writeThroughUpsert(entries: MedicationMarketAvailability[]): void {
  if (entries.length === 0) return
  void (async () => {
    try {
      await upsertPreparations(entries)
    } catch (err) {
      console.error('[knowledgeBasePreparations] Speichern in Supabase fehlgeschlagen.', err)
    }
  })()
}

/** Optimistic local upsert (by id) + write-through to Supabase. */
function upsertPreparationInStore(entry: MedicationMarketAvailability): void {
  const exists = storePreparations.some((item) => item.id === entry.id)
  setStorePreparations(
    exists ? storePreparations.map((item) => (item.id === entry.id ? entry : item)) : [...storePreparations, entry],
  )
  writeThroughUpsert([entry])
}

/** Optimistic local delete + write-through to Supabase. */
function removePreparationFromStore(id: string): void {
  setStorePreparations(storePreparations.filter((item) => item.id !== id))
  void (async () => {
    try {
      await deletePreparationRemote(id)
    } catch (err) {
      console.error('[knowledgeBasePreparations] Löschen in Supabase fehlgeschlagen.', err)
    }
  })()
}

export function useMedicationMarketAvailability(substanceId?: string) {
  const actor = useKnowledgeBaseUserProfile()
  const preparations = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    void ensureLoaded()
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
      upsertPreparationInStore(entry)
      return entry
    },
    [actor],
  )

  const upsertGeneratedPreparations = useCallback(
    (drafts: Omit<MedicationMarketAvailability, 'id' | 'createdAt'>[]): {
      created: number
      updated: number
      skippedVerified: number
    } => {
      const now = new Date().toISOString()
      const next = [...storePreparations]
      const indexByKey = new Map(next.map((entry, index) => [preparationKey(entry), index]))
      const changed: MedicationMarketAvailability[] = []
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
          const merged: MedicationMarketAvailability = {
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
          next[existingIndex] = merged
          changed.push(merged)
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
        changed.push(entry)
        summary.created += 1
      }

      if (summary.created > 0 || summary.updated > 0) {
        setStorePreparations(next)
        writeThroughUpsert(changed)
      }
      return summary
    },
    [actor],
  )

  const updatePreparation = useCallback(
    (entry: MedicationMarketAvailability) => {
      const now = new Date().toISOString()
      const previous = storePreparations.find((item) => item.id === entry.id)
      const updated: MedicationMarketAvailability = {
        ...entry,
        lastModifiedAt: now,
        lastModifiedByUserId: actor.userId,
        lastModifiedByDisplayName: actor.displayName,
        lastVerifiedAt: entry.verificationStatus === 'manually_verified'
          ? (entry.lastVerifiedAt ?? now)
          : entry.lastVerifiedAt,
      }
      if (!previous) return
      upsertPreparationInStore(updated)
    },
    [actor],
  )

  const deletePreparation = useCallback((id: string) => {
    removePreparationFromStore(id)
  }, [])

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
