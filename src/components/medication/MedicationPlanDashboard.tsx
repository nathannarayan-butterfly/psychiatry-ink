import { useCallback, useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { translateMedicationUi } from '../../data/medicationUiTranslations'
import { DEFAULT_MEDICATIONS_COLLECTION_ID } from '../../types/knowledgeBase'
import { useKnowledgeBaseDrugs } from '../../hooks/useKnowledgeBaseDrugs'
import type { MedicationEntry } from '../../types/medicationPlan'
import {
  computeMedicationInsights,
  interactionLevel,
  type CombinationRiskKind,
  type RiskLevel,
} from '../../utils/medication/medicationInsights'
import { activeMedications } from '../../utils/medication/planOps'
import {
  computeCombinedReceptorFingerprint,
  computeZielrezeptorPickable,
  normalizeReceptorTarget,
  resolveReceptorProfiles,
  resolveZielrezeptorenBaseline,
  resolveZielrezeptorenDisplay,
} from '../../utils/medication/receptorBurden'
import type { InteractionEntry } from '../../data/psychDrugReference/schema'
import type { UiLanguage } from '../../types/settings'
import type { MedicationSectionKey } from './MedicationLowerSections'
import { CuratedTargetReceptors } from './CuratedTargetReceptors'
import { ReceptorRadarChart } from './ReceptorRadarChart'

type MedicationUiKey = Parameters<typeof translateMedicationUi>[1]

interface MedicationPlanDashboardProps {
  medications: MedicationEntry[]
  curatedTargetReceptors: string[] | undefined
  onCuratedTargetReceptorsChange: (targets: string[]) => void
  disabled?: boolean
  onOpenSection: (key: MedicationSectionKey) => void
}

const MAX_INTERACTIONS = 4
const MAX_MONITORING = 6

const RISK_LABEL_KEY: Record<CombinationRiskKind, MedicationUiKey> = {
  duplicateClass: 'medRiskDuplicateClass',
  anticholinergic: 'medRiskAnticholinergic',
  sedation: 'medRiskSedation',
  orthostatic: 'medRiskOrthostatic',
  qtc: 'medRiskQtc',
  serotonergic: 'medRiskSerotonergic',
}

const SEVERITY_LABEL_KEY: Record<InteractionEntry['severity'], MedicationUiKey> = {
  mild: 'medSeverityMild',
  moderate: 'medSeverityModerate',
  severe: 'medSeveritySevere',
  contraindicated: 'medSeverityContraindicated',
}

/**
 * At-a-glance clinical dashboard on the Medikation Plan landing view. Surfaces
 * the two headline analyses a psychiatrist wants in einem Blick — the combined
 * receptor-binding fingerprint of the active regimen, and the combination /
 * interaction risk picture — plus the cumulative monitoring burden. All values
 * are derived from real plan + reference data (see `computeMedicationInsights`),
 * with graceful empty states; deep dives stay one click away via the sections.
 */
export function MedicationPlanDashboard({
  medications,
  curatedTargetReceptors,
  onCuratedTargetReceptorsChange,
  disabled = false,
  onOpenSection,
}: MedicationPlanDashboardProps) {
  const { language } = useTranslation()
  const { drugs: knowledgeBaseDrugs } = useKnowledgeBaseDrugs(DEFAULT_MEDICATIONS_COLLECTION_ID)
  const insights = useMemo(
    () => computeMedicationInsights(medications, language),
    [medications, language],
  )

  const { combinedFingerprint, resolved, zielrezeptoren, pickable } = useMemo(() => {
    const activeMeds = activeMedications(medications)
    const resolvedProfiles = resolveReceptorProfiles(
      activeMeds.map((med) => ({ id: med.id, substance: med.substance })),
      knowledgeBaseDrugs,
    )
    return {
      // Full regimen fingerprint — never filtered by curated Zielrezeptoren whitelist.
      combinedFingerprint: computeCombinedReceptorFingerprint(resolvedProfiles),
      resolved: resolvedProfiles,
      zielrezeptoren: resolveZielrezeptorenDisplay(
        curatedTargetReceptors,
        resolvedProfiles,
        language,
      ),
      pickable: computeZielrezeptorPickable(curatedTargetReceptors, resolvedProfiles, language),
    }
  }, [medications, knowledgeBaseDrugs, language, curatedTargetReceptors])

  const addCurated = useCallback(
    (target: string) => {
      const norm = normalizeReceptorTarget(target)
      const baseline = resolveZielrezeptorenBaseline(curatedTargetReceptors, resolved, language)
      if (baseline.some((t) => t === norm)) return
      onCuratedTargetReceptorsChange([...baseline, norm])
    },
    [curatedTargetReceptors, onCuratedTargetReceptorsChange, resolved, language],
  )

  const removeCurated = useCallback(
    (target: string) => {
      const norm = normalizeReceptorTarget(target)
      const baseline = resolveZielrezeptorenBaseline(curatedTargetReceptors, resolved, language)
      onCuratedTargetReceptorsChange(baseline.filter((t) => t !== norm))
    },
    [curatedTargetReceptors, onCuratedTargetReceptorsChange, resolved, language],
  )

  const interactions = insights.crossInteractions.slice(0, MAX_INTERACTIONS)
  const monitoring = insights.monitoringBurden.slice(0, MAX_MONITORING)
  const hasReceptorData =
    combinedFingerprint !== null || zielrezeptoren.length > 0 || resolved.length > 0
  const hasKombi = insights.combinationRisks.length > 0 || interactions.length > 0

  return (
    <section className="medication-dashboard" aria-label={translateMedicationUi(language, 'medDashHeading')}>
      <p className="medication-dashboard__heading">{translateMedicationUi(language, 'medDashHeading')}</p>
      <div className="medication-dashboard__grid">
        {/* ── Combined receptor profile ─────────────────────────────── */}
        <article className="medication-dash-panel medication-dash-panel--receptor">
          <header className="medication-dash-panel__head">
            <div>
              <h3 className="medication-dash-panel__title">
                {translateMedicationUi(language, 'medDashReceptorTitle')}
              </h3>
              <p className="medication-dash-panel__hint">
                {translateMedicationUi(language, 'medDashReceptorHint')}
              </p>
            </div>
            <DetailButton onClick={() => onOpenSection('receptor')} language={language} />
          </header>
          {hasReceptorData ? (
            <div className="medication-dash-panel__receptor-body">
              {combinedFingerprint && combinedFingerprint.targets.length >= 3 ? (
                <div className="medication-dash-panel__receptor-combined">
                  <ReceptorRadarChart
                    affinityTargets={combinedFingerprint.targets}
                    substanceName={translateMedicationUi(language, 'medDashReceptorTitle')}
                    language={language}
                    variant="inline"
                  />
                </div>
              ) : null}
              <div className="medication-dash-panel__receptor-targets">
                <CuratedTargetReceptors
                  receptors={zielrezeptoren}
                  pickable={pickable}
                  onAdd={addCurated}
                  onRemove={removeCurated}
                  disabled={disabled}
                  variant="rows"
                  language={language}
                />
              </div>
            </div>
          ) : (
            <p className="medication-dash-panel__empty">
              {translateMedicationUi(language, 'medDashReceptorEmpty')}
            </p>
          )}
        </article>

        {/* ── Combination / interaction analysis ────────────────────── */}
        <article className="medication-dash-panel medication-dash-panel--kombi">
          <header className="medication-dash-panel__head">
            <div className="medication-dash-panel__title-row">
              <h3 className="medication-dash-panel__title">
                {translateMedicationUi(language, 'medDashKombiTitle')}
              </h3>
              {insights.combinationRiskLevel ? (
                <RiskBadge level={insights.combinationRiskLevel} language={language} />
              ) : null}
            </div>
            <DetailButton onClick={() => onOpenSection('combination')} language={language} />
          </header>
          {hasKombi ? (
            <>
              {insights.combinationRisks.length > 0 ? (
                <ul className="medication-risk-list">
                  {insights.combinationRisks.map((risk) => (
                    <li
                      key={`${risk.kind}-${risk.detail ?? ''}`}
                      className={`medication-risk medication-risk--${risk.level}`}
                    >
                      <span className="medication-risk__dot" aria-hidden="true" />
                      <span className="medication-risk__label">
                        {translateMedicationUi(language, RISK_LABEL_KEY[risk.kind])}
                        {risk.kind === 'duplicateClass' && risk.detail ? ` · ${risk.detail}` : ''}
                      </span>
                      <span className="medication-risk__drugs" title={risk.drugs.join(', ')}>
                        {risk.drugs.join(' + ')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {interactions.length > 0 ? (
                <div className="medication-dash-panel__interactions">
                  <p className="medication-dash-panel__subhead">
                    {translateMedicationUi(language, 'medDashKombiInteractions')}
                  </p>
                  <ul className="medication-interaction-rows">
                    {interactions.map((interaction) => (
                      <li
                        key={`${interaction.drugA}-${interaction.drugB}`}
                        className={`medication-interaction-row medication-interaction-row--${interactionLevel(interaction.severity)}`}
                      >
                        <span className="medication-interaction-row__pair">
                          {interaction.drugA} + {interaction.drugB}
                        </span>
                        <span className="medication-interaction-row__severity">
                          {translateMedicationUi(language, SEVERITY_LABEL_KEY[interaction.severity])}
                        </span>
                        <span className="medication-interaction-row__note" title={interaction.note}>
                          {interaction.note}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <p className="medication-dash-panel__empty">
              {translateMedicationUi(language, 'medDashKombiEmpty')}
            </p>
          )}
        </article>

        {/* ── Monitoring burden ─────────────────────────────────────── */}
        <article className="medication-dash-panel medication-dash-panel--monitoring">
          <header className="medication-dash-panel__head">
            <h3 className="medication-dash-panel__title">
              {translateMedicationUi(language, 'medDashMonitoringTitle')}
            </h3>
            <DetailButton onClick={() => onOpenSection('monitoring')} language={language} />
          </header>
          {monitoring.length > 0 ? (
            <ul className="medication-monitoring-burden">
              {monitoring.map((item) => (
                <li key={item.parameter} className="medication-monitoring-burden__row">
                  <span className="medication-monitoring-burden__param">{item.parameter}</span>
                  <span
                    className="medication-monitoring-burden__drugs"
                    title={item.drugs.join(', ')}
                  >
                    {item.drugs.join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="medication-dash-panel__empty">
              {translateMedicationUi(language, 'medDashMonitoringEmpty')}
            </p>
          )}
        </article>
      </div>
    </section>
  )
}

function DetailButton({ onClick, language }: { onClick: () => void; language: UiLanguage }) {
  return (
    <button type="button" className="medication-dash-panel__detail" onClick={onClick}>
      {translateMedicationUi(language, 'medDashOpenSection')}
      <ArrowRight size={13} strokeWidth={2} aria-hidden />
    </button>
  )
}

function RiskBadge({ level, language }: { level: RiskLevel; language: UiLanguage }) {
  const key =
    level === 'high' ? 'medRiskLevelHigh' : level === 'moderate' ? 'medRiskLevelModerate' : 'medRiskLevelInfo'
  return (
    <span className={`medication-risk-badge medication-risk-badge--${level}`}>
      {translateMedicationUi(language, key)}
    </span>
  )
}
