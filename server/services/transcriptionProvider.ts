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

export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  mimeType = 'audio/webm',
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('Set OPENAI_API_KEY in .env for dictation. Restart dev:server after changes.')
  }

  const extension = extensionForMimeType(mimeType)
  const blob = new Blob([audioBuffer], { type: mimeType })
  const formData = new FormData()
  formData.append('file', blob, `recording.${extension}`)
  formData.append('model', OPENAI_TRANSCRIBE_MODEL)

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

  const data = (await response.json()) as { text?: string }
  const text = data.text?.trim()
  if (!text) throw new Error('Transcription returned empty text')

  return { text, model: OPENAI_TRANSCRIBE_MODEL }
}
