import { useTranslation } from '../../context/TranslationContext'
import { ANFORDERUNG_PRESET_IMAGING } from '../../data/anforderungenCatalog'
import type { AnforderungModalPreset } from '../../types/anforderung'
import type { BefundType } from '../../types/befund'
import { useDiagnostikBefunde } from './DiagnostikBefundeSection'
import { DiagnostikSectionShell } from './DiagnostikSectionShell'
import { DiagnostikStructuredBefundPanel } from './DiagnostikStructuredBefundPanel'
import { FreeTextBefundPanel } from './FreeTextBefundPanel'

/** Bildgebende Verfahren: structured Röntgen befunde plus free-text CT / MRT. */
const ROENTGEN_BEFUND_TYPES: BefundType[] = ['roentgen']

interface DiagnostikImagingSectionProps {
  caseId: string
  onRequestAnforderung?: (preset?: AnforderungModalPreset | null) => void
}

export function DiagnostikImagingSection({
  caseId,
  onRequestAnforderung,
}: DiagnostikImagingSectionProps) {
  const { t } = useTranslation()
  // Dedicated archive view scoped to Röntgen so the imaging tab keeps its own
  // selection independent of the EKG tab (which reads the same befund archive).
  const roentgenBefunde = useDiagnostikBefunde(caseId)

  return (
    <DiagnostikSectionShell
      title={t('imagingSectionHeading')}
      requestLabel={t('imagingRequest')}
      onRequest={
        onRequestAnforderung ? () => onRequestAnforderung(ANFORDERUNG_PRESET_IMAGING) : undefined
      }
    >
      <section className="diagnostik-imaging__roentgen" aria-label={t('imagingRoentgenHeading')}>
        <h3 className="diagnostik-imaging__roentgen-title">{t('imagingRoentgenHeading')}</h3>
        <DiagnostikStructuredBefundPanel
          caseId={caseId}
          befunde={roentgenBefunde}
          types={ROENTGEN_BEFUND_TYPES}
        />
      </section>

      <div className="diagnostik-freetext__grid">
        <FreeTextBefundPanel caseId={caseId} modality="cct" title={t('freeTextBefundCctTitle')} />
        <FreeTextBefundPanel caseId={caseId} modality="mrt" title={t('freeTextBefundMrtTitle')} />
      </div>
    </DiagnostikSectionShell>
  )
}
