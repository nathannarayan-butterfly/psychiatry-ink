import { FileUp, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { TEMPLATE_SHARE_FILE_EXTENSION } from '../../schemas/documentTemplate/shareEnvelope'
import { categoryLabel } from '../../utils/documentTemplate/constants'
import {
  parseTemplateShareFile,
  type TemplateShareParseError,
  type TemplateSharePreview,
} from '../../utils/documentTemplate/shareFormat'
import { importDocumentTemplateFromShare } from '../../utils/documentTemplateStore'
import type { TemplateSharePayload } from '../../schemas/documentTemplate/shareEnvelope'

interface TemplateImportDialogProps {
  onClose: () => void
  onImported: (templateId: string) => void
}

function renderParseError(error: TemplateShareParseError, t: ReturnType<typeof useTranslation>['t']): string {
  switch (error) {
    case 'invalid_magic':
      return t('templateImportErrorInvalidMagic')
    case 'unsupported_version':
      return t('templateImportErrorUnsupported')
    case 'tampered':
      return t('templateImportErrorTampered')
    case 'invalid_payload':
      return t('templateImportErrorInvalidPayload')
    default:
      return t('templateImportErrorMalformed')
  }
}

export function TemplateImportDialog({ onClose, onImported }: TemplateImportDialogProps) {
  const { t, language } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<TemplateSharePreview | null>(null)
  const [payload, setPayload] = useState<TemplateSharePayload | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<TemplateShareParseError | null>(null)
  const [busy, setBusy] = useState(false)

  const lang = language === 'de' ? 'de' : 'en'

  const handleFile = useCallback(
    async (file: File) => {
      setParseError(null)
      setPreview(null)
      setPayload(null)
      setFileName(file.name)

      try {
        const content = await file.text()
        const parsed = await parseTemplateShareFile(content)
        if (!parsed.ok) {
          setParseError(parsed.error)
          return
        }
        setPreview(parsed.preview)
        setPayload(parsed.payload)
      } catch {
        setParseError('malformed')
      }
    },
    [],
  )

  const handleConfirm = useCallback(() => {
    if (!payload) return
    setBusy(true)
    try {
      const imported = importDocumentTemplateFromShare(payload)
      onImported(imported.id)
      onClose()
    } catch {
      setParseError('malformed')
    } finally {
      setBusy(false)
    }
  }, [onClose, onImported, payload])

  return (
    <div className="dt-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="dt-modal dt-modal--import" onClick={(event) => event.stopPropagation()}>
        <header className="dt-modal__header">
          <h2 className="dt-modal__title">{t('templateImportTitle')}</h2>
          <button type="button" className="dt-icon-btn" onClick={onClose} aria-label={t('dokumenteClose')}>
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <p className="dt-modal__intro">{t('templateImportDescription')}</p>

        <input
          ref={inputRef}
          type="file"
          accept={`.psychiatry-ink,${TEMPLATE_SHARE_FILE_EXTENSION}`}
          className="dt-import-input"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />

        <button
          type="button"
          className="dt-btn dt-btn--secondary dt-import-trigger"
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {t('templateImportSelectFile')}
        </button>

        {fileName ? <p className="dt-modal__meta">{fileName}</p> : null}
        {parseError ? <p className="dt-error">{renderParseError(parseError, t)}</p> : null}

        {preview ? (
          <section className="dt-import-preview" aria-label={t('templateImportPreviewTitle')}>
            <h3 className="dt-import-preview__title">{preview.title}</h3>
            {preview.description ? (
              <p className="dt-import-preview__desc">{preview.description}</p>
            ) : null}
            <dl className="dt-import-preview__meta">
              <div>
                <dt>{t('templateImportPreviewCategory')}</dt>
                <dd>{categoryLabel(preview.category, lang)}</dd>
              </div>
              <div>
                <dt>{t('templateImportPreviewFields')}</dt>
                <dd>{preview.fieldCount}</dd>
              </div>
              <div>
                <dt>{t('templateImportPreviewExported')}</dt>
                <dd>{new Date(preview.exportedAt).toLocaleString(lang === 'de' ? 'de-DE' : 'en-GB')}</dd>
              </div>
              {preview.creator?.name || preview.creator?.email ? (
                <div>
                  <dt>{t('templateImportPreviewCreator')}</dt>
                  <dd>{preview.creator.name || preview.creator.email}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        <footer className="dt-modal__footer">
          <button type="button" className="dt-btn dt-btn--ghost" onClick={onClose}>
            {t('templateImportCancel')}
          </button>
          <button
            type="button"
            className="dt-btn dt-btn--primary"
            onClick={handleConfirm}
            disabled={!payload || busy}
          >
            {t('templateImportConfirm')}
          </button>
        </footer>
      </div>
    </div>
  )
}
