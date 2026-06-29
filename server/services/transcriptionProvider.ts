import type { ClinicalLanguage } from '../utils/resolveClinicalLanguage'
import { fetchWithTimeout } from '../utils/httpTimeout'

const OPENAI_TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL ?? 'gpt-4o-transcribe'

/**
 * Strip codec/parameter suffixes (e.g. `audio/webm;codecs=opus`) down to the
 * canonical container type (`audio/webm`). MediaRecorder labels its output with
 * the full parameterised type, but OpenAI's transcription endpoint sniffs the
 * format from the upload's filename extension and is most reliable when the
 * multipart part's Content-Type is the clean container type rather than a
 * parameterised one. A mismatch between a parameterised Content-Type and the
 * filename extension is a classic cause of garbled/empty transcripts.
 */
function canonicalAudioMimeType(mimeType: string): string {
  const base = mimeType.split(';')[0]?.trim().toLowerCase()
  return base || 'audio/webm'
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3'
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a'
  return 'webm'
}

/** Rough duration estimate from buffer size when provider omits duration. */
function estimateAudioSeconds(buffer: Buffer, mimeType: string): number {
  if (mimeType.includes('webm') || mimeType.includes('ogg')) {
    return Math.max(1, buffer.length / 16_000)
  }
  return Math.max(1, buffer.length / 32_000)
}

export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  mimeType = 'audio/webm',
  options?: {
    userId?: string | null
    organisationId?: string | null
    caseId?: string | null
    /** ISO-639-1 hint for OpenAI transcription (de, en, fr, es). */
    language?: ClinicalLanguage | null
  },
): Promise<{
  text: string
  model: string
  provider: string
  audioSeconds: number
  requestId: string | null
  latencyMs: number
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('Set OPENAI_API_KEY in .env for dictation. Restart dev:server after changes.')
  }

  const started = Date.now()
  // Normalise the container type so the multipart Content-Type and the filename
  // extension OpenAI uses for format detection always agree.
  const uploadMimeType = canonicalAudioMimeType(mimeType)
  const extension = extensionForMimeType(uploadMimeType)
  const blob = new Blob([audioBuffer], { type: uploadMimeType })
  const formData = new FormData()
  formData.append('file', blob, `recording.${extension}`)
  formData.append('model', OPENAI_TRANSCRIBE_MODEL)
  const language = options?.language ?? null
  if (language) {
    // ISO-639-1 hint (de/en/fr/es) — keeps the model from mis-detecting the
    // spoken language, the most common cause of a "wrong language" transcript.
    formData.append('language', language)
  }

  const response = await fetchWithTimeout('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
    timeoutMs: Number(process.env.TRANSCRIBE_TIMEOUT_MS ?? 60_000),
    label: 'OpenAI transcription',
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Transcription failed (${response.status}): ${detail.slice(0, 240)}`)
  }

  const data = (await response.json()) as { text?: string; duration?: number }
  const text = data.text?.trim()
  if (!text) throw new Error('Transcription returned empty text')

  const audioSeconds = data.duration ?? estimateAudioSeconds(audioBuffer, mimeType)
  const latencyMs = Date.now() - started

  if (options?.userId || options?.organisationId) {
    const { recordAiUsageLog } = await import('../ai/usage/recordAiUsageLog')
    void recordAiUsageLog({
      userId: options.userId,
      organisationId: options.organisationId,
      caseId: options.caseId,
      featureKey: 'transcription',
      provider: 'openai',
      model: OPENAI_TRANSCRIBE_MODEL,
      requestKind: 'transcription',
      audioSeconds,
      success: true,
      latencyMs,
    })
  }

  return {
    text,
    model: OPENAI_TRANSCRIBE_MODEL,
    provider: 'openai',
    audioSeconds,
    requestId: null,
    latencyMs,
  }
}
