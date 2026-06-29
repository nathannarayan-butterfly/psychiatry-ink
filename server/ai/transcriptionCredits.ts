/**
 * Dictation (speech-to-text) credit metering.
 *
 * Replaces the previous flat 5-credit transcription charge with a length-based
 * charge so a short dictation costs less than a long one. The amount scales
 * with the produced transcript length (≈ chars/4 tokens) via the shared
 * `transcription` credit rule, with an audio-duration floor so a long but
 * low-token recording still reflects its processing cost.
 *
 * @module transcriptionCredits
 */

import { estimateCredits, estimateTokensFromText } from './creditCalculator'

/** Minimum charge for any successful dictation (also the pre-call affordability floor). */
export const MIN_DICTATION_CREDITS = 1

/** ~1 credit per started 2 minutes of audio. */
const SECONDS_PER_DURATION_CREDIT = 120

/**
 * Credits to charge for a dictation, metered by transcript LENGTH (tokens) via
 * the `transcription` rule, taking the larger of the token-based and the
 * audio-duration-based estimate. Always at least {@link MIN_DICTATION_CREDITS}.
 */
export function dictationCreditsForTranscript(
  transcript: string,
  audioSeconds?: number | null,
): number {
  const tokens = estimateTokensFromText(transcript ?? '')
  const fromTokens = estimateCredits('transcription', 'economic', tokens)
  const fromDuration =
    typeof audioSeconds === 'number' && audioSeconds > 0
      ? Math.ceil(audioSeconds / SECONDS_PER_DURATION_CREDIT)
      : 0
  return Math.max(MIN_DICTATION_CREDITS, fromTokens, fromDuration)
}
