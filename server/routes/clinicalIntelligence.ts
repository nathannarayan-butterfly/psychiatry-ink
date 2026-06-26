/**
 * Clinical Intelligence V1 route.
 *
 * Accepts ONLY de-identified compact evidence payloads. The route is gated by
 * the CLINICAL_INTELLIGENCE_V1_ENABLED server feature flag; when disabled, it
 * returns 404 so the client can hide the section cleanly.
 *
 * Defensive guards on the inbound body:
 *   - reject raw document shapes (workspace vault, identified package)
 *   - reject any payload not flagged isDeidentified: true
 *   - re-apply server-side de-identification before any LLM call
 */

import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import {
  isClinicalIntelligenceDebugMode,
  isClinicalIntelligenceV1Enabled,
} from '../utils/featureFlags'
import {
  ClinicalIntelligenceRunRequestSchema,
  ClinicalIntelligenceRunResponseSchema,
  ClinicalIntelligenceDiscussRequestSchema,
  type ClinicalIntelligenceDiscussContext,
} from '../../src/types/clinicalIntelligence'
import { runClinicalIntelligenceServer } from '../services/clinicalIntelligence/run'
import { resolveAccountId } from '../middleware/auth'
import {
  SafeLlmEgressError,
  llmResultModel,
  sanitizeLlmPayload,
  sanitizeText,
} from '../services/safeLlmEgress'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
import { runAiFeature, InsufficientCreditsError } from '../ai/runAiFeature'
import {
  clinicalLanguagePromptInstruction,
  requireClinicalLanguage,
  resolveLanguageName,
} from '../utils/resolveClinicalLanguage'

export const clinicalIntelligenceRouter: Router = createRouter()

const RAW_DOC_FIELDS = [
  'documents',
  'documentTypeId',
  'editorContent',
  'sectionContents',
  'patientMetadata',
  'identifiedPackageContent',
  'medicationPlanState',
  'pageHeading',
]

const FLAG_OFF_MESSAGE =
  'Clinical Intelligence deaktiviert — CLINICAL_INTELLIGENCE_V1_ENABLED auf API-Server setzen und neu starten'

clinicalIntelligenceRouter.post('/run', async (req: Request, res: Response) => {
  if (!isClinicalIntelligenceV1Enabled()) {
    res.status(404).json({ error: FLAG_OFF_MESSAGE })
    return
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const evidence = body.evidence as Record<string, unknown> | undefined

  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    res.status(400).json({ error: 'Missing or invalid evidence payload' })
    return
  }

  // Hard rule: refuse anything that looks like a raw clinical document.
  for (const forbidden of RAW_DOC_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(evidence, forbidden)) {
      res.status(400).json({
        error: `Clinical Intelligence refuses raw document shape (forbidden field "${forbidden}")`,
      })
      return
    }
  }

  if (evidence.isDeidentified !== true) {
    res.status(400).json({
      error: 'Clinical Intelligence requires isDeidentified:true compact evidence payload',
    })
    return
  }

  const parsed = ClinicalIntelligenceRunRequestSchema.safeParse(body)
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid Clinical Intelligence request',
      details: parsed.error.flatten(),
    })
    return
  }

  try {
    const response = await runClinicalIntelligenceServer({
      language: parsed.data.language,
      evidence: parsed.data.evidence,
      rejectedDimensionIds: parsed.data.rejectedDimensionIds,
      rejectedMechanismIds: parsed.data.rejectedMechanismIds,
      layers: parsed.data.layers,
      dimensionalCall: parsed.data.dimensionalCall,
      mechanismCall: parsed.data.mechanismCall,
    })

    const validated = ClinicalIntelligenceRunResponseSchema.safeParse(response)
    if (!validated.success) {
      const flattened = validated.error.flatten()
      console.error(
        '[clinical-intelligence] response failed validation',
        JSON.stringify(flattened),
      )
      const body: Record<string, unknown> = {
        error: 'Clinical Intelligence response failed validation',
      }
      // Surface zod issue tree + raw diagnostics in debug mode so the dev
      // panel can show why validation failed instead of a generic message.
      if (isClinicalIntelligenceDebugMode()) {
        body.details = flattened
        body.diagnostics = response.diagnostics ?? null
      }
      res.status(500).json(body)
      return
    }
    res.json(validated.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[clinical-intelligence] run failed:', message)
    res.status(500).json({ error: `Clinical Intelligence run failed: ${message.slice(0, 280)}` })
  }
})

function isLlmMockMode(): boolean {
  return (
    !process.env.OPENAI_API_KEY?.trim() &&
    !process.env.DEEPSEEK_API_KEY?.trim() &&
    !process.env.GOOGLE_API_KEY?.trim()
  )
}

function assertDiscussContextCompact(context: ClinicalIntelligenceDiscussContext): void {
  for (const forbidden of RAW_DOC_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(context as unknown as Record<string, unknown>, forbidden)) {
      throw new Error(`Discuss context must not include forbidden field "${forbidden}"`)
    }
  }
  const json = JSON.stringify(context)
  if (json.includes('"text"')) {
    throw new Error('Discuss context must use evidence summaries, not raw text fields')
  }
}

