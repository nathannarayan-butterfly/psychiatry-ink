import { useCallback, useRef, useState } from 'react'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import {
  DEMO_INTELLIGENCE,
  formatMedicationUiTemplate,
  getAttributionLabel,
  getStatusLabel,
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
import { activeMedications } from '../../utils/medication/planOps'
import { medicationSectionDomId } from '../../contexts/MedicationSectionNavContext'
import { MEDICATION_SECTION_META } from './medicationSectionMeta'
import { CombinationCheckPanel } from '../therapy/CombinationCheckPanel'
import { LabMedicationCorrelationPanel } from '../therapy/LabMedicationCorrelationPanel'
import { PreparationDrugBlock } from './PreparationDrugBlock'
import { ReceptorProfileSection } from './ReceptorProfileSection'
import { ReceptorRadarChart } from './ReceptorRadarChart'
import { GlobalSideEffectForm } from './SideEffectDialog'
import { MonitoringTimeline } from './MonitoringTimeline'
import { ParameterMonitoringList } from '../clinical/ParameterMonitoringList'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import { loadBefunde } from '../../utils/laborArchive'
import { getParameterMonitoringRows } from '../../utils/overview/medicationMonitoring'

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
  { key: 'education', labelKey: 'medEducationPanelTitle' },
] as const

export type MedicationSectionKey = (typeof MEDICATION_SECTIONS)[number]['key']

