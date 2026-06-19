/**
 * Build a PHI-safe structural metadata envelope for post-parse AI analyze.
 * Only headings, section labels, column names, module counts, and confidence —
 * never patient narrative or verbatim clinical text.
 */
import type {
  ClinicalImportCandidate,
  ClinicalImportEnvelope,
} from '../../schemas/documentImport/envelope'
import type { ImportAnalyzeCandidateSummary, ImportAnalyzeMetadata } from '../../schemas/documentImport/aiSuggestion'
import { deidentifyText } from './deidentify'
import { candidateNeedsReview } from './reviewHelpers'

function structuralHintForCandidate(candidate: ClinicalImportCandidate): string {
  const data = candidate.data as Record<string, unknown>
  const parts: string[] = []
  if (candidate.sourceLocation.section) parts.push(`Abschnitt: ${candidate.sourceLocation.section}`)
  if (candidate.sourceLocation.sheet) parts.push(`Blatt: ${candidate.sourceLocation.sheet}`)
  if (typeof data.title === 'string' && data.title.trim()) parts.push(`Titel: ${data.title.trim()}`)
  if (typeof data.sectionLabel === 'string' && data.sectionLabel.trim()) {
    parts.push(`Label: ${data.sectionLabel.trim()}`)
  }
  if (typeof data.panelLabel === 'string' && data.panelLabel.trim()) {
    parts.push(`Panel: ${data.panelLabel.trim()}`)
  }
  if (typeof data.label === 'string' && data.label.trim()) parts.push(`Label: ${data.label.trim()}`)
  if (typeof data.substance === 'string' && data.substance.trim()) {
    parts.push(`Substanz: ${data.substance.trim()}`)
  }
  if (typeof data.therapyTypeId === 'string' && data.therapyTypeId.trim()) {
    parts.push(`Therapieart: ${data.therapyTypeId.trim()}`)
  }
  if (parts.length > 0) return parts.join(' · ')
  return `Modul: ${candidate.module}`
}

function needsMappingAssist(candidate: ClinicalImportCandidate): boolean {
  if (candidate.confidence === 'low') return true
  if (candidate.module === 'document') return true
  if ((candidate.clarifications?.length ?? 0) > 0) return true
  return false
}

export interface BuildAnalyzeMetadataOptions {
  patientNames?: string[]
  /** Tabular column headers from parse (de-identified before inclusion). */
  columns?: string[]
}

export function buildAnalyzeMetadata(
  envelope: ClinicalImportEnvelope,
  candidates: ClinicalImportCandidate[],
  options: BuildAnalyzeMetadataOptions = {},
): ImportAnalyzeMetadata {
  const moduleCounts: Record<string, number> = {}
  for (const candidate of candidates) {
    moduleCounts[candidate.module] = (moduleCounts[candidate.module] ?? 0) + 1
  }

  const deidColumns = (options.columns ?? envelope.source.columns ?? []).map((col) => {
    const { text } = deidentifyText(col, { patientNames: options.patientNames })
    return text
  })

  const summaries: ImportAnalyzeCandidateSummary[] = []
  for (const candidate of candidates) {
    const rawHint = structuralHintForCandidate(candidate)
    const { text: structuralHint } = deidentifyText(rawHint, { patientNames: options.patientNames })
    if (!structuralHint.trim()) continue
    summaries.push({
      candidateId: candidate.id,
      module: candidate.module,
      confidence: candidate.confidence,
      structuralHint,
      needsMappingAssist: needsMappingAssist(candidate),
    })
  }

  return {
    detectedFormat: envelope.source.detectedFormat,
    parsingMode: envelope.parsingMode,
    columns: deidColumns.length > 0 ? deidColumns : undefined,
    sheetNames: envelope.source.sheetNames,
    moduleCounts,
    noticeCodes: envelope.notices.map((n) => n.code),
    candidates: summaries,
  }
}

/** Build de-identified mapping request items for uncertain candidates. */
export function buildMappingItems(
  candidates: ClinicalImportCandidate[],
  options: BuildAnalyzeMetadataOptions = {},
): { candidateId: string; deidentifiedText: string; currentModule: ClinicalImportCandidate['module'] }[] {
  const items: { candidateId: string; deidentifiedText: string; currentModule: ClinicalImportCandidate['module'] }[] =
    []
  for (const candidate of candidates) {
    if (!needsMappingAssist(candidate) && candidate.confidence === 'high' && candidate.module !== 'document') {
      continue
    }
    const rawHint = structuralHintForCandidate(candidate)
    const { text: deidentifiedText } = deidentifyText(rawHint, { patientNames: options.patientNames })
    if (!deidentifiedText.trim()) continue
    items.push({
      candidateId: candidate.id,
      deidentifiedText,
      currentModule: candidate.module,
    })
  }
  return items
}

/** True when post-parse AI analyze is worth calling (ambiguous parse or overview hints). */
export function shouldRunPostParseAnalyze(candidates: ClinicalImportCandidate[]): boolean {
  if (candidates.length === 0) return false
  return candidates.some(
    (c) =>
      needsMappingAssist(c) ||
      c.module === 'medication' ||
      c.module === 'therapy' ||
      c.module === 'complementaryTherapy' ||
      c.module === 'risk' ||
      c.module === 'verlauf',
  )
}

export { candidateNeedsReview, needsMappingAssist }
