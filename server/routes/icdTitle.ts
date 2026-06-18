import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { IcdTitleLookupItem } from '../../shared/icdTitle'
import {
  normalizeVersion,
  resolveIcdDisplayTitle,
  resolveIcdDisplayTitles,
} from '../services/icdTitleResolver'

export const icdTitleRouter: Router = createRouter()

/** GET /api/icd/title?code=F12.2&version=icd10&language=de */
icdTitleRouter.get('/title', async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code ?? '').trim()
    const version = normalizeVersion(typeof req.query.version === 'string' ? req.query.version : undefined)
    const language = typeof req.query.language === 'string' ? req.query.language : 'de'

    if (!code) {
      res.status(400).json({ error: 'code query parameter required' })
      return
    }
    if (!version) {
      res.status(400).json({ error: 'version must be icd10, icd11, or dsm' })
      return
    }

    const result = await resolveIcdDisplayTitle({ code, version, language })
    res.json(result)
  } catch (error) {
    console.error('[icd/title] lookup failed', error)
    res.status(500).json({ error: 'ICD title lookup failed' })
  }
})

function parseBatchItems(raw: unknown): IcdTitleLookupItem[] {
  if (!Array.isArray(raw)) return []
  const out: IcdTitleLookupItem[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const code = typeof (item as { code?: unknown }).code === 'string' ? (item as { code: string }).code.trim() : ''
    const version = normalizeVersion(
      typeof (item as { version?: unknown }).version === 'string'
        ? (item as { version: string }).version
        : undefined,
    )
    if (!code || !version) continue
    out.push({ code, version })
  }
  return out
}

/** POST /api/icd/titles — batch lookup for lists/widgets. */
icdTitleRouter.post('/titles', async (req: Request, res: Response) => {
  try {
    const body = req.body as { items?: unknown; language?: string }
    const items = parseBatchItems(body.items)
    const language = typeof body.language === 'string' ? body.language : 'de'

    if (items.length === 0) {
      res.json({ titles: [] })
      return
    }

    const titles = await resolveIcdDisplayTitles(items, language)
    res.json({ titles })
  } catch (error) {
    console.error('[icd/titles] batch lookup failed', error)
    res.status(500).json({ error: 'ICD title batch lookup failed' })
  }
})
