import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'
import { CombinationCheckPanel } from '../../therapy/CombinationCheckPanel'
import { MedicationDrugSuggest } from '../../medication/MedicationDrugSuggest'
import type { KbDrugSuggestResult } from '../../../utils/medication/kbDrugSuggest'
import {
  createEmptyDoseSchedule,
  createEmptyMedicationPlanState,
  type MedicationEntry,
} from '../../../types/medicationPlan'
import '../../../styles/workspace-ai.css'
import '../../../styles/combination-check.css'
import '../../../styles/standalone-workspace.css'

interface StandaloneInteractionWidgetProps {
  /** Storage id used to persist interaction findings (the default case). */
  caseId: string
  onClose: () => void
}

/** Build a minimal active MedicationEntry from a KB drug suggestion. */
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
 * Ad-hoc drug–drug interaction check for the patient-less workspace. The
 * clinician assembles a temporary in-memory drug list (not a patient med plan)
 * with the existing KB drug autocomplete, then runs the existing
 * `CombinationCheckPanel` (knowledge-base matrix + clinician-triggered AI deep
 * check). The AI run only fires on the explicit "run" button inside the panel.
 */
export function StandaloneInteractionWidget({ caseId, onClose }: StandaloneInteractionWidgetProps) {
  const { t, language } = useTranslation()
  const [drugs, setDrugs] = useState<KbDrugSuggestResult[]>([])
  const [query, setQuery] = useState('')

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

  return (
    <div
      className="wai-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('standaloneInteractionsTitle')}
    >
      <div className="wai-panel">
        <header className="wai-panel__header">
          <h2 className="wai-panel__title">{t('standaloneInteractionsTitle')}</h2>
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
            <p className="swx-empty">{t('standaloneInteractionsHint')}</p>
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
      </div>
    </div>
  )
}
