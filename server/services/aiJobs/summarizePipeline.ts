import type { AiJobParams, AiJobPhase, AiJobResultMeta } from '../../../shared/aiJobs'
import { countWords } from '../../../shared/aiJobs'
import type { AiModelTier } from '../../modelTierMapping'
import { resolveMaximumModelSpec } from '../../modelTierMapping'
import type { AiUsageContext, LlmCallResult } from '../../ai/types'
import { runAiFeature } from '../../ai/runAiFeature'
import { tierToMode } from '../../ai/aiRouter'
import { chunkTextByTokens } from '../../../src/utils/chunkText'
import { estimateTokensFromText } from '../../../src/utils/estimateCredits'
import {
  DEFAULT_SUMMARY_MAX_TOKENS,
  compressionTask,
  exceedsHardLimit,
  resolveLengthBudget,
} from './lengthControl'
import {
  appendDirections,
  buildJobUserPrompt,
  chunkMapTask,
  genericSummaryTask,
  structuredSummaryTask,
  summarySystemPrompt,
} from './summarizePrompts'

/**
 * Staged summarize pipeline for persisted AI jobs.
 *
 * normalize → analyze (size/shape) → [chunk → map → merge] → synthesize →
 * [compress when over the hard word limit] — every LLM call goes through
 * `runAiFeature` (PHI guard + credit accounting intact; this module never
 * touches `callLlm` directly).
 *
 * Model routing:
 *   - chunk map stage → `fast` tier (cheap compaction, content passes through
 *     a second synthesis anyway)
 *   - final synthesis + compression → the requested tier (clinical summaries
 *     and long documents default to `thorough` at job creation)
 */

/** Inputs above this estimated token count run the chunk/map/merge pipeline. */
export const CHUNK_PIPELINE_THRESHOLD_TOKENS = 12_000
/** Per-chunk budget for the map stage. */
export const MAP_CHUNK_TOKENS = 6_000
/** Never run more than one automatic compression pass (cost guard). */
const MAX_COMPRESSION_RUNS = 1

export interface PipelineCallbacks {
  /** Persist a phase/progress update. Failures must not abort the pipeline. */
  onPhase: (phase: AiJobPhase, progressCurrent?: number, progressTotal?: number) => Promise<void>
  /** Return true when the user cancelled the job (checked between stages). */
  isCancelled: () => Promise<boolean>
}

export interface PipelineInput {
  inputText: string
  params: AiJobParams
  featureKey: string
  usageContext: AiUsageContext
  caseRef: string | null
}

export interface PipelineOutput {
  text: string
  meta: AiJobResultMeta
}

export class PipelineCancelledError extends Error {
  constructor() {
    super('cancelled')
    this.name = 'PipelineCancelledError'
  }
}

/** Normalize pasted clinical text: line endings, soft hyphens, spacing. */
export function normalizeInputText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/­/g, '') // soft hyphens from PDF copy/paste
    .replace(/-\n(?=[a-zäöüß])/g, '') // de-hyphenate hard-wrapped words
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

function resolveTier(params: AiJobParams): AiModelTier {
  if (params.maximum) return 'thorough'
  if (params.tier === 'fast' || params.tier === 'standard' || params.tier === 'thorough') {
    return params.tier
  }
  return 'thorough'
}

async function throwIfCancelled(cb: PipelineCallbacks): Promise<void> {
  if (await cb.isCancelled()) throw new PipelineCancelledError()
}

interface StageRecord {
  stage: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
}

function recordStage(stages: StageRecord[], stage: string, result: LlmCallResult): void {
  stages.push({
    stage,
    provider: result.provider,
    model: result.model,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    latencyMs: result.latencyMs,
  })
}

