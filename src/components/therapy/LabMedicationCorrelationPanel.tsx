import { useState } from 'react'
import type { MedicationEntry, MedicationPlanState } from '../../types/medicationPlan'
import type {
  LabCorrelationAIResult,
  PatientMedicationLabCorrelationFinding,
} from '../../types/labMedicationCorrelation'
import { useLabMedicationCorrelation } from '../../hooks/useLabMedicationCorrelation'
import type { UiLanguage } from '../../types/settings'
import {
  formatValueRef,
  strengthClass,
} from '../../utils/labMedicationCorrelation/labMedCorrelationLabels'
import {
  exportLabMedCorrelationCsv,
  printLabMedCorrelation,
} from '../../utils/labMedicationCorrelation/printLabMedCorrelation'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import type {
  LabCorrelationFindingSource,
  LabCorrelationStrength,
} from '../../types/labMedicationCorrelation'

const STRENGTH_KEYS: Record<LabCorrelationStrength, UiTranslationKey> = {
  none: 'labMedCorrStrengthNone',
  possible: 'labMedCorrStrengthPossible',
  plausible: 'labMedCorrStrengthPlausible',
  monitoring_required: 'labMedCorrStrengthMonitoring',
  concerning: 'labMedCorrStrengthConcerning',
}

const SOURCE_KEYS: Record<LabCorrelationFindingSource, UiTranslationKey> = {
  knowledge_base: 'clinSourceKnowledgeBase',
  ai_suggestion: 'clinSourceAiSuggestion',
  clinician_accepted: 'clinSourceClinicianAccepted',
}

const STATUS_KEYS: Record<PatientMedicationLabCorrelationFinding['status'], UiTranslationKey> = {
  verified_kb: 'labMedCorrStatusVerifiedKb',
  pending_clinician_review: 'labMedCorrStatusPending',
  accepted: 'labMedCorrStatusAccepted',
  rejected: 'labMedCorrStatusRejected',
  not_relevant: 'labMedCorrStatusNotRelevant',
}

const ABNORMALITY_KEYS: Record<PatientMedicationLabCorrelationFinding['abnormality'], UiTranslationKey> = {
  high: 'labMedCorrAbnHigh',
  low: 'labMedCorrAbnLow',
  critical: 'labMedCorrAbnCritical',
  normal: 'labMedCorrAbnNormal',
  normal_but_changed: 'labMedCorrAbnChanged',
  unknown: 'labMedCorrAbnUnknown',
}

interface LabMedicationCorrelationPanelProps {
  caseId: string
  medications: MedicationEntry[]
  state: MedicationPlanState
  disabled?: boolean
  onLabNotesChange?: (notes: string) => void
  language?: UiLanguage
}

function TruncatedText({
  text,
  maxLength = 120,
  className,
}: {
  text: string
  maxLength?: number
  className?: string
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  if (!text) return null
  if (text.length <= maxLength) {
    return <span className={className}>{text}</span>
  }
  return (
    <span className={className}>
      {expanded ? text : `${text.slice(0, maxLength)}…`}{' '}
      <button
        type="button"
        className="lab-med-correlation__mehr"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setExpanded((v) => !v)
        }}
      >
        {expanded ? t('labMedCorrLess') : t('labMedCorrMore')}
      </button>
    </span>
  )
}

