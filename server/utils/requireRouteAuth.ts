import type { Request, Response } from 'express'
import { isServerAuthConfigured, resolveAccountId } from '../middleware/auth'
import { isOrgStoreConfigured } from '../services/orgStore'

/** Allow legacy default account when neither Supabase auth nor org store is configured. */
export function allowLegacyDevAccount(): boolean {
  return !isServerAuthConfigured() && !isOrgStoreConfigured()
}

export function requireRouteAuth(req: Request, res: Response): string | null {
  const userId = resolveAccountId(req)
  if (userId && userId !== 'default') return userId
  if (allowLegacyDevAccount()) return 'default'
  res.status(401).json({ error: 'Anmeldung erforderlich' })
  return null
}
