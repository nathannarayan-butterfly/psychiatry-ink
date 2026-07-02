import {
  countWords,
  resolveHardLimitWords,
  resolveTargetWords,
  type AiOutputLengthSpec,
} from '../../../shared/aiJobs'

/**
 * Output-length enforcement for summarize-type generations.
 *
 * The word target comes from the user's length mode (Kurz/Mittel/Gründlich or
 * a custom word count). The model gets (a) an explicit word budget in the
 * prompt and (b) a max-token cap with headroom; if the result still exceeds
 * the hard limit (~ +13% over target), the runner performs one automatic
 * compression pass before the result is shown.
 */

export interface ResolvedLengthBudget {
  targetWords: number
  hardLimitWords: number
  /** Output token cap handed to the provider (headroom included). */
  maxTokens: number
}

/**
 * German clinical prose runs ~1.7–2 tokens per word on current tokenizers;
 * 2.4 gives headroom so the cap trims runaways without truncating a valid
 * result mid-sentence (truncation is worse than one compression pass).
 */
const TOKENS_PER_WORD_HEADROOM = 2.4

/** Cap for uncapped (no length spec) summarize runs, in tokens. */
export const DEFAULT_SUMMARY_MAX_TOKENS = 8_000

export function resolveLengthBudget(
  spec: AiOutputLengthSpec | undefined,
): ResolvedLengthBudget | null {
  const targetWords = resolveTargetWords(spec)
  if (!targetWords) return null
  const hardLimitWords = resolveHardLimitWords(targetWords)
  return {
    targetWords,
    hardLimitWords,
    maxTokens: Math.ceil(hardLimitWords * TOKENS_PER_WORD_HEADROOM),
  }
}

/** Prompt fragment stating the word budget (English keeps prompts token-minimal). */
export function lengthInstruction(budget: ResolvedLengthBudget): string {
  return (
    `Strict length budget: target ${budget.targetWords} words, ` +
    `never exceed ${budget.hardLimitWords} words. ` +
    `Prefer dense clinical wording over narrative filler; cut repetition first.`
  )
}

export function exceedsHardLimit(text: string, budget: ResolvedLengthBudget): boolean {
  return countWords(text) > budget.hardLimitWords
}

/** Task prompt for the automatic compression pass. */
export function compressionTask(budget: ResolvedLengthBudget): string {
  return (
    `Compress the following clinical text to at most ${budget.targetWords} words ` +
    `(hard maximum ${budget.hardLimitWords}). Keep every clinically relevant fact, ` +
    `medication, dose, risk and recommendation; remove repetition, filler and ` +
    `narrative padding. Keep the existing headings and structure. ` +
    `Output only the compressed text.`
  )
}
