/**
 * Persist accepted CI findings as a formal case document (Dokumente archive).
 */

import type { UiLanguage } from '../../types/settings'
import type { ClinicalIntelligenceRunResponse } from '../../types/clinicalIntelligence'
import { appendDokument, type DokumentEntry } from '../dokumenteArchive'
import {
  CI_DOCUMENT_PAGE_TYPE,
  formatCiAcceptedDocumentContent,
  formatCiAcceptedDocumentTitle,
  type CiAcceptedDocumentLabels,
} from './formatAcceptedDocument'

export function saveCiAcceptedToDokumente(params: {
  caseId: string
  run: ClinicalIntelligenceRunResponse
  clinicianComment: string
  savedAt: string
  labels: CiAcceptedDocumentLabels
  locale: UiLanguage
}): DokumentEntry {
  const content = formatCiAcceptedDocumentContent(params)
  const title = formatCiAcceptedDocumentTitle(params.savedAt, params.locale, params.labels.titlePrefix)

  return appendDokument(params.caseId, {
    category: 'formulare',
    title,
    content,
    date: params.savedAt,
    source: 'ai-accepted',
    pageType: CI_DOCUMENT_PAGE_TYPE,
    sectionLabel: params.labels.titlePrefix,
  })
}
