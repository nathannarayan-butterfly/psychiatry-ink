import { useTranslation } from '../../context/TranslationContext'
import { ANFORDERUNG_PRESET_EEG } from '../../data/anforderungenCatalog'
import type { AnforderungModalPreset } from '../../types/anforderung'
import { DiagnostikSectionShell } from './DiagnostikSectionShell'
import { FreeTextBefundPanel } from './FreeTextBefundPanel'

interface DiagnostikEegSectionProps {
  caseId: string
  onRequestAnforderung?: (preset?: AnforderungModalPreset | null) => void
}

/** EEG-Befunde: free-text panel (with KI-Optimierung) on the canonical shell. */
export function DiagnostikEegSection({
  caseId,
  onRequestAnforderung,
}: DiagnostikEegSectionProps) {
  const { t } = useTranslation()
  return (
    <DiagnostikSectionShell
      title={t('diagnosticsSectionEeg')}
      requestLabel={t('befundRequestEeg')}
      onRequest={
        onRequestAnforderung ? () => onRequestAnforderung(ANFORDERUNG_PRESET_EEG) : undefined
      }
    >
      <FreeTextBefundPanel caseId={caseId} modality="eeg" title={t('freeTextBefundEegTitle')} />
    </DiagnostikSectionShell>
  )
}
