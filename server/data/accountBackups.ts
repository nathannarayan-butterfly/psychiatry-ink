import { getSupabaseAdmin } from '../services/supabaseAdmin'

/**
 * accountBackupsRepo — typed data-access seam for the encrypted account backups
 * (Prisma `AccountKeyBackup` / `AccountRegistryBackup` → `account_key_backups` /
 * `account_registry_backups`).
 *
 * Zero-knowledge: these tables hold ciphertext + crypto parameters only (salt,
 * iv, ciphertext, iterations, version). The server never decrypts and never
 * logs these values. All access is keyed by the authenticated `user_id` and
 * goes through the service-role client. `updated_at` is maintained by the
 * `psy_set_updated_at()` BEFORE UPDATE trigger and defaults to now() on insert.
 */

export interface KeyBackupRecord {
  salt: string
  iv: string
  ciphertext: string
  iterations: number
  version: number
  updatedAt: string
}

export interface RegistryBackupRecord {
  salt: string
  iv: string
  ciphertext: string
  version: number
  updatedAt: string
}

/** updated_at (ISO) for the user's key backup, or null if none — used for status. */
export async function getKeyBackupUpdatedAt(userId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('account_key_backups')
    .select('updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`account_key_backups status read failed: ${error.message}`)
  return data?.updated_at ?? null
}

/** updated_at (ISO) for the user's registry backup, or null if none. */
export async function getRegistryBackupUpdatedAt(userId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('account_registry_backups')
    .select('updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`account_registry_backups status read failed: ${error.message}`)
  return data?.updated_at ?? null
}

/** Full key backup record (ciphertext) for the user, or null. */
export async function getKeyBackup(userId: string): Promise<KeyBackupRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('account_key_backups')
    .select('salt, iv, ciphertext, iterations, version, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`account_key_backups read failed: ${error.message}`)
  if (!data) return null
  return {
    salt: data.salt,
    iv: data.iv,
    ciphertext: data.ciphertext,
    iterations: data.iterations,
    version: data.version,
    updatedAt: data.updated_at,
  }
}

/** Full registry backup record (ciphertext) for the user, or null. */
export async function getRegistryBackup(userId: string): Promise<RegistryBackupRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('account_registry_backups')
    .select('salt, iv, ciphertext, version, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`account_registry_backups read failed: ${error.message}`)
  if (!data) return null
  return {
    salt: data.salt,
    iv: data.iv,
    ciphertext: data.ciphertext,
    version: data.version,
    updatedAt: data.updated_at,
  }
}

/** Insert-or-replace the user's key backup; returns the new updated_at (ISO). */
export async function upsertKeyBackup(
  userId: string,
  blob: { salt: string; iv: string; ciphertext: string; iterations: number; version: number },
): Promise<{ updatedAt: string }> {
  const { data, error } = await getSupabaseAdmin()
    .from('account_key_backups')
    .upsert(
      {
        user_id: userId,
        salt: blob.salt,
        iv: blob.iv,
        ciphertext: blob.ciphertext,
        iterations: blob.iterations,
        version: blob.version,
      },
      { onConflict: 'user_id' },
    )
    .select('updated_at')
    .single()
  if (error) throw new Error(`account_key_backups upsert failed: ${error.message}`)
  return { updatedAt: data.updated_at }
}

/** Insert-or-replace the user's registry backup; returns the new updated_at (ISO). */
export async function upsertRegistryBackup(
  userId: string,
  blob: { salt: string; iv: string; ciphertext: string; version: number },
): Promise<{ updatedAt: string }> {
  const { data, error } = await getSupabaseAdmin()
    .from('account_registry_backups')
    .upsert(
      {
        user_id: userId,
        salt: blob.salt,
        iv: blob.iv,
        ciphertext: blob.ciphertext,
        version: blob.version,
      },
      { onConflict: 'user_id' },
    )
    .select('updated_at')
    .single()
  if (error) throw new Error(`account_registry_backups upsert failed: ${error.message}`)
  return { updatedAt: data.updated_at }
}

/** Delete the user's registry backup (device-only mode). Idempotent. */
export async function deleteRegistryBackup(userId: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('account_registry_backups')
    .delete()
    .eq('user_id', userId)
  if (error) throw new Error(`account_registry_backups delete failed: ${error.message}`)
}
