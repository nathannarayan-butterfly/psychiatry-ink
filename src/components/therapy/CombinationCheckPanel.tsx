import { useEffect, useState } from 'react'
import type { MedicationEntry, MedicationPlanState } from '../../types/medicationPlan'
import type {
  CombinationCheckAIResult,
  CombinationFindingSource,
  CombinationSeverity,
  PatientCombinationCheckFinding,
} from '../../types/combinationCheck'
import { useCombinationCheck, formatNoneCombinationSummary } from '../../hooks/useCombinationCheck'
import { InteractionMatrix } from '../medication/InteractionMatrix'
import type { InteractionEntry } from '../../data/psychDrugReference/schema'
import { getDrugsForSubstance } from '../../data/psychDrugReference/index'
import type { UiLanguage } from '../../types/settings'

interface CombinationCheckPanelProps {
  caseId: string
  medications: MedicationEntry[]
  state: MedicationPlanState
  disabled?: boolean
  language: UiLanguage
}

const SEVERITY_LABELS: Record<CombinationSeverity, string> = {
  none: 'Keine',
  low: 'Niedrig',
  moderate: 'Moderat',
  high: 'Hoch',
  critical: 'Kritisch',
}

const SOURCE_LABELS: Record<CombinationFindingSource, string> = {
  knowledge_base: 'Wissensdatenbank',
  ai_suggestion: 'KI-Vorschlag',
  clinician_accepted: 'Ärztlich akzeptiert',
}

function severityClass(severity: CombinationSeverity): string {
  return `combination-check__severity--${severity}`
}

function buildLegacyCrossInteractions(activeMeds: MedicationEntry[]) {
  const referenceEntries = activeMeds.map((med) => ({
    med,
    drugs: getDrugsForSubstance(med.substance),
  }))
  const coveredMeds = referenceEntries.filter((entry) => entry.drugs.length > 0)
  const crossInteractions: {
    drugA: string
    drugB: string
    interaction: InteractionEntry
  }[] = []

  for (let i = 0; i < coveredMeds.length; i++) {
    const entryA = coveredMeds[i]!
    for (let j = i + 1; j < coveredMeds.length; j++) {
      const entryB = coveredMeds[j]!
      for (const drugA of entryA.drugs) {
        for (const interaction of drugA.interactions) {
          const matchesBName = entryB.drugs.some((drugB) => {
            const target = interaction.interactsWith.toLowerCase()
            const generic = drugB.genericName.toLowerCase()
            const brands = drugB.brandNamesDACH?.map((b) => b.toLowerCase()) ?? []
            return target.includes(generic) || generic.includes(target) || brands.some((b) => target.includes(b))
          })
          if (matchesBName) {
            crossInteractions.push({
              drugA: drugA.genericName,
              drugB: entryB.med.substance,
              interaction,
            })
          }
        }
      }
    }
  }
  return crossInteractions
}

