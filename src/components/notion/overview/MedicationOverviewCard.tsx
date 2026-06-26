import { useTranslation } from '../../../context/TranslationContext'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { MedicationOverviewData } from './types'

interface MedicationOverviewCardProps {
  data: MedicationOverviewData
  onOpenMedikation: () => void
  className?: string
}

/**
 * Current regimen at a glance — substance + Dosis in a flat clinical row layout.
 * Drug-level Spiegelwerte and the combined receptor profile live in their own
 * dedicated Übersicht widgets (Item 6) rather than being embedded here.
 */
export function MedicationOverviewCard({
  data,
  onOpenMedikation,
  className = 'ov-col-6',
}: MedicationOverviewCardProps) {
  const { t } = useTranslation()
  const hasMeds = data.meds.length > 0

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
    </OverviewCard>
  )
}
