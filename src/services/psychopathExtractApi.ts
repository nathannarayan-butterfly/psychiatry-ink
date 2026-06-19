import { clinicalApiFetch, parseClinicalApiError } from './clinicalApiFetch'
import {
  PsychopathExtractResponseSchema,
  type PsychopathExtractRequest,
  type PsychopathExtractResponse,
} from '../schemas/psychopath/extraction'

/**
 * Request AI structured extraction for de-identified PPB text.
 *
 * Caller must de-identify text and only invoke when the feature flag is enabled.
 */
export async function requestPsychopathExtract(
  request: PsychopathExtractRequest,
): Promise<PsychopathExtractResponse> {
  const response = await clinicalApiFetch('/api/psychopath/extract', {
    method: 'POST',
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw await parseClinicalApiError(response, 'Psychopathology extraction failed')
  }

  const parsed = PsychopathExtractResponseSchema.safeParse(await response.json())
  if (!parsed.success) {
    throw new Error('KI-Antwort hatte ein ungültiges Format')
  }
  return parsed.data
}
