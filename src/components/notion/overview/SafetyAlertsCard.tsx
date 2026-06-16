import { ShieldAlert } from 'lucide-react'

import { OverviewCard, type SemanticTone } from './OverviewCard'
import { RiskGauge } from './RiskGauge'
import type { SafetyData } from './types'

interface SafetyAlertsCardProps {
  data: SafetyData
}

const TONE_SEVERITY: Record<SemanticTone, number> = {
  high: 5,
  moderate: 4,
  info: 3,
  low: 2,
  ok: 1,
  neutral: 0,
}

const TONE_LABEL: Record<SemanticTone, string> = {
  high: 'akut',
  moderate: 'erhöht',
  ok: 'unauffällig',
  low: 'gering',
  info: 'beachten',
  neutral: '—',
}

/** Severity → gauge fill fraction (semantic, not the area accent). */
const TONE_FRACTION: Record<SemanticTone, number> = {
  high: 1,
  moderate: 0.66,
  info: 0.42,
  low: 0.24,
  ok: 0.12,
  neutral: 0.12,
}

function highestTone(tones: SemanticTone[]): SemanticTone {
  return tones.reduce<SemanticTone>(
    (acc, tone) => (TONE_SEVERITY[tone] > TONE_SEVERITY[acc] ? tone : acc),
    'ok',
  )
}

export function SafetyAlertsCard({ data }: SafetyAlertsCardProps) {
  const allTones: SemanticTone[] = [
    ...(data.risk ? [data.risk.tone] : []),
    ...data.alerts.map((alert) => alert.tone),
  ]
  const headlineTone: SemanticTone = allTones.length > 0 ? highestTone(allTones) : 'ok'

  const severeAlerts = data.alerts.filter(
    (alert) => alert.tone === 'high' || alert.tone === 'moderate',
  )
  const badge =
    severeAlerts.length > 0
      ? {
          label: `${severeAlerts.length} Alerts`,
          tone: severeAlerts.some((alert) => alert.tone === 'high')
            ? ('high' as const)
            : ('moderate' as const),
        }
      : undefined

  const gaugeValue = data.hasAnySignal ? String(data.alerts.length) : '✓'

  return (
    <OverviewCard
      title="Sicherheit & Alerts"
      icon={<ShieldAlert size={15} />}
      variant="safety"
      tone={headlineTone}
      badge={badge}
      className="ov-col-5"
    >
      <div className="ov-safety__summary">
        <RiskGauge
          tone={headlineTone}
          fraction={TONE_FRACTION[headlineTone]}
          value={gaugeValue}
          label={TONE_LABEL[headlineTone]}
        />
        <div className="ov-safety__headline">
          {data.risk ? (
            <>
              <span className="ov-safety__risk-label">{data.risk.label}</span>
              <span className={`ov-pill ov-pill--${data.risk.tone}`}>
                {TONE_LABEL[data.risk.tone]}
              </span>
              {data.risk.detail ? (
                <span className="ov-safety__risk-detail">{data.risk.detail}</span>
              ) : null}
            </>
          ) : data.hasAnySignal ? (
            <span className="ov-safety__risk-detail">
              {data.alerts.length} aktive{data.alerts.length === 1 ? 's' : ''} Sicherheitssignal
              {data.alerts.length === 1 ? '' : 'e'} aus dem Regime.
            </span>
          ) : (
            <span className="ov-allclear">Keine aktiven Sicherheitssignale.</span>
          )}
        </div>
      </div>

      {data.alerts.length > 0 ? (
        <ul className="ov-list">
          {data.alerts.map((alert) => (
            <li key={alert.id} className={`ov-alert ov-alert--${alert.tone}`}>
              <div className="ov-alert__body">
                <span className="ov-alert__title">{alert.title}</span>
                {alert.detail ? (
                  <span className="ov-alert__detail">{alert.detail}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </OverviewCard>
  )
}
