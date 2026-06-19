/**
 * PDF / scan adapter — STORED ONLY.
 *
 * Per the import policy, PDFs and scans are NOT parsed or OCR'd in this version.
 * The file is stored as an encrypted attachment and a single `document` candidate
 * is produced so the clinician can file it into Dokumente. No clinical fields are
 * extracted.
 *
 * The attachment persistence step is injectable so this adapter is unit-testable
 * without IndexedDB / Web Crypto.
 */
import { makeCandidate } from '../candidateFactory'
import { notice, type AdapterResult } from './adapterResult'

/** German-primary message; the UI localizes via the `pdf_stored_only` notice code. */
export const PDF_STORED_ONLY_MESSAGE_DE =
  'PDF/Scans werden als Dokumente gespeichert. Eine automatische Extraktion ist in dieser Version nicht aktiviert.'

export type StoreAttachmentFn = (file: File) => Promise<string>

export async function parsePdfStoredOnly(
  file: File,
  storeAttachment: StoreAttachmentFn,
): Promise<AdapterResult> {
  let storeId: string
  try {
    storeId = await storeAttachment(file)
  } catch (error) {
    return {
      candidates: [],
      notices: [
        notice('error', 'pdf_store_failed', `Datei konnte nicht gespeichert werden: ${error instanceof Error ? error.message : 'Fehler'}`),
      ],
      parsingMode: 'stored_only',
    }
  }

  const candidate = makeCandidate({
    module: 'document',
    confidence: 'high',
    sourceLocation: {},
    data: {
      title: file.name,
      text: PDF_STORED_ONLY_MESSAGE_DE,
      attachment: {
        storeId,
        mimeType: file.type || 'application/pdf',
        originalFileName: file.name,
        sizeBytes: file.size,
      },
    },
  })

  return {
    candidates: [candidate],
    notices: [notice('info', 'pdf_stored_only', PDF_STORED_ONLY_MESSAGE_DE)],
    parsingMode: 'stored_only',
  }
}
