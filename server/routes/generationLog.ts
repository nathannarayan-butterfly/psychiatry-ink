import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AiModelTier } from '../modelTierMapping'
import { resolveModelForTier } from '../modelTierMapping'
import { getCreditBalance, refundCredits, reserveCredits } from '../services/credits'
import {
  createGenerationLog,
  findGenerationLogById,
  updateGenerationLog,
} from '../services/generationLogStore'
import { getCurrentOrganisation, ORG_HEADER } from '../services/orgPermissions'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { pathParam } from '../utils/expressParams'

export type GenerationLogStatus = 'started' | 'completed' | 'failed'

export interface CreateGenerationLogBody {
  documentType: string
  aiMode: string
  inputTextLength: number
  estimatedInputTokens: number
  estimatedCredits: number
  tier?: AiModelTier
  provider?: string
  model?: string
  tool?: string
  scope?: string
  schemaId?: string
}

export interface UpdateGenerationLogBody {
  status: 'completed' | 'failed'
  errorMessage?: string
  resultTextLength?: number
  provider?: string
  model?: string
}

export const generationLogRouter: Router = createRouter()

generationLogRouter.post('/', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const body = req.body as CreateGenerationLogBody

    if (!body.documentType || !body.aiMode || body.inputTextLength == null) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    const estimatedCredits = body.estimatedCredits ?? 0

    // Reserve credits ATOMICALLY up front. A conditional decrement closes the
    // check-then-deduct race that previously let concurrent generations both
    // pass `canAfford` and overspend. Credits are refunded on failure (PATCH).
    const reservation = await reserveCredits(estimatedCredits, userId)
    if (!reservation.ok) {
      res.status(402).json({ error: 'Insufficient credits' })
      return
    }

    const org = await getCurrentOrganisation(userId, req.headers[ORG_HEADER])
    const resolvedModel = body.tier ? resolveModelForTier(body.tier) : null

    const entry = await createGenerationLog({
      userId,
      organisationId: org?.id ?? null,
      documentType: body.documentType,
      aiMode: body.aiMode,
      inputTextLength: body.inputTextLength,
      estimatedInputTokens: body.estimatedInputTokens ?? 0,
      estimatedCredits,
      provider: body.provider ?? resolvedModel?.provider ?? null,
      model: body.model ?? resolvedModel?.modelId ?? null,
      tool: body.tool ?? null,
      scope: body.scope ?? null,
      schemaId: body.schemaId ?? null,
      status: 'started',
      creditsDeducted: estimatedCredits > 0,
    })

    res.status(201).json({ id: entry.id, balance: reservation.balance })
  } catch (error) {
    console.error('[generation-log] create failed:', error)
    res.status(500).json({ error: 'Failed to create log' })
  }
})

generationLogRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = requireRouteAuth(req, res)
    if (!userId) return

    const id = pathParam(req, 'id')
    const body = req.body as UpdateGenerationLogBody

    if (!body.status || (body.status !== 'completed' && body.status !== 'failed')) {
      res.status(400).json({ error: 'Invalid status' })
      return
    }

    const existing = await findGenerationLogById(id)
    if (!existing) {
      res.status(404).json({ error: 'Log not found' })
      return
    }

    // Ownership: a log can only be finalised by the account that created it, so
    // one user can never deduct/refund credits against another user's log.
    if (existing.userId && existing.userId !== userId) {
      res.status(403).json({ error: 'Zugriff verweigert' })
      return
    }

    let balance: number | undefined

    // Credits were reserved at creation; release them back if the generation
    // ultimately failed so callers are only charged for successful work.
    if (body.status === 'failed' && existing.creditsDeducted) {
      balance = await refundCredits(existing.estimatedCredits, existing.userId ?? userId)
    } else {
      balance = await getCreditBalance(existing.userId ?? userId)
    }

    const entry = await updateGenerationLog(id, {
      status: body.status,
      errorMessage: body.status === 'failed' ? body.errorMessage ?? 'Unknown error' : null,
      resultTextLength: body.status === 'completed' ? body.resultTextLength ?? null : null,
      provider: body.provider ?? existing.provider,
      model: body.model ?? existing.model,
      completedAt: new Date().toISOString(),
      creditsDeducted: body.status === 'failed' ? false : existing.creditsDeducted,
    })

    res.json({ id: entry.id, status: entry.status, balance })
  } catch (error) {
    console.error('[generation-log] update failed:', error)
    res.status(500).json({ error: 'Failed to update log' })
  }
})
