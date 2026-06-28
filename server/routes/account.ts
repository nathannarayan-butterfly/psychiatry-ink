import { timingSafeEqual } from 'node:crypto'
import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { LEGAL_LAST_UPDATED } from '../../shared/legalVersion'
import { getCreditBalance, getUserPlan, setUserPlan } from '../services/credits'
import { recordLegalConsent } from '../data/legalConsent'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { buildSensitiveLimiter } from '../config/security'
import { fetchWithTimeout } from '../utils/httpTimeout'
import { getSupabaseAdmin } from '../services/supabaseAdmin'
import {
  cancelDelete,
  getLifecycleStatus,
  reactivate,
  requestDelete,
  runDuePurges,
  unsubscribe,
} from '../services/accountLifecycle'
import { isDeleteConfirmed } from '../services/accountLifecyclePolicy'

export const accountRouter: Router = createRouter()

/** Tight rate limiter shared by the auth-bearing lifecycle mutations. */
const lifecycleLimiter = buildSensitiveLimiter()

/** Constant-time string comparison (avoids leaking the cron secret via timing). */
function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

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

// ── Account lifecycle (unsubscribe / delete / purge) ─────────────────────────

/** Reject the shared legacy `default` account on any lifecycle route. */
function requireRealUser(req: Request, res: Response): string | null {
  const userId = requireRouteAuth(req, res)
  if (!userId) return null
  if (userId === 'default') {
    res.status(401).json({ error: 'Anmeldung erforderlich' })
    return null
  }
  return userId
}

/**
 * Server-side password re-auth via the GoTrue password grant. NEVER trusts the
 * client: resolves the email from the verified user id (admin API) and exchanges
 * email+password for a token using the publishable/anon key. Returns false on
 * any failure (wrong password, network/timeout, misconfiguration).
 */
async function reauthenticatePassword(userId: string, password: string): Promise<boolean> {
  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '')
    .trim()
    .replace(/\/+$/, '')
  const anonKey = (process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  if (!url || !anonKey) return false

  try {
    const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(userId)
    const email = data?.user?.email
    if (error || !email) return false

    const response = await fetchWithTimeout(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey },
      body: JSON.stringify({ email, password }),
      timeoutMs: 10_000,
      label: 'GoTrue password grant',
    })
    return response.ok
  } catch {
    return false
  }
}

/** Current lifecycle + subscription state for the settings UI / banner. */
accountRouter.get('/lifecycle', async (req: Request, res: Response) => {
  try {
    const userId = requireRealUser(req, res)
    if (!userId) return
    res.json(await getLifecycleStatus(userId))
  } catch (error) {
    console.error('[account] lifecycle status failed:', error)
    res.status(500).json({ error: 'Failed to read account lifecycle' })
  }
})

/** Unsubscribe → dormant (cancel at period end + 90-day deletion clock). */
accountRouter.post('/unsubscribe', lifecycleLimiter, async (req: Request, res: Response) => {
  try {
    const userId = requireRealUser(req, res)
    if (!userId) return
    const result = await unsubscribe(userId)
    if (!result.ok) {
      res.status(409).json({ error: 'org_block', code: 'org_block', organisations: result.organisations })
      return
    }
    res.json(result.status)
  } catch (error) {
    console.error('[account] unsubscribe failed:', error)
    res.status(500).json({ error: 'Failed to unsubscribe' })
  }
})

/** Reactivate a dormant account (clears the deletion clock). */
accountRouter.post('/reactivate', lifecycleLimiter, async (req: Request, res: Response) => {
  try {
    const userId = requireRealUser(req, res)
    if (!userId) return
    res.json(await reactivate(userId))
  } catch (error) {
    console.error('[account] reactivate failed:', error)
    res.status(500).json({ error: 'Failed to reactivate account' })
  }
})

/**
 * Request account deletion. Requires the literal confirmation token `DELETE` AND
 * a valid password (both re-verified server-side). Cancels Stripe immediately
 * and enters the 30-day grace window.
 */
accountRouter.post('/delete', lifecycleLimiter, async (req: Request, res: Response) => {
  try {
    const userId = requireRealUser(req, res)
    if (!userId) return

    if (!isDeleteConfirmed(req.body?.confirmation)) {
      res.status(400).json({ error: 'confirmation_mismatch', code: 'confirmation_mismatch' })
      return
    }
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!password) {
      res.status(400).json({ error: 'password_incorrect', code: 'password_incorrect' })
      return
    }

    const reauthed = await reauthenticatePassword(userId, password)
    if (!reauthed) {
      res.status(403).json({ error: 'password_incorrect', code: 'password_incorrect' })
      return
    }

    const result = await requestDelete(userId)
    if (!result.ok) {
      res.status(409).json({ error: 'org_block', code: 'org_block', organisations: result.organisations })
      return
    }
    res.json(result.status)
  } catch (error) {
    console.error('[account] delete request failed:', error)
    res.status(500).json({ error: 'Failed to request account deletion' })
  }
})

/** Cancel a pending deletion within the grace window. */
accountRouter.post('/delete/cancel', lifecycleLimiter, async (req: Request, res: Response) => {
  try {
    const userId = requireRealUser(req, res)
    if (!userId) return
    res.json(await cancelDelete(userId))
  } catch (error) {
    console.error('[account] cancel delete failed:', error)
    res.status(500).json({ error: 'Failed to cancel account deletion' })
  }
})

/**
 * Cron-triggered purge sweep. Machine-to-machine: guarded by a shared secret
 * header (`X-Cron-Secret`) compared in constant time. Returns 503 when no secret
 * is configured (the sweep is disabled until the operator sets it).
 */
accountRouter.post('/lifecycle/run-purges', async (req: Request, res: Response) => {
  try {
    const secret = process.env.ACCOUNT_CRON_SECRET?.trim()
    if (!secret) {
      res.status(503).json({ error: 'Purge sweep not configured' })
      return
    }
    const provided = req.header('x-cron-secret') ?? ''
    if (!constantTimeEquals(provided, secret)) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const result = await runDuePurges()
    res.json(result)
  } catch (error) {
    console.error('[account] purge sweep failed:', error)
    res.status(500).json({ error: 'Purge sweep failed' })
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
