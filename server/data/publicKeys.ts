import { getSupabaseAdmin } from '../services/supabaseAdmin'

/**
 * publicKeysRepo — typed data-access seam for device public-key registration
 * (Prisma `UserPublicKey` → `user_public_keys`).
 *
 * Stores a browser-generated public key JWK (serialized as text) per device —
 * never a patient name/age. Keyed by `device_id` (unique). Accessed server-side
 * via the service-role client after route auth. `updated_at` is maintained by
 * the `psy_set_updated_at()` trigger.
 */

export interface PublicKeyRecord {
  publicKeyJwk: string
  countryCode: string
  createdAt: string
}

/** Insert-or-replace the public key for a device. */
export async function upsertPublicKey(input: {
  deviceId: string
  publicKeyJwk: string
  countryCode: string
}): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('user_public_keys')
    .upsert(
      {
        device_id: input.deviceId,
        public_key_jwk: input.publicKeyJwk,
        country_code: input.countryCode,
      },
      { onConflict: 'device_id' },
    )
  if (error) throw new Error(`user_public_keys upsert failed: ${error.message}`)
}

/** Read the public key registered for a device, or null if none. */
export async function findPublicKeyByDevice(deviceId: string): Promise<PublicKeyRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('user_public_keys')
    .select('public_key_jwk, country_code, created_at')
    .eq('device_id', deviceId)
    .maybeSingle()
  if (error) throw new Error(`user_public_keys read failed: ${error.message}`)
  if (!data) return null
  return {
    publicKeyJwk: data.public_key_jwk,
    countryCode: data.country_code,
    createdAt: data.created_at,
  }
}
