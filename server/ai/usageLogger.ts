/**
 * AI usage logger — writes to the local AiUsageLog Prisma model.
 *
 * Privacy guarantee: this module NEVER stores raw prompts, patient text, or
 * any field that could contain PHI. Only token counts, feature key, mode,
 * provider/model metadata, de-identified case reference, status, and the
 * estimated provider USD cost are stored. The provider USD cost is the
 * input the margin analytics rolls up — see `routes/adminAiAnalytics.ts`.
 */

import { prisma } from '../db'
import type { AiMode } from '../../src/types/aiUsage'
import type { Prisma } from '@prisma/client'

export interface LogAiUsageParams {
  userId?: string | null
  organisationId?: string | null
  /** De-identified case reference (e.g. opaque case code). MUST NOT contain patient names. */
  caseRef?: string | null
  featureKey: string
  mode: AiMode
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  creditsCharged: number
  /**
   * Real provider USD cost computed from per-1M-token rates in
   * {@link ../ai/providerCosts}. Null when the model is unknown.
   */
  estimatedCostUsd?: number | null
  /**
   * True when the call landed on a non-primary provider for its mode (e.g.
   * gruendlich primary is OpenAI; if OpenAI errored and the call fell back
   * to DeepSeek, fallback=true). See {@link ../ai/providerCosts.isPrimaryProviderForMode}.
   */
  fallback?: boolean
  durationMs?: number | null
  success: boolean
  errorCode?: string | null
  /** Raw provider usage metadata (numbers only — no text/PHI). */
  rawProviderUsage?: Record<string, unknown> | null
}

/**
 * Append a row to AiUsageLog. Never throws — logs errors to console so a
 * logging failure never aborts an AI call.
 *
 * Returns the new row id (or null on failure).
 */
export async function logAiUsage(params: LogAiUsageParams): Promise<string | null> {
  try {
    // Prisma's Decimal column accepts number | string | Decimal. We pass the
    // string form to avoid any floating-point drift between JS and the SQLite
    // NUMERIC affinity.
    const cost: Prisma.AiUsageLogCreateInput['estimatedCostUsd'] =
      params.estimatedCostUsd == null
        ? null
        : params.estimatedCostUsd.toFixed(6)

    const row = await prisma.aiUsageLog.create({
      data: {
        userId: params.userId ?? null,
        organisationId: params.organisationId ?? null,
        caseRef: params.caseRef ?? null,
        featureKey: params.featureKey,
        mode: params.mode,
        provider: params.provider,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        totalTokens: params.totalTokens,
        creditsCharged: params.creditsCharged,
        estimatedCostUsd: cost,
        fallback: params.fallback ?? false,
        durationMs: params.durationMs ?? null,
        success: params.success,
        errorCode: params.errorCode ?? null,
        rawProviderUsage: params.rawProviderUsage
          ? JSON.stringify(params.rawProviderUsage)
          : null,
      },
    })
    return row.id
  } catch (error) {
    console.error('[usageLogger] Failed to write AiUsageLog:', error)
    return null
  }
}

/** Read usage summary for a user in the current UTC month. */
export async function getUsageSummaryForUser(userId: string): Promise<{
  callCount: number
  totalTokens: number
  totalCredits: number
  successCount: number
  failureCount: number
}> {
  const periodStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
  )

  const rows = await prisma.aiUsageLog.findMany({
    where: {
      userId,
      createdAt: { gte: periodStart },
    },
    select: {
      totalTokens: true,
      creditsCharged: true,
      success: true,
    },
  })

  return {
    callCount: rows.length,
    totalTokens: rows.reduce((s, r) => s + r.totalTokens, 0),
    totalCredits: rows.reduce((s, r) => s + r.creditsCharged, 0),
    successCount: rows.filter((r) => r.success).length,
    failureCount: rows.filter((r) => !r.success).length,
  }
}
