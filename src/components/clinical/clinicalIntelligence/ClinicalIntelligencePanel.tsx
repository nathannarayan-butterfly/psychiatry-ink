/**
 * Clinical Intelligence — main case-level panel.
 *
 * Restructured layout:
 *  - Header with run + global "Alle akzeptieren" actions.
 *  - Section-level AI-hypothesis disclaimer banner (still required).
 *  - Two summary graphs at the top — Dimensional Profile and Mechanism
 *    Hypotheses — side by side on wide screens, each with its own
 *    "Alle akzeptieren" button and inline expandable detail rows.
 *  - Collapsible sections below: Treatment Implications, Missing Info.
 *    Each is closed by default to keep the surface minimal.
 *  - The Development Diagnostics panel still renders at the bottom in Debug
 *    Mode unchanged.
 *
 * Hides itself entirely when the feature flag is disabled. Blocks runs when
 * the de-identified compact evidence base is missing.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Brain, CheckCheck, Loader2, MessageSquarePlus, Play, Save, Sparkles } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { useClinicalIntelligence } from '../../../hooks/useClinicalIntelligence'
import { ClinicalSection } from '../ClinicalSection'
import {
  isClinicalIntelligenceDebugMode,
} from '../../../utils/featureFlags'
import { isClinicalIntelligenceAvailableForCase } from '../../../demo/demoFeatureFlags'
import { CiAccordion } from './CiAccordion'
import { CiHypothesisBanner } from './CiHypothesisBanner'
import { DevelopmentDiagnosticsPanel } from './DevelopmentDiagnosticsPanel'
import { ClinicalIntelligenceDiscussPanel } from './ClinicalIntelligenceDiscussPanel'
import { DimensionalProfileGraph } from './DimensionalProfileGraph'
import { MechanismHypothesesGraph } from './MechanismHypothesesGraph'
import { MissingInfoCard } from './MissingInfoCard'
import { TreatmentImplicationsCard } from './TreatmentImplicationsCard'
import { ClinicalIntelligenceNotesSection } from './ClinicalIntelligenceNotesSection'
import { CiStatusCountRow } from './CiStatusCountRow'
import { showNotionToast } from '../../notion/NotionToast'
import { saveCiAcceptedToDokumente } from '../../../utils/clinicalIntelligence/saveAcceptedToDokumente'
import { computeCiReviewCounts } from '../../../utils/clinicalIntelligence/reviewCounts'
import { localizeClinicalIntelligenceRunForDisplay } from '../../../utils/clinicalIntelligence/localizeRunForDisplay'
import type {
  ClinicalIntelligenceDimensionId,
  ClinicalIntelligenceMechanismId,
  DimensionalIntegrationResult,
  MechanismInferenceResult,
} from '../../../types/clinicalIntelligence'

interface ClinicalIntelligencePanelProps {
  caseId: string
  className?: string
  /** Navigate to the saved document in case Dokumente. */
  onOpenDocument?: (documentId: string) => void
}

function countPendingDimensions(result: DimensionalIntegrationResult | null): number {
  if (!result) return 0
  return result.activeDimensions.filter((f) => f.reviewStatus === 'pending').length
}

function countPendingMechanisms(result: MechanismInferenceResult | null): number {
  if (!result) return 0
  return result.activeMechanisms.filter((m) => m.reviewStatus === 'pending').length
}

