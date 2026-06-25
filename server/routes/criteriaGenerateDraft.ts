import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import {
  findTargetByCode,
  findTargetByDisorderId,
} from '../../scripts/lib/criteriaDraftGaps.ts'
import { generateCriteriaDraftForTarget } from '../services/criteriaDraftGenerate.ts'

export const criteriaGenerateDraftRouter: Router = createRouter()

/** Dev/admin-only criteria draft generation (single disorder). */
export function criteriaDraftApiEnabled(): boolean {
  if (process.env.CRITERIA_DRAFT_API_ENABLED === 'false') return false
  if (process.env.NODE_ENV === 'production') return false
  return (
    process.env.CRITERIA_DRAFT_API_ENABLED === 'true' || process.env.NODE_ENV !== 'production'
  )
}

criteriaGenerateDraftRouter.post('/generate-draft', async (req: Request, res: Response) => {
  if (!criteriaDraftApiEnabled()) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const disorderId = typeof body.disorderId === 'string' ? body.disorderId.trim() : ''
  const code = typeof body.code === 'string' ? body.code.trim() : ''
  const system =
    typeof body.system === 'string' && body.system.toUpperCase() === 'ICD10GM'
      ? 'ICD10GM'
      : 'ICD11MMS'
  const dryRun = body.dryRun === true

  let target =
    (disorderId ? findTargetByDisorderId(disorderId) : undefined) ??
    (code ? findTargetByCode(code, system) : undefined)

  if (!target) {
    res.status(404).json({
      error: 'No draft target found for the given disorderId or code',
      disorderId: disorderId || undefined,
      code: code || undefined,
      system,
    })
    return
  }

  try {
    const result = await generateCriteriaDraftForTarget(target, {
      dryRun,
      writeOutput: !dryRun,
    })
    res.status(result.ok ? 200 : 422).json({
      ok: result.ok,
      target: {
        key: result.target.key,
        mode: result.target.mode,
        disorderId: result.target.disorderId,
        icd11Code: result.target.icd11Code,
        title: result.target.title,
        reason: result.target.reason,
      },
      draft: result.draft,
      issues: result.issues,
      outputPath: result.outputPath,
      model: result.model,
      provider: result.provider,
      latencyMs: result.latencyMs,
    })
  } catch (error) {
    console.error('[criteria] generate-draft failed', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Criteria draft generation failed',
    })
  }
})

criteriaGenerateDraftRouter.get('/gaps', async (_req: Request, res: Response) => {
  if (!criteriaDraftApiEnabled()) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  try {
    const { summarizeCriteriaGaps } = await import('../../scripts/lib/criteriaDraftGaps.ts')
    const gaps = await summarizeCriteriaGaps()
    res.json(gaps)
  } catch (error) {
    console.error('[criteria] gaps failed', error)
    res.status(500).json({ error: 'Gap report failed' })
  }
})
