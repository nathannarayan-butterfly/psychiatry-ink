import { usePermissionContext } from '../../contexts/PermissionContext'

/** Active organisation from the shared org context provider. */
export function useCurrentOrganisation() {
  const { organisation, isLoading, error, refresh } = usePermissionContext()
  return { organisation, isLoading, error, refresh }
}
