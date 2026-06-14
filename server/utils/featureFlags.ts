/** Server-side feature flags. Set ENABLE_ENTERPRISE_ORG_HIERARCHY=true to enable. */
export function isEnterpriseOrgHierarchyEnabled(): boolean {
  return process.env.ENABLE_ENTERPRISE_ORG_HIERARCHY === 'true'
}

export function isEnterpriseTier(tier: string | null | undefined): boolean {
  return tier === 'enterprise'
}
