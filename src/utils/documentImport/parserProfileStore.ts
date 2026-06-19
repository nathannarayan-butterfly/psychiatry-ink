/**
 * Per-user ParserProfile persistence.
 *
 * Storage choice: user-scoped `localStorage`, keyed by the signed-in user id
 * (with the same anonymous-id fallback the rest of the app uses). This mirrors
 * the established user-settings pattern in this codebase — every UI/preference
 * store here persists to `localStorage` (see `useOverviewLayout`,
 * `useLabImportSettings`, etc.), and Supabase writes go exclusively through the
 * service-role Express API (authenticated clients are select-only). A profile
 * therefore follows the user across sessions on a device without requiring a new
 * write endpoint.
 *
 * Because a ParserProfile is structure-only (no PHI — see the schema), plain
 * `localStorage` is appropriate; the encrypted vault is reserved for clinical
 * content. Cross-device sync via a Supabase `parser_profiles` table is a
 * documented future option (would need a matching write API + RLS migration).
 */
import {
  EMPTY_PARSER_PROFILE,
  ParserProfileSchema,
  safeParseParserProfile,
  type ParserProfile,
} from '../../schemas/documentImport/parserProfile'
import { safeSetItem } from '../safeStorage'

const STORAGE_PREFIX = 'psychiatry-ink:parser-profile:'

export function parserProfileStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

/** Load a user's profile, falling back to the empty (no-op) profile. */
export function loadParserProfile(userId: string): ParserProfile {
  try {
    const raw = localStorage.getItem(parserProfileStorageKey(userId))
    if (!raw) return EMPTY_PARSER_PROFILE
    const parsed = safeParseParserProfile(JSON.parse(raw))
    return parsed.success ? parsed.data : EMPTY_PARSER_PROFILE
  } catch {
    return EMPTY_PARSER_PROFILE
  }
}

/** Validate + persist a user's profile (stamps `updatedAt`). */
export function saveParserProfile(userId: string, profile: ParserProfile): ParserProfile {
  const validated = ParserProfileSchema.parse({
    ...profile,
    updatedAt: new Date().toISOString(),
  })
  safeSetItem(parserProfileStorageKey(userId), JSON.stringify(validated))
  return validated
}

/** Remove a user's profile (reset to base parser behaviour). */
export function clearParserProfile(userId: string): void {
  try {
    localStorage.removeItem(parserProfileStorageKey(userId))
  } catch {
    // ignore
  }
}
