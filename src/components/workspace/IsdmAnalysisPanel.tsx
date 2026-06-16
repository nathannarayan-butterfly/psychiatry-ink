import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { getIsdmSafetyDisclaimer } from '../../data/isdmLabels'
import type { EnglishVariant, UiLanguage } from '../../types/settings'
import type { IsdmClinicalAnalysis } from '../../types/isdm'
import { loadIsdmAnalysis } from '../../utils/isdm/storage'
import { scheduleIsdmRebuild } from '../../utils/isdm'
import { matchDisorderToCodes, type Disorder } from '../../data/diagnosisCriteria'
import {
  buildDisorderAdvice,
  buildEvaluationContext,
  evaluateDisorder,
  type DisorderEvaluation,
} from '../../utils/diagnosisCriteria'
import type { ClinicianAttestationValue } from '../../utils/diagnosisCriteria/context'
import { loadAttestations, setAttestation } from '../../utils/butterfly/attestationStorage'
import { loadDiagnosen, type DiagnoseEntry } from '../../utils/diagnosenArchive'

interface IsdmAnalysisPanelProps {
  caseId: string
  /** Bumped by the parent when diagnoses change, to retrigger a reload. */
  diagnosesVersion?: number
}

function formatUpdatedAt(iso: string, language: UiLanguage): string {
  try {
    const date = new Date(iso)
    return date.toLocaleString(
      language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-GB',
      { dateStyle: 'medium', timeStyle: 'short' },
    )
  } catch {
    return iso
  }
}

function hasCodeOrLabel(entry: DiagnoseEntry): boolean {
  return Boolean(
    entry.icd10.code.trim() || entry.icd10.label.trim() || entry.icd11.code.trim(),
  )
}

/** One row per clinician-entered diagnosis — verified or "not available". */
interface EnteredDiagnosisResult {
  key: string
  label: string
  code: string
  available: boolean
  disorder?: Disorder
  evaluation?: DisorderEvaluation
}

