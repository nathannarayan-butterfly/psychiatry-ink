/**
 * DeepSeek-only translation backend for the KB English-translation pipeline.
 *
 * HARD CONSTRAINT: every translation call MUST go to DeepSeek. We force the
 * provider by passing an explicit `{ provider: 'deepseek' }` model to `callLlm`
 * (which bypasses the tier fallback that could otherwise route to OpenAI), and
 * we ASSERT `result.provider === 'deepseek'` on every response. If a call would
 * resolve to any other provider — or to mock mode (no DEEPSEEK_API_KEY) — we
 * throw instead of silently using another provider. The caller logs the failure
 * and continues; it never falls back to Gemini/OpenAI.
 */

import { callLlm } from '../../server/services/llmProvider'
import { KB_EN_SYSTEM_PROMPT, type TranslateBatchFn } from './kbEnglishTranslation'

/** Resolved DeepSeek model id (matches `modelTierMapping.ts` default). */
export const DEEPSEEK_MODEL_ID = (process.env.DEEPSEEK_FAST_MODEL ?? 'deepseek-v4-flash').trim()

const DEEPSEEK_PROVIDER = 'deepseek' as const

export function assertDeepSeekConfigured(): void {
  if (!process.env.DEEPSEEK_API_KEY?.trim()) {
    throw new Error(
      'DEEPSEEK_API_KEY is required (DeepSeek is the ONLY permitted translation provider). ' +
        'Set it in .env.local before running the translation.',
    )
  }
}

export interface DeepSeekUsageTally {
  calls: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  /** Provider → call count. MUST only ever contain `deepseek`. */
  providerCounts: Record<string, number>
}

export function createUsageTally(): DeepSeekUsageTally {
  return { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, providerCounts: {} }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Build a {@link TranslateBatchFn} bound to DeepSeek with retry/backoff. On a
 * persistent failure it throws (the caller records the item as failed and moves
 * on). It never returns content from a non-DeepSeek provider.
 */
export function createDeepSeekTranslateBatch(opts: {
  tally?: DeepSeekUsageTally
  maxAttempts?: number
  maxTokens?: number
}): TranslateBatchFn {
  const tally = opts.tally
  const maxAttempts = opts.maxAttempts ?? 3
  const maxTokens = opts.maxTokens ?? 16_000

  return async (inputs: Record<string, string>): Promise<Record<string, string>> => {
    const keys = Object.keys(inputs)
    if (keys.length === 0) return {}

    const userPrompt =
      'Translate the values of this JSON object from German to clinical English ' +
      `following the rules. Respond with the same keys only:\n${JSON.stringify(inputs)}`

    let lastError: unknown
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await callLlm({
          // Explicit provider+model FORCES DeepSeek and disables tier fallback.
          model: { provider: DEEPSEEK_PROVIDER, modelId: DEEPSEEK_MODEL_ID },
          systemPrompt: KB_EN_SYSTEM_PROMPT,
          userPrompt,
          jsonResponse: true,
          maxTokens,
          usageContext: {
            featureKey: 'kb_translation_en',
            requestKind: 'batch',
            metadata: { script: 'translate-kb-to-english' },
          },
        })

        // Provider assertion — the core of the DeepSeek-only guarantee.
        if (result.provider !== DEEPSEEK_PROVIDER) {
          throw new Error(
            `Refusing translation: provider was "${result.provider}" (expected deepseek). ` +
              'No fallback to other providers is permitted.',
          )
        }

        if (tally) {
          tally.calls += 1
          tally.inputTokens += result.usage.inputTokens
          tally.outputTokens += result.usage.outputTokens
          tally.totalTokens += result.usage.totalTokens
          tally.providerCounts[result.provider] =
            (tally.providerCounts[result.provider] ?? 0) + 1
        }

        const parsed = JSON.parse(result.text) as Record<string, unknown>
        const out: Record<string, string> = {}
        for (const key of keys) {
          const value = parsed[key]
          if (typeof value === 'string' && value.trim()) out[key] = value.trim()
        }
        return out
      } catch (error) {
        lastError = error
        // A provider-mismatch is a hard stop: do not retry, do not fall back.
        if (error instanceof Error && error.message.startsWith('Refusing translation:')) {
          throw error
        }
        await sleep(800 * (attempt + 1))
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError))
  }
}
