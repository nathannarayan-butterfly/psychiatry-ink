import type { IcdTitleResult } from '../../shared/icdTitle'

/** ICD titles are stable — cache for 24h to limit WHO API traffic. */
const TTL_MS = 24 * 60 * 60 * 1000

interface CacheEntry {
  result: IcdTitleResult
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

export function icdTitleCacheKey(version: string, language: string, code: string): string {
  return `${version}:${language}:${code.trim().toUpperCase()}`
}

export function getCachedIcdTitle(key: string): IcdTitleResult | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.result
}

export function setCachedIcdTitle(key: string, result: IcdTitleResult): void {
  cache.set(key, { result, expiresAt: Date.now() + TTL_MS })
}

/** Test helper — clears in-memory cache between cases. */
export function clearIcdTitleCache(): void {
  cache.clear()
}
