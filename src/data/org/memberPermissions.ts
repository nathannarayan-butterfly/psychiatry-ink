import type { OrganisationMember, OrganisationRole, Permission } from '../../types/organisation'
import { ALL_PERMISSIONS, permissionsForRole } from './rolePermissions'

/** Permissions adjustable per member in Small Praxis team settings (MVP). */
export const EDITABLE_MEMBER_PERMISSIONS = [
  'ai.use',
  'ai.useTherapyDocumentation',
  'documents.finalize',
  'discussion.inviteExternal',
  'consultation.create',
] as const satisfies readonly Permission[]

export type EditableMemberPermission = (typeof EDITABLE_MEMBER_PERMISSIONS)[number]

export interface PermissionOverrideSet {
  grant?: Permission[]
  revoke?: Permission[]
}

export interface MemberSettings {
  permissionOverrides?: PermissionOverrideSet | null
  aiQuotaMonthly?: number | null
  aiQuotaUsed?: number
  /** ISO date (YYYY-MM-DD) — start of current quota billing month. */
  aiQuotaPeriodStart?: string | null
}

const EDITABLE_SET = new Set<string>(EDITABLE_MEMBER_PERMISSIONS)

function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value)
}

function normalizeOverrideList(values: unknown): Permission[] {
  if (!Array.isArray(values)) return []
  const seen = new Set<Permission>()
  const result: Permission[] = []
  for (const item of values) {
    if (typeof item !== 'string' || !isPermission(item)) continue
    if (!EDITABLE_SET.has(item)) continue
    if (seen.has(item)) continue
    seen.add(item)
    result.push(item)
  }
  return result
}

export function normalizePermissionOverrides(input: unknown): PermissionOverrideSet | null {
  if (input == null) return null
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const grant = normalizeOverrideList(raw.grant)
  const revoke = normalizeOverrideList(raw.revoke)
  if (grant.length === 0 && revoke.length === 0) return null
  return {
    ...(grant.length > 0 ? { grant } : {}),
    ...(revoke.length > 0 ? { revoke } : {}),
  }
}

/** Viewer must never receive medication.approve via overrides (server validation). */
export function validatePermissionOverrides(
  role: OrganisationRole,
  overrides: PermissionOverrideSet | null | undefined,
): string | null {
  if (!overrides) return null
  const grants = overrides.grant ?? []
  if (role === 'viewer' && grants.includes('medication.approve' as Permission)) {
    return 'Viewer cannot be granted medication.approve'
  }
  return null
}

export function permissionsForMember(
  member: Pick<OrganisationMember, 'role' | 'permissionOverrides'>,
): Permission[] {
  if (member.role === 'single_owner' || member.role === 'org_owner') {
    return permissionsForRole(member.role)
  }

  const base = permissionsForRole(member.role)
  const overrides = member.permissionOverrides
  if (!overrides) return base

  const grant = overrides.grant ?? []
  const revoke = new Set(overrides.revoke ?? [])
  const merged = new Set(base)
  for (const p of grant) merged.add(p)
  for (const r of revoke) merged.delete(r)
  return [...merged]
}

export function effectiveEditablePermission(
  role: OrganisationRole,
  permission: EditableMemberPermission,
  overrides: PermissionOverrideSet | null | undefined,
): boolean {
  const effective = permissionsForMember({ role, permissionOverrides: overrides })
  return effective.includes(permission)
}

export function buildPermissionOverridesFromToggles(
  role: OrganisationRole,
  toggles: Partial<Record<EditableMemberPermission, boolean>>,
  previous: PermissionOverrideSet | null | undefined,
): PermissionOverrideSet | null {
  const base = new Set(permissionsForRole(role))
  const grant = new Set<Permission>(previous?.grant?.filter((p) => EDITABLE_SET.has(p)) ?? [])
  const revoke = new Set<Permission>(previous?.revoke?.filter((p) => EDITABLE_SET.has(p)) ?? [])

  for (const permission of EDITABLE_MEMBER_PERMISSIONS) {
    if (typeof toggles[permission] !== 'boolean') continue
    const desired = toggles[permission]!
    const inRole = base.has(permission)
    grant.delete(permission)
    revoke.delete(permission)
    if (desired && !inRole) grant.add(permission)
    if (!desired && inRole) revoke.add(permission)
  }

  if (grant.size === 0 && revoke.size === 0) return null
  return {
    ...(grant.size > 0 ? { grant: [...grant] } : {}),
    ...(revoke.size > 0 ? { revoke: [...revoke] } : {}),
  }
}

export function parseMemberSettings(raw: unknown): MemberSettings {
  if (!raw || typeof raw !== 'object') return {}
  const row = raw as Record<string, unknown>
  const permissionOverrides = normalizePermissionOverrides(row.permissionOverrides)
  const aiQuotaMonthly =
    row.aiQuotaMonthly === null
      ? null
      : typeof row.aiQuotaMonthly === 'number' && Number.isFinite(row.aiQuotaMonthly)
        ? Math.max(0, Math.floor(row.aiQuotaMonthly))
        : undefined
  const aiQuotaUsed =
    typeof row.aiQuotaUsed === 'number' && Number.isFinite(row.aiQuotaUsed)
      ? Math.max(0, Math.floor(row.aiQuotaUsed))
      : undefined
  const aiQuotaPeriodStart =
    typeof row.aiQuotaPeriodStart === 'string' ? row.aiQuotaPeriodStart : undefined

  return {
    ...(permissionOverrides ? { permissionOverrides } : {}),
    ...(aiQuotaMonthly !== undefined ? { aiQuotaMonthly } : {}),
    ...(aiQuotaUsed !== undefined ? { aiQuotaUsed } : {}),
    ...(aiQuotaPeriodStart ? { aiQuotaPeriodStart } : {}),
  }
}

export function orgDefaultAiQuotaMonthly(settings: Record<string, unknown> | undefined): number | null {
  const value = settings?.aiDefaultQuotaMonthly
  if (value === null || value === undefined) return null
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.max(0, Math.floor(value))
}

export function effectiveAiQuotaMonthly(
  member: Pick<OrganisationMember, 'aiQuotaMonthly'>,
  orgSettings: Record<string, unknown> | undefined,
): number | null {
  if (member.aiQuotaMonthly === null) return null
  if (typeof member.aiQuotaMonthly === 'number') return member.aiQuotaMonthly
  return orgDefaultAiQuotaMonthly(orgSettings)
}
