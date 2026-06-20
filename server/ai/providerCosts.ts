/**
 * Per-model provider cost table (USD per 1M tokens) and helpers to compute
 * the provider-cost multiplier applied to credit billing.
 *
 * Why a separate table from `pricing/modelPricing.ts`?
 *   - `pricing/modelPricing.ts` is consumed by the Supabase `ai_usage_logs`
 *     telemetry pipeline (existing Beta-v1 surface). It records USD↔EUR
 *     conversion and is used to estimate the EUR cost shown in the user-
 *     facing usage tracker.
 *   - `providerCosts.ts` (this file) drives the *credit-billing* multiplier.
 *     It is centralised here so the operator can tune per-model rates with
 *     a single edit and see exactly which models exist in the system.
 *
 * Configurability:
 *   - Default rates are the public list prices observed at 2026-mid.
 *   - Any rate can be overridden at process start via env, in the form
 *     `PROVIDER_COST_<MODEL>_INPUT` / `..._OUTPUT` (USD per 1M tokens),
 *     where `<MODEL>` is the model id uppercased with `-` and `.` replaced
 *     by `_` (e.g. `PROVIDER_COST_DEEPSEEK_V4_FLASH_INPUT=0.10`).
 *
 * Credit multiplier formula:
 *   Let `blended(model) = (inputUsd/M + outputUsd/M) / 2`.
 *   Let `baseline = blended('deepseek-v4-flash')` — the cheapest live model
 *   we ship by default. The provider cost factor is
 *
 *     factor(model) = clamp(blended(model) / baseline, 1.0, MAX_FACTOR)
 *
 *   Final credit cost = `baseCreditCost × modeMultiplier × factor(model)`.
 *
 *   - DeepSeek-v4-flash on its primary path → factor 1.0 → no behavioural
 *     change vs. Beta-v1 billing.
 *   - GPT-4.1 → factor ~10 (clamped at MAX_FACTOR), so a Gründlich call on
 *     OpenAI consumes meaningfully more credits than the same call on
 *     DeepSeek. This is the explicit goal of the margin protection rule:
 *     "OpenAI calls must not consume credits at the same rate as DeepSeek".
 *   - MAX_FACTOR caps single-call cost so a misconfigured pricing row cannot
 *     produce runaway debits. 10× is enough to recover most providers'
 *     real-cost differential.
 */

import type { AiMode } from '../../src/types/aiUsage'

export interface ProviderCostRow {
  /** Provider id (matches the value stored in AiUsageLog.provider). */
  provider: 'deepseek' | 'openai' | 'google'
  /** USD per 1 million input tokens. */
  inputUsd: number
  /** USD per 1 million output tokens. */
  outputUsd: number
}

/**
 * Models actually wired into Psychiatry.Ink server-side (see
 * `server/modelTierMapping.ts`, `server/services/kbSeedLlm.ts`,
 * `server/services/transcriptionProvider.ts`). The Gemini entries are
 * present so a future routing change (standard → Gemini) costs out
 * correctly without a code change.
 *
 * Prices are list rates in USD per 1M tokens, as approximated for mid-2026.
 * These are documented as approximations; update this single file when
 * provider pricing changes. The `PROVIDER_COST_*` env overrides allow
 * hotfixing without a deploy.
 */
const DEFAULT_PROVIDER_COSTS: Record<string, ProviderCostRow> = {
  // ── DeepSeek ──────────────────────────────────────────────────────────
  'deepseek-v4-flash': { provider: 'deepseek', inputUsd: 0.07, outputUsd: 0.28 },
  'deepseek-chat': { provider: 'deepseek', inputUsd: 0.27, outputUsd: 1.1 },
  'deepseek-reasoner': { provider: 'deepseek', inputUsd: 0.55, outputUsd: 2.19 },

  // ── Google Gemini (wired for future routing — primary for standard) ──
  'gemini-2.5-flash': { provider: 'google', inputUsd: 0.15, outputUsd: 0.6 },
  'gemini-2.5-pro': { provider: 'google', inputUsd: 1.25, outputUsd: 5.0 },

  // ── OpenAI ────────────────────────────────────────────────────────────
  // The codebase defaults gpt-4o-mini for fast/standard fallback and
  // gpt-4.1 for thorough (Gründlich primary). gpt-4o and gpt-4o-transcribe
  // are also referenced by the modelPricing telemetry table.
  'gpt-4o-mini': { provider: 'openai', inputUsd: 0.15, outputUsd: 0.6 },
  'gpt-4o': { provider: 'openai', inputUsd: 2.5, outputUsd: 10.0 },
  'gpt-4.1': { provider: 'openai', inputUsd: 2.0, outputUsd: 8.0 },
  // Whisper-class transcription is priced per minute, not per token; it is
  // priced separately by the audio path and is intentionally absent here
  // so the credit-factor formula does not double-count audio cost.
}

