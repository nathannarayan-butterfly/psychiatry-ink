import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_MEDICATIONS_COLLECTION_ID,
  type KnowledgeBaseDrug,
} from '../types/knowledgeBase'
import { KB_DRUG_SEED_DATA } from '../data/knowledgeBaseDrugSeedData'
import { flagLegacyReceptorProfiles } from '../utils/medication/receptorAffinity'
import { useKnowledgeBaseUserProfile, type KnowledgeBaseUserProfile } from './useKnowledgeBaseUserId'

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

function loadDrugs(): KnowledgeBaseDrug[] {
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

function saveDrugs(drugs: KnowledgeBaseDrug[]): void {
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

/**
 * Drug store hook. When `collectionId` is provided, the returned `drugs` are
 * scoped to that collection and newly added drugs are assigned to it.
 */
export function useKnowledgeBaseDrugs(collectionId?: string) {
  const actor = useKnowledgeBaseUserProfile()
  const [drugs, setDrugs] = useState<KnowledgeBaseDrug[]>(loadDrugs)

  useEffect(() => {
    saveDrugs(drugs)
  }, [drugs])

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
      setDrugs((prev) => [...prev, newDrug])
      return newDrug
    },
    [actor, collectionId],
  )

  const updateDrug = useCallback((updated: KnowledgeBaseDrug): void => {
    const now = new Date().toISOString()
    setDrugs((prev) =>
      prev.map((drug) =>
        drug.id === updated.id ? stampUpdate(updated, actor, now, drug) : drug,
      ),
    )
  }, [actor])

  const deleteDrug = useCallback((id: string): void => {
    setDrugs((prev) => prev.filter((drug) => drug.id !== id))
  }, [])

  const duplicateDrug = useCallback((id: string): KnowledgeBaseDrug | null => {
    const source = drugs.find((drug) => drug.id === id)
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
    setDrugs((prev) => [...prev, copy])
    return copy
  }, [actor, drugs])

  return { drugs: scopedDrugs, addDrug, updateDrug, deleteDrug, duplicateDrug }
}
