/**
 * Client-side text extraction for the "Create template from document" flow.
 *
 * The extracted plain text is sent to the billed `template_from_document` AI
 * endpoint (which routes through the safe LLM egress / PHI guard). Extraction
 * happens in the browser so we never persist the uploaded file server-side.
 *
 * Supported: .txt / .md / .docx / .pdf, plus pasted raw text. Legacy .doc and
 * scanned/image-only PDFs are not supported (no embedded text layer).
 */

/** Accept attribute for the file picker. */
export const DOCUMENT_ACCEPT = '.txt,.md,.markdown,.text,.docx,.pdf,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/** Hard cap on extracted characters sent onward (server truncates further for the model). */
export const MAX_EXTRACT_CHARS = 200_000

/** Max PDF pages we read text from (keeps very large PDFs responsive). */
const MAX_PDF_PAGES = 40

export class UnsupportedDocumentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedDocumentError'
  }
}

export interface ExtractedDocument {
  text: string
  /** True when extraction hit MAX_EXTRACT_CHARS and the text was cut. */
  truncated: boolean
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
}

function cap(text: string): ExtractedDocument {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (normalized.length > MAX_EXTRACT_CHARS) {
    return { text: normalized.slice(0, MAX_EXTRACT_CHARS), truncated: true }
  }
  return { text: normalized, truncated: false }
}

async function extractPdfText(file: File): Promise<string> {
  const { loadPdfDocument } = await import('../pdfDocument')
  const pdf = await loadPdfDocument(await file.arrayBuffer())
  const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES)
  const parts: string[] = []
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const line = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (line) parts.push(line)
  }
  return parts.join('\n\n')
}

/**
 * Extract plain text from a supported document. Throws
 * {@link UnsupportedDocumentError} for unsupported formats (caller should fall
 * back to the paste-text field).
 */
export async function extractTextFromFile(file: File): Promise<ExtractedDocument> {
  const ext = extensionOf(file.name)
  const mime = file.type

  if (ext === 'txt' || ext === 'md' || ext === 'markdown' || ext === 'text' || mime === 'text/plain' || mime === 'text/markdown') {
    return cap(await file.text())
  }

  if (ext === 'docx' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const { extractDocxRawText } = await import('../documentImport/parsers/mammothClient')
    return cap(await extractDocxRawText(await file.arrayBuffer()))
  }

  if (ext === 'pdf' || mime === 'application/pdf') {
    const text = await extractPdfText(file)
    if (!text.trim()) {
      throw new UnsupportedDocumentError('pdf_no_text')
    }
    return cap(text)
  }

  if (ext === 'doc') {
    throw new UnsupportedDocumentError('legacy_doc')
  }

  // Best-effort: try reading as text for unknown but text-like files.
  const fallback = await file.text().catch(() => '')
  if (fallback.trim()) return cap(fallback)
  throw new UnsupportedDocumentError('unsupported_format')
}

/** Derive a default template name from an uploaded filename (strip extension). */
export function templateNameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '')
  return base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}
