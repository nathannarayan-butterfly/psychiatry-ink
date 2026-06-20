import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import {
  getDiagnosisCatalogueCoverage,
  searchDiagnosisCatalogue,
} from '../services/diagnosisCatalogueStore'

export const diagnosesRouter: Router = createRouter()

/** GET /api/diagnoses/search?q=f20&system=ICD10GM&scope=psychiatric&limit=12 */
diagnosesRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? '').trim()
    if (!q) {
      res.json({ results: [] })
      return
    }

    const results = await searchDiagnosisCatalogue({
      q,
      system: typeof req.query.system === 'string' ? req.query.system : undefined,
      scope: typeof req.query.scope === 'string' ? req.query.scope : undefined,
      limit: Number(req.query.limit ?? 12),
    })

    res.json({ results })
  } catch (error) {
    console.error('[diagnoses] search failed', error)
    res.status(500).json({ error: 'Diagnosis catalogue search failed' })
  }
})

/** GET /api/diagnoses/coverage — dev/admin catalogue coverage report. */
diagnosesRouter.get('/coverage', async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' })
    return
  }
  try {
    const coverage = await getDiagnosisCatalogueCoverage()
    res.json(coverage)
  } catch (error) {
    console.error('[diagnoses] coverage failed', error)
    res.status(500).json({ error: 'Coverage report failed' })
  }
})
