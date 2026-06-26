/**
 * Central AI feature entry point.
 *
 * Every LLM-bound call in psychiatry-ink MUST go through this function (or a
 * thin wrapper that delegates to it). The flow is:
 *
 *   1. Estimate tokens from prompt length.
 *   2. Estimate credits (creditCalculator.estimateCredits).
 *   3. creditGuard.checkBalance — throws InsufficientCreditsError if the user
 *      cannot afford the estimated cost. No credits are deducted yet.
 *   4. Call the LLM via callLlmSafely (PHI guard and sanitization layer —
 *      NEVER bypassed).
 *   5. calculateFinalCredits using actual token counts from the response.
 *   6. Deduct credits atomically (AiCreditLedger transaction).
 *   7. Log to AiUsageLog (metadata only — no PHI).
 *   8. Return LlmCallResult to the caller.
 *
 * Failure handling:
 *   - If the LLM call throws, credits are NOT deducted (no usable output).
 *   - The failure is still logged to AiUsageLog with success=false.
 *   - If creditGuard.checkBalance throws InsufficientCreditsError, the LLM is
 *     never called.
 *
 * PHI guarantee:
 *   callLlmSafely (from safeLlmEgress.ts) is the sole LLM egress layer. This
 *   function calls it explicitly and does not bypass it under any code path.
 *
 * @module runAiFeature
 */

import type { AiMode, AiFeatureKey } from '../../src/types/aiUsage'
import type { AiModelTier } from '../modelTierMapping'
import type { LlmCallResult, AiUsageContext } from './types'
import type { SanitizeOptions } from '../services/safeLlmEgress'
import { callLlmSafely } from '../services/safeLlmEgress'
import { modeToTier } from './aiRouter'
import { estimateCredits, calculateFinalCredits, estimateTokensFromText } from './creditCalculator'
import {
  checkBalance,
  deductCreditsTransactionally,
  InsufficientCreditsError,
  CreditInfrastructureError,
} from './creditGuard'
import { logAiUsage } from './usageLogger'
import { getFeatureCreditRule } from './featureCreditRules'
import { assertAccess } from '../services/subscriptionAccess'
import { maybeTriggerAutoRecharge } from '../services/autoRecharge'

export { InsufficientCreditsError, CreditInfrastructureError }

export interface RunAiFeatureParams {
  /** Feature key for credit accounting and usage tracking. */
  featureKey: AiFeatureKey | string
  /**
   * User-visible quality mode. Drives model selection and cost multiplier.
   * Defaults to the feature's defaultMode when omitted.
   * If `tier` is also provided, `tier` takes precedence for model selection
   * but `mode` still drives the credit multiplier.
   */
  mode?: AiMode
  /**
   * Internal model tier override (backward-compat). When provided, overrides
   * the mode→tier mapping for model selection only. Credit multiplier still
   * uses `mode`.
   */
  tier?: AiModelTier
  /** Explicit provider+model override (bypasses tier routing). */
  model?: { provider: string; modelId: string }
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
  jsonResponse?: boolean
  /** Usage context for Supabase ai_usage_logs (existing telemetry). */
  usageContext?: AiUsageContext
  /** PHI sanitization options forwarded to callLlmSafely. */
  sanitizeOpts?: SanitizeOptions
  /**
   * De-identified case reference for AiUsageLog.caseRef.
   * MUST NOT be a patient name or full case ID containing PHI.
   */
  caseRef?: string | null
  /**
   * When true, skip credit balance check and deduction.
   * Use ONLY for internal tooling / kb-seed pipelines that are not
   * user-initiated (e.g. KB batch generation).
   */
  skipCreditAccounting?: boolean
}

