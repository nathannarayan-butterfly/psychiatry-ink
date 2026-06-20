import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AiModelTier } from '../modelTierMapping'
import { resolveAccountId } from '../middleware/auth'
import { callLlm, llmResultModel } from '../services/llmProvider'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import type { AiFeatureKey } from '../../src/types/aiUsage'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'

export interface GenerateRequestBody {
  tier: AiModelTier
  systemPrompt: string
  userPrompt: string
  caseId?: string
  featureKey?: AiFeatureKey
}

export const generateRouter: Router = createRouter()

/** Upper bound on prompt size to limit abuse / runaway cost. */
const MAX_PROMPT_CHARS = 100_000

generateRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as GenerateRequestBody

    if (!body.tier || !body.systemPrompt || !body.userPrompt) {
      res.status(400).json({ error: 'Missing tier, systemPrompt, or userPrompt' })
      return
    }

    if (!['fast', 'standard', 'thorough'].includes(body.tier)) {
      res.status(400).json({ error: 'Invalid tier' })
      return
    }

    if (
      typeof body.systemPrompt !== 'string' ||
      typeof body.userPrompt !== 'string' ||
      body.systemPrompt.length > MAX_PROMPT_CHARS ||
      body.userPrompt.length > MAX_PROMPT_CHARS
    ) {
      res.status(413).json({ error: 'Prompt too large' })
      return
    }

    if (!(await assertAiGenerationAllowed(req, res, body.caseId))) return

    const userId = resolveAccountId(req)
    const usageContext =
      userId && userId !== 'default'
        ? await resolveUsageContextFromRequest(req, userId, {
            caseId: typeof body.caseId === 'string' ? body.caseId.trim() || null : null,
            featureKey: body.featureKey ?? 'document_generation',
            metadata: { route: 'generate', tier: body.tier },
          })
        : undefined

    const result = await callLlm({
      tier: body.tier,
      systemPrompt: body.systemPrompt,
      userPrompt: body.userPrompt,
      usageContext,
    })

    if (userId && userId !== 'default') {
      void recordAiGenerationUsed(req, userId, {
        caseId: typeof body.caseId === 'string' ? body.caseId.trim() || null : null,
        metadata: { route: 'generate', tier: body.tier },
      })
    }

    res.json({
      text: result.text,
      model: llmResultModel(result),
    })
  } catch (error) {
    console.error('[generate] failed:', error)
    const message = error instanceof Error ? error.message : 'Generation failed'
    if (/network\/transport|ECONNREFUSED|fetch failed/i.test(message)) {
      res.status(502).json({
        error: 'KI-Anbieter nicht erreichbar. Prüfen Sie OPENAI_API_KEY / DEEPSEEK_API_KEY und starten Sie den API-Server neu.',
      })
      return
    }
    if (/LLM request failed|LLM returned empty/i.test(message)) {
      res.status(502).json({ error: message })
      return
    }
    res.status(500).json({ error: 'Generation failed' })
  }
})
