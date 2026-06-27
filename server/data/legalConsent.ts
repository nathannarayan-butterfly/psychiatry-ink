import { getSupabaseAdmin } from '../services/supabaseAdmin'
import type { Database } from '../types/database'

/**
 * legalConsentRepo — typed data-access seam for durable Datenschutz/AGB consent.
 *
 * Writes go through the service-role client (RLS-bypassing); the caller MUST
 * pass the user id verified by `requireRouteAuth`. Recording is idempotent per
 * (user_id, terms_version) via the unique constraint in
 * supabase/migrations/20260706000000_user_legal_consent.sql, so the
 * email-confirmation retry path can re-POST safely.
 */

export type UserLegalAcceptanceRow =
  Database['public']['Tables']['user_legal_acceptances']['Row']

export interface RecordLegalConsentInput {
  userId: string
  privacyVersion: string
  termsVersion: string
  locale?: string | null
}

export interface RecordLegalConsentResult {
  /** True when a new acceptance row was inserted; false when one already existed. */
  recorded: boolean
}

/**
 * Record the user's acceptance of the current legal versions. Idempotent: a
 * second call for the same (user_id, terms_version) is a no-op (the existing
 * row, with its original accepted_at, is preserved). Returns whether a row was
 * actually inserted.
 */
export async function recordLegalConsent(
  input: RecordLegalConsentInput,
): Promise<RecordLegalConsentResult> {
  const { userId, privacyVersion, termsVersion } = input
  const locale = input.locale ?? null

  // Pre-check keeps the response honest about whether THIS call recorded a new
  // acceptance, since `insert ... on conflict do nothing` cannot distinguish an
  // inserted row from an ignored conflict via the returned data alone.
  const existing = await getSupabaseAdmin()
    .from('user_legal_acceptances')
    .select('id')
    .eq('user_id', userId)
    .eq('terms_version', termsVersion)
    .maybeSingle()
  if (existing.error) {
    throw new Error(`legal consent read failed: ${existing.error.message}`)
  }
  if (existing.data) {
    return { recorded: false }
  }

  const { error } = await getSupabaseAdmin()
    .from('user_legal_acceptances')
    .upsert(
      {
        user_id: userId,
        privacy_version: privacyVersion,
        terms_version: termsVersion,
        locale,
      },
      { onConflict: 'user_id,terms_version', ignoreDuplicates: true },
    )
  if (error) {
    throw new Error(`legal consent write failed: ${error.message}`)
  }

  return { recorded: true }
}

export const legalConsentRepo = {
  recordLegalConsent,
}
