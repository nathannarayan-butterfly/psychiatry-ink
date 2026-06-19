/**
 * AI-assisted mapping orchestration (flag-gated, OFF by default).
 *
 * Safety contract:
 *   - When the flag is off, this never touches the network and returns immediately.
 *   - Only de-identified text is ever sent (see `deidentifyText`).
 *   - The result is a list of *suggestions*; callers apply them as `aiSuggested`
 *     candidate remaps that STILL require explicit clinician acceptance. AI output
 *     is never persisted into the chart automatically.
 */
import type { ClinicalImportEnvelope } from '../../schemas/documentImport/envelope'
import type {
  ImportMappingRequestItem,
  ImportMappingSuggestion,
} from '../../schemas/documentImport/aiSuggestion'
import type { UiLanguage } from '../../types/settings'
import { isDocumentImportAiMappingEnabled } from '../featureFlags'
import { requestImportMappingSuggestions } from '../../services/documentImportApi'
import { deidentifyText } from './deidentify'

export interface AiMappingOptions {
  language: UiLanguage
  patientNames?: string[]
  /** Test/override seam for the network call. */
  requestFn?: (items: ImportMappingRequestItem[], language: UiLanguage) => Promise<ImportMappingSuggestion[]>
}

export interface AiMappingResult {
  enabled: boolean
  suggestions: ImportMappingSuggestion[]
}

/**
 * Build de-identified suggestion requests for the ambiguous candidates in an
 * envelope (low-confidence and/or `document` fallbacks benefit most).
 */
export async function suggestMappings(
  envelope: ClinicalImportEnvelope,
  options: AiMappingOptions,
): Promise<AiMappingResult> {
  if (!isDocumentImportAiMappingEnabled()) {
    return { enabled: false, suggestions: [] }
  }

  const items: ImportMappingRequestItem[] = []
  for (const candidate of envelope.candidates) {
    if (candidate.confidence === 'high') continue
    const raw = candidate.rawText ?? extractCandidateText(candidate)
    const text = raw.trim()
    if (!text) continue
    const { text: deidentifiedText } = deidentifyText(text, { patientNames: options.patientNames })
    items.push({ candidateId: candidate.id, deidentifiedText, currentModule: candidate.module })
  }

  if (items.length === 0) return { enabled: true, suggestions: [] }

  const requestFn =
    options.requestFn ??
    ((reqItems, language) => requestImportMappingSuggestions({ language, items: reqItems }))

  const suggestions = await requestFn(items, options.language)
  return { enabled: true, suggestions }
}

function extractCandidateText(candidate: ClinicalImportEnvelope['candidates'][number]): string {
  const data = candidate.data as Record<string, unknown>
  if (typeof data.text === 'string') return data.text
  if (typeof data.label === 'string') return data.label
  if (typeof data.substance === 'string') return data.substance
  if (typeof data.title === 'string') return data.title
  return ''
}
