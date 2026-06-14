import type { Request, Response, NextFunction } from 'express'
import { resolveAccountId } from './auth'
import { isEnterpriseOrgHierarchyEnabled, isEnterpriseTier } from '../utils/featureFlags'
import { buildOrganisationContext, ORG_HEADER } from '../services/orgPermissions'

/**
 * Returns 404 when enterprise hierarchy flag is off or org tier is not enterprise.
 * Intentionally opaque — no hint that the feature exists when disabled.
 */
export async function requireEnterprise(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!isEnterpriseOrgHierarchyEnabled()) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const userId = resolveAccountId(req)
  if (!userId || userId === 'default') {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const ctx = await buildOrganisationContext(userId, req.headers[ORG_HEADER])
  if (!ctx.organisation || !ctx.member || !isEnterpriseTier(ctx.organisation.tier)) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  ;(req as Request & { enterpriseOrg?: typeof ctx.organisation }).enterpriseOrg =
    ctx.organisation
  ;(req as Request & { enterpriseMember?: typeof ctx.member }).enterpriseMember = ctx.member

  next()
}
