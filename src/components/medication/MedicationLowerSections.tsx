import { useTranslation } from '../../context/TranslationContext'
import {
  DEMO_INTELLIGENCE,
  getAttributionLabel,
  translateMedicationUi,
} from '../../data/medicationUiTranslations'
import { getDrugsForSubstance } from '../../data/psychDrugReference/index'
import type { InteractionEntry } from '../../data/psychDrugReference/schema'
import { DEFAULT_MEDICATIONS_COLLECTION_ID } from '../../types/knowledgeBase'
import { useKnowledgeBaseDrugs } from '../../hooks/useKnowledgeBaseDrugs'
import type { MedicationEntry, MedicationPlanState, SideEffectReport } from '../../types/medicationPlan'
import type { UiLanguage } from '../../types/settings'
import { InteractionMatrix } from './InteractionMatrix'
import { ReceptorProfileSection } from './ReceptorProfileSection'
import { ReceptorRadarChart } from './ReceptorRadarChart'
import { GlobalSideEffectForm } from './SideEffectDialog'
import { MonitoringTimeline } from './MonitoringTimeline'

interface MedicationLowerSectionsProps {
  state: MedicationPlanState
  medications: MedicationEntry[]
  disabled?: boolean
  onReportSideEffect: (report: Omit<SideEffectReport, 'id'>) => void
  onLabNotesChange?: (notes: string) => void
  /**
   * Which column the sections render into:
   * - 'main'  → textual / editing sections (side effects, lab notes, drug intelligence)
   * - 'aside' → visual / analytical widgets (interaction matrix, receptor profile, monitoring)
   * Defaults to rendering every section in a single column.
   */
  variant?: 'main' | 'aside' | 'all'
}

type InteractionSeverity = InteractionEntry['severity']

function severityClass(severity: InteractionSeverity): string {
  switch (severity) {
    case 'contraindicated':
    case 'severe':
      return 'medication-interaction--severe'
    case 'moderate':
      return 'medication-interaction--moderate'
    default:
      return 'medication-interaction--mild'
  }
}

function severityLabel(severity: InteractionSeverity, language: UiLanguage): string {
  switch (severity) {
    case 'contraindicated':
      return translateMedicationUi(language, 'medInteractionContraindicated')
    case 'severe':
      return translateMedicationUi(language, 'medInteractionSevere')
    case 'moderate':
      return translateMedicationUi(language, 'medInteractionModerate')
    default:
      return translateMedicationUi(language, 'medInteractionMild')
  }
}