function AiReviewCard({
  finding,
  onAccept,
  onReject,
  onEditAccept,
  disabled,
}: {
  finding: PatientCombinationCheckFinding
  onAccept: (note?: string) => void
  onReject: (note?: string, thorough?: boolean) => void
  onEditAccept: (edited: CombinationCheckAIResult, note?: string) => void
  disabled?: boolean
}) {
  const [note, setNote] = useState(finding.clinicianNote ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<CombinationCheckAIResult | null>(finding.aiResult ?? null)

  useEffect(() => {
    setNote(finding.clinicianNote ?? '')
  }, [finding.id, finding.clinicianNote])

  useEffect(() => {
    setDraft(finding.aiResult ?? null)
    setEditing(false)
  }, [finding.id, finding.aiResult])

  if (!finding.aiResult || !finding.aiRunId) return null

  return (
    <div className="combination-check__ai-review">
      <p className="combination-check__ai-warning">
        KI-generiert — nicht in der Wissensdatenbank. Bitte klinisch prüfen.
      </p>
      {finding.hasConflict ? (
        <p className="combination-check__conflict">
          Konflikt zwischen Wissensdatenbank und KI — KB-Eintrag wird bevorzugt.
        </p>
      ) : null}
      {editing && draft ? (
        <div className="combination-check__edit">
          <label>
            Hauptrisiko
            <textarea
              value={draft.mainRisk}
              onChange={(e) => setDraft({ ...draft, mainRisk: e.target.value })}
              rows={2}
              disabled={disabled}
            />
          </label>
          <label>
            Monitoring
            <textarea
              value={draft.monitoring ?? ''}
              onChange={(e) => setDraft({ ...draft, monitoring: e.target.value })}
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
          {editing ? 'Speichern & akzeptieren' : 'Bearbeiten & akzeptieren'}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onReject(note || undefined, true)}
          title="Nach Verwerfen erneut mit gründlicherer KI-Analyse"
        >
          Gründlich prüfen
        </button>
      </div>
      <label className="combination-check__note-field">
        Anmerkung
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
}: {
  finding: PatientCombinationCheckFinding
  disabled?: boolean
  onNote: (note: string) => void
  onRelevance: (relevant: boolean) => void
  onAccept: (note?: string) => void
  onReject: (note?: string, thorough?: boolean) => void
  onEditAccept: (edited: CombinationCheckAIResult, note?: string) => void
}) {
  const [noteDraft, setNoteDraft] = useState(finding.clinicianNote ?? '')

  useEffect(() => {
    setNoteDraft(finding.clinicianNote ?? '')
  }, [finding.id, finding.clinicianNote])

  return (
    <details className="combination-check__row" open={finding.status === 'pending_clinician_review'}>
      <summary className="combination-check__summary">
        <span className="combination-check__pair">
          {finding.substanceAName} + {finding.substanceBName}
        </span>
        <span className={`combination-check__severity ${severityClass(finding.severity)}`}>
          {SEVERITY_LABELS[finding.severity]}
        </span>
        <span className="combination-check__source">{SOURCE_LABELS[finding.source]}</span>
        <span className="combination-check__expand-hint" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="combination-check__details">
        {finding.mainRisk ? (
          <p>
            <strong>Hauptrisiko:</strong> {finding.mainRisk}
          </p>
        ) : null}
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
        {finding.clinicalManagement ? (
          <p>
            <strong>Management:</strong> {finding.clinicalManagement}
          </p>
        ) : null}
        {finding.provenance ? (
          <p>
            <strong>Quelle:</strong> {finding.provenance}
          </p>
        ) : null}
        {finding.status === 'pending_clinician_review' ? (
          <AiReviewCard
            finding={finding}
            disabled={disabled}
            onAccept={onAccept}
            onReject={(note, thorough) => onReject(note, thorough)}
            onEditAccept={onEditAccept}
          />
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

export function CombinationCheckPanel({
  caseId,
  medications,
  state,
  disabled = false,
  language,
}: CombinationCheckPanelProps) {
  const check = useCombinationCheck(caseId, medications, state, language)
  const activeMeds = medications.filter(
    (m) => m.status === 'active' || m.status === 'reduced' || m.status === 'increased',
  )
  const crossInteractions = buildLegacyCrossInteractions(activeMeds)
  const noneSummary =
    check.noneFindings.length > 0 ? formatNoneCombinationSummary(check.noneFindings, language) : ''
  const hasSignificant = check.significantFindings.length > 0

  return (
    <div className="combination-check">
      <div className="combination-check__toolbar">
        <button
          type="button"
          className="combination-check__run-btn"
          disabled={disabled || !check.canRun || check.running}
          onClick={() => void check.runCheck()}
        >
          {check.running ? 'KI wird erstellt…' : 'Kombinationscheck starten'}
        </button>
        {!check.canRun ? (
          <p className="combination-check__hint">Mindestens zwei aktive Medikamente erforderlich.</p>
        ) : null}
      </div>

      {check.error ? <p className="combination-check__error">{check.error}</p> : null}

      {activeMeds.length >= 2 ? (
        <InteractionMatrix
          activeMeds={activeMeds}
          crossInteractions={crossInteractions}
          findings={check.visibleFindings}
          language={language}
        />
      ) : null}

      {check.visibleFindings.length === 0 && !check.running ? (
        <p className="combination-check__empty">
          {check.canRun
            ? 'Noch kein Kombinationscheck durchgeführt.'
            : 'Keine aktiven Medikamentenpaare für den Check.'}
        </p>
      ) : null}

      {check.pendingAiRuns.length > 0 ? (
        <p className="combination-check__status">KI-Vorschlag vorhanden — bitte prüfen.</p>
      ) : null}

      {noneSummary ? <p className="combination-check__none-summary">{noneSummary}</p> : null}

      {hasSignificant ? (
        <div className="combination-check__compact-list">
          <div className="combination-check__compact-header" aria-hidden="true">
            <span>Kombination</span>
            <span>Schweregrad</span>
            <span>Quelle</span>
            <span />
          </div>
          {check.significantFindings.map((finding) => (
            <FindingRow
              key={finding.id}
              finding={finding}
              disabled={disabled}
              onNote={(note) => check.updateFindingNote(finding.id, note)}
              onRelevance={(relevant) => check.markRelevance(finding.id, relevant)}
              onAccept={(note) => finding.aiRunId && void check.acceptAi(finding.aiRunId, { clinicianNote: note })}
              onReject={(note, thorough) =>
                finding.aiRunId &&
                void check.rejectAi(finding.aiRunId, {
                  clinicianNote: note,
                  reRunThorough: thorough,
                  combinationKey: finding.combinationKey,
                })
              }
              onEditAccept={(edited, note) =>
                finding.aiRunId &&
                void check.acceptAi(finding.aiRunId, { clinicianNote: note, editedResult: edited })
              }
            />
          ))}
        </div>
      ) : null}

      <p className="combination-check__disclaimer">
        Kombinationscheck: paarweise Prüfung (MVP). KI-Befunde erst nach expliziter Akzeptanz klinisch
        verbindlich. Triple-Kombinationen, Labor-Trigger und Rezeptor-Last — geplant, nicht enthalten.
      </p>
    </div>
  )
}

// Deferred (not MVP): triple combinations, lab-linked auto-triggers, receptor burden, country-specific formularies.
