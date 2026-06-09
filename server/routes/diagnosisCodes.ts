import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { prisma } from '../db'

export const diagnosisCodesRouter: Router = createRouter()

export type DiagnosisCodeSystem = 'icd10' | 'icd11' | 'dsm5tr'

export interface DiagnosisSearchHit {
  system: DiagnosisCodeSystem
  code: string
  label: string
  icd10Code: string
  icd10Label: string
  icd11Code: string
  icd11Label: string
  dsmCode: string
  dsmLabel: string
}

function toHit(row: {
  system: string
  code: string
  labelDe: string
  icd10Code: string
  icd10Label: string
  icd11Code: string
  icd11Label: string
  dsmCode: string
  dsmLabel: string
}): DiagnosisSearchHit {
  return {
    system: row.system as DiagnosisCodeSystem,
    code: row.code,
    label: row.labelDe,
    icd10Code: row.icd10Code,
    icd10Label: row.icd10Label,
    icd11Code: row.icd11Code,
    icd11Label: row.icd11Label,
    dsmCode: row.dsmCode,
    dsmLabel: row.dsmLabel,
  }
}

function normalizeSystem(raw: string | undefined): DiagnosisCodeSystem {
  if (raw === 'icd11') return 'icd11'
  if (raw === 'dsm5tr' || raw === 'dsm') return 'dsm5tr'
  return 'icd10'
}

function mapClientSystem(system: DiagnosisCodeSystem): 'icd10' | 'icd11' | 'dsm' {
  if (system === 'dsm5tr') return 'dsm'
  return system
}

/** GET /api/diagnosis-codes/search?q=f20&system=icd10&limit=12 */
diagnosisCodesRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? '').trim().toLowerCase()
    const system = normalizeSystem(typeof req.query.system === 'string' ? req.query.system : undefined)
    const limitRaw = Number(req.query.limit ?? 12)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 30) : 12

    if (!q) {
      res.json({ results: [] })
      return
    }

    const rows = await prisma.diagnosisCode.findMany({
      where: {
        system,
        OR: [
          { searchText: { contains: q } },
          { code: { startsWith: q.toUpperCase() } },
        ],
      },
      take: limit,
      orderBy: [{ code: 'asc' }],
    })

    res.json({ results: rows.map(toHit) })
  } catch (error) {
    console.error('[diagnosis-codes] search failed', error)
    res.status(500).json({ error: 'Diagnosis search failed' })
  }
})

/** GET /api/diagnosis-codes/crosswalk?icd10=F20.0 */
diagnosisCodesRouter.get('/crosswalk', async (req: Request, res: Response) => {
  try {
    const icd10 = String(req.query.icd10 ?? '').trim().toUpperCase()
    if (!icd10) {
      res.status(400).json({ error: 'icd10 query parameter required' })
      return
    }

    const row = await prisma.diagnosisCode.findFirst({
      where: { system: 'icd10', code: icd10 },
    })

    if (!row) {
      res.json({ crosswalk: null })
      return
    }

    res.json({ crosswalk: toHit(row) })
  } catch (error) {
    console.error('[diagnosis-codes] crosswalk failed', error)
    res.status(500).json({ error: 'Crosswalk lookup failed' })
  }
})

/** GET /api/diagnosis-codes/stats — row counts per system (for admin/debug). */
diagnosisCodesRouter.get('/stats', async (_req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' })
    return
  }
  try {
    const counts = await prisma.diagnosisCode.groupBy({
      by: ['system'],
      _count: { code: true },
    })
    res.json({
      systems: counts.map((item) => ({ system: item.system, count: item._count.code })),
    })
  } catch (error) {
    res.status(500).json({ error: 'Stats failed' })
  }
})

export { mapClientSystem }
