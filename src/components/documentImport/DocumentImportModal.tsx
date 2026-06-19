import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type {
  ClinicalImportCandidate,
  ClinicalImportEnvelope,
  ExtractedPatientIdentity,
} from '../../schemas/documentImport/envelope'
import { parseFile, type TabularContext } from '../../utils/documentImport/parsers/index'
import { useParserProfile } from '../../hooks/useParserProfile'
import { tabularToCandidates, type ColumnMapping } from '../../utils/documentImport/tabular'
import { persistAcceptedCandidates } from '../../utils/documentImport/persistCandidates'
import { deleteImportedFile } from '../../utils/documentImport/importedFileStore'
import { redactPatientName } from '../../utils/documentImport/deidentify'
import { analyzeImport } from '../../utils/documentImport/importAnalyze'
import { suggestMappings } from '../../utils/documentImport/aiMapping'
import { applyAcceptedOverviewSuggestions } from '../../utils/documentImport/applyOverviewSuggestions'
import { remapCandidate } from '../../utils/documentImport/remap'
import { candidateIsAutoAcceptable, candidateNeedsReview } from '../../utils/documentImport/reviewHelpers'
import { isDocumentImportAiMappingEnabled } from '../../utils/featureFlags'
import { showNotionToast } from '../notion/NotionToast'
import { ImportDropzone } from './ImportDropzone'
import { ColumnMappingPanel } from './ColumnMappingPanel'
import { CandidateReviewRow, type ReviewStatus } from './CandidateReviewRow'
import {
  PatientIdentityPanel,
  type CreatedPatientInput,
  type ExistingPatientOption,
} from './PatientIdentityPanel'
import {
  OverviewSuggestionsPanel,
  type OverviewSuggestionStatus,
} from './OverviewSuggestionsPanel'
import { PatientSubheadingPanel } from './PatientSubheadingPanel'
import type { OverviewWidgetSuggestion } from '../../schemas/documentImport/aiSuggestion'
import { getCaseMeta, upsertCaseMeta } from '../../hooks/useCaseRegistry'

interface PatientName {
  vorname?: string
  nachname?: string
}

interface DocumentImportModalProps {
  open: boolean
  onClose: () => void
  /** Called after at least one candidate was persisted (with the target case id). */
  onImported?: (caseId: string) => void
  /** Display name of the accepting clinician for provenance/audit. */
  acceptedBy?: string

  /** Case mode: the import auto-attaches to this existing patient case. */
  caseId?: string
  patientVorname?: string
  patientNachname?: string

  /** Standalone (dashboard) mode: create or select the patient this import belongs to. */
  allowPatientCreation?: boolean
  /** Create a patient from confirmed identity; returns the new case id. */
  onCreatePatient?: (input: CreatedPatientInput) => string
  /** Existing patients offered for attachment in standalone mode. */
  existingPatients?: ExistingPatientOption[]
}

type Phase = 'upload' | 'parsing' | 'analyzing' | 'identity' | 'review'

/** Scrub the known patient's name from a candidate's narrative fields. */
function redactCandidate(
  candidate: ClinicalImportCandidate,
  name: PatientName,
): { candidate: ClinicalImportCandidate; redactions: number } {
  if (!name.vorname && !name.nachname) return { candidate, redactions: 0 }
  const data = candidate.data as Record<string, unknown>
  let redactions = 0
  const next: Record<string, unknown> = { ...data }
  let rawText = candidate.rawText
  for (const field of ['text', 'title', 'label']) {
    const value = data[field]
    if (typeof value === 'string' && value) {
      const result = redactPatientName(value, { vorname: name.vorname, nachname: name.nachname })
      if (result.redactions > 0) {
        next[field] = result.text
        redactions += result.redactions
      }
    }
  }
  if (rawText) {
    const result = redactPatientName(rawText, { vorname: name.vorname, nachname: name.nachname })
    if (result.redactions > 0) {
      rawText = result.text
      redactions += result.redactions
    }
  }
  if (redactions === 0) return { candidate, redactions: 0 }
  return { candidate: { ...candidate, rawText, data: next } as ClinicalImportCandidate, redactions }
}

