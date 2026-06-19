import type { ParameterMonitoringRow } from '../notion/overview/types'
import { formatParameterMonitoringLabel } from '../../utils/overview/medicationMonitoring'

interface ParameterMonitoringListProps {
  rows: ParameterMonitoringRow[]
  notDocumentedLabel: string
  className?: string
}

export function ParameterMonitoringList({
  rows,
  notDocumentedLabel,
  className,
}: ParameterMonitoringListProps) {
  if (rows.length === 0) return null

  return (
    <div className={['parameter-monitoring-list', className].filter(Boolean).join(' ')}>
      {rows.map((row) => (
        <div key={row.key} className="parameter-monitoring-list__row">
          <span className="parameter-monitoring-list__label">
            {formatParameterMonitoringLabel(row)}
          </span>
          <span
            className={`parameter-monitoring-list__value${row.missing ? ' parameter-monitoring-list__value--missing' : ''}`}
          >
            {row.missing
              ? notDocumentedLabel
              : [row.valueLabel, row.refLabel ? `Ref: ${row.refLabel}` : null, row.dateLabel]
                  .filter(Boolean)
                  .join(' · ')}
          </span>
        </div>
      ))}
    </div>
  )
}
