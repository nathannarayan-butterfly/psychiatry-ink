import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchOrganisationContext } from '../services/orgApi'
import { registerClinicalOrganisationIdResolver } from '../services/clinicalApiFetch'
import { recordLoginAuditOnce } from '../services/auditApi'
import {
  buildSyntheticMember,
  resetPermissionDevWarnings,
  toPermissionCheckContext,
  warnPermissionFallback,
} from '../services/permissionService'
import type {
  ModuleAccess,
  Organisation,
  OrganisationMember,
  OrganisationRole,
  Permission,
} from '../types/organisation'

export interface PermissionContextValue {
  organisation: Organisation | null
  member: OrganisationMember | null
  role: OrganisationRole | null
  permissions: Permission[]
  moduleAccess: ModuleAccess[]
  isLoading: boolean
  error: string | null
  /** True when checks fell back to allow due to missing context (dev signal). */
  devWarning: boolean
  signalDevWarning: () => void
  refresh: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextValue | null>(null)

export function OrganisationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [organisation, setOrganisation] = useState<Organisation | null>(null)
  const [member, setMember] = useState<OrganisationMember | null>(null)
  const [role, setRole] = useState<OrganisationRole | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [moduleAccess, setModuleAccess] = useState<ModuleAccess[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devWarning, setDevWarning] = useState(false)

  const load = useCallback(async () => {
    if (!user?.id) {
      setOrganisation(null)
      setMember(null)
      setRole(null)
      setPermissions([])
      setModuleAccess([])
      setError(null)
      setDevWarning(false)
      resetPermissionDevWarnings()
      return
    }

    setIsLoading(true)
    setError(null)
    resetPermissionDevWarnings()

    try {
      const ctx = await fetchOrganisationContext()
      setOrganisation(ctx.organisation)
      setRole(ctx.role)
      setPermissions(ctx.permissions)
      setModuleAccess(ctx.moduleAccess ?? [])
      setMember(ctx.member ?? buildSyntheticMember(ctx.organisation.id, user.id, ctx.role))
      setDevWarning(false)
      recordLoginAuditOnce(user.id, ctx.organisation.id)
    } catch (err) {
      setOrganisation(null)
      setMember(null)
      setRole(null)
      setPermissions([])
      setModuleAccess([])
      setError(err instanceof Error ? err.message : 'Failed to load organisation')
      if (import.meta.env.DEV) {
        warnPermissionFallback('Failed to load organisation context', () => {
          setDevWarning(true)
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    registerClinicalOrganisationIdResolver(() => organisation?.id)
  }, [organisation?.id])

  useEffect(() => {
    void load()
  }, [load])

  const signalDevWarning = useCallback(() => {
    setDevWarning(true)
  }, [])

  const value = useMemo<PermissionContextValue>(
    () => ({
      organisation,
      member,
      role,
      permissions,
      moduleAccess,
      isLoading,
      error,
      devWarning,
      signalDevWarning,
      refresh: load,
    }),
    [devWarning, error, isLoading, load, member, moduleAccess, organisation, permissions, role, signalDevWarning],
  )

  return (
    <PermissionContext.Provider value={value}>
      <OrgPermissionErrorGate>{children}</OrgPermissionErrorGate>
    </PermissionContext.Provider>
  )
}

/** Minimal prod error when org permission context cannot load. */
function OrgPermissionErrorGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { error, isLoading, refresh } = usePermissionContext()

  if (!import.meta.env.PROD || !user || isLoading || !error) {
    return <>{children}</>
  }

  return (
    <div className="org-permission-error" role="alert">
      <p>Berechtigungen konnten nicht geladen werden.</p>
      <button type="button" className="btn-secondary" onClick={() => void refresh()}>
        Erneut versuchen
      </button>
    </div>
  )
}

export function usePermissionContext(): PermissionContextValue {
  const ctx = useContext(PermissionContext)
  if (!ctx) {
    throw new Error('usePermissionContext must be used within OrganisationProvider')
  }
  return ctx
}

/** Permission check context derived from provider state — for service functions. */
export function usePermissionCheckContext() {
  const { organisation, member, role, permissions, moduleAccess } = usePermissionContext()
  return useMemo(
    () => toPermissionCheckContext({ organisation, member, role, permissions, moduleAccess }),
    [member, moduleAccess, organisation, permissions, role],
  )
}
