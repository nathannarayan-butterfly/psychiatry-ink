import { useCallback, useMemo, useState } from 'react'
import { Pencil, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import type { UiLanguage } from '../../types/settings'
import type { MedicationEntry, SideEffectReport } from '../../types/medicationPlan'
import type {
  AdrCausalityAssessment,
  AdrCausalityLikelihood,
  AdrCausalityMedicationInput,
  AdrManagementStep,
  AdrSuspectedDrugAssessment,
} from '../../types/adrCausality'
import { ADR_CAUSALITY_LIKELIHOODS } from '../../types/adrCausality'
import {
  getAdrLikelihoodLabel,
  translateMedicationUi,
} from '../../data/medicationUiTranslations'
import { runAdrCausalityAssessment } from '../../services/adrCausalityApi'
import { CopyButton } from '../common/CopyButton'
import { ClinicalLoading } from '../ui/ClinicalLoading'

interface AdrCausalityPanelProps {
  caseId: string
  report: SideEffectReport
  /** The patient's current (active) medication list. */
  activeMedications: MedicationEntry[]
  canRunAi: boolean
  disabled?: boolean
  language: UiLanguage
  onSave: (reportId: string, causality: AdrCausalityAssessment) => void
}

/** Tone class per likelihood for the minimal-theme badge. */
const LIKELIHOOD_TONE: Record<AdrCausalityLikelihood, string> = {
  unlikely: 'gray',
  possible: 'amber',
  probable: 'violet',
  highly_probable: 'red',
  unknown: 'gray',
}

function toMedicationInput(med: MedicationEntry): AdrCausalityMedicationInput {
  return {
    id: med.id,
    substance: med.substance,
    doseLineGerman: med.doseLineGerman || undefined,
    strength: med.strength || undefined,
    startDate: med.startDate || undefined,
    indication: med.indication || undefined,
    status: med.status,
    lastChangeAt: med.lastChangeAt || undefined,
  }
}

function buildCopyText(
  assessment: AdrCausalityAssessment,
  language: UiLanguage,
): string {
  const lines: string[] = []
  lines.push(`${translateMedicationUi(language, 'adrCausalityTitle')} — ${assessment.symptom}`)
  lines.push('')
  lines.push(`${translateMedicationUi(language, 'adrCausalitySuspectedTitle')}:`)
  if (assessment.suspectedDrugs.length === 0) {
    lines.push(`- ${translateMedicationUi(language, 'adrCausalityNoSuspected')}`)
  } else {
    for (const drug of assessment.suspectedDrugs) {
      lines.push(
        `- ${drug.substance} (${getAdrLikelihoodLabel(drug.likelihood, language)})${
          drug.rationale ? `: ${drug.rationale}` : ''
        }`,
      )
    }
  }
  lines.push('')
  lines.push(`${translateMedicationUi(language, 'adrCausalityManagementTitle')}:`)
  if (assessment.managementSteps.length === 0) {
    lines.push(`- ${translateMedicationUi(language, 'adrCausalityNoManagement')}`)
  } else {
    for (const step of assessment.managementSteps) {
      lines.push(`${step.order}. ${step.recommendation}`)
      if (step.rationale) {
        lines.push(`   ${translateMedicationUi(language, 'adrCausalityRationaleLabel')}: ${step.rationale}`)
      }
      if (step.ifIneffective) {
        lines.push(
          `   ${translateMedicationUi(language, 'adrCausalityIfIneffectiveLabel')}: ${step.ifIneffective}`,
        )
      }
    }
  }
  if (assessment.sources) {
    lines.push('')
    lines.push(`${translateMedicationUi(language, 'adrCausalitySourcesLabel')}: ${assessment.sources}`)
  }
  lines.push('')
  lines.push(`${translateMedicationUi(language, 'adrCausalityDisclaimerLabel')}: ${assessment.disclaimer}`)
  return lines.join('\n')
}

export function AdrCausalityPanel({
  caseId,
  report,
  activeMedications,
  canRunAi,
  disabled = false,
  language,
  onSave,
}: AdrCausalityPanelProps) {
  const [draft, setDraft] = useState<AdrCausalityAssessment | null>(report.causality ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)

  const hasActiveMeds = activeMedications.length > 0

  const runAssessment = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await runAdrCausalityAssessment({
        caseId,
        symptom: report.symptom,
        onsetDate: report.onsetDate || undefined,
        severity: report.severity || undefined,
        temporalRelation: report.temporalRelation || undefined,
        note: report.note || undefined,
        suspectedMedicationId: report.suspectedMedicationId,
        medications: activeMedications.map(toMedicationInput),
        language,
      })
      setDraft(result.assessment)
      setDirty(true)
      setEditing(false)
      if (result.aiWarning) setError(result.aiWarning)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'KI-Anfrage fehlgeschlagen: Kausalitätszuordnung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }, [activeMedications, caseId, language, report.note, report.onsetDate, report.severity, report.suspectedMedicationId, report.symptom, report.temporalRelation])

  const patchDraft = useCallback((patch: Partial<AdrCausalityAssessment>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch, edited: true } : prev))
    setDirty(true)
  }, [])

  const updateSuspected = useCallback(
    (index: number, patch: Partial<AdrSuspectedDrugAssessment>) => {
      setDraft((prev) => {
        if (!prev) return prev
        const suspectedDrugs = prev.suspectedDrugs.map((drug, i) =>
          i === index ? { ...drug, ...patch } : drug,
        )
        return { ...prev, suspectedDrugs, edited: true }
      })
      setDirty(true)
    },
    [],
  )

  const updateStep = useCallback((index: number, patch: Partial<AdrManagementStep>) => {
    setDraft((prev) => {
      if (!prev) return prev
      const managementSteps = prev.managementSteps.map((step, i) =>
        i === index ? { ...step, ...patch } : step,
      )
      return { ...prev, managementSteps, edited: true }
    })
    setDirty(true)
  }, [])

  const addStep = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev
      const order = prev.managementSteps.length + 1
      return {
        ...prev,
        managementSteps: [...prev.managementSteps, { order, recommendation: '' }],
        edited: true,
      }
    })
    setDirty(true)
  }, [])

  const removeStep = useCallback((index: number) => {
    setDraft((prev) => {
      if (!prev) return prev
      const managementSteps = prev.managementSteps
        .filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, order: i + 1 }))
      return { ...prev, managementSteps, edited: true }
    })
    setDirty(true)
  }, [])

  const handleSave = useCallback(() => {
    if (!draft) return
    const toSave: AdrCausalityAssessment = { ...draft, savedAt: new Date().toISOString() }
    onSave(report.id, toSave)
    setDraft(toSave)
    setDirty(false)
    setEditing(false)
  }, [draft, onSave, report.id])

  const copyText = useMemo(
    () => (draft ? () => buildCopyText(draft, language) : () => ''),
    [draft, language],
  )

  const runLabel = loading
    ? translateMedicationUi(language, 'adrCausalityRunning')
    : draft
      ? translateMedicationUi(language, 'adrCausalityRerun')
      : translateMedicationUi(language, 'adrCausalityButton')

  return (
    <section className="adr-causality">
      <div className="adr-causality__head">
        <span className="adr-causality__title">
          <Sparkles size={13} strokeWidth={1.85} aria-hidden />
          {translateMedicationUi(language, 'adrCausalityTitle')}
        </span>
        <div className="adr-causality__actions">
          {canRunAi && hasActiveMeds ? (
            <button
              type="button"
              className="adr-causality__btn"
              disabled={disabled || loading}
              onClick={() => void runAssessment()}
              title={translateMedicationUi(language, 'adrCausalityButtonTitle')}
            >
              <Sparkles
                size={13}
                strokeWidth={1.85}
                className={loading ? 'adr-causality__btn-icon--spin' : undefined}
                aria-hidden
              />
              {runLabel}
            </button>
          ) : null}
          {draft ? (
            <>
              <button
                type="button"
                className="adr-causality__btn adr-causality__btn--ghost"
                disabled={disabled}
                onClick={() => setEditing((v) => !v)}
                title={translateMedicationUi(language, editing ? 'adrCausalityEditDone' : 'adrCausalityEdit')}
              >
                <Pencil size={13} strokeWidth={1.85} aria-hidden />
                {translateMedicationUi(language, editing ? 'adrCausalityEditDone' : 'adrCausalityEdit')}
              </button>
              <CopyButton
                text={copyText}
                label={translateMedicationUi(language, 'adrCausalityCopyTitle')}
                bordered
              />
            </>
          ) : null}
        </div>
      </div>

      {!canRunAi && !draft ? null : null}

      {canRunAi && !hasActiveMeds && !draft ? (
        <p className="adr-causality__hint">{translateMedicationUi(language, 'adrCausalityNoActiveMeds')}</p>
      ) : null}

      {loading ? (
        <ClinicalLoading
          variant="inline"
          label={translateMedicationUi(language, 'adrCausalityRunning')}
          className="adr-causality__loading"
        />
      ) : null}

      {error ? <p className="adr-causality__error">{error}</p> : null}

      {!draft && !loading ? (
        <p className="adr-causality__empty">{translateMedicationUi(language, 'adrCausalityEmpty')}</p>
      ) : null}

      {draft ? (
        <div className="adr-causality__body">
          <div className="adr-causality__badges">
            <span className="adr-causality__badge adr-causality__badge--ai">
              {translateMedicationUi(language, 'adrCausalityAiBadge')}
            </span>
            {draft.edited ? (
              <span className="adr-causality__badge">
                {translateMedicationUi(language, 'adrCausalityEditedBadge')}
              </span>
            ) : null}
            {draft.savedAt && !dirty ? (
              <span className="adr-causality__badge adr-causality__badge--saved">
                {translateMedicationUi(language, 'adrCausalitySavedBadge')}
              </span>
            ) : null}
            {dirty ? (
              <span className="adr-causality__badge adr-causality__badge--unsaved">
                {translateMedicationUi(language, 'adrCausalityUnsavedHint')}
              </span>
            ) : null}
          </div>

          {/* Suspected drugs */}
          <div className="adr-causality__block">
            <p className="adr-causality__block-label">
              {translateMedicationUi(language, 'adrCausalitySuspectedTitle')}
            </p>
            {draft.suspectedDrugs.length === 0 ? (
              <p className="adr-causality__hint">
                {translateMedicationUi(language, 'adrCausalityNoSuspected')}
              </p>
            ) : (
              <ul className="adr-causality__suspected">
                {draft.suspectedDrugs.map((drug, index) => (
                  <li key={`${drug.substance}-${index}`} className="adr-causality__suspected-item">
                    <div className="adr-causality__suspected-head">
                      <span className="adr-causality__suspected-name">{drug.substance}</span>
                      {editing ? (
                        <select
                          className="therapy-input adr-causality__select"
                          value={drug.likelihood}
                          disabled={disabled}
                          onChange={(e) =>
                            updateSuspected(index, {
                              likelihood: e.target.value as AdrCausalityLikelihood,
                            })
                          }
                        >
                          {ADR_CAUSALITY_LIKELIHOODS.map((value) => (
                            <option key={value} value={value}>
                              {getAdrLikelihoodLabel(value, language)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`adr-causality__likelihood adr-causality__likelihood--${LIKELIHOOD_TONE[drug.likelihood]}`}
                        >
                          {getAdrLikelihoodLabel(drug.likelihood, language)}
                        </span>
                      )}
                    </div>
                    {editing ? (
                      <textarea
                        className="therapy-input adr-causality__textarea"
                        rows={2}
                        value={drug.rationale}
                        disabled={disabled}
                        aria-label={translateMedicationUi(language, 'adrCausalityRationaleLabel')}
                        onChange={(e) => updateSuspected(index, { rationale: e.target.value })}
                      />
                    ) : drug.rationale ? (
                      <p className="adr-causality__rationale">{drug.rationale}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Stepwise management */}
          <div className="adr-causality__block">
            <p className="adr-causality__block-label">
              {translateMedicationUi(language, 'adrCausalityManagementTitle')}
            </p>
            {draft.managementSteps.length === 0 && !editing ? (
              <p className="adr-causality__hint">
                {translateMedicationUi(language, 'adrCausalityNoManagement')}
              </p>
            ) : (
              <ol className="adr-causality__steps">
                {draft.managementSteps.map((step, index) => (
                  <li key={index} className="adr-causality__step">
                    {editing ? (
                      <div className="adr-causality__step-edit">
                        <div className="adr-causality__step-edit-row">
                          <span className="adr-causality__step-num">{step.order}.</span>
                          <textarea
                            className="therapy-input adr-causality__textarea"
                            rows={2}
                            value={step.recommendation}
                            disabled={disabled}
                            aria-label={translateMedicationUi(language, 'adrCausalityRecommendationLabel')}
                            onChange={(e) => updateStep(index, { recommendation: e.target.value })}
                          />
                          <button
                            type="button"
                            className="adr-causality__icon-btn"
                            disabled={disabled}
                            onClick={() => removeStep(index)}
                            title={translateMedicationUi(language, 'adrCausalityRemoveStep')}
                            aria-label={translateMedicationUi(language, 'adrCausalityRemoveStep')}
                          >
                            <Trash2 size={13} strokeWidth={1.85} aria-hidden />
                          </button>
                        </div>
                        <textarea
                          className="therapy-input adr-causality__textarea"
                          rows={1}
                          value={step.ifIneffective ?? ''}
                          disabled={disabled}
                          placeholder={translateMedicationUi(language, 'adrCausalityIfIneffectiveLabel')}
                          aria-label={translateMedicationUi(language, 'adrCausalityIfIneffectiveLabel')}
                          onChange={(e) =>
                            updateStep(index, { ifIneffective: e.target.value || undefined })
                          }
                        />
                      </div>
                    ) : (
                      <div className="adr-causality__step-view">
                        <p className="adr-causality__step-rec">
                          <span className="adr-causality__step-num">{step.order}.</span>
                          {step.recommendation}
                        </p>
                        {step.rationale ? (
                          <p className="adr-causality__step-sub">
                            {translateMedicationUi(language, 'adrCausalityRationaleLabel')}: {step.rationale}
                          </p>
                        ) : null}
                        {step.ifIneffective ? (
                          <p className="adr-causality__step-sub adr-causality__step-sub--escalate">
                            {translateMedicationUi(language, 'adrCausalityIfIneffectiveLabel')}: {step.ifIneffective}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
            {editing ? (
              <button
                type="button"
                className="adr-causality__btn adr-causality__btn--ghost adr-causality__add-step"
                disabled={disabled}
                onClick={addStep}
              >
                <Plus size={13} strokeWidth={1.85} aria-hidden />
                {translateMedicationUi(language, 'adrCausalityAddStep')}
              </button>
            ) : null}
          </div>

          {/* Sources */}
          {editing ? (
            <label className="adr-causality__field">
              <span className="adr-causality__block-label">
                {translateMedicationUi(language, 'adrCausalitySourcesLabel')}
              </span>
              <textarea
                className="therapy-input adr-causality__textarea"
                rows={1}
                value={draft.sources ?? ''}
                disabled={disabled}
                onChange={(e) => patchDraft({ sources: e.target.value || undefined })}
              />
            </label>
          ) : draft.sources ? (
            <p className="adr-causality__sources">
              {translateMedicationUi(language, 'adrCausalitySourcesLabel')}: {draft.sources}
            </p>
          ) : null}

          {/* Clinical-judgment disclaimer */}
          <div className="adr-causality__disclaimer">
            <span className="adr-causality__disclaimer-label">
              {translateMedicationUi(language, 'adrCausalityDisclaimerLabel')}
            </span>
            {editing ? (
              <textarea
                className="therapy-input adr-causality__textarea"
                rows={3}
                value={draft.disclaimer}
                disabled={disabled}
                aria-label={translateMedicationUi(language, 'adrCausalityDisclaimerLabel')}
                onChange={(e) => patchDraft({ disclaimer: e.target.value })}
              />
            ) : (
              <p className="adr-causality__disclaimer-text">{draft.disclaimer}</p>
            )}
          </div>

          <div className="adr-causality__footer">
            <button
              type="button"
              className="therapy-btn therapy-btn--primary adr-causality__save"
              disabled={disabled || !dirty}
              onClick={handleSave}
            >
              <Save size={13} strokeWidth={1.85} aria-hidden />
              {draft.savedAt && !dirty
                ? translateMedicationUi(language, 'adrCausalitySaved')
                : translateMedicationUi(language, 'adrCausalitySave')}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
