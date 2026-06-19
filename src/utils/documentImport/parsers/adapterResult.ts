/**
 * Common output contract for every parser adapter. Adapters return this partial
 * shape; `parseFile` (parsers/index.ts) wraps it into a full, zod-validated
 * `ClinicalImportEnvelope`.
 *
 * Adapters are PURE with respect to the patient record: they only produce
 * candidates + notices and never write into any clinical module.
 */
import type {
  ClinicalImportCandidate,
  ExtractedPatientIdentity,
  ImportNotice,
  ParsingMode,
} from '../../../schemas/documentImport/envelope'

export interface AdapterResult {
  candidates: ClinicalImportCandidate[]
  notices: ImportNotice[]
  parsingMode: ParsingMode
  /** Truncated text preview for the review screen. */
  rawPreview?: string
  /** Extra source metadata (xlsx sheet names, csv/xlsx columns). */
  sourceExtra?: {
    sheetNames?: string[]
    columns?: string[]
  }
  /** Deterministically extracted patient identity (offered for confirmation). */
  patientIdentity?: ExtractedPatientIdentity
}

/** Cap on the preview length so we never copy a whole file into the envelope. */
export const RAW_PREVIEW_LIMIT = 2000

export function buildPreview(text: string): string {
  return text.length > RAW_PREVIEW_LIMIT ? `${text.slice(0, RAW_PREVIEW_LIMIT)}…` : text
}

export function notice(
  level: ImportNotice['level'],
  code: string,
  message: string,
): ImportNotice {
  return { level, code, message }
}
