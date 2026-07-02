/**
 * Shared contract for persisted AI generation jobs and output-length control.
 * Imported by both the React client (`src/`) and the Express server
 * (`server/`), like `shared/improveOnlyPrompt.ts`.
 */

export type AiJobKind = 'summarize' | 'workspace_generate'

export type AiJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'

/**
 * Real pipeline phases (user-facing step text is translated from these keys).
 * No fake percentages — `progressCurrent/progressTotal` carry real chunk
 * counts when known, 0/0 otherwise.
 */
export type AiJobPhase =
  | 'queued'
  | 'analyzing' // normalize input, detect document shape, chunk
  | 'summarizing' // per-chunk compact summaries (map stage)
  | 'synthesizing' // merged final synthesis
  | 'compressing' // automatic length-enforcement pass
  | 'saving' // persisting result / auto-save to notes
  | 'done'

export const AI_JOB_TERMINAL_STATUSES: readonly AiJobStatus[] = [
  'succeeded',
  'failed',
  'cancelled',
]

export function isTerminalAiJobStatus(status: AiJobStatus): boolean {
  return AI_JOB_TERMINAL_STATUSES.includes(status)
}

// ---------------------------------------------------------------------------
// Output length control
// ---------------------------------------------------------------------------

/**
 * User-selectable output length for summarize-type generations. Distinct from
 * the model-quality mode (economic/standard/gruendlich) even though "gruendlich"
 * appears in both — this one bounds the OUTPUT SIZE, the other picks the model.
 */
export type AiOutputLengthMode = 'kurz' | 'mittel' | 'gruendlich' | 'custom'

/** Default word targets per length mode (German clinical prose). */
export const LENGTH_MODE_TARGET_WORDS: Record<Exclude<AiOutputLengthMode, 'custom'>, number> = {
  kurz: 150,
  mittel: 400,
  gruendlich: 1000,
}

/**
 * Hard ceiling factor over the word target. Example from the product spec:
 * target 1500 words → hard limit ≈ 1700 (~13% headroom). If the model exceeds
 * the hard limit, an automatic compression pass runs before the result is
 * shown.
 */
export const LENGTH_HARD_LIMIT_FACTOR = 1.13

/** Bounds for the custom word target input. */
export const CUSTOM_TARGET_WORDS_MIN = 50
export const CUSTOM_TARGET_WORDS_MAX = 5000

export interface AiOutputLengthSpec {
  mode: AiOutputLengthMode
  /** Required when mode === 'custom'; ignored otherwise. */
  customTargetWords?: number
}

export function resolveTargetWords(spec: AiOutputLengthSpec | undefined): number | null {
  if (!spec) return null
  if (spec.mode === 'custom') {
    const raw = Math.round(spec.customTargetWords ?? 0)
    if (!Number.isFinite(raw) || raw <= 0) return null
    return Math.min(Math.max(raw, CUSTOM_TARGET_WORDS_MIN), CUSTOM_TARGET_WORDS_MAX)
  }
  return LENGTH_MODE_TARGET_WORDS[spec.mode]
}

export function resolveHardLimitWords(targetWords: number): number {
  return Math.ceil(targetWords * LENGTH_HARD_LIMIT_FACTOR)
}

/** Whitespace word count; adequate for German/English clinical prose. */
export function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

// ---------------------------------------------------------------------------
// Job DTO (API shape, camelCase)
// ---------------------------------------------------------------------------

export interface AiJobParams {
  tier?: 'fast' | 'standard' | 'thorough'
  mode?: 'economic' | 'standard' | 'gruendlich'
  maximum?: boolean
  language?: 'de' | 'en' | 'fr' | 'es'
  componentId?: string
  tool?: string
  sectionLabel?: string
  length?: AiOutputLengthSpec
  /** Per-run clinician directions ("Zusätzliche Anweisungen"). */
  directions?: string
  /** Structured clinical course summary layout (Therapie und Verlauf). */
  structured?: boolean
  /** Auto-save the result to "Meine Notizen" on completion (patient-less). */
  autoSaveNote?: boolean
}

export interface AiJobResultMeta {
  provider?: string
  model?: string
  tierUsed?: string
  chunkCount?: number
  mapModel?: string
  words?: number
  targetWords?: number | null
  hardLimitWords?: number | null
  compressionPassed?: boolean
  compressionRuns?: number
  durationMs?: number
  stages?: Array<{
    stage: string
    provider: string
    model: string
    inputTokens: number
    outputTokens: number
    latencyMs: number
  }>
}

export interface AiJobDto {
  id: string
  caseId: string | null
  kind: AiJobKind
  featureKey: string
  status: AiJobStatus
  phase: AiJobPhase
  progressCurrent: number
  progressTotal: number
  params: AiJobParams
  inputChars: number
  resultText: string | null
  resultMeta: AiJobResultMeta | null
  errorCode: string | null
  errorMessage: string | null
  seen: boolean
  savedNoteId: string | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  updatedAt: string
}
