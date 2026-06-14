import { getKbSupabaseAdmin } from './kbSupabaseAdmin'

export interface OrgCalendarKeyRow {
  organisationId: string
  userId: string
  wrappedKey: string
  keyVersion: number
  createdAt: string
  updatedAt: string
}

function mapRow(row: Record<string, unknown>): OrgCalendarKeyRow {
  return {
    organisationId: String(row.organisation_id),
    userId: String(row.user_id),
    wrappedKey: String(row.wrapped_key),
    keyVersion: Number(row.key_version ?? 1),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function isCalendarKeyInitialized(organisationId: string): Promise<boolean> {
  const { count, error } = await getKbSupabaseAdmin()
    .from('org_calendar_keys')
    .select('user_id', { count: 'exact', head: true })
    .eq('organisation_id', organisationId)

  if (error) throw new Error(error.message)
  return (count ?? 0) > 0
}

export async function getCalendarKeyForUser(
  organisationId: string,
  userId: string,
): Promise<OrgCalendarKeyRow | null> {
  const { data, error } = await getKbSupabaseAdmin()
    .from('org_calendar_keys')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapRow(data as Record<string, unknown>)
}

export async function listMemberVaultPublicKeys(
  organisationId: string,
): Promise<Array<{ userId: string; publicKeyJwk: JsonWebKey }>> {
  const { data, error } = await getKbSupabaseAdmin()
    .from('org_member_vault_keys')
    .select('user_id, public_key_jwk')
    .eq('organisation_id', organisationId)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    userId: String((row as Record<string, unknown>).user_id),
    publicKeyJwk: (row as Record<string, unknown>).public_key_jwk as JsonWebKey,
  }))
}

export async function upsertCalendarKey(
  organisationId: string,
  userId: string,
  wrappedKey: string,
): Promise<OrgCalendarKeyRow> {
  const now = new Date().toISOString()
  const { data, error } = await getKbSupabaseAdmin()
    .from('org_calendar_keys')
    .upsert(
      {
        organisation_id: organisationId,
        user_id: userId,
        wrapped_key: wrappedKey,
        key_version: 1,
        updated_at: now,
      },
      { onConflict: 'organisation_id,user_id' },
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapRow(data as Record<string, unknown>)
}
