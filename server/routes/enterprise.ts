import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { resolveAccountId } from '../middleware/auth'
import { requireEnterprise } from '../middleware/requireEnterprise'
import {
  createSiteStub,
  ensureSsoConfigStub,
  listSites,
  listTeamsByType,
} from '../services/enterpriseOrg'
import { isEnterpriseStoreConfigured } from '../services/enterpriseOrg'
import { isOrgStoreConfigured } from '../services/orgStore'

export const enterpriseRouter: Router = createRouter()

enterpriseRouter.use(requireEnterprise)

function requireStore(res: Response): boolean {
  if (!isOrgStoreConfigured() || !isEnterpriseStoreConfigured()) {
    res.status(503).json({
      error: 'Enterprise features require Supabase configuration',
    })
    return false
  }
  return true
}

function orgId(req: Request): string {
  return (req as Request & { enterpriseOrg?: { id: string } }).enterpriseOrg!.id
}

enterpriseRouter.get('/sites', async (req: Request, res: Response) => {
  if (!requireStore(res)) return
  try {
    const sites = await listSites(orgId(req))
    res.json({ sites })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list sites' })
  }
})

enterpriseRouter.post('/sites', async (req: Request, res: Response) => {
  if (!requireStore(res)) return
  const userId = resolveAccountId(req)
  if (!userId || userId === 'default') {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
  if (!name || !code) {
    res.status(400).json({ error: 'name and code required' })
    return
  }

  try {
    const site = await createSiteStub(orgId(req), { name, code })
    res.status(201).json({ site })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create site' })
  }
})

enterpriseRouter.get('/teams', async (req: Request, res: Response) => {
  if (!requireStore(res)) return
  const teamType = req.query.type
  const allowed = ['department', 'unit', 'team'] as const
  const filter =
    typeof teamType === 'string' && allowed.includes(teamType as (typeof allowed)[number])
      ? (teamType as (typeof allowed)[number])
      : undefined

  try {
    const teams = await listTeamsByType(orgId(req), filter)
    res.json({ teams })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list teams' })
  }
})

enterpriseRouter.get('/sso-config', async (req: Request, res: Response) => {
  if (!requireStore(res)) return
  try {
    const config = await ensureSsoConfigStub(orgId(req))
    res.json({ config })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load SSO config' })
  }
})

/** Advanced role assignment — API stub for future enterprise RBAC UI. */
enterpriseRouter.get('/role-assignments', async (_req: Request, res: Response) => {
  res.json({
    assignments: [],
    note: 'Enterprise role assignment UI not yet implemented',
  })
})