function AiReviewBlock({
  finding,
  disabled,
  onAccept,
  onReject,
  onEditAccept,
}: {
  finding: PatientMedicationLabCorrelationFinding
  disabled?: boolean
  onAccept: (note?: string) => void
  onReject: (note?: string) => void
  onEditAccept: (edited: LabCorrelationAIResult, note?: string) => void
}) {
  const { t } = useTranslation()
  const [note, setNote] = useState(finding.clinicianNote ?? '')
  const [editing, setEditing] = useState(false)
  const pendingResult = finding.openaiResult ?? finding.aiResult
  const [draft, setDraft] = useState<LabCorrelationAIResult | null>(pendingResult ?? null)

  if (!pendingResult) return null

  const showComparison = finding.deepseekRejected && finding.openaiResult && finding.aiResult

  return (
    <div className="combination-check__ai-review lab-med-correlation__ai-review">
      <p className="combination-check__ai-warning">
        {t('labMedCorrAiWarning')}
      </p>
      {finding.hasConflict ? (
        <p className="combination-check__conflict">
          {t('labMedCorrConflict')}
        </p>
      ) : null}

      {showComparison ? (
        <div className="lab-med-correlation__comparison">
          <div className="lab-med-correlation__comparison-col">
            <h6>{t('labMedCorrDeepseekRejected')}</h6>
            <p>{finding.aiResult?.zusammenhang}</p>
            <p>
              <em>{finding.aiResult?.recommendation}</em>
            </p>
          </div>
          <div className="lab-med-correlation__comparison-col lab-med-correlation__comparison-col--pending">
            <h6>{t('labMedCorrOpenaiPending')}</h6>
            <p>{finding.openaiResult?.zusammenhang}</p>
            <p>
              <em>{finding.openaiResult?.recommendation}</em>
            </p>
          </div>
        </div>
      ) : null}

      {editing && draft ? (
        <div className="combination-check__edit">
          <label>
            {t('labMedCorrCorrelationLabel')}
            <textarea
              value={draft.zusammenhang}
              onChange={(e) => setDraft({ ...draft, zusammenhang: e.target.value })}
              rows={2}
              disabled={disabled}
            />
          </label>
          <label>
            {t('labMedCorrRecommendationLabel')}
            <textarea
              value={draft.recommendation}
              onChange={(e) => setDraft({ ...draft, recommendation: e.target.value })}
              rows={2}
              disabled={disabled}
            />
          </label>
        </div>
      ) : null}

      <div className="combination-check__actions">
        <button type="button" disabled={disabled} onClick={() => onAccept(note || undefined)}>
          {t('clinReviewAccept')}
        </button>
        <button type="button" disabled={disabled} onClick={() => onReject(note || undefined)}>
          {t('clinReviewReject')}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (editing && draft) {
              onEditAccept(draft, note || undefined)
              setEditing(false)
            } else {
              setEditing(true)
            }
          }}
        >
          {editing ? t('clinReviewSaveEditAccept') : t('clinReviewEditAccept')}
        </button>
      </div>
      <label className="combination-check__note-field">
        {t('clinReviewNoteAdd')}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          disabled={disabled}
          placeholder={t('clinReviewNotePlaceholder')}
        />
      </label>
    </div>
  )
}

function FindingRow({
  finding,
  disabled,
  onNote,
  onRelevance,
  onAccept,
  onReject,
  onEditAccept,
}: {
  finding: PatientMedicationLabCorrelationFinding
  disabled?: boolean
  onNote: (note: string) => void
  onRelevance: (relevant: boolean) => void
  onAccept: (note?: string) => void
  onReject: (note?: string) => void
  onEditAccept: (edited: LabCorrelationAIResult, note?: string) => void
}) {
  const { t } = useTranslation()
  const [noteDraft, setNoteDraft] = useState(finding.clinicianNote ?? '')

  return (
    <details className="lab-med-correlation__row" open={finding.status === 'pending_clinician_review'}>
      <summary className="lab-med-correlation__summary">
        <span className="lab-med-correlation__param">
          <span className="lab-med-correlation__param-label">{finding.labParameterLabel}</span>
          <span className="lab-med-correlation__value-ref">{formatValueRef(finding)}</span>
        </span>
        <span className={`lab-med-correlation__strength ${strengthClass(finding.correlationStrength)}`}>
          {t(STRENGTH_KEYS[finding.correlationStrength])}
        </span>
        <span className="combination-check__source">{t(SOURCE_KEYS[finding.source])}</span>
        <span className="combination-check__expand-hint" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="combination-check__details">
        <p>
          <strong>{t('labMedCorrAbnormalityInline')}</strong> {t(ABNORMALITY_KEYS[finding.abnormality])}
          {' · '}
          <strong>{t('labMedCorrMedicationInline')}</strong> {finding.substanceName}
          {' · '}
          <strong>{t('labMedCorrStatusInline')}</strong> {t(STATUS_KEYS[finding.status])}
        </p>
        <p>
          <strong>{t('labMedCorrCorrelationInline')}</strong>{' '}
          <TruncatedText text={finding.zusammenhang} maxLength={140} />
        </p>
        <p>
          <strong>{t('labMedCorrRecommendationInline')}</strong>{' '}
          <TruncatedText text={finding.recommendation} maxLength={100} />
        </p>

        {finding.mechanism ? (
          <p>
            <strong>{t('clinLabelMechanism')}</strong> {finding.mechanism}
          </p>
        ) : null}
        {finding.monitoring ? (
          <p>
            <strong>{t('clinLabelMonitoring')}</strong> {finding.monitoring}
          </p>
        ) : null}
        {finding.alternatives ? (
          <p>
            <strong>{t('labMedCorrAlternativesInline')}</strong> {finding.alternatives}
          </p>
        ) : null}
        {finding.temporalPlausibility ? (
          <p>
            <strong>{t('labMedCorrTemporalInline')}</strong> {finding.temporalPlausibility}
            {finding.medStartDate ? ` · ${t('labMedCorrTherapyStart')} ${finding.medStartDate}` : ''}
            {finding.lastDoseChangeDate ? ` · ${t('labMedCorrLastChange')} ${finding.lastDoseChangeDate}` : ''}
            {finding.labDate ? ` · ${t('labMedCorrLab')} ${finding.labDate}` : ''}
            {finding.trend ? ` · ${t('labMedCorrTrend')} ${finding.trend}` : ''}
          </p>
        ) : null}
        {finding.provenance ? (
          <p>
            <strong>{t('labMedCorrProvenanceInline')}</strong> {finding.provenance}
          </p>
        ) : null}

        {finding.status === 'pending_clinician_review' ? (
          <AiReviewBlock
            finding={finding}
            disabled={disabled}
            onAccept={onAccept}
            onReject={onReject}
            onEditAccept={onEditAccept}
          />
        ) : (
          <div className="combination-check__kb-actions">
            <label className="combination-check__note-field">
              {t('clinReviewNote')}
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onBlur={() => onNote(noteDraft)}
                rows={2}
                disabled={disabled}
              />
            </label>
            <div className="combination-check__relevance">
              <button type="button" disabled={disabled} onClick={() => onRelevance(true)}>
                {t('clinReviewRelevant')}
              </button>
              <button type="button" disabled={disabled} onClick={() => onRelevance(false)}>
                {t('clinReviewNotRelevant')}
              </button>
            </div>
          </div>
        )}
      </div>
    </details>
  )
}

