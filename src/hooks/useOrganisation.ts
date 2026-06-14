import { usePermissions } from './permissions'
import { useCurrentMember } from './permissions/useCurrentMember'
import { useCurrentOrganisation } from './permissions/useCurrentOrganisation'

/**
 * @deprecated Prefer `usePermissions()` or `useCurrentOrganisation()` from `./permissions`.
 * Thin compatibility wrapper over the shared OrganisationProvider.
 */
export function useOrganisation() {
  const { organisation, isLoading, error, refresh } = useCurrentOrganisation()
  const { role } = useCurrentMember()
  const { permissions, hasPermission } = usePermissions()

  return {
    organisation,
    role,
    permissions,
    isLoading,
    error,
    hasPermission,
    refresh,
  }
}