function buildDiscussSystemPrompt(
  language: 'de' | 'en' | 'fr' | 'es',
  context: ClinicalIntelligenceDiscussContext,
): string {
  const languageName = resolveLanguageName(language)
  return [
    'You are a clinical reasoning assistant for psychiatrists reviewing AI-generated Clinical Intelligence hypotheses.',
    'You discuss dimensional profiles and mechanism hypotheses — you do NOT diagnose and you do NOT invent patient facts.',
    'When referencing evidence, cite evidence item IDs from the provided compact context (e.g. [anam-1]).',
    'Treat all findings as working hypotheses requiring clinician verification.',
    clinicalLanguagePromptInstruction(language),
    `Respond in ${languageName}.`,
    '',
    'Compact Clinical Intelligence context (de-identified):',
    JSON.stringify(context, null, 2),
  ].join('\n')
}

function buildDiscussUserPrompt(
  messages: { role: 'user' | 'assistant'; content: string }[],
): string {
  const lines = messages.map((message) => {
    const label = message.role === 'user' ? 'Clinician' : 'Assistant'
    return `${label}: ${message.content}`
  })
  return ['Conversation:', ...lines, '', 'Reply to the latest clinician message.'].join('\n')
}

clinicalIntelligenceRouter.post('/discuss', async (req: Request, res: Response) => {
  if (!isClinicalIntelligenceV1Enabled()) {
    res.status(404).json({ error: FLAG_OFF_MESSAGE })
    return
  }

  const parsed = ClinicalIntelligenceDiscussRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid Clinical Intelligence discuss request',
      details: parsed.error.flatten(),
    })
    return
  }

  const body = parsed.data
  if (body.messages[body.messages.length - 1]?.role !== 'user') {
    res.status(400).json({ error: 'Last message must be from user' })
    return
  }

  for (const forbidden of RAW_DOC_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body.context as unknown as Record<string, unknown>, forbidden)) {
      res.status(400).json({
        error: `Discuss context refuses raw document shape (forbidden field "${forbidden}")`,
      })
      return
    }
  }

  try {
    assertDiscussContextCompact(body.context)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    res.status(400).json({ error: message })
    return
  }

  if (!(await assertAiGenerationAllowed(req, res))) return

  const language = requireClinicalLanguage(req, res, body.language ?? body.context.language)
  if (!language) return

  try {
    // Pin Clinical Intelligence discussion to the OpenAI "thorough" tier
    // (`MODEL_TIER_SPECS.thorough` → OpenAI `gpt-4.1`), mirroring the
    // dimensional/mechanism layers. Any client-supplied tier/model is
    // intentionally ignored so CI never silently downgrades to DeepSeek.
    const tier = 'thorough' as const

    // Egress PHI guard — re-scrub the compact-evidence package and every
    // discussion message server-side. The schema only permits short summaries
    // and short clinician comments, but any of those can still leak names /
    // dates / contact details if the client missed them.
    const patientHints = body.patientHints
      ? {
          patientName: body.patientHints.patientName,
          patientDob: body.patientHints.patientDob,
        }
      : undefined
    let scrubbedContext: typeof body.context
    let scrubbedMessages: typeof body.messages
    try {
      scrubbedContext = sanitizeLlmPayload(body.context, { patientHints })
      scrubbedMessages = body.messages.map((message) => ({
        role: message.role,
        content: sanitizeText(message.content, { patientHints }),
      }))
    } catch (guardError) {
      if (guardError instanceof SafeLlmEgressError) {
        console.error('[clinical-intelligence] discuss PHI guard blocked request:', guardError.message)
        res.status(422).json({
          error:
            'PHI guard could not sanitize discuss payload; refusing to forward to LLM provider.',
        })
        return
      }
      throw guardError
    }

    const systemPrompt = buildDiscussSystemPrompt(language, scrubbedContext)
    const userPrompt = buildDiscussUserPrompt(scrubbedMessages)

    const userId = resolveAccountId(req)
    const usageContext =
      userId && userId !== 'default'
        ? await resolveUsageContextFromRequest(req, userId, {
            caseId: body.context.caseId,
            featureKey: 'clinical_intelligence_discuss',
            metadata: {
              route: 'clinical-intelligence-discuss',
              tier,
              messageCount: body.messages.length,
            },
          })
        : undefined

    let result
    try {
      result = await runAiFeature({
        featureKey: 'clinical_intelligence_discuss',
        tier,
        systemPrompt,
        userPrompt,
        usageContext,
      })
    } catch (guardError) {
      if (guardError instanceof InsufficientCreditsError) {
        res.status(402).json({ error: (guardError as Error).message })
        return
      }
      if (guardError instanceof SafeLlmEgressError) {
        console.error('[clinical-intelligence] discuss outbound prompt blocked:', guardError.message)
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
        caseId: body.context.caseId,
        metadata: {
          route: 'clinical-intelligence-discuss',
          tier,
          messageCount: body.messages.length,
        },
      })
    }

    res.json({
      answer: result.text.trim(),
      model: llmResultModel(result),
      ...(isLlmMockMode() ? { mock: true } : {}),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[clinical-intelligence] discuss failed:', message)
    res.status(500).json({ error: `Clinical Intelligence discuss failed: ${message.slice(0, 280)}` })
  }
})
