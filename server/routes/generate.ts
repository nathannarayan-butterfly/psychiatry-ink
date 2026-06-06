import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AiModelTier } from '../modelTierMapping'
import { callLlm } from '../services/llmProvider'

export interface GenerateRequestBody {
  tier: AiModelTier
  systemPrompt: string
  userPrompt: string
}

export const generateRouter: Router = createRouter()

generateRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as GenerateRequestBody

    if (!body.tier || !body.systemPrompt || !body.userPrompt) {
      res.status(400).json({ error: 'Missing tier, systemPrompt, or userPrompt' })
      return
    }

    const result = await callLlm({
      tier: body.tier,
      systemPrompt: body.systemPrompt,
      userPrompt: body.userPrompt,
    })

    res.json({
      text: result.text,
      model: result.model,
    })
  } catch (error) {
    console.error('[generate] failed:', error)
    const message = error instanceof Error ? error.message : 'Generation failed'
    res.status(500).json({ error: message })
  }
})
