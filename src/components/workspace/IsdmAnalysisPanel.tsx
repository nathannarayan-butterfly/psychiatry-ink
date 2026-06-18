import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { getIsdmSafetyDisclaimer } from '../../data/isdmLabels'
import type { EnglishVariant, UiLanguage } from '../../types/settings'
import type { IsdmClinicalAnalysis } from '../../types/isdm'
import { loadIsdmAnalysis } from '../../utils/isdm/storage'
import { scheduleIsdmRebuild } from '../../utils/isdm'
import {
  formatCriterionCitation,
  getLocalizedDisorder,
  matchDisorderToCodes,
  resolveDisorderForCodingSystem,
  toButterflyIcdVersion,
  type Disorder,
} from '../../data/diagnosisCriteria'
import {
  DIAGNOSEN_CODING_SYSTEM_EVENT,
  loadDiagnosenCodingSystem,
} from '../../utils/diagnosenCodingSystem'
import type { CodingSystem } from '../../utils/diagnosenArchive'
import {
  buildDisorderAdvice,
  buildEvaluationContext,
  evaluateDisorder,
  type DisorderEvaluation,
} from '../../utils/diagnosisCriteria'
import type { PerCriterionResult } from '../../utils/diagnosisCriteria/evaluateDisorder'
import type { ClinicianAttestationValue, AttestationMap } from '../../utils/diagnosisCriteria/context'
import { loadAttestations, setAttestation } from '../../utils/butterfly/attestationStorage'
import {
  acceptAiSuggestion,
  dismissAiSuggestion,
  loadAiSuggestions,
  saveAiSuggestions,
  type ButterflyAiSuggestionState,
} from '../../utils/butterfly/aiSuggestions'
import {
  selectUnresolvedCriteria,
  selectUnresolvedInterviewCriteria,
  resolveDeepLinkPage,
  buildCriterionQuestions,
  type ButterflyCriterionQuestion,
  type InterviewQuestionResolver,
} from '../../utils/butterfly/criterionPrompts'
import {
  loadInterviewQuestionCache,
  getCachedInterviewQuestions,
  saveInterviewQuestions,
  type InterviewQuestionCacheState,
} from '../../utils/butterfly/interviewQuestionsCache'
import { generateInterviewQuestions } from '../../services/interviewQuestionsApi'
import {
  clinicalQuestionId,
  loadClinicalQuestionNoteState,
  setClinicalQuestionNote,
  clearClinicalQuestionNote,
  resolutionToAttestation,
  type ClinicalQuestionNoteState,
  type ClinicalQuestionResolution,
} from '../../utils/clinicalQuestions'
import { suggestionsFromCaseFacts } from '../../utils/butterfly/factSuggestions'
import { buildButterflyContextPackage, hasButterflyContext } from '../../utils/butterfly/contextPackage'
import { extractButterflyCriteria } from '../../services/butterflyExtractApi'
import { isCmeaConsumerReadEnabled } from '../../utils/featureFlags'
import { loadDiagnosen, type DiagnoseEntry } from '../../utils/diagnosenArchive'
import type { NotionPageId } from '../notion/notionPages'

type Translate = ReturnType<typeof useTranslation>['t']

