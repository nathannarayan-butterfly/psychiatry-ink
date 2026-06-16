import { clinicalApiFetch, getClinicalApiLanguage, parseClinicalApiError } from './clinicalApiFetch'

export interface InlineEditRequest {
  caseId?: string
  selectedText: string
  contextBefore: string
  contextAfter: string
  instruction: string
  tier?: 'fast' | 'standard' | 'thorough'
  language?: string
}

export interface InlineEditResponse {
  editedText: string
  model: { provider: string; modelId: string }
  mock: boolean
  disclaimer: string
}

export interface TranscribeInstructionResponse {
  /** Transcribed instruction. Empty when the server is in mock mode. */
  text: string
  mock: boolean
}

/** Ask the server to rewrite the selected passage per the instruction. */
export async function requestInlineEdit(input: InlineEditRequest): Promise<InlineEditResponse> {
  const response = await clinicalApiFetch('/api/inline-edit', {
    method: 'POST',
    body: JSON.stringify({
      caseId: input.caseId,
      selectedText: input.selectedText,
      contextBefore: input.contextBefore,
      contextAfter: input.contextAfter,
      instruction: input.instruction,
      tier: input.tier ?? 'fast',
      language: input.language ?? getClinicalApiLanguage(),
    }),
  })
  if (!response.ok) await parseClinicalApiError(response, 'KI-Bearbeitung fehlgeschlagen')
  return (await response.json()) as InlineEditResponse
}

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

/**
 * Transcribe a spoken instruction via the trusted server-side provider.
 * Returns `{ mock: true, text: '' }` when no provider key is configured — the
 * caller should then fall back to a typed instruction.
 */
export async function transcribeInstruction(
  blob: Blob,
  caseId?: string,
): Promise<TranscribeInstructionResponse> {
  const audioBase64 = await blobToBase64(blob)
  const response = await clinicalApiFetch('/api/inline-edit/transcribe', {
    method: 'POST',
    body: JSON.stringify({
      caseId,
      audioBase64,
      mimeType: blob.type || 'audio/webm',
    }),
  })
  if (!response.ok) await parseClinicalApiError(response, 'Transkription fehlgeschlagen')
  return (await response.json()) as TranscribeInstructionResponse
}