export function DocumentImportModal({
  open,
  onClose,
  onImported,
  acceptedBy = 'Behandler:in',
  caseId,
  patientVorname,
  patientNachname,
  allowPatientCreation = false,
  onCreatePatient,
  existingPatients = [],
}: DocumentImportModalProps) {
  const { t, language } = useTranslation()
  const { profile: parserProfile } = useParserProfile()
  const [phase, setPhase] = useState<Phase>('upload')
  const [envelope, setEnvelope] = useState<ClinicalImportEnvelope | null>(null)
  const [candidates, setCandidates] = useState<ClinicalImportCandidate[]>([])
  const [statuses, setStatuses] = useState<Record<string, ReviewStatus>>({})
  const [tabular, setTabular] = useState<TabularContext | null>(null)
  const [saving, setSaving] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [identity, setIdentity] = useState<ExtractedPatientIdentity | null>(null)
  const [effectiveCaseId, setEffectiveCaseId] = useState<string | null>(caseId ?? null)
  const [redactionCount, setRedactionCount] = useState(0)
  const [showReviewOnly, setShowReviewOnly] = useState(false)
  const [overviewSuggestions, setOverviewSuggestions] = useState<OverviewWidgetSuggestion[]>([])
  const [overviewStatuses, setOverviewStatuses] = useState<Record<number, OverviewSuggestionStatus>>({})
  const [patientSubheading, setPatientSubheading] = useState<string | null>(null)
  const [patientSubheadingStatus, setPatientSubheadingStatus] = useState<OverviewSuggestionStatus>('pending')

  const reset = useCallback(() => {
    setPhase('upload')
    setEnvelope(null)
    setCandidates([])
    setStatuses({})
    setTabular(null)
    setSaving(false)
    setAiBusy(false)
    setIdentity(null)
    setEffectiveCaseId(caseId ?? null)
    setRedactionCount(0)
    setShowReviewOnly(false)
    setOverviewSuggestions([])
    setOverviewStatuses({})
    setPatientSubheading(null)
    setPatientSubheadingStatus('pending')
  }, [caseId])

  // Delete stored attachments that were never accepted (avoids orphan blobs).
  const pruneAttachments = useCallback((cands: ClinicalImportCandidate[], accepted: Set<string>) => {
    for (const candidate of cands) {
      if (candidate.module !== 'document') continue
      const storeId = candidate.data.attachment?.storeId
      if (storeId && !accepted.has(candidate.id)) void deleteImportedFile(storeId)
    }
  }, [])

  const handleClose = useCallback(() => {
    pruneAttachments(candidates, new Set())
    reset()
    onClose()
  }, [candidates, onClose, pruneAttachments, reset])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, handleClose])

  const initStatuses = useCallback((cands: ClinicalImportCandidate[]) => {
    const next: Record<string, ReviewStatus> = {}
    for (const candidate of cands) next[candidate.id] = 'pending'
    setStatuses(next)
  }, [])

  /** Apply patient-name de-identification across candidates and enter review. */
  const applyMappingSuggestions = useCallback(
    (cands: ClinicalImportCandidate[], suggestions: { candidateId: string; suggestedModule: ClinicalImportCandidate['module'] }[]) => {
      if (suggestions.length === 0) return cands
      return cands.map((candidate) => {
        const suggestion = suggestions.find((s) => s.candidateId === candidate.id)
        if (!suggestion || suggestion.suggestedModule === candidate.module) return candidate
        return { ...remapCandidate(candidate, suggestion.suggestedModule), aiSuggested: true }
      })
    },
    [],
  )

  const patientNamesForDeid = useCallback(
    (name: PatientName): string[] => {
      const names: string[] = []
      if (name.vorname) names.push(name.vorname)
      if (name.nachname) names.push(name.nachname)
      if (name.vorname && name.nachname) names.push(`${name.vorname} ${name.nachname}`)
      return names
    },
    [],
  )

  const runPostParseAnalyze = useCallback(
    async (
      env: ClinicalImportEnvelope,
      scrubbed: ClinicalImportCandidate[],
      name: PatientName,
      tabularColumns?: string[],
    ) => {
      if (!isDocumentImportAiMappingEnabled()) {
        setCandidates(scrubbed)
        initStatuses(scrubbed)
        setPhase('review')
        return
      }

      setPhase('analyzing')
      try {
        const { mappingSuggestions, overviewWidgetSuggestions, patientSubheading: subheading, ran } = await analyzeImport(env, scrubbed, {
          language,
          patientNames: patientNamesForDeid(name),
          columns: tabularColumns,
        })
        const withMappings = applyMappingSuggestions(scrubbed, mappingSuggestions)
        setCandidates(withMappings)
        initStatuses(withMappings)
        setOverviewSuggestions(overviewWidgetSuggestions)
        setPatientSubheading(subheading?.trim() || null)
        setPatientSubheadingStatus('pending')
        const overviewInit: Record<number, OverviewSuggestionStatus> = {}
        overviewWidgetSuggestions.forEach((_, i) => {
          overviewInit[i] = 'pending'
        })
        setOverviewStatuses(overviewInit)
        if (ran && mappingSuggestions.length > 0) {
          showNotionToast(
            t('documentImportAiSuggestApplied').replace('{count}', String(mappingSuggestions.length)),
          )
        }
      } catch {
        setCandidates(scrubbed)
        initStatuses(scrubbed)
        showNotionToast(t('documentImportAnalyzeFailed'))
      } finally {
        setPhase('review')
      }
    },
    [applyMappingSuggestions, initStatuses, language, patientNamesForDeid, t],
  )

  const enterReview = useCallback(
    async (env: ClinicalImportEnvelope, cands: ClinicalImportCandidate[], name: PatientName, tabularColumns?: string[]) => {
      let total = 0
      const scrubbed = cands.map((candidate) => {
        const { candidate: next, redactions } = redactCandidate(candidate, name)
        total += redactions
        return next
      })
      setRedactionCount(total)
      await runPostParseAnalyze(env, scrubbed, name, tabularColumns)
    },
    [runPostParseAnalyze],
  )

  const handleFile = useCallback(
    async (file: File) => {
      setPhase('parsing')
      try {
        const result = await parseFile(file, {
          caseId: effectiveCaseId ?? caseId ?? 'pending-import',
          parserProfile,
        })
        setEnvelope(result.envelope)
        setTabular(result.tabular ?? null)
        setIdentity(result.envelope.patientIdentity ?? null)

        // Case mode: patient already known → de-identify with their name and review.
        if (caseId) {
          setEffectiveCaseId(caseId)
          void enterReview(result.envelope, result.envelope.candidates, {
            vorname: patientVorname,
            nachname: patientNachname,
          }, result.tabular?.table.headers)
          return
        }

        // Standalone mode: confirm/create the patient before reviewing.
        if (allowPatientCreation) {
          setCandidates(result.envelope.candidates)
          setPhase('identity')
          return
        }

        // No case + no creation allowed: review without de-identification.
        void enterReview(result.envelope, result.envelope.candidates, {}, result.tabular?.table.headers)
      } catch {
        showNotionToast(t('documentImportUnsupported'))
        setPhase('upload')
      }
    },
    [allowPatientCreation, caseId, effectiveCaseId, enterReview, parserProfile, patientVorname, patientNachname, t],
  )

  const handleCreatePatient = useCallback(
    (input: CreatedPatientInput) => {
      const newCaseId = onCreatePatient?.(input)
      if (!newCaseId) {
        showNotionToast(t('documentImportSaveErrorToast').replace('{count}', '1'))
        return
      }
      setEffectiveCaseId(newCaseId)
      void enterReview(envelope!, candidates, { vorname: input.vorname, nachname: input.nachname })
    },
    [candidates, envelope, enterReview, onCreatePatient, t],
  )

  const handleSelectExisting = useCallback(
    (option: ExistingPatientOption) => {
      setEffectiveCaseId(option.caseId)
      void enterReview(envelope!, candidates, { vorname: option.vorname, nachname: option.nachname })
    },
    [candidates, envelope, enterReview],
  )

  const handleMappingChange = useCallback(
    (mapping: ColumnMapping) => {
      if (!tabular) return
      const { candidates: next } = tabularToCandidates(tabular.table, mapping)
      setTabular({ table: tabular.table, mapping })
      const name: PatientName = caseId
        ? { vorname: patientVorname, nachname: patientNachname }
        : {}
      let total = 0
      const scrubbed = next.map((candidate) => {
        const r = redactCandidate(candidate, name)
        total += r.redactions
        return r.candidate
      })
      setCandidates(scrubbed)
      initStatuses(scrubbed)
      setRedactionCount(total)
    },
    [tabular, initStatuses, caseId, patientVorname, patientNachname],
  )

  const setStatus = useCallback((id: string, status: ReviewStatus) => {
    setStatuses((prev) => ({ ...prev, [id]: prev[id] === status ? 'pending' : status }))
  }, [])

  const updateCandidate = useCallback((updated: ClinicalImportCandidate) => {
    setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
  }, [])

  const bulkStatus = useCallback(
    (status: ReviewStatus) => {
      setStatuses(() => {
        const next: Record<string, ReviewStatus> = {}
        for (const candidate of candidates) next[candidate.id] = status
        return next
      })
    },
    [candidates],
  )

  const acceptAllDetected = useCallback(() => {
    setStatuses((prev) => {
      const next = { ...prev }
      for (const candidate of candidates) {
        if (candidateIsAutoAcceptable(candidate)) next[candidate.id] = 'accepted'
      }
      return next
    })
    setShowReviewOnly(true)
  }, [candidates])

  const acceptAllAiSuggested = useCallback(() => {
    setStatuses((prev) => {
      const next = { ...prev }
      for (const candidate of candidates) {
        if (candidate.aiSuggested) next[candidate.id] = 'accepted'
      }
      return next
    })
    setShowReviewOnly(true)
  }, [candidates])

  const visibleCandidates = useMemo(() => {
    if (!showReviewOnly) return candidates
    return candidates.filter((candidate) =>
      candidateNeedsReview(candidate, statuses[candidate.id] ?? 'pending'),
    )
  }, [candidates, showReviewOnly, statuses])

  const reviewOnlyCount = useMemo(
    () => candidates.filter((c) => candidateNeedsReview(c, statuses[c.id] ?? 'pending')).length,
    [candidates, statuses],
  )

  const hasAiSuggestions = useMemo(
    () => candidates.some((c) => c.aiSuggested && (statuses[c.id] ?? 'pending') === 'pending'),
    [candidates, statuses],
  )

  const acceptedCount = useMemo(
    () => candidates.filter((c) => statuses[c.id] === 'accepted').length,
    [candidates, statuses],
  )

  const unresolvedAcceptedCount = useMemo(
    () =>
      candidates.filter(
        (c) => statuses[c.id] === 'accepted' && (c.clarifications?.length ?? 0) > 0,
      ).length,
    [candidates, statuses],
  )

  const handleAiSuggest = useCallback(async () => {
    if (!envelope) return
    setAiBusy(true)
    try {
      const { suggestions } = await suggestMappings({ ...envelope, candidates }, { language })
      if (suggestions.length > 0) {
        setCandidates((prev) =>
          prev.map((candidate) => {
            const suggestion = suggestions.find((s) => s.candidateId === candidate.id)
            if (!suggestion || suggestion.suggestedModule === candidate.module) return candidate
            return { ...remapCandidate(candidate, suggestion.suggestedModule), aiSuggested: true }
          }),
        )
        showNotionToast(t('documentImportAiSuggestApplied').replace('{count}', String(suggestions.length)))
      } else {
        showNotionToast(t('documentImportAiSuggestEmpty'))
      }
    } catch {
      showNotionToast(t('documentImportAiSuggestFailed'))
    } finally {
      setAiBusy(false)
    }
  }, [candidates, envelope, language, t])

  const setOverviewStatus = useCallback((index: number, status: OverviewSuggestionStatus) => {
    setOverviewStatuses((prev) => ({ ...prev, [index]: prev[index] === status ? 'pending' : status }))
  }, [])

  const acceptAllOverviewSuggestions = useCallback(() => {
    setOverviewStatuses(() => {
      const next: Record<number, OverviewSuggestionStatus> = {}
      overviewSuggestions.forEach((_, i) => {
        next[i] = 'accepted'
      })
      return next
    })
  }, [overviewSuggestions])

  const acceptedOverviewIndices = useMemo(() => {
    const indices = new Set<number>()
    overviewSuggestions.forEach((_, i) => {
      if (overviewStatuses[i] === 'accepted') indices.add(i)
    })
    return indices
  }, [overviewSuggestions, overviewStatuses])

  const handleSave = useCallback(() => {
    if (!envelope || !effectiveCaseId) return
    const accepted = candidates.filter((c) => statuses[c.id] === 'accepted')
    if (accepted.length === 0) return
    setSaving(true)
    const result = persistAcceptedCandidates({
      caseId: effectiveCaseId,
      envelope,
      acceptedCandidates: accepted,
      acceptedBy,
      language,
    })
    pruneAttachments(candidates, new Set(accepted.map((c) => c.id)))

    if (acceptedOverviewIndices.size > 0) {
      const overviewResult = applyAcceptedOverviewSuggestions({
        caseId: effectiveCaseId,
        suggestions: overviewSuggestions,
        acceptedIndices: acceptedOverviewIndices,
        persistResult: result,
      })
      if (overviewResult.applied > 0) {
        showNotionToast(
          t('documentImportOverviewAppliedToast').replace('{count}', String(overviewResult.applied)),
        )
      }
    }

    const metaPatch: Parameters<typeof upsertCaseMeta>[1] = {}
    if (patientSubheadingStatus === 'accepted' && patientSubheading?.trim()) {
      metaPatch.localClinicalSubheading = patientSubheading.trim()
    }
    const parsedDob = identity?.geburtsdatum?.trim()
    const existingMeta = getCaseMeta(effectiveCaseId)
    if (parsedDob && !existingMeta?.localGeburtsdatum?.trim()) {
      metaPatch.localGeburtsdatum = parsedDob
    }
    if (Object.keys(metaPatch).length > 0) {
      upsertCaseMeta(effectiveCaseId, metaPatch)
      if (metaPatch.localClinicalSubheading) {
        showNotionToast(t('documentImportPatientSubheadingAppliedToast'))
      }
    }

    showNotionToast(t('documentImportSavedToast').replace('{count}', String(result.persisted.length)))
    if (result.errors.length > 0) {
      showNotionToast(t('documentImportSaveErrorToast').replace('{count}', String(result.errors.length)))
    }
    if (result.persisted.length > 0) onImported?.(effectiveCaseId)
    reset()
    onClose()
  }, [acceptedOverviewIndices, acceptedBy, candidates, effectiveCaseId, envelope, identity, language, onClose, onImported, overviewSuggestions, patientSubheading, patientSubheadingStatus, pruneAttachments, reset, statuses, t])

  if (!open) return null

  const storedOnly = envelope?.parsingMode === 'stored_only'

  return (
    <div className="doc-import-overlay" role="presentation" onClick={handleClose}>
      <div
        className="doc-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="doc-import-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="doc-import-dialog__header">
          <div>
            <h2 id="doc-import-title" className="doc-import-dialog__title">
              {t('documentImportTitle')}
            </h2>
            <p className="doc-import-dialog__subtitle">{t('documentImportSubtitle')}</p>
          </div>
          <button
            type="button"
            className="doc-import-icon-btn"
            onClick={handleClose}
            aria-label={t('documentImportCancel')}
          >
            <X strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        <div className="doc-import-dialog__body">
          {phase === 'upload' && <ImportDropzone onFile={handleFile} />}

          {phase === 'parsing' && <p className="doc-import-status">{t('documentImportParsing')}</p>}

          {phase === 'analyzing' && <p className="doc-import-status">{t('documentImportAnalyzing')}</p>}

          {phase === 'identity' && (
            <PatientIdentityPanel
              identity={identity}
              existingPatients={existingPatients}
              onConfirmCreate={handleCreatePatient}
              onConfirmExisting={handleSelectExisting}
            />
          )}

          {phase === 'review' && envelope && (
            <div className="doc-import-review">
              <p className="doc-import-review__heading">{t('documentImportReviewHeading')}</p>

              {storedOnly && (
                <div className="doc-import-notice doc-import-notice--info">
                  {t('documentImportPdfStoredOnly')}
                </div>
              )}

              {redactionCount > 0 && (
                <div className="doc-import-notice doc-import-notice--info">
                  {t('documentImportNameRedacted').replace('{count}', String(redactionCount))}
                </div>
              )}

              {envelope.notices
                .filter((n) => !(storedOnly && n.code === 'pdf_stored_only'))
                .map((n, i) => (
                  <div key={`${n.code}-${i}`} className={`doc-import-notice doc-import-notice--${n.level}`}>
                    {n.message}
                  </div>
                ))}

              {tabular && (
                <ColumnMappingPanel
                  table={tabular.table}
                  mapping={tabular.mapping}
                  onChange={handleMappingChange}
                />
              )}

              {patientSubheading ? (
                <PatientSubheadingPanel
                  subheading={patientSubheading}
                  status={patientSubheadingStatus}
                  onToggle={setPatientSubheadingStatus}
                />
              ) : null}

              {overviewSuggestions.length > 0 && (
                <OverviewSuggestionsPanel
                  suggestions={overviewSuggestions}
                  statuses={overviewStatuses}
                  onToggle={setOverviewStatus}
                  onAcceptAll={acceptAllOverviewSuggestions}
                />
              )}

              {candidates.length === 0 ? (
                <p className="doc-import-status">{t('documentImportNoCandidates')}</p>
              ) : (
                <>
                  <div className="doc-import-review__bulk">
                    <button type="button" className="doc-import-textbtn" onClick={acceptAllDetected}>
                      {t('documentImportAcceptAllDetected')}
                    </button>
                    <button type="button" className="doc-import-textbtn" onClick={() => bulkStatus('accepted')}>
                      {t('documentImportSelectAll')}
                    </button>
                    <button type="button" className="doc-import-textbtn" onClick={() => bulkStatus('rejected')}>
                      {t('documentImportRejectAll')}
                    </button>
                    <label className="doc-import-review__filter">
                      <input
                        type="checkbox"
                        checked={showReviewOnly}
                        onChange={(e) => setShowReviewOnly(e.target.checked)}
                      />
                      {t('documentImportShowReviewOnly')}
                      {reviewOnlyCount > 0 ? ` (${reviewOnlyCount})` : ''}
                    </label>
                    {isDocumentImportAiMappingEnabled() && (
                      <>
                        <button
                          type="button"
                          className="doc-import-textbtn doc-import-textbtn--ai"
                          onClick={handleAiSuggest}
                          disabled={aiBusy}
                        >
                          <Sparkles className="doc-import-textbtn__icon" aria-hidden strokeWidth={1.75} />
                          {t('documentImportAiSupport')}
                        </button>
                        {hasAiSuggestions && (
                          <button
                            type="button"
                            className="doc-import-textbtn"
                            onClick={acceptAllAiSuggested}
                          >
                            {t('documentImportAcceptAllAiSuggested')}
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="doc-import-review__list">
                    {visibleCandidates.length === 0 ? (
                      <p className="doc-import-status">{t('documentImportReviewOnlyEmpty')}</p>
                    ) : (
                      visibleCandidates.map((candidate) => (
                      <CandidateReviewRow
                        key={candidate.id}
                        candidate={candidate}
                        status={statuses[candidate.id] ?? 'pending'}
                        onAccept={() => setStatus(candidate.id, 'accepted')}
                        onReject={() => setStatus(candidate.id, 'rejected')}
                        onChange={updateCandidate}
                      />
                    ))
                    )}
                  </div>
                </>
              )}

              {envelope.rawPreview && (
                <details className="doc-import-preview">
                  <summary>{t('documentImportSourcePreview')}</summary>
                  <pre className="doc-import-preview__text">{envelope.rawPreview}</pre>
                </details>
              )}

              {unresolvedAcceptedCount > 0 && (
                <p className="doc-import-review__warn">
                  {t('documentImportUnresolvedWarning').replace('{count}', String(unresolvedAcceptedCount))}
                </p>
              )}
              <p className="doc-import-review__provenance">{t('documentImportProvenanceNote')}</p>
            </div>
          )}
        </div>

        <footer className="doc-import-dialog__footer">
          <button type="button" className="doc-import-btn" onClick={handleClose}>
            {t('documentImportCancel')}
          </button>
          {phase === 'review' && (
            <button
              type="button"
              className="doc-import-btn doc-import-btn--primary"
              onClick={handleSave}
              disabled={acceptedCount === 0 || saving}
            >
              {t('documentImportSaveAccepted')}
              {acceptedCount > 0 ? ` (${acceptedCount})` : ''}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
