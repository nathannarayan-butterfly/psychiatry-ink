import { Activity } from 'lucide-react'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import { SymptomTrajectoryChart } from './SymptomTrajectoryChart'
import type { SymptomSnapshotData } from './types'

interface SymptomSnapshotCardProps {
  data: SymptomSnapshotData
  onOpen?: () => void
}

/**
 * Symptom trajectory surrogate. The model has no psychometric score timeseries,
 * so we present the latest psychopathology snapshot + structured cues (affect,
 * drive, thought content, insight) and the course direction instead.
 */
export function SymptomSnapshotCard({ data, onOpen }: SymptomSnapshotCardProps) {
  const hasContent =
    Boolean(data.snapshotText) || data.structured.length > 0 || Boolean(data.courseLabel)

  return (
    <OverviewCard
      title="Psychopathologie"
      icon={<Activity size={15} />}
      className="ov-col-6"
      badge={data.courseLabel ? { label: data.courseLabel, tone: 'neutral' } : undefined}
      action={onOpen ? { label: 'Befund öffnen', onClick: onOpen } : undefined}
    >
      {!hasContent ? (
        <OverviewEmpty>Kein psychopathologischer Befund hinterlegt.</OverviewEmpty>
      ) : null}

      {data.trajectory.length >= 2 ? (
        <div className="ov-snapshot__trend">
          <p className="ov-block-label">Verlaufstendenz</p>
          <SymptomTrajectoryChart points={data.trajectory} />
        </div>
      ) : null}

      {data.snapshotText ? <p className="ov-snapshot__text">{data.snapshotText}</p> : null}

      {data.structured.length > 0 ? (
        <div className="ov-snapshot__cues">
          {data.structured.map((cue) => (
            <div key={cue.label}>
              <div className="ov-snapshot__cue-label">{cue.label}</div>
              <div className="ov-snapshot__cue-value">{cue.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {data.asOfLabel ? <span className="ov-meta">Stand: {data.asOfLabel}</span> : null}
    </OverviewCard>
  )
}
