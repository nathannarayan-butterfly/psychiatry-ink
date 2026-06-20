/**
 * Central LLM egress safety wrapper.
 *
 * Every LLM-bound free-text payload (prompts, conversation messages, evidence
 * summaries, deidentifiedText fields client-asserted as scrubbed, etc.) MUST
 * pass through this module before reaching `callLlm()`. The wrapper enforces
 * three guarantees:
 *
 *   1. **sanitize** – every text field is re-deidentified server-side using the
 *      same authoritative `IDENTIFIER_PATTERNS` as the discuss-case redactor.
 *      Client `deidentifiedText` is treated as untrusted input and re-scrubbed.
 *   2. **assert (fail-closed)** – after sanitization, the payload is checked
 *      for high-confidence PHI residue. If anything obvious slipped through
 *      (e.g. an unredacted email, ISO date, KVNR), the call is BLOCKED — the
 *      LLM provider is never reached.
 *   3. **call** – `callLlmSafely` runs (1) → (2) → `callLlm()` and returns the
 *      provider result. If the assertion throws, no network call is made.
 *
 * Trust model:
 *  - Never trust the client. `deidentifiedText` is unverified input.
 *  - `patientHints` are optional; detection runs whether hints are present
 *    or not. When hints are provided, the patient name and DOB are scrubbed
 *    in addition to the unconditional patterns.
 *
 * This module is the SOLE legitimate caller of {@link callLlm} for any
 * free-text prompt path. Direct {@link callLlm} usage outside this module is
 * checked by `server/__tests__/safeLlmEgressAudit.test.ts`.
 */

import {
  callLlm as rawCallLlm,
  llmResultModel as rawLlmResultModel,
} from './llmProvider'
import { IDENTIFIER_PATTERNS, deidentifyText } from './discussCaseDeidentify'
import type { AiModelTier } from '../modelTierMapping'
import type { AiUsageContext, LlmCallResult } from '../ai/types'

/** Optional patient identifier hints. When provided, name/DOB are scrubbed. */
export interface PatientHints {
  patientName?: string
  patientDob?: string
}

/** Sanitization options. */
export interface SanitizeOptions {
  patientHints?: PatientHints
  /**
   * When true, also strip patient-specific hints aggressively when the field
   * is supposed to be a generic / non-patient pharmacology query. Currently
   * used by `/api/pharma-ask` to remove client-attached patient context.
   */
  stripPatientContext?: boolean
}

/**
 * High-confidence residual PHI patterns. After sanitization, finding any of
 * these indicates the scrub failed and the call must be blocked. We only
 * include patterns where a positive match is essentially impossible to be a
 * legitimate clinical word — i.e. raw email, exact ISO date, RFC-4122 UUID,
 * DEMO-* code, KVNR.
 */
const HIGH_CONFIDENCE_PHI_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'email', re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { name: 'iso-date', re: /\b\d{4}-\d{2}-\d{2}\b/ },
  { name: 'de-date', re: /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/ },
  { name: 'slash-date', re: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/ },
  { name: 'uuid', re: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i },
  { name: 'demo-id', re: /\bDEMO[-_][A-Z0-9-]{3,}\b/i },
  { name: 'kvnr', re: /\b[A-Z]\d{9}\b/ },
]

/**
 * Patterns we strip aggressively from any field marked as "patient context"
 * when the route should not receive patient-specific text at all. Matches are
 * removed rather than replaced with [REDACTED] so the prompt remains compact.
 */
const PATIENT_CONTEXT_KEYS = [
  'patientName',
  'patientDob',
  'dateOfBirth',
  'kvnr',
  'krankenversicherungsnummer',
  'address',
  'phone',
  'email',
  'caseId',
  'patientId',
]

/**
 * Scrub a single string. Always-on patterns run unconditionally; the patient
 * name and DOB are added when hints are provided.
 */
