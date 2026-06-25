/**
 * AI usage logger — writes to the live `ai_usage_logs` table via the typed
 * supabase-js data layer (`server/data/aiUsage.ts`).
 *
 * Privacy guarantee: this module NEVER stores raw prompts, patient text, or
 * any field that could contain PHI. Only token counts, feature key, mode,
 * provider/model metadata, de-identified case reference, and status are stored.
 */

import { insertAiUsageLog, listUserUsageSince } from '../data/aiUsage'
import type { AiMode } from '../../src/types/aiUsage'

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
    return await insertAiUsageLog({
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
      durationMs: params.durationMs ?? null,
      success: params.success,
      errorCode: params.errorCode ?? null,
      rawProviderUsage: params.rawProviderUsage ?? null,
    })
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

  const rows = await listUserUsageSince(userId, periodStart.toISOString())

  return {
    callCount: rows.length,
    totalTokens: rows.reduce((s, r) => s + r.totalTokens, 0),
    totalCredits: rows.reduce((s, r) => s + r.creditsCharged, 0),
    successCount: rows.filter((r) => r.success).length,
    failureCount: rows.filter((r) => !r.success).length,
  }
}
