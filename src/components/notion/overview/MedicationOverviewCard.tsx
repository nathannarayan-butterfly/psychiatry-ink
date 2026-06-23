import { useTranslation } from '../../../context/TranslationContext'
import { translateMedicationUi } from '../../../data/medicationUiTranslations'
import { ReceptorRadarChart } from '../../medication/ReceptorRadarChart'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import { SpiegelwerteSection } from '../SpiegelwerteSection'
import type { MedicationOverviewData } from './types'

interface MedicationOverviewCardProps {
  data: MedicationOverviewData
  onOpenMedikation: () => void
  /** Case id — enables the embedded drug-level Spiegelwerte charts. */
  caseId?: string
  className?: string
}

/**
 * Current regimen at a glance — substance + Dosis in a flat clinical row layout.
 */
export function MedicationOverviewCard({
  data,
  onOpenMedikation,
  caseId,
  className = 'ov-col-6',
}: MedicationOverviewCardProps) {
  const { t, language } = useTranslation()
  const hasMeds = data.meds.length > 0
  const showReceptor =
    data.receptorFingerprint != null && data.receptorFingerprint.targets.length >= 3

  return (
    <OverviewCard
      title={t('overviewWidgetMedication')}
      className={className}
      badge={{ label: `${data.activeCount} ${t('overviewGlanceMedsActiveUnit')}`, tone: 'neutral' }}
      action={{ label: t('overviewMedOpenAction'), onClick: onOpenMedikation }}
    >
      {!hasMeds ? (
        <OverviewEmpty>{t('overviewMedEmpty')}</OverviewEmpty>
      ) : (
        <>
          <ul className="ov-med__regimen ov-med__regimen--flat">
            {data.meds.map((med) => (
              <li key={med.id} className="ov-med__row">
                <span className="ov-med__name ov-value-emphasis">{med.substance}</span>
                {med.statusLabel ? (
                  <span className="ov-pill ov-pill--neutral ov-pill--text">{med.statusLabel}</span>
                ) : null}
                <span className="ov-med__dose">{med.dose}</span>
              </li>
            ))}
          </ul>

          {data.lastChange ? (
            <p className="cm-med-note ov-med__footer-note">
              {t('overviewMedLastChange')
                .replace('{date}', data.lastChange.dateLabel)
                .replace('{substances}', data.lastChange.substances.join(', '))}
            </p>
          ) : null}
        </>
      )}

      {caseId || showReceptor ? (
        <div className="ov-med__analytics">
          {caseId ? (
            <div className="ov-med__spiegel">
              <SpiegelwerteSection caseId={caseId} mode="all" />
            </div>
          ) : null}
          {showReceptor ? (
            <div className="ov-med__receptor">
              <div className="ov-med__receptor-head">
                <h3 className="ov-med__subsection-title">{t('kbReceptorTitle')}</h3>
              </div>
              <ReceptorRadarChart
                affinityTargets={data.receptorFingerprint!.targets}
                substanceName={translateMedicationUi(language, 'medDashReceptorTitle')}
                language={language}
                variant="inline"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </OverviewCard>
  )
}
