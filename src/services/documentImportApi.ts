import { clinicalApiFetch, parseClinicalApiError } from './clinicalApiFetch'
import { resolveLlmRequestForTask } from '../utils/resolveAiModel'
import {
  ImportMappingResponseSchema,
  ImportAnalyzeResponseSchema,
  type ImportMappingRequest,
  type ImportMappingSuggestion,
  type ImportAnalyzeRequest,
  type ImportAnalyzeResponse,
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
  const llm = resolveLlmRequestForTask('document_import')
  const response = await clinicalApiFetch('/api/document-import/suggest-mapping', {
    method: 'POST',
    body: JSON.stringify({ ...request, ...llm }),
  })

  if (!response.ok) {
    await parseClinicalApiError(response, 'Document import mapping failed')
  }

  const parsed = ImportMappingResponseSchema.safeParse(await response.json())
  if (!parsed.success) return []
  return parsed.data.suggestions
}

/**
 * Post-parse analyze — mapping assist + Übersicht widget suggestions from
 * de-identified parse metadata only.
 */
export async function requestImportAnalyze(
  request: ImportAnalyzeRequest,
): Promise<ImportAnalyzeResponse> {
  const llm = resolveLlmRequestForTask('document_import')
  const response = await clinicalApiFetch('/api/document-import/analyze', {
    method: 'POST',
    body: JSON.stringify({ ...request, ...llm }),
  })

  if (!response.ok) {
    await parseClinicalApiError(response, 'Document import analyze failed')
  }

  const parsed = ImportAnalyzeResponseSchema.safeParse(await response.json())
  if (!parsed.success) {
    return { mappingSuggestions: [], overviewWidgetSuggestions: [], patientSubheading: undefined }
  }
  return parsed.data
}
