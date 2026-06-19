/**
 * Post-parse AI orchestration (flag-gated, OFF by default).
 *
 * Runs immediately after upload + parse + de-identification. Sends only structural
 * metadata to the server; returns mapping suggestions and Übersicht widget hints.
 * Nothing is persisted until the clinician accepts in the import review step.
 */
import type { ClinicalImportCandidate, ClinicalImportEnvelope } from '../../schemas/documentImport/envelope'
import type {
  ImportMappingSuggestion,
  OverviewWidgetSuggestion,
} from '../../schemas/documentImport/aiSuggestion'
import type { UiLanguage } from '../../types/settings'
import { isDocumentImportAiMappingEnabled } from '../featureFlags'
import { isEnterpriseOrgHierarchyEnabled } from '../featureFlags'
import { requestImportAnalyze } from '../../services/documentImportApi'
import { buildAnalyzeMetadata, buildMappingItems, shouldRunPostParseAnalyze } from './buildAnalyzeMetadata'

export interface ImportAnalyzeOptions {
  language: UiLanguage
  patientNames?: string[]
  columns?: string[]
  requestFn?: typeof requestImportAnalyze
}

export interface ImportAnalyzeResult {
  enabled: boolean
  ran: boolean
  mappingSuggestions: ImportMappingSuggestion[]
  overviewWidgetSuggestions: OverviewWidgetSuggestion[]
  patientSubheading?: string
}

export async function analyzeImport(
  envelope: ClinicalImportEnvelope,
  candidates: ClinicalImportCandidate[],
  options: ImportAnalyzeOptions,
): Promise<ImportAnalyzeResult> {
  const empty: ImportAnalyzeResult = {
    enabled: false,
    ran: false,
    mappingSuggestions: [],
    overviewWidgetSuggestions: [],
    patientSubheading: undefined,
  }

  if (!isDocumentImportAiMappingEnabled()) return empty
  if (!shouldRunPostParseAnalyze(candidates)) {
    return { ...empty, enabled: true, ran: false }
  }

  const metadata = buildAnalyzeMetadata(envelope, candidates, {
    patientNames: options.patientNames,
    columns: options.columns,
  })
  const mappingItems = buildMappingItems(candidates, { patientNames: options.patientNames })

  const requestFn = options.requestFn ?? requestImportAnalyze
  const response = await requestFn({
    language: options.language,
    metadata,
    mappingItems,
    edition: isEnterpriseOrgHierarchyEnabled() ? 'enterprise' : 'standard',
  })

  return {
    enabled: true,
    ran: true,
    mappingSuggestions: response.mappingSuggestions,
    overviewWidgetSuggestions: response.overviewWidgetSuggestions,
    patientSubheading: response.patientSubheading,
  }
}