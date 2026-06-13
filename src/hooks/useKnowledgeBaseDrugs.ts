import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import {
  DEFAULT_MEDICATIONS_COLLECTION_ID,
  type KnowledgeBaseDrug,
} from '../types/knowledgeBase'
import { KB_DRUG_SEED_DATA } from '../data/knowledgeBaseDrugSeedData'
import { flagLegacyReceptorProfiles } from '../utils/medication/receptorAffinity'
import { useKnowledgeBaseUserProfile, type KnowledgeBaseUserProfile } from './useKnowledgeBaseUserId'
import {
  deleteKnowledgeBaseDrug,
  fetchAllKnowledgeBaseDrugs,
  isKnowledgeBaseSupabaseReady,
  upsertKnowledgeBaseDrugs,
} from '../services/knowledgeBaseDrugsApi'

const STORAGE_KEY = 'psychiatry-ink:knowledgeBaseDrugs'

/**
 * Non-destructively stamp `dataModelVersion` on drugs that predate the
 * structured-section model. Content is never touched — a drug missing the
 * marker is simply flagged as `1` so future real migrations have an anchor.
 * Drugs that already carry structured `kind`s are flagged as the current
 * version. Returns the same reference when nothing changed.
 */
function migrateDataModel(drugs: KnowledgeBaseDrug[]): KnowledgeBaseDrug[] {
  let changed = false
  const next = drugs.map((drug) => {
    if (drug.dataModelVersion != null) return drug
    changed = true
    const hasStructuredKind = drug.sections.some(
      (s) => s.kind != null && s.kind !== 'text',
    )
    return { ...drug, dataModelVersion: hasStructuredKind ? (2 as const) : (1 as const) }
  })
  return changed ? next : drugs
}

/**
 * Assign the default Psychopharmakologie collection to any drug missing a
 * collectionId, non-destructively flag legacy (1–5) receptor profiles, and
 * stamp the structured-data model version.
 */
function migrateAuditMetadata(drugs: KnowledgeBaseDrug[]): KnowledgeBaseDrug[] {
  let changed = false
  const migrated = drugs.map((drug) => {
    const createdAt = drug.createdAt ?? drug.updatedAt ?? new Date().toISOString()
    const lastModifiedAt = drug.lastModifiedAt ?? drug.updatedAt ?? createdAt
    const createdByDisplayName = drug.createdByDisplayName ?? drug.authorEditor ?? 'Seed'
    const lastModifiedByDisplayName = drug.lastModifiedByDisplayName ?? drug.authorEditor ?? createdByDisplayName
    const verificationStatus = drug.verificationStatus ?? (drug.authorEditor === 'Seed' ? 'reviewed' : 'draft')
    const shouldBackfillReview =
      (verificationStatus === 'reviewed' || verificationStatus === 'verified') && !drug.lastReviewedAt
    const patch: Partial<KnowledgeBaseDrug> = {}

    if (!drug.createdAt) patch.createdAt = createdAt
    if (!drug.updatedAt) patch.updatedAt = lastModifiedAt
    if (!drug.createdByUserId) patch.createdByUserId = drug.authorEditor ? 'legacy-author' : 'system'
    if (!drug.createdByDisplayName) patch.createdByDisplayName = createdByDisplayName
    if (!drug.lastModifiedAt) patch.lastModifiedAt = lastModifiedAt
    if (!drug.lastModifiedByUserId) patch.lastModifiedByUserId = drug.authorEditor ? 'legacy-author' : 'system'
    if (!drug.lastModifiedByDisplayName) patch.lastModifiedByDisplayName = lastModifiedByDisplayName
    if (!drug.verificationStatus) patch.verificationStatus = verificationStatus
    if (shouldBackfillReview) {
      patch.lastReviewedAt = lastModifiedAt
      patch.lastReviewedByUserId = drug.lastReviewedByUserId ?? drug.lastModifiedByUserId ?? drug.createdByUserId ?? 'system'
      patch.lastReviewedByDisplayName = drug.lastReviewedByDisplayName ?? lastModifiedByDisplayName
    }

    if (Object.keys(patch).length === 0) return drug
    changed = true
    return { ...drug, ...patch }
  })
  return changed ? migrated : drugs
}

function migrateCollectionId(drugs: KnowledgeBaseDrug[]): KnowledgeBaseDrug[] {
  let changed = false
  const migrated = drugs.map((drug) => {
    if (!drug.collectionId) {
      changed = true
      return { ...drug, collectionId: DEFAULT_MEDICATIONS_COLLECTION_ID }
    }
    return drug
  })
  const result = changed ? migrated : drugs
  return migrateAuditMetadata(migrateDataModel(flagLegacyReceptorProfiles(result)))
}

