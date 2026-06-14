import { usePermissionContext } from '../../contexts/PermissionContext'

/** Current org membership (role + status) from the shared provider. */
export function useCurrentMember() {
  const { member, role, isLoading, error } = usePermissionContext()
  return { member, role, isLoading, error }
}
