import { History, Sparkles } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import type { MedicationEntry } from '../../../types/medicationPlan'
import { useCasePriorTherapies } from '../../../hooks/useCasePriorTherapies'
import {
  priorTherapyEventLabel,
  priorTherapyEventTone,
} from '../../../utils/medication/priorTherapies'
import { failureCauseShortLabel } from '../../../utils/medication/failureAnalysisSynthesis'
import type { FailureAnalysis } from '../../../types/priorTherapies'
import { OverviewCard, OverviewEmpty } from './OverviewCard'

interface PriorTherapiesOverviewCardProps {
  caseId: string
  medications: MedicationEntry[]
  onOpenMedikation: () => void
}

const MAX_ROWS = 5

/** The lead cause to hint at — first informative cause, else the only one. */
function leadCause(analysis: FailureAnalysis | undefined) {
  if (!analysis || analysis.likelyCauses.length === 0) return null
  return (
    analysis.likelyCauses.find((c) => c.cause !== 'insufficient_data') ??
    analysis.likelyCauses[0]
  )
}

/**
 * Übersicht "Vortherapien" card — a concise list of previously-tried agents with
 * their fate (why stopped / response). Deterministic plan data shows instantly;
 * free-text LLM hints merge in once the background pass resolves.
 */
export function PriorTherapiesOverviewCard({
  caseId,
  medications,
  onOpenMedikation,
}: PriorTherapiesOverviewCardProps) {
  const { language } = useTranslation()
  const { items, llmStatus, hasInferred } = useCasePriorTherapies(caseId, medications)
  const de = language === 'de'
  const evaluating = llmStatus === 'loading'
  const rows = items.slice(0, MAX_ROWS)

  return (
    <OverviewCard
      title={de ? 'Vortherapien' : 'Prior therapies'}
      icon={<History size={15} />}
      className="ov-col-6"
      badge={items.length > 0 ? { label: String(items.length), tone: 'neutral' } : undefined}
      action={{ label: de ? 'Zur Medikation' : 'Open medication', onClick: onOpenMedikation }}
    >
      {rows.length === 0 ? (
        evaluating ? (
          <p className="ov-meta ov-prior__status">
            <Sparkles size={11} aria-hidden /> {de ? 'wird ausgewertet…' : 'analysing…'}
          </p>
        ) : (
          <OverviewEmpty>
            {de ? 'Keine Vortherapien dokumentiert.' : 'No prior therapies documented.'}
          </OverviewEmpty>
        )
      ) : (
        <>
          <ul className="ov-prior__list">
            {rows.map((item) => {
              const cause = leadCause(item.failureAnalysis)
              return (
                <li key={`${item.substance}-${item.source}-${item.event}`} className="ov-prior__row">
                  <span className="ov-prior__name">{item.substance}</span>
                  <span className={`ov-pill ov-pill--${priorTherapyEventTone(item.event)}`}>
                    {priorTherapyEventLabel(item.event, language)}
                  </span>
                  {cause ? (
                    <span
                      className="ov-prior__cause"
                      title={cause.explanation_de}
                    >
                      {de ? 'mögl. Ursache: ' : 'likely cause: '}
                      {failureCauseShortLabel(cause.cause, language)}
                    </span>
                  ) : item.reason ? (
                    <span className="ov-prior__reason" title={item.reason}>
                      {item.reason}
                    </span>
                  ) : null}
                  {item.inferred ? (
                    <span className="ov-prior__ai" title={de ? 'KI-abgeleitet' : 'AI-derived'} aria-hidden>
                      <Sparkles size={10} />
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
          {hasInferred ? (
            <p className="ov-meta ov-prior__hint">
              <Sparkles size={11} aria-hidden />{' '}
              {de ? 'enthält KI-Hinweise (Quelle prüfen)' : 'includes AI hints (verify source)'}
            </p>
          ) : null}
        </>
      )}
    </OverviewCard>
  )
}
