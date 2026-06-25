import { getSupabaseAdmin } from '../services/supabaseAdmin'
import type { Database, Json } from '../types/database'
import type { AiMode } from '../../src/types/aiUsage'

/**
 * aiUsageRepo — typed data-access seam for AI usage metadata logging
 * (Prisma `AiUsageLog` → live `ai_usage_logs`).
 *
 * Privacy: only token counts, feature key, mode, provider/model metadata, a
 * de-identified case reference, and status are persisted — never raw prompts or
 * PHI. All writes go through the service-role client.
 *
 * NOTE on `organisation_id`: the live `ai_usage_logs.organisation_id` column is
 * a `uuid` (FK → `org_organisations`), whereas the legacy Prisma model treated
 * it as free-form text. We accommodate the existing string-based usage by
 * passing the value through unchanged (PostgREST casts text → uuid); we do NOT
 * alter the column. A value that is not a valid/existing org uuid causes the
 * insert to fail, which the best-effort caller swallows (logging never aborts an
 * AI call).
 */

type AiUsageLogInsert = Database['public']['Tables']['ai_usage_logs']['Insert']

export interface AiUsageLogInput {
  userId?: string | null
  organisationId?: string | null
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
  rawProviderUsage?: Record<string, unknown> | null
}

/**
 * Insert one usage row and return its id. Maps the camelCase domain shape onto
 * the snake_case live columns (`caseRef`→`case_id`, `durationMs`→`latency_ms`,
 * `rawProviderUsage`→`raw_usage_json`). Throws on failure; callers decide
 * whether to swallow.
 */
export async function insertAiUsageLog(input: AiUsageLogInput): Promise<string> {
  const row: AiUsageLogInsert = {
    user_id: input.userId ?? null,
    organisation_id: input.organisationId ?? null,
    case_id: input.caseRef ?? null,
    feature_key: input.featureKey,
    mode: input.mode,
    provider: input.provider,
    model: input.model,
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
    total_tokens: input.totalTokens,
    credits_charged: input.creditsCharged,
    latency_ms: input.durationMs ?? null,
    success: input.success,
    error_code: input.errorCode ?? null,
    // jsonb column: store the object directly (the legacy text column stored a
    // JSON.stringify'd string; jsonb is the type upgrade noted in the gap analysis).
    raw_usage_json: (input.rawProviderUsage ?? null) as Json | null,
  }

  const { data, error } = await getSupabaseAdmin()
    .from('ai_usage_logs')
    .insert(row)
    .select('id')
    .single()
  if (error) throw new Error(`ai_usage_logs insert failed: ${error.message}`)
  return data.id
}

export interface AiUsageSummaryRow {
  totalTokens: number
  creditsCharged: number
  success: boolean
}

export interface AiUsageHistoryRow {
  id: string
  featureKey: string
  mode: string
  provider: string
  model: string
  totalTokens: number
  creditsCharged: number
  success: boolean
  errorCode: string | null
  createdAt: Date
}

/**
 * Recent AI usage rows for a user (newest first), metadata only. Replaces the
 * legacy Prisma `aiUsageLog.findMany` read used by the AI-credits history route.
 * `mode` is nullable on the live table (org-centric rows have none); we coalesce
 * to an empty string to match the legacy non-null model shape.
 */
export async function listRecentUsageForUser(
  userId: string,
  limit = 50,
): Promise<AiUsageHistoryRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('ai_usage_logs')
    .select(
      'id, feature_key, mode, provider, model, total_tokens, credits_charged, success, error_code, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`ai_usage_logs history read failed: ${error.message}`)
  return (data ?? []).map((r) => ({
    id: r.id,
    featureKey: r.feature_key,
    mode: r.mode ?? '',
    provider: r.provider,
    model: r.model,
    totalTokens: r.total_tokens,
    creditsCharged: r.credits_charged,
    success: r.success,
    errorCode: r.error_code,
    createdAt: new Date(r.created_at),
  }))
}

/** Usage rows for a user since `sinceIso` (used for monthly summaries). */
export async function listUserUsageSince(
  userId: string,
  sinceIso: string,
): Promise<AiUsageSummaryRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('ai_usage_logs')
    .select('total_tokens, credits_charged, success')
    .eq('user_id', userId)
    .gte('created_at', sinceIso)
  if (error) throw new Error(`ai_usage_logs read failed: ${error.message}`)
  return (data ?? []).map((r) => ({
    totalTokens: r.total_tokens,
    creditsCharged: r.credits_charged,
    success: r.success,
  }))
}
