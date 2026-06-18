import { CircleCheck, ShieldAlert } from 'lucide-react'

import { ClinicalQuietStrip } from '../../clinical/ClinicalQuietStrip'
import { ClinicalEyebrow } from '../../clinical/ClinicalEyebrow'
import type { SemanticTone } from './OverviewCard'
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

function highestTone(tones: SemanticTone[]): SemanticTone {
  return tones.reduce<SemanticTone>(
    (acc, tone) => (TONE_SEVERITY[tone] > TONE_SEVERITY[acc] ? tone : acc),
    'ok',
  )
}

function RiskSignalIcon({ tone }: { tone: SemanticTone }) {
  if (tone === 'ok' || tone === 'low') {
    return <CircleCheck size={14} aria-hidden className="ov-safety__signal-icon" />
  }
  return <ShieldAlert size={14} aria-hidden className="ov-safety__signal-icon" />
}

function SafetySignalRow({ signal }: { signal: SafetyRiskSignal }) {
  return (
    <div className={`ov-safety__signal-row ov-safety__signal-row--${signal.tone}`}>
      <RiskSignalIcon tone={signal.tone} />
      <div className="ov-safety__signal-copy">
        <span className="ov-safety__signal-primary">{signal.label}</span>
        {signal.value ? <span className="ov-safety__signal-detail">{signal.value}</span> : null}
      </div>
    </div>
  )
}

function AlertList({ alerts }: { alerts: SafetyAlert[] }) {
  if (alerts.length === 0) return null
  return (
    <ul className="ov-list ov-list--flat">
      {alerts.map((alert) => (
        <li key={alert.id} className={`ov-alert ov-alert--${alert.tone} ov-alert--flat`}>
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

  const headline =
    acuteSignals.length > 0
      ? acuteSignals[0].label
      : data.risk?.label ??
        (data.alerts.length > 0
          ? `${data.alerts.length} aktive Sicherheitssignale`
          : 'Keine akute Eigengefährdung')

  const detail =
    data.risk?.detail ??
    (data.alerts.length > 0 && !data.risk?.detail
      ? `Letzte Beurteilung aus Verlaufsdokumentation · ${data.alerts.length} Alert${data.alerts.length === 1 ? '' : 's'}`
      : 'Letzte Beurteilung aus Verlaufsdokumentation')

  return (
    <ClinicalQuietStrip
      eyebrow="Sicherheit"
      headline={headline}
      detail={detail}
      tone={headlineTone}
      className="ov-col-6 ov-safety-strip"
      aria-label="Sicherheitsbeurteilung"
    >
      {acuteSignals.length > 1 ? (
        <div className="ov-safety__signals ov-safety__signals--flat">
          {acuteSignals.slice(1).map((signal) => (
            <SafetySignalRow key={signal.id} signal={signal} />
          ))}
        </div>
      ) : null}

      {allergyAlerts.length > 0 ? <AlertList alerts={allergyAlerts} /> : null}

      {interactionAlerts.length > 0 ? (
        <>
          {showInteractionSubhead ? <ClinicalEyebrow>Wechselwirkungen</ClinicalEyebrow> : null}
          <AlertList alerts={interactionAlerts} />
        </>
      ) : null}

      {monitoringAlerts.length > 0 ? (
        <>
          {showMonitoringSubhead ? <ClinicalEyebrow>Überwachung</ClinicalEyebrow> : null}
          <AlertList alerts={monitoringAlerts} />
        </>
      ) : null}

      {data.alerts.length === 0 && !data.hasAnySignal ? (
        <p className="cm-quiet-strip__detail">Keine aktiven Sicherheitssignale.</p>
      ) : null}
    </ClinicalQuietStrip>
  )
}