/** Hard upper bound on the per-call cost factor — see file header. */
export const MAX_PROVIDER_COST_FACTOR = 10

/** Reference model whose blended cost defines `factor = 1.0`. */
export const PROVIDER_COST_BASELINE_MODEL = 'deepseek-v4-flash'

function envKey(modelId: string, side: 'INPUT' | 'OUTPUT'): string {
  const slug = modelId.toUpperCase().replace(/[-.]/g, '_')
  return `PROVIDER_COST_${slug}_${side}`
}

function envOverrideUsd(modelId: string, side: 'INPUT' | 'OUTPUT'): number | null {
  const raw = process.env[envKey(modelId, side)]?.trim()
  if (!raw) return null
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

/**
 * Resolve the cost row for a given model id (case-insensitive). Returns
 * `null` for unknown models — callers MUST treat that as "no cost factor"
 * so an unrecognised model can still be billed at base mode rate rather
 * than crashing the credit pipeline.
 */
export function resolveProviderCost(modelId: string): ProviderCostRow | null {
  if (!modelId) return null
  const row = DEFAULT_PROVIDER_COSTS[modelId] ?? null
  if (!row) {
    // Case-insensitive fallback (some provider responses upper-case).
    const lower = modelId.toLowerCase()
    for (const [key, value] of Object.entries(DEFAULT_PROVIDER_COSTS)) {
      if (key.toLowerCase() === lower) {
        return applyEnvOverride(key, value)
      }
    }
    return null
  }
  return applyEnvOverride(modelId, row)
}

function applyEnvOverride(modelId: string, row: ProviderCostRow): ProviderCostRow {
  const inOverride = envOverrideUsd(modelId, 'INPUT')
  const outOverride = envOverrideUsd(modelId, 'OUTPUT')
  if (inOverride === null && outOverride === null) return row
  return {
    provider: row.provider,
    inputUsd: inOverride ?? row.inputUsd,
    outputUsd: outOverride ?? row.outputUsd,
  }
}

/** Blended USD-per-1M-tokens (simple average of input/output rates). */
export function blendedUsdPerMillion(modelId: string): number | null {
  const row = resolveProviderCost(modelId)
  if (!row) return null
  return (row.inputUsd + row.outputUsd) / 2
}

/**
 * Provider-cost factor used by credit billing (see file header). Returns 1.0
 * for the baseline model or any model whose row is missing — never < 1 (we
 * never DISCOUNT a call) and never > {@link MAX_PROVIDER_COST_FACTOR}.
 */
export function providerCostFactor(modelId: string): number {
  const baseline = blendedUsdPerMillion(PROVIDER_COST_BASELINE_MODEL)
  const model = blendedUsdPerMillion(modelId)
  if (baseline === null || baseline <= 0 || model === null) return 1
  const raw = model / baseline
  if (!Number.isFinite(raw) || raw <= 1) return 1
  return Math.min(MAX_PROVIDER_COST_FACTOR, raw)
}

/**
 * Real USD cost for a completed call. Returns `null` when the model is
 * unknown (so the caller can decide whether to omit the cost or fall back
 * to a heuristic). All inputs are billed at input rates and outputs at
 * output rates — cache discounts are intentionally NOT applied here so the
 * recorded cost is a conservative upper bound (cache savings flow into the
 * existing Supabase ai_usage_logs telemetry surface instead).
 */
export function computeEstimatedCostUsd(params: {
  modelId: string
  inputTokens: number
  outputTokens: number
}): number | null {
  const row = resolveProviderCost(params.modelId)
  if (!row) return null
  const inputCost = (params.inputTokens / 1_000_000) * row.inputUsd
  const outputCost = (params.outputTokens / 1_000_000) * row.outputUsd
  const total = inputCost + outputCost
  if (!Number.isFinite(total) || total < 0) return null
  return Math.round(total * 1_000_000) / 1_000_000
}

/**
 * Map a provider id to the AI mode whose PRIMARY route uses it. When the
 * actual call provider differs from this for the call's mode, we mark the
 * usage log as `fallback=true` so analytics can split fallback cost out.
 *
 *   economic   → primary = deepseek
 *   standard   → primary = deepseek (Gemini accepted as additional primary)
 *   gruendlich → primary = openai
 */
export function isPrimaryProviderForMode(provider: string, mode: AiMode): boolean {
  if (mode === 'economic') return provider === 'deepseek'
  if (mode === 'standard') return provider === 'deepseek' || provider === 'google'
  return provider === 'openai'
}

/**
 * Static, frozen view of the table — exposed for diagnostics and admin
 * surfaces. Callers MUST NOT mutate this object.
 */
export function listProviderCosts(): Readonly<Record<string, ProviderCostRow>> {
  const out: Record<string, ProviderCostRow> = {}
  for (const [modelId, row] of Object.entries(DEFAULT_PROVIDER_COSTS)) {
    out[modelId] = applyEnvOverride(modelId, row)
  }
  return Object.freeze(out)
}
