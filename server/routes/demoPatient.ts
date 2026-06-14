import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { isDemoPublisherEmail } from '../../shared/demoPublisher'
import { DEMO_SEED_VERSION } from '../../src/demo/constants'
import type { DemoPatientFixture } from '../../src/demo/types'
import { nextDemoSeedVersion } from '../../src/demo/demoVersion'
import { validateDemoFixture } from '../../src/demo/validateDemoFixture'
import { resolveAccountId } from '../middleware/auth'
import {
  getCanonicalDemoPatient,
  isDemoPatientCanonicalStoreConfigured,
  publishCanonicalDemoPatient,
} from '../services/demoPatientCanonicalStore'
import { resolveAuthUser } from '../utils/resolveAuthUser'

export const demoPatientRouter: Router = createRouter()

function requireAuth(req: Request, res: Response): string | null {
  const userId = resolveAccountId(req)
  if (!userId || userId === 'default') {
    res.status(401).json({ error: 'Authentication required' })
    return null
  }
  return userId
}

function requireStore(res: Response): boolean {
  if (!isDemoPatientCanonicalStoreConfigured()) {
    res.status(503).json({
      error: 'Demo patient canonical store requires Supabase (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)',
    })
    return false
  }
  return true
}

function isDemoFixture(value: unknown): value is DemoPatientFixture {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    record.isDemoPatient === true &&
    typeof record.demoCaseId === 'string' &&
    typeof record.demoPatientId === 'string' &&
    typeof record.demoSeedVersion === 'string'
  )
}

demoPatientRouter.get('/canonical', async (req: Request, res: Response) => {
  const userId = requireAuth(req, res)
  if (!userId) return
  if (!requireStore(res)) return

  try {
    const canonical = await getCanonicalDemoPatient()
    if (!canonical) {
      res.status(404).json({
        error: 'No canonical demo patient published yet',
        bundledSeedVersion: DEMO_SEED_VERSION,
      })
      return
    }

    res.json({
      seedVersion: canonical.seedVersion,
      fixture: canonical.fixture,
      publishedBy: canonical.publishedBy,
      publishedByEmail: canonical.publishedByEmail,
      publishedAt: canonical.publishedAt,
    })
  } catch (err) {
    console.error('[demo-patient] GET canonical failed:', err)
    res.status(500).json({ error: 'Failed to load canonical demo patient' })
  }
})

demoPatientRouter.put('/canonical', async (req: Request, res: Response) => {
  const userId = requireAuth(req, res)
  if (!userId) return
  if (!requireStore(res)) return

  const authUser = await resolveAuthUser(req)
  if (!authUser) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  if (!isDemoPublisherEmail(authUser.email, process.env.DEMO_PUBLISHER_EMAIL)) {
    res.status(403).json({ error: 'Only the demo publisher may publish canonical demo patient data' })
    return
  }

  const body = req.body as { fixture?: unknown }
  if (!isDemoFixture(body.fixture)) {
    res.status(400).json({ error: 'Invalid demo patient fixture payload' })
    return
  }

  try {
    const existing = await getCanonicalDemoPatient()
    const seedVersion = nextDemoSeedVersion(existing?.seedVersion ?? body.fixture.demoSeedVersion)
    const fixture: DemoPatientFixture = {
      ...body.fixture,
      isDemoPatient: true,
      demoSeedVersion: seedVersion,
    }

    const validation = validateDemoFixture(fixture, { expectedSeedVersion: seedVersion })
    if (!validation.ok) {
      res.status(400).json({
        error: 'Demo fixture validation failed',
        validation,
      })
      return
    }

    const published = await publishCanonicalDemoPatient({
      seedVersion,
      fixture,
      publishedBy: authUser.id,
      publishedByEmail: authUser.email,
    })

    res.json({
      seedVersion: published.seedVersion,
      fixture: published.fixture,
      publishedBy: published.publishedBy,
      publishedByEmail: published.publishedByEmail,
      publishedAt: published.publishedAt,
    })
  } catch (err) {
    console.error('[demo-patient] PUT canonical failed:', err)
    res.status(500).json({ error: 'Failed to publish canonical demo patient' })
  }
})
