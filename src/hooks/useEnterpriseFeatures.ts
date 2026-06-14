import { useMemo } from 'react'
import { usePermissionContext } from '../contexts/PermissionContext'
import { isEnterpriseOrgHierarchyEnabled } from '../utils/featureFlags'
import type { EnterpriseSettings } from '../types/organisation'

export interface EnterpriseFeatures {
  /** Feature flag VITE_ENABLE_ENTERPRISE_ORG_HIERARCHY === 'true' */
  enabled: boolean
  /** Current org tier === 'enterprise' */
  isEnterpriseOrg: boolean
  /** Flag on AND enterprise tier — gates all Enterprise UI */
  canAccessEnterpriseUi: boolean
  /** Parsed org_organisations.settings.enterprise */
  enterpriseSettings: EnterpriseSettings
}

function parseEnterpriseSettings(settings: Record<string, unknown> | undefined): EnterpriseSettings {
  const enterprise = settings?.enterprise
  if (!enterprise || typeof enterprise !== 'object') return {}
  const e = enterprise as Record<string, unknown>
  return {
    externalConsultantMode: e.externalConsultantMode === true,
    orgTemplatesEnabled: e.orgTemplatesEnabled !== false,
  }
}

export function useEnterpriseFeatures(): EnterpriseFeatures {
  const { organisation } = usePermissionContext()

  return useMemo(() => {
    const enabled = isEnterpriseOrgHierarchyEnabled()
    const isEnterpriseOrg = organisation?.tier === 'enterprise'
    const canAccessEnterpriseUi = enabled && isEnterpriseOrg
    const enterpriseSettings = parseEnterpriseSettings(organisation?.settings)

    return {
      enabled,
      isEnterpriseOrg,
      canAccessEnterpriseUi,
      enterpriseSettings,
    }
  }, [organisation])
}

/** Dev-only hint when flag is on but org is not enterprise tier. */
export function useEnterpriseNotActivatedHint(): boolean {
  const { enabled, isEnterpriseOrg } = useEnterpriseFeatures()
  const { role } = usePermissionContext()
  return import.meta.env.DEV && enabled && !isEnterpriseOrg && role === 'org_owner'
}
