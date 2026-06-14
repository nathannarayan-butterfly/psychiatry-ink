/**
 * Feature flags — client-side.
 *
 * Enterprise org hierarchy is disabled by default. To enable locally, add to `.env.local`:
 *   VITE_ENABLE_ENTERPRISE_ORG_HIERARCHY=true
 * (Do not commit `.env.local`.)
 */
export function isEnterpriseOrgHierarchyEnabled(): boolean {
  return import.meta.env.VITE_ENABLE_ENTERPRISE_ORG_HIERARCHY === 'true'
}
