/**
 * Parser dispatch — detects the file format and routes to the matching adapter,
 * then wraps the adapter output in a zod-validated `ClinicalImportEnvelope`.
 *
 * For tabular formats (csv/xlsx) the parsed table + auto-detected mapping are
 * returned alongside the envelope so the review screen can offer column re-mapping
 * (recomputing candidates via `tabularToCandidates`).
 *
 * IMPORTANT: nothing here writes into the patient/case record. The envelope is a
 * pure parse result.
 */
import {
  CLINICAL_IMPORT_ENVELOPE_VERSION,
  ClinicalImportEnvelopeSchema,
  type ClinicalImportEnvelope,
} from '../../../schemas/documentImport/envelope'
import { detectImportFormat } from '../detectFormat'
import { readArrayBuffer } from '../fileIo'
import { DOCUMENT_IMPORT_PARSER_VERSION } from '../parserVersion'
import { storeImportedFile } from '../importedFileStore'
import type { ColumnMapping, TabularTable } from '../tabular'
import type { AdapterResult } from './adapterResult'
import { notice } from './adapterResult'
import { parseJsonFile } from './jsonParser'
import { parseJsonlFile } from './jsonlParser'
import { parseCsvFile, type TabularAdapterResult } from './csvParser'
import { parseXlsxFile } from './xlsxParser'
import { parseDocxFile, type DocxTextExtractor } from './docxParser'
import { parseTxtFile } from './txtParser'
import { parsePdfStoredOnly, type StoreAttachmentFn } from './pdfStoredOnlyParser'
import type { ParserProfile } from '../../../schemas/documentImport/parserProfile'
import { profileToParseOptions } from '../parserProfile'

export interface ParseFileOptions {
  /** Case id — required for encrypting stored PDF attachments. */
  caseId: string
  /** Override DOCX text extraction (tests). */
  docxExtractor?: DocxTextExtractor
  /** Override attachment persistence (tests). */
  storeAttachment?: StoreAttachmentFn
  /**
   * Optional per-user ParserProfile applied ABOVE the base parser as a detection
   * bias (heading aliases, date-location hint, column aliases). Omitting it — or
   * passing an empty/auto profile — leaves the base parser behaviour unchanged.
   * The layer never bypasses the review/accept gate or provenance.
   */
  parserProfile?: ParserProfile | null
}

export interface TabularContext {
  table: TabularTable
  mapping: ColumnMapping
}

export interface ParseFileResult {
  envelope: ClinicalImportEnvelope
  /** Present for csv/xlsx — drives the column re-mapping UI. */
  tabular?: TabularContext
}

function decodeSample(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  } catch {
    return ''
  }
}

export async function parseFile(file: File, options: ParseFileOptions): Promise<ParseFileResult> {
  const headBuffer = await readArrayBuffer(file.slice(0, 8192))
  const sampleBytes = new Uint8Array(headBuffer)
  const sampleText = decodeSample(sampleBytes)

  const detection = detectImportFormat({
    filename: file.name,
    mimeType: file.type,
    sampleText,
    sampleBytes,
  })

  if (!detection.format) {
    return {
      envelope: buildEnvelope(file, 'txt', {
        candidates: [],
        notices: [notice('error', 'unsupported_format', `Nicht unterstütztes Dateiformat: ${file.name}`)],
        parsingMode: 'structured',
      }),
    }
  }

  const format = detection.format
  const profileOptions = profileToParseOptions(options.parserProfile)

  let adapter: AdapterResult
  let tabular: TabularContext | undefined

  switch (format) {
    case 'json':
      adapter = await parseJsonFile(file)
      break
    case 'jsonl':
      adapter = await parseJsonlFile(file)
      break
    case 'csv': {
      const result = await parseCsvFile(file, profileOptions.autoDetect)
      adapter = result
      tabular = tabularContextFrom(result)
      break
    }
    case 'xlsx': {
      const result = await parseXlsxFile(file, profileOptions.autoDetect)
      adapter = result
      tabular = tabularContextFrom(result)
      break
    }
    case 'docx':
      adapter = await parseDocxFile(file, options.docxExtractor, profileOptions.sectionize)
      break
    case 'txt':
      adapter = await parseTxtFile(file, profileOptions.sectionize)
      break
    case 'pdf': {
      const store: StoreAttachmentFn =
        options.storeAttachment ?? ((f) => storeImportedFile(options.caseId, f))
      adapter = await parsePdfStoredOnly(file, store)
      break
    }
  }

  return { envelope: buildEnvelope(file, format, adapter), tabular }
}

function tabularContextFrom(result: TabularAdapterResult): TabularContext | undefined {
  if (result.table.headers.length === 0) return undefined
  return { table: result.table, mapping: result.mapping }
}

function buildEnvelope(
  file: File,
  format: ClinicalImportEnvelope['source']['detectedFormat'],
  adapter: AdapterResult,
): ClinicalImportEnvelope {
  const envelope: ClinicalImportEnvelope = {
    envelopeVersion: CLINICAL_IMPORT_ENVELOPE_VERSION,
    sourceDocumentId: crypto.randomUUID(),
    parserVersion: DOCUMENT_IMPORT_PARSER_VERSION,
    parsingMode: adapter.parsingMode,
    source: {
      filename: file.name,
      mimeType: file.type,
      detectedFormat: format,
      sizeBytes: file.size,
      importedAt: new Date().toISOString(),
      sheetNames: adapter.sourceExtra?.sheetNames,
      columns: adapter.sourceExtra?.columns,
    },
    candidates: adapter.candidates,
    notices: adapter.notices,
    rawPreview: adapter.rawPreview,
    patientIdentity: adapter.patientIdentity,
  }
  // Enforce the structural contract — drift here is a programming error.
  return ClinicalImportEnvelopeSchema.parse(envelope)
}
