import { getKbSupabaseAdmin } from './kbSupabaseAdmin'
import { parseCaseOwnerFlag } from '../../src/data/org/caseAccessLevels'

export interface OrgCaseVaultKeyRow {
  organisationId: string
  caseId: string
  userId: string
  wrappedKey: string
  keyVersion: number
  createdAt: string
}

export interface OrgCaseVaultSnapshotRow {
  organisationId: string
  caseId: string
  ciphertext: string
  iv: string
  version: number
  payloadVersion: number | null
  updatedBy: string | null
  updatedAt: string
}

export interface OrgMemberVaultKeyRow {
  organisationId: string
  userId: string
  publicKeyJwk: JsonWebKey
  keyVersion: number
  updatedAt: string
}

function mapVaultKey(row: Record<string, unknown>): OrgCaseVaultKeyRow {
  return {
    organisationId: String(row.organisation_id),
    caseId: String(row.case_id),
    userId: String(row.user_id),
    wrappedKey: String(row.wrapped_key),
    keyVersion: Number(row.key_version ?? 1),
    createdAt: String(row.created_at),
  }
}

function mapSnapshot(row: Record<string, unknown>): OrgCaseVaultSnapshotRow {
  return {
    organisationId: String(row.organisation_id),
    caseId: String(row.case_id),
    ciphertext: String(row.ciphertext),
    iv: String(row.iv),
    version: Number(row.version ?? 1),
    payloadVersion: row.payload_version != null ? Number(row.payload_version) : null,
    updatedBy: row.updated_by ? String(row.updated_by) : null,
    updatedAt: String(row.updated_at),
  }
}

export async function upsertMemberVaultPublicKey(
  organisationId: string,
  userId: string,
  publicKeyJwk: JsonWebKey,
): Promise<OrgMemberVaultKeyRow> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_member_vault_keys')
    .upsert(
      {
        organisation_id: organisationId,
        user_id: userId,
        public_key_jwk: publicKeyJwk,
        key_version: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organisation_id,user_id' },
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  const row = data as Record<string, unknown>
  return {
    organisationId: String(row.organisation_id),
    userId: String(row.user_id),
    publicKeyJwk: row.public_key_jwk as JsonWebKey,
    keyVersion: Number(row.key_version ?? 1),
    updatedAt: String(row.updated_at),
  }
}

export async function getMemberVaultPublicKey(
  organisationId: string,
  userId: string,
): Promise<OrgMemberVaultKeyRow | null> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_member_vault_keys')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  const row = data as Record<string, unknown>
  return {
    organisationId: String(row.organisation_id),
    userId: String(row.user_id),
    publicKeyJwk: row.public_key_jwk as JsonWebKey,
    keyVersion: Number(row.key_version ?? 1),
    updatedAt: String(row.updated_at),
  }
}

export async function getCaseVaultKeyForUser(
  organisationId: string,
  caseId: string,
  userId: string,
): Promise<OrgCaseVaultKeyRow | null> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_case_vault_keys')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('case_id', caseId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapVaultKey(data as Record<string, unknown>)
}

export async function upsertCaseVaultKey(
  organisationId: string,
  caseId: string,
  userId: string,
  wrappedKey: string,
  keyVersion = 1,
): Promise<OrgCaseVaultKeyRow> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_case_vault_keys')
    .upsert(
      {
        organisation_id: organisationId,
        case_id: caseId,
        user_id: userId,
        wrapped_key: wrappedKey,
        key_version: keyVersion,
      },
      { onConflict: 'organisation_id,case_id,user_id' },
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapVaultKey(data as Record<string, unknown>)
}

export async function deleteCaseVaultKeyForUser(
  organisationId: string,
  caseId: string,
  userId: string,
): Promise<void> {
  const admin = getKbSupabaseAdmin()
  const { error } = await admin
    .from('org_case_vault_keys')
    .delete()
    .eq('organisation_id', organisationId)
    .eq('case_id', caseId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

export async function getCaseVaultSnapshot(
  organisationId: string,
  caseId: string,
): Promise<OrgCaseVaultSnapshotRow | null> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_case_vault_snapshots')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('case_id', caseId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapSnapshot(data as Record<string, unknown>)
}

export async function upsertCaseVaultSnapshot(
  organisationId: string,
  caseId: string,
  fields: {
    ciphertext: string
    iv: string
    version?: number
    payloadVersion?: number | null
    updatedBy: string
  },
): Promise<OrgCaseVaultSnapshotRow> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_case_vault_snapshots')
    .upsert(
      {
        organisation_id: organisationId,
        case_id: caseId,
        ciphertext: fields.ciphertext,
        iv: fields.iv,
        version: fields.version ?? 1,
        payload_version: fields.payloadVersion ?? null,
        updated_by: fields.updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organisation_id,case_id' },
    )
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapSnapshot(data as Record<string, unknown>)
}

export async function getCaseOwnerUserId(
  organisationId: string,
  caseId: string,
): Promise<string | null> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_case_access')
    .select('user_id, granted_permissions')
    .eq('organisation_id', organisationId)
    .eq('case_id', caseId)
    .not('user_id', 'is', null)

  if (error) throw new Error(error.message)
  for (const row of data ?? []) {
    const record = row as Record<string, unknown>
    const perms = (record.granted_permissions ?? {}) as Record<string, unknown>
    if (parseCaseOwnerFlag(perms) && record.user_id) {
      return String(record.user_id)
    }
  }
  return null
}

export async function isCaseVaultInitialized(
  organisationId: string,
  caseId: string,
): Promise<boolean> {
  const admin = getKbSupabaseAdmin()
  const { count, error } = await admin
    .from('org_case_vault_keys')
    .select('*', { count: 'exact', head: true })
    .eq('organisation_id', organisationId)
    .eq('case_id', caseId)

  if (error) throw new Error(error.message)
  return (count ?? 0) > 0
}
