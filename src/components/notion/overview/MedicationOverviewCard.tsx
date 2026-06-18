import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { MedicationOverviewData } from './types'

interface MedicationOverviewCardProps {
  data: MedicationOverviewData
  onOpenMedikation: () => void
  className?: string
}

/**
 * Current regimen at a glance — substance + Dosis in a flat clinical row layout.
 */
export function MedicationOverviewCard({
  data,
  onOpenMedikation,
  className = 'ov-col-6',
}: MedicationOverviewCardProps) {
  const hasMeds = data.meds.length > 0

  return (
    <OverviewCard
      title="Medikation"
      className={className}
      badge={{ label: `${data.activeCount} aktiv`, tone: 'neutral' }}
      action={{ label: 'Zur Medikation', onClick: onOpenMedikation }}
    >
      {!hasMeds ? (
        <OverviewEmpty>Keine aktive Medikation hinterlegt.</OverviewEmpty>
      ) : (
        <>
          <ul className="ov-med__regimen ov-med__regimen--flat">
            {data.meds.map((med) => (
              <li key={med.id} className="ov-med__row">
                <span className="ov-med__name">{med.substance}</span>
                {med.statusLabel ? (
                  <span className="ov-pill ov-pill--neutral ov-pill--text">{med.statusLabel}</span>
                ) : null}
                <span className="ov-med__dose">{med.dose}</span>
              </li>
            ))}
          </ul>

          {data.lastChange ? (
            <p className="cm-med-note ov-med__footer-note">
              Letzte Änderung: {data.lastChange.dateLabel} · {data.lastChange.substances.join(', ')}
            </p>
          ) : null}
        </>
      )}
    </OverviewCard>
  )
}
