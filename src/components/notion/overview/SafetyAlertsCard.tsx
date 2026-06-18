import { useTranslation } from '../../../context/TranslationContext'
import { ClinicalEyebrow } from '../../clinical/ClinicalEyebrow'
import { ClinicalSection, ClinicalEmpty } from '../../clinical/ClinicalSection'
import type {
  MedicationMonitoringGroup,
  SafetyAlert,
  SafetyData,
  SafetyRiskSignal,
} from './types'

interface SafetyAlertsCardProps {
  data: SafetyData
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
  groups,
  notDocumentedLabel,
}: {
  groups: MedicationMonitoringGroup[]
  notDocumentedLabel: string
}) {
  if (groups.length === 0) return null
  return (
    <div className="ov-safety__monitoring">
      {groups.map((group) => (
        <div key={group.medicationId} className="ov-safety__med-group">
          <div className="ov-safety__med-name">{group.medicationName}</div>
          {group.parameters.map((param) => (
            <div key={param.key} className="ov-safety__param-row">
              <span className="ov-safety__param-label">{param.label}</span>
              <span
                className={`ov-safety__param-value${param.missing ? ' ov-safety__param-value--missing' : ''}`}
              >
                {param.missing
                  ? notDocumentedLabel
                  : [param.valueLabel, param.dateLabel].filter(Boolean).join(' · ')}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function SafetyAlertsCard({ data }: SafetyAlertsCardProps) {
  const { t } = useTranslation()

  const acuteSignals = data.risk?.signals ?? []
  const allergyAlerts = data.alerts.filter((alert) => alert.category === 'allergy')
  const interactionAlerts = data.alerts.filter((alert) => alert.category === 'interaction')
  const hasMonitoring = data.medicationMonitoring.length > 0

  const hasAcute =
    acuteSignals.length > 0 || (data.risk !== null && !data.risk.signals?.length)
  const hasContent =
    hasAcute ||
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
          {acuteSignals.length > 0 ? (
            <div className="ov-safety__axes">
              {acuteSignals.map((signal) => (
                <SafetyAxisStrip key={signal.id} signal={signal} />
              ))}
            </div>
          ) : data.risk ? (
            <div className="ov-safety__axes">
              <SafetyAxisStrip
                signal={{
                  id: 'riskSelf',
                  label: data.risk.label,
                  value: data.risk.detail,
                  tone: data.risk.tone,
                }}
              />
            </div>
          ) : null}

          {hasMonitoring ? (
            <div className="ov-safety__block">
              <ClinicalEyebrow className="ov-safety__subhead">
                {t('overviewSafetyMonitoring')}
              </ClinicalEyebrow>
              <MedicationMonitoringSection
                groups={data.medicationMonitoring}
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