export function IsdmAnalysisPanel({ caseId, diagnosesVersion }: IsdmAnalysisPanelProps) {
  const { t, language, englishVariant } = useTranslation()
  const [analysis, setAnalysis] = useState<IsdmClinicalAnalysis | null>(() => loadIsdmAnalysis(caseId))
  const [attestations, setAttestations] = useState(() => loadAttestations(caseId))
  const [diagnoses, setDiagnoses] = useState<DiagnoseEntry[]>(() => loadDiagnosen(caseId))
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(() => {
    setAnalysis(loadIsdmAnalysis(caseId))
    setAttestations(loadAttestations(caseId))
    setDiagnoses(loadDiagnosen(caseId))
  }, [caseId])

  useEffect(() => {
    setRefreshing(true)
    setDiagnoses(loadDiagnosen(caseId))
    scheduleIsdmRebuild(caseId, 'profile')
    const timer = window.setTimeout(() => {
      refresh()
      setRefreshing(false)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [caseId, refresh, diagnosesVersion])

  const enteredDiagnoses = useMemo(() => diagnoses.filter(hasCodeOrLabel), [diagnoses])
  const hasDiagnoses = enteredDiagnoses.length > 0

  const results = useMemo<EnteredDiagnosisResult[]>(() => {
    if (!analysis) return []
    const ctx = buildEvaluationContext({
      phenomenology: analysis.phenomenology,
      coursePattern: analysis.coursePattern,
      attestations,
    })
    const seenDisorders = new Set<string>()
    const out: EnteredDiagnosisResult[] = []
    for (const entry of enteredDiagnoses) {
      const code = entry.icd10.code.trim() || entry.icd11.code.trim()
      const label = entry.icd10.label.trim() || entry.icd10.code.trim() || entry.icd11.label.trim() || code
      const disorder = matchDisorderToCodes(entry.icd10.code, entry.icd11.code)
      if (!disorder) {
        out.push({ key: entry.id, label, code, available: false })
        continue
      }
      if (seenDisorders.has(disorder.id)) continue
      seenDisorders.add(disorder.id)
      out.push({
        key: entry.id,
        label,
        code,
        available: true,
        disorder,
        evaluation: evaluateDisorder(disorder, ctx),
      })
    }
    // Verified rows first (met → not_met → insufficient), "not available" last.
    const rank = (r: EnteredDiagnosisResult) => {
      if (!r.available || !r.evaluation) return 3
      return r.evaluation.verdict === 'criteria_met' ? 0 : r.evaluation.verdict === 'not_met' ? 1 : 2
    }
    return out.sort((a, b) => rank(a) - rank(b))
  }, [analysis, attestations, enteredDiagnoses])

  const handleAttest = useCallback(
    (criterionId: string, current: ClinicianAttestationValue | undefined, value: ClinicianAttestationValue) => {
      setAttestation(caseId, criterionId, current === value ? null : value)
      setAttestations(loadAttestations(caseId))
    },
    [caseId],
  )

  const disclaimer = getIsdmSafetyDisclaimer(language, englishVariant as EnglishVariant)

  // Idle / silent states ----------------------------------------------------
  if (!hasDiagnoses) {
    return (
      <div className="butterfly-panel butterfly-panel--idle" role="region" aria-label={t('butterflyTitle')}>
        <div className="butterfly-panel__idle-card">
          <span className="butterfly-panel__idle-mark" aria-hidden>
            🦋
          </span>
          <p className="butterfly-panel__idle-title">{t('butterflyIdleNoDiagnosis')}</p>
          <p className="butterfly-panel__idle-hint">{t('butterflyNoDiagnosisHint')}</p>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="butterfly-panel butterfly-panel--idle" role="region" aria-label={t('butterflyTitle')}>
        <div className="butterfly-panel__idle-card">
          <span className="butterfly-panel__idle-mark" aria-hidden>
            🦋
          </span>
          <p className="butterfly-panel__idle-title">{t('butterflyIdle')}</p>
          <p className="butterfly-panel__idle-hint">{t('butterflyIdleHint')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="butterfly-panel" role="region" aria-label={t('butterflyTitle')}>
      <header className="butterfly-panel__header">
        <div className="butterfly-panel__title-row">
          <span className="butterfly-panel__mark" aria-hidden>
            🦋
          </span>
          <div>
            <h2 className="butterfly-panel__title">{t('butterflyTitle')}</h2>
            <p className="butterfly-panel__subtitle">{t('butterflySubtitle')}</p>
          </div>
        </div>
        {analysis.updatedAt ? (
          <p className="butterfly-panel__updated">
            {t('isdmPanelLastUpdated')} {formatUpdatedAt(analysis.updatedAt, language)}
            {refreshing ? ` · ${t('isdmPanelRefreshing')}` : ''}
          </p>
        ) : null}
      </header>

      <p className="butterfly-panel__disclaimer" role="note">
        {disclaimer}
      </p>
      <p className="butterfly-panel__draft-notice">{t('butterflyDraftNotice')}</p>

      <section className="butterfly-panel__section">
        <h3 className="butterfly-panel__section-title">{t('butterflyRecommendations')}</h3>
        <ul className="butterfly-card-list">
          {results.map((result) => {
            if (!result.available || !result.disorder || !result.evaluation) {
              return (
                <li key={result.key} className="butterfly-card butterfly-card--unavailable">
                  <div className="butterfly-card__head">
                    <div className="butterfly-card__heading">
                      <span className="butterfly-card__name">{result.label}</span>
                      {result.code ? <span className="butterfly-card__code">{result.code}</span> : null}
                    </div>
                  </div>
                  <p className="butterfly-card__unavailable">{t('butterflyCriteriaUnavailable')}</p>
                </li>
              )
            }

            const { disorder, evaluation } = result
            const advice = buildDisorderAdvice(evaluation, disorder)
            return (
              <li key={result.key} className={`butterfly-card butterfly-card--${advice.tone}`}>
                <div className="butterfly-card__head">
                  <div className="butterfly-card__heading">
                    <span className="butterfly-card__name">{result.label || disorder.name_de}</span>
                    {result.code ? <span className="butterfly-card__code">{result.code}</span> : null}
                  </div>
                  <span className={`butterfly-verdict butterfly-verdict--${advice.tone}`}>
                    {advice.tone === 'met'
                      ? t('butterflyVerdictMet')
                      : advice.tone === 'not_met'
                        ? t('butterflyVerdictNotMet')
                        : t('butterflyVerdictInsufficient')}
                  </span>
                </div>

                <p className="butterfly-card__advice">{advice.headline}</p>

                {evaluation.criteriaMet.length > 0 ? (
                  <div className="butterfly-card__group">
                    <p className="butterfly-card__group-label">{t('butterflyCriteriaMetLabel')}</p>
                    <ul className="butterfly-chip-list">
                      {evaluation.criteriaMet.map((text) => (
                        <li key={text} className="butterfly-chip butterfly-chip--met">
                          {text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {evaluation.openAttestations.length > 0 ? (
                  <div className="butterfly-card__group">
                    <p className="butterfly-card__group-label">{t('butterflyOpenCriteria')}</p>
                    <ul className="butterfly-attest-list">
                      {evaluation.openAttestations.map((criterion) => {
                        const current = attestations[criterion.criterionId]
                        return (
                          <li key={criterion.criterionId} className="butterfly-attest">
                            <span className="butterfly-attest__text">{criterion.text_de}</span>
                            <span className="butterfly-attest__actions">
                              <button
                                type="button"
                                className={`butterfly-attest__btn butterfly-attest__btn--met${
                                  current === 'met' ? ' is-active' : ''
                                }`}
                                aria-pressed={current === 'met'}
                                onClick={() => handleAttest(criterion.criterionId, current, 'met')}
                              >
                                {t('butterflyAttestMet')}
                              </button>
                              <button
                                type="button"
                                className={`butterfly-attest__btn butterfly-attest__btn--not-met${
                                  current === 'not_met' ? ' is-active' : ''
                                }`}
                                aria-pressed={current === 'not_met'}
                                onClick={() => handleAttest(criterion.criterionId, current, 'not_met')}
                              >
                                {t('butterflyAttestNotMet')}
                              </button>
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                    <p className="butterfly-attest__hint">{t('butterflyAttestHint')}</p>
                  </div>
                ) : null}

                {disorder.differentials_de.length > 0 ? (
                  <details className="butterfly-card__differentials">
                    <summary>{t('butterflyDifferentials')}</summary>
                    <ul>
                      {disorder.differentials_de.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                <p className="butterfly-card__source">
                  {t('butterflySource')}: {disorder.sourceRef}
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      {analysis.interviewGaps.length > 0 ? (
        <section className="butterfly-panel__section">
          <h3 className="butterfly-panel__section-title">{t('butterflyQuestions')}</h3>
          <ul className="butterfly-gap-list">
            {analysis.interviewGaps.map((gap) => (
              <li key={gap.id} className={`butterfly-gap butterfly-gap--${gap.priority}`}>
                <p className="butterfly-gap__question">{gap.question}</p>
                <p className="butterfly-gap__rationale">{gap.rationale}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="butterfly-panel__review-note">{t('isdmPanelClinicianReview')}</p>
    </div>
  )
}
