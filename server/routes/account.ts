import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { LEGAL_LAST_UPDATED } from '../../shared/legalVersion'
import { getCreditBalance, getUserPlan, setUserPlan } from '../services/credits'
import { recordLegalConsent } from '../data/legalConsent'
import { requireRouteAuth } from '../utils/requireRouteAuth'

export const accountRouter: Router = createRouter()

/** Bound the stored locale token to a short, predictable string. */
function normalizeLocale(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return null
  // Accept BCP-47-ish tokens only (e.g. `de`, `en`, `pt-br`); reject junk.
  if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(trimmed)) return null
  return trimmed
}

/**
 * Durable record of the user's Datenschutz/AGB acceptance.
 *
 * The privacy/terms versions are pinned server-side to the deployed
 * `LEGAL_LAST_UPDATED` (clients never get to assert which version they
 * accepted). Idempotent per (user_id, terms_version) so the email-confirmation
 * retry path — where consent is only POSTable once the user is authenticated —
 * can re-send safely.
 */
accountRouter.post('/legal-consent', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return
    if (userId === 'default') {
      res.status(401).json({ error: 'Anmeldung erforderlich' })
      return
    }

    const locale = normalizeLocale(req.body?.locale)
    const { recorded } = await recordLegalConsent({
      userId,
      privacyVersion: LEGAL_LAST_UPDATED,
      termsVersion: LEGAL_LAST_UPDATED,
      locale,
    })
    res.json({ ok: true, recorded, version: LEGAL_LAST_UPDATED })
  } catch (error) {
    console.error('[account] legal-consent record failed:', error)
    res.status(500).json({ error: 'Failed to record consent' })
  }
})

accountRouter.get('/plan', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return
    const [plan, balance] = await Promise.all([getUserPlan(userId), getCreditBalance(userId)])
    res.json({ plan, balance, userId: userId === 'default' ? null : userId })
  } catch (error) {
    console.error('[account] plan read failed:', error)
    res.status(500).json({ error: 'Failed to read plan' })
  }
})

/** Dev-only plan toggle — Stripe integration stub. */
accountRouter.post('/plan', async (req: Request, res: Response) => {
  try {
    // Guard the unbilled self-upgrade path: only allowed outside production,
    // unless explicitly opted in. Real plan changes belong to a billing flow.
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_PLAN_TOGGLE !== 'true') {
      res.status(403).json({ error: 'Plan changes are handled via billing' })
      return
    }

    const userId = requireRouteAuth(req, res)
    if (!userId || userId === 'default') {
      if (!res.headersSent) res.status(401).json({ error: 'Anmeldung erforderlich' })
      return
    }

    const plan = req.body?.plan === 'pro' ? 'pro' : 'free'
    const next = await setUserPlan(userId, plan)
    res.json({ plan: next })
  } catch (error) {
    console.error('[account] plan update failed:', error)
    res.status(500).json({ error: 'Failed to update plan' })
  }
})
