import { useTranslation } from '../../../context/TranslationContext'
import { translateMedicationUi } from '../../../data/medicationUiTranslations'
import { ReceptorRadarChart } from '../../medication/ReceptorRadarChart'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { MedicationOverviewData } from './types'

interface ReceptorProfileOverviewCardProps {
  data: MedicationOverviewData
  onOpenMedikation: () => void
  className?: string
}

/**
 * Combined receptor fingerprint of the active regimen as its own Übersicht
 * widget (Item 6 — split out of the Medikation card so the layout stays even).
 */
export function ReceptorProfileOverviewCard({
  data,
  onOpenMedikation,
  className = 'ov-col-6',
}: ReceptorProfileOverviewCardProps) {
  const { t, language } = useTranslation()
  const hasReceptor =
    data.receptorFingerprint != null && data.receptorFingerprint.targets.length >= 3

  return (
    <OverviewCard
      title={t('kbReceptorTitle')}
      className={className}
      action={{ label: t('overviewMedOpenAction'), onClick: onOpenMedikation }}
    >
      {!hasReceptor ? (
        <OverviewEmpty>{t('overviewReceptorEmpty')}</OverviewEmpty>
      ) : (
        <div className="ov-med__receptor">
          <ReceptorRadarChart
            affinityTargets={data.receptorFingerprint!.targets}
            substanceName={translateMedicationUi(language, 'medDashReceptorTitle')}
            language={language}
            variant="inline"
          />
        </div>
      )}
    </OverviewCard>
  )
}
