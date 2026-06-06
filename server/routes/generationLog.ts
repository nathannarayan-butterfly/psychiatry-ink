import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { prisma } from '../db'
import type { AiModelTier } from '../modelTierMapping'
import { resolveModelForTier } from '../modelTierMapping'
import { canAfford, deductCredits } from '../services/credits'

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
    const body = req.body as CreateGenerationLogBody

    if (!body.documentType || !body.aiMode || body.inputTextLength == null) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    const estimatedCredits = body.estimatedCredits ?? 0
    if (!(await canAfford(estimatedCredits))) {
      res.status(402).json({ error: 'Insufficient credits' })
      return
    }

    const resolvedModel = body.tier ? resolveModelForTier(body.tier) : null

    const entry = await prisma.generationLog.create({
      data: {
        documentType: body.documentType,
        aiMode: body.aiMode,
        inputTextLength: body.inputTextLength,
        estimatedInputTokens: body.estimatedInputTokens ?? 0,
        estimatedCredits,
        provider: body.provider ?? resolvedModel?.provider,
        model: body.model ?? resolvedModel?.modelId,
        tool: body.tool,
        scope: body.scope,
        schemaId: body.schemaId,
        status: 'started',
      },
    })

    res.status(201).json({ id: entry.id })
  } catch (error) {
    console.error('[generation-log] create failed:', error)
    res.status(500).json({ error: 'Failed to create log' })
  }
})

generationLogRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = req.body as UpdateGenerationLogBody

    if (!body.status || (body.status !== 'completed' && body.status !== 'failed')) {
      res.status(400).json({ error: 'Invalid status' })
      return
    }

    const existing = await prisma.generationLog.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: 'Log not found' })
      return
    }

    let balance: number | undefined

    if (body.status === 'completed' && !existing.creditsDeducted) {
      balance = await deductCredits(existing.estimatedCredits)
    }

    const entry = await prisma.generationLog.update({
      where: { id },
      data: {
        status: body.status,
        errorMessage: body.status === 'failed' ? body.errorMessage ?? 'Unknown error' : null,
        resultTextLength: body.status === 'completed' ? body.resultTextLength : null,
        provider: body.provider ?? existing.provider,
        model: body.model ?? existing.model,
        completedAt: new Date(),
        creditsDeducted: body.status === 'completed' ? true : existing.creditsDeducted,
      },
    })

    res.json({ id: entry.id, status: entry.status, balance })
  } catch (error) {
    console.error('[generation-log] update failed:', error)
    res.status(500).json({ error: 'Failed to update log' })
  }
})
