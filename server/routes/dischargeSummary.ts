import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { z } from 'zod'
import { resolveAccountId } from '../middleware/auth'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
import { InsufficientCreditsError } from '../ai/runAiFeature'
import { SafeLlmEgressError } from '../services/safeLlmEgress'
import { isClinicalIntelligenceDebugMode } from '../utils/featureFlags'
import { generateDischargeSummarySection } from '../services/dischargeSummary/generateSection'

export const dischargeSummaryRouter: Router = createRouter()

const EvidenceSchema = z.object({
  builtAt: z.string(),
  isDeidentified: z.literal(true),
  documentType: z.enum(['short_discharge_summary', 'full_psychiatric_discharge_summary']),
  region: z.enum(['UK', 'US', 'international']),
  hospitalCourseLength: z.enum(['compact', 'standard', 'detailed']),
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
  documentType: z.enum(['short_discharge_summary', 'full_psychiatric_discharge_summary']),
  region: z.enum(['UK', 'US', 'international']).default('international'),
  sectionId: z.string().min(1),
  mode: z.enum(['economic', 'standard', 'gruendlich']),
  hospitalCourseLength: z.enum(['compact', 'standard', 'detailed']).optional(),
  evidence: EvidenceSchema,
  patientHints: z
    .object({
      patientName: z.string().optional(),
      patientDob: z.string().optional(),
    })
    .optional(),
})

dischargeSummaryRouter.post('/generate-section', async (req: Request, res: Response) => {
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
      ? await resolveUsageContextFromRequest(req, userId, {
          featureKey: 'discharge_summary_section',
        })
      : undefined

    const result = await generateDischargeSummarySection({
      sectionId: body.sectionId,
      documentType: body.documentType,
      region: body.region,
      mode: body.mode,
      hospitalCourseLength: body.hospitalCourseLength ?? 'standard',
      evidence: body.evidence,
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
    console.error('[discharge-summary] generate-section failed', error)
    res.status(500).json({ error: 'Discharge summary generation failed' })
  }
})
