import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AiModelTier } from '../modelTierMapping'
import { resolveAccountId } from '../middleware/auth'
import {
  SafeLlmEgressError,
  llmResultModel,
  sanitizeText,
} from '../services/safeLlmEgress'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
import { runAiFeature, InsufficientCreditsError } from '../ai/runAiFeature'

export interface PharmaAskRequestBody {
  medicationName: string
  sectionId?: string
  sectionData?: string
  question: string
  language?: 'de' | 'en' | 'fr' | 'es'
  tier?: AiModelTier
  caseId?: string
  /** Optional hints — server-side egress guard scrubs name/DOB if present. */
  patientHints?: { patientName?: string; patientDob?: string }
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

    // Pharma-Ask is a generic pharmacology surface — patient context should
    // never appear in the prompt. We re-scrub every prompt-bound field server
    // side, regardless of what the client claims, and strip patient-context
    // keys from any structured payload field.
    const patientHints =
      body.patientHints && typeof body.patientHints === 'object'
        ? {
            patientName:
              typeof body.patientHints.patientName === 'string'
                ? body.patientHints.patientName
                : undefined,
            patientDob:
              typeof body.patientHints.patientDob === 'string'
                ? body.patientHints.patientDob
                : undefined,
          }
        : undefined
    let scrubbedMedicationName: string
    let scrubbedQuestion: string
    let scrubbedSectionData: string
    try {
      scrubbedMedicationName = sanitizeText(medicationName, { patientHints })
      scrubbedQuestion = sanitizeText(question, { patientHints })
      scrubbedSectionData = sectionData ? sanitizeText(sectionData, { patientHints }) : ''
    } catch (guardError) {
      if (guardError instanceof SafeLlmEgressError) {
        console.error('[pharma-ask] PHI guard blocked request:', guardError.message)
        res.status(422).json({
          error:
            'PHI guard could not sanitize prompt; refusing to forward to LLM provider.',
        })
        return
      }
      throw guardError
    }

    const systemPrompt = [
      'You are a clinical pharmacology assistant helping psychiatrists study medication monographs.',
      'Answer concisely and accurately based on the provided section context.',
      'This route MUST NOT receive patient context — treat any patient-specific identifiers as a sanitization error and ignore them.',
      'If the context is insufficient, say so and give general guidance without inventing precise numbers.',
      `Respond in ${languageName}.`,
    ].join(' ')

    const userPrompt = [
      `Medication: ${scrubbedMedicationName}`,
      sectionId ? `Section: ${sectionId}` : '',
      scrubbedSectionData ? `Section content:\n${scrubbedSectionData}` : 'Section content: (not provided)',
      '',
      `Question: ${scrubbedQuestion}`,
    ]
      .filter(Boolean)
      .join('\n')

    const userId = resolveAccountId(req)
    const usageContext =
      userId && userId !== 'default'
        ? await resolveUsageContextFromRequest(req, userId, {
            caseId: typeof body.caseId === 'string' ? body.caseId.trim() || null : null,
            featureKey: 'pharma_ask',
            metadata: { route: 'pharma-ask', tier, medicationName: scrubbedMedicationName },
          })
        : undefined

    let result
    try {
      result = await runAiFeature({
        featureKey: 'pharma_ask',
        tier,
        systemPrompt,
        userPrompt,
        usageContext,
        sanitizeOpts: { stripPatientContext: true },
      })
    } catch (guardError) {
      if (guardError instanceof InsufficientCreditsError) {
        res.status(402).json({ error: guardError.message })
        return
      }
      if (guardError instanceof SafeLlmEgressError) {
        console.error('[pharma-ask] PHI guard blocked outbound prompt:', guardError.message)
        res.status(422).json({
          error:
            'PHI guard could not sanitize prompt; refusing to forward to LLM provider.',
        })
        return
      }
      throw guardError
    }

    if (userId && userId !== 'default') {
      void recordAiGenerationUsed(req, userId, {
        caseId: typeof body.caseId === 'string' ? body.caseId.trim() || null : null,
        metadata: { route: 'pharma-ask', tier, medicationName: scrubbedMedicationName },
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
