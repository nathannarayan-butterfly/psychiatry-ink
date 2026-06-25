import { useState, useEffect } from 'react'
import type { AiMode } from '../../types/aiUsage'
import type {
  DischargeSummaryDocumentType,
  DischargeSummaryRegion,
} from '../../types/dischargeSummary'
import type { EnglishVariant, UiLanguage } from '../../types/settings'
import { useTranslation } from '../../context/TranslationContext'

/**
 * The discharge summary is an English-language document. The UK/US/international
 * spelling variant is only a meaningful choice for English app users, so the
 * picker is hidden for other languages and defaults to neutral international
 * English. English users default to the variant they picked in Settings.
 */
function defaultRegionFor(
  language: UiLanguage,
  englishVariant: EnglishVariant,
): DischargeSummaryRegion {
  if (language !== 'en') return 'international'
  return englishVariant === 'us' ? 'US' : 'UK'
}

interface DischargeSummaryNewDialogProps {
  open: boolean
  initialDocumentType?: DischargeSummaryDocumentType
  onClose: () => void
  onCreate: (
    documentType: DischargeSummaryDocumentType,
    region: DischargeSummaryRegion,
    mode: AiMode,
  ) => void
  coverage?: Array<{ labelEn: string; available: boolean }>
  missingSummary?: string[]
}

export function DischargeSummaryNewDialog({
  open,
  initialDocumentType = 'short_discharge_summary',
  onClose,
  onCreate,
  coverage = [],
  missingSummary = [],
}: DischargeSummaryNewDialogProps) {
  const { t, language, englishVariant } = useTranslation()
  const [documentType, setDocumentType] = useState<DischargeSummaryDocumentType>(initialDocumentType)
  const [region, setRegion] = useState<DischargeSummaryRegion>(() =>
    defaultRegionFor(language, englishVariant),
  )
  const [mode, setMode] = useState<AiMode>('standard')

  useEffect(() => {
    if (open) {
      setDocumentType(initialDocumentType)
      setRegion(defaultRegionFor(language, englishVariant))
    }
  }, [open, initialDocumentType, language, englishVariant])

  if (!open) return null

  return (
    <div className="arztbrief-dialog-backdrop" role="dialog" aria-modal="true">
      <div className="arztbrief-dialog">
        <h2 className="arztbrief-dialog__title">{t('dischargeSummaryNewTitle')}</h2>

        <label className="arztbrief-dialog__field">
          <span>{t('dischargeSummaryDocumentType')}</span>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DischargeSummaryDocumentType)}
          >
            <option value="short_discharge_summary">{t('dischargeSummaryTypeShort')}</option>
            <option value="full_psychiatric_discharge_summary">{t('dischargeSummaryTypeFull')}</option>
          </select>
        </label>

        {language === 'en' ? (
          <label className="arztbrief-dialog__field">
            <span>{t('dischargeSummaryRegion')}</span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as DischargeSummaryRegion)}
            >
              <option value="UK">{t('dischargeSummaryRegionUk')}</option>
              <option value="US">{t('dischargeSummaryRegionUs')}</option>
              <option value="international">{t('dischargeSummaryRegionIntl')}</option>
            </select>
          </label>
        ) : null}

        <label className="arztbrief-dialog__field">
          <span>{t('dischargeSummaryAiMode')}</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as AiMode)}>
            <option value="economic">{t('dischargeSummaryModeFast')}</option>
            <option value="standard">{t('dischargeSummaryModeStandard')}</option>
            <option value="gruendlich">{t('dischargeSummaryModeThorough')}</option>
          </select>
        </label>

        {coverage.length > 0 ? (
          <div className="arztbrief-coverage">
            <p className="arztbrief-coverage__title">{t('dischargeSummaryCoverageTitle')}</p>
            <ul>
              {coverage.map((item) => (
                <li key={item.labelEn} className={item.available ? 'ok' : 'missing'}>
                  {item.labelEn}
                </li>
              ))}
            </ul>
            {missingSummary.length > 0 ? (
              <p className="arztbrief-coverage__missing">
                {t('dischargeSummaryMissingPrefix')}: {missingSummary.join(', ')}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="arztbrief-dialog__actions">
          <button type="button" className="arztbrief-btn arztbrief-btn--ghost" onClick={onClose}>
            {t('dischargeSummaryCancel')}
          </button>
          <button
            type="button"
            className="arztbrief-btn arztbrief-btn--primary"
            onClick={() => {
              onCreate(documentType, region, mode)
              onClose()
            }}
          >
            {t('dischargeSummaryCreate')}
          </button>
        </div>
      </div>
    </div>
  )
}
