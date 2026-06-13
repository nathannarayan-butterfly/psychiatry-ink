import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'

const ANON_STORAGE_KEY = 'psychiatry-ink:kb-anonymous-user-id'

function getOrCreateAnonymousId(): string {
  try {
    const existing = localStorage.getItem(ANON_STORAGE_KEY)
    if (existing) return existing
    const id = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem(ANON_STORAGE_KEY, id)
    return id
  } catch {
    return `anon-${Date.now()}`
  }
}

/** Stable per-browser user id for KB annotations (Supabase user when signed in). */
export function useKnowledgeBaseUserId(): string {
  const { user } = useAuth()
  return useMemo(() => user?.id ?? getOrCreateAnonymousId(), [user?.id])
}

export interface KnowledgeBaseUserProfile {
  userId: string
  displayName: string
}

function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function resolveDisplayName(user: ReturnType<typeof useAuth>['user'], fallbackId: string): string {
  const metadata = user?.user_metadata as Record<string, unknown> | undefined
  const candidates = [
    metadata?.full_name,
    metadata?.name,
    metadata?.display_name,
    fallbackId,
    'Lokaler Benutzer',
  ]
  const name = candidates.find(
    (value): value is string =>
      typeof value === 'string' && value.trim().length > 0 && !isEmailLike(value),
  )
  if (name) return name.trim()
  return user?.email?.trim() || 'Lokaler Benutzer'
}

/** Current KB actor for audit stamps, with anonymous local fallback. */
export function useKnowledgeBaseUserProfile(): KnowledgeBaseUserProfile {
  const { user } = useAuth()
  return useMemo(() => {
    const userId = user?.id ?? getOrCreateAnonymousId()
    return {
      userId,
      displayName: resolveDisplayName(user, userId),
    }
  }, [user])
}
