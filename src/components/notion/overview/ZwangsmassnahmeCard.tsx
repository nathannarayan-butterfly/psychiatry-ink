import type { ZwangsmassnahmeSummary } from '../../../utils/overview/zwangsmassnahmeSummary'
import { OverviewCard, OverviewEmpty } from './OverviewCard'

interface ZwangsmassnahmeCardProps {
  data: ZwangsmassnahmeSummary
}

export function ZwangsmassnahmeCard({ data }: ZwangsmassnahmeCardProps) {
  return (
    <OverviewCard
      title="Zwangsmaßnahme"
      className="ov-col-6"
      badge={data.statusLabel ? { label: data.statusLabel, tone: 'moderate' } : undefined}
    >
      {data.placeholder ? (
        <div className="ov-stub">
          <p className="ov-stub__message">
            Vollständiger Zwangsmaßnahmen-Workflow noch nicht verfügbar.
          </p>
          <p className="ov-stub__detail">
            Status: {data.statusLabel}. Dokumentation und Freigabeprozess folgen in einer späteren
            Version.
          </p>
        </div>
      ) : (
        <OverviewEmpty>Keine Zwangsmaßnahme beantragt oder genehmigt.</OverviewEmpty>
      )}
    </OverviewCard>
  )
}
