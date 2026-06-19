import { useCallback, useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'

const ACCEPT =
  '.docx,.json,.jsonl,.ndjson,.csv,.tsv,.xlsx,.xlsm,.txt,.md,.pdf,' +
  'application/json,text/csv,text/plain,application/pdf,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

interface ImportDropzoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

/** Drag-and-drop + click-to-pick upload surface. */
export function ImportDropzone({ onFile, disabled }: ImportDropzoneProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  return (
    <div
      className={`doc-import-dropzone${dragging ? ' doc-import-dropzone--active' : ''}${
        disabled ? ' doc-import-dropzone--disabled' : ''
      }`}
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) inputRef.current?.click()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!disabled) handleFiles(e.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const files = e.target.files
          e.target.value = ''
          handleFiles(files)
        }}
      />
      <UploadCloud className="doc-import-dropzone__icon" aria-hidden strokeWidth={1.5} />
      <p className="doc-import-dropzone__label">{t('documentImportDropzone')}</p>
      <p className="doc-import-dropzone__formats">{t('documentImportAcceptedFormats')}</p>
    </div>
  )
}