interface IsdmAnalysisPanelProps {
  caseId: string
  /** Bumped by the parent when diagnoses change, to retrigger a reload. */
  diagnosesVersion?: number
  /** Jump to a workspace documentation page so the clinician can add a finding. */
  onJumpToSection?: (pageId: NotionPageId) => void
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
  return Boolean(entry.icd10.code.trim() || entry.icd10.label.trim() || entry.icd11.code.trim())
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

type ProvenanceKind = 'deterministic' | 'confirmed' | 'ai' | 'open'

function provenanceFor(
  result: PerCriterionResult,
  hasActionableSuggestion: boolean,
): ProvenanceKind {
  if (result.source === 'attested') return 'confirmed'
  if (result.status === 'met' || result.status === 'not_met') return 'deterministic'
  if (hasActionableSuggestion) return 'ai'
  return 'open'
}

export function IsdmAnalysisPanel({ caseId, diagnosesVersion, onJumpToSection }: IsdmAnalysisPanelProps) {
  const { t, language, englishVariant } = useTranslation()
  const [analysis, setAnalysis] = useState<IsdmClinicalAnalysis | null>(() => loadIsdmAnalysis(caseId))
  const [attestations, setAttestations] = useState(() => loadAttestations(caseId))
  const [aiSuggestions, setAiSuggestions] = useState<ButterflyAiSuggestionState>(() => loadAiSuggestions(caseId))
  const [diagnoses, setDiagnoses] = useState<DiagnoseEntry[]>(() => loadDiagnosen(caseId))
  const [questionNotes, setQuestionNotes] = useState<ClinicalQuestionNoteState>(() =>
    loadClinicalQuestionNoteState(caseId),
  )
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [pendingDisorders, setPendingDisorders] = useState<ReadonlySet<string>>(() => new Set())
  const [aiErrors, setAiErrors] = useState<Record<string, boolean>>({})
  const [interviewCache, setInterviewCache] = useState<InterviewQuestionCacheState>(() =>
    loadInterviewQuestionCache(),
  )
  // Case-scoped Diagnosen coding system (ICD-10 / ICD-11 / DSM). Butterfly picks
  // the matching criteria tree (DSM falls back to ICD-10). Kept in sync with the
  // DiagnosenWidget toggle via the broadcast event so toggling re-evaluates.
  const [codingSystem, setCodingSystem] = useState<CodingSystem>(() => loadDiagnosenCodingSystem(caseId))
  const icdVersion = toButterflyIcdVersion(codingSystem)
  const autoAttempted = useRef<Set<string>>(new Set())
  const interviewAttempted = useRef<Set<string>>(new Set())

  const refresh = useCallback(() => {
    setAnalysis(loadIsdmAnalysis(caseId))
    setAttestations(loadAttestations(caseId))
    setAiSuggestions(loadAiSuggestions(caseId))
    setDiagnoses(loadDiagnosen(caseId))
    setQuestionNotes(loadClinicalQuestionNoteState(caseId))
  }, [caseId])

  useEffect(() => {
    setCodingSystem(loadDiagnosenCodingSystem(caseId))
  }, [caseId])

  // React to the Diagnosen coding-system toggle (broadcast per case). Changing
  // the system re-resolves every matched disorder to the chosen version's
  // criteria and re-runs the deterministic evaluation + question derivation.
  useEffect(() => {
    function handleChange(event: Event) {
      const detail = (event as CustomEvent<{ caseId: string; system: CodingSystem }>).detail
      if (detail?.caseId === caseId) setCodingSystem(detail.system)
    }
    window.addEventListener(DIAGNOSEN_CODING_SYSTEM_EVENT, handleChange)
    return () => window.removeEventListener(DIAGNOSEN_CODING_SYSTEM_EVENT, handleChange)
  }, [caseId])

  useEffect(() => {
    setRefreshing(true)
    setDiagnoses(loadDiagnosen(caseId))
    setAiSuggestions(loadAiSuggestions(caseId))
    scheduleIsdmRebuild(caseId, 'profile')
    const timer = window.setTimeout(() => {
      refresh()
      setRefreshing(false)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [caseId, refresh, diagnosesVersion, codingSystem])

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
      const sourceDisorder = matchDisorderToCodes(entry.icd10.code, entry.icd11.code)
      if (!sourceDisorder) {
        out.push({ key: entry.id, label, code, available: false })
        continue
      }
      // Composition order: resolve the ICD VERSION first (pick the ICD-10 or
      // ICD-11 criteria tree, ICD-11 falling back to ICD-10 when not authored),
      // THEN localize to the active UI language (DE fallback per field). After
      // this the per-criterion text, citations, differentials, name and advice
      // headline all reflect the active version + language downstream.
      const versioned = resolveDisorderForCodingSystem(sourceDisorder, icdVersion)
      const disorder = getLocalizedDisorder(versioned, language)
      if (seenDisorders.has(disorder.id)) continue
      seenDisorders.add(disorder.id)
      out.push({ key: entry.id, label, code, available: true, disorder, evaluation: evaluateDisorder(disorder, ctx) })
    }
    const rank = (r: EnteredDiagnosisResult) => {
      if (!r.available || !r.evaluation) return 3
      return r.evaluation.verdict === 'criteria_met' ? 0 : r.evaluation.verdict === 'not_met' ? 1 : 2
    }
    return out.sort((a, b) => rank(a) - rank(b))
  }, [analysis, attestations, enteredDiagnoses, language, icdVersion])

  // Resolve cached, LLM-generated concrete interview questions for a criterion
  // (language- and version-scoped). Returns undefined until the LLM resolves, in
  // which case the builder uses a deterministic German template.
  const resolveInterview = useCallback<InterviewQuestionResolver>(
    ({ disorderId, version, criterionId }) =>
      getCachedInterviewQuestions(interviewCache, disorderId, version, icdVersion, criterionId, language),
    [interviewCache, language, icdVersion],
  )

  // "Vorgeschlagene Fragen" — derived STRICTLY from the still-`unknown` criteria
  // of the clinician-entered diagnoses. Each criterion yields concrete,
  // patient-directed interview questions (LLM-generated, cached), localized to
  // the active UI language.
  const criterionQuestions = useMemo(
    () =>
      buildCriterionQuestions(
        results.flatMap((result) =>
          result.available && result.disorder && result.evaluation
            ? [{ disorder: result.disorder, label: result.label, evaluation: result.evaluation }]
            : [],
        ),
        t,
        resolveInterview,
      ),
    [results, t, resolveInterview],
  )

  const handleAttest = useCallback(
    (criterionId: string, current: ClinicianAttestationValue | undefined, value: ClinicianAttestationValue) => {
      setAttestation(caseId, criterionId, current === value ? null : value)
      setAttestations(loadAttestations(caseId))
    },
    [caseId],
  )

  const handleUnclear = useCallback(
    (criterionId: string) => {
      setAttestation(caseId, criterionId, null)
      dismissAiSuggestion(caseId, criterionId)
      clearClinicalQuestionNote(clinicalQuestionId('diagnosis_criteria', criterionId), caseId)
      setAttestations(loadAttestations(caseId))
      setAiSuggestions(loadAiSuggestions(caseId))
      setQuestionNotes(loadClinicalQuestionNoteState(caseId))
    },
    [caseId],
  )

  // Feedback loop: record the patient's answer to a suggested question. A
  // Ja/Nein answer is bridged to the clinician-attestation store (authoritative,
  // overrides everything) so the deterministic evaluator flips the criterion and
  // the answered question drops off the list. The optional finding note is PHI →
  // persisted to the encrypted vault only.
  const handleAnswerQuestion = useCallback(
    (question: ButterflyCriterionQuestion, resolution: ClinicalQuestionResolution) => {
      const attestationValue = resolutionToAttestation(resolution)
      setAttestation(caseId, question.criterionId, attestationValue)
      if (attestationValue === null) {
        // "Unklar" — keep the criterion open and drop any AI suggestion noise.
        dismissAiSuggestion(caseId, question.criterionId)
      }
      const draft = noteDrafts[question.id] ?? ''
      if (attestationValue === null || !draft.trim()) {
        clearClinicalQuestionNote(question.id, caseId)
      } else {
        setClinicalQuestionNote(
          {
            questionId: question.id,
            sectionId: question.sectionId,
            targetId: question.targetId,
            note: draft,
          },
          caseId,
        )
      }
      setNoteDrafts((prev) => {
        const next = { ...prev }
        delete next[question.id]
        return next
      })
      setAttestations(loadAttestations(caseId))
      setAiSuggestions(loadAiSuggestions(caseId))
      setQuestionNotes(loadClinicalQuestionNoteState(caseId))
    },
    [caseId, noteDrafts],
  )

  const handleAcceptSuggestion = useCallback(
    (criterionId: string) => {
      if (acceptAiSuggestion(caseId, criterionId)) {
        setAttestations(loadAttestations(caseId))
        setAiSuggestions(loadAiSuggestions(caseId))
      }
    },
    [caseId],
  )

  const handleDismissSuggestion = useCallback(
    (criterionId: string) => {
      dismissAiSuggestion(caseId, criterionId)
      setAiSuggestions(loadAiSuggestions(caseId))
    },
    [caseId],
  )

  const runExtraction = useCallback(
    async (disorder: Disorder, evaluation: DisorderEvaluation) => {
      let unresolved = selectUnresolvedCriteria(evaluation)
      if (unresolved.length === 0) return

      // CMEA Phase 2: resolve unknowns from pre-computed facts (compute once,
      // reuse many). Only residual unknowns fall through to the bespoke route.
      if (isCmeaConsumerReadEnabled() && analysis) {
        const { suggestions, residualUnresolved } = suggestionsFromCaseFacts({
          caseId,
          disorder,
          evaluation,
          coursePattern: analysis.coursePattern,
        })
        if (suggestions.length > 0) {
          saveAiSuggestions(caseId, disorder.id, 'cmea-facts', suggestions)
          setAiSuggestions(loadAiSuggestions(caseId))
        }
        unresolved = residualUnresolved
        if (unresolved.length === 0) return
      }

      const pkg = buildButterflyContextPackage(caseId)
      if (!hasButterflyContext(pkg)) return
      setPendingDisorders((prev) => new Set(prev).add(disorder.id))
      setAiErrors((prev) => ({ ...prev, [disorder.id]: false }))
      try {
        const response = await extractButterflyCriteria({
          caseId,
          disorderId: disorder.id,
          disorderName: disorder.name_de,
          criteria: unresolved,
          packageContent: pkg,
        })
        saveAiSuggestions(
          caseId,
          disorder.id,
          response.model.modelId,
          response.results.map((result) => ({
            criterionId: result.id,
            status: result.status,
            evidenceQuote: result.evidenceQuote,
            confidence: result.confidence,
          })),
        )
        setAiSuggestions(loadAiSuggestions(caseId))
      } catch {
        setAiErrors((prev) => ({ ...prev, [disorder.id]: true }))
      } finally {
        setPendingDisorders((prev) => {
          const next = new Set(prev)
          next.delete(disorder.id)
          return next
        })
      }
    },
    [caseId, analysis],
  )

  // Background trigger: once per disorder per mount, resolve unknown criteria via
  // the LLM when none of them has a suggestion yet (cheap, low doc volume).
  useEffect(() => {
    for (const result of results) {
      if (!result.available || !result.disorder || !result.evaluation) continue
      const key = `${caseId}:${result.disorder.id}:${icdVersion}`
      if (autoAttempted.current.has(key)) continue
      const unresolved = selectUnresolvedCriteria(result.evaluation)
      if (unresolved.length === 0) {
        autoAttempted.current.add(key)
        continue
      }
      if (unresolved.some((criterion) => aiSuggestions[criterion.id])) {
        autoAttempted.current.add(key)
        continue
      }
      autoAttempted.current.add(key)
      void runExtraction(result.disorder, result.evaluation)
    }
  }, [results, caseId, icdVersion, aiSuggestions, runExtraction])

  // Background trigger: generate concrete interview questions for any still-open
  // criteria that have none cached for the active language/version. The request
  // carries ONLY generic criterion reference metadata (no patient PHI); in mock
  // mode the server returns deterministic templates. Once per disorder/language
  // per mount.
  useEffect(() => {
    for (const result of results) {
      if (!result.available || !result.disorder || !result.evaluation) continue
      const disorder = result.disorder
      const version = disorder.version
      const key = `${disorder.id}:v${version}:${icdVersion}:${language}`
      if (interviewAttempted.current.has(key)) continue
      const unresolved = selectUnresolvedInterviewCriteria(result.evaluation)
      const missing = unresolved.filter(
        (criterion) =>
          !getCachedInterviewQuestions(interviewCache, disorder.id, version, icdVersion, criterion.id, language),
      )
      if (missing.length === 0) {
        if (unresolved.length === 0) interviewAttempted.current.add(key)
        continue
      }
      interviewAttempted.current.add(key)
      void (async () => {
        try {
          const response = await generateInterviewQuestions({
            caseId,
            disorderId: disorder.id,
            disorderName: disorder.name_de,
            criteria: missing,
            language,
          })
          saveInterviewQuestions(
            disorder.id,
            version,
            icdVersion,
            language,
            response.model.modelId,
            response.results,
          )
          setInterviewCache(loadInterviewQuestionCache())
        } catch {
          // Non-fatal: the panel keeps showing the deterministic template
          // questions. Allow a later re-attempt on the next mount.
          interviewAttempted.current.delete(key)
        }
      })()
    }
  }, [results, caseId, language, icdVersion, interviewCache])

  const disclaimer = getIsdmSafetyDisclaimer(language, englishVariant as EnglishVariant)

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
            return (
              <ButterflyDiagnosisCard
                key={result.key}
                t={t}
                disorder={result.disorder}
                evaluation={result.evaluation}
                label={result.label}
                code={result.code}
                attestations={attestations}
                aiSuggestions={aiSuggestions}
                questionNotes={questionNotes}
                pending={pendingDisorders.has(result.disorder.id)}
                aiError={Boolean(aiErrors[result.disorder.id])}
                onAttest={handleAttest}
                onUnclear={handleUnclear}
                onReset={handleUnclear}
                onAcceptSuggestion={handleAcceptSuggestion}
                onDismissSuggestion={handleDismissSuggestion}
                onCheckAi={() => result.disorder && result.evaluation && runExtraction(result.disorder, result.evaluation)}
                onJumpToSection={onJumpToSection}
              />
            )
          })}
        </ul>
      </section>

      {criterionQuestions.length > 0 ? (
        <section className="butterfly-panel__section">
          <h3 className="butterfly-panel__section-title">{t('butterflyQuestions')}</h3>
          {/* The "record the answer → criterion" instruction is shown ONCE here,
              never repeated per question/criterion. */}
          <p className="butterfly-gap-list__hint">{t('butterflyQuestionSectionHint')}</p>
          <ul className="butterfly-gap-list">
            {criterionQuestions.map((question) => {
              const jumpPage = question.deepLinkPageId
              const hasFooter = question.resolvable || Boolean(jumpPage && onJumpToSection)
              return (
                <li key={question.id} className={`butterfly-gap butterfly-gap--${question.priority}`}>
                  <p className="butterfly-gap__rationale">{question.rationale}</p>
                  <ul className="butterfly-gap__questions">
                    {question.interviewQuestions.map((interviewQuestion, index) => (
                      <li key={`${question.id}#${index}`} className="butterfly-gap__q-row">
                        <span className="butterfly-gap__question">{interviewQuestion}</span>
                        {question.resolvable ? (
                          // Each interview question is answerable on its own row, but
                          // every phrasing probes the SAME criterion: the answer is
                          // bridged to `question.criterionId` (last answer wins). The
                          // first present/absent resolves the criterion and the whole
                          // group drops off on re-evaluation.
                          <div
                            className="butterfly-gap__answer-actions"
                            role="group"
                            aria-label={interviewQuestion}
                          >
                            <button
                              type="button"
                              className="butterfly-answer-btn butterfly-answer-btn--yes"
                              onClick={() => handleAnswerQuestion(question, 'present')}
                            >
                              {t('butterflyQuestionYes')}
                            </button>
                            <button
                              type="button"
                              className="butterfly-answer-btn butterfly-answer-btn--no"
                              onClick={() => handleAnswerQuestion(question, 'absent')}
                            >
                              {t('butterflyQuestionNo')}
                            </button>
                            <button
                              type="button"
                              className="butterfly-answer-btn butterfly-answer-btn--unclear"
                              onClick={() => handleAnswerQuestion(question, 'unclear')}
                            >
                              {t('butterflyQuestionUnclear')}
                            </button>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {hasFooter ? (
                    <div className="butterfly-gap__footer">
                      {question.resolvable ? (
                        <input
                          type="text"
                          className="butterfly-gap__note"
                          value={noteDrafts[question.id] ?? ''}
                          placeholder={t('butterflyQuestionNotePlaceholder')}
                          onChange={(event) =>
                            setNoteDrafts((prev) => ({ ...prev, [question.id]: event.target.value }))
                          }
                        />
                      ) : null}
                      {jumpPage && onJumpToSection ? (
                        <button
                          type="button"
                          className="butterfly-answer-btn butterfly-answer-btn--jump"
                          onClick={() => onJumpToSection(jumpPage)}
                        >
                          {t('butterflyJumpToDoc')}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <p className="butterfly-panel__review-note">{t('isdmPanelClinicianReview')}</p>
    </div>
  )
}

interface ButterflyDiagnosisCardProps {
  t: Translate
  disorder: Disorder
  evaluation: DisorderEvaluation
  label: string
  code: string
  attestations: AttestationMap
  aiSuggestions: ButterflyAiSuggestionState
  questionNotes: ClinicalQuestionNoteState
  pending: boolean
  aiError: boolean
  onAttest: (criterionId: string, current: ClinicianAttestationValue | undefined, value: ClinicianAttestationValue) => void
  onUnclear: (criterionId: string) => void
  onReset: (criterionId: string) => void
  onAcceptSuggestion: (criterionId: string) => void
  onDismissSuggestion: (criterionId: string) => void
  onCheckAi: () => void
  onJumpToSection?: (pageId: NotionPageId) => void
}

function ButterflyDiagnosisCard({
  t,
  disorder,
  evaluation,
  label,
  code,
  attestations,
  aiSuggestions,
  questionNotes,
  pending,
  aiError,
  onAttest,
  onUnclear,
  onReset,
  onAcceptSuggestion,
  onDismissSuggestion,
  onCheckAi,
  onJumpToSection,
}: ButterflyDiagnosisCardProps) {
  const advice = buildDisorderAdvice(evaluation, disorder)
  const exclusionGroupIds = new Set(
    disorder.groups.filter((group) => group.groupType === 'exclusion').map((group) => group.id),
  )
  const criteria = evaluation.perCriterion.filter((result) => !exclusionGroupIds.has(result.groupId))
  const hasUnresolved = criteria.some((result) => result.status === 'unknown' && result.source !== 'attested')

  return (
    <li className={`butterfly-card butterfly-card--${advice.tone}`}>
      <div className="butterfly-card__head">
        <div className="butterfly-card__heading">
          <span className="butterfly-card__name">{label || disorder.name_de}</span>
          {code ? <span className="butterfly-card__code">{code}</span> : null}
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

      <div className="butterfly-card__group">
        <div className="butterfly-card__group-head">
          <p className="butterfly-card__group-label">{t('butterflyCriteriaProvenanceTitle')}</p>
          {hasUnresolved ? (
            <button
              type="button"
              className="butterfly-ai-check"
              onClick={onCheckAi}
              disabled={pending}
            >
              {pending ? t('butterflyChecking') : t('butterflyCheckAi')}
            </button>
          ) : null}
        </div>

        {/* The "no documented finding — add / attest / let Butterfly check"
            instruction appears ONCE here for the whole group, not per criterion. */}
        {hasUnresolved ? (
          <p className="butterfly-card__open-hint">{t('butterflyOpenCriteriaHint')}</p>
        ) : null}

        <ul className="butterfly-criteria-list">
          {criteria.map((criterion) => {
            const attestation = attestations[criterion.criterionId]
            const suggestion = aiSuggestions[criterion.criterionId]
            const actionableSuggestion =
              suggestion && (suggestion.status === 'met' || suggestion.status === 'not_met')
                ? suggestion
                : undefined
            const provenance = provenanceFor(criterion, Boolean(actionableSuggestion))
            const isOpen = criterion.status === 'unknown' && criterion.source !== 'attested'
            const isAttested = criterion.source === 'attested'
            const jumpPage = resolveDeepLinkPage(disorder, criterion.criterionId)
            const answerNote = questionNotes[clinicalQuestionId('diagnosis_criteria', criterion.criterionId)]?.note

            const citationLabel = formatCriterionCitation(criterion.citation)

            return (
              <li key={criterion.criterionId} className={`butterfly-criterion butterfly-criterion--${provenance}`}>
                <div className="butterfly-criterion__row">
                  <div className="butterfly-criterion__main">
                    <span className="butterfly-criterion__text">{criterion.text_de}</span>
                    {citationLabel ? (
                      <span className="butterfly-criterion__cite" title={`${t('butterflySource')}: ${citationLabel}`}>
                        {t('butterflySource')}: {citationLabel}
                      </span>
                    ) : null}
                  </div>
                  <span className={`butterfly-prov butterfly-prov--${provenance}`}>
                    {provenance === 'deterministic'
                      ? `${criterion.status === 'met' ? '✓' : '×'} ${t('butterflyProvenanceDeterministic')}`
                      : provenance === 'confirmed'
                        ? `${attestation === 'met' ? '✓' : '×'} ${t('butterflyProvenanceConfirmed')}`
                        : provenance === 'ai'
                          ? t('butterflyProvenanceAi')
                          : t('butterflyProvenanceOpen')}
                  </span>
                </div>

                {isOpen ? (
                  <div className="butterfly-criterion__resolve">
                    {actionableSuggestion ? (
                      <div className="butterfly-suggestion">
                        <p className="butterfly-suggestion__verdict">
                          {actionableSuggestion.status === 'met'
                            ? t('butterflyAiSuggestionMet')
                            : t('butterflyAiSuggestionNotMet')}
                          <span className="butterfly-suggestion__confidence">
                            {' · '}
                            {t('butterflyAiConfidence')} {Math.round(actionableSuggestion.confidence * 100)}%
                          </span>
                        </p>
                        {actionableSuggestion.evidenceQuote ? (
                          <p className="butterfly-suggestion__quote">
                            <span className="butterfly-suggestion__quote-label">{t('butterflyAiQuoteLabel')}:</span>{' '}
                            «{actionableSuggestion.evidenceQuote}»
                          </p>
                        ) : null}
                        <div className="butterfly-suggestion__actions">
                          <button
                            type="button"
                            className="butterfly-suggestion__btn butterfly-suggestion__btn--accept"
                            onClick={() => onAcceptSuggestion(criterion.criterionId)}
                          >
                            {t('butterflyAccept')}
                          </button>
                          <button
                            type="button"
                            className="butterfly-suggestion__btn butterfly-suggestion__btn--dismiss"
                            onClick={() => onDismissSuggestion(criterion.criterionId)}
                          >
                            {t('butterflyDismiss')}
                          </button>
                        </div>
                      </div>
                    ) : suggestion && suggestion.status === 'unclear' ? (
                      <p className="butterfly-criterion__ai-unclear">{t('butterflyAiUnclear')}</p>
                    ) : null}

                    <div className="butterfly-attest__actions">
                      <button
                        type="button"
                        className={`butterfly-attest__btn butterfly-attest__btn--met${attestation === 'met' ? ' is-active' : ''}`}
                        aria-pressed={attestation === 'met'}
                        onClick={() => onAttest(criterion.criterionId, attestation, 'met')}
                      >
                        {t('butterflyAttestMet')}
                      </button>
                      <button
                        type="button"
                        className={`butterfly-attest__btn butterfly-attest__btn--not-met${attestation === 'not_met' ? ' is-active' : ''}`}
                        aria-pressed={attestation === 'not_met'}
                        onClick={() => onAttest(criterion.criterionId, attestation, 'not_met')}
                      >
                        {t('butterflyAttestNotMet')}
                      </button>
                      <button
                        type="button"
                        className="butterfly-attest__btn butterfly-attest__btn--unclear"
                        onClick={() => onUnclear(criterion.criterionId)}
                      >
                        {t('butterflyAttestUnclear')}
                      </button>
                      {jumpPage && onJumpToSection ? (
                        <button
                          type="button"
                          className="butterfly-attest__btn butterfly-attest__btn--jump"
                          onClick={() => onJumpToSection(jumpPage)}
                        >
                          {t('butterflyJumpToDoc')}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {isAttested ? (
                  <div className="butterfly-criterion__confirmed">
                    {answerNote ? (
                      <p className="butterfly-criterion__note">
                        <span className="butterfly-criterion__note-label">{t('butterflyAiQuoteLabel')}:</span>{' '}
                        {answerNote}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="butterfly-criterion__reset"
                      onClick={() => onReset(criterion.criterionId)}
                    >
                      {t('butterflyCriterionReset')}
                    </button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>

        {aiError ? <p className="butterfly-ai-error">{t('butterflyAiError')}</p> : null}
        {hasUnresolved ? <p className="butterfly-attest__hint">{t('butterflyAiPendingNote')}</p> : null}
      </div>

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
}
