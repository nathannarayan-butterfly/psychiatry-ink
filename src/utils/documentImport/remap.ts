/**
 * Re-map a candidate to a different target module (clinician remap or applying an
 * AI suggestion). Carries over the best available text/label so the result is a
 * valid candidate for the new module. Returns the original candidate when the
 * target cannot be constructed (e.g. remapping free text into `lab`, which needs
 * structured values).
 */
import type {
  CandidateModule,
  ClinicalImportCandidate,
} from '../../schemas/documentImport/envelope'

function candidateText(candidate: ClinicalImportCandidate): string {
  const data = candidate.data as Record<string, unknown>
  if (typeof data.text === 'string' && data.text.trim()) return data.text
  if (typeof data.label === 'string' && data.label.trim()) return data.label
  if (typeof data.substance === 'string' && data.substance.trim()) return data.substance
  if (typeof data.title === 'string' && data.title.trim()) return data.title
  return candidate.rawText ?? ''
}

function candidateTitle(candidate: ClinicalImportCandidate): string {
  const data = candidate.data as Record<string, unknown>
  if (typeof data.title === 'string' && data.title.trim()) return data.title
  if (typeof data.label === 'string' && data.label.trim()) return data.label
  return candidateText(candidate).slice(0, 60) || 'Import'
}

/** Whether a remap from `from` to `to` can produce a valid candidate. */
export function canRemap(from: CandidateModule, to: CandidateModule): boolean {
  if (to === 'lab') return from === 'lab'
  return true
}

export function remapCandidate(
  candidate: ClinicalImportCandidate,
  target: CandidateModule,
): ClinicalImportCandidate {
  if (candidate.module === target) return candidate
  if (!canRemap(candidate.module, target)) return candidate

  const text = candidateText(candidate)
  const title = candidateTitle(candidate)
  const common = {
    id: candidate.id,
    confidence: candidate.confidence,
    sourceLocation: candidate.sourceLocation,
    rawText: candidate.rawText,
    aiSuggested: candidate.aiSuggested,
  }

  switch (target) {
    case 'diagnosis':
      return { ...common, module: 'diagnosis', data: { label: title || text } }
    case 'medication':
      return { ...common, module: 'medication', data: { substance: title || text } }
    case 'anamnese':
      return { ...common, module: 'anamnese', data: { title, text } }
    case 'verlauf':
      return { ...common, module: 'verlauf', data: { text } }
    case 'investigation':
      return { ...common, module: 'investigation', data: { title, text } }
    case 'therapy':
      return { ...common, module: 'therapy', data: { title, text } }
    case 'risk':
      return { ...common, module: 'risk', data: { text } }
    case 'document':
    default:
      return { ...common, module: 'document', data: { title, text } }
  }
}