function FullViewModal({
  findings,
  onClose,
  onPrint,
  onExport,
}: {
  findings: PatientMedicationLabCorrelationFinding[]
  onClose: () => void
  onPrint: () => void
  onExport: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      className="therapy-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lab-med-fullview-title"
      onClick={onClose}
    >
      <div className="therapy-modal therapy-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="therapy-modal__head">
          <div className="therapy-modal__heading">
            <h4 className="therapy-modal__title" id="lab-med-fullview-title">
              {t('labMedCorrFullViewTitle')}
            </h4>
          </div>
          <button type="button" className="therapy-modal__close" onClick={onClose} aria-label={t('labMedCorrClose')}>
            ×
          </button>
        </div>
        <div className="therapy-modal__body lab-med-correlation__modal-body">
          <div className="lab-med-correlation__full-table-wrap">
            <table className="lab-med-correlation__full-table">
              <thead>
                <tr>
                  <th>{t('labMedCorrColLabParam')}</th>
                  <th>{t('labMedCorrColValueRef')}</th>
                  <th>{t('labMedCorrColAbnormality')}</th>
                  <th>{t('labMedCorrColMedication')}</th>
                  <th>{t('labMedCorrColStrength')}</th>
                  <th>{t('labMedCorrColCorrelation')}</th>
                  <th>{t('labMedCorrColRecommendation')}</th>
                  <th>{t('labMedCorrColSource')}</th>
                  <th>{t('labMedCorrColStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((finding) => (
                  <tr key={finding.id}>
                    <td>{finding.labParameterLabel}</td>
                    <td>{formatValueRef(finding)}</td>
                    <td>{t(ABNORMALITY_KEYS[finding.abnormality])}</td>
                    <td>{finding.substanceName}</td>
                    <td>
                      <span className={`lab-med-correlation__strength ${strengthClass(finding.correlationStrength)}`}>
                        {t(STRENGTH_KEYS[finding.correlationStrength])}
                      </span>
                    </td>
                    <td>{finding.zusammenhang}</td>
                    <td>{finding.recommendation}</td>
                    <td>{t(SOURCE_KEYS[finding.source])}</td>
                    <td>{t(STATUS_KEYS[finding.status])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="therapy-modal__footer lab-med-correlation__modal-footer">
          <span className="lab-med-correlation__modal-count">{findings.length} {t('labMedCorrFindingsCount')}</span>
          <div className="lab-med-correlation__modal-actions">
            <button type="button" className="lab-med-correlation__action-btn" onClick={onExport}>
              {t('labMedCorrExportCsv')}
            </button>
            <button type="button" className="lab-med-correlation__action-btn" onClick={onPrint}>
              {t('labMedCorrPrint')}
            </button>
            <button type="button" className="lab-med-correlation__action-btn" onClick={onClose}>
              {t('labMedCorrClose')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LabMedicationCorrelationPanel({
  caseId,
  medications,
  state,
  disabled = false,
  onLabNotesChange,
  language,
}: LabMedicationCorrelationPanelProps) {
  const { t } = useTranslation()
  const correlation = useLabMedicationCorrelation(caseId, medications, state, language)
  const [fullViewOpen, setFullViewOpen] = useState(false)

  const printContext = {
    caseId,
    findings: correlation.visibleFindings,
    medications,
    clinicalNotes: state.labCorrelationNotes,
    labSnapshotCount: correlation.lastTwoLabSnapshots.length,
    labObservationCount: correlation.labObservations.length,
  }

  const handlePrint = () => printLabMedCorrelation(printContext)
  const handleExport = () => exportLabMedCorrelationCsv(printContext)

  const hasFindings = correlation.visibleFindings.length > 0

  return (
    <div className="lab-med-correlation combination-check">
      <div className="combination-check__toolbar">
        <button
          type="button"
          className="combination-check__run-btn"
          disabled={disabled || !correlation.canRun || correlation.running}
          onClick={() => void correlation.runCorrelation()}
        >
          {correlation.running ? t('labMedCorrRunning') : t('labMedCorrRun')}
        </button>
        {hasFindings ? (
          <div className="lab-med-correlation__header-actions">
            <button
              type="button"
              className="lab-med-correlation__action-btn"
              onClick={() => setFullViewOpen(true)}
              title={t('labMedCorrFullViewBtnTitle')}
            >
              {t('labMedCorrFullViewBtn')}
            </button>
            <button
              type="button"
              className="lab-med-correlation__action-btn"
              onClick={handleExport}
              title={t('labMedCorrExportTitle')}
            >
              {t('labMedCorrExport')}
            </button>
            <button
              type="button"
              className="lab-med-correlation__action-btn"
              onClick={handlePrint}
              title={t('labMedCorrPrintTitle')}
            >
              {t('labMedCorrPrint')}
            </button>
          </div>
        ) : null}
        {!correlation.canRun ? (
          <p className="combination-check__hint">
            {t('labMedCorrNeedData')}
          </p>
        ) : (
          <p className="combination-check__hint">
            {correlation.lastTwoLabSnapshots.length}{' '}
            {correlation.lastTwoLabSnapshots.length === 1
              ? t('labMedCorrHintResultSingular')
              : t('labMedCorrHintResultPlural')}{' '}
            ·{' '}
            {correlation.labObservations.length} {t('labMedCorrHintAbnormalParams')} ·{' '}
            {medications.filter((m) => m.status === 'active' || m.status === 'reduced' || m.status === 'increased').length}{' '}
            {t('labMedCorrHintActiveMeds')}
          </p>
        )}
      </div>

      {onLabNotesChange ? (
        <label className="lab-med-correlation__notes-field">
          {t('labMedCorrNotesLabel')}
          <textarea
            className="therapy-textarea"
            value={state.labCorrelationNotes ?? ''}
            onChange={(e) => onLabNotesChange(e.target.value)}
            placeholder={t('labMedCorrNotesPlaceholder')}
            disabled={disabled}
            rows={2}
          />
        </label>
      ) : state.labCorrelationNotes ? (
        <p className="lab-med-correlation__notes">
          <strong>{t('labMedCorrNotesInline')}</strong> {state.labCorrelationNotes}
        </p>
      ) : null}

      {correlation.infoNote ? (
        <p className="combination-check__status">{correlation.infoNote}</p>
      ) : null}

      {correlation.error ? <p className="combination-check__error">{correlation.error}</p> : null}

      {correlation.visibleFindings.length === 0 && !correlation.running ? (
        <p className="combination-check__empty">
          {correlation.canRun
            ? t('labMedCorrEmptyCanRun')
            : t('labMedCorrEmptyNoData')}
        </p>
      ) : null}

      {correlation.pendingAiRuns.length > 0 ? (
        <p className="combination-check__status">{t('clinReviewAiSuggestionPending')}</p>
      ) : null}

      {hasFindings ? (
        <div className="lab-med-correlation__compact-list">
          <div className="lab-med-correlation__compact-header" aria-hidden="true">
            <span>{t('labMedCorrColLabParam')}</span>
            <span>{t('labMedCorrColStrengthCompact')}</span>
            <span>{t('labMedCorrColSource')}</span>
            <span />
          </div>
          {correlation.visibleFindings.map((finding) => (
            <FindingRow
              key={finding.id}
              finding={finding}
              disabled={disabled}
              onNote={(note) => correlation.updateFindingNote(finding.id, note)}
              onRelevance={(relevant) => correlation.markRelevance(finding.id, relevant)}
              onAccept={(note) => void correlation.acceptFinding(finding.id, { clinicianNote: note })}
              onReject={(note) => void correlation.rejectFinding(finding.id, { clinicianNote: note })}
              onEditAccept={(edited, note) =>
                void correlation.acceptFinding(finding.id, { clinicianNote: note, editedResult: edited })
              }
            />
          ))}
        </div>
      ) : null}

      {fullViewOpen ? (
        <FullViewModal
          findings={correlation.visibleFindings}
          onClose={() => setFullViewOpen(false)}
          onPrint={handlePrint}
          onExport={handleExport}
        />
      ) : null}

      <p className="combination-check__disclaimer">
        {t('labMedCorrDisclaimer')}
      </p>
    </div>
  )
}

// Deferred (not MVP): full longitudinal trends, cumulative burden clusters, auto-run on all events.
