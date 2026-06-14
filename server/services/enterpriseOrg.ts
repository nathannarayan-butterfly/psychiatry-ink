import type { Organisation } from '../../src/types/organisation'
import { getKbSupabaseAdmin, isKbAdminConfigured } from './kbSupabaseAdmin'

export type OrgTeamType = 'department' | 'unit' | 'team'

export interface OrgSite {
  id: string
  organisationId: string
  name: string
  code: string
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface OrgTeamNode {
  id: string
  organisationId: string
  name: string
  parentId: string | null
  siteId: string | null
  teamType: OrgTeamType
  createdAt: string
}

export interface OrgSsoConfigStub {
  id: string
  organisationId: string
  provider: string
  config: Record<string, unknown>
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface EnterpriseOrgSettings {
  externalConsultantMode?: boolean
  orgTemplatesEnabled?: boolean
}

function mapSite(row: Record<string, unknown>): OrgSite {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    name: String(row.name),
    code: String(row.code),
    settings: (row.settings ?? {}) as Record<string, unknown>,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapTeam(row: Record<string, unknown>): OrgTeamNode {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    name: String(row.name),
    parentId: row.parent_id ? String(row.parent_id) : null,
    siteId: row.site_id ? String(row.site_id) : null,
    teamType: (row.team_type ?? 'team') as OrgTeamType,
    createdAt: String(row.created_at),
  }
}

function mapSsoConfig(row: Record<string, unknown>): OrgSsoConfigStub {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    provider: String(row.provider ?? 'saml'),
    config: (row.config ?? {}) as Record<string, unknown>,
    enabled: Boolean(row.enabled),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export function parseEnterpriseSettings(
  settings: Record<string, unknown> | undefined,
): EnterpriseOrgSettings {
  const enterprise = settings?.enterprise
  if (!enterprise || typeof enterprise !== 'object') return {}
  const e = enterprise as Record<string, unknown>
  return {
    externalConsultantMode: e.externalConsultantMode === true,
    orgTemplatesEnabled: e.orgTemplatesEnabled !== false,
  }
}

export function isEnterpriseStoreConfigured(): boolean {
  return isKbAdminConfigured()
}

export async function listSites(organisationId: string): Promise<OrgSite[]> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_sites')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('name')

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapSite(row as Record<string, unknown>))
}

export async function createSiteStub(
  organisationId: string,
  input: { name: string; code: string },
): Promise<OrgSite> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_sites')
    .insert({
      organisation_id: organisationId,
      name: input.name.trim(),
      code: input.code.trim().toLowerCase(),
      settings: {},
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapSite(data as Record<string, unknown>)
}

export async function listTeamsByType(
  organisationId: string,
  teamType?: OrgTeamType,
): Promise<OrgTeamNode[]> {
  const admin = getKbSupabaseAdmin()
  let query = admin
    .from('org_teams')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('name')

  if (teamType) query = query.eq('team_type', teamType)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapTeam(row as Record<string, unknown>))
}

export async function getSsoConfigStub(organisationId: string): Promise<OrgSsoConfigStub | null> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_sso_config')
    .select('*')
    .eq('organisation_id', organisationId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapSsoConfig(data as Record<string, unknown>)
}

export async function ensureSsoConfigStub(organisationId: string): Promise<OrgSsoConfigStub> {
  const existing = await getSsoConfigStub(organisationId)
  if (existing) return existing

  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin
    .from('org_sso_config')
    .insert({
      organisation_id: organisationId,
      provider: 'saml',
      config: {},
      enabled: false,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapSsoConfig(data as Record<string, unknown>)
}

export function assertEnterpriseOrg(org: Organisation): void {
  if (org.tier !== 'enterprise') {
    throw new Error('Enterprise tier required')
  }
}
