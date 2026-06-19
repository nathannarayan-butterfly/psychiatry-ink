import type { VerlaufstendenzSummary } from '../../../utils/overview/verlaufstendenzSummary'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import { SymptomTrajectoryChart } from './SymptomTrajectoryChart'

interface VerlaufstendenzCardProps {
  data: VerlaufstendenzSummary
}

export function VerlaufstendenzCard({ data }: VerlaufstendenzCardProps) {
  const meta = data.courseLabel ? `Letzte Richtung: ${data.courseLabel}` : null

  return (
    <OverviewCard title="Verlaufstendenz" className="ov-col-6" meta={meta}>
      <p className="ov-stub__message">{data.stubMessage}</p>

      {data.hasHeuristic ? (
        <div className="ov-snapshot__trend ov-snapshot__trend--flat">
          <p className="cm-chart-title">Dokumentierte Verlaufsrichtung</p>
          <SymptomTrajectoryChart points={data.trajectory} />
        </div>
      ) : (
        <OverviewEmpty>Keine ausreichende Verlaufshistorie für eine Tendenz.</OverviewEmpty>
      )}
    </OverviewCard>
  )
}
