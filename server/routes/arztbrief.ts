import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { z } from 'zod'
import { resolveAccountId } from '../middleware/auth'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
import { InsufficientCreditsError } from '../ai/runAiFeature'
import { SafeLlmEgressError } from '../services/safeLlmEgress'
import { isClinicalIntelligenceDebugMode } from '../utils/featureFlags'
import { generateArztbriefSection } from '../services/arztbrief/generateSection'

export const arztbriefRouter: Router = createRouter()

const EvidenceSchema = z.object({
  builtAt: z.string(),
  isDeidentified: z.literal(true),
  documentType: z.enum(['kurzbrief', 'langbrief']),
  therapieVerlaufLength: z.enum(['compact', 'standard', 'detailed']),
  keyEvents: z.array(z.string()),
  diagnoses: z.array(z.string()),
  symptoms: z.array(z.string()),
  medicationCourse: z.array(z.string()),
  sideEffects: z.array(z.string()),
  therapy: z.array(z.string()),
  incidents: z.array(z.string()),
  risk: z.array(z.string()),
  diagnostics: z.array(z.string()),
  dischargeStatus: z.array(z.string()),
  missingOrUncertain: z.array(z.string()),
  summaryText: z.string(),
})

const GenerateBodySchema = z.object({
  caseId: z.string().optional(),
  documentType: z.enum(['kurzbrief', 'langbrief']),
  sectionId: z.string().min(1),
  mode: z.enum(['economic', 'standard', 'gruendlich']),
  therapieVerlaufLength: z.enum(['compact', 'standard', 'detailed']).optional(),
  evidence: EvidenceSchema,
  language: z.enum(['de', 'en']).default('de'),
  patientHints: z
    .object({
      patientName: z.string().optional(),
      patientDob: z.string().optional(),
    })
    .optional(),
})

arztbriefRouter.post('/generate-section', async (req: Request, res: Response) => {
  const parsed = GenerateBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    return
  }

  const body = parsed.data
  const caseId = body.caseId?.trim()

  if (caseId) {
    if (!(await assertAiGenerationAllowed(req, res))) return
  }

  const debug = isClinicalIntelligenceDebugMode()
  const userId = resolveAccountId(req)

  try {
    const usageContext = userId
      ? await resolveUsageContextFromRequest(req, userId, { featureKey: 'arztbrief_section' })
      : undefined

    const result = await generateArztbriefSection({
      sectionId: body.sectionId,
      documentType: body.documentType,
      mode: body.mode,
      therapieVerlaufLength: body.therapieVerlaufLength ?? 'standard',
      evidence: body.evidence,
      language: body.language,
      usageContext,
      caseRef: caseId ? caseId.slice(0, 8) : null,
      patientHints: body.patientHints,
      debug,
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
    console.error('[arztbrief] generate-section failed', error)
    res.status(500).json({ error: 'Arztbrief generation failed' })
  }
})
