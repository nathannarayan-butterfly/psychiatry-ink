import { useCallback, useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { UiLanguage } from '../../types/settings'
import type { MedicationMarketAvailability } from '../../types/knowledgeBase'
import type { MedicationEntry } from '../../types/medicationPlan'
import type { PrepAiCheckPreparation, PrepAiCheckResponse } from '../../types/prepAiCheck'
import type { PrescribingCountryCode } from '../../types/knowledgeBase'
import {
  formatPrepAiQuelleLabel,
  translateMedicationUi,
} from '../../data/medicationUiTranslations'
import { PRESCRIBING_COUNTRY_NATIVE_LABELS } from '../../hooks/usePrescribingCountry'
import { formatPreparationLine } from '../../utils/kb/formatPreparationLine'
import { formatPreparationStrength } from '../../hooks/useMedicationMarketAvailability'
import { runPrepAiCheck } from '../../services/prepAiCheckApi'
import { getPrepAiCheckCachedResponse } from '../../utils/prepAiCheck/storage'
import { isDemoCase } from '../../demo/demoReadOnly'
import { getClinicalApiLanguage } from '../../services/clinicalApiFetch'
import { ClinicalLoading } from '../ui/ClinicalLoading'

interface PreparationDrugBlockProps {
  caseId: string
  med: MedicationEntry
  kbPreparations: MedicationMarketAvailability[]
  country: PrescribingCountryCode
  language: UiLanguage
  canRunAi: boolean
  disabled?: boolean
  bulkLoading?: boolean
  onRegisterRunCheck?: (medId: string, run: () => Promise<boolean>) => void
  onUnregisterRunCheck?: (medId: string) => void
}

function kbToSummary(prep: MedicationMarketAvailability) {
  return {
    tradeName: prep.tradeName,
    strength: formatPreparationStrength(prep),
    form: prep.dosageForm,
  }
}

function aiPrepKey(prep: PrepAiCheckPreparation): string {
  return [prep.brandName, prep.strength, prep.form].map((v) => v.toLowerCase()).join('|')
}

function kbPrepKey(prep: MedicationMarketAvailability): string {
  return [prep.tradeName, formatPreparationStrength(prep), prep.dosageForm]
    .map((v) => v.toLowerCase())
    .join('|')
}

/** Collapse AI market table by default when this many supplemental rows are returned. */
const AI_DETAILS_COLLAPSE_THRESHOLD = 4

/** AI preparations not already covered by verified KB entries. */
function aiOnlyPreparations(
  ai: PrepAiCheckPreparation[],
  kb: MedicationMarketAvailability[],
): PrepAiCheckPreparation[] {
  const kbKeys = new Set(kb.map(kbPrepKey))
  return ai.filter((prep) => !kbKeys.has(aiPrepKey(prep)))
}

export function PreparationDrugBlock({
  caseId,
  med,
  kbPreparations,
  country,
  language,
  canRunAi,
  disabled = false,
  bulkLoading = false,
  onRegisterRunCheck,
  onUnregisterRunCheck,
}: PreparationDrugBlockProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<PrepAiCheckResponse | null>(() =>
    isDemoCase(caseId) ? getPrepAiCheckCachedResponse(caseId, med.id) : null,
  )
  const [aiDetailsOpen, setAiDetailsOpen] = useState(false)

  useEffect(() => {
    if (!isDemoCase(caseId)) return
    const cached = getPrepAiCheckCachedResponse(caseId, med.id)
    if (cached) setAiResult(cached)
  }, [caseId, med.id])

  const runCheck = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const result = await runPrepAiCheck({
        caseId,
        substance: med.substance,
        country,
        language: language ?? getClinicalApiLanguage(),
        selectedDrug: {
          substance: med.substance,
          strength: med.strength,
          formulation: med.formulation,
        },
        kbPreparations: kbPreparations.map(kbToSummary),
      })
      setAiResult(result)
      if (result.aiWarning) setError(result.aiWarning)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'KI-Anfrage fehlgeschlagen: Verfügbarkeitsprüfung fehlgeschlagen')
      return false
    } finally {
      setLoading(false)
    }
  }, [caseId, country, kbPreparations, language, med.formulation, med.strength, med.substance])

  useEffect(() => {
    onRegisterRunCheck?.(med.id, runCheck)
    return () => onUnregisterRunCheck?.(med.id)
  }, [med.id, onRegisterRunCheck, onUnregisterRunCheck, runCheck])

  const supplementalAi = aiResult ? aiOnlyPreparations(aiResult.preparations, kbPreparations) : []
  const isLoading = loading || bulkLoading
  const aiQuelle = aiResult ? formatPrepAiQuelleLabel(language, aiResult) : null

  useEffect(() => {
    if (!aiResult) return
    const count = aiOnlyPreparations(aiResult.preparations, kbPreparations).length
    setAiDetailsOpen(count < AI_DETAILS_COLLAPSE_THRESHOLD)
  }, [aiResult, kbPreparations])

  return (
    <section className="medication-preparations-overview__drug">
      <div className="medication-preparations-overview__head">
        <h5 className="medication-preparations-overview__title">
          {med.substance} — {translateMedicationUi(language, 'medPreparationsInCountry')}{' '}
          {PRESCRIBING_COUNTRY_NATIVE_LABELS[country]}:
        </h5>
        {canRunAi ? (
          <button
            type="button"
            className="medication-prep-ai-btn"
            disabled={disabled || isLoading}
            onClick={() => void runCheck()}
            title={translateMedicationUi(language, 'medPrepAiCheckTitle')}
            aria-label={translateMedicationUi(language, 'medPrepAiCheckTitle')}
          >
            <Sparkles
              className={`medication-prep-ai-btn__icon${isLoading ? ' medication-prep-ai-btn__icon--spin' : ''}`}
              strokeWidth={1.75}
              aria-hidden
            />
            {isLoading
              ? translateMedicationUi(language, 'medPrepAiCheckRunning')
              : translateMedicationUi(language, 'medPrepAiCheckButton')}
          </button>
        ) : null}
      </div>

      {kbPreparations.length > 0 ? (
        <div className="medication-prep-block">
          <p className="medication-prep-block__label">
            <span className="medication-prep-source-badge medication-prep-source-badge--kb">
              {translateMedicationUi(language, 'medPrepSourceKb')}
            </span>
          </p>
          <ul className="medication-prep-compact-list">
            {kbPreparations.slice(0, 12).map((prep) => (
              <li key={prep.id}>{formatPreparationLine(prep)}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="medication-lower-section__hint medication-preparations-overview__no-kb">
          {translateMedicationUi(language, 'medPreparationsNoKbForDrug')}
        </p>
      )}

      {isLoading ? (
        <ClinicalLoading
          variant="inline"
          label={translateMedicationUi(language, 'medPrepAiCheckRunning')}
          className="medication-prep-ai-loading"
        />
      ) : null}

      {error ? <p className="medication-prep-ai-error">{error}</p> : null}

      {aiResult && !isLoading ? (
        <details
          className="medication-prep-ai-details"
          open={aiDetailsOpen}
          onToggle={(event) => setAiDetailsOpen(event.currentTarget.open)}
        >
          <summary className="medication-prep-ai-details__summary">
            <span className="medication-prep-source-badge medication-prep-source-badge--ai">
              {translateMedicationUi(language, 'medPrepSourceAi')}
            </span>
            {aiQuelle ? (
              <span className="medication-prep-quelle">
                {translateMedicationUi(language, 'medPrepSourceQuelle')}: {aiQuelle}
              </span>
            ) : null}
            <span className="medication-prep-ai-details__title">
              ({supplementalAi.length} {translateMedicationUi(language, 'medPrepAiPrepCount')})
            </span>
            <span className="medication-prep-ai-details__hint" aria-hidden="true">
              {aiDetailsOpen
                ? translateMedicationUi(language, 'medPrepAiCollapseHide')
                : translateMedicationUi(language, 'medPrepAiCollapseShow')}
            </span>
            <span className="medication-prep-ai-details__chevron" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="medication-prep-ai-details__body">
            {supplementalAi.length === 0 ? (
              <p className="medication-lower-section__hint">
                {translateMedicationUi(language, 'medPrepAiNoSupplement')}
              </p>
            ) : (
              <table className="medication-prep-table medication-prep-table--compact">
                <thead>
                  <tr>
                    <th>{translateMedicationUi(language, 'medPrepColBrand')}</th>
                    <th>{translateMedicationUi(language, 'medPrepColStrength')}</th>
                    <th>{translateMedicationUi(language, 'medPrepColForm')}</th>
                    <th>{translateMedicationUi(language, 'medPrepColNote')}</th>
                  </tr>
                </thead>
                <tbody>
                  {supplementalAi.map((prep) => (
                    <tr key={aiPrepKey(prep)}>
                      <td>{prep.brandName}</td>
                      <td>{prep.strength}</td>
                      <td>{prep.form}</td>
                      <td>
                        {[prep.availabilityNote, prep.sourceHint].filter(Boolean).join(' · ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="medication-prep-ai-disclaimer">
              {aiResult.disclaimer || translateMedicationUi(language, 'medPrepAiDisclaimer')}
            </p>
          </div>
        </details>
      ) : null}
    </section>
  )
}