export async function runAiFeature(params: RunAiFeatureParams): Promise<LlmCallResult> {
  const {
    featureKey,
    systemPrompt,
    userPrompt,
    maxTokens,
    jsonResponse,
    usageContext,
    sanitizeOpts,
    caseRef,
    skipCreditAccounting = false,
  } = params

  const rule = getFeatureCreditRule(featureKey)
  const mode: AiMode = params.mode ?? rule.defaultMode
  const resolvedTier: AiModelTier = params.tier ?? modeToTier(mode)

  const userId = usageContext?.userId ?? null
  const organisationId = usageContext?.organisationId ?? null

  // ── 1. Estimate credits ──────────────────────────────────────────────────
  const promptTokenEst = estimateTokensFromText(systemPrompt + userPrompt)
  const estimatedCost = estimateCredits(featureKey, mode, promptTokenEst)

  // ── 2. Check balance before calling the LLM ──────────────────────────────
  // InsufficientCreditsError is rethrown (intentionally blocks the call).
  // Any OTHER error from credit infrastructure (DB unavailable, migration not
  // applied, config missing) is fail-CLOSED in production to prevent unbounded
  // free LLM usage when the credit table is unreachable. In dev/test we keep
  // the legacy fail-open so unit tests and local dev without a DB still work.
  if (!skipCreditAccounting && userId) {
    try {
      // Soft-lock gate: a lapsed-trial account with no active subscription and
      // no purchased credits is blocked here (AccessLockedError subclasses
      // InsufficientCreditsError, so it surfaces as the usual 402). Accounts
      // that never started a trial keep access — see subscriptionAccess.
      await assertAccess(userId)
      await checkBalance(userId, estimatedCost)
    } catch (balanceError) {
      if (balanceError instanceof InsufficientCreditsError) throw balanceError
      const msg = (balanceError as Error).message
      if (process.env.NODE_ENV === 'production') {
        console.error('[runAiFeature] Credit infrastructure error in production — refusing call:', msg)
        throw new CreditInfrastructureError(
          'AI credit accounting is temporarily unavailable. Please retry shortly.',
        )
      }
      console.warn('[runAiFeature] Credit balance check skipped (non-production, DB unavailable):', msg)
    }
  }

  // ── 3. Call LLM via PHI guard ─────────────────────────────────────────────
  const started = Date.now()
  let result: LlmCallResult
  let success = false
  let errorCode: string | null = null

  try {
    result = await callLlmSafely(
      {
        tier: resolvedTier,
        model: params.model,
        systemPrompt,
        userPrompt,
        maxTokens,
        jsonResponse,
        usageContext,
      },
      sanitizeOpts,
    )
    success = true
  } catch (error) {
    const durationMs = Date.now() - started
    errorCode = error instanceof Error ? error.constructor.name : 'unknown_error'

    // Log failure (no credits deducted).
    void logAiUsage({
      userId,
      organisationId,
      caseRef: caseRef ?? null,
      featureKey,
      mode,
      provider: resolvedTier === 'thorough' ? 'openai' : 'deepseek',
      model: 'unknown',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      creditsCharged: 0,
      durationMs,
      success: false,
      errorCode,
    })

    throw error
  }

  const durationMs = Date.now() - started

  // ── 4. Calculate final credits from actual usage ──────────────────────────
  const finalCredits = calculateFinalCredits(featureKey, mode, result.usage)

  // ── 5. Deduct credits + write ledger ─────────────────────────────────────
  let usageLogId: string | null = null

  if (!skipCreditAccounting && userId && finalCredits > 0) {
    try {
      const deductResult = await deductCreditsTransactionally({
        userId,
        credits: finalCredits,
        featureKey,
        mode,
      })
      if (!deductResult.ok) {
        // Extremely rare race (two concurrent calls both passed checkBalance but
        // only one wins the debit transaction). Balance was not deducted.
        console.warn(`[runAiFeature] Concurrent overdraft avoided for userId=${userId}`)
      } else {
        // Out-of-band, fire-and-forget: top up the balance if the user has opted
        // into auto-recharge and just dropped below their threshold. Never blocks
        // or fails this request (the AI call already succeeded). The trigger
        // itself is gated + idempotent inside maybeTriggerAutoRecharge.
        void maybeTriggerAutoRecharge(userId).catch((error) => {
          console.warn('[runAiFeature] auto-recharge trigger failed (non-fatal):', error)
        })
      }
    } catch (deductError) {
      const msg = (deductError as Error).message
      if (process.env.NODE_ENV === 'production') {
        // The LLM call already succeeded; we cannot retroactively un-call it.
        // Log this loudly so operators can investigate and reconcile manually.
        // Future calls will fail closed at the balance check above.
        console.error('[runAiFeature] CRITICAL: credit deduction failed in production after successful LLM call. Manual reconciliation required.', {
          userId,
          featureKey,
          finalCredits,
          error: msg,
        })
      } else {
        console.warn('[runAiFeature] Credit deduction skipped (non-production, DB unavailable):', msg)
      }
    }
  }

  // ── 6. Log usage (never throws — metadata only) ───────────────────────────
  usageLogId = await logAiUsage({
    userId,
    organisationId,
    caseRef: caseRef ?? null,
    featureKey,
    mode,
    provider: result.provider,
    model: result.model,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    totalTokens: result.usage.totalTokens,
    creditsCharged: success ? finalCredits : 0,
    durationMs,
    success,
    errorCode,
    rawProviderUsage: result.usage.rawUsageJson as Record<string, unknown> | null,
  })

  void usageLogId

  return result
}
