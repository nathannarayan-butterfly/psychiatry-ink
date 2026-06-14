import { useMemo } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { usePsychotherapyPlan } from '../../hooks/usePsychotherapyPlan'
import { useComplementaryTherapies } from '../../hooks/useComplementaryTherapies'
import { useSozialtherapie } from '../../hooks/useSozialtherapie'
import { useWeitereTherapie } from '../../hooks/useWeitereTherapie'
import { loadVerlaufFeed } from '../../utils/verlaufFeed'
import { computeTherapyAdherence, type TherapyAdherenceRow } from '../../utils/therapyAdherence'

interface TherapieAdherenceSectionProps {
  caseId: string
}

function adherenceTone(percent: number): 'high' | 'mid' | 'low' {
  if (percent >= 80) return 'high'
  if (percent >= 50) return 'mid'
  return 'low'
}

function AdherenceBar({ row }: { row: TherapyAdherenceRow }) {
  const { t } = useTranslation()
  const tone = adherenceTone(row.percent)

  return (
    <div className="therapy-adherence__row">
      <div className="therapy-adherence__row-head">
        <span className="therapy-adherence__name">{row.therapy.label}</span>
        <span className={`therapy-adherence__percent therapy-adherence__percent--${tone}`}>
          {row.percent}% {t('therapyAdherenceLabel')}
        </span>
      </div>
      <div className="therapy-adherence__bar" aria-hidden>
        <div
          className={`therapy-adherence__bar-fill therapy-adherence__bar-fill--${tone}`}
          style={{ width: `${row.percent}%` }}
        />
      </div>
      {row.reasons.length > 0 ? (
        <ul className="therapy-adherence__reasons">
          {row.reasons.map((reason) => (
            <li key={reason} className="therapy-adherence__reason">
              {reason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function TherapieAdherenceSection({ caseId }: TherapieAdherenceSectionProps) {
  const { t, language } = useTranslation()
  const { plan } = usePsychotherapyPlan(caseId)
  const { therapies } = useComplementaryTherapies(caseId)
  const { targets } = useSozialtherapie(caseId)
  const { entries } = useWeitereTherapie(caseId)

  const summary = useMemo(
    () =>
      computeTherapyAdherence({
        psychotherapyPlan: plan,
        complementaryTherapies: therapies,
        weitereEntries: entries,
        sozialTargets: targets,
        verlaufEntries: loadVerlaufFeed(caseId),
        language,
      }),
    [caseId, plan, therapies, entries, targets, language],
  )

  return (
    <section className="therapy-adherence" aria-label={t('therapyAdherenceTitle')}>
      <h3 className="therapy-adherence__title">{t('therapyAdherenceTitle')}</h3>

      {!summary.hasOrderedTherapies ? (
        <p className="therapy-adherence__empty">{t('therapyAdherenceEmpty')}</p>
      ) : summary.fullyCompliant ? (
        <p className="therapy-adherence__compliant">{t('therapyAdherenceFullyCompliant')}</p>
      ) : (
        <div className="therapy-adherence__list">
          {summary.rows.map((row) => (
            <AdherenceBar key={row.therapy.key} row={row} />
          ))}
        </div>
      )}

      {summary.hasOrderedTherapies ? (
        <p className="therapy-adherence__window">
          {t('therapyAdherenceWindow').replace('{days}', String(summary.windowDays))}
        </p>
      ) : null}
    </section>
  )
}
