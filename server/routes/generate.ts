import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import type { AiModelTier } from '../modelTierMapping'
import { parseLlmModelRequest } from '../ai/parseLlmModelRequest'
import { resolveAccountId } from '../middleware/auth'
import {
  SafeLlmEgressError,
  llmResultModel,
} from '../services/safeLlmEgress'
import { resolveUsageContextFromRequest } from '../ai/usage/resolveUsageContext'
import type { AiFeatureKey } from '../../src/types/aiUsage'
import { assertAiGenerationAllowed, recordAiGenerationUsed } from '../utils/caseAiAccessGuard'
import { deidentifyText } from '../services/discussCaseDeidentify'
import { runAiFeature, InsufficientCreditsError } from '../ai/runAiFeature'
import { parseMode } from '../ai/aiRouter'
import { resolveMaximumModelSpec } from '../modelTierMapping'

export interface GenerateRequestBody {
  tier: AiModelTier
  mode?: string
  model?: { provider: string; modelId: string }
  systemPrompt: string
  userPrompt: string
  caseId?: string
  featureKey?: AiFeatureKey
  /**
   * Clinician-initiated "Maximum" opt-in. When true, this single generation runs
   * the top model (gpt-5.5, env `OPENAI_MAXIMUM_MODEL`) as an explicit model
   * override and is billed at the gründlich (4×) multiplier — regardless of the
   * `tier`/`mode`/`model` the client otherwise sent. Never auto-enabled; it is
   * only set when the user explicitly toggles Maximum in the UI.
   */
  maximum?: boolean
  /**
   * Optional patient identifier hints used by the server-side PHI guard. The
   * server NEVER trusts the client to have de-identified the prompt — these
   * hints are used to scrub names from the prompt before forwarding to the LLM
   * provider. Dates, case codes, phone numbers and email are scrubbed
   * unconditionally regardless of whether hints are provided.
   */
  patientHints?: {
    patientName?: string
    patientDob?: string
  }
}

/**
 * Direct, demographic identifiers that must NEVER reach the LLM provider in
 * plaintext. Patterns are intentionally conservative — false positives are
 * preferable to PHI leakage.
 */
const DEMO_OR_UUID_RE = /\bDEMO[-_][A-Z0-9-]+\b|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi

/**
 * Server-side PHI guard for `/api/generate` and other freeform LLM routes.
 *
 * Re-applies authoritative de-identification to system + user prompts before
 * forwarding to OpenAI/DeepSeek. The client may have run client-side
 * pseudonymization (`src/services/aiGeneration.ts`) but the toggle can be
 * turned off and the caller may forget to pass `patientHints`. This server
 * guard makes the floor explicit:
 *
 *  - Always scrubs dates, case/insurance numbers, phone numbers, emails
 *    (via `deidentifyText`).
 *  - When hints are provided, also scrubs the patient name and DOB.
 *  - Always scrubs DEMO-* and UUID case identifiers from prompts.
 *
 * Returns the sanitized prompts ready to forward.
 */
export function applyServerPhiGuard(input: {
  systemPrompt: string
  userPrompt: string
  patientHints?: { patientName?: string; patientDob?: string }
}): { systemPrompt: string; userPrompt: string } {
  const name = input.patientHints?.patientName?.trim() || undefined
  const dob = input.patientHints?.patientDob?.trim() || undefined

  const scrub = (text: string): string => {
    let result = deidentifyText(text, name)
    if (dob) {
      const escaped = dob.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      result = result.replace(new RegExp(escaped, 'g'), '[REDACTED]')
    }
    result = result.replace(DEMO_OR_UUID_RE, '[REDACTED]')
    return result
  }

  return {
    systemPrompt: scrub(input.systemPrompt),
    userPrompt: scrub(input.userPrompt),
  }
}

export const generateRouter: Router = createRouter()

/** Upper bound on prompt size to limit abuse / runaway cost. */
const MAX_PROMPT_CHARS = 100_000

generateRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as GenerateRequestBody
    const llmModel = parseLlmModelRequest(body as unknown as Record<string, unknown>, body.tier)

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

    let sanitized: { systemPrompt: string; userPrompt: string }
    try {
      sanitized = applyServerPhiGuard({
        systemPrompt: body.systemPrompt,
        userPrompt: body.userPrompt,
        patientHints: body.patientHints,
      })
    } catch (guardError) {
      // Fail closed: refuse to forward when the PHI guard cannot run cleanly.
      console.error('[generate] PHI guard failed, refusing to forward:', guardError)
      res.status(422).json({
        error:
          'PHI guard could not sanitize prompt; refusing to forward to LLM provider. Re-submit with valid input.',
      })
      return
    }

    const userId = resolveAccountId(req)
    const featureKey = body.featureKey ?? 'document_generation'

    // "Maximum" opt-in: clinician explicitly chose the top model for this one
    // generation. Force the gründlich (4×) billing multiplier and override the
    // model to gpt-5.5 (env OPENAI_MAXIMUM_MODEL) via the thorough tier. The
    // residency gate in resolveLlmCallModel still applies (OpenAI/US is allowed
    // under EU SCC/DPF; strict mode degrades to the thorough-tier EU fallback).
    const maximum = body.maximum === true
    const mode = maximum ? 'gruendlich' : parseMode(body.mode ?? null)
    const effectiveTier = maximum ? 'thorough' : llmModel.tier
    const effectiveModel = maximum ? resolveMaximumModelSpec() : llmModel.model
    const usageContext =
      userId && userId !== 'default'
        ? await resolveUsageContextFromRequest(req, userId, {
            caseId: typeof body.caseId === 'string' ? body.caseId.trim() || null : null,
            featureKey,
            metadata: { route: 'generate', tier: body.tier },
          })
        : undefined

    let result
    try {
      result = await runAiFeature({
        featureKey,
        mode,
        tier: effectiveTier,
        model: effectiveModel,
        systemPrompt: sanitized.systemPrompt,
        userPrompt: sanitized.userPrompt,
        usageContext,
        sanitizeOpts: {
          patientHints: body.patientHints,
        },
      })
    } catch (egressError) {
      if (egressError instanceof InsufficientCreditsError) {
        res.status(402).json({ error: egressError.message })
        return
      }
      if (egressError instanceof SafeLlmEgressError) {
        console.error('[generate] egress guard blocked outbound prompt:', egressError.message)
        res.status(422).json({
          error:
            'PHI guard could not sanitize prompt; refusing to forward to LLM provider. Re-submit with valid input.',
        })
        return
      }
      throw egressError
    }

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
