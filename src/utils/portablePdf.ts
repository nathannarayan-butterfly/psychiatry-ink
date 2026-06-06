import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRef,
  PDFStream,
  PDFString,
  StandardFonts,
  rgb,
} from 'pdf-lib'

import type { PortableDocumentKind, PortableDocumentPayload } from '../types/portableDocument'
import { PORTABLE_PDF_ATTACHMENT } from '../types/portableDocument'
import type { TimelineEntry, TimelineLayout, TimelineSnapshot } from '../types/timeline'

const VALID_LAYOUTS: TimelineLayout[] = ['horizontal', 'snake', 'list']

function normalizeTimelineLayout(layout: unknown): TimelineLayout {
  if (typeof layout === 'string' && VALID_LAYOUTS.includes(layout as TimelineLayout)) {
    return layout as TimelineLayout
  }
  return 'horizontal'
}

export type PortablePdfImportResult =
  | { ok: true; kind: 'timeline'; timeline: TimelineSnapshot; pdfData: ArrayBuffer }
  | { ok: true; kind: 'lab'; fileName: string; pdfData: ArrayBuffer }
  | { ok: false; error: 'not_pdf' | 'no_data' | 'wrong_kind' | 'invalid_data' }

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function visibleSorted(entries: TimelineEntry[]): TimelineEntry[] {
  return entries.filter((entry) => entry.visible).sort((a, b) => a.sortKey - b.sortKey)
}

function encodePayload(payload: PortableDocumentPayload): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(payload))
}

function decodePayload(bytes: Uint8Array): PortableDocumentPayload | null {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as PortableDocumentPayload
    if (parsed?.version !== 1 || (parsed.kind !== 'timeline' && parsed.kind !== 'lab')) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function pdfObjectToString(value: PDFString | PDFHexString): string {
  return value.asString()
}

async function readEmbeddedPayload(pdfBytes: ArrayBuffer): Promise<PortableDocumentPayload | null> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const names = pdfDoc.catalog.lookupMaybe(PDFName.of('Names'), PDFDict)
  if (!names) return null

  const embeddedFiles = names.lookupMaybe(PDFName.of('EmbeddedFiles'), PDFDict)
  if (!embeddedFiles) return null

  const nameArray = embeddedFiles.lookupMaybe(PDFName.of('Names'), PDFArray)
  if (!nameArray) return null

  for (let index = 0; index < nameArray.size(); index += 2) {
    const attachmentName = nameArray.lookup(index, PDFString, PDFHexString)
    if (pdfObjectToString(attachmentName) !== PORTABLE_PDF_ATTACHMENT) continue

    const fileSpecRef = nameArray.lookup(index + 1, PDFRef)
    const fileSpec = pdfDoc.context.lookup(fileSpecRef, PDFDict)
    const embeddedFile = fileSpec.lookup(PDFName.of('EF'), PDFDict)
    const streamRef = embeddedFile.lookup(PDFName.of('F'), PDFRef)
    const stream = pdfDoc.context.lookup(streamRef, PDFStream)
    return decodePayload(stream.getContents())
  }

  return null
}

async function attachPayload(pdfDoc: PDFDocument, payload: PortableDocumentPayload): Promise<void> {
  await pdfDoc.attach(encodePayload(payload), PORTABLE_PDF_ATTACHMENT, {
    mimeType: 'application/json',
    description: 'Psychiatry.ink portable document data',
  })
}

async function drawTimelineSummaryPage(
  pdfDoc: PDFDocument,
  snapshot: TimelineSnapshot,
  title: string,
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const margin = 48
  let page = pdfDoc.addPage([595, 842])
  let y = 800

  page.drawText(title, { x: margin, y, size: 16, font: fontBold, color: rgb(0.14, 0.13, 0.12) })
  y -= 22
  page.drawText(`Layout: ${snapshot.layout}`, {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.43, 0.4, 0.36),
  })
  y -= 28

  const headers = ['Date', 'Heading', 'Subheading', 'Priority']
  const colX = [margin, margin + 72, margin + 220, margin + 420]
  headers.forEach((header, index) => {
    page.drawText(header, { x: colX[index], y, size: 9, font: fontBold, color: rgb(0.14, 0.13, 0.12) })
  })
  y -= 16

  for (const entry of visibleSorted(snapshot.entries)) {
    if (y < 72) {
      page = pdfDoc.addPage([595, 842])
      y = 800
    }

    const row = [entry.displayDate, entry.heading, entry.subheading || '—', entry.priority]
    row.forEach((value, index) => {
      page.drawText(value.slice(0, index === 1 ? 42 : 24), {
        x: colX[index],
        y,
        size: 9,
        font,
        color: rgb(0.14, 0.13, 0.12),
      })
    })
    y -= 14
  }
}

export async function exportTimelinePdf(
  snapshot: TimelineSnapshot,
  title: string,
  filename = 'timeline.pdf',
): Promise<void> {
  const pdfDoc = await PDFDocument.create()
  await drawTimelineSummaryPage(pdfDoc, snapshot, title)
  await attachPayload(pdfDoc, { version: 1, kind: 'timeline', timeline: snapshot })
  const bytes = await pdfDoc.save()
  downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), filename)
}

export async function exportLabPdf(
  pdfData: ArrayBuffer,
  fileName: string,
  downloadName?: string,
): Promise<void> {
  const pdfDoc = await PDFDocument.load(pdfData)
  await attachPayload(pdfDoc, { version: 1, kind: 'lab', fileName })
  const bytes = await pdfDoc.save()
  downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), downloadName ?? fileName)
}

export async function importPortablePdf(
  file: File,
  expectedKind: PortableDocumentKind,
): Promise<PortablePdfImportResult> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return { ok: false, error: 'not_pdf' }
  }

  const pdfData = await file.arrayBuffer()

  if (expectedKind === 'lab') {
    return { ok: true, kind: 'lab', fileName: file.name, pdfData }
  }

  const payload = await readEmbeddedPayload(pdfData)
  if (!payload?.timeline) {
    return { ok: false, error: 'no_data' }
  }
  if (payload.kind !== expectedKind) {
    return { ok: false, error: 'wrong_kind' }
  }
  if (!Array.isArray(payload.timeline.entries)) {
    return { ok: false, error: 'invalid_data' }
  }

  return {
    ok: true,
    kind: 'timeline',
    timeline: {
      layout: normalizeTimelineLayout(payload.timeline.layout),
      entries: payload.timeline.entries,
    },
    pdfData,
  }
}
