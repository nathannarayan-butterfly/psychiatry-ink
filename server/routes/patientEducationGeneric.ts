import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { z } from 'zod'
import { resolveAccountId } from '../middleware/auth'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import { InsufficientCreditsError } from '../ai/runAiFeature'
import { SafeLlmEgressError } from '../services/safeLlmEgress'
import { generatePatientEducationGenericSection } from '../services/patientEducationGeneric/generate'

export const patientEducationGenericRouter: Router = createRouter()

const GenerateBodySchema = z.object({
  subject: z.string().min(1).max(300),
  subjectKind: z.enum(['medikament', 'erkrankung', 'therapie', 'thema']),
  sectionId: z.string().min(1),
  sectionLabel: z.string().min(1),
  promptHint: z.string().min(1),
  audience: z.enum(['patient', 'angehoerige']),
  readingLevel: z.enum(['einfache_sprache', 'standard']),
  detailStyle: z.enum(['kurz', 'standard', 'ausfuehrlich']),
  additionalContext: z.string().max(2000).optional(),
  language: z.enum(['de', 'en']).default('de'),
  mode: z.enum(['standard', 'gruendlich']).default('standard'),
})

patientEducationGenericRouter.post('/generate-section', async (req: Request, res: Response) => {
  const parsed = GenerateBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    return
  }

  const body = parsed.data
  const userId = resolveAccountId(req)

  try {
    const usageContext = userId
      ? await resolveUsageContextFromRequest(req, userId, { featureKey: 'patient_education_generic' })
      : undefined

    const result = await generatePatientEducationGenericSection({
      subject: body.subject,
      subjectKind: body.subjectKind,
      sectionId: body.sectionId,
      sectionLabel: body.sectionLabel,
      promptHint: body.promptHint,
      audience: body.audience,
      readingLevel: body.readingLevel,
      detailStyle: body.detailStyle,
      additionalContext: body.additionalContext,
      language: body.language,
      mode: body.mode,
      usageContext,
    })

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
    console.error('[patient-education-generic] generate-section failed', error)
    res.status(500).json({ error: 'Patient education generation failed' })
  }
})
