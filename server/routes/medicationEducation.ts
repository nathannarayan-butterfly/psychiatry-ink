import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { z } from 'zod'
import { resolveAccountId } from '../middleware/auth'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
import { InsufficientCreditsError } from '../ai/runAiFeature'
import { SafeLlmEgressError } from '../services/safeLlmEgress'
import { isClinicalIntelligenceDebugMode } from '../utils/featureFlags'
import { generateMedicationEducationSection } from '../services/medicationEducation/generateSection'

export const medicationEducationRouter: Router = createRouter()

const EvidenceSchema = z.object({
  builtAt: z.string(),
  isDeidentified: z.literal(true),
  scope: z.enum(['single', 'selected', 'full_combination']),
  documentVariant: z.enum([
    'generic_kb_single',
    'patient_single',
    'patient_combination',
    'short_patient_info',
    'detailed_patient_education',
  ]),
  detailStyle: z.enum(['einfach', 'standard', 'ausfuehrlich']),
  language: z.enum(['de', 'en']),
  ageBand: z.string().optional(),
  sexAtBirth: z.string().optional(),
  medications: z.array(
    z.object({
      substanceName: z.string(),
      brandName: z.string().optional(),
      doseDescription: z.string(),
      route: z.string(),
      frequency: z.string(),
      timing: z.string(),
      startDescription: z.string(),
      titrationNote: z.string().optional(),
      prn: z.boolean(),
      depot: z.boolean(),
      indication: z.string(),
      patientReportedSideEffects: z.array(z.string()),
      adherenceNote: z.string(),
      allergies: z.array(z.string()),
    }),
  ),
  diagnoses: z.array(z.string()),
  monitoring: z.array(z.string()),
  kbSummaries: z.array(
    z.object({
      substanceName: z.string(),
      mechanismSimple: z.string(),
      commonSideEffects: z.string(),
      seriousWarnings: z.string(),
      monitoringRequirements: z.string(),
      interactions: z.string(),
      pregnancyLactation: z.string(),
      missedDose: z.string(),
      drivingWork: z.string(),
      approvalStatus: z.enum(['draft', 'ai_draft', 'clinician_reviewed', 'approved', 'deprecated']),
    }),
  ),
  combinationRisks: z.array(
    z.object({
      substances: z.string(),
      severity: z.string(),
      mainRisk: z.string(),
      monitoring: z.string().optional(),
      clinicalManagement: z.string().optional(),
      source: z.enum(['knowledge_base', 'ai_suggestion', 'clinician_accepted']),
    }),
  ),
  missingOrUncertain: z.array(z.string()),
  summaryText: z.string(),
  requiresCombinationSynthesis: z.boolean(),
})

const GenerateBodySchema = z.object({
  caseId: z.string().optional(),
  scope: z.enum(['single', 'selected', 'full_combination']),
  documentVariant: EvidenceSchema.shape.documentVariant,
  sectionId: z.string().min(1),
  mode: z.enum(['standard', 'gruendlich']),
  detailStyle: z.enum(['einfach', 'standard', 'ausfuehrlich']),
  evidence: EvidenceSchema,
  language: z.enum(['de', 'en']).default('de'),
  patientHints: z
    .object({
      patientName: z.string().optional(),
      patientDob: z.string().optional(),
    })
    .optional(),
})

medicationEducationRouter.post('/generate-section', async (req: Request, res: Response) => {
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

  const featureKey =
    body.scope === 'single' ? 'medication_education_single_section' : 'medication_education_combination_section'

  try {
    const usageContext = userId
      ? await resolveUsageContextFromRequest(req, userId, { featureKey })
      : undefined

    const result = await generateMedicationEducationSection({
      sectionId: body.sectionId,
      scope: body.scope,
      documentVariant: body.documentVariant,
      mode: body.mode,
      detailStyle: body.detailStyle,
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
    console.error('[medication-education] generate-section failed', error)
    res.status(500).json({ error: 'Medication education generation failed' })
  }
})
