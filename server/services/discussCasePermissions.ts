import type { DiscussCasePermission } from '../../src/types/discussCase'
import {
  EXTERNAL_DEFAULT_PERMISSIONS,
  INTERNAL_DEFAULT_PERMISSIONS,
  OWNER_PERMISSIONS,
} from '../../src/types/discussCase'

export function resolveDefaultPermissions(
  role: 'owner' | 'internal' | 'external',
  inviteType?: 'internal' | 'external',
): DiscussCasePermission[] {
  if (role === 'owner') return [...OWNER_PERMISSIONS]
  if (role === 'external' || inviteType === 'external') return [...EXTERNAL_DEFAULT_PERMISSIONS]
  return [...INTERNAL_DEFAULT_PERMISSIONS]
}

export function hasPermission(
  permissions: DiscussCasePermission[],
  required: DiscussCasePermission,
): boolean {
  return permissions.includes(required)
}

export function assertPermission(
  permissions: DiscussCasePermission[],
  required: DiscussCasePermission,
): void {
  if (!hasPermission(permissions, required)) {
    throw new Error(`Missing permission: ${required}`)
  }
}
