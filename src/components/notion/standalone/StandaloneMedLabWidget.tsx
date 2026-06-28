import { useCallback, useMemo, useState } from 'react'
import { Activity, X } from 'lucide-react'
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
  AD_HOC_LAB_FIELDS,
  LAB_FIELD_SYMBOL,
  computeMedLabCorrelation,
  type AdHocLabField,
  type AdHocLabValues,
  type MedLabFindingCode,
} from '../../../utils/standalone/medLabCorrelation'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import { StandaloneResultPanel } from './StandaloneResultPanel'
import '../../../styles/workspace-ai.css'
import '../../../styles/combination-check.css'
import '../../../styles/standalone-workspace.css'

interface StandaloneMedLabWidgetProps {
  /** Storage id of the (default) case any saved note is filed under (notes panel). */
  caseId: string
  onClose: () => void
}

/** Build a minimal active MedicationEntry from a KB drug suggestion (in-memory only). */
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

/** Translation key per lab field (label shown above each numeric input). */
const FIELD_LABEL_KEY: Record<AdHocLabField, UiTranslationKey> = {
  potassium: 'standaloneMedLabFieldPotassium',
  magnesium: 'standaloneMedLabFieldMagnesium',
  calcium: 'standaloneMedLabFieldCalcium',
  sodium: 'standaloneMedLabFieldSodium',
  egfr: 'standaloneMedLabFieldEgfr',
  qtc: 'standaloneMedLabFieldQtc',
  leukocytes: 'standaloneMedLabFieldLeukocytes',
  neutrophils: 'standaloneMedLabFieldNeutrophils',
  lithiumLevel: 'standaloneMedLabFieldLithium',
  valproateLevel: 'standaloneMedLabFieldValproate',
  carbamazepineLevel: 'standaloneMedLabFieldCarbamazepine',
}

/** Translation key per finding code (full clinical message incl. recommended action). */
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

/**
 * Patient-less medication ⇄ laboratory correlation tool. The clinician assembles
 * an ad-hoc drug list (free-text comma entry resolved against the KB + autocomplete
 * picker; off-database names are kept too) and enters ad-hoc lab values. A
 * DETERMINISTIC engine ({@link computeMedLabCorrelation}, the same
 * `computeMedicationInsights` reference data the patient dashboard uses, plus
 * established drug ⇄ lab rules) surfaces the relevant correlations — QT vs.
 * electrolytes, lithium level/renal context, mood-stabiliser level/monitoring,
 * clozapine neutrophil safety, SSRI hyponatraemia. Nothing is read from or
 * written to a patient case; the correlation summary can be edited/copied/saved
 * to the standalone notes.
 */
export function StandaloneMedLabWidget({ caseId, onClose }: StandaloneMedLabWidgetProps) {
  const { t, language } = useTranslation()
  const { drugs: kbDrugs } = useKnowledgeBaseDrugs()
  const [drugs, setDrugs] = useState<KbDrugSuggestResult[]>([])
  const [offDbNames, setOffDbNames] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')
  const [query, setQuery] = useState('')
  const [labs, setLabs] = useState<Record<AdHocLabField, string>>(
    () => Object.fromEntries(AD_HOC_LAB_FIELDS.map((f) => [f, ''])) as Record<AdHocLabField, string>,
  )
  const [phase, setPhase] = useState<'hub' | 'result'>('hub')
  const [summaryText, setSummaryText] = useState('')

  const medications = useMemo(() => drugs.map(toMedicationEntry), [drugs])
  const state = useMemo(() => createEmptyMedicationPlanState(caseId), [caseId])
  const allNames = useMemo(
    () => [...medications.map((m) => m.substance), ...offDbNames],
    [medications, offDbNames],
  )

  const labValues = useMemo<AdHocLabValues>(() => {
    const out: AdHocLabValues = {}
    for (const field of AD_HOC_LAB_FIELDS) {
      const raw = labs[field].trim().replace(',', '.')
      const parsed = raw ? Number(raw) : NaN
      out[field] = Number.isFinite(parsed) ? parsed : null
    }
    return out
  }, [labs])

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

  const buildSummary = useCallback(() => {
    const lines: string[] = [t('standaloneMedLabNoteHeading')]
    if (allNames.length > 0) {
      lines.push(`${t('standaloneMedLabDrugsLabel')}: ${allNames.join(', ')}`)
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
  }, [allNames, correlation, t])

  const handleSave = useCallback(() => {
    setSummaryText(buildSummary())
    setPhase('result')
  }, [buildSummary])

  const hasAnyInput = drugs.length > 0 || offDbNames.length > 0

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
              style={{ minHeight: 60 }}
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
          <div className="swx-lab-grid">
            {AD_HOC_LAB_FIELDS.map((field) => (
              <label key={field} className="swx-field swx-lab-grid__field">
                <span className="swx-lab-grid__label">
                  {t(FIELD_LABEL_KEY[field])}
                  <span className="swx-lab-grid__unit">{LAB_FIELD_SYMBOL[field].unit}</span>
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="swx-field__input"
                  value={labs[field]}
                  onChange={(e) => setLabs((current) => ({ ...current, [field]: e.target.value }))}
                  placeholder={LAB_FIELD_SYMBOL[field].symbol}
                  aria-label={t(FIELD_LABEL_KEY[field])}
                />
              </label>
            ))}
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
        <span className="wl-hint" />
        <button
          type="button"
          className="wai-btn wai-btn--primary"
          onClick={handleSave}
          disabled={!hasAnyInput}
        >
          {t('standaloneMedLabSave')}
        </button>
      </footer>
    </div>
  )
}
