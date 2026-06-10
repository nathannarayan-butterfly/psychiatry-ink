import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_MEDICATIONS_COLLECTION_ID,
  type KnowledgeBaseDrug,
} from '../types/knowledgeBase'
import { KB_DRUG_SEED_DATA } from '../data/knowledgeBaseDrugSeedData'

const STORAGE_KEY = 'psychiatry-ink:knowledgeBaseDrugs'

/** Assign the default Psychopharmakologie collection to any drug missing a collectionId. */
function migrateCollectionId(drugs: KnowledgeBaseDrug[]): KnowledgeBaseDrug[] {
  let changed = false
  const migrated = drugs.map((drug) => {
    if (!drug.collectionId) {
      changed = true
      return { ...drug, collectionId: DEFAULT_MEDICATIONS_COLLECTION_ID }
    }
    return drug
  })
  return changed ? migrated : drugs
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

/**
 * Drug store hook. When `collectionId` is provided, the returned `drugs` are
 * scoped to that collection and newly added drugs are assigned to it.
 */
export function useKnowledgeBaseDrugs(collectionId?: string) {
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
      const newDrug: KnowledgeBaseDrug = {
        ...draft,
        collectionId: draft.collectionId ?? collectionId ?? DEFAULT_MEDICATIONS_COLLECTION_ID,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      }
      setDrugs((prev) => [...prev, newDrug])
      return newDrug
    },
    [collectionId],
  )

  const updateDrug = useCallback((updated: KnowledgeBaseDrug): void => {
    const now = new Date().toISOString()
    setDrugs((prev) =>
      prev.map((drug) =>
        drug.id === updated.id ? { ...updated, updatedAt: now } : drug,
      ),
    )
  }, [])

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
      sections: source.sections.map((section) => ({
        ...section,
        id: `${section.key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      })),
    }
    setDrugs((prev) => [...prev, copy])
    return copy
  }, [drugs])

  return { drugs: scopedDrugs, addDrug, updateDrug, deleteDrug, duplicateDrug }
}