/** Merge two drug lists by id; entries from `override` win over `base`. */
function mergeById(
  base: KnowledgeBaseDrug[],
  override: KnowledgeBaseDrug[],
): KnowledgeBaseDrug[] {
  const byId = new Map<string, KnowledgeBaseDrug>()
  for (const drug of base) byId.set(drug.id, drug)
  for (const drug of override) byId.set(drug.id, drug)
  return Array.from(byId.values())
}

/** Read whatever the browser currently has cached (or the seed if empty). */
function loadCachedDrugs(): KnowledgeBaseDrug[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return migrateCollectionId(KB_DRUG_SEED_DATA)
    const parsed = JSON.parse(raw) as KnowledgeBaseDrug[]
    if (!Array.isArray(parsed) || parsed.length === 0) return migrateCollectionId(KB_DRUG_SEED_DATA)
    return migrateCollectionId(parsed)
  } catch {
    return migrateCollectionId(KB_DRUG_SEED_DATA)
  }
}

/**
 * Raw localStorage entries (no seed fallback) — used ONLY for the one-time
 * migration of pre-existing browser entries into Supabase. Returns [] when the
 * cache is empty/unreadable so we never re-seed via this path.
 */
function loadRawLocalStorageDrugs(): KnowledgeBaseDrug[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as KnowledgeBaseDrug[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveCache(drugs: KnowledgeBaseDrug[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drugs))
  } catch {
    // ignore storage errors
  }
}

