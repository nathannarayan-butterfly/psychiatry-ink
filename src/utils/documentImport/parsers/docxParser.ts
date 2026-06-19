/**
 * DOCX adapter — extracts plain text from a Word document (via mammoth) and runs
 * it through the shared clinical sectionizer so headings like "Anamnese",
 * "Diagnosen", "Medikation", "Labor", "Therapie und Verlauf" become section-based
 * candidates.
 *
 * The text extraction step is injectable so the section-mapping logic can be unit
 * tested without binary .docx fixtures (and so mammoth — a browser bundle — is
 * never loaded in Node test runs).
 */
import { consolidateImportCandidates } from '../consolidateCandidates'
import { mapSectionToCandidates, sectionizeClinicalText, type SectionizeOptions } from '../sectionize'
import { extractPatientIdentity } from '../patientIdentity'
import { readArrayBuffer } from '../fileIo'
import { buildPreview, notice, type AdapterResult } from './adapterResult'
import type { ClinicalImportCandidate, ImportNotice } from '../../../schemas/documentImport/envelope'

export type DocxTextExtractor = (buffer: ArrayBuffer) => Promise<string>

/** Default extractor — lazily loads mammoth (Vite serves its browser build). */
export const defaultDocxExtractor: DocxTextExtractor = async (buffer) => {
  const mammoth = (await import('mammoth')).default as {
    extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
  }
  const result = await mammoth.extractRawText({ arrayBuffer: buffer })
  return result.value
}

/**
 * Pure mapping step: sectionized text → candidates + notices. Exposed for tests.
 *
 * `options` is the optional per-user ParserProfile augmentation layer (heading
 * aliases + date-location bias). Omitting it reproduces the exact base behaviour.
 */
export function docxTextToResult(text: string, options: SectionizeOptions = {}): AdapterResult {
  const sections = sectionizeClinicalText(text, options)
  const candidates: ClinicalImportCandidate[] = []
  const notices: ImportNotice[] = []

  for (const section of sections) {
    candidates.push(...mapSectionToCandidates(section, options))
  }

  const consolidated = consolidateImportCandidates(candidates)

  if (consolidated.length === 0) {
    notices.push(notice('warning', 'docx_no_candidates', 'Keine Abschnitte im Dokument erkannt.'))
  }

  return {
    candidates: consolidated,
    notices,
    parsingMode: 'structured',
    rawPreview: buildPreview(text.trim()),
    patientIdentity: extractPatientIdentity(text) ?? undefined,
  }
}

export async function parseDocxFile(
  file: File,
  extractor: DocxTextExtractor = defaultDocxExtractor,
  options: SectionizeOptions = {},
): Promise<AdapterResult> {
  let text: string
  try {
    text = await extractor(await readArrayBuffer(file))
  } catch (error) {
    return {
      candidates: [],
      notices: [
        notice('error', 'docx_extract_failed', `DOCX konnte nicht gelesen werden: ${error instanceof Error ? error.message : 'Fehler'}`),
      ],
      parsingMode: 'structured',
    }
  }
  return docxTextToResult(text, options)
}
