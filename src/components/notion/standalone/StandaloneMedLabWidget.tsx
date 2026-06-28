import { useCallback, useMemo, useState } from 'react'
import { Activity, Loader2, Plus, Sparkles, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { CombinationCheckPanel } from '../../therapy/CombinationCheckPanel'
import { MedicationDrugSuggest } from '../../medication/MedicationDrugSuggest'
import { useKnowledgeBaseDrugs } from '../../../hooks/useKnowledgeBaseDrugs'
import {
  searchKbDrugSuggestions,
  normalizeDrugQuery,
  type KbDrugSuggestResult,
} from '../../../utils/medication/kbDrugSuggest'
import {
  createEmptyDoseSchedule,
  createEmptyMedicationPlanState,
  type MedicationEntry,
} from '../../../types/medicationPlan'
import {
  buildLabValuesFromParameterRows,
  computeMedLabCorrelation,
  formatLabParameterRows,
  type LabParameterRow,
  type MedLabFindingCode,
} from '../../../utils/standalone/medLabCorrelation'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import { executeAiGeneration } from '../../../services/aiGeneration'
import { estimateGenerationCredits } from '../../../utils/estimateCredits'
import { StandaloneResultPanel } from './StandaloneResultPanel'
import '../../../styles/workspace-ai.css'
import '../../../styles/combination-check.css'
import '../../../styles/standalone-workspace.css'

interface StandaloneMedLabWidgetProps {
  caseId: string
  onClose: () => void
}

function toMedicationEntry(result: KbDrugSuggestResult, index: number): MedicationEntry {
  const now = new Date().toISOString()
  return {
    id: `adhoc-${index}-${result.key}`,
    substance: result.substance,
    kbDrugId: result.kbDrugId,
    substanceId: result.substanceId ?? result.kbDrugId,
    displayBrandName: result.displayBrandName,
    formulation: result.formulation ?? 'tablet',
    strength: result.strength ?? '',
    doseSchedule: createEmptyDoseSchedule(),
    doseLineGerman: result.substance,
    prn: false,
    startDate: now.slice(0, 10),
    indication: '',
    status: 'active',
    reasonForChange: '',
    sideEffects: [],
    adherenceNote: '',
    freeTextLine: '',
    introducedAt: now,
    lastChangeAt: now,
    lastChangeType: 'start',
    history: [],
  }
}

const FINDING_MESSAGE_KEY: Record<MedLabFindingCode, UiTranslationKey> = {
  qtTorsades: 'standaloneMedLabFindingQtTorsades',
  qtProlonged: 'standaloneMedLabFindingQtProlonged',
  lithiumToxic: 'standaloneMedLabFindingLithiumToxic',
  lithiumSubtherapeutic: 'standaloneMedLabFindingLithiumSubtherapeutic',
  lithiumRenal: 'standaloneMedLabFindingLithiumRenal',
  valproateToxic: 'standaloneMedLabFindingValproateToxic',
  valproateSubtherapeutic: 'standaloneMedLabFindingValproateSubtherapeutic',
  valproateMonitor: 'standaloneMedLabFindingValproateMonitor',
  carbamazepineToxic: 'standaloneMedLabFindingCarbamazepineToxic',
  carbamazepineSubtherapeutic: 'standaloneMedLabFindingCarbamazepineSubtherapeutic',
  carbamazepineHyponatremia: 'standaloneMedLabFindingCarbamazepineHyponatremia',
  clozapineAgranulocytosis: 'standaloneMedLabFindingClozapineAgranulocytosis',
  clozapineLeukopenia: 'standaloneMedLabFindingClozapineLeukopenia',
  ssriHyponatremia: 'standaloneMedLabFindingSsriHyponatremia',
}

let labRowCounter = 0
function newLabRow(): LabParameterRow {
  labRowCounter += 1
  return { id: `lab-${labRowCounter}`, parameter: '', value: '' }
}

export function StandaloneMedLabWidget({ caseId, onClose }: StandaloneMedLabWidgetProps) {
  const { t, language } = useTranslation()
  const { drugs: kbDrugs } = useKnowledgeBaseDrugs()
  const [drugs, setDrugs] = useState<KbDrugSuggestResult[]>([])
  const [offDbNames, setOffDbNames] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')
  const [query, setQuery] = useState('')
  const [labRows, setLabRows] = useState<LabParameterRow[]>(() => [newLabRow(), newLabRow()])
  const [phase, setPhase] = useState<'hub' | 'result'>('hub')
  const [summaryText, setSummaryText] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const medications = useMemo(() => drugs.map(toMedicationEntry), [drugs])
  const state = useMemo(() => createEmptyMedicationPlanState(caseId), [caseId])
  const allNames = useMemo(
    () => [...medications.map((m) => m.substance), ...offDbNames],
    [medications, offDbNames],
  )

  const labValues = useMemo(() => buildLabValuesFromParameterRows(labRows), [labRows])

  const correlation = useMemo(
    () => computeMedLabCorrelation(medications, allNames, labValues),
    [medications, allNames, labValues],
  )

  const resolveKbToken = useCallback(
    (token: string): KbDrugSuggestResult | null => {
      const norm = normalizeDrugQuery(token)
      if (norm.length < 2) return null
      const results = searchKbDrugSuggestions({ query: token, kbDrugs, preparations: [], limit: 8 })
      return (
        results.find(
          (r) =>
            normalizeDrugQuery(r.substance) === norm ||
            (r.displayBrandName ? normalizeDrugQuery(r.displayBrandName) === norm : false) ||
            r.brandNames.some((b) => normalizeDrugQuery(b) === norm),
        ) ?? null
      )
    },
    [kbDrugs],
  )

  const addDrug = useCallback((result: KbDrugSuggestResult) => {
    setDrugs((current) =>
      current.some((d) => d.substance.toLowerCase() === result.substance.toLowerCase())
        ? current
        : [...current, result],
    )
    setQuery('')
  }, [])

  const removeDrug = useCallback((index: number) => {
    setDrugs((current) => current.filter((_, idx) => idx !== index))
  }, [])

  const removeOffDb = useCallback((index: number) => {
    setOffDbNames((current) => current.filter((_, idx) => idx !== index))
  }, [])

  const applyFreeText = useCallback(() => {
    const tokens = freeText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (tokens.length === 0) return
    const nextDrugs = [...drugs]
    const nextOff = [...offDbNames]
    for (const token of tokens) {
      const resolved = resolveKbToken(token)
      if (resolved) {
        if (!nextDrugs.some((d) => d.substance.toLowerCase() === resolved.substance.toLowerCase())) {
          nextDrugs.push(resolved)
        }
      } else {
        const dupe =
          nextOff.some((n) => n.toLowerCase() === token.toLowerCase()) ||
          nextDrugs.some((d) => d.substance.toLowerCase() === token.toLowerCase())
        if (!dupe) nextOff.push(token)
      }
    }
    setDrugs(nextDrugs)
    setOffDbNames(nextOff)
    setFreeText('')
  }, [freeText, drugs, offDbNames, resolveKbToken])

  const updateLabRow = useCallback((id: string, patch: Partial<Pick<LabParameterRow, 'parameter' | 'value'>>) => {
    setLabRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [])

  const addLabRow = useCallback(() => {
    setLabRows((rows) => [...rows, newLabRow()])
  }, [])

  const removeLabRow = useCallback((id: string) => {
    setLabRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== id)))
  }, [])

  const buildSummary = useCallback(() => {
    const lines: string[] = [t('standaloneMedLabNoteHeading')]
    if (allNames.length > 0) {
      lines.push(`${t('standaloneMedLabDrugsLabel')}: ${allNames.join(', ')}`)
    }
    const labLines = formatLabParameterRows(labRows)
    if (labLines.length > 0) {
      lines.push('', `${t('standaloneMedLabLabsHeading')}:`)
      for (const line of labLines) lines.push(`- ${line}`)
    }
    if (correlation.findings.length === 0) {
      lines.push('', t('standaloneMedLabNoFindings'))
    } else {
      lines.push('', `${t('standaloneMedLabFindingsLabel')}:`)
      for (const finding of correlation.findings) {
        const marker = finding.level === 'high' ? '⚠ ' : ''
        const values = finding.values.length > 0 ? ` [${finding.values.join(', ')}]` : ''
        lines.push(`- ${marker}${t(FINDING_MESSAGE_KEY[finding.code])}${values} (${finding.drugs.join(', ')})`)
      }
    }
    if (correlation.monitoring.length > 0) {
      lines.push('', `${t('standaloneMedLabMonitoringLabel')}:`)
      for (const item of correlation.monitoring) {
        lines.push(`- ${item.parameter}: ${item.drugs.join(', ')}`)
      }
    }
    return lines.join('\n').trim()
  }, [allNames, correlation, labRows, t])

  const handleSave = useCallback(() => {
    setSummaryText(buildSummary())
    setPhase('result')
  }, [buildSummary])

  const runAiAnalysis = useCallback(async () => {
    if (aiBusy || allNames.length === 0) return
    setAiBusy(true)
    setAiError(null)
    try {
      const deterministic = buildSummary()
      const labLines = formatLabParameterRows(labRows)
      const extraInstruction = [
        t('standaloneMedLabAiInstruction'),
        `${t('standaloneMedLabDrugsLabel')}: ${allNames.join(', ')}`,
        labLines.length > 0
          ? `${t('standaloneMedLabLabsHeading')}: ${labLines.join('; ')}`
          : '',
        correlation.findings.length > 0 ? `${t('standaloneMedLabFindingsLabel')}:\n${deterministic}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')

      const generation = await executeAiGeneration(
        {
          componentId: 'standalone-med-labor',
          scope: 'segment',
          tool: 'summarize',
          tier: 'thorough',
          language,
          sourceText: deterministic || allNames.join(', '),
          extraInstruction,
        },
        { estimatedCredits: estimateGenerationCredits('thorough', deterministic) },
      )
      setSummaryText(generation.text.trim())
      setPhase('result')
    } catch (err) {
      setAiError(err instanceof Error && err.message ? err.message : t('workspaceAiError'))
    } finally {
      setAiBusy(false)
    }
  }, [aiBusy, allNames, buildSummary, correlation.findings.length, labRows, language, t])

  const hasAnyInput = drugs.length > 0 || offDbNames.length > 0
  const hasLabInput = labRows.some((r) => r.parameter.trim() && r.value.trim())

  if (phase === 'result') {
    return (
      <StandaloneResultPanel
        caseId={caseId}
        title={t('standaloneMedLabTitle')}
        noteKind="med-lab-correlation"
        noteCategory="laborbefunde"
        text={summaryText}
        onTextChange={setSummaryText}
        onClose={() => setPhase('hub')}
      />
    )
  }

  return (
    <div className="wai-panel wai-panel--inline" aria-label={t('standaloneMedLabTitle')}>
      <header className="wai-panel__header">
        <span className="wai-panel__eyebrow">
          <Activity className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {t('standaloneMedLabEyebrow')}
        </span>
        <h2 className="wai-panel__title">{t('standaloneMedLabTitle')}</h2>
        <button
          type="button"
          className="wai-panel__close"
          onClick={onClose}
          aria-label={t('dokumenteClose')}
        >
          <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </button>
      </header>

      <div className="wai-panel__body">
        <div className="swx-form">
          <p className="swx-empty">{t('standaloneMedLabHint')}</p>

          <label className="swx-field">
            {t('standaloneMedicationFreeTextLabel')}
            <textarea
              className="swx-field__textarea"
              style={{ minHeight: 72 }}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  applyFreeText()
                }
              }}
              placeholder={t('standaloneMedicationFreeTextPlaceholder')}
              aria-label={t('standaloneMedicationFreeTextLabel')}
              spellCheck={false}
            />
          </label>
          <div className="swx-rewrite__controls" style={{ justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="wai-btn wai-btn--ghost"
              onClick={applyFreeText}
              disabled={!freeText.trim()}
            >
              {t('standaloneMedicationFreeTextAdd')}
            </button>
          </div>

          <MedicationDrugSuggest
            value={query}
            label={t('standaloneInteractionsAddLabel')}
            onChange={setQuery}
            onSelect={addDrug}
          />

          {hasAnyInput ? (
            <div className="swx-chips">
              {drugs.map((drug, index) => (
                <span key={`db-${drug.key}-${index}`} className="swx-chip">
                  <span className="swx-chip__tag swx-chip__tag--db">{t('standaloneMedicationBadgeDb')}</span>
                  {drug.substance}
                  <button
                    type="button"
                    className="swx-chip__remove"
                    onClick={() => removeDrug(index)}
                    aria-label={t('standaloneInteractionsRemove')}
                    title={t('standaloneInteractionsRemove')}
                  >
                    <X className="h-3 w-3" strokeWidth={2} aria-hidden />
                  </button>
                </span>
              ))}
              {offDbNames.map((name, index) => (
                <span key={`off-${name}-${index}`} className="swx-chip swx-chip--ai">
                  <span className="swx-chip__tag swx-chip__tag--ai">{t('standaloneMedicationBadgeAi')}</span>
                  {name}
                  <button
                    type="button"
                    className="swx-chip__remove"
                    onClick={() => removeOffDb(index)}
                    aria-label={t('standaloneInteractionsRemove')}
                    title={t('standaloneInteractionsRemove')}
                  >
                    <X className="h-3 w-3" strokeWidth={2} aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          <p className="swx-se__heading">{t('standaloneMedLabLabsHeading')}</p>
          <p className="swx-empty">{t('standaloneMedLabLabRowsHint')}</p>
          <div className="swx-lab-rows">
            {labRows.map((row) => (
              <div key={row.id} className="swx-lab-row">
                <label className="swx-field">
                  {t('standaloneMedLabParamLabel')}
                  <input
                    type="text"
                    className="swx-field__input"
                    value={row.parameter}
                    onChange={(e) => updateLabRow(row.id, { parameter: e.target.value })}
                    placeholder={t('standaloneMedLabParamPlaceholder')}
                    aria-label={t('standaloneMedLabParamLabel')}
                  />
                </label>
                <label className="swx-field">
                  {t('standaloneMedLabValueLabel')}
                  <input
                    type="text"
                    inputMode="decimal"
                    className="swx-field__input"
                    value={row.value}
                    onChange={(e) => updateLabRow(row.id, { value: e.target.value })}
                    placeholder={t('standaloneMedLabValuePlaceholder')}
                    aria-label={t('standaloneMedLabValueLabel')}
                  />
                </label>
                <button
                  type="button"
                  className="swx-lab-row__remove"
                  onClick={() => removeLabRow(row.id)}
                  aria-label={t('standaloneMedLabRemoveRow')}
                  title={t('standaloneMedLabRemoveRow')}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                </button>
              </div>
            ))}
            <button type="button" className="wai-btn wai-btn--ghost swx-lab-rows__add" onClick={addLabRow}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('standaloneMedLabAddRow')}
            </button>
          </div>

          <section className="swx-medlab__results" aria-live="polite">
            <p className="swx-se__heading">{t('standaloneMedLabFindingsLabel')}</p>
            {!hasAnyInput ? (
              <p className="swx-empty">{t('standaloneMedLabEmpty')}</p>
            ) : correlation.findings.length === 0 ? (
              <p className="swx-empty">{t('standaloneMedLabNoFindings')}</p>
            ) : (
              <ul className="swx-medlab__list">
                {correlation.findings.map((finding, index) => (
                  <li
                    key={`${finding.code}-${index}`}
                    className={`swx-medlab__row${finding.level === 'high' ? ' swx-medlab__row--high' : ''}`}
                  >
                    <span className="swx-medlab__msg">{t(FINDING_MESSAGE_KEY[finding.code])}</span>
                    <span className="swx-medlab__meta">
                      {finding.drugs.join(', ')}
                      {finding.values.length > 0 ? ` · ${finding.values.join(', ')}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {aiError ? <p className="swx-error">{aiError}</p> : null}

          {drugs.length > 0 ? (
            <CombinationCheckPanel
              caseId={caseId}
              medications={medications}
              state={state}
              language={language}
            />
          ) : null}
        </div>
      </div>

      <footer className="wai-panel__footer">
        <button
          type="button"
          className="wai-btn wai-btn--ghost"
          onClick={() => void runAiAnalysis()}
          disabled={!hasAnyInput || aiBusy}
        >
          {aiBusy ? (
            <Loader2 className="h-3.5 w-3.5 wai-spin" strokeWidth={1.75} aria-hidden />
          ) : (
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          )}
          {aiBusy ? t('workspaceAiGenerating') : t('standaloneMedLabAiAnalyze')}
        </button>
        <button
          type="button"
          className="wai-btn wai-btn--primary"
          onClick={handleSave}
          disabled={!hasAnyInput && !hasLabInput}
        >
          {t('standaloneMedLabSave')}
        </button>
      </footer>
    </div>
  )
}
