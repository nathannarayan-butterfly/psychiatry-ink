import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { ButterflyLogo } from '../ButterflyLogo'
import { ClinicalEyebrow } from '../clinical/ClinicalEyebrow'
import { OverviewAiBadge } from '../notion/overview/OverviewAiBadge'
import { useTranslation } from '../../context/TranslationContext'
import type { UiLanguage } from '../../types/settings'
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
import {
  getActiveCoding,
  hasAnyCodingContent,
  loadDiagnosen,
  type CodingSystem,
  type DiagnoseEntry,
} from '../../utils/diagnosenArchive'
import {
  buildDiagnosisTitleRequest,
  codingSystemToTitleVersion,
  resolveDiagnosisLabelSync,
} from '../../utils/diagnosisDisplayRequests'
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
  groupCriterionQuestionsByDiagnosis,
  type ButterflyCriterionQuestion,
  type ButterflyDiagnosisQuestionGroup,
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
import { isDemoCase } from '../../demo/demoReadOnly'
import { useDiagnosisDisplayTitles } from '../../hooks/useDiagnosisDisplayTitles'
import type { IcdTitleVersion } from '../../../shared/icdTitle'
import type { NotionPageId } from '../notion/notionPages'

type Translate = ReturnType<typeof useTranslation>['t']

interface IsdmAnalysisPanelProps {
  caseId: string
  /** Bumped by the parent when diagnoses change, to retrigger a reload. */
  diagnosesVersion?: number
  /** Jump to a workspace documentation page so the clinician can add a finding. */
  onJumpToSection?: (pageId: NotionPageId) => void
  /** Flat clinical-minimal layout (Diagnose page) — no card chrome. */
  flat?: boolean
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
  return hasAnyCodingContent(entry)
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

/**
 * Collapsible panel section: an `h3` header that toggles its body open/closed.
 * Pure local state — collapse preference is not persisted across reloads. The
 * chevron rotates via CSS (honoring `prefers-reduced-motion`) and the button
 * carries `aria-expanded` / `aria-controls` for screen readers + keyboard.
 */
function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyId = useId()
  return (
    <section className="butterfly-panel__section">
      <h3 className="butterfly-panel__section-title">
        <button
          type="button"
          className="butterfly-collapsible-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((value) => !value)}
        >
          <ChevronDown className="butterfly-collapsible__chevron" size={16} aria-hidden />
          <span>{title}</span>
        </button>
      </h3>
      {open ? (
        <div id={bodyId} className="butterfly-panel__section-body">
          {children}
        </div>
      ) : null}
    </section>
  )
}