function generateId(): string {
  return `drug-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function stampCreate(drug: KnowledgeBaseDrug, actor: KnowledgeBaseUserProfile, now: string): KnowledgeBaseDrug {
  const verificationStatus = drug.verificationStatus ?? 'draft'
  const isReviewed = verificationStatus === 'reviewed' || verificationStatus === 'verified'
  return {
    ...drug,
    createdAt: now,
    updatedAt: now,
    createdByUserId: actor.userId,
    createdByDisplayName: actor.displayName,
    lastModifiedAt: now,
    lastModifiedByUserId: actor.userId,
    lastModifiedByDisplayName: actor.displayName,
    verificationStatus,
    ...(isReviewed
      ? {
          lastReviewedAt: now,
          lastReviewedByUserId: actor.userId,
          lastReviewedByDisplayName: actor.displayName,
        }
      : {}),
  }
}

function stampUpdate(
  drug: KnowledgeBaseDrug,
  actor: KnowledgeBaseUserProfile,
  now: string,
  previous?: KnowledgeBaseDrug,
): KnowledgeBaseDrug {
  const verificationStatus = drug.verificationStatus ?? 'draft'
  const becameReviewed =
    (verificationStatus === 'reviewed' || verificationStatus === 'verified') &&
    (previous?.verificationStatus !== verificationStatus || !drug.lastReviewedAt)
  return {
    ...drug,
    updatedAt: now,
    lastModifiedAt: now,
    lastModifiedByUserId: actor.userId,
    lastModifiedByDisplayName: actor.displayName,
    verificationStatus,
    ...(becameReviewed
      ? {
          lastReviewedAt: now,
          lastReviewedByUserId: actor.userId,
          lastReviewedByDisplayName: actor.displayName,
        }
      : {}),
  }
}

// ── Shared module-level store ────────────────────────────────────────────────
// All hook instances subscribe to one store so edits propagate live across the
// app and the Supabase load/seed runs exactly once per session (avoiding
// duplicate seeding when several components mount the hook at the same time).

let storeDrugs: KnowledgeBaseDrug[] = loadCachedDrugs()
const listeners = new Set<() => void>()
let loadStarted = false
let loadPromise: Promise<void> | null = null

function emit(): void {
  for (const listener of listeners) listener()
}

function setStoreDrugs(next: KnowledgeBaseDrug[]): void {
  storeDrugs = next
  saveCache(next)
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): KnowledgeBaseDrug[] {
  return storeDrugs
}

/**
 * Load KB drugs from Supabase exactly once. Seeds an empty table from
 * `KB_DRUG_SEED_DATA`, migrates any pre-existing localStorage entries into the
 * shared table (idempotent by id), and applies all backward-compat migrations.
 * On any failure it keeps the local cache/seed so the page stays usable.
 */
function ensureLoaded(): Promise<void> {
  if (loadStarted) return loadPromise ?? Promise.resolve()
  loadStarted = true
  loadPromise = (async () => {
    if (!isKnowledgeBaseSupabaseReady()) {
      console.error(
        '[knowledgeBaseDrugs] Supabase nicht konfiguriert — Wissensdatenbank nutzt lokalen Cache (nur dieses Gerät).',
      )
      return
    }
    try {
      const remote = await fetchAllKnowledgeBaseDrugs()
      const localEntries = loadRawLocalStorageDrugs()

      if (remote.length === 0) {
        // Empty table → one-time seed (plus any pre-existing local entries).
        const seeded = migrateCollectionId(mergeById(KB_DRUG_SEED_DATA, localEntries))
        await upsertKnowledgeBaseDrugs(seeded)
        setStoreDrugs(seeded)
        return
      }

      const migratedRemote = migrateCollectionId(remote)
      const remoteIds = new Set(migratedRemote.map((drug) => drug.id))
      const localOnly = localEntries.filter((drug) => !remoteIds.has(drug.id))

      if (localOnly.length > 0) {
        // Upload pre-existing browser entries the user created before this
        // feature landed so nothing is lost. Idempotent (matched by id).
        const migratedLocalOnly = migrateCollectionId(localOnly)
        await upsertKnowledgeBaseDrugs(migratedLocalOnly)
        setStoreDrugs(mergeById(migratedRemote, migratedLocalOnly))
        return
      }

      setStoreDrugs(migratedRemote)
    } catch (err) {
      console.error(
        '[knowledgeBaseDrugs] Laden aus Supabase fehlgeschlagen — lokaler Cache wird verwendet.',
        err,
      )
    }
  })()
  return loadPromise
}

/** Optimistic local update + write-through to Supabase. */
function upsertDrugInStore(drug: KnowledgeBaseDrug): void {
  const exists = storeDrugs.some((d) => d.id === drug.id)
  setStoreDrugs(exists ? storeDrugs.map((d) => (d.id === drug.id ? drug : d)) : [...storeDrugs, drug])
  void (async () => {
    try {
      await upsertKnowledgeBaseDrugs([drug])
    } catch (err) {
      console.error('[knowledgeBaseDrugs] Speichern in Supabase fehlgeschlagen.', err)
    }
  })()
}

/** Optimistic local delete + write-through to Supabase. */
function removeDrugFromStore(id: string): void {
  setStoreDrugs(storeDrugs.filter((d) => d.id !== id))
  void (async () => {
    try {
      await deleteKnowledgeBaseDrug(id)
    } catch (err) {
      console.error('[knowledgeBaseDrugs] Löschen in Supabase fehlgeschlagen.', err)
    }
  })()
}

/**
 * Drug store hook. When `collectionId` is provided, the returned `drugs` are
 * scoped to that collection and newly added drugs are assigned to it.
 *
 * Backed by Supabase (shared across all users/devices) with a localStorage
 * cache for instant first paint and offline fallback. The public API is
 * unchanged: `{ drugs, addDrug, updateDrug, deleteDrug, duplicateDrug }`.
 */
export function useKnowledgeBaseDrugs(collectionId?: string) {
  const actor = useKnowledgeBaseUserProfile()
  const drugs = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    void ensureLoaded()
  }, [])

  const scopedDrugs = useMemo(() => {
    if (!collectionId) return drugs
    return drugs.filter(
      (drug) => (drug.collectionId ?? DEFAULT_MEDICATIONS_COLLECTION_ID) === collectionId,
    )
  }, [drugs, collectionId])

  const addDrug = useCallback(
    (draft: Omit<KnowledgeBaseDrug, 'id' | 'createdAt' | 'updatedAt'>): KnowledgeBaseDrug => {
      const now = new Date().toISOString()
      const newDrug = stampCreate({
        ...draft,
        collectionId: draft.collectionId ?? collectionId ?? DEFAULT_MEDICATIONS_COLLECTION_ID,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      }, actor, now)
      upsertDrugInStore(newDrug)
      return newDrug
    },
    [actor, collectionId],
  )

  const updateDrug = useCallback((updated: KnowledgeBaseDrug): void => {
    const now = new Date().toISOString()
    const previous = storeDrugs.find((drug) => drug.id === updated.id)
    upsertDrugInStore(stampUpdate(updated, actor, now, previous))
  }, [actor])

  const deleteDrug = useCallback((id: string): void => {
    removeDrugFromStore(id)
  }, [])

  const duplicateDrug = useCallback((id: string): KnowledgeBaseDrug | null => {
    const source = storeDrugs.find((drug) => drug.id === id)
    if (!source) return null
    const now = new Date().toISOString()
    const copy: KnowledgeBaseDrug = {
      ...source,
      id: generateId(),
      genericName: `${source.genericName} (Kopie)`,
      createdAt: now,
      updatedAt: now,
      createdByUserId: actor.userId,
      createdByDisplayName: actor.displayName,
      lastModifiedAt: now,
      lastModifiedByUserId: actor.userId,
      lastModifiedByDisplayName: actor.displayName,
      verificationStatus: 'draft',
      sections: source.sections.map((section) => ({
        ...section,
        id: `${section.key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      })),
    }
    upsertDrugInStore(copy)
    return copy
  }, [actor])

  return { drugs: scopedDrugs, addDrug, updateDrug, deleteDrug, duplicateDrug }
}
