import { useCallback, useEffect, useState } from 'react'
import { KNOWLEDGE_BASE_SEED, type KnowledgeEntry } from '../data/knowledgeBaseSeedData'
import { DEFAULT_NOTES_COLLECTION_ID } from '../types/knowledgeBase'
import {
  ensureKnowledgeEntrySections,
  flattenEntrySections,
} from '../utils/kb/knowledgeEntrySections'

const STORAGE_KEY = 'psychiatry-ink:knowledgeBase'

function migrateNoteCollectionId(entries: KnowledgeEntry[]): KnowledgeEntry[] {
  let changed = false
  const migrated = entries.map((entry) => {
    let next = entry
    if (!entry.collectionId) {
      changed = true
      next = { ...next, collectionId: DEFAULT_NOTES_COLLECTION_ID }
    }
    const withSections = ensureKnowledgeEntrySections(next)
    if (withSections !== next) changed = true
    return withSections
  })
  return changed ? migrated : entries
}

function loadEntries(): KnowledgeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as KnowledgeEntry[]
      if (Array.isArray(parsed) && parsed.length > 0) return migrateNoteCollectionId(parsed)
    }
  } catch {
    // ignore
  }
  const seeded = migrateNoteCollectionId([...KNOWLEDGE_BASE_SEED])
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  } catch {
    // ignore
  }
  return seeded
}

function saveEntries(entries: KnowledgeEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // ignore
  }
}

function generateId(): string {
  return `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeEntry(entry: KnowledgeEntry): KnowledgeEntry {
  const withSections = ensureKnowledgeEntrySections(entry)
  const flat = flattenEntrySections(withSections)
  return {
    ...withSections,
    ...flat,
    updatedAt: entry.updatedAt ?? entry.createdAt,
  }
}

export function useKnowledgeBaseClinical(collectionId?: string) {
  const [entries, setEntries] = useState<KnowledgeEntry[]>(loadEntries)

  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  const scoped = collectionId
    ? entries.filter((e) => (e.collectionId ?? DEFAULT_NOTES_COLLECTION_ID) === collectionId)
    : entries

  const addEntry = useCallback(
    (input: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'sections'> & { sections?: KnowledgeEntry['sections'] }) => {
      const now = new Date().toISOString()
      const id = generateId()
      const entry = normalizeEntry({
        ...input,
        id,
        collectionId: collectionId ?? DEFAULT_NOTES_COLLECTION_ID,
        createdAt: now,
        updatedAt: now,
        sections: input.sections ?? [],
      })
      setEntries((prev) => [entry, ...prev])
      return entry
    },
    [collectionId],
  )

  const updateEntry = useCallback((entry: KnowledgeEntry) => {
    const normalized = normalizeEntry({ ...entry, updatedAt: new Date().toISOString() })
    setEntries((prev) => prev.map((e) => (e.id === normalized.id ? normalized : e)))
    return normalized
  }, [])

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const duplicateEntry = useCallback(
    (id: string): KnowledgeEntry | null => {
      const source = entries.find((e) => e.id === id)
      if (!source) return null
      const now = new Date().toISOString()
      const copyId = generateId()
      const copy = normalizeEntry({
        ...source,
        id: copyId,
        title: `${source.title} (Kopie)`,
        titleEn: source.titleEn ? `${source.titleEn} (copy)` : undefined,
        createdAt: now,
        updatedAt: now,
        sections: (source.sections ?? []).map((s, i) => ({
          ...s,
          id: `${copyId}-section-${i}-${Math.random().toString(36).slice(2, 6)}`,
        })),
      })
      setEntries((prev) => [copy, ...prev])
      return copy
    },
    [entries],
  )

  return {
    entries: scoped,
    allEntries: entries,
    addEntry,
    updateEntry,
    deleteEntry,
    duplicateEntry,
  }
}

export function countClinicalEntriesByCollection(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const entry of loadEntries()) {
    const id = entry.collectionId ?? DEFAULT_NOTES_COLLECTION_ID
    counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}
