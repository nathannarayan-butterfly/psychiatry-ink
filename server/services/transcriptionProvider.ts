import type { ClinicalLanguage } from '../utils/resolveClinicalLanguage'

const OPENAI_TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL ?? 'gpt-4o-transcribe'

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
  const extension = extensionForMimeType(mimeType)
  const blob = new Blob([audioBuffer], { type: mimeType })
  const formData = new FormData()
  formData.append('file', blob, `recording.${extension}`)
  formData.append('model', OPENAI_TRANSCRIBE_MODEL)
  const language = options?.language ?? null
  if (language) {
    formData.append('language', language)
  }

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
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