export function ClinicalIntelligencePanel({
  caseId,
  className,
}: ClinicalIntelligencePanelProps) {
  const { t, language } = useTranslation()
  const ci = useClinicalIntelligence(caseId)

  const debugMode = isClinicalIntelligenceDebugMode()
  const enabled = isClinicalIntelligenceAvailableForCase(caseId)

  const run = ci.latestRun
  const displayRun = useMemo(
    () => (run ? localizeClinicalIntelligenceRunForDisplay(run, language) : null),
    [run, language],
  )
  const dimensional = displayRun?.dimensional ?? null
  const mechanism = displayRun?.mechanism ?? null
  const evidenceItems = ci.evidence?.items

  const [expandedDim, setExpandedDim] = useState<
    ClinicalIntelligenceDimensionId | null
  >(null)
  const [expandedMech, setExpandedMech] = useState<
    ClinicalIntelligenceMechanismId | null
  >(null)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [discussOpen, setDiscussOpen] = useState(false)

  const documentLabels = useMemo(
    () => ({
      titlePrefix: t('ciDocumentTitlePrefix'),
      headerCase: t('ciDocumentHeaderCase'),
      headerRunDate: t('ciLastRunLabel'),
      headerSavedDate: t('ciRightRailSavedAt'),
      clinicianComment: t('ciRightRailCommentLabel'),
      sectionDimensions: t('ciCardDimensional'),
      sectionMechanisms: t('ciCardMechanism'),
      severity: t('ciSeverityLabel'),
      confidence: t('ciConfidenceLabel'),
      clinicalSummary: t('ciClinicalSummary'),
      longitudinalPattern: t('ciLongitudinalPattern'),
      uncertainty: t('ciUncertaintyLabel'),
      missingData: t('ciMissingDataLabel'),
      clinicalImplication: t('ciClinicalImplication'),
      treatmentRelevance: t('ciTreatmentRelevance'),
      statusAccepted: t('ciStatusAccepted'),
      statusEdited: t('ciStatusEdited'),
      disclaimer: t('ciDisclaimer'),
      noAcceptedDimensions: t('ciDocumentNoAcceptedDimensions'),
      noAcceptedMechanisms: t('ciDocumentNoAcceptedMechanisms'),
      confidenceLow: t('ciConfidenceLow'),
      confidenceModerate: t('ciConfidenceModerate'),
      confidenceHigh: t('ciConfidenceHigh'),
    }),
    [t],
  )

  useEffect(() => {
    setCommentDraft(ci.state.clinicianComment)
    setCommentOpen(false)
    setDiscussOpen(false)
  }, [caseId, ci.state.clinicianComment])

  const pendingDim = useMemo(() => countPendingDimensions(dimensional), [dimensional])
  const pendingMech = useMemo(() => countPendingMechanisms(mechanism), [mechanism])

  const reviewCounts = useMemo(
    () => computeCiReviewCounts(ci.state, run),
    [ci.state, run],
  )

  const onRun = useCallback(() => {
    void ci.runPipeline()
  }, [ci])

  const onToggleDim = useCallback((id: ClinicalIntelligenceDimensionId) => {
    setExpandedDim((current) => (current === id ? null : id))
  }, [])

  const onToggleMech = useCallback((id: ClinicalIntelligenceMechanismId) => {
    setExpandedMech((current) => (current === id ? null : id))
  }, [])

  const confirmAndAccept = useCallback(
    (layer: 'dimensional' | 'mechanism' | 'all', dim: number, mech: number) => {
      if (dim === 0 && mech === 0) return
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        const message = t('ciAcceptAllConfirm')
          .replace('{dim}', String(dim))
          .replace('{mech}', String(mech))
        if (!window.confirm(message)) return
      }
      ci.acceptAll(layer)
    },
    [ci, t],
  )

  const onAcceptAllGlobal = useCallback(() => {
    confirmAndAccept('all', pendingDim, pendingMech)
  }, [confirmAndAccept, pendingDim, pendingMech])

  const onAcceptAllDimensions = useCallback(() => {
    confirmAndAccept('dimensional', pendingDim, 0)
  }, [confirmAndAccept, pendingDim])

  const onAcceptAllMechanisms = useCallback(() => {
    confirmAndAccept('mechanism', 0, pendingMech)
  }, [confirmAndAccept, pendingMech])

  const saveAcceptedToDocuments = useCallback(() => {
    if (!displayRun) return
    const savedAt = new Date().toISOString()
    saveCiAcceptedToDokumente({
      caseId,
      run: displayRun,
      clinicianComment: ci.state.clinicianComment,
      savedAt,
      labels: documentLabels,
      locale: language,
    })
    ci.saveAcceptedFindings(savedAt)
    showNotionToast(t('ciSaveDocumentToast'))
  }, [caseId, ci, displayRun, documentLabels, language, t])

  const onSaveAccepted = useCallback(() => {
    saveAcceptedToDocuments()
  }, [saveAcceptedToDocuments])

  const onSaveComment = useCallback(() => {
    ci.saveClinicianComment(commentDraft)
    setCommentOpen(false)
  }, [ci, commentDraft])

  const onToggleComment = useCallback(() => {
    setCommentOpen((open) => {
      if (!open) setCommentDraft(ci.state.clinicianComment)
      return !open
    })
  }, [ci.state.clinicianComment])

  const onToggleDiscuss = useCallback(() => {
    setDiscussOpen((open) => !open)
  }, [])

  if (!enabled) {
    return null
  }

  const classes = [
    'ci-panel',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  const isRunning = ci.status === 'running'
  const showEvidenceMissing = !ci.hasEvidenceBase
  const totalPending = pendingDim + pendingMech

  return (
    <div className={classes} data-language={language}>
      <div className="ci-panel__intro">
        <header className="ci-panel__head">
          <div className="ci-panel__title">
            <Brain className="ci-panel__icon" aria-hidden strokeWidth={2} />
            <div>
              <h2 className="ci-panel__h">{t('ciSectionTitle')}</h2>
            </div>
          </div>
          <div className="ci-panel__head-actions">
          {run && totalPending > 0 ? (
            <button
              type="button"
              className="ci-btn ci-panel__accept-all"
              onClick={onAcceptAllGlobal}
              title={t('ciAcceptAllTitle')}
            >
              <CheckCheck className="ci-btn__icon" aria-hidden strokeWidth={2} />
              {t('ciAcceptAllButton')}
              <span className="ci-panel__accept-all-count">{totalPending}</span>
            </button>
          ) : null}
          {run ? (
            <>
              <button
                type="button"
                className="ci-btn ci-panel__head-action"
                onClick={onSaveAccepted}
                title={t('ciRightRailSaveHint')}
              >
                <Save className="ci-btn__icon" aria-hidden strokeWidth={2} />
                {t('ciRightRailSave')}
              </button>
              <button
                type="button"
                className="ci-btn ci-panel__head-action"
                onClick={onToggleComment}
                aria-expanded={commentOpen}
              >
                <MessageSquarePlus className="ci-btn__icon" aria-hidden strokeWidth={2} />
                {commentOpen ? t('ciRightRailCommentClose') : t('ciRightRailComment')}
              </button>
              <button
                type="button"
                className="ci-btn ci-panel__head-action ci-panel__discuss"
                onClick={onToggleDiscuss}
                disabled={!run}
                aria-expanded={discussOpen}
              >
                <Sparkles className="ci-btn__icon" aria-hidden strokeWidth={2} />
                {discussOpen ? t('ciRightRailDiscussClose') : t('ciRightRailDiscuss')}
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="ci-btn ci-btn--primary ci-panel__run"
            onClick={onRun}
            disabled={isRunning || showEvidenceMissing}
          >
            {isRunning ? (
              <Loader2 className="ci-btn__icon ci-btn__icon--spin" aria-hidden strokeWidth={2} />
            ) : (
              <Play className="ci-btn__icon" aria-hidden strokeWidth={2} />
            )}
            {isRunning
              ? t('ciRunningLabel')
              : ci.hasLatestRun
                ? t('ciRerunButton')
                : t('ciRunButton')}
          </button>
          </div>
        </header>
        <CiHypothesisBanner />
      </div>

      <div className="ci-panel__main">
          {showEvidenceMissing ? (
        <ClinicalSection eyebrow={t('ciEvidenceMissingTitle')}>
          <p>{t('ciEvidenceMissingBody')}</p>
        </ClinicalSection>
      ) : null}

      {ci.error ? (
        <ClinicalSection eyebrow={t('ciRunFailedTitle')}>
          <p className="ci-error">
            [{ci.error.code}] {ci.error.message}
          </p>
        </ClinicalSection>
      ) : null}

      {!run ? (
        <ClinicalSection eyebrow={t('ciNoRunYet')}>
          <p>{t('ciEmptyStateBody')}</p>
        </ClinicalSection>
      ) : (
        <>
          {(dimensional || mechanism) ? (
            <div className="ci-graphs-row">
              {dimensional ? (
                <ClinicalSection
                  className="ci-graph-section"
                  eyebrow={t('ciCardDimensional')}
                  meta={`${dimensional.activeDimensions.length} ${t('ciActiveLabel')}`}
                  headerExtra={
                    pendingDim > 0 ? (
                      <button
                        type="button"
                        className="ci-btn ci-section-accept-all"
                        onClick={onAcceptAllDimensions}
                      >
                        <CheckCheck className="ci-btn__icon" aria-hidden strokeWidth={2} />
                        {t('ciAcceptAllButton')} ({pendingDim})
                      </button>
                    ) : null
                  }
                >
                  <CiStatusCountRow
                    accepted={reviewCounts.dimensional.accepted}
                    pending={reviewCounts.dimensional.pending}
                    rejected={reviewCounts.dimensional.rejected}
                    className="ci-graph-section__status"
                  />
                  <DimensionalProfileGraph
                    result={dimensional}
                    evidenceItems={evidenceItems}
                    expandedId={expandedDim}
                    onToggle={onToggleDim}
                    onAccept={ci.acceptDimension}
                    onReject={ci.rejectDimension}
                    onEdit={ci.editDimension}
                  />
                </ClinicalSection>
              ) : null}

              {mechanism ? (
                <ClinicalSection
                  className="ci-graph-section"
                  eyebrow={t('ciCardMechanism')}
                  meta={`${mechanism.activeMechanisms.length} ${t('ciActiveLabel')}`}
                  headerExtra={
                    pendingMech > 0 ? (
                      <button
                        type="button"
                        className="ci-btn ci-section-accept-all"
                        onClick={onAcceptAllMechanisms}
                      >
                        <CheckCheck className="ci-btn__icon" aria-hidden strokeWidth={2} />
                        {t('ciAcceptAllButton')} ({pendingMech})
                      </button>
                    ) : null
                  }
                >
                  <CiStatusCountRow
                    accepted={reviewCounts.mechanism.accepted}
                    pending={reviewCounts.mechanism.pending}
                    rejected={reviewCounts.mechanism.rejected}
                    className="ci-graph-section__status"
                  />
                  <MechanismHypothesesGraph
                    result={mechanism}
                    evidenceItems={evidenceItems}
                    expandedId={expandedMech}
                    onToggle={onToggleMech}
                    onAccept={ci.acceptMechanism}
                    onReject={ci.rejectMechanism}
                    onEdit={ci.editMechanism}
                  />
                </ClinicalSection>
              ) : null}
            </div>
          ) : null}

          {mechanism ? (
            <CiAccordion
              eyebrow={t('ciCardTreatment')}
              meta={
                mechanism.activeMechanisms.filter(
                  (m) => m.reviewStatus !== 'rejected' && m.treatmentRelevance.trim().length > 0,
                ).length > 0
                  ? `${
                      mechanism.activeMechanisms.filter(
                        (m) =>
                          m.reviewStatus !== 'rejected' && m.treatmentRelevance.trim().length > 0,
                      ).length
                    }`
                  : null
              }
            >
              <TreatmentImplicationsCard
                mechanismResult={mechanism}
                evidenceItems={evidenceItems}
              />
            </CiAccordion>
          ) : null}

          {dimensional && mechanism ? (
            <CiAccordion eyebrow={t('ciCardMissing')}>
              <MissingInfoCard
                dimensionalResult={dimensional}
                mechanismResult={mechanism}
              />
            </CiAccordion>
          ) : null}

          <ClinicalIntelligenceNotesSection
            ci={ci}
            commentOpen={commentOpen}
            commentDraft={commentDraft}
            onCommentDraftChange={setCommentDraft}
            onSaveComment={onSaveComment}
          />
        </>
      )}

      {debugMode && import.meta.env.DEV ? (
        <DevelopmentDiagnosticsPanel
          evidence={ci.evidence}
          evidenceErrorCode={ci.evidenceError?.code ?? null}
          evidenceErrorMessage={ci.evidenceError?.message ?? null}
          latestRun={ci.latestRun}
          runError={ci.error}
        />
      ) : null}
      </div>

      {discussOpen ? (
        <ClinicalIntelligenceDiscussPanel
          ci={ci}
          open={discussOpen}
          onClose={() => setDiscussOpen(false)}
          placement="dock"
        />
      ) : null}
    </div>
  )
}
