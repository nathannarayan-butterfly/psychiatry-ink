import { useCallback, useMemo, useState } from 'react'
import { Check, Copy, Loader2, Save, Sparkles, X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { CombinationCheckPanel } from '../../therapy/CombinationCheckPanel'
import { MedicationDrugSuggest } from '../../medication/MedicationDrugSuggest'
import { ReceptorProfileSection } from '../../medication/ReceptorProfileSection'
import { useKnowledgeBaseDrugs } from '../../../hooks/useKnowledgeBaseDrugs'
import {
  searchKbDrugSuggestions,
  normalizeDrugQuery,
  type KbDrugSuggestResult,
} from '../../../utils/medication/kbDrugSuggest'
import type { ReceptorMedInput } from '../../../utils/medication/receptorBurden'
import { computeMedicationInsights } from '../../../utils/medication/medicationInsights'
import { buildMedicationCorrelationSummary } from '../../../utils/standalone/medicationCorrelation'
import { askPharmaQuestion } from '../../../services/pharmaAskApi'
import { copyTextToClipboard } from '../../../utils/notionDocumentActions'
import { saveStandaloneNote } from '../../../utils/standaloneNotes'
import {
  createEmptyDoseSchedule,
  createEmptyMedicationPlanState,
  type MedicationEntry,
} from '../../../types/medicationPlan'
import { StandaloneResultPanel } from './StandaloneResultPanel'
import { useMedicationCorrelationLabels } from './useMedicationCorrelationLabels'
import { showNotionToast } from '../NotionToast'
import '../../../styles/workspace-ai.css'
import '../../../styles/combination-check.css'
import '../../../styles/medication-minimal.css'
import '../../../styles/standalone-workspace.css'

interface StandaloneMedicationWidgetProps {
  /** Storage id of the (default) case any saved summary note is filed under. */
  caseId: string
  onClose: () => void
}

type MedicationTab = 'interactions' | 'receptor' | 'sideEffects'

interface AiCheckResult {
  text: string
  model?: string
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

/**
 * Patient-less medication hub. The clinician assembles a temporary in-memory
 * drug list (NOT a patient med plan — nothing is loaded from or written to a
 * caseId plan) two ways:
 *   - the KB autocomplete picker, and
 *   - a FREE-TEXT, comma-separated entry box (#1) which is parsed into tokens;
 *     each token is resolved against the knowledge base. Tokens found in the KB
 *     join the deterministic checks below; tokens NOT in the database are kept
 *     as "off-database" names and clearly badged.
 *
 * For KB-resolved drugs the three deterministic, reference-derived views run:
 *   - Kombinationsrisiko / Wechselwirkungen ({@link CombinationCheckPanel}),
 *   - Rezeptorprofil ({@link ReceptorProfileSection}),
 *   - Nebenwirkungsprofil ({@link computeMedicationInsights}).
 *
 * For off-database drugs the deterministic matrix has no data, so the clinician
 * can run an EXPLICIT "Mit KI prüfen" AI interaction check ({@link
 * askPharmaQuestion}) across the full list — never on mount, only on the button.
 * An optional "save summary" writes a standalone note via {@link
 * StandaloneResultPanel}.
 */
export function StandaloneMedicationWidget({ caseId, onClose }: StandaloneMedicationWidgetProps) {
  const { t, language } = useTranslation()
  const correlationLabels = useMedicationCorrelationLabels()
  const { drugs: kbDrugs } = useKnowledgeBaseDrugs()
  const [drugs, setDrugs] = useState<KbDrugSuggestResult[]>([])
  const [offDbNames, setOffDbNames] = useState<string[]>([])
  const [freeText, setFreeText] = useState('')
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<MedicationTab>('interactions')
  const [phase, setPhase] = useState<'hub' | 'summary'>('hub')
  const [summaryText, setSummaryText] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiResult, setAiResult] = useState<AiCheckResult | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiCopied, setAiCopied] = useState(false)
  const [aiSaved, setAiSaved] = useState(false)

  const medications = useMemo(() => drugs.map(toMedicationEntry), [drugs])
  const state = useMemo(() => createEmptyMedicationPlanState(caseId), [caseId])
  const receptorMeds = useMemo<ReceptorMedInput[]>(
    () => medications.map((m) => ({ id: m.id, substance: m.substance })),
    [medications],
  )
  const insights = useMemo(
    () => computeMedicationInsights(medications, language),
    [medications, language],
  )

  /** Resolve a typed name to a KB drug only on an exact generic/brand match. */
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
    setAiResult(null)
  }, [])

  const removeDrug = useCallback((index: number) => {
    setDrugs((current) => current.filter((_, idx) => idx !== index))
    setAiResult(null)
  }, [])

  const removeOffDb = useCallback((index: number) => {
    setOffDbNames((current) => current.filter((_, idx) => idx !== index))
    setAiResult(null)
  }, [])

  /** Parse the comma-separated free-text box into KB-resolved + off-DB names. */
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
    setAiResult(null)
  }, [freeText, drugs, offDbNames, resolveKbToken])

  const runAiCheck = useCallback(async () => {
    const allNames = [...medications.map((m) => m.substance), ...offDbNames]
    if (allNames.length === 0 || aiBusy) return
    setAiBusy(true)
    setAiError(null)
    setAiSaved(false)
    setAiCopied(false)
    try {
      const list = allNames.join(', ')
      const result = await askPharmaQuestion({
        medicationName: list.slice(0, 400),
        sectionId: 'interactions',
        sectionData: `${t('standaloneMedicationAiContextLabel')}: ${list}`,
        question: `${t('standaloneMedicationAiQuestion')}\n\n${list}`,
        language,
        tier: 'thorough',
      })
      setAiResult({ text: result.answer.trim(), model: result.model?.label })
    } catch (err) {
      setAiError(err instanceof Error && err.message ? err.message : t('workspaceAiError'))
    } finally {
      setAiBusy(false)
    }
  }, [medications, offDbNames, aiBusy, language, t])

  const copyAi = useCallback(async () => {
    if (!aiResult) return
    const ok = await copyTextToClipboard(aiResult.text)
    if (!ok) return
    setAiCopied(true)
    window.setTimeout(() => setAiCopied(false), 1800)
  }, [aiResult])

  const saveAiToNotes = useCallback(() => {
    if (!aiResult?.text.trim()) return
    saveStandaloneNote(caseId, {
      kind: 'medication-ai-check',
      title: t('standaloneMedicationAiNoteTitle'),
      content: aiResult.text,
      category: 'formulare',
    })
    setAiSaved(true)
    showNotionToast(t('standaloneSavedToNotes'))
  }, [aiResult, caseId, t])

  const handleSaveSummary = useCallback(() => {
    const text = buildMedicationCorrelationSummary(medications, language, correlationLabels)
    setSummaryText(text)
    setPhase('summary')
  }, [medications, language, correlationLabels])

  const hasAnyInput = drugs.length > 0 || offDbNames.length > 0

  if (phase === 'summary') {
    return (
      <StandaloneResultPanel
        caseId={caseId}
        title={t('standaloneMedicationSummaryTitle')}
        noteKind="medication-summary"
        noteCategory="formulare"
        text={summaryText}
        onTextChange={setSummaryText}
        onClose={() => setPhase('hub')}
      />
    )
  }

  return (
    <div className="wai-panel wai-panel--inline" aria-label={t('standaloneMedicationTitle')}>
      <header className="wai-panel__header">
        <h2 className="wai-panel__title">{t('standaloneMedicationTitle')}</h2>
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
          <p className="swx-empty">{t('standaloneMedicationHint')}</p>

          <label className="swx-field">
            {t('standaloneMedicationFreeTextLabel')}
            <textarea
              className="swx-field__textarea"
              style={{ minHeight: 70 }}
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

          <div className="swx-tabs" role="tablist" aria-label={t('standaloneMedicationTitle')}>
            <TabButton active={tab === 'interactions'} onClick={() => setTab('interactions')}>
              {t('standaloneMedicationTabInteractions')}
            </TabButton>
            <TabButton active={tab === 'receptor'} onClick={() => setTab('receptor')}>
              {t('standaloneMedicationTabReceptor')}
            </TabButton>
            <TabButton active={tab === 'sideEffects'} onClick={() => setTab('sideEffects')}>
              {t('standaloneMedicationTabSideEffects')}
            </TabButton>
          </div>

          {tab === 'interactions' ? (
            <>
              <CombinationCheckPanel
                caseId={caseId}
                medications={medications}
                state={state}
                language={language}
              />

              {offDbNames.length > 0 ? (
                <div className="swx-aicheck">
                  <p className="swx-empty">{t('standaloneMedicationOffDbHint')}</p>
                  <div className="swx-aicheck__actions">
                    <button
                      type="button"
                      className="wai-btn wai-btn--primary"
                      onClick={() => void runAiCheck()}
                      disabled={aiBusy || !hasAnyInput}
                    >
                      {aiBusy ? (
                        <Loader2 className="h-3.5 w-3.5 wai-spin" strokeWidth={1.75} aria-hidden />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                      )}
                      {aiBusy ? t('workspaceAiGenerating') : t('standaloneMedicationAiCheck')}
                    </button>
                  </div>
                  {aiError ? <p className="swx-error">{aiError}</p> : null}
                  {aiResult ? (
                    <>
                      <p className="swx-aicheck__answer">{aiResult.text}</p>
                      {aiResult.model ? (
                        <p className="swx-aicheck__model">
                          {t('standaloneMedicationAiModelPrefix')} {aiResult.model}
                        </p>
                      ) : null}
                      <div className="swx-aicheck__actions">
                        <button
                          type="button"
                          className="wai-btn wai-btn--ghost"
                          onClick={() => void copyAi()}
                        >
                          {aiCopied ? (
                            <Check className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                          ) : (
                            <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                          )}
                          {aiCopied ? t('copyButtonCopied') : t('workspaceAiCopy')}
                        </button>
                        <button
                          type="button"
                          className="wai-btn wai-btn--primary"
                          onClick={saveAiToNotes}
                          disabled={aiSaved}
                        >
                          {aiSaved ? (
                            <Check className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                          ) : (
                            <Save className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                          )}
                          {aiSaved ? t('standaloneSavedToNotes') : t('standaloneSaveToNotes')}
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          {tab === 'receptor' ? (
            drugs.length === 0 ? (
              <p className="swx-empty">{t('standaloneMedicationEmptyReceptor')}</p>
            ) : (
              <ReceptorProfileSection
                activeMeds={receptorMeds}
                drugs={kbDrugs}
                language={language}
              />
            )
          ) : null}

          {tab === 'sideEffects' ? (
            drugs.length === 0 || !insights.hasReferenceData ? (
              <p className="swx-empty">{t('standaloneMedicationEmptySideEffects')}</p>
            ) : (
              <div className="swx-se">
                {insights.keySideEffects.length > 0 ? (
                  <section className="swx-se__group">
                    <p className="swx-se__heading">{t('standaloneMedicationSideEffectsHeading')}</p>
                    <ul className="swx-se__list">
                      {insights.keySideEffects.map((se) => (
                        <li key={se.label} className="swx-se__row">
                          <span>{se.label}</span>
                          {se.count > 1 ? (
                            <span className="swx-se__count">
                              {correlationLabels.sideEffectCount(se.count)}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {insights.monitoringBurden.length > 0 ? (
                  <section className="swx-se__group">
                    <p className="swx-se__heading">{t('standaloneMedicationMonitoringHeading')}</p>
                    <ul className="swx-se__list">
                      {insights.monitoringBurden.map((item) => (
                        <li key={item.parameter} className="swx-se__row">
                          <span>{item.parameter}</span>
                          <span className="swx-se__count">{item.drugs.join(', ')}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            )
          ) : null}
        </div>
      </div>

      <footer className="wai-panel__footer">
        <span className="wl-hint" />
        <button
          type="button"
          className="wai-btn wai-btn--primary"
          onClick={handleSaveSummary}
          disabled={drugs.length === 0}
        >
          {t('standaloneMedicationSaveSummary')}
        </button>
      </footer>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`swx-tab${active ? ' swx-tab--active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
