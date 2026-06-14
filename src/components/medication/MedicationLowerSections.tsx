import { useCallback, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import {
  DEMO_INTELLIGENCE,
  formatMedicationUiTemplate,
  getAttributionLabel,
  translateMedicationUi,
} from '../../data/medicationUiTranslations'
import { getDrugsForSubstance } from '../../data/psychDrugReference/index'
import {
  DEFAULT_MEDICATIONS_COLLECTION_ID,
  type KnowledgeBaseDrug,
  type MedicationMarketAvailability,
} from '../../types/knowledgeBase'
import { useKnowledgeBaseDrugs } from '../../hooks/useKnowledgeBaseDrugs'
import {
  isVerifiedPreparation,
  useMedicationMarketAvailability,
} from '../../hooks/useMedicationMarketAvailability'
import {
  PRESCRIBING_COUNTRY_LABELS,
  usePrescribingCountry,
} from '../../hooks/usePrescribingCountry'
import { useCanAccessCase } from '../../hooks/permissions/useCanAccessCase'
import { useCanAccessModule } from '../../hooks/permissions/useCanAccessModule'
import type { MedicationEntry, MedicationPlanState, SideEffectReport } from '../../types/medicationPlan'
import { isMedicationVisible } from '../../utils/medication/planOps'
import { medicationSectionDomId } from '../../contexts/MedicationSectionNavContext'
import { CombinationCheckPanel } from '../therapy/CombinationCheckPanel'
import { LabMedicationCorrelationPanel } from '../therapy/LabMedicationCorrelationPanel'
import { PreparationDrugBlock } from './PreparationDrugBlock'
import { ReceptorProfileSection } from './ReceptorProfileSection'
import { ReceptorRadarChart } from './ReceptorRadarChart'
import { GlobalSideEffectForm } from './SideEffectDialog'
import { MonitoringTimeline } from './MonitoringTimeline'
import { ClinicalLoading } from '../ui/ClinicalLoading'

/** Ordered medication sub-sections for sidebar navigation → detail panel. */
export const MEDICATION_SECTIONS = [
  { key: 'plan', labelKey: 'medPageTitle' },
  { key: 'combination', labelKey: 'medSectionCombination' },
  { key: 'preparations', labelKey: 'medSectionPreparations' },
  { key: 'receptor', labelKey: 'medSectionReceptorProfile' },
  { key: 'monitoring', labelKey: 'medSectionMonitoringTimeline' },
  { key: 'sideEffects', labelKey: 'medSectionSideEffects' },
  { key: 'lab', labelKey: 'medSectionLab' },
  { key: 'intelligence', labelKey: 'medSectionIntelligence' },
] as const

export type MedicationSectionKey = (typeof MEDICATION_SECTIONS)[number]['key']

interface MedicationLowerSectionsProps {
  caseId: string
  state: MedicationPlanState
  medications: MedicationEntry[]
  disabled?: boolean
  onReportSideEffect: (report: Omit<SideEffectReport, 'id'>) => void
  onLabNotesChange?: (notes: string) => void
  /**
   * Render mode (unified Therapie interaction model):
   * - 'links'  → left column: a list of section links; clicking selects one
   * - 'detail' → right column: the body/graph of the active section (or a
   *              "select a section" placeholder when none is active)
   */
  mode: 'links' | 'detail'
  activeSection?: MedicationSectionKey | null
  onSelectSection?: (key: MedicationSectionKey) => void
}

function normalizeMedicationName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9äöüß]/gi, '')
}

function findKbDrugMatches(med: MedicationEntry, drugs: KnowledgeBaseDrug[]): KnowledgeBaseDrug[] {
  const query = normalizeMedicationName(med.substance.trim())
  if (query.length < 2) return []
  return drugs.filter((drug) => {
    const names = [drug.genericName, ...drug.brandNames].map(normalizeMedicationName)
    return names.some((name) => name.includes(query) || query.includes(name))
  })
}

