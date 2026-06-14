import { useTranslation } from '../../context/TranslationContext'
import {
  DEMO_INTELLIGENCE,
  getAttributionLabel,
  translateMedicationUi,
} from '../../data/medicationUiTranslations'
import { getDrugsForSubstance } from '../../data/psychDrugReference/index'
import type { InteractionEntry } from '../../data/psychDrugReference/schema'
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
  PRESCRIBING_COUNTRY_NATIVE_LABELS,
  usePrescribingCountry,
} from '../../hooks/usePrescribingCountry'
import { formatPreparationLine } from '../../utils/kb/formatPreparationLine'
import type { MedicationEntry, MedicationPlanState, SideEffectReport } from '../../types/medicationPlan'
import type { UiLanguage } from '../../types/settings'
import { InteractionMatrix } from './InteractionMatrix'
import { ReceptorProfileSection } from './ReceptorProfileSection'
import { ReceptorRadarChart } from './ReceptorRadarChart'
import { GlobalSideEffectForm } from './SideEffectDialog'
import { MonitoringTimeline } from './MonitoringTimeline'

/** Ordered medication sub-sections shown as left-side links → right-side detail. */
export const MEDICATION_SECTIONS = [
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

  const activeMeds = medications.filter(
    (med) => med.status === 'active' || med.status === 'reduced' || med.status === 'increased',
  )

  const referenceEntries = activeMeds.map((med) => ({
    med,
    drugs: getDrugsForSubstance(med.substance),
  }))

  const coveredMeds = referenceEntries.filter((entry) => entry.drugs.length > 0)
  const uncoveredMeds = referenceEntries.filter((entry) => entry.drugs.length === 0)

  const preparationEntries: {
    med: MedicationEntry
    preparations: MedicationMarketAvailability[]
  }[] = activeMeds.map((med) => {
    const matchedDrugs = findKbDrugMatches(med, knowledgeBaseDrugs)
    const matchedIds = new Set(matchedDrugs.map((drug) => drug.id))
    const query = normalizeMedicationName(med.substance)
    const preparations = allPreparations.filter((entry) => {
      if (entry.countryCode !== defaultPrescribingCountry) return false
      if (!isVerifiedPreparation(entry)) return false
      if (matchedIds.has(entry.substanceId)) return true
      const generic = normalizeMedicationName(entry.genericName)
      return generic.length >= 2 && (generic.includes(query) || query.includes(generic))
    })
    return { med, preparations }
  })
  const medsWithPreparations = preparationEntries.filter((entry) => entry.preparations.length > 0)

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
    <>
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
    </>
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
      <p className="medication-lower-section__hint">
        {translateMedicationUi(language, 'medPreparationsCountry')}: {defaultPrescribingCountry} ·{' '}
        {PRESCRIBING_COUNTRY_LABELS[defaultPrescribingCountry]}
      </p>
      {medsWithPreparations.length === 0 ? (
        <p className="medication-lower-section__empty">
          {translateMedicationUi(language, 'medPreparationsEmpty')}
        </p>
      ) : (
        medsWithPreparations.map(({ med, preparations }) => (
          <section key={med.id} className="medication-preparations-overview__drug">
            <h5 className="medication-preparations-overview__title">
              {med.substance} — verfügbare Zubereitungen in{' '}
              {PRESCRIBING_COUNTRY_NATIVE_LABELS[defaultPrescribingCountry]}:
            </h5>
            <ul className="medication-prep-compact-list">
              {preparations.slice(0, 8).map((prep) => (
                <li key={prep.id}>{formatPreparationLine(prep)}</li>
              ))}
            </ul>
          </section>
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
    <textarea
      className="therapy-textarea"
      value={state.labCorrelationNotes ?? ''}
      onChange={(e) => onLabNotesChange?.(e.target.value)}
      placeholder={translateMedicationUi(language, 'medLabPlaceholder')}
      disabled={disabled}
      rows={4}
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
    <div className="therapy-detail-panel">
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
