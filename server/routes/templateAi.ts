import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { z } from 'zod'
import { resolveAccountId } from '../middleware/auth'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
import { InsufficientCreditsError } from '../ai/runAiFeature'
import { SafeLlmEgressError } from '../services/safeLlmEgress'
import {
  analyzeDocumentToTemplate,
  fillTemplateSection,
  generateTemplateDraft,
} from '../services/templateAi/generate'

export const templateAiRouter: Router = createRouter()

const GenerateSchema = z.object({
  description: z.string().min(1),
  category: z.string().min(1),
  language: z.enum(['de', 'en']).default('de'),
  mode: z.enum(['economic', 'standard', 'gruendlich']).optional(),
})

const AnalyzeDocumentSchema = z.object({
  text: z.string().min(1).max(400_000),
  filename: z.string().max(255).optional(),
  language: z.enum(['de', 'en']).default('de'),
  mode: z.enum(['economic', 'standard', 'gruendlich']).optional(),
})

const FillSchema = z.object({
  caseId: z.string().optional(),
  prompt: z.string().min(1),
  contextText: z.string().default(''),
  language: z.enum(['de', 'en']).default('de'),
  mode: z.enum(['economic', 'standard', 'gruendlich']).optional(),
  patientHints: z
    .object({ patientName: z.string().optional(), patientDob: z.string().optional() })
    .optional(),
})

templateAiRouter.post('/generate-template', async (req: Request, res: Response) => {
  const parsed = GenerateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    return
  }
  const userId = resolveAccountId(req)
  try {
    const usageContext = userId
      ? await resolveUsageContextFromRequest(req, userId, { featureKey: 'template_ai_generate' })
      : undefined
    const result = await generateTemplateDraft({ ...parsed.data, usageContext })
    res.json(result)
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      res.status(402).json({ error: error.message, code: 'insufficient_credits' })
      return
    }
    if (error instanceof SafeLlmEgressError) {
      res.status(400).json({ error: error.message, code: 'phi_blocked' })
      return
    }
    console.error('[templateAi] generate-template failed', error)
    res.status(500).json({ error: 'Template generation failed' })
  }
})

templateAiRouter.post('/analyze-document', async (req: Request, res: Response) => {
  const parsed = AnalyzeDocumentSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    return
  }
  const userId = resolveAccountId(req)
  try {
    const usageContext = userId
      ? await resolveUsageContextFromRequest(req, userId, { featureKey: 'template_from_document' })
      : undefined
    const result = await analyzeDocumentToTemplate({ ...parsed.data, usageContext })
    res.json(result)
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      res.status(402).json({ error: error.message, code: 'insufficient_credits' })
      return
    }
    if (error instanceof SafeLlmEgressError) {
      res.status(400).json({ error: error.message, code: 'phi_blocked' })
      return
    }
    console.error('[templateAi] analyze-document failed', error)
    res.status(500).json({ error: 'Document analysis failed' })
  }
})

templateAiRouter.post('/fill-section', async (req: Request, res: Response) => {
  const parsed = FillSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    return
  }
  const body = parsed.data
  const caseId = body.caseId?.trim()
  if (caseId) {
    if (!(await assertAiGenerationAllowed(req, res))) return
  }
  const userId = resolveAccountId(req)
  try {
    const usageContext = userId
      ? await resolveUsageContextFromRequest(req, userId, { featureKey: 'template_block_fill' })
      : undefined
    const result = await fillTemplateSection({
      prompt: body.prompt,
      contextText: body.contextText,
      language: body.language,
      mode: body.mode,
      patientHints: body.patientHints,
      usageContext,
      caseRef: caseId ? caseId.slice(0, 8) : null,
    })
    if (caseId && userId) {
      void recordAiGenerationUsed(req, userId, { caseId })
    }
    res.json(result)
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      res.status(402).json({ error: error.message, code: 'insufficient_credits' })
      return
    }
    if (error instanceof SafeLlmEgressError) {
      res.status(400).json({ error: error.message, code: 'phi_blocked' })
      return
    }
    console.error('[templateAi] fill-section failed', error)
    res.status(500).json({ error: 'Section generation failed' })
  }
})
