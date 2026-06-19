import { useTranslation } from '../../../context/TranslationContext'
import { ClinicalEyebrow } from '../../clinical/ClinicalEyebrow'
import { OverviewCard, OverviewEmpty } from './OverviewCard'
import type { SafetyRiskSignal, SymptomSnapshotData } from './types'

interface SymptomSnapshotCardProps {
  data: SymptomSnapshotData
  riskSignals?: SafetyRiskSignal[]
  onOpen?: () => void
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

/**
 * Psychopathologischer Befund (PPB) — structured cues with prominent
 * Eigengefährdung / Fremdgefährdung safety subsection.
 */
export function SymptomSnapshotCard({ data, riskSignals = [], onOpen }: SymptomSnapshotCardProps) {
  const { t } = useTranslation()
  const harmSignals = riskSignals.filter(
    (s) => s.id === 'riskSelf' || s.id === 'riskOthers' || s.id === 'suicidality',
  )
  const hasContent =
    Boolean(data.snapshotText) ||
    data.structured.length > 0 ||
    Boolean(data.courseLabel) ||
    harmSignals.length > 0
  const meta =
    [data.contextLabel, data.courseLabel, data.asOfLabel ? `Stand ${data.asOfLabel}` : null]
      .filter(Boolean)
      .join(' · ') || null

  return (
    <OverviewCard
      title={t('notionPagePsychopath')}
      className="ov-col-6"
      meta={meta}
      action={onOpen ? { label: 'Befund öffnen', onClick: onOpen } : undefined}
    >
      {!hasContent ? (
        <OverviewEmpty>Kein psychopathologischer Befund hinterlegt.</OverviewEmpty>
      ) : null}

      {harmSignals.length > 0 ? (
        <div className="ov-ppb__safety">
          <ClinicalEyebrow className="ov-safety__subhead">Eigengefährdung / Fremdgefährdung</ClinicalEyebrow>
          <div className="ov-safety__axes">
            {harmSignals.map((signal) => (
              <SafetyAxisStrip key={signal.id} signal={signal} />
            ))}
          </div>
        </div>
      ) : null}

      {data.structured.length > 0 ? (
        <div className="ov-snapshot__cues ov-snapshot__cues--flat">
          {data.structured.map((cue) => (
            <div key={cue.label} className="cm-cue-row">
              <span className="cm-cue-label">{cue.label}</span>
              <span
                className={
                  cue.value === 'nicht dokumentiert'
                    ? 'cm-cue-value cm-cue-value--missing'
                    : 'cm-cue-value'
                }
              >
                {cue.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {data.snapshotText ? <p className="ov-snapshot__text">{data.snapshotText}</p> : null}
    </OverviewCard>
  )
}
