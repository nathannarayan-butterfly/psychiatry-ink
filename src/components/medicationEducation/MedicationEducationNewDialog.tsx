import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AiMode } from '../../types/aiUsage'
import type { MedicationEntry } from '../../types/medicationPlan'
import type {
  MedicationEducationDetailStyle,
  MedicationEducationLanguage,
  MedicationEducationPreGenerationPanel,
  MedicationEducationScope,
} from '../../types/medicationEducation'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import { useTranslation } from '../../context/TranslationContext'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface MedicationEducationNewDialogProps {
  open: boolean
  initialScope: MedicationEducationScope
  initialMedicationIds: string[]
  availableMedications: MedicationEntry[]
  onClose: () => void
  onCreate: (params: {
    scope: MedicationEducationScope
    detailStyle: MedicationEducationDetailStyle
    aiMode: AiMode
    language: MedicationEducationLanguage
    medicationIds: string[]
    primaryMedicationId?: string
    includeMedTable: boolean
    includeMonitoringPlan: boolean
    includeSignatureArea: boolean
    includePregnancy: boolean
  }) => void
  loadSafetyPanel: (params: {
    scope: MedicationEducationScope
    medicationIds: string[]
  }) => Promise<MedicationEducationPreGenerationPanel>
  resolveMedicationIds: (
    scope: MedicationEducationScope,
    singleMedicationId: string | null,
  ) => string[]
}

