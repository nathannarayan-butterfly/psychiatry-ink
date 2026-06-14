import { useState } from 'react'
import type { MedicationEntry, MedicationPlanState } from '../../types/medicationPlan'
import type {
  LabCorrelationAIResult,
  PatientMedicationLabCorrelationFinding,
} from '../../types/labMedicationCorrelation'
import { useLabMedicationCorrelation } from '../../hooks/useLabMedicationCorrelation'
import type { UiLanguage } from '../../types/settings'
import {
  ABNORMALITY_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
  STRENGTH_LABELS,
  formatValueRef,
  strengthClass,
} from '../../utils/labMedicationCorrelation/labMedCorrelationLabels'
import {
  exportLabMedCorrelationCsv,
  printLabMedCorrelation,
} from '../../utils/labMedicationCorrelation/printLabMedCorrelation'

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
        {expanded ? 'weniger' : 'mehr'}
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
  onOpenAiSecondOpinion,
}: {
  finding: PatientMedicationLabCorrelationFinding
  disabled?: boolean
  onAccept: (note?: string) => void
  onReject: (note?: string) => void
  onEditAccept: (edited: LabCorrelationAIResult, note?: string) => void
  onOpenAiSecondOpinion?: () => void
}) {
  const [note, setNote] = useState(finding.clinicianNote ?? '')
  const [editing, setEditing] = useState(false)
  const pendingResult = finding.openaiResult ?? finding.aiResult
  const [draft, setDraft] = useState<LabCorrelationAIResult | null>(pendingResult ?? null)

  if (!pendingResult) return null

  const showComparison = finding.deepseekRejected && finding.openaiResult && finding.aiResult

  return (
    <div className="combination-check__ai-review lab-med-correlation__ai-review">
      <p className="combination-check__ai-warning">
        Dieser Befund wurde KI-generiert und ist nicht Teil der geprüften Wissensdatenbank. Bitte
        klinisch prüfen, bevor er als verifiziert gilt. Formulierungen wie „möglich“ oder „zeitlich
        plausibel“ ersetzen keine klinische Beurteilung — Kausalität ist nicht gesichert.
      </p>
      {finding.hasConflict ? (
        <p className="combination-check__conflict">
          Konflikt zwischen Wissensdatenbank und KI — bei Widerspruch wird der verifizierte KB-Eintrag
          bevorzugt.
        </p>
      ) : null}

      {showComparison ? (
        <div className="lab-med-correlation__comparison">
          <div className="lab-med-correlation__comparison-col">
            <h6>DeepSeek (verworfen)</h6>
            <p>{finding.aiResult?.zusammenhang}</p>
            <p>
              <em>{finding.aiResult?.recommendation}</em>
            </p>
          </div>
          <div className="lab-med-correlation__comparison-col lab-med-correlation__comparison-col--pending">
            <h6>OpenAI-Zweitprüfung (ausstehend)</h6>
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
            Zusammenhang
            <textarea
              value={draft.zusammenhang}
              onChange={(e) => setDraft({ ...draft, zusammenhang: e.target.value })}
              rows={2}
              disabled={disabled}
            />
          </label>
          <label>
            Empfehlung
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
          Akzeptieren
        </button>
        <button type="button" disabled={disabled} onClick={() => onReject(note || undefined)}>
          Verwerfen
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
          {editing ? 'Bearbeitung speichern & akzeptieren' : 'Bearbeiten & Akzeptieren'}
        </button>
        {finding.deepseekRejected && !finding.openaiRunId && onOpenAiSecondOpinion ? (
          <button type="button" disabled={disabled} onClick={() => onOpenAiSecondOpinion()}>
            OpenAI-Zweitprüfung starten
          </button>
        ) : null}
      </div>
      <label className="combination-check__note-field">
        Anmerkung hinzufügen
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          disabled={disabled}
          placeholder="Klinische Anmerkung…"
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
  onOpenAiSecondOpinion,
}: {
  finding: PatientMedicationLabCorrelationFinding
  disabled?: boolean
  onNote: (note: string) => void
  onRelevance: (relevant: boolean) => void
  onAccept: (note?: string) => void
  onReject: (note?: string) => void
  onEditAccept: (edited: LabCorrelationAIResult, note?: string) => void
  onOpenAiSecondOpinion?: () => void
}) {
  const [noteDraft, setNoteDraft] = useState(finding.clinicianNote ?? '')

  return (
    <details className="lab-med-correlation__row" open={finding.status === 'pending_clinician_review'}>
      <summary className="lab-med-correlation__summary">
        <span className="lab-med-correlation__param">
          <span className="lab-med-correlation__param-label">{finding.labParameterLabel}</span>
          <span className="lab-med-correlation__value-ref">{formatValueRef(finding)}</span>
        </span>
        <span className={`lab-med-correlation__strength ${strengthClass(finding.correlationStrength)}`}>
          {STRENGTH_LABELS[finding.correlationStrength]}
        </span>
        <span className="combination-check__source">{SOURCE_LABELS[finding.source]}</span>
        <span className="combination-check__expand-hint" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="combination-check__details">
        <p>
          <strong>Auffälligkeit:</strong> {ABNORMALITY_LABELS[finding.abnormality]}
          {' · '}
          <strong>Medikament:</strong> {finding.substanceName}
          {' · '}
          <strong>Status:</strong> {STATUS_LABELS[finding.status]}
        </p>
        <p>
          <strong>Zusammenhang:</strong>{' '}
          <TruncatedText text={finding.zusammenhang} maxLength={140} />
        </p>
        <p>
          <strong>Empfehlung:</strong>{' '}
          <TruncatedText text={finding.recommendation} maxLength={100} />
        </p>

        {finding.mechanism ? (
          <p>
            <strong>Mechanismus:</strong> {finding.mechanism}
          </p>
        ) : null}
        {finding.monitoring ? (
          <p>
            <strong>Monitoring:</strong> {finding.monitoring}
          </p>
        ) : null}
        {finding.alternatives ? (
          <p>
            <strong>Alternativen:</strong> {finding.alternatives}
          </p>
        ) : null}
        {finding.temporalPlausibility ? (
          <p>
            <strong>Zeitlicher Bezug:</strong> {finding.temporalPlausibility}
            {finding.medStartDate ? ` · Therapiebeginn ${finding.medStartDate}` : ''}
            {finding.lastDoseChangeDate ? ` · Letzte Änderung ${finding.lastDoseChangeDate}` : ''}
            {finding.labDate ? ` · Labor ${finding.labDate}` : ''}
            {finding.trend ? ` · Trend ${finding.trend}` : ''}
          </p>
        ) : null}
        {finding.provenance ? (
          <p>
            <strong>Provenienz:</strong> {finding.provenance}
          </p>
        ) : null}

        {finding.status === 'pending_clinician_review' ? (
          <AiReviewBlock
            finding={finding}
            disabled={disabled}
            onAccept={onAccept}
            onReject={onReject}
            onEditAccept={onEditAccept}
            onOpenAiSecondOpinion={onOpenAiSecondOpinion}
          />
        ) : finding.status === 'rejected' && finding.deepseekRejected && !finding.openaiRunId ? (
          <div className="lab-med-correlation__second-opinion">
            <p>DeepSeek-Vorschlag verworfen — optional OpenAI-Zweitprüfung anfordern.</p>
            <button type="button" disabled={disabled} onClick={() => onOpenAiSecondOpinion?.()}>
              OpenAI-Zweitprüfung starten
            </button>
          </div>
        ) : (
          <div className="combination-check__kb-actions">
            <label className="combination-check__note-field">
              Anmerkung
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
                Relevant
              </button>
              <button type="button" disabled={disabled} onClick={() => onRelevance(false)}>
                Nicht relevant
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
              Labor-Medikament-Korrelation — Vollansicht
            </h4>
          </div>
          <button type="button" className="therapy-modal__close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="therapy-modal__body lab-med-correlation__modal-body">
          <div className="lab-med-correlation__full-table-wrap">
            <table className="lab-med-correlation__full-table">
              <thead>
                <tr>
                  <th>Laborparameter</th>
                  <th>Wert/Referenz</th>
                  <th>Auffälligkeit</th>
                  <th>Medikament</th>
                  <th>Stärke</th>
                  <th>Zusammenhang</th>
                  <th>Empfehlung</th>
                  <th>Quelle</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((finding) => (
                  <tr key={finding.id}>
                    <td>{finding.labParameterLabel}</td>
                    <td>{formatValueRef(finding)}</td>
                    <td>{ABNORMALITY_LABELS[finding.abnormality]}</td>
                    <td>{finding.substanceName}</td>
                    <td>
                      <span className={`lab-med-correlation__strength ${strengthClass(finding.correlationStrength)}`}>
                        {STRENGTH_LABELS[finding.correlationStrength]}
                      </span>
                    </td>
                    <td>{finding.zusammenhang}</td>
                    <td>{finding.recommendation}</td>
                    <td>{SOURCE_LABELS[finding.source]}</td>
                    <td>{STATUS_LABELS[finding.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="therapy-modal__footer lab-med-correlation__modal-footer">
          <span className="lab-med-correlation__modal-count">{findings.length} Befunde</span>
          <div className="lab-med-correlation__modal-actions">
            <button type="button" className="lab-med-correlation__action-btn" onClick={onExport}>
              Exportieren (CSV)
            </button>
            <button type="button" className="lab-med-correlation__action-btn" onClick={onPrint}>
              Drucken
            </button>
            <button type="button" className="lab-med-correlation__action-btn" onClick={onClose}>
              Schließen
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
          {correlation.running ? 'Korrelation wird erstellt…' : 'Korrelation prüfen'}
        </button>
        {hasFindings ? (
          <div className="lab-med-correlation__header-actions">
            <button
              type="button"
              className="lab-med-correlation__action-btn"
              onClick={() => setFullViewOpen(true)}
              title="Alle Befunde in breiter Ansicht"
            >
              Vollansicht
            </button>
            <button
              type="button"
              className="lab-med-correlation__action-btn"
              onClick={handleExport}
              title="Als CSV exportieren"
            >
              Export
            </button>
            <button
              type="button"
              className="lab-med-correlation__action-btn"
              onClick={handlePrint}
              title="Drucken"
            >
              Drucken
            </button>
          </div>
        ) : null}
        {!correlation.canRun ? (
          <p className="combination-check__hint">
            Mindestens ein aktives Medikament und Laborbefunde erforderlich.
          </p>
        ) : (
          <p className="combination-check__hint">
            {correlation.lastTwoLabSnapshots.length} Laborresultat
            {correlation.lastTwoLabSnapshots.length === 1 ? '' : 'e'} ·{' '}
            {correlation.labObservations.length} auffällige Parameter ·{' '}
            {medications.filter((m) => m.status === 'active' || m.status === 'reduced' || m.status === 'increased').length}{' '}
            aktive Medikamente
          </p>
        )}
      </div>

      {onLabNotesChange ? (
        <label className="lab-med-correlation__notes-field">
          Klinische Notizen (optional)
          <textarea
            className="therapy-textarea"
            value={state.labCorrelationNotes ?? ''}
            onChange={(e) => onLabNotesChange(e.target.value)}
            placeholder="z. B. Nierenfunktion bei Lithium, Leberwerte bei Valproat…"
            disabled={disabled}
            rows={2}
          />
        </label>
      ) : state.labCorrelationNotes ? (
        <p className="lab-med-correlation__notes">
          <strong>Klinische Notizen:</strong> {state.labCorrelationNotes}
        </p>
      ) : null}

      {correlation.infoNote ? (
        <p className="combination-check__status">{correlation.infoNote}</p>
      ) : null}

      {correlation.error ? <p className="combination-check__error">{correlation.error}</p> : null}

      {correlation.visibleFindings.length === 0 && !correlation.running ? (
        <p className="combination-check__empty">
          {correlation.canRun
            ? 'Noch keine Labor-Medikament-Korrelation durchgeführt.'
            : 'Keine Daten für die Korrelationsprüfung.'}
        </p>
      ) : null}

      {correlation.pendingAiRuns.length > 0 ? (
        <p className="combination-check__status">KI-Vorschlag vorhanden — bitte prüfen.</p>
      ) : null}

      {hasFindings ? (
        <div className="lab-med-correlation__compact-list">
          <div className="lab-med-correlation__compact-header" aria-hidden="true">
            <span>Laborparameter</span>
            <span>Stärke</span>
            <span>Quelle</span>
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
              onOpenAiSecondOpinion={() => void correlation.startOpenAiSecondOpinion(finding.id)}
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
        Labor-Medikament-Korrelation (MVP): paarweise Prüfung auffälliger Laborwerte gegen aktive
        Medikamente. KI-Befunde erst nach expliziter Akzeptanz klinisch verbindlich. Keine automatische
        Änderung des Medikationsplans oder Arztbriefs. Longitudinale Trends, Kumulativlast und
        Auto-Trigger — geplant, nicht enthalten.
      </p>
    </div>
  )
}

// Deferred (not MVP): full longitudinal trends, cumulative burden clusters, auto-run on all events.
