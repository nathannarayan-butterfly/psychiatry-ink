import { useTranslation } from '../../context/TranslationContext'
import { ANFORDERUNG_PRESET_EEG } from '../../data/anforderungenCatalog'
import type { AnforderungModalPreset } from '../../types/anforderung'
import { FreeTextBefundPanel } from './FreeTextBefundPanel'

interface DiagnostikEegSectionProps {
  caseId: string
  onRequestAnforderung?: (preset?: AnforderungModalPreset | null) => void
}

export function DiagnostikEegSection({
  caseId,
  onRequestAnforderung,
}: DiagnostikEegSectionProps) {
  const { t } = useTranslation()

  return (
    <div className="labor-page__content diagnostik-freetext">
      <FreeTextBefundPanel
        caseId={caseId}
        modality="eeg"
        title={t('freeTextBefundEegTitle')}
        requestPreset={ANFORDERUNG_PRESET_EEG}
        requestLabel={t('befundRequestEeg')}
        onRequestAnforderung={onRequestAnforderung}
      />
    </div>
  )
}
