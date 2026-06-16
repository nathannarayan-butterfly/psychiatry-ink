import { useCallback, useState } from 'react'
import { Check, Clipboard } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { therapyPageSectionDomId } from '../../data/therapyPageSections'
import {
  translateProgressStatus,
  translatePsychotherapyStatus,
  translatePsychotherapyUi as tp,
} from '../../data/psychotherapyUiTranslations'
import type { PsychotherapyStatus } from '../../types/psychotherapy'
import { usePsychotherapyPlan } from '../../hooks/usePsychotherapyPlan'
import { PsychotherapiePlanungPage } from './PsychotherapiePlanungPage'

interface PsychotherapieOverviewCardProps {
  caseId: string
}

/** Maps psychotherapy status onto the shared therapy status-pill palette. */
const PT_STATUS_TONE: Record<PsychotherapyStatus, string> = {
  'not-started': 'gray',
  active: 'green',
  paused: 'amber',
  completed: 'gray',
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value || !value.trim()) return null
  return (
    <div className="therapy-summary__row">
      <span className="therapy-summary__label">{label}</span>
      <span className="therapy-summary__value">{value}</span>
    </div>
  )
}

export function PsychotherapieOverviewCard({ caseId }: PsychotherapieOverviewCardProps) {
  const { t, language } = useTranslation()
  const { summary, hasPlan, generateSummaryText } = usePsychotherapyPlan(caseId)
  const [planOpen, setPlanOpen] = useState(false)
  const [focusNewSession, setFocusNewSession] = useState(false)
  const [summaryText, setSummaryText] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const openPlan = useCallback((newSession: boolean) => {
    setFocusNewSession(newSession)
    setPlanOpen(true)
  }, [])

  const handleGenerate = useCallback(() => {
    setSummaryText(generateSummaryText())
    setCopied(false)
  }, [generateSummaryText])

  const handleCopy = useCallback(async () => {
    if (!summaryText) return
    try {
      await navigator.clipboard.writeText(summaryText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard unavailable — ignore
    }
  }, [summaryText])

  const sectionTitle = t('therapieSectionPsychotherapie')

  if (!hasPlan) {
    return (
      <section className="therapy-section" id={therapyPageSectionDomId('psychotherapie')}>
        <header className="therapy-section__header">
          <div className="therapy-section__heading">
            <h3 className="therapy-section__title">{sectionTitle}</h3>
          </div>
          <div className="therapy-section__actions">
            <button type="button" className="therapy-add-btn" onClick={() => openPlan(false)}>
              ＋ {tp(language, 'ptCreatePlan')}
            </button>
          </div>
        </header>
        <div className="therapy-section__body">
          <p className="therapy-empty">{tp(language, 'ptEmptyTitle')}</p>
        </div>
        {planOpen && (
          <PsychotherapiePlanungPage
            caseId={caseId}
            focusNewSession={focusNewSession}
            onClose={() => setPlanOpen(false)}
          />
        )}
      </section>
    )
  }

  const progressLabel = summary.progressStatus
    ? translateProgressStatus(language, summary.progressStatus)
    : undefined

  return (
    <section className="therapy-section" id={therapyPageSectionDomId('psychotherapie')}>
      <header className="therapy-section__header">
        <div className="therapy-section__heading">
          <h3 className="therapy-section__title">{sectionTitle}</h3>
          {summary.status && (
            <span className={`therapy-status therapy-status--${PT_STATUS_TONE[summary.status] ?? 'gray'}`}>
              {translatePsychotherapyStatus(language, summary.status)}
            </span>
          )}
        </div>
        <div className="therapy-section__actions">
          <button
            type="button"
            className="therapy-btn therapy-btn--ghost"
            onClick={handleGenerate}
          >
            {tp(language, 'ptGenerateSummary')}
          </button>
          <button
            type="button"
            className="therapy-btn therapy-btn--ghost"
            onClick={() => openPlan(false)}
          >
            {tp(language, 'ptOpenPlan')}
          </button>
          <button type="button" className="therapy-add-btn" onClick={() => openPlan(true)}>
            ＋ {tp(language, 'ptDocumentSession')}
          </button>
        </div>
      </header>

      <div className="therapy-section__body">
        <div className="therapy-summary">
          <Row label={tp(language, 'ptCurrentStage')} value={summary.currentStage} />
          <Row label={tp(language, 'ptMainGoal')} value={summary.mainGoal} />
          <Row label={tp(language, 'ptMethod')} value={summary.method} />
          <Row label={tp(language, 'ptFrequency')} value={summary.frequency} />
          <Row label={tp(language, 'ptPlannedDuration')} value={summary.plannedDuration} />
          <Row label={tp(language, 'ptLastSession')} value={summary.lastSessionDate} />
          <Row label={tp(language, 'ptNextFocus')} value={summary.nextFocus} />
          <Row label={tp(language, 'ptProgress')} value={progressLabel} />
        </div>

        {summaryText !== null && (
          <div className="therapy-callout">
            <div className="therapy-callout__head">
              <span className="therapy-field__label">{tp(language, 'ptSummaryHeading')}</span>
              <button
                type="button"
                className={`icon-action-btn${copied ? ' icon-action-btn--success' : ''}`}
                onClick={handleCopy}
                title={copied ? tp(language, 'ptCopied') : tp(language, 'ptCopy')}
                aria-label={copied ? tp(language, 'ptCopied') : tp(language, 'ptCopy')}
              >
                {copied ? <Check strokeWidth={1.75} aria-hidden /> : <Clipboard strokeWidth={1.75} aria-hidden />}
              </button>
            </div>
            <p className="therapy-callout__text">{summaryText}</p>
          </div>
        )}
      </div>

      {planOpen && (
        <PsychotherapiePlanungPage
          caseId={caseId}
          focusNewSession={focusNewSession}
          onClose={() => setPlanOpen(false)}
        />
      )}
    </section>
  )
}
