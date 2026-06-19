import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { PdfDocumentViewer } from '../shared/PdfDocumentViewer'
import { loadImportedFile } from '../../utils/documentImport/importedFileStore'
import { readArrayBuffer } from '../../utils/documentImport/fileIo'
import type { DokumentEntry } from '../../utils/dokumenteArchive'

interface ImportedAttachmentPreviewProps {
  attachment: NonNullable<DokumentEntry['attachment']>
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Renders a stored-only imported attachment: metadata + PDF preview / download. */
export function ImportedAttachmentPreview({ attachment }: ImportedAttachmentPreviewProps) {
  const { t } = useTranslation()
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const isPdf = attachment.mimeType === 'application/pdf'

  useEffect(() => {
    let revoked: string | null = null
    let active = true
    void (async () => {
      try {
        const loaded = await loadImportedFile(attachment.storeId)
        if (!loaded || !active) return
        const url = URL.createObjectURL(loaded.blob)
        revoked = url
        setDownloadUrl(url)
        if (isPdf) setPdfData(await readArrayBuffer(loaded.blob))
      } catch {
        // store unavailable — metadata still renders
      }
    })()
    return () => {
      active = false
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [attachment.storeId, isPdf])

  return (
    <div className="doc-import-attachment">
      <div className="doc-import-attachment__meta">
        <FileText className="doc-import-attachment__icon" aria-hidden strokeWidth={1.5} />
        <div>
          <p className="doc-import-attachment__name">{attachment.originalFileName}</p>
          <p className="doc-import-attachment__detail">
            {attachment.mimeType} · {formatSize(attachment.sizeBytes)}
          </p>
        </div>
        {downloadUrl && (
          <a
            className="doc-import-attachment__download"
            href={downloadUrl}
            download={attachment.originalFileName}
          >
            {attachment.originalFileName}
          </a>
        )}
      </div>

      <div className="doc-import-attachment__notice">{t('documentImportPdfStoredOnly')}</div>

      {isPdf && (
        <PdfDocumentViewer
          pdfData={pdfData}
          fileName={attachment.originalFileName}
          emptyLabel={t('documentImportParsing')}
        />
      )}
    </div>
  )
}