export function MedicationLowerSections({
  state,
  medications,
  disabled = false,
  onReportSideEffect,
  onLabNotesChange,
  variant = 'all',
}: MedicationLowerSectionsProps) {
  const { language } = useTranslation()
  const showMain = variant === 'all' || variant === 'main'
  const showAside = variant === 'all' || variant === 'aside'
  const { drugs: knowledgeBaseDrugs } = useKnowledgeBaseDrugs(DEFAULT_MEDICATIONS_COLLECTION_ID)

  const activeMeds = medications.filter(
    (med) => med.status === 'active' || med.status === 'reduced' || med.status === 'increased',
  )

  const referenceEntries = activeMeds.map((med) => ({
    med,
    drugs: getDrugsForSubstance(med.substance),
  }))

  const coveredMeds = referenceEntries.filter((entry) => entry.drugs.length > 0)
  const uncoveredMeds = referenceEntries.filter((entry) => entry.drugs.length === 0)

  const crossInteractions: {
    drugA: string
    drugB: string
    interaction: InteractionEntry
  }[] = []

  for (let i = 0; i < coveredMeds.length; i++) {
    const entryA = coveredMeds[i]!
    for (let j = i + 1; j < coveredMeds.length; j++) {
      const entryB = coveredMeds[j]!
      for (const drugA of entryA.drugs) {
        for (const interaction of drugA.interactions) {
          const matchesBName = entryB.drugs.some((drugB) => {
            const target = interaction.interactsWith.toLowerCase()
            const generic = drugB.genericName.toLowerCase()
            const brands = drugB.brandNamesDACH?.map((b) => b.toLowerCase()) ?? []
            return (
              target.includes(generic) ||
              generic.includes(target) ||
              brands.some((b) => target.includes(b))
            )
          })
          if (matchesBName) {
            const alreadyAdded = crossInteractions.some(
              (x) =>
                x.interaction.interactsWith === interaction.interactsWith &&
                ((x.drugA === drugA.genericName && x.drugB === entryB.med.substance) ||
                  (x.drugB === drugA.genericName && x.drugA === entryB.med.substance)),
            )
            if (!alreadyAdded) {
              crossInteractions.push({
                drugA: drugA.genericName,
                drugB: entryB.med.substance,
                interaction,
              })
            }
          }
        }
      }
    }
  }

  return (
    <div className={`medication-lower-sections medication-lower-sections--${variant}`}>
      {showMain && (
      <details className="medication-lower-section medication-lower-section--side-effects">
        <summary>{translateMedicationUi(language, 'medSectionSideEffects')}</summary>
        <div className="medication-lower-section__body">
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
        </div>
      </details>
      )}

      {showAside && (
      <>
      <details className="medication-lower-section">
        <summary>{translateMedicationUi(language, 'medSectionCombination')}</summary>
        <div className="medication-lower-section__body">
          <InteractionMatrix
            activeMeds={activeMeds}
            crossInteractions={crossInteractions}
            language={language}
          />
          {crossInteractions.length > 0 ? (
            <>
              <ul className="medication-interaction-list">
                {crossInteractions.map((item, idx) => (
                  <li
                    key={idx}
                    className={`medication-interaction-list__item ${severityClass(item.interaction.severity)}`}
                  >
                    <span className="medication-interaction__badge">
                      {severityLabel(item.interaction.severity, language)}
                    </span>
                    <strong>
                      {item.drugA} ↔ {item.drugB}
                    </strong>
                    {item.interaction.mechanismNote ? (
                      <span className="medication-interaction__mechanism">
                        {' '}· {item.interaction.mechanismNote}
                      </span>
                    ) : null}
                    <p className="medication-interaction__note">
                      {language === 'de'
                        ? item.interaction.clinicalNoteDe
                        : item.interaction.clinicalNoteEn}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="medication-lower-section__disclaimer">
                {translateMedicationUi(language, 'medReferenceDisclaimer')}
              </p>
            </>
          ) : (
            <>
              <p className="medication-lower-section__warning">
                {translateMedicationUi(language, 'medCombinationWarning')}
              </p>
              {coveredMeds.length > 0 && uncoveredMeds.length === 0 ? (
                <p className="medication-lower-section__hint">
                  {translateMedicationUi(language, 'medNoInteractionsFound')}
                </p>
              ) : null}
            </>
          )}
          {uncoveredMeds.length > 0 ? (
            <p className="medication-lower-section__warning">
              {translateMedicationUi(language, 'medCombinationWarning')}
              {' ('}
              {uncoveredMeds.map((e) => e.med.substance).join(', ')}
              {')'}
            </p>
          ) : null}
        </div>
      </details>

      <details className="medication-lower-section" open={variant === 'aside'}>
        <summary>{translateMedicationUi(language, 'medSectionReceptorProfile')}</summary>
        <div className="medication-lower-section__body">
          <ReceptorProfileSection
            activeMeds={activeMeds.map((med) => ({ id: med.id, substance: med.substance }))}
            drugs={knowledgeBaseDrugs}
            language={language}
          />
        </div>
      </details>

      <details className="medication-lower-section">
        <summary>{translateMedicationUi(language, 'medSectionMonitoringTimeline')}</summary>
        <div className="medication-lower-section__body">
          <MonitoringTimeline medications={medications} language={language} />
          <p className="medication-lower-section__disclaimer">
            {translateMedicationUi(language, 'medReferenceDisclaimer')}
          </p>
        </div>
      </details>
      </>
      )}

      {showMain && (
      <>
      <details className="medication-lower-section">
        <summary>{translateMedicationUi(language, 'medSectionLab')}</summary>
        <div className="medication-lower-section__body">
          <textarea
            className="medication-lower-section__textarea"
            value={state.labCorrelationNotes ?? ''}
            onChange={(e) => onLabNotesChange?.(e.target.value)}
            placeholder={translateMedicationUi(language, 'medLabPlaceholder')}
            disabled={disabled}
            rows={4}
          />
        </div>
      </details>

      <details className="medication-lower-section">
        <summary>{translateMedicationUi(language, 'medSectionIntelligence')}</summary>
        <div className="medication-lower-section__body">
          {medications.length === 0 ? null : (
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
          )}
        </div>
      </details>
      </>
      )}
    </div>
  )
}
