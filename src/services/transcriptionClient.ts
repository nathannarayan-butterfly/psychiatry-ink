import type { UiLanguage } from '../types/settings'
import { API_BASE, InsufficientCreditsError } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import { getClinicalApiLanguage } from './clinicalApiFetch'

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Failed to read audio'))
        return
      }
      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }
    reader.onerror = () => reject(new Error('Failed to read audio'))
    reader.readAsDataURL(blob)
  })
}

export async function transcribeAudio(
  blob: Blob,
  language?: UiLanguage,
): Promise<string> {
  // Never ship an empty/zero-byte capture — it produces a garbage or empty
  // transcript and still costs a base credit. Surface it as a recoverable error.
  if (blob.size === 0) {
    throw new Error('empty_recording')
  }

  const audioBase64 = await blobToBase64(blob)
  const resolvedLanguage = language ?? getClinicalApiLanguage()

  const authHeaders = await getAuthHeaders()
  const response = await fetch(`${API_BASE}/api/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type || 'audio/webm',
      language: resolvedLanguage,
    }),
  })

  if (response.status === 402) {
    throw new InsufficientCreditsError()
  }

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Transcription failed (${response.status})`)
  }

  const data = (await response.json()) as { text: string; balance?: number }
  return data.text
}
