import { useId, useRef, useState, useCallback } from 'react'
import { Loader2, UploadCloud } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'

const ACCEPT =
  '.docx,.json,.jsonl,.ndjson,.csv,.tsv,.xlsx,.xlsm,.txt,.md,.pdf,' +
  'application/json,text/csv,text/plain,application/pdf,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

interface ImportDropzoneProps {
  onFile: (file: File) => void
  disabled?: boolean
  uploading?: boolean
}

/** Drag-and-drop + click-to-pick upload surface. */
export function ImportDropzone({ onFile, disabled, uploading }: ImportDropzoneProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const [dragging, setDragging] = useState(false)
  const busy = Boolean(disabled || uploading)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (file && !busy) onFile(file)
    },
    [busy, onFile],
  )

  return (
    <label
      htmlFor={inputId}
      className={`doc-import-dropzone${dragging ? ' doc-import-dropzone--active' : ''}${
        busy ? ' doc-import-dropzone--disabled' : ''
      }${uploading ? ' doc-import-dropzone--uploading' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        if (!busy) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!busy) handleFiles(e.dataTransfer.files)
      }}
    >
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const files = e.target.files
          handleFiles(files)
          e.target.value = ''
        }}
      />
      {uploading ? (
        <Loader2 className="doc-import-dropzone__icon doc-import-dropzone__spinner" aria-hidden strokeWidth={1.5} />
      ) : (
        <UploadCloud className="doc-import-dropzone__icon" aria-hidden strokeWidth={1.5} />
      )}
      <p className="doc-import-dropzone__label">
        {uploading ? t('documentImportUploading') : t('documentImportDropzone')}
      </p>
      <p className="doc-import-dropzone__formats">{t('documentImportAcceptedFormats')}</p>
    </label>
  )
}
