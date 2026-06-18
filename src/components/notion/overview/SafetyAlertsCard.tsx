import { CircleCheck, ShieldAlert } from 'lucide-react'

import { OverviewCard, type SemanticTone } from './OverviewCard'
import type { SafetyAlert, SafetyData, SafetyRiskSignal } from './types'

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

function highestTone(tones: SemanticTone[]): SemanticTone {
  return tones.reduce<SemanticTone>(
    (acc, tone) => (TONE_SEVERITY[tone] > TONE_SEVERITY[acc] ? tone : acc),
    'ok',
  )
}

function RiskSignalIcon({ tone }: { tone: SemanticTone }) {
  if (tone === 'ok' || tone === 'low') {
    return <CircleCheck size={16} aria-hidden className="ov-safety__signal-icon" />
  }
  return <ShieldAlert size={16} aria-hidden className="ov-safety__signal-icon" />
}

function SafetySignalCard({ signal }: { signal: SafetyRiskSignal }) {
  const pillLabel = signal.pillLabel ?? TONE_LABEL[signal.tone]
  return (
    <div className={`ov-safety__signal ov-safety__signal--${signal.tone}`}>
      <div className="ov-safety__signal-head">
        <RiskSignalIcon tone={signal.tone} />
        <p className="ov-safety__signal-primary">{signal.label}</p>
      </div>
      {signal.value ? <p className="ov-safety__signal-detail">{signal.value}</p> : null}
      {signal.showPill ? (
        <span className={`ov-pill ov-pill--${signal.tone}`}>{pillLabel}</span>
      ) : null}
    </div>
  )
}

function AlertList({ alerts }: { alerts: SafetyAlert[] }) {
  if (alerts.length === 0) return null
  return (
    <ul className="ov-list">
      {alerts.map((alert) => (
        <li key={alert.id} className={`ov-alert ov-alert--${alert.tone}`}>
          <div className="ov-alert__body">
            <span className="ov-alert__title">{alert.title}</span>
            {alert.detail ? <span className="ov-alert__detail">{alert.detail}</span> : null}
          </div>
        </li>
      ))}
    </ul>
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

  const acuteSignals = data.risk?.signals ?? []
  const allergyAlerts = data.alerts.filter((alert) => alert.category === 'allergy')
  const interactionAlerts = data.alerts.filter((alert) => alert.category === 'interaction')
  const monitoringAlerts = data.alerts.filter((alert) => alert.category === 'monitoring')
  const groupedAlertSections =
    (allergyAlerts.length > 0 ? 1 : 0) +
    (interactionAlerts.length > 0 ? 1 : 0) +
    (monitoringAlerts.length > 0 ? 1 : 0)
  const showInteractionSubhead = interactionAlerts.length > 0 && groupedAlertSections > 1
  const showMonitoringSubhead = monitoringAlerts.length > 0

  return (
    <OverviewCard
      title="Sicherheit & Alerts"
      icon={<ShieldAlert size={15} />}
      variant="safety"
      tone={headlineTone}
      badge={badge}
      className="ov-col-6"
    >
      {acuteSignals.length > 0 ? (
        <section className="ov-safety__signals" aria-label="Akute Sicherheitssignale">
          {acuteSignals.map((signal) => (
            <SafetySignalCard key={signal.id} signal={signal} />
          ))}
        </section>
      ) : data.risk ? (
        <div className="ov-safety__headline">
          <span className="ov-safety__risk-label">{data.risk.label}</span>
          <span className={`ov-pill ov-pill--${data.risk.tone}`}>{TONE_LABEL[data.risk.tone]}</span>
          {data.risk.detail ? (
            <span className="ov-safety__risk-detail">{data.risk.detail}</span>
          ) : null}
        </div>
      ) : data.hasAnySignal ? (
        <div className="ov-safety__headline">
          <span className="ov-safety__risk-label">Risiko</span>
          <span className={`ov-pill ov-pill--${headlineTone}`}>{TONE_LABEL[headlineTone]}</span>
          <span className="ov-safety__risk-detail">
            {data.alerts.length} aktive{data.alerts.length === 1 ? 's' : ''} Sicherheitssignal
            {data.alerts.length === 1 ? '' : 'e'} aus dem Regime.
          </span>
        </div>
      ) : (
        <div className="ov-safety__headline">
          <span className="ov-safety__risk-label">Risiko</span>
          <span className="ov-pill ov-pill--ok">unauffällig</span>
        </div>
      )}

      {allergyAlerts.length > 0 ? <AlertList alerts={allergyAlerts} /> : null}

      {interactionAlerts.length > 0 ? (
        <>
          {showInteractionSubhead ? <p className="ov-subhead">Wechselwirkungen</p> : null}
          <AlertList alerts={interactionAlerts} />
        </>
      ) : null}

      {monitoringAlerts.length > 0 ? (
        <>
          {showMonitoringSubhead ? <p className="ov-subhead">Überwachung</p> : null}
          <AlertList alerts={monitoringAlerts} />
        </>
      ) : null}

      {data.alerts.length === 0 && !data.hasAnySignal ? (
        <div className="ov-allclear">Keine aktiven Sicherheitssignale.</div>
      ) : null}
    </OverviewCard>
  )
}