export function MedicationEducationNewDialog({
  open,
  initialScope,
  initialMedicationIds,
  availableMedications,
  onClose,
  onCreate,
  loadSafetyPanel,
  resolveMedicationIds,
}: MedicationEducationNewDialogProps) {
  const { language } = useTranslation()
  const [scope, setScope] = useState<MedicationEducationScope>(initialScope)
  const [singleMedicationId, setSingleMedicationId] = useState<string>(
    initialMedicationIds[0] ?? availableMedications[0]?.id ?? '',
  )
  const [detailStyle, setDetailStyle] = useState<MedicationEducationDetailStyle>('standard')
  const [aiMode, setAiMode] = useState<AiMode>('standard')
  const [docLanguage, setDocLanguage] = useState<MedicationEducationLanguage>(language === 'en' ? 'en' : 'de')
  const [includeMedTable, setIncludeMedTable] = useState(true)
  const [includeMonitoringPlan, setIncludeMonitoringPlan] = useState(true)
  const [includeSignatureArea, setIncludeSignatureArea] = useState(true)
  const [includePregnancy, setIncludePregnancy] = useState(false)
  const [panel, setPanel] = useState<MedicationEducationPreGenerationPanel | null>(null)
  const [loadingPanel, setLoadingPanel] = useState(false)

  const medicationIds = useMemo(
    () => resolveMedicationIds(scope, scope === 'single' ? singleMedicationId || null : null),
    [resolveMedicationIds, scope, singleMedicationId],
  )

  const refreshPanel = useCallback(() => {
    if (medicationIds.length === 0) {
      setPanel(null)
      return
    }
    setLoadingPanel(true)
    void loadSafetyPanel({ scope, medicationIds })
      .then(setPanel)
      .finally(() => setLoadingPanel(false))
  }, [loadSafetyPanel, medicationIds, scope])

  useEffect(() => {
    if (open) {
      setScope(initialScope)
      setSingleMedicationId(initialMedicationIds[0] ?? availableMedications[0]?.id ?? '')
    }
  }, [availableMedications, initialMedicationIds, initialScope, open])

  useEffect(() => {
    if (!open) return
    refreshPanel()
  }, [open, refreshPanel])

  useEffect(() => {
    if (panel?.recommendGruendlich && aiMode === 'standard' && scope !== 'single') {
      setAiMode('gruendlich')
    }
  }, [panel, aiMode, scope])

  const canCreate =
    scope === 'full_combination'
      ? availableMedications.length > 0
      : scope === 'single'
        ? Boolean(singleMedicationId)
        : medicationIds.length > 0

  if (!open) return null

  return (
    <div className="arztbrief-dialog-backdrop" role="dialog" aria-modal="true">
      <div className="arztbrief-dialog medication-education-dialog">
        <h2 className="arztbrief-dialog__title">
          {translateMedicationUi(language, 'medEducationNewTitle')}
        </h2>

        <label className="arztbrief-dialog__field">
          <span>{translateMedicationUi(language, 'medEducationScope')}</span>
          <select value={scope} onChange={(e) => setScope(e.target.value as MedicationEducationScope)}>
            <option value="single">{translateMedicationUi(language, 'medEducationScopeSingle')}</option>
            <option value="selected" disabled={initialMedicationIds.length === 0}>
              {translateMedicationUi(language, 'medEducationScopeSelected')}
            </option>
            <option value="full_combination">{translateMedicationUi(language, 'medEducationScopeFull')}</option>
          </select>
        </label>

        {scope === 'single' ? (
          <label className="arztbrief-dialog__field">
            <span>{translateMedicationUi(language, 'medEducationSelectMedication')}</span>
            <select
              value={singleMedicationId}
              onChange={(e) => setSingleMedicationId(e.target.value)}
              disabled={availableMedications.length === 0}
            >
              {availableMedications.length === 0 ? (
                <option value="">{translateMedicationUi(language, 'medEducationEmpty')}</option>
              ) : (
                availableMedications.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.substance} — {m.doseLineGerman}
                  </option>
                ))
              )}
            </select>
          </label>
        ) : null}

        <label className="arztbrief-dialog__field">
          <span>{translateMedicationUi(language, 'medEducationLanguage')}</span>
          <select
            value={docLanguage}
            onChange={(e) => setDocLanguage(e.target.value as MedicationEducationLanguage)}
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </label>

        <label className="arztbrief-dialog__field">
          <span>{translateMedicationUi(language, 'medEducationDetail')}</span>
          <select
            value={detailStyle}
            onChange={(e) => setDetailStyle(e.target.value as MedicationEducationDetailStyle)}
          >
            <option value="einfach">{translateMedicationUi(language, 'medEducationDetailSimple')}</option>
            <option value="standard">{translateMedicationUi(language, 'medEducationDetailStandard')}</option>
            <option value="ausfuehrlich">{translateMedicationUi(language, 'medEducationDetailDetailed')}</option>
          </select>
        </label>

        <label className="arztbrief-dialog__field">
          <span>{translateMedicationUi(language, 'medEducationAiMode')}</span>
          <select value={aiMode} onChange={(e) => setAiMode(e.target.value as AiMode)}>
            <option value="standard">{translateMedicationUi(language, 'medEducationModeStandard')}</option>
            <option value="gruendlich">{translateMedicationUi(language, 'medEducationModeGruendlich')}</option>
          </select>
        </label>

        <fieldset className="medication-education-dialog__toggles">
          <label>
            <input type="checkbox" checked={includeMedTable} onChange={(e) => setIncludeMedTable(e.target.checked)} />
            {translateMedicationUi(language, 'medEducationIncludeMedTable')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeMonitoringPlan}
              onChange={(e) => setIncludeMonitoringPlan(e.target.checked)}
            />
            {translateMedicationUi(language, 'medEducationIncludeMonitoring')}
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeSignatureArea}
              onChange={(e) => setIncludeSignatureArea(e.target.checked)}
            />
            {translateMedicationUi(language, 'medEducationIncludeSignature')}
          </label>
          <label>
            <input type="checkbox" checked={includePregnancy} onChange={(e) => setIncludePregnancy(e.target.checked)} />
            {translateMedicationUi(language, 'medEducationIncludePregnancy')}
          </label>
        </fieldset>

        <div className="arztbrief-coverage medication-education-safety">
          <p className="arztbrief-coverage__title">
            {translateMedicationUi(language, 'medEducationSafetyTitle')}
          </p>
          {loadingPanel ? (
            <p>
              <Loader2 size={14} className="spin" aria-hidden />{' '}
              {translateMedicationUi(language, 'medEducationLoadingPanel')}
            </p>
          ) : panel ? (
            <>
              <ul>
                {panel.medicationsIncluded.map((m) => (
                  <li key={m.id} className="ok">
                    {m.substance} — {m.doseLine}
                  </li>
                ))}
              </ul>
              {panel.kbCoverage.map((k) => (
                <p key={k.medicationId} className={k.coveragePercent >= 60 ? 'ok' : 'missing'}>
                  KB {k.substanceName}: {k.coveragePercent}%
                  {k.approvalStatus && k.approvalStatus !== 'approved' ? ` (${k.approvalStatus})` : ''}
                </p>
              ))}
              {panel.combinationWarnings.length > 0 ? (
                <p className="missing">
                  <AlertTriangle size={14} aria-hidden /> {panel.combinationWarnings.join('; ')}
                </p>
              ) : null}
              {panel.recommendGruendlich ? (
                <p className="missing">{panel.gruendlichReasons.join('; ')}</p>
              ) : null}
              <p>
                {translateMedicationUi(language, 'medEducationCreditEstimate')}: ~{panel.estimatedCredits}
              </p>
            </>
          ) : null}
        </div>

        <div className="arztbrief-dialog__actions">
          <button type="button" className="arztbrief-btn arztbrief-btn--ghost" onClick={onClose}>
            {translateMedicationUi(language, 'medEducationCancel')}
          </button>
          <button
            type="button"
            className="arztbrief-btn arztbrief-btn--primary"
            disabled={!canCreate}
            onClick={() => {
              onCreate({
                scope,
                detailStyle,
                aiMode,
                language: docLanguage,
                medicationIds,
                primaryMedicationId: scope === 'single' ? singleMedicationId : undefined,
                includeMedTable,
                includeMonitoringPlan,
                includeSignatureArea,
                includePregnancy,
              })
              onClose()
            }}
          >
            {translateMedicationUi(language, 'medEducationCreate')}
          </button>
        </div>
      </div>
    </div>
  )
}
