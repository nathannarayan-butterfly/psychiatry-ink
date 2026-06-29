import { useTranslation } from '../../context/TranslationContext'
import { ANFORDERUNG_PRESET_IMAGING } from '../../data/anforderungenCatalog'
import type { AnforderungModalPreset } from '../../types/anforderung'
import type { BefundType } from '../../types/befund'
import {
  DiagnostikBefundeMain,
  DiagnostikBefundeSidebar,
  useDiagnostikBefunde,
} from './DiagnostikBefundeSection'
import { FreeTextBefundPanel } from './FreeTextBefundPanel'

interface DiagnostikImagingSectionProps {
  caseId: string
  onRequestAnforderung?: (preset?: AnforderungModalPreset | null) => void
}

/** Bildgebende Verfahren: structured Röntgen befunde plus free-text CT / MRT. */
const ROENTGEN_BEFUND_TYPES: BefundType[] = ['roentgen']

export function DiagnostikImagingSection({
  caseId,
  onRequestAnforderung,
}: DiagnostikImagingSectionProps) {
  const { t } = useTranslation()
  // Dedicated archive view scoped to Röntgen so the imaging tab keeps its own
  // selection independent of the EKG tab (which reads the same befund archive).
  const roentgenBefunde = useDiagnostikBefunde(caseId)

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

      <section className="diagnostik-imaging__roentgen" aria-label={t('imagingRoentgenHeading')}>
        <h3 className="diagnostik-imaging__roentgen-title">{t('imagingRoentgenHeading')}</h3>
        <div className="diagnostik-imaging__roentgen-body">
          <div className="diagnostik-imaging__roentgen-list">
            <DiagnostikBefundeSidebar
              caseId={caseId}
              records={roentgenBefunde.records}
              selectedId={roentgenBefunde.selectedId}
              onSelect={roentgenBefunde.setSelectedId}
              types={ROENTGEN_BEFUND_TYPES}
            />
          </div>
          <DiagnostikBefundeMain
            caseId={caseId}
            records={roentgenBefunde.records}
            selectedId={roentgenBefunde.selectedId}
            onSelect={roentgenBefunde.setSelectedId}
            onRecordsChange={roentgenBefunde.refresh}
            onRequestAnforderung={onRequestAnforderung}
            types={ROENTGEN_BEFUND_TYPES}
          />
        </div>
      </section>

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