export function IsdmAnalysisPanel({
  caseId,
  diagnosesVersion,
  onJumpToSection,
  flat = false,
}: IsdmAnalysisPanelProps) {
  const { t, language } = useTranslation()
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
  // The synthetic demo case is pre-baked and read-only. It must NEVER trigger a
  // live, credit-charging AI call merely by being viewed/scrolled — its criteria
  // suggestions and interview questions come from the fixture / deterministic
  // templates. Only explicit clinician actions on real cases spend credits.
  const isDemo = isDemoCase(caseId)

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
      const enteredIcd10 = entry.icd10.code.trim()
      const enteredIcd11 = entry.icd11.code.trim()
      const code = enteredIcd10 || enteredIcd11
      // Synchronous bundled title (shared resolver) — never a raw stored label.
      const labelSystem: CodingSystem = enteredIcd10 ? 'icd10' : 'icd11'
      const labelCoding = getActiveCoding(entry, labelSystem)
      const label =
        resolveDiagnosisLabelSync(
          labelCoding,
          codingSystemToTitleVersion(labelSystem),
        ) || code
      const sourceDisorder = matchDisorderToCodes(entry.icd10.code, entry.icd11.code)
      if (!sourceDisorder) {
        // No criteria pack matched — fall back to the clinician-entered codes.
        // In ICD-11 mode prefer the entered 6xx code over the ICD-10 F-code.
        const displayCode = icdVersion === 'icd11' ? enteredIcd11 || code : code
        out.push({ key: entry.id, label, code: displayCode, available: false })
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
      // Heading code follows the ACTIVE coding system: ICD-11 surfaces the
      // version-resolved 6xx code (the clinician-entered ICD-11 code wins when
      // present, then the crosswalk, then the resolved disorder code), while
      // ICD-10 / DSM keep showing the ICD-10 F-code as before.
      const displayCode =
        icdVersion === 'icd11'
          ? enteredIcd11 || versioned.codingSystems.icd11?.code || versioned.code || code
          : code
      out.push({
        key: entry.id,
        label,
        code: displayCode,
        available: true,
        disorder,
        evaluation: evaluateDisorder(disorder, ctx),
      })
    }
    const rank = (r: EnteredDiagnosisResult) => {
      if (!r.available || !r.evaluation) return 3
      return r.evaluation.verdict === 'criteria_met' ? 0 : r.evaluation.verdict === 'not_met' ? 1 : 2
    }
    return out.sort((a, b) => rank(a) - rank(b))
  }, [analysis, attestations, enteredDiagnoses, language, icdVersion])

  const diagnosisTitleVersion: IcdTitleVersion = icdVersion === 'icd11' ? 'icd11' : 'icd10'

  const diagnosisTitleRequests = useMemo(() => {
    const system: CodingSystem = icdVersion === 'icd11' ? 'icd11' : 'icd10'
    return results.map((result) => {
      const entry = enteredDiagnoses.find((item) => item.id === result.key)
      const coding = entry
        ? getActiveCoding(entry, system)
        : { code: result.code, label: '', overridden: false }
      return buildDiagnosisTitleRequest({
        key: result.key,
        coding: {
          code: result.code,
          label: coding.label,
          overridden: coding.overridden,
        },
        version: diagnosisTitleVersion,
        disorderCriteriaLabel: result.disorder
          ? icdVersion === 'icd11'
            ? result.disorder.codingSystems.icd11?.label_de
            : result.disorder.codingSystems.icd10?.label_de
          : null,
      })
    })
  }, [results, enteredDiagnoses, diagnosisTitleVersion, icdVersion])

  const { titlesByKey: diagnosisDisplayTitles } = useDiagnosisDisplayTitles(
    diagnosisTitleRequests,
    language,
    results.length > 0,
  )

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

  const questionGroups = useMemo(
    () =>
      groupCriterionQuestionsByDiagnosis(
        criterionQuestions,
        results
          .filter((result) => result.available && result.disorder)
          .map((result) => ({
            disorderId: result.disorder!.id,
            label: diagnosisDisplayTitles.get(result.key) ?? result.code,
            code: result.code,
          })),
      ),
    [criterionQuestions, results, diagnosisDisplayTitles],
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
    if (isDemo) return
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
  }, [results, caseId, icdVersion, aiSuggestions, runExtraction, isDemo])

  // Background trigger: generate concrete interview questions for any still-open
  // criteria that have none cached for the active language/version. The request
  // carries ONLY generic criterion reference metadata (no patient PHI); in mock
  // mode the server returns deterministic templates. Once per disorder/language
  // per mount.
  useEffect(() => {
    if (isDemo) return
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
  }, [results, caseId, language, icdVersion, interviewCache, isDemo])

  const panelClassName = [
    'butterfly-panel',
    flat ? 'butterfly-panel--flat' : '',
  ].filter(Boolean).join(' ')

  if (!hasDiagnoses) {
    return (
      <div className={`${panelClassName} butterfly-panel--idle`} role="region" aria-label={t('butterflyTitle')}>
        {flat ? (
          <header className="butterfly-panel__header butterfly-panel__header--flat">
            <ClinicalEyebrow inline>{t('butterflyTitle')}</ClinicalEyebrow>
          </header>
        ) : null}
        <div className="butterfly-panel__idle-card">
          {!flat ? (
            <span className="butterfly-panel__idle-mark">
              <ButterflyLogo variant="grey" breathing size={28} />
            </span>
          ) : null}
          <p className="butterfly-panel__idle-title">{t('butterflyIdleNoDiagnosis')}</p>
          <p className="butterfly-panel__idle-hint">{t('butterflyNoDiagnosisHint')}</p>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className={`${panelClassName} butterfly-panel--idle`} role="region" aria-label={t('butterflyTitle')}>
        {flat ? (
          <header className="butterfly-panel__header butterfly-panel__header--flat">
            <ClinicalEyebrow inline>{t('butterflyTitle')}</ClinicalEyebrow>
          </header>
        ) : null}
        <div className="butterfly-panel__idle-card">
          {!flat ? (
            <span className="butterfly-panel__idle-mark">
              <ButterflyLogo variant="grey" breathing size={28} />
            </span>
          ) : null}
          <p className="butterfly-panel__idle-title">{t('butterflyIdle')}</p>
          <p className="butterfly-panel__idle-hint">{t('butterflyIdleHint')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={panelClassName} role="region" aria-label={t('butterflyTitle')}>
      {flat ? (
        <header className="butterfly-panel__header butterfly-panel__header--flat">
          <ClinicalEyebrow inline>{t('butterflyTitle')}</ClinicalEyebrow>
          <OverviewAiBadge />
          {analysis.updatedAt ? (
            <p className="butterfly-panel__updated">
              {t('isdmPanelLastUpdated')} {formatUpdatedAt(analysis.updatedAt, language)}
              {refreshing ? ` · ${t('isdmPanelRefreshing')}` : ''}
            </p>
          ) : null}
        </header>
      ) : (
        <header className="butterfly-panel__header">
          <div className="butterfly-panel__title-row">
            <span className="butterfly-panel__mark">
              <ButterflyLogo variant="color" breathing size={28} />
            </span>
            <div>
              <h2 className="butterfly-panel__title">{t('butterflyTitle')}</h2>
              <OverviewAiBadge />
            </div>
          </div>
          {analysis.updatedAt ? (
            <p className="butterfly-panel__updated">
              {t('isdmPanelLastUpdated')} {formatUpdatedAt(analysis.updatedAt, language)}
              {refreshing ? ` · ${t('isdmPanelRefreshing')}` : ''}
            </p>
          ) : null}
        </header>
      )}

      <CollapsibleSection title={t('butterflyRecommendations')}>
        <ul className="butterfly-card-list">
          {results.map((result) => {
            const displayLabel = diagnosisDisplayTitles.get(result.key) ?? result.code
            if (!result.available || !result.disorder || !result.evaluation) {
              return (
                <li key={result.key} className="butterfly-card butterfly-card--unavailable">
                  <div className="butterfly-card__head">
                    <div className="butterfly-card__heading">
                      <span className="butterfly-card__name">{displayLabel}</span>
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
                language={language}
                disorder={result.disorder}
                evaluation={result.evaluation}
                label={displayLabel}
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
      </CollapsibleSection>

      {questionGroups.length > 0 ? (
        <CollapsibleSection title={t('butterflyQuestions')}>
          {/* The "record the answer → criterion" instruction is shown ONCE here,
              never repeated per question/criterion. */}
          <p className="butterfly-gap-list__hint">{t('butterflyQuestionSectionHint')}</p>
          <ul className="butterfly-gap-diagnosis-list">
            {questionGroups.map((group) => (
              <ButterflyQuestionDiagnosisGroup
                key={group.disorderId}
                group={group}
                noteDrafts={noteDrafts}
                onNoteDraftChange={(questionId, value) =>
                  setNoteDrafts((prev) => ({ ...prev, [questionId]: value }))
                }
                onAnswer={handleAnswerQuestion}
                onJumpToSection={onJumpToSection}
                t={t}
              />
            ))}
          </ul>
        </CollapsibleSection>
      ) : null}
    </div>
  )
}

interface ButterflyQuestionDiagnosisGroupProps {
  t: Translate
  group: ButterflyDiagnosisQuestionGroup
  noteDrafts: Record<string, string>
  onNoteDraftChange: (questionId: string, value: string) => void
  onAnswer: (question: ButterflyCriterionQuestion, resolution: ClinicalQuestionResolution) => void
  onJumpToSection?: (pageId: NotionPageId) => void
}

/** Per-diagnosis collapsible block inside "Vorgeschlagene Fragen". */
function ButterflyQuestionDiagnosisGroup({
  t,
  group,
  noteDrafts,
  onNoteDraftChange,
  onAnswer,
  onJumpToSection,
}: ButterflyQuestionDiagnosisGroupProps) {
  const [open, setOpen] = useState(false)
  const bodyId = useId()

  return (
    <li className="butterfly-gap-diagnosis">
      <button
        type="button"
        className="butterfly-gap-diagnosis__head butterfly-gap-diagnosis__toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDown className="butterfly-collapsible__chevron" size={16} aria-hidden />
        <span className="butterfly-gap-diagnosis__name">{group.label}</span>
        {group.code ? <span className="butterfly-gap-diagnosis__code">{group.code}</span> : null}
        <span className="butterfly-gap-diagnosis__count">{group.questions.length}</span>
      </button>
      {open ? (
        <ul id={bodyId} className="butterfly-gap-list">
          {group.questions.map((question) => (
            <ButterflyCriterionQuestionItem
              key={question.id}
              question={question}
              noteDraft={noteDrafts[question.id] ?? ''}
              onNoteChange={(value) => onNoteDraftChange(question.id, value)}
              onAnswer={onAnswer}
              onJumpToSection={onJumpToSection}
              t={t}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

interface ButterflyCriterionQuestionItemProps {
  t: Translate
  question: ButterflyCriterionQuestion
  noteDraft: string
  onNoteChange: (value: string) => void
  onAnswer: (question: ButterflyCriterionQuestion, resolution: ClinicalQuestionResolution) => void
  onJumpToSection?: (pageId: NotionPageId) => void
}

function ButterflyCriterionQuestionItem({
  t,
  question,
  noteDraft,
  onNoteChange,
  onAnswer,
  onJumpToSection,
}: ButterflyCriterionQuestionItemProps) {
  const jumpPage = question.deepLinkPageId
  const hasFooter = question.resolvable || Boolean(jumpPage && onJumpToSection)

  return (
    <li className={`butterfly-gap butterfly-gap--${question.priority}`}>
      <p className="butterfly-gap__criterion-label">{question.criterionLabel}</p>
      <ul className="butterfly-gap__questions">
        {question.interviewQuestions.map((interviewQuestion, index) => (
          <li key={`${question.id}#${index}`} className="butterfly-gap__q-row">
            <span className="butterfly-gap__question">{interviewQuestion}</span>
            {question.resolvable ? (
              // Each interview question is answerable on its own row, but every
              // phrasing probes the SAME criterion: the answer is bridged to
              // `question.criterionId` (last answer wins). The first present/absent
              // resolves the criterion and the whole group drops off on re-evaluation.
              <div className="butterfly-gap__answer-actions" role="group" aria-label={interviewQuestion}>
                <button
                  type="button"
                  className="butterfly-answer-btn butterfly-answer-btn--yes"
                  onClick={() => onAnswer(question, 'present')}
                >
                  {t('butterflyQuestionYes')}
                </button>
                <button
                  type="button"
                  className="butterfly-answer-btn butterfly-answer-btn--no"
                  onClick={() => onAnswer(question, 'absent')}
                >
                  {t('butterflyQuestionNo')}
                </button>
                <button
                  type="button"
                  className="butterfly-answer-btn butterfly-answer-btn--unclear"
                  onClick={() => onAnswer(question, 'unclear')}
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
              value={noteDraft}
              placeholder={t('butterflyQuestionNotePlaceholder')}
              onChange={(event) => onNoteChange(event.target.value)}
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
}

interface ButterflyDiagnosisCardProps {
  t: Translate
  language: UiLanguage
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
  language,
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
  const advice = buildDisorderAdvice(evaluation, disorder, language)
  const exclusionGroupIds = new Set(
    disorder.groups.filter((group) => group.groupType === 'exclusion').map((group) => group.id),
  )
  const criteria = evaluation.perCriterion.filter((result) => !exclusionGroupIds.has(result.groupId))
  const hasUnresolved = criteria.some((result) => result.status === 'unknown' && result.source !== 'attested')
  const [open, setOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(true)
  const bodyId = useId()
  const groupBodyId = useId()

  return (
    <li className={`butterfly-card butterfly-card--${advice.tone}`}>
      <button
        type="button"
        className="butterfly-card__head butterfly-card__toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="butterfly-card__heading">
          <ChevronDown className="butterfly-collapsible__chevron" size={16} aria-hidden />
          <span className="butterfly-card__name">{label}</span>
          {code ? <span className="butterfly-card__code">{code}</span> : null}
        </span>
        <span className={`butterfly-verdict butterfly-verdict--${advice.tone}`}>
          {advice.tone === 'met'
            ? t('butterflyVerdictMet')
            : advice.tone === 'not_met'
              ? t('butterflyVerdictNotMet')
              : t('butterflyVerdictInsufficient')}
        </span>
      </button>

      {open ? (
        <div id={bodyId} className="butterfly-card__body">
          <p className="butterfly-card__advice">{advice.headline}</p>

          <div className="butterfly-card__group">
            <div className="butterfly-card__group-head">
              <button
                type="button"
                className="butterfly-group-toggle"
                aria-expanded={groupOpen}
                aria-controls={groupBodyId}
                onClick={() => setGroupOpen((value) => !value)}
              >
                <ChevronDown className="butterfly-collapsible__chevron" size={14} aria-hidden />
                <span className="butterfly-card__group-label">{t('butterflyCriteriaProvenanceTitle')}</span>
              </button>
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

            {groupOpen ? (
              <div id={groupBodyId} className="butterfly-card__group-body">
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
            ) : null}
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
        </div>
      ) : null}
    </li>
  )
}
