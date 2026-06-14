import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AiModelTier } from '../modelTierMapping'
import { resolveAccountId } from '../middleware/auth'
import { callLlm, llmResultModel } from '../services/llmProvider'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'

export interface PharmaAskRequestBody {
  medicationName: string
  sectionId?: string
  sectionData?: string
  question: string
  language?: 'de' | 'en' | 'fr' | 'es'
  tier?: AiModelTier
  caseId?: string
}

export interface PharmaAskResponseBody {
  answer: string
  model: { provider: string; modelId: string; label: string }
}

export const pharmaAskRouter: Router = createRouter()

const MAX_CHARS = 8000
const VALID_TIERS: AiModelTier[] = ['fast', 'standard', 'thorough']

function resolveLanguageName(lang: string | undefined): string {
  switch (lang) {
    case 'en':
      return 'English'
    case 'fr':
      return 'French'
    case 'es':
      return 'Spanish'
    default:
      return 'German'
  }
}

pharmaAskRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as PharmaAskRequestBody

    const medicationName = typeof body.medicationName === 'string' ? body.medicationName.trim() : ''
    const question = typeof body.question === 'string' ? body.question.trim() : ''
    if (!medicationName || !question) {
      res.status(400).json({ error: 'Missing medicationName or question' })
      return
    }
    if (medicationName.length > 400 || question.length > MAX_CHARS) {
      res.status(413).json({ error: 'Input too large' })
      return
    }

    const sectionData =
      typeof body.sectionData === 'string' ? body.sectionData.trim().slice(0, MAX_CHARS) : ''
    const sectionId = typeof body.sectionId === 'string' ? body.sectionId.trim().slice(0, 120) : ''
    const tier: AiModelTier = VALID_TIERS.includes(body.tier as AiModelTier)
      ? (body.tier as AiModelTier)
      : 'standard'
    const languageName = resolveLanguageName(body.language)

    if (!(await assertAiGenerationAllowed(req, res, body.caseId))) return

    const systemPrompt = [
      'You are a clinical pharmacology assistant helping psychiatrists study medication monographs.',
      'Answer concisely and accurately based on the provided section context.',
      'If the context is insufficient, say so and give general guidance without inventing precise numbers.',
      `Respond in ${languageName}.`,
    ].join(' ')

    const userPrompt = [
      `Medication: ${medicationName}`,
      sectionId ? `Section: ${sectionId}` : '',
      sectionData ? `Section content:\n${sectionData}` : 'Section content: (not provided)',
      '',
      `Question: ${question}`,
    ]
      .filter(Boolean)
      .join('\n')

    const userId = resolveAccountId(req)
    const usageContext =
      userId && userId !== 'default'
        ? await resolveUsageContextFromRequest(req, userId, {
            caseId: typeof body.caseId === 'string' ? body.caseId.trim() || null : null,
            featureKey: 'pharma_ask',
            metadata: { route: 'pharma-ask', tier, medicationName },
          })
        : undefined

    const result = await callLlm({ tier, systemPrompt, userPrompt, usageContext })

    if (userId && userId !== 'default') {
      void recordAiGenerationUsed(req, userId, {
        caseId: typeof body.caseId === 'string' ? body.caseId.trim() || null : null,
        metadata: { route: 'pharma-ask', tier, medicationName },
      })
    }

    const responseBody: PharmaAskResponseBody = {
      answer: result.text.trim(),
      model: llmResultModel(result),
    }
    res.json(responseBody)
  } catch (error) {
    console.error('[pharma-ask] failed:', error)
    res.status(500).json({ error: 'Ask failed' })
  }
})