/** Maps medication status onto the shared therapy status-pill palette. */
const MED_STATUS_TONE: Record<string, string> = {
  active: 'green',
  reduced: 'blue',
  increased: 'violet',
  paused: 'amber',
  discontinued: 'gray',
}

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
  /** When provided, renders a "back to plan" control in the detail header. */
  onBack?: () => void
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
  onBack,
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

  const activeMeds = activeMedications(medications)

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

  const renderRegimenBar = () => {
    if (activeMeds.length === 0) return null
    return (
      <div className="medication-regimen-bar">
        <span className="medication-regimen-bar__label">
          {translateMedicationUi(language, 'medActiveRegimen')}
        </span>
        <ul className="medication-regimen-bar__chips">
          {activeMeds.map((med) => (
            <li key={med.id} className="medication-regimen-chip">
              <span className="medication-regimen-chip__name">
                {med.substance}
                {med.displayBrandName ? (
                  <span className="medication-regimen-chip__brand"> ({med.displayBrandName})</span>
                ) : null}
              </span>
              {med.doseLineGerman ? (
                <span className="medication-regimen-chip__dose">{med.doseLineGerman}</span>
              ) : null}
              <span
                className={`therapy-status therapy-status--${MED_STATUS_TONE[med.status] ?? 'gray'}`}
              >
                {getStatusLabel(med.status, language)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const renderSideEffects = () => {
    const recorded = activeMeds.filter((med) => med.sideEffects.length > 0)
    return (
      <>
        {recorded.length > 0 ? (
          <div className="medication-se-recorded">
            <p className="medication-lower-section__subhead">
              {translateMedicationUi(language, 'medSideEffectsRecorded')}
            </p>
            <ul className="medication-se-recorded__list">
              {recorded.map((med) => (
                <li key={med.id} className="medication-se-recorded__item">
                  <span className="medication-se-recorded__drug">{med.substance}</span>
                  <span className="medication-se-recorded__chips">
                    {med.sideEffects.map((effect, idx) => (
                      <span key={idx} className="medication-se-recorded__chip">
                        {effect}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <GlobalSideEffectForm
          medications={medications}
          disabled={disabled}
          onSave={onReportSideEffect}
        />

        {state.sideEffectReports.length > 0 ? (
          <div className="medication-se-reports">
            <p className="medication-lower-section__subhead">
              {translateMedicationUi(language, 'medSideEffectsReportsTitle')} ({state.sideEffectReports.length})
            </p>
            <ul className="medication-se-reports__list">
              {state.sideEffectReports.map((report) => {
                const suspected = medications.find((med) => med.id === report.suspectedMedicationId)
                return (
                  <li key={report.id} className="medication-se-report">
                    <div className="medication-se-report__head">
                      <strong className="medication-se-report__symptom">{report.symptom}</strong>
                      {report.severity ? (
                        <span className="medication-se-report__severity">{report.severity}</span>
                      ) : null}
                      {report.attribution ? (
                        <span className="medication-se-report__attribution">
                          {getAttributionLabel(report.attribution, language)}
                        </span>
                      ) : null}
                    </div>
                    <div className="medication-se-report__meta">
                      {report.onsetDate ? <span>{report.onsetDate}</span> : null}
                      {suspected ? <span>{suspected.substance}</span> : null}
                      {report.temporalRelation ? <span>{report.temporalRelation}</span> : null}
                      {report.actionTaken ? <span>{report.actionTaken}</span> : null}
                      {report.outcome ? <span>{report.outcome}</span> : null}
                    </div>
                    {report.note ? (
                      <p className="medication-se-report__note">{report.note}</p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </>
    )
  }

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

  const renderMonitoring = () => {
    const parameterMonitoring = getParameterMonitoringRows({
      medications,
      befunde: loadBefunde(caseId),
    })
    return (
      <>
        {parameterMonitoring.length > 0 ? (
          <div className="medication-lab-monitoring">
            <p className="medication-lower-section__subhead">
              {translateMedicationUi(language, 'medLabMonitoringTitle')}
            </p>
            <ParameterMonitoringList
              rows={parameterMonitoring}
              notDocumentedLabel={translateMedicationUi(language, 'medLabMonitoringNotDocumented')}
            />
          </div>
        ) : null}
        <MonitoringTimeline medications={medications} language={language} />
        <p className="medication-lower-section__disclaimer">
          {translateMedicationUi(language, 'medReferenceDisclaimer')}
        </p>
      </>
    )
  }

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
    activeMeds.length === 0 ? (
      <p className="medication-lower-section__hint">{translateMedicationUi(language, 'medEmptyNoActive')}</p>
    ) : (
      <ul className="medication-intelligence-list">
        {activeMeds.map((med) => {
          const refDrugs = getDrugsForSubstance(med.substance)
          if (refDrugs.length > 0) {
            const drug = refDrugs[0]!
            const kurzinfo = language === 'de' ? drug.kurzinfoDe : drug.kurzinfoEn
            const monitoringRules = drug.monitoringRules
            const commonSe = language === 'de' ? drug.commonSideEffectsDe : drug.commonSideEffectsEn
            const seriousSe = language === 'de' ? drug.seriousSideEffectsDe : drug.seriousSideEffectsEn
            const interactions = drug.interactions
            return (
              <li key={med.id} className="medication-intelligence-card">
                <div className="medication-intelligence-card__head">
                  <div className="medication-intelligence-card__title">
                    <span className="medication-intelligence-card__substance">{med.substance}</span>
                    <span
                      className={`therapy-status therapy-status--${MED_STATUS_TONE[med.status] ?? 'gray'}`}
                    >
                      {getStatusLabel(med.status, language)}
                    </span>
                  </div>
                  <span className="medication-intelligence-card__class">{drug.substanceClass}</span>
                </div>

                <dl className="medication-intelligence-card__facts">
                  {med.doseLineGerman ? (
                    <div>
                      <dt>{translateMedicationUi(language, 'medDose')}</dt>
                      <dd>{med.doseLineGerman}</dd>
                    </div>
                  ) : null}
                  {med.indication ? (
                    <div>
                      <dt>{translateMedicationUi(language, 'medIndication')}</dt>
                      <dd>{med.indication}</dd>
                    </div>
                  ) : null}
                  {drug.atcCode ? (
                    <div>
                      <dt>ATC</dt>
                      <dd>{drug.atcCode}</dd>
                    </div>
                  ) : null}
                </dl>

                <p className="medication-intelligence__kurzinfo">{kurzinfo}</p>

                {drug.receptorProfile ? (
                  <ReceptorRadarChart
                    profile={drug.receptorProfile}
                    substanceName={drug.genericName}
                    language={language}
                  />
                ) : null}

                {commonSe.length > 0 ? (
                  <div className="medication-intelligence__block">
                    <p className="medication-intelligence__section-label">
                      {translateMedicationUi(language, 'medSideEffectsCommon')}
                    </p>
                    <div className="medication-intelligence__chips">
                      {commonSe.map((se, idx) => (
                        <span key={idx} className="medication-intelligence__chip">{se}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {seriousSe.length > 0 ? (
                  <div className="medication-intelligence__block">
                    <p className="medication-intelligence__section-label medication-intelligence__section-label--warn">
                      {translateMedicationUi(language, 'medSideEffectsSerious')}
                    </p>
                    <ul className="medication-intelligence__serious">
                      {seriousSe.map((se, idx) => (
                        <li key={idx}>{se}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {interactions.length > 0 ? (
                  <div className="medication-intelligence__block">
                    <p className="medication-intelligence__section-label">
                      {translateMedicationUi(language, 'medInteractionsLabel')}
                    </p>
                    <ul className="medication-interactions-list">
                      {interactions.slice(0, 5).map((interaction, idx) => (
                        <li key={idx} className="medication-interaction">
                          <span
                            className={`medication-interaction__severity medication-interaction__severity--${interaction.severity}`}
                          >
                            {interaction.interactsWith}
                          </span>
                          <span className="medication-interaction__note">
                            {language === 'de' ? interaction.clinicalNoteDe : interaction.clinicalNoteEn}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {monitoringRules.length > 0 ? (
                  <div className="medication-intelligence__block">
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
                  </div>
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
              </li>
            )
          }

          const key = med.substance.trim().toLowerCase()
          const demo = Object.entries(DEMO_INTELLIGENCE).find(([name]) => key.includes(name))
          if (!demo) return null
          return (
            <li key={med.id} className="medication-intelligence-card">
              <div className="medication-intelligence-card__head">
                <span className="medication-intelligence-card__substance">{med.substance}</span>
              </div>
              <p>{demo[1].summary}</p>
              <p className="medication-intelligence__disclaimer">
                {translateMedicationUi(language, 'medStrengthDemoHint')}
              </p>
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

  const meta = MEDICATION_SECTION_META[activeSection]
  const SectionIcon = meta.Icon

  return (
    <section
      className="medication-section-detail"
      data-section={activeSection}
      id={medicationSectionDomId(activeSection)}
    >
      <header className="medication-section-detail__head">
        {onBack ? (
          <button type="button" className="medication-section-detail__back" onClick={onBack}>
            <ArrowLeft size={14} aria-hidden />
            {translateMedicationUi(language, 'medBackToPlan')}
          </button>
        ) : null}
        <div className="medication-section-detail__title-row">
          <span className="medication-section-detail__icon" aria-hidden="true">
            <SectionIcon size={20} strokeWidth={1.85} />
          </span>
          <div className="medication-section-detail__heading">
            <h2 className="medication-section-detail__title">
              {translateMedicationUi(language, meta.labelKey)}
            </h2>
            <p className="medication-section-detail__desc">
              {translateMedicationUi(language, meta.descKey)}
            </p>
          </div>
        </div>
      </header>
      {renderRegimenBar()}
      <div className="medication-section-detail__body medication-lower-section__body">
        {renderActiveBody(activeSection)}
      </div>
    </section>
  )
}
