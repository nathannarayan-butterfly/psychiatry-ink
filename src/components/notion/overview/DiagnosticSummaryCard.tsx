import type { DiagnosticExamSummary } from '../../../utils/overview/diagnosticSummaries'
import { OverviewCard, OverviewEmpty } from './OverviewCard'

interface DiagnosticSummaryCardProps {
  title: string
  data: DiagnosticExamSummary
  onOpen?: () => void
  actionLabel?: string
}

function statusTone(status: DiagnosticExamSummary['status']): 'ok' | 'high' | 'neutral' {
  if (status === 'normal') return 'ok'
  if (status === 'abnormal') return 'high'
  return 'neutral'
}

export function DiagnosticSummaryCard({
  title,
  data,
  onOpen,
  actionLabel = 'Öffnen',
}: DiagnosticSummaryCardProps) {
  const meta = [data.statusLabel, data.dateLabel].filter(Boolean).join(' · ') || null

  return (
    <OverviewCard
      title={title}
      className="ov-col-6"
      meta={meta}
      badge={data.conducted ? { label: data.statusLabel, tone: statusTone(data.status) } : undefined}
      action={onOpen ? { label: actionLabel, onClick: onOpen } : undefined}
    >
      {!data.conducted ? (
        <OverviewEmpty>{data.statusLabel}</OverviewEmpty>
      ) : data.briefFinding ? (
        <p className="ov-snapshot__text">{data.briefFinding}</p>
      ) : (
        <OverviewEmpty>{data.statusLabel}</OverviewEmpty>
      )}
    </OverviewCard>
  )
}
