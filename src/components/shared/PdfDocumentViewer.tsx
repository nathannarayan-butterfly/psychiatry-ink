import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

import { loadPdfDocument, renderPdfPageToCanvas } from '../../utils/pdfDocument'

interface PdfDocumentViewerProps {
  pdfData: ArrayBuffer | null
  fileName?: string | null
  emptyLabel: string
}

const MIN_SCALE = 0.75
const MAX_SCALE = 2.5
const SCALE_STEP = 0.25

export function PdfDocumentViewer({ pdfData, fileName, emptyLabel }: PdfDocumentViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pdfData) {
      setPageCount(0)
      setCurrentPage(1)
      setError(null)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const pdf = await loadPdfDocument(pdfData)
        if (cancelled) return
        setPageCount(pdf.numPages)
        setCurrentPage(1)
        setError(null)
      } catch {
        if (!cancelled) {
          setError('load')
          setPageCount(0)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pdfData])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!pdfData || !canvas || pageCount === 0) return

    let cancelled = false

    void (async () => {
      try {
        const pdf = await loadPdfDocument(pdfData)
        if (cancelled) return
        await renderPdfPageToCanvas(pdf, currentPage, canvas, scale)
        setError(null)
      } catch {
        if (!cancelled) setError('render')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pdfData, currentPage, scale, pageCount])

  if (!pdfData) {
    return (
      <div className="pdf-document-viewer pdf-document-viewer--empty">
        <p>{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className="pdf-document-viewer">
      <div className="pdf-document-viewer__toolbar">
        <span className="pdf-document-viewer__filename">{fileName}</span>
        <div className="pdf-document-viewer__controls">
          <button
            type="button"
            className="pdf-document-viewer__control"
            disabled={currentPage <= 1}
            aria-label="Previous page"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
          <span className="pdf-document-viewer__page-indicator">
            {currentPage} / {pageCount || 1}
          </span>
          <button
            type="button"
            className="pdf-document-viewer__control"
            disabled={currentPage >= pageCount}
            aria-label="Next page"
            onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
          <button
            type="button"
            className="pdf-document-viewer__control"
            disabled={scale <= MIN_SCALE}
            aria-label="Zoom out"
            onClick={() => setScale((value) => Math.max(MIN_SCALE, value - SCALE_STEP))}
          >
            <ZoomOut className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
          <button
            type="button"
            className="pdf-document-viewer__control"
            disabled={scale >= MAX_SCALE}
            aria-label="Zoom in"
            onClick={() => setScale((value) => Math.min(MAX_SCALE, value + SCALE_STEP))}
          >
            <ZoomIn className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>
      <div className="pdf-document-viewer__viewport">
        {error ? <p className="pdf-document-viewer__error">Unable to display this PDF.</p> : null}
        <canvas ref={canvasRef} className="pdf-document-viewer__canvas" />
      </div>
    </div>
  )
}
