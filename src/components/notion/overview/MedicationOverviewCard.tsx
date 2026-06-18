import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { MedicationOverviewData } from './types'

interface MedicationOverviewCardProps {
  data: MedicationOverviewData
  onOpenMedikation: () => void
  className?: string
}

function splitDoseParts(dose: string): { schema: string; unit: string | null } {
  const match = dose.match(/^(.+?)\s*(mg|µg|mcg|g|ml|%|IE|I\.E\.)$/i)
  if (!match) return { schema: dose, unit: null }
  return { schema: match[1].trim(), unit: match[2] }
}

/**
 * Current regimen at a glance — monospace dose notation, flat typographic block.
 */
export function MedicationOverviewCard({
  data,
  onOpenMedikation,
  className = 'ov-col-6',
}: MedicationOverviewCardProps) {
  const hasMeds = data.meds.length > 0
  const primary = data.meds[0]

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
          {primary ? (
            <div className="ov-med__primary">
              <div className="cm-med-row">
                <span className="cm-med-name">{primary.substance}</span>
                {data.lastChange ? (
                  <span className="cm-med-since">seit {data.lastChange.dateLabel}</span>
                ) : null}
              </div>
              <p className="cm-med-dose">
                {splitDoseParts(primary.dose).schema}
                {splitDoseParts(primary.dose).unit ? (
                  <span className="cm-med-dose-unit">{splitDoseParts(primary.dose).unit}</span>
                ) : null}
              </p>
            </div>
          ) : null}

          {data.meds.length > 1 ? (
            <ul className="ov-med__regimen ov-med__regimen--flat">
              {data.meds.slice(1).map((med) => (
                <li key={med.id} className="cm-med-row">
                  <span className="cm-med-name" style={{ fontSize: '0.9375rem' }}>
                    {med.substance}
                  </span>
                  {med.statusLabel ? (
                    <span className="ov-pill ov-pill--neutral ov-pill--text">{med.statusLabel}</span>
                  ) : null}
                  <span className="cm-med-dose" style={{ fontSize: '1rem', margin: 0 }}>
                    {med.dose}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {data.lastChange ? (
            <p className="cm-med-note">
              Letzte Änderung: {data.lastChange.dateLabel} · {data.lastChange.substances.join(', ')}
            </p>
          ) : null}
        </>
      )}
    </OverviewCard>
  )
}
