import { useTranslation } from '../../../context/TranslationContext'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import { ClinicalEyebrow } from '../../clinical/ClinicalEyebrow'
import { ClinicalSection, ClinicalEmpty } from '../../clinical/ClinicalSection'
import { ParameterMonitoringList } from '../../clinical/ParameterMonitoringList'
import type {
  ParameterMonitoringRow,
  SafetyAlert,
  SafetyData,
  SafetyRiskSignal,
} from './types'
import type { SemanticTone } from './OverviewCard'

interface SafetyAlertsCardProps {
  data: SafetyData
}

const RISK_TONE_I18N: Record<SemanticTone, UiTranslationKey> = {
  high: 'overviewRiskToneHigh',
  moderate: 'overviewRiskToneModerate',
  ok: 'overviewRiskToneOk',
  low: 'overviewRiskToneLow',
  info: 'overviewRiskToneInfo',
  neutral: 'overviewRiskToneNeutral',
}

/** Compact risk gauge — tone at a glance, no redundant text label. */
function SafetyRiskRing({ tone }: { tone: SemanticTone }) {
  const { t } = useTranslation()
  const radius = 14
  const circumference = 2 * Math.PI * radius
  const fraction =
    tone === 'high' ? 1 : tone === 'moderate' ? 0.68 : tone === 'info' ? 0.5 : 0.25
  const offset = circumference * (1 - fraction)

  return (
    <span
      className={`ov-safety__ring ov-safety__ring--tone-${tone}`}
      role="img"
      aria-label={t(RISK_TONE_I18N[tone])}
    >
      <svg viewBox="0 0 36 36" fill="none">
        <circle className="ov-safety__ring-track" cx="18" cy="18" r={radius} strokeWidth="4" fill="none" />
        <circle
          className="ov-safety__ring-prog"
          cx="18"
          cy="18"
          r={radius}
          strokeWidth="4"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
    </span>
  )
}

function SafetyAxisStrip({ signal }: { signal: SafetyRiskSignal }) {
  const classes = [
    'cm-quiet-strip',
    'cm-quiet-strip--axis',
    `cm-quiet-strip--tone-${signal.tone}`,
  ].join(' ')

  return (
    <div className={classes}>
      <p className="cm-quiet-strip__headline">{signal.label}</p>
      {signal.value ? <p className="cm-quiet-strip__detail">{signal.value}</p> : null}
      {signal.showPill && signal.pillLabel ? (
        <span className="ov-safety__severity">{signal.pillLabel}</span>
      ) : null}
    </div>
  )
}

function AllergyBlock({ alerts }: { alerts: SafetyAlert[] }) {
  if (alerts.length === 0) return null
  return (
    <div className="ov-safety__allergy-lines">
      {alerts.map((alert) => (
        <p
          key={alert.id}
          className={`ov-safety__allergy-line ov-safety__allergy-line--${alert.tone}`}
        >
          <span className="ov-safety__allergy-primary">{alert.title}</span>
          {alert.detail ? <span className="ov-safety__allergy-detail">{alert.detail}</span> : null}
        </p>
      ))}
    </div>
  )
}

function InteractionList({ alerts }: { alerts: SafetyAlert[] }) {
  if (alerts.length === 0) return null
  return (
    <ul className="ov-list ov-list--flat ov-safety__interactions">
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

function MedicationMonitoringSection({
  rows,
  notDocumentedLabel,
}: {
  rows: ParameterMonitoringRow[]
  notDocumentedLabel: string
}) {
  if (rows.length === 0) return null
  return (
    <div className="ov-safety__monitoring">
      <ParameterMonitoringList
        rows={rows}
        notDocumentedLabel={notDocumentedLabel}
        className="parameter-monitoring-list--compact"
      />
    </div>
  )
}

function RiskSection({ risk }: { risk: NonNullable<SafetyData['risk']> }) {
  const acuteSignals = risk.signals ?? []

  if (acuteSignals.length > 0) {
    return (
      <div className="ov-safety__risk-band">
        <SafetyRiskRing tone={risk.tone} />
        <div className="ov-safety__axes">
          {acuteSignals.map((signal) => (
            <SafetyAxisStrip key={signal.id} signal={signal} />
          ))}
        </div>
      </div>
    )
  }

  if (risk.detail) {
    return (
      <div className="ov-safety__risk-head">
        <SafetyRiskRing tone={risk.tone} />
        <p className="ov-safety__risk-detail">{risk.detail}</p>
      </div>
    )
  }

  return (
    <div className="ov-safety__risk-head ov-safety__risk-head--ring-only">
      <SafetyRiskRing tone={risk.tone} />
    </div>
  )
}

export function SafetyAlertsCard({ data }: SafetyAlertsCardProps) {
  const { t } = useTranslation()

  const allergyAlerts = data.alerts.filter((alert) => alert.category === 'allergy')
  const interactionAlerts = data.alerts.filter((alert) => alert.category === 'interaction')
  const hasMonitoring = data.medicationMonitoring.length > 0

  const hasContent =
    data.risk !== null ||
    allergyAlerts.length > 0 ||
    interactionAlerts.length > 0 ||
    hasMonitoring ||
    data.hasAnySignal

  return (
    <ClinicalSection
      eyebrow={t('overviewWidgetSafety')}
      className="ov-col-6 ov-safety"
      aria-label={t('overviewWidgetSafety')}
    >
      {!hasContent ? (
        <ClinicalEmpty>{t('overviewSafetyNoSignals')}</ClinicalEmpty>
      ) : (
        <>
          {data.risk ? <RiskSection risk={data.risk} /> : null}

          {hasMonitoring ? (
            <div className="ov-safety__block">
              <ClinicalEyebrow className="ov-safety__subhead">
                {t('overviewSafetyMonitoring')}
              </ClinicalEyebrow>
              <MedicationMonitoringSection
                rows={data.medicationMonitoring}
                notDocumentedLabel={t('overviewSafetyNotDocumented')}
              />
            </div>
          ) : null}

          {allergyAlerts.length > 0 ? (
            <div className="ov-safety__block">
              <ClinicalEyebrow className="ov-safety__subhead">
                {t('overviewSafetyAllergies')}
              </ClinicalEyebrow>
              <AllergyBlock alerts={allergyAlerts} />
            </div>
          ) : null}

          {interactionAlerts.length > 0 ? (
            <div className="ov-safety__block">
              <ClinicalEyebrow className="ov-safety__subhead">
                {t('overviewSafetyInteractions')}
              </ClinicalEyebrow>
              <InteractionList alerts={interactionAlerts} />
            </div>
          ) : null}
        </>
      )}
    </ClinicalSection>
  )
}