export async function runSummarizePipeline(
  input: PipelineInput,
  cb: PipelineCallbacks,
): Promise<PipelineOutput> {
  const startedAt = Date.now()
  const stages: StageRecord[] = []

  // ── Analyze ───────────────────────────────────────────────────────────────
  await cb.onPhase('analyzing')
  const text = normalizeInputText(input.inputText)
  const inputTokens = estimateTokensFromText(text)
  const tier = resolveTier(input.params)
  const mode = input.params.mode ?? tierToMode(tier)
  const maximumModel = input.params.maximum ? resolveMaximumModelSpec() : undefined
  const budget = resolveLengthBudget(input.params.length)

  const task = appendDirections(
    input.params.structured ? structuredSummaryTask(budget) : genericSummaryTask(budget),
    input.params,
  )
  const systemPrompt = summarySystemPrompt(input.params.language)

  // ── Map stage for very long inputs ────────────────────────────────────────
  let synthesisSource = text
  let chunkCount = 1
  let mapModel: string | undefined

  if (inputTokens > CHUNK_PIPELINE_THRESHOLD_TOKENS) {
    const chunks = chunkTextByTokens(text, MAP_CHUNK_TOKENS, 'Teil')
    chunkCount = chunks.length
    await cb.onPhase('summarizing', 0, chunks.length)

    const mapNotes: string[] = []
    for (const [index, chunk] of chunks.entries()) {
      await throwIfCancelled(cb)
      const mapResult = await runAiFeature({
        featureKey: input.featureKey,
        mode: 'economic',
        tier: 'fast',
        systemPrompt,
        userPrompt: buildJobUserPrompt(chunkMapTask(), chunk.content),
        maxTokens: 2_000,
        usageContext: {
          ...input.usageContext,
          metadata: { ...input.usageContext.metadata, stage: 'map', chunk: index + 1 },
        },
        caseRef: input.caseRef,
      })
      recordStage(stages, `map:${index + 1}`, mapResult)
      mapModel = mapResult.model
      mapNotes.push(`[${chunk.label}]\n${mapResult.text.trim()}`)
      await cb.onPhase('summarizing', index + 1, chunks.length)
    }

    // Merge: plain concatenation — dedup happens in the synthesis prompt
    // ("state each fact once"), which sees all notes together.
    synthesisSource = mapNotes.join('\n\n')
  }

  // ── Final synthesis ───────────────────────────────────────────────────────
  await throwIfCancelled(cb)
  await cb.onPhase('synthesizing')
  const synthesis = await runAiFeature({
    featureKey: input.featureKey,
    mode,
    tier,
    model: maximumModel,
    systemPrompt,
    userPrompt: buildJobUserPrompt(task, synthesisSource),
    maxTokens: budget?.maxTokens ?? DEFAULT_SUMMARY_MAX_TOKENS,
    usageContext: {
      ...input.usageContext,
      metadata: { ...input.usageContext.metadata, stage: 'synthesis', chunkCount },
    },
    caseRef: input.caseRef,
  })
  recordStage(stages, 'synthesis', synthesis)
  let resultText = synthesis.text.trim()
  let compressionRuns = 0

  // ── Automatic compression pass when over the hard limit ──────────────────
  if (budget) {
    while (exceedsHardLimit(resultText, budget) && compressionRuns < MAX_COMPRESSION_RUNS) {
      await throwIfCancelled(cb)
      await cb.onPhase('compressing')
      compressionRuns += 1
      const compressed = await runAiFeature({
        featureKey: input.featureKey,
        mode,
        tier,
        model: maximumModel,
        systemPrompt,
        userPrompt: buildJobUserPrompt(
          appendDirections(compressionTask(budget), input.params),
          resultText,
        ),
        maxTokens: budget.maxTokens,
        usageContext: {
          ...input.usageContext,
          metadata: { ...input.usageContext.metadata, stage: 'compression' },
        },
        caseRef: input.caseRef,
      })
      recordStage(stages, 'compression', compressed)
      // Keep the shorter text — a failed compression must not make things worse.
      if (countWords(compressed.text) < countWords(resultText)) {
        resultText = compressed.text.trim()
      }
    }
  }

  return {
    text: resultText,
    meta: {
      provider: synthesis.provider,
      model: synthesis.model,
      tierUsed: tier,
      chunkCount,
      mapModel,
      words: countWords(resultText),
      targetWords: budget?.targetWords ?? null,
      hardLimitWords: budget?.hardLimitWords ?? null,
      compressionPassed: budget ? !exceedsHardLimit(resultText, budget) : true,
      compressionRuns,
      durationMs: Date.now() - startedAt,
      stages,
    },
  }
}
