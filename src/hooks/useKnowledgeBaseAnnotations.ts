import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  KnowledgeBaseAnnotationStore,
  UserAiChatMessage,
  UserComment,
  UserHighlight,
} from '../types/knowledgeBaseAnnotations'
import { useKnowledgeBaseUserId } from './useKnowledgeBaseUserId'

const STORAGE_KEY = 'psychiatry-ink:knowledgeBaseAnnotations'

function loadStore(): KnowledgeBaseAnnotationStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { highlights: [], comments: [], chatMessages: [] }
    const parsed = JSON.parse(raw) as Partial<KnowledgeBaseAnnotationStore>
    return {
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
      chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
    }
  } catch {
    return { highlights: [], comments: [], chatMessages: [] }
  }
}

function saveStore(store: KnowledgeBaseAnnotationStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // ignore storage errors
  }
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useKnowledgeBaseAnnotations(medicationId: string | null) {
  const userId = useKnowledgeBaseUserId()
  const [store, setStore] = useState<KnowledgeBaseAnnotationStore>(loadStore)

  useEffect(() => {
    saveStore(store)
  }, [store])

  const scoped = useMemo(() => {
    if (!medicationId) {
      return { highlights: [] as UserHighlight[], comments: [] as UserComment[], chatMessages: [] as UserAiChatMessage[] }
    }
    const forMed = (item: { userId: string; medicationId: string }) =>
      item.userId === userId && item.medicationId === medicationId
    return {
      highlights: store.highlights.filter(forMed),
      comments: store.comments.filter(forMed),
      chatMessages: store.chatMessages.filter(forMed),
    }
  }, [store, userId, medicationId])

  const forSection = useCallback(
    (sectionId: string) => ({
      highlights: scoped.highlights.filter((h) => h.sectionId === sectionId),
      comments: scoped.comments.filter((c) => c.sectionId === sectionId),
      chatMessages: scoped.chatMessages.filter((m) => m.sectionId === sectionId),
    }),
    [scoped],
  )

  const addHighlight = useCallback(
    (input: Omit<UserHighlight, 'id' | 'userId' | 'medicationId' | 'createdAt'>) => {
      if (!medicationId) return null
      const highlight: UserHighlight = {
        ...input,
        id: generateId('hl'),
        userId,
        medicationId,
        createdAt: new Date().toISOString(),
      }
      setStore((prev) => ({ ...prev, highlights: [...prev.highlights, highlight] }))
      return highlight
    },
    [medicationId, userId],
  )

  const removeHighlight = useCallback(
    (highlightId: string) => {
      setStore((prev) => ({
        ...prev,
        highlights: prev.highlights.filter((h) => !(h.id === highlightId && h.userId === userId)),
      }))
    },
    [userId],
  )

  const addComment = useCallback(
    (input: Omit<UserComment, 'id' | 'userId' | 'medicationId' | 'createdAt'>) => {
      if (!medicationId) return null
      const comment: UserComment = {
        ...input,
        id: generateId('cm'),
        userId,
        medicationId,
        createdAt: new Date().toISOString(),
      }
      setStore((prev) => ({ ...prev, comments: [...prev.comments, comment] }))
      return comment
    },
    [medicationId, userId],
  )

  const removeComment = useCallback(
    (commentId: string) => {
      setStore((prev) => ({
        ...prev,
        comments: prev.comments.filter((c) => !(c.id === commentId && c.userId === userId)),
      }))
    },
    [userId],
  )

  const addChatMessage = useCallback(
    (input: Omit<UserAiChatMessage, 'id' | 'userId' | 'medicationId' | 'createdAt'>) => {
      if (!medicationId) return null
      const message: UserAiChatMessage = {
        ...input,
        id: generateId('ai'),
        userId,
        medicationId,
        createdAt: new Date().toISOString(),
      }
      setStore((prev) => ({ ...prev, chatMessages: [...prev.chatMessages, message] }))
      return message
    },
    [medicationId, userId],
  )

  return {
    forSection,
    addHighlight,
    removeHighlight,
    addComment,
    removeComment,
    addChatMessage,
  }
}
