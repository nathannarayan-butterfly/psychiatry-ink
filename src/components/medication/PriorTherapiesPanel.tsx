import { History, Sparkles } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { MedicationEntry } from '../../types/medicationPlan'
import type { FailureAnalysis } from '../../types/priorTherapies'
import { useCasePriorTherapies } from '../../hooks/useCasePriorTherapies'
import {
  normalizeSubstanceKey,
  priorTherapyEventLabel,
  priorTherapyEventTone,
  priorTherapySourceLabel,
} from '../../utils/medication/priorTherapies'
import { failureCauseLabel } from '../../utils/medication/failureAnalysisSynthesis'
import type { UiLanguage } from '../../types/settings'

interface PriorTherapiesPanelProps {
  caseId: string
  medications: MedicationEntry[]
  patientName?: string
}

/**
 * "Bisher versuchte Medikamente" panel for the Medikation plan view. Lists each
 * previously-tried agent with why it was stopped / how the patient responded and
 * where that came from (Aufnahme vs. Verlauf vs. the structured plan). Plan-data
 * items are authoritative; LLM-derived items are marked advisory with their
 * evidence quote and never alter the medication plan.
 */
/** Expandable "Mögliche Ursache" block for a failed prior agent. */
function FailureAnalysisBlock({
  analysis,
  language,
  ai,
  loading,
}: {
  analysis: FailureAnalysis
  language: UiLanguage
  ai: boolean
  loading: boolean
}) {
  const de = language === 'de'
  const onlyInsufficient =
    analysis.likelyCauses.length === 1 && analysis.likelyCauses[0]!.cause === 'insufficient_data'

  return (
    <details className="prior-therapy-cause">
      <summary className="prior-therapy-cause__summary">
        <span className="prior-therapy-cause__label">
          {de ? 'Mögliche Ursache' : 'Possible cause'}
        </span>
        {onlyInsufficient ? (
          <span className="prior-therapy-cause__none">
            {de ? 'keine ausreichenden Daten' : 'insufficient data'}
          </span>
        ) : null}
        {ai ? (
          <span
            className="prior-therapy-chip prior-therapy-chip--ai"
            title={de ? 'KI-synthetisiert (Hinweis)' : 'AI-synthesised (advisory)'}
          >
            <Sparkles size={10} aria-hidden /> KI
          </span>
        ) : loading ? (
          <span className="prior-therapy-cause__loading">
            <Sparkles size={10} aria-hidden /> {de ? 'wird verfeinert…' : 'refining…'}
          </span>
        ) : null}
      </summary>

      <ul className="prior-therapy-cause__list">
        {analysis.likelyCauses.map((cause) => (
          <li key={cause.cause} className="prior-therapy-cause__item">
            <span
              className={`prior-therapy-cause__tag prior-therapy-cause__tag--${
                cause.cause === 'insufficient_data' ? 'neutral' : 'active'
              }`}
            >
              {failureCauseLabel(cause.cause, language)}
            </span>
            <p className="prior-therapy-cause__text">{cause.explanation_de}</p>
            {cause.evidence ? (
              <p className="prior-therapy-cause__evidence">
                {de ? 'Beleg: ' : 'Evidence: '}
                <span>{cause.evidence}</span>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  )
}

export function PriorTherapiesPanel({ caseId, medications, patientName }: PriorTherapiesPanelProps) {
  const { language } = useTranslation()
  const { items, llmStatus, hasInferred, mock, failureAnalysisStatus, aiAnalyzedSubstances } =
    useCasePriorTherapies(caseId, medications, {
      patientName,
    })

  const de = language === 'de'
  const heading = de ? 'Bisher versuchte Medikamente' : 'Previously tried medications'
  const subtitle = de
    ? 'Vortherapien aus Plan, Aufnahme und Verlauf — mit Grund/Ansprechen.'
    : 'Prior trials from plan, admission and progress notes — with reason/response.'

  const evaluating = llmStatus === 'loading'

  if (items.length === 0 && !evaluating) {
    return (
      <section className="prior-therapies" aria-label={heading}>
        <header className="prior-therapies__head">
          <div className="prior-therapies__title-wrap">
            <span className="prior-therapies__icon" aria-hidden>
              <History size={15} strokeWidth={1.9} />
            </span>
            <div>
              <h3 className="prior-therapies__title">{heading}</h3>
              <p className="prior-therapies__subtitle">{subtitle}</p>
            </div>
          </div>
        </header>
        <p className="prior-therapies__empty">
          {de
            ? 'Keine vorher abgesetzten oder dokumentierten Vortherapien gefunden.'
            : 'No previously discontinued or documented prior therapies found.'}
        </p>
      </section>
    )
  }

  return (
    <section className="prior-therapies" aria-label={heading}>
      <header className="prior-therapies__head">
        <div className="prior-therapies__title-wrap">
          <span className="prior-therapies__icon" aria-hidden>
            <History size={15} strokeWidth={1.9} />
          </span>
          <div>
            <h3 className="prior-therapies__title">{heading}</h3>
            <p className="prior-therapies__subtitle">{subtitle}</p>
          </div>
        </div>
        {evaluating ? (
          <span className="prior-therapies__status" aria-live="polite">
            <Sparkles size={12} aria-hidden />
            {de ? 'wird ausgewertet…' : 'analysing…'}
          </span>
        ) : hasInferred ? (
          <span
            className="prior-therapies__status prior-therapies__status--ai"
            title={
              de
                ? 'Teilweise KI-abgeleitet aus Freitext — bitte Quelle prüfen.'
                : 'Partly AI-derived from free text — please verify the source.'
            }
          >
            <Sparkles size={12} aria-hidden />
            {de ? 'inkl. KI-Hinweise' : 'incl. AI hints'}
            {mock ? ' (Demo)' : ''}
          </span>
        ) : null}
      </header>

      <ul className="prior-therapies__list">
        {items.map((item) => {
          const tone = priorTherapyEventTone(item.event)
          const key = `${item.substance}-${item.source}-${item.event}`
          return (
            <li key={key} className="prior-therapy-row">
              <div className="prior-therapy-row__main">
                <span className="prior-therapy-row__substance">{item.substance}</span>
                <span className={`prior-therapy-chip prior-therapy-chip--${tone}`}>
                  {priorTherapyEventLabel(item.event, language)}
                </span>
                {item.inferred ? (
                  <span
                    className="prior-therapy-chip prior-therapy-chip--ai"
                    title={de ? 'KI-abgeleitet (Hinweis)' : 'AI-derived (advisory)'}
                  >
                    <Sparkles size={10} aria-hidden /> KI
                  </span>
                ) : null}
              </div>

              {item.reason ? (
                <p className="prior-therapy-row__reason">
                  {de ? 'Grund/Ansprechen: ' : 'Reason/response: '}
                  <span>{item.reason}</span>
                </p>
              ) : null}

              <div className="prior-therapy-row__meta">
                <span className="prior-therapy-row__source">
                  {priorTherapySourceLabel(item.source, language)}
                </span>
                {item.evidenceQuote ? (
                  <span className="prior-therapy-row__quote" title={item.evidenceQuote}>
                    „{item.evidenceQuote}“
                  </span>
                ) : null}
              </div>

              {item.failureAnalysis ? (
                <FailureAnalysisBlock
                  analysis={item.failureAnalysis}
                  language={language}
                  ai={aiAnalyzedSubstances.has(normalizeSubstanceKey(item.substance))}
                  loading={failureAnalysisStatus === 'loading'}
                />
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
