import { OverviewCard, OverviewEmpty } from './OverviewCard'
import { SymptomTrajectoryChart } from './SymptomTrajectoryChart'
import type { SymptomSnapshotData } from './types'

interface SymptomSnapshotCardProps {
  data: SymptomSnapshotData
  onOpen?: () => void
}

/**
 * Psychopathology section — structured cues + thin trajectory chart, flat layout.
 */
export function SymptomSnapshotCard({ data, onOpen }: SymptomSnapshotCardProps) {
  const hasContent =
    Boolean(data.snapshotText) || data.structured.length > 0 || Boolean(data.courseLabel)
  const title = data.contextLabel ? `Psychopathologie (${data.contextLabel})` : 'Psychopathologie'
  const meta =
    [data.courseLabel, data.asOfLabel ? `Stand ${data.asOfLabel}` : null].filter(Boolean).join(' · ') ||
    null

  return (
    <OverviewCard
      title={title}
      className="ov-col-6"
      meta={meta}
      action={onOpen ? { label: 'Befund öffnen', onClick: onOpen } : undefined}
    >
      {!hasContent ? (
        <OverviewEmpty>Kein psychopathologischer Befund hinterlegt.</OverviewEmpty>
      ) : null}

      {data.structured.length > 0 ? (
        <div className="ov-snapshot__cues ov-snapshot__cues--flat">
          {data.structured.map((cue) => (
            <div key={cue.label} className="cm-cue-row">
              <span className="cm-cue-label">{cue.label}</span>
              <span
                className={
                  cue.value === 'nicht dokumentiert'
                    ? 'cm-cue-value cm-cue-value--missing'
                    : 'cm-cue-value'
                }
              >
                {cue.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {data.snapshotText ? <p className="ov-snapshot__text">{data.snapshotText}</p> : null}

      {data.trajectory.length >= 2 ? (
        <div className="ov-snapshot__trend ov-snapshot__trend--flat">
          <p className="cm-chart-title">Verlaufstendenz</p>
          <p className="cm-chart-axis">
            Y-Achse: Verlaufsrichtung · X-Achse: Zeit · niedrigere Werte = weniger Symptomlast
          </p>
          <SymptomTrajectoryChart points={data.trajectory} />
        </div>
      ) : null}
    </OverviewCard>
  )
}
