import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import type { EnterpriseRoleAssignment } from '../types/organisation'

export interface EnterpriseSite {
  id: string
  organisationId: string
  name: string
  code: string
  settings: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface EnterpriseTeamNode {
  id: string
  organisationId: string
  name: string
  parentId: string | null
  siteId: string | null
  teamType: 'department' | 'unit' | 'team'
  createdAt: string
}

export interface EnterpriseSsoConfig {
  id: string
  organisationId: string
  provider: string
  config: Record<string, unknown>
  enabled: boolean
  createdAt: string
  updatedAt: string
}

async function enterpriseFetch(path: string, init?: RequestInit): Promise<Response> {
  const authHeaders = await getAuthHeaders()
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...init?.headers,
    },
  })
}

export async function fetchEnterpriseSites(): Promise<EnterpriseSite[]> {
  const response = await enterpriseFetch('/api/enterprise/sites')
  if (!response.ok) throw new Error('Standorte konnten nicht geladen werden')
  const data = (await response.json()) as { sites: EnterpriseSite[] }
  return data.sites
}

export async function fetchEnterpriseTeams(
  type?: 'department' | 'unit' | 'team',
): Promise<EnterpriseTeamNode[]> {
  const qs = type ? `?type=${encodeURIComponent(type)}` : ''
  const response = await enterpriseFetch(`/api/enterprise/teams${qs}`)
  if (!response.ok) throw new Error('Teams konnten nicht geladen werden')
  const data = (await response.json()) as { teams: EnterpriseTeamNode[] }
  return data.teams
}

export async function fetchEnterpriseSsoConfig(): Promise<EnterpriseSsoConfig> {
  const response = await enterpriseFetch('/api/enterprise/sso-config')
  if (!response.ok) throw new Error('SSO-Konfiguration konnte nicht geladen werden')
  const data = (await response.json()) as { config: EnterpriseSsoConfig }
  return data.config
}

export async function fetchEnterpriseRoleAssignments(): Promise<EnterpriseRoleAssignment[]> {
  const response = await enterpriseFetch('/api/enterprise/role-assignments')
  if (!response.ok) return []
  const data = (await response.json()) as { assignments: EnterpriseRoleAssignment[] }
  return data.assignments ?? []
}
