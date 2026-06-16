import { Pill } from 'lucide-react'

import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { MedicationOverviewData } from './types'

interface MedicationOverviewCardProps {
  data: MedicationOverviewData
  onOpenMedikation: () => void
}

/**
 * Current regimen at a glance: substance · status · dose. Deliberately restrained
 * — the academic receptor/class breakdown lives on the Medikation tab; here we
 * show only what a psychiatrist needs to read the plan, plus the last change.
 */
export function MedicationOverviewCard({ data, onOpenMedikation }: MedicationOverviewCardProps) {
  const hasMeds = data.meds.length > 0

  return (
    <OverviewCard
      title="Aktuelle Medikation"
      icon={<Pill size={15} />}
      className="ov-col-6"
      badge={{ label: `${data.activeCount} aktiv`, tone: 'neutral' }}
      action={{ label: 'Zur Medikation', onClick: onOpenMedikation }}
    >
      {!hasMeds ? (
        <OverviewEmpty>Keine aktive Medikation hinterlegt.</OverviewEmpty>
      ) : (
        <>
          <ul className="ov-med__regimen">
            {data.meds.map((med) => (
              <li key={med.id} className="ov-med__row">
                <span className="ov-med__name">{med.substance}</span>
                {med.statusLabel ? (
                  <span className={`ov-pill ov-pill--${med.status === 'paused' ? 'moderate' : 'info'}`}>
                    {med.statusLabel}
                  </span>
                ) : null}
                <span className="ov-med__dose">{med.dose}</span>
              </li>
            ))}
          </ul>

          {data.lastChange ? (
            <p className="ov-meta ov-med__footer">
              Letzte Änderung: {data.lastChange.dateLabel} · {data.lastChange.substances.join(', ')}
            </p>
          ) : null}
        </>
      )}
    </OverviewCard>
  )
}
