import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { CombinationCheckPanel } from '../../therapy/CombinationCheckPanel'
import { MedicationDrugSuggest } from '../../medication/MedicationDrugSuggest'
import { ReceptorProfileSection } from '../../medication/ReceptorProfileSection'
import { useKnowledgeBaseDrugs } from '../../../hooks/useKnowledgeBaseDrugs'
import type { KbDrugSuggestResult } from '../../../utils/medication/kbDrugSuggest'
import type { ReceptorMedInput } from '../../../utils/medication/receptorBurden'
import { computeMedicationInsights } from '../../../utils/medication/medicationInsights'
import { buildMedicationCorrelationSummary } from '../../../utils/standalone/medicationCorrelation'
import {
  createEmptyDoseSchedule,
  createEmptyMedicationPlanState,
  type MedicationEntry,
} from '../../../types/medicationPlan'
import { StandaloneResultPanel } from './StandaloneResultPanel'
import { useMedicationCorrelationLabels } from './useMedicationCorrelationLabels'
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
 * caseId plan) with the KB autocomplete, then explores three deterministic,
 * reference-derived views:
 *   - Kombinationsrisiko / Wechselwirkungen ({@link CombinationCheckPanel} —
 *     the KB matrix plus the clinician-triggered AI deep check),
 *   - Rezeptorprofil ({@link ReceptorProfileSection}),
 *   - Nebenwirkungsprofil (aggregated reference side-effect + monitoring signals
 *     from {@link computeMedicationInsights}).
 * No AI runs on mount; the only billed action is the explicit "run" button
 * inside the interaction panel. An optional "save summary" writes a standalone
 * note via {@link StandaloneResultPanel}.
 */
export function StandaloneMedicationWidget({ caseId, onClose }: StandaloneMedicationWidgetProps) {
  const { t, language } = useTranslation()
  const correlationLabels = useMedicationCorrelationLabels()
  const { drugs: kbDrugs } = useKnowledgeBaseDrugs()
  const [drugs, setDrugs] = useState<KbDrugSuggestResult[]>([])
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<MedicationTab>('interactions')
  const [phase, setPhase] = useState<'hub' | 'summary'>('hub')
  const [summaryText, setSummaryText] = useState('')

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

  const addDrug = (result: KbDrugSuggestResult) => {
    setDrugs((current) =>
      current.some((d) => d.substance.toLowerCase() === result.substance.toLowerCase())
        ? current
        : [...current, result],
    )
    setQuery('')
  }

  const removeDrug = (index: number) => {
    setDrugs((current) => current.filter((_, idx) => idx !== index))
  }

  const handleSaveSummary = () => {
    const text = buildMedicationCorrelationSummary(medications, language, correlationLabels)
    setSummaryText(text)
    setPhase('summary')
  }

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
    <div
      className="wai-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('standaloneMedicationTitle')}
    >
      <div className="wai-panel">
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
            <MedicationDrugSuggest
              value={query}
              label={t('standaloneInteractionsAddLabel')}
              onChange={setQuery}
              onSelect={addDrug}
            />
            {drugs.length > 0 ? (
              <div className="swx-chips">
                {drugs.map((drug, index) => (
                  <span key={`${drug.key}-${index}`} className="swx-chip">
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
              <CombinationCheckPanel
                caseId={caseId}
                medications={medications}
                state={state}
                language={language}
              />
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
