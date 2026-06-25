import { getSupabaseAdmin } from '../services/supabaseAdmin'

/**
 * snapshotsRepo — typed data-access seam for zero-knowledge encrypted workspace
 * snapshots (Prisma `EncryptedWorkspaceSnapshot` → `encrypted_workspace_snapshots`).
 *
 * Ciphertext only — the server never decrypts, never logs ciphertext/keys, and
 * never stores plaintext PHI. One row per (user_id, case_id). Reads/writes are
 * scoped by the resolved owner `user_id` in the route. `updated_at` is
 * maintained by the `psy_set_updated_at()` trigger.
 */

export interface SnapshotRecord {
  caseId: string
  ciphertext: string
  iv: string
  wrappedKey: string
  version: number
  titleHint: string | null
  updatedAt: string
}

export interface SnapshotCaseSummary {
  caseId: string
  titleHint: string | null
  updatedAt: string
  createdAt: string
}

export interface UpsertSnapshotInput {
  userId: string
  caseId: string
  deviceId: string
  ciphertext: string
  iv: string
  wrappedKey: string
  version: number
  titleHint: string | null
}

/**
 * Insert-or-replace the snapshot for (user_id, case_id). The conflict target is
 * the unique (user_id, case_id) constraint; user_id/case_id are unchanged on
 * update, matching the Prisma upsert (which only rewrote the ciphertext fields).
 * Returns the new updated_at (ISO).
 */
export async function upsertSnapshot(input: UpsertSnapshotInput): Promise<{ updatedAt: string }> {
  const { data, error } = await getSupabaseAdmin()
    .from('encrypted_workspace_snapshots')
    .upsert(
      {
        user_id: input.userId,
        case_id: input.caseId,
        device_id: input.deviceId,
        ciphertext: input.ciphertext,
        iv: input.iv,
        wrapped_key: input.wrappedKey,
        version: input.version,
        title_hint: input.titleHint,
      },
      { onConflict: 'user_id,case_id' },
    )
    .select('updated_at')
    .single()
  if (error) throw new Error(`encrypted_workspace_snapshots upsert failed: ${error.message}`)
  return { updatedAt: data.updated_at }
}

/** Read the snapshot for (user_id, case_id), or null. */
export async function findSnapshot(userId: string, caseId: string): Promise<SnapshotRecord | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('encrypted_workspace_snapshots')
    .select('case_id, ciphertext, iv, wrapped_key, version, title_hint, updated_at')
    .eq('user_id', userId)
    .eq('case_id', caseId)
    .maybeSingle()
  if (error) throw new Error(`encrypted_workspace_snapshots read failed: ${error.message}`)
  if (!data) return null
  return {
    caseId: data.case_id,
    ciphertext: data.ciphertext,
    iv: data.iv,
    wrappedKey: data.wrapped_key,
    version: data.version,
    titleHint: data.title_hint,
    updatedAt: data.updated_at,
  }
}

/** List case summaries (metadata only, no ciphertext) for a user, newest first. */
export async function listCaseSummariesByUser(userId: string): Promise<SnapshotCaseSummary[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('encrypted_workspace_snapshots')
    .select('case_id, title_hint, updated_at, created_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(`encrypted_workspace_snapshots list failed: ${error.message}`)
  return (data ?? []).map((row) => ({
    caseId: row.case_id,
    titleHint: row.title_hint,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }))
}
