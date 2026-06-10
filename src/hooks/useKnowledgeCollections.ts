import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_KNOWLEDGE_COLLECTIONS,
  type KnowledgeCollection,
  type KnowledgeCollectionType,
} from '../types/knowledgeBase'

const STORAGE_KEY = 'psychiatry-ink:knowledgeBaseCollections'

function loadCollections(): KnowledgeCollection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as KnowledgeCollection[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure the two default collections always exist (in case of partial data).
        const ids = new Set(parsed.map((c) => c.id))
        const missingDefaults = DEFAULT_KNOWLEDGE_COLLECTIONS.filter((d) => !ids.has(d.id))
        return missingDefaults.length > 0 ? [...missingDefaults, ...parsed] : parsed
      }
    }
  } catch {
    // ignore
  }
  const seeded = [...DEFAULT_KNOWLEDGE_COLLECTIONS]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  } catch {
    // ignore
  }
  return seeded
}

function generateId(): string {
  return `kb-collection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export interface NewCollectionInput {
  name: string
  type: KnowledgeCollectionType
  icon?: string
  color?: string
}

export function useKnowledgeCollections() {
  const [collections, setCollections] = useState<KnowledgeCollection[]>(loadCollections)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collections))
    } catch {
      // ignore
    }
  }, [collections])

  const addCollection = useCallback((input: NewCollectionInput): KnowledgeCollection => {
    const now = new Date().toISOString()
    const created: KnowledgeCollection = {
      id: generateId(),
      name: input.name.trim() || 'Sammlung',
      type: input.type,
      icon: input.icon,
      color: input.color,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    }
    setCollections((prev) => [...prev, created])
    return created
  }, [])

  const updateCollection = useCallback(
    (id: string, patch: Partial<Pick<KnowledgeCollection, 'name' | 'icon' | 'color'>>) => {
      const now = new Date().toISOString()
      setCollections((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                ...patch,
                name: patch.name !== undefined ? patch.name.trim() || c.name : c.name,
                updatedAt: now,
              }
            : c,
        ),
      )
    },
    [],
  )

  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id || c.isDefault))
  }, [])

  return { collections, addCollection, updateCollection, deleteCollection }
}
