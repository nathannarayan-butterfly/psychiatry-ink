import type { DiscussVoiceTranscript } from '../../src/types/discussCase'
import { deidentifyText } from './discussCaseDeidentify'

/**
 * Build a de-identified `machine` transcript record from raw transcription
 * output. The text is run through the authoritative server-side redactor
 * ({@link deidentifyText}) so no patient identifier the model may have
 * surfaced from the audio is ever persisted or shown — exactly the same trust
 * boundary the ask-AI path enforces on free text.
 */
export function buildMachineVoiceTranscript(input: {
  rawText: string
  model: string | null
  language: string | null
  now?: Date
}): DiscussVoiceTranscript {
  const safeText = deidentifyText(input.rawText ?? '').trim()
  return {
    text: safeText,
    status: 'machine',
    model: input.model ?? null,
    language: input.language ?? null,
    createdAt: (input.now ?? new Date()).toISOString(),
    editedAt: null,
    editedBy: null,
  }
}

/**
 * Apply a clinician correction to an existing transcript, preserving the
 * machine provenance metadata while flipping the status to `edited`. The
 * corrected text is still redacted defensively in case the clinician pasted
 * identifying text.
 */
export function applyTranscriptCorrection(input: {
  existing: DiscussVoiceTranscript | null
  text: string
  editedBy: string
  now?: Date
}): DiscussVoiceTranscript {
  const safeText = deidentifyText(input.text ?? '').trim()
  const now = (input.now ?? new Date()).toISOString()
  return {
    text: safeText,
    status: 'edited',
    model: input.existing?.model ?? null,
    language: input.existing?.language ?? null,
    createdAt: input.existing?.createdAt ?? now,
    editedAt: now,
    editedBy: input.editedBy,
  }
}
