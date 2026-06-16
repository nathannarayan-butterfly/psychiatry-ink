import { Activity, Pill } from 'lucide-react'

import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { MedicationOverviewData } from './types'

interface MedicationOverviewCardProps {
  data: MedicationOverviewData
  onOpenMedikation: () => void
}

export function MedicationOverviewCard({ data, onOpenMedikation }: MedicationOverviewCardProps) {
  const hasMeds = data.meds.length > 0
  const maxClass = data.classes.reduce((m, c) => Math.max(m, c.count), 0)

  return (
    <OverviewCard
      title="Aktuelle Medikation"
      icon={<Pill size={15} />}
      span="wide"
      className="ov-col-7 ov-col-span-full-md ov-card--anchor"
      badge={{ label: String(data.activeCount) + ' aktiv', tone: 'neutral' }}
      action={{ label: 'Zur Medikation', onClick: onOpenMedikation }}
    >
      {!hasMeds ? (
        <OverviewEmpty>Keine aktive Medikation hinterlegt.</OverviewEmpty>
      ) : (
        <div className="ov-med__layout">
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

          <div className="ov-med__viz">
            {data.classes.length ? (
              <div className="ov-med__block">
                <p className="ov-med__block-label">Substanzklassen</p>
                <ul className="ov-bars">
                  {data.classes.map((c) => (
                    <li className="ov-bar" key={c.label}>
                      <span className="ov-bar__label">{c.label}</span>
                      <span className="ov-bar__track" aria-hidden>
                        <span
                          className="ov-bar__fill"
                          style={{ width: `${Math.round((c.count / (maxClass || 1)) * 100)}%` }}
                        />
                      </span>
                      <span className="ov-bar__count">{c.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {data.topReceptors.length ? (
              <div className="ov-med__block">
                <p className="ov-med__block-label">Rezeptorprofil</p>
                <div className="ov-chips">
                  {data.topReceptors.slice(0, 6).map((r) => (
                    <span className="ov-chip" key={r.label}>
                      {`${r.label}${r.count > 1 ? ' ×' + r.count : ''}`}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {data.monitoringFlags.length ? (
              <div className="ov-med__block">
                <p className="ov-med__block-label">Monitoring</p>
                <div className="ov-chips">
                  {data.monitoringFlags.slice(0, 6).map((flag) => (
                    <span className="ov-chip ov-chip--monitor" key={flag}>
                      <Activity size={11} aria-hidden />
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {data.lastChange ? (
              <div className="ov-med__block">
                <p className="ov-med__block-label">Letzte Änderung</p>
                <span className="ov-meta">
                  {data.lastChange.dateLabel} · {data.lastChange.substances.join(', ')}
                </span>
              </div>
            ) : null}

            {!data.hasReferenceData ? (
              <p className="ov-meta">Keine Referenzdaten für Rezeptor-/Monitoringanalyse.</p>
            ) : null}
          </div>
        </div>
      )}
    </OverviewCard>
  )
}
