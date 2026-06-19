/**
 * File-type detection for Document Import.
 *
 * Detection is layered and deterministic — no content is ever sent anywhere:
 *   1. Extension (most reliable signal users control)
 *   2. MIME type (from the browser / OS)
 *   3. Lightweight content sniffing (leading bytes / first lines)
 *
 * The result is one of the supported `ImportFormat`s, or `null` when the file
 * is unsupported (the UI then shows an "unsupported format" notice).
 */
import type { ImportFormat } from '../../schemas/documentImport/envelope'

export interface DetectFormatInput {
  filename: string
  mimeType?: string | null
  /** First few KB of text content, when cheaply available (csv/json/txt sniffing). */
  sampleText?: string | null
  /** First bytes of the file, used to recognise binary signatures (PDF, ZIP/OOXML). */
  sampleBytes?: Uint8Array | null
}

export interface DetectFormatResult {
  format: ImportFormat | null
  /** How the decision was reached — surfaced in dev logs / review UI. */
  via: 'extension' | 'mime' | 'content' | 'none'
}

const EXTENSION_MAP: Record<string, ImportFormat> = {
  json: 'json',
  jsonl: 'jsonl',
  ndjson: 'jsonl',
  csv: 'csv',
  tsv: 'csv',
  xlsx: 'xlsx',
  xlsm: 'xlsx',
  docx: 'docx',
  txt: 'txt',
  text: 'txt',
  md: 'txt',
  pdf: 'pdf',
}

const MIME_MAP: Record<string, ImportFormat> = {
  'application/json': 'json',
  'application/x-ndjson': 'jsonl',
  'application/jsonl': 'jsonl',
  'text/csv': 'csv',
  'text/tab-separated-values': 'csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'docx',
  'text/plain': 'txt',
  'application/pdf': 'pdf',
}

export function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  if (dot < 0 || dot === filename.length - 1) return ''
  return filename.slice(dot + 1).toLowerCase()
}

/** %PDF magic number. */
function looksLikePdf(bytes?: Uint8Array | null): boolean {
  if (!bytes || bytes.length < 4) return false
  return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
}

/** PK\x03\x04 — ZIP container used by OOXML (.docx/.xlsx). */
function looksLikeZip(bytes?: Uint8Array | null): boolean {
  if (!bytes || bytes.length < 4) return false
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

/**
 * Content sniffing for text formats. Returns a format only when reasonably
 * confident; ambiguous text falls back to `txt`.
 */
function sniffText(sampleText: string): ImportFormat {
  const trimmed = sampleText.trim()
  if (!trimmed) return 'txt'

  // JSON: a single document starting with { or [ that parses cleanly.
  const first = trimmed[0]
  if (first === '{' || first === '[') {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch {
      // Might be JSONL (many objects) or a truncated sample — fall through.
    }
  }

  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0)

  // JSONL: every non-empty line is its own JSON object.
  if (lines.length >= 2 && lines.every((line) => isJsonObjectLine(line))) {
    return 'jsonl'
  }

  // CSV: consistent delimiter count across the first few rows.
  if (looksLikeDelimited(lines)) return 'csv'

  return 'txt'
}

function isJsonObjectLine(line: string): boolean {
  const t = line.trim()
  if (!t.startsWith('{') && !t.startsWith('[')) return false
  try {
    JSON.parse(t)
    return true
  } catch {
    return false
  }
}

function looksLikeDelimited(lines: string[]): boolean {
  if (lines.length < 2) return false
  const sample = lines.slice(0, 5)
  for (const delimiter of [',', ';', '\t']) {
    const counts = sample.map((line) => countTopLevel(line, delimiter))
    const first = counts[0]
    if (first >= 1 && counts.every((c) => c === first)) return true
  }
  return false
}

/** Count delimiters that are not inside a double-quoted field. */
function countTopLevel(line: string, delimiter: string): number {
  let inQuotes = false
  let count = 0
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') inQuotes = !inQuotes
    else if (ch === delimiter && !inQuotes) count += 1
  }
  return count
}

export function detectImportFormat(input: DetectFormatInput): DetectFormatResult {
  // Binary signatures win outright — they cannot be faked by extension.
  if (looksLikePdf(input.sampleBytes)) return { format: 'pdf', via: 'content' }

  const ext = fileExtension(input.filename)
  const extFormat = EXTENSION_MAP[ext]

  // For OOXML, the extension disambiguates docx vs xlsx (both are zips).
  if (looksLikeZip(input.sampleBytes)) {
    if (extFormat === 'docx' || extFormat === 'xlsx') return { format: extFormat, via: 'extension' }
    const mimeFormat = input.mimeType ? MIME_MAP[input.mimeType.split(';')[0].trim()] : undefined
    if (mimeFormat === 'docx' || mimeFormat === 'xlsx') return { format: mimeFormat, via: 'mime' }
  }

  if (extFormat) return { format: extFormat, via: 'extension' }

  const mime = input.mimeType ? input.mimeType.split(';')[0].trim().toLowerCase() : ''
  const mimeFormat = MIME_MAP[mime]
  if (mimeFormat) return { format: mimeFormat, via: 'mime' }

  if (typeof input.sampleText === 'string' && input.sampleText.length > 0 && !looksBinary(input.sampleText)) {
    return { format: sniffText(input.sampleText), via: 'content' }
  }

  return { format: null, via: 'none' }
}

/** Heuristic: a meaningful share of control bytes implies binary (unsupported) content. */
function looksBinary(sample: string): boolean {
  let control = 0
  for (let i = 0; i < sample.length; i += 1) {
    const code = sample.charCodeAt(i)
    if (code === 0xfffd) control += 1 // unicode replacement char (decode failure)
    else if (code < 32 && code !== 9 && code !== 10 && code !== 13) control += 1
  }
  return control / sample.length > 0.1
}

/** Formats that are text-extractable (everything except stored-only PDF). */
export function isTextFormat(format: ImportFormat): boolean {
  return format !== 'pdf'
}