export function MedicationLowerSections({
  caseId,
  state,
  medications,
  disabled = false,
  onReportSideEffect,
  onLabNotesChange,
  mode,
  activeSection = null,
  onSelectSection,
}: MedicationLowerSectionsProps) {
  const { language } = useTranslation()
  const { drugs: knowledgeBaseDrugs } = useKnowledgeBaseDrugs(DEFAULT_MEDICATIONS_COLLECTION_ID)
  const { allPreparations } = useMedicationMarketAvailability()
  const { defaultPrescribingCountry } = usePrescribingCountry()
  const { canUseAI } = useCanAccessCase(caseId)
  const canViewMedication = useCanAccessModule(caseId, 'medication')
  const canRunPrepAi = canViewMedication && canUseAI
  const prepRunHandlersRef = useRef<Map<string, () => Promise<boolean>>>(new Map())
  const [bulkPrepRun, setBulkPrepRun] = useState<{
    active: boolean
    current: number
    total: number
    currentMedId: string | null
    failedCount: number
  }>({ active: false, current: 0, total: 0, currentMedId: null, failedCount: 0 })

  const activeMeds = medications.filter(
    (med) =>
      isMedicationVisible(med) &&
      (med.status === 'active' || med.status === 'reduced' || med.status === 'increased'),
  )

  const registerPrepRunCheck = useCallback((medId: string, run: () => Promise<boolean>) => {
    prepRunHandlersRef.current.set(medId, run)
  }, [])

  const unregisterPrepRunCheck = useCallback((medId: string) => {
    prepRunHandlersRef.current.delete(medId)
  }, [])

  const runAllPrepChecks = useCallback(async () => {
    if (bulkPrepRun.active) return
    const meds = activeMeds
    if (meds.length === 0) return

    setBulkPrepRun({
      active: true,
      current: 0,
      total: meds.length,
      currentMedId: null,
      failedCount: 0,
    })

    let failedCount = 0
    for (let index = 0; index < meds.length; index += 1) {
      const med = meds[index]!
      setBulkPrepRun((prev) => ({
        ...prev,
        current: index + 1,
        currentMedId: med.id,
      }))
      const run = prepRunHandlersRef.current.get(med.id)
      if (!run) {
        failedCount += 1
        continue
      }
      const ok = await run()
      if (!ok) failedCount += 1
    }

    setBulkPrepRun({
      active: false,
      current: 0,
      total: 0,
      currentMedId: null,
      failedCount,
    })
  }, [activeMeds, bulkPrepRun.active])

  const resolveKbPreparations = (med: MedicationEntry): MedicationMarketAvailability[] => {
    const matchedDrugs = findKbDrugMatches(med, knowledgeBaseDrugs)
    const matchedIds = new Set(matchedDrugs.map((drug) => drug.id))
    const query = normalizeMedicationName(med.substance)
    return allPreparations.filter((entry) => {
      if (entry.countryCode !== defaultPrescribingCountry) return false
      if (!isVerifiedPreparation(entry)) return false
      if (matchedIds.has(entry.substanceId)) return true
      const generic = normalizeMedicationName(entry.genericName)
      return generic.length >= 2 && (generic.includes(query) || query.includes(generic))
    })
  }

  const renderSideEffects = () => (
    <>
      <GlobalSideEffectForm
        medications={medications}
        disabled={disabled}
        onSave={onReportSideEffect}
      />
      {state.sideEffectReports.length > 0 ? (
        <ul className="medication-lower-section__list">
          {state.sideEffectReports.map((report) => {
            const suspected = medications.find((med) => med.id === report.suspectedMedicationId)
            return (
              <li key={report.id}>
                <strong>{report.symptom}</strong>
                {report.onsetDate ? ` · ${report.onsetDate}` : ''}
                {suspected ? ` · ${suspected.substance}` : ''}
                {report.attribution
                  ? ` · ${getAttributionLabel(report.attribution, language)}`
                  : ''}
                {report.note ? ` — ${report.note}` : ''}
              </li>
            )
          })}
        </ul>
      ) : null}
    </>
  )

  const renderCombination = () => (
    <CombinationCheckPanel
      caseId={caseId}
      medications={medications}
      state={state}
      disabled={disabled}
      language={language}
    />
  )

  const renderReceptor = () => (
    <ReceptorProfileSection
      activeMeds={activeMeds.map((med) => ({ id: med.id, substance: med.substance }))}
      drugs={knowledgeBaseDrugs}
      language={language}
    />
  )

  const renderPreparations = () => (
    <div className="medication-preparations-overview">
      <div className="medication-preparations-overview__toolbar">
        <p className="medication-lower-section__hint medication-preparations-overview__country">
          {translateMedicationUi(language, 'medPreparationsCountry')}: {defaultPrescribingCountry} ·{' '}
          {PRESCRIBING_COUNTRY_LABELS[defaultPrescribingCountry]}
        </p>
        {canRunPrepAi && activeMeds.length > 0 ? (
          <button
            type="button"
            className="medication-prep-ai-btn medication-prep-ai-btn--bulk"
            disabled={disabled || bulkPrepRun.active}
            onClick={() => void runAllPrepChecks()}
            title={translateMedicationUi(language, 'medPrepAiCheckAllTitle')}
          >
            <Sparkles
              className={`medication-prep-ai-btn__icon${bulkPrepRun.active ? ' medication-prep-ai-btn__icon--spin' : ''}`}
              strokeWidth={1.75}
              aria-hidden
            />
            {bulkPrepRun.active
              ? formatMedicationUiTemplate(language, 'medPrepAiCheckAllProgress', {
                  current: bulkPrepRun.current,
                  total: bulkPrepRun.total,
                })
              : translateMedicationUi(language, 'medPrepAiCheckAllButton')}
          </button>
        ) : null}
      </div>
      {bulkPrepRun.active ? (
        <ClinicalLoading
          variant="inline"
          label={formatMedicationUiTemplate(language, 'medPrepAiCheckAllProgress', {
            current: bulkPrepRun.current,
            total: bulkPrepRun.total,
          })}
          className="medication-prep-ai-loading medication-prep-ai-loading--bulk"
        />
      ) : null}
      {!bulkPrepRun.active && bulkPrepRun.failedCount > 0 ? (
        <p className="medication-prep-ai-error">
          {formatMedicationUiTemplate(language, 'medPrepAiCheckAllPartialWarning', {
            count: bulkPrepRun.failedCount,
          })}
        </p>
      ) : null}
      {activeMeds.length === 0 ? (
        <p className="medication-lower-section__empty">
          {translateMedicationUi(language, 'medPreparationsEmpty')}
        </p>
      ) : (
        activeMeds.map((med) => (
          <PreparationDrugBlock
            key={med.id}
            caseId={caseId}
            med={med}
            kbPreparations={resolveKbPreparations(med)}
            country={defaultPrescribingCountry}
            language={language}
            canRunAi={canRunPrepAi}
            disabled={disabled || bulkPrepRun.active}
            bulkLoading={bulkPrepRun.active && bulkPrepRun.currentMedId === med.id}
            onRegisterRunCheck={registerPrepRunCheck}
            onUnregisterRunCheck={unregisterPrepRunCheck}
          />
        ))
      )}
      <p className="medication-lower-section__disclaimer">
        {translateMedicationUi(language, 'medReferenceDisclaimer')}
      </p>
    </div>
  )

  const renderMonitoring = () => (
    <>
      <MonitoringTimeline medications={medications} language={language} />
      <p className="medication-lower-section__disclaimer">
        {translateMedicationUi(language, 'medReferenceDisclaimer')}
      </p>
    </>
  )

  const renderLab = () => (
    <LabMedicationCorrelationPanel
      caseId={caseId}
      medications={medications}
      state={state}
      disabled={disabled}
      onLabNotesChange={onLabNotesChange}
      language={language}
    />
  )

  const renderIntelligence = () =>
    medications.length === 0 ? (
      <p className="medication-lower-section__hint">{translateMedicationUi(language, 'medEmpty')}</p>
    ) : (
      <ul className="medication-intelligence-list">
        {medications.map((med) => {
          const refDrugs = getDrugsForSubstance(med.substance)
          if (refDrugs.length > 0) {
            const drug = refDrugs[0]!
            const kurzinfo = language === 'de' ? drug.kurzinfoDe : drug.kurzinfoEn
            const monitoringRules = drug.monitoringRules
            return (
              <li key={med.id} className="medication-intelligence-list__item">
                <details>
                  <summary>{med.substance}</summary>
                  <p className="medication-intelligence__kurzinfo">{kurzinfo}</p>
                  {drug.receptorProfile ? (
                    <ReceptorRadarChart
                      profile={drug.receptorProfile}
                      substanceName={drug.genericName}
                      language={language}
                    />
                  ) : null}
                  {monitoringRules.length > 0 ? (
                    <>
                      <p className="medication-intelligence__section-label">
                        {translateMedicationUi(language, 'medSectionMonitoring')}
                      </p>
                      <ul className="medication-monitoring-list">
                        {monitoringRules.map((rule, idx) => (
                          <li key={idx} className="medication-monitoring-list__item">
                            <strong>{rule.parameter}</strong>
                            {rule.frequency ? (
                              <span className="medication-monitoring__frequency">
                                {' · '}
                                {translateMedicationUi(language, 'medMonitoringFrequency')}
                                {': '}
                                {rule.frequency}
                              </span>
                            ) : null}
                            {rule.warningThreshold ? (
                              <span className="medication-monitoring__threshold">
                                {' · ⚠ '}{rule.warningThreshold}
                              </span>
                            ) : null}
                            <p className="medication-monitoring__note">
                              {language === 'de' ? rule.noteDe : rule.noteEn}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  <p className="medication-intelligence__disclaimer">
                    {translateMedicationUi(language, 'medReferenceDisclaimer')}
                  </p>
                  {drug.sources.length > 0 ? (
                    <p className="medication-intelligence__sources">
                      {translateMedicationUi(language, 'medKurzinfoSource')}
                      {': '}
                      {drug.sources.join(' · ')}
                    </p>
                  ) : null}
                </details>
              </li>
            )
          }

          const key = med.substance.trim().toLowerCase()
          const demo = Object.entries(DEMO_INTELLIGENCE).find(([name]) => key.includes(name))
          if (!demo) return null
          return (
            <li key={med.id} className="medication-intelligence-list__item">
              <details>
                <summary>{med.substance}</summary>
                <p>{demo[1].summary}</p>
                <p className="medication-intelligence__disclaimer">
                  {translateMedicationUi(language, 'medStrengthDemoHint')}
                </p>
              </details>
            </li>
          )
        })}
      </ul>
    )

  const renderActiveBody = (key: MedicationSectionKey) => {
    switch (key) {
      case 'combination':
        return renderCombination()
      case 'preparations':
        return renderPreparations()
      case 'receptor':
        return renderReceptor()
      case 'monitoring':
        return renderMonitoring()
      case 'sideEffects':
        return renderSideEffects()
      case 'lab':
        return renderLab()
      case 'intelligence':
        return renderIntelligence()
      default:
        return null
    }
  }

  if (mode === 'links') {
    return (
      <nav className="therapy-link-list">
        <p className="therapy-link-list__label">
          {translateMedicationUi(language, 'medSectionsLabel')}
        </p>
        {MEDICATION_SECTIONS.map((section) => (
          <button
            key={section.key}
            type="button"
            className={`therapy-link-list__item${activeSection === section.key ? ' is-active' : ''}`}
            onClick={() => onSelectSection?.(section.key)}
          >
            <span>{translateMedicationUi(language, section.labelKey)}</span>
            <span className="therapy-link-list__chevron" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </nav>
    )
  }

  if (!activeSection) {
    return (
      <div className="therapy-detail-empty">
        <p>{translateMedicationUi(language, 'medSelectSection')}</p>
        <p className="therapy-detail-empty__hint">
          {translateMedicationUi(language, 'medSelectSectionHint')}
        </p>
      </div>
    )
  }

  const activeLabelKey =
    MEDICATION_SECTIONS.find((section) => section.key === activeSection)?.labelKey ??
    'medSectionReceptorProfile'

  return (
    <div
      className="therapy-detail-panel"
      id={medicationSectionDomId(activeSection)}
    >
      <div className="therapy-detail-panel__head">
        <div className="therapy-detail-panel__heading">
          <h4 className="therapy-detail-panel__title">
            {translateMedicationUi(language, activeLabelKey)}
          </h4>
        </div>
      </div>
      <div className="therapy-detail-panel__body medication-lower-section__body">
        {renderActiveBody(activeSection)}
      </div>
    </div>
  )
}
