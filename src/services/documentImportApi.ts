import { clinicalApiFetch, parseClinicalApiError } from './clinicalApiFetch'
import {
  ImportMappingResponseSchema,
  type ImportMappingRequest,
  type ImportMappingSuggestion,
} from '../schemas/documentImport/aiSuggestion'

/**
 * Request AI mapping suggestions for de-identified candidate snippets.
 *
 * The caller is responsible for de-identifying text and for only invoking this
 * when the AI mapping feature flag is enabled. Suggestions are advisory.
 */
export async function requestImportMappingSuggestions(
  request: ImportMappingRequest,
): Promise<ImportMappingSuggestion[]> {
  const response = await clinicalApiFetch('/api/document-import/suggest-mapping', {
    method: 'POST',
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    await parseClinicalApiError(response, 'Document import mapping failed')
  }

  const parsed = ImportMappingResponseSchema.safeParse(await response.json())
  if (!parsed.success) return []
  return parsed.data.suggestions
}
