import { useCallback, useEffect, useState } from 'react'

/**
 * Clinician-facing AI mode for Wissensdatenbank generation / Ask-AI.
 *
 * Two surfaced modes map to the backend `tier` on `/api/pharma-generate` and
 * `/api/pharma-ask`:
 *   - `fast`     → DeepSeek (quick draft)
 *   - `thorough` → OpenAI (highest quality, default)
 *
 * (`standard` also exists on the server but is folded into "fast" in the UI.)
 */
export type KbAiTier = 'fast' | 'thorough'

const STORAGE_KEY = 'psyink.kb.aiTier'
const DEFAULT_TIER: KbAiTier = 'thorough'

function readStored(): KbAiTier {
  if (typeof window === 'undefined') return DEFAULT_TIER
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw === 'fast' || raw === 'thorough' ? raw : DEFAULT_TIER
  } catch {
    return DEFAULT_TIER
  }
}

/** Session-persistent AI mode selection (localStorage-backed). */
export function useKnowledgeBaseAiTier(): [KbAiTier, (tier: KbAiTier) => void] {
  const [tier, setTierState] = useState<KbAiTier>(readStored)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, tier)
    } catch {
      // Non-fatal: persistence is best-effort.
    }
  }, [tier])

  const setTier = useCallback((next: KbAiTier) => setTierState(next), [])

  return [tier, setTier]
}
