import { useTranslation } from '../../context/TranslationContext'
import { ANFORDERUNG_PRESET_IMAGING } from '../../data/anforderungenCatalog'
import type { AnforderungModalPreset } from '../../types/anforderung'
import { FreeTextBefundPanel } from './FreeTextBefundPanel'

interface DiagnostikImagingSectionProps {
  caseId: string
  onRequestAnforderung?: (preset?: AnforderungModalPreset | null) => void
}

export function DiagnostikImagingSection({
  caseId,
  onRequestAnforderung,
}: DiagnostikImagingSectionProps) {
  const { t } = useTranslation()

  return (
    <div className="labor-page__content diagnostik-freetext">
      <header className="diagnostik-freetext__section-head">
        <h2 className="diagnostik-freetext__section-title">{t('imagingSectionHeading')}</h2>
        {onRequestAnforderung ? (
          <button
            type="button"
            className="diagnostik-befunde__action-btn diagnostik-befunde__action-btn--request"
            onClick={() => onRequestAnforderung(ANFORDERUNG_PRESET_IMAGING)}
            title={t('imagingRequest')}
          >
            {t('imagingRequest')}
          </button>
        ) : null}
      </header>

      <div className="diagnostik-freetext__grid">
        <FreeTextBefundPanel
          caseId={caseId}
          modality="cct"
          title={t('freeTextBefundCctTitle')}
        />
        <FreeTextBefundPanel
          caseId={caseId}
          modality="mrt"
          title={t('freeTextBefundMrtTitle')}
        />
      </div>
    </div>
  )
}
