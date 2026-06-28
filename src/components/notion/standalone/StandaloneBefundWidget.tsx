import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { GuidedEntryWizard } from '../../guidedEntry/GuidedEntryWizard'
import { getGuidedEntrySchema } from '../../../data/guidedEntry/schemas'
import { CombinationCheckPanel } from '../../therapy/CombinationCheckPanel'
import { MedicationDrugSuggest } from '../../medication/MedicationDrugSuggest'
import { buildMedicationCorrelationSummary } from '../../../utils/standalone/medicationCorrelation'
import type { GuidedEntryItemType } from '../../../types/guidedEntry'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import type { DokumentCategory } from '../../../utils/dokumenteArchive'
import type { KbDrugSuggestResult } from '../../../utils/medication/kbDrugSuggest'
import {
  createEmptyDoseSchedule,
  createEmptyMedicationPlanState,
  type MedicationEntry,
} from '../../../types/medicationPlan'
import { StandaloneResultPanel } from './StandaloneResultPanel'
import { useMedicationCorrelationLabels } from './useMedicationCorrelationLabels'
import '../../../styles/workspace-ai.css'
import '../../../styles/combination-check.css'
import '../../../styles/standalone-workspace.css'

interface BefundMeta {
  titleKey: UiTranslationKey
  kind: string
  category: DokumentCategory
}

/**
 * Title / note-kind / archive-category for each guided itemType the standalone
 * Befund widget supports. All are findings, so they file under
 * `untersuchungsbefunde`.
 */
const BEFUND_META: Partial<Record<GuidedEntryItemType, BefundMeta>> = {
  'anamnese-somatic-befund': {
    titleKey: 'standaloneBefundSomaticTitle',
    kind: 'somatic-befund',
    category: 'untersuchungsbefunde',
  },
  'anamnese-neuro-befund': {
    titleKey: 'standaloneBefundNeuroTitle',
    kind: 'neuro-befund',
    category: 'untersuchungsbefunde',
  },
  'psychopath-finding': {
    titleKey: 'standaloneBefundPsychopathTitle',
    kind: 'psychopath-befund',
    category: 'untersuchungsbefunde',
  },
  'vitalwerte-quick': {
    titleKey: 'standaloneBefundVitalsTitle',
    kind: 'vitals',
    category: 'untersuchungsbefunde',
  },
  'befund-ecg': {
    titleKey: 'standaloneBefundEcgTitle',
    kind: 'ecg-befund',
    category: 'untersuchungsbefunde',
  },
  'befund-eeg': {
    titleKey: 'standaloneBefundEegTitle',
    kind: 'eeg-befund',
    category: 'untersuchungsbefunde',
  },
}

interface StandaloneBefundWidgetProps {
  itemType: GuidedEntryItemType
  /** Storage id of the (default) case the resulting note is saved under. */
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

/**
 * Patient-less guided Befund widget. Runs the existing `GuidedEntryWizard` for
 * the requested schema; when the clinician generates the narrative the text is
 * captured locally and handed to {@link StandaloneResultPanel} to edit / copy /
 * save as a standalone note. Unlike the patient-bound guided flow it never
 * calls `applyGuidedOutput`, so nothing is written into a caseId section.
 *
 * For the ECG flow an optional post-wizard step ("Mit Medikation korrelieren")
 * lets the clinician assemble an ad-hoc drug list and append a deterministic
 * QT/interaction correlation summary to the note text before saving — again
 * with no caseId plan writes.
 */
export function StandaloneBefundWidget({ itemType, caseId, onClose }: StandaloneBefundWidgetProps) {
  const { t, language } = useTranslation()
  const schema = useMemo(() => getGuidedEntrySchema(itemType), [itemType])
  const meta = BEFUND_META[itemType]
  const correlationLabels = useMedicationCorrelationLabels()
  const [phase, setPhase] = useState<'wizard' | 'result' | 'correlate'>('wizard')
  const [text, setText] = useState('')
  const [drugs, setDrugs] = useState<KbDrugSuggestResult[]>([])
  const [query, setQuery] = useState('')

  const title = meta ? t(meta.titleKey) : t(schema.titleKey as UiTranslationKey)
  const noteKind = meta?.kind ?? `befund-${itemType}`
  const category = meta?.category ?? 'untersuchungsbefunde'
  const supportsCorrelation = itemType === 'befund-ecg'

  const medications = useMemo(() => drugs.map(toMedicationEntry), [drugs])
  const state = useMemo(() => createEmptyMedicationPlanState(caseId), [caseId])

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

  const appendCorrelation = () => {
    const summary = buildMedicationCorrelationSummary(medications, language, correlationLabels)
    setText((current) => (current.trim() ? `${current.trim()}\n\n${summary}` : summary))
    setPhase('result')
  }

  if (phase === 'correlate') {
    return (
      <div
        className="wai-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={t('standaloneEcgCorrelateTitle')}
      >
        <div className="wai-panel">
          <header className="wai-panel__header">
            <h2 className="wai-panel__title">{t('standaloneEcgCorrelateTitle')}</h2>
            <button
              type="button"
              className="wai-panel__close"
              onClick={() => setPhase('result')}
              aria-label={t('dokumenteClose')}
            >
              <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </button>
          </header>

          <div className="wai-panel__body">
            <div className="swx-form">
              <p className="swx-empty">{t('standaloneEcgCorrelateHint')}</p>
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

              <CombinationCheckPanel
                caseId={caseId}
                medications={medications}
                state={state}
                language={language}
              />
            </div>
          </div>

          <footer className="wai-panel__footer">
            <button
              type="button"
              className="wai-btn wai-btn--ghost"
              onClick={() => setPhase('result')}
            >
              {t('standaloneCancel')}
            </button>
            <button
              type="button"
              className="wai-btn wai-btn--primary"
              onClick={appendCorrelation}
              disabled={drugs.length === 0}
            >
              {t('standaloneEcgCorrelateAppend')}
            </button>
          </footer>
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    return (
      <StandaloneResultPanel
        caseId={caseId}
        title={title}
        noteKind={noteKind}
        noteCategory={category}
        text={text}
        onTextChange={setText}
        onClose={onClose}
        secondaryAction={
          supportsCorrelation
            ? { label: t('standaloneEcgCorrelate'), onClick: () => setPhase('correlate') }
            : undefined
        }
      />
    )
  }

  return (
    <GuidedEntryWizard
      open
      schema={schema}
      caseId={caseId}
      onSaveDraft={() => undefined}
      onGenerate={(payload) => {
        setText(payload.text)
        setPhase('result')
      }}
      onCancel={onClose}
    />
  )
}
