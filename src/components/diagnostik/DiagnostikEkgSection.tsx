import { useTranslation } from '../../context/TranslationContext'
import { ANFORDERUNG_PRESET_EKG } from '../../data/anforderungenCatalog'
import type { AnforderungModalPreset } from '../../types/anforderung'
import type { BefundType } from '../../types/befund'
import { type useDiagnostikBefunde } from './DiagnostikBefundeSection'
import { DiagnostikSectionShell } from './DiagnostikSectionShell'
import { DiagnostikStructuredBefundPanel } from './DiagnostikStructuredBefundPanel'

const EKG_BEFUND_TYPES: BefundType[] = ['ecg']

interface DiagnostikEkgSectionProps {
  caseId: string
  befunde: ReturnType<typeof useDiagnostikBefunde>
  onRequestAnforderung?: (preset?: AnforderungModalPreset | null) => void
}

/** EKG-Befunde: structured befund list + detail, on the canonical section shell. */
export function DiagnostikEkgSection({
  caseId,
  befunde,
  onRequestAnforderung,
}: DiagnostikEkgSectionProps) {
  const { t } = useTranslation()
  return (
    <DiagnostikSectionShell
      title={t('diagnosticsSectionEkg')}
      requestLabel={t('befundRequestEcg')}
      onRequest={
        onRequestAnforderung ? () => onRequestAnforderung(ANFORDERUNG_PRESET_EKG) : undefined
      }
    >
      <DiagnostikStructuredBefundPanel caseId={caseId} befunde={befunde} types={EKG_BEFUND_TYPES} />
    </DiagnostikSectionShell>
  )
}