export function sanitizeText(text: string, opts: SanitizeOptions = {}): string {
  if (!text) return text
  const name = opts.patientHints?.patientName?.trim() || undefined
  const dob = opts.patientHints?.patientDob?.trim() || undefined

  let result = deidentifyText(text, name)

  if (dob) {
    const escaped = dob.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escaped, 'g'), '[REDACTED]')
  }

  // Defensive second pass: patterns are re-applied so a patient-name that
  // contained a phone/email-like substring still gets caught.
  for (const pattern of IDENTIFIER_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]')
  }

  return result
}

/**
 * Generic shape sanitizer. Walks the payload object, scrubs every string, and
 * preserves the structure. Non-string leaves are passed through unchanged.
 *
 * Mutates a deep copy — does not modify the input.
 */
export function sanitizeLlmPayload<T>(payload: T, opts: SanitizeOptions = {}): T {
  return sanitizeValue(payload, opts) as T
}

function sanitizeValue(value: unknown, opts: SanitizeOptions): unknown {
  if (typeof value === 'string') return sanitizeText(value, opts)
  if (Array.isArray(value)) return value.map((entry) => sanitizeValue(entry, opts))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      // Strip patient-context keys entirely when caller says they must not be
      // forwarded (e.g. pharmacology Q&A). The key is preserved with a redacted
      // sentinel so dependent code paths don't crash on a missing field.
      if (opts.stripPatientContext && PATIENT_CONTEXT_KEYS.includes(key)) {
        out[key] = typeof raw === 'string' ? '[REDACTED]' : null
        continue
      }
      out[key] = sanitizeValue(raw, opts)
    }
    return out
  }
  return value
}

/**
 * Throw if the (already sanitized) payload still contains high-confidence PHI.
 * Block fail-closed semantics: the route handler should treat a thrown error
 * as "do not forward to the LLM provider" and return HTTP 422 to the caller.
 */
export function assertSafeLlmPayload(payload: unknown): void {
  const findings = collectResidualPhi(payload)
  if (findings.length === 0) return
  const summary = findings
    .slice(0, 3)
    .map((f) => `${f.pattern} at "${f.preview}"`)
    .join('; ')
  throw new SafeLlmEgressError(
    `Refusing to forward to LLM provider — residual PHI detected: ${summary}`,
  )
}

interface PhiFinding {
  pattern: string
  preview: string
}

function collectResidualPhi(value: unknown, into: PhiFinding[] = []): PhiFinding[] {
  if (typeof value === 'string') {
    for (const { name, re } of HIGH_CONFIDENCE_PHI_PATTERNS) {
      const match = value.match(re)
      if (match) {
        into.push({ pattern: name, preview: match[0].slice(0, 32) })
      }
    }
  } else if (Array.isArray(value)) {
    for (const entry of value) collectResidualPhi(entry, into)
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectResidualPhi(v, into)
    }
  }
  return into
}

/**
 * Custom error so route handlers can map it to HTTP 422 cleanly.
 */
export class SafeLlmEgressError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SafeLlmEgressError'
  }
}

/**
 * Wrapped, PHI-safe variant of {@link callLlm}. Sanitizes the system + user
 * prompts, asserts the result is free of obvious residual PHI, and only then
 * forwards to the provider. The original caller never has the chance to
 * accidentally pass unsanitized text to the network boundary.
 */
export async function callLlmSafely(
  args: {
    tier?: AiModelTier
    model?: { provider: string; modelId: string }
    systemPrompt: string
    userPrompt: string
    maxTokens?: number
    jsonResponse?: boolean
    usageContext?: AiUsageContext
  },
  opts: SanitizeOptions = {},
): Promise<LlmCallResult> {
  const sanitizedSystem = sanitizeText(args.systemPrompt ?? '', opts)
  const sanitizedUser = sanitizeText(args.userPrompt ?? '', opts)

  // Fail-closed assertion. If a high-confidence residue remains, throw
  // (route handler should respond 422 — see callsite).
  assertSafeLlmPayload({ system: sanitizedSystem, user: sanitizedUser })

  return rawCallLlm({
    ...args,
    systemPrompt: sanitizedSystem,
    userPrompt: sanitizedUser,
  })
}

/** Re-export so call sites only need to import from this module. */
export const llmResultModel = rawLlmResultModel
