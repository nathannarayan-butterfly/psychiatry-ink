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
 * Build a PHI-safe structural hint for AI classification (headings / labels only).
 */
function structuralHintForCandidate(
  candidate: ClinicalImportEnvelope['candidates'][number],
): string {
  const data = candidate.data as Record<string, unknown>
  const parts: string[] = []
  if (candidate.sourceLocation.section) parts.push(`Abschnitt: ${candidate.sourceLocation.section}`)
  if (typeof data.title === 'string' && data.title.trim()) parts.push(`Titel: ${data.title.trim()}`)
  if (typeof data.sectionLabel === 'string' && data.sectionLabel.trim()) {
    parts.push(`Label: ${data.sectionLabel.trim()}`)
  }
  if (typeof data.panelLabel === 'string' && data.panelLabel.trim()) {
    parts.push(`Panel: ${data.panelLabel.trim()}`)
  }
  if (parts.length > 0) return parts.join(' · ')
  return `Modul: ${candidate.module}`
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
    if (candidate.confidence === 'high' && candidate.module !== 'document') continue
    const structural = structuralHintForCandidate(candidate)
    if (!structural.trim()) continue
    const { text: deidentifiedText } = deidentifyText(structural, { patientNames: options.patientNames })
    items.push({ candidateId: candidate.id, deidentifiedText, currentModule: candidate.module })
  }

  if (items.length === 0) return { enabled: true, suggestions: [] }

  const requestFn =
    options.requestFn ??
    ((reqItems, language) => requestImportMappingSuggestions({ language, items: reqItems }))

  const suggestions = await requestFn(items, options.language)
  return { enabled: true, suggestions }
}

