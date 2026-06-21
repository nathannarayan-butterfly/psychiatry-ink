import { useState, useEffect } from 'react'
import type { AiMode } from '../../types/aiUsage'
import type { ArztbriefDocumentType } from '../../types/arztbrief'
import { useTranslation } from '../../context/TranslationContext'

interface ArztbriefNewDialogProps {
  open: boolean
  initialDocumentType?: ArztbriefDocumentType
  onClose: () => void
  onCreate: (documentType: ArztbriefDocumentType, mode: AiMode) => void
  coverage?: Array<{ labelDe: string; labelEn: string; available: boolean }>
  missingSummary?: string[]
}

export function ArztbriefNewDialog({
  open,
  initialDocumentType = 'kurzbrief',
  onClose,
  onCreate,
  coverage = [],
  missingSummary = [],
}: ArztbriefNewDialogProps) {
  const { t, language } = useTranslation()
  const [documentType, setDocumentType] = useState<ArztbriefDocumentType>(initialDocumentType)
  const [mode, setMode] = useState<AiMode>('standard')

  useEffect(() => {
    if (open) setDocumentType(initialDocumentType)
  }, [open, initialDocumentType])

  if (!open) return null

  return (
    <div className="arztbrief-dialog-backdrop" role="dialog" aria-modal="true">
      <div className="arztbrief-dialog">
        <h2 className="arztbrief-dialog__title">{t('arztbriefNewTitle')}</h2>

        <label className="arztbrief-dialog__field">
          <span>{t('arztbriefDocumentType')}</span>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as ArztbriefDocumentType)}
          >
            <option value="kurzbrief">{t('arztbriefTypeKurz')}</option>
            <option value="langbrief">{t('arztbriefTypeLang')}</option>
          </select>
        </label>

        <label className="arztbrief-dialog__field">
          <span>{t('arztbriefAiMode')}</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as AiMode)}>
            <option value="economic">{t('arztbriefModeSchnell')}</option>
            <option value="standard">{t('arztbriefModeStandard')}</option>
            <option value="gruendlich">{t('arztbriefModeGruendlich')}</option>
          </select>
        </label>

        {coverage.length > 0 ? (
          <div className="arztbrief-coverage">
            <p className="arztbrief-coverage__title">{t('arztbriefCoverageTitle')}</p>
            <ul>
              {coverage.map((item) => (
                <li key={item.labelDe} className={item.available ? 'ok' : 'missing'}>
                  {language === 'en' ? item.labelEn : item.labelDe}
                </li>
              ))}
            </ul>
            {missingSummary.length > 0 ? (
              <p className="arztbrief-coverage__missing">
                {t('arztbriefMissingPrefix')}: {missingSummary.join(', ')}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="arztbrief-dialog__actions">
          <button type="button" className="arztbrief-btn arztbrief-btn--ghost" onClick={onClose}>
            {t('arztbriefCancel')}
          </button>
          <button
            type="button"
            className="arztbrief-btn arztbrief-btn--primary"
            onClick={() => {
              onCreate(documentType, mode)
              onClose()
            }}
          >
            {t('arztbriefCreate')}
          </button>
        </div>
      </div>
    </div>
  )
}
