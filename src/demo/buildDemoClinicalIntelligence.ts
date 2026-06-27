/**
 * Pre-baked Clinical Intelligence run for the demo patient.
 * Avoids live API calls during demos and homepage screenshots.
 */

import { CLINICAL_INTELLIGENCE_DIMENSIONS } from '../data/clinicalIntelligence/dimensions'
import { CLINICAL_INTELLIGENCE_MECHANISMS } from '../data/clinicalIntelligence/mechanisms'
import {
  CLINICAL_INTELLIGENCE_STATE_VERSION,
  type ClinicalIntelligenceCaseState,
  type ClinicalIntelligenceRunResponse,
  type DimensionalFinding,
  type MechanismHypothesis,
} from '../types/clinicalIntelligence'
import type { DemoLocale } from './demoLocale'
import { demoCaseIdForLocale } from './constants'

const BUILT_AT = '2026-06-14T10:00:00.000Z'

function dimName(id: DimensionalFinding['dimensionId']): string {
  return CLINICAL_INTELLIGENCE_DIMENSIONS.find((d) => d.id === id)?.nameEn ?? id
}

function mechLabel(id: MechanismHypothesis['mechanismId']): string {
  return CLINICAL_INTELLIGENCE_MECHANISMS.find((m) => m.id === id)?.labelEn ?? id
}

function buildLatestRun(): ClinicalIntelligenceRunResponse {
  const activeDimensions: DimensionalFinding[] = [
    {
      dimensionId: 'aberrant-salience-psychotic-meaning',
      dimensionName: dimName('aberrant-salience-psychotic-meaning'),
      severity: 3,
      confidence: 'high',
      longitudinalPattern: 'Escalated over 2 weeks with sleep loss and daily alcohol use; partial response after antipsychotic switch.',
      supportingEvidenceIds: ['aufnahme', 'therapie-verlauf', 'diagnosis'],
      contradictingEvidenceIds: [],
      clinicalSummary:
        'Persistent persecutory and surveillance beliefs with limited insight; content aligns with first-rank symptom cluster under stress.',
      uncertainty: 'Substance contribution vs primary psychosis remains partially unresolved.',
      missingData: 'Collateral history from outpatient team not yet available.',
      reviewStatus: 'accepted',
      source: 'evidence_based',
    },
    {
      dimensionId: 'sleep-circadian-regulation',
      dimensionName: dimName('sleep-circadian-regulation'),
      severity: 3,
      confidence: 'high',
      longitudinalPattern: 'Severe sleep restriction (<3 h/night) preceded decompensation; improving to 5–6 h on ward.',
      supportingEvidenceIds: ['aufnahme', 'therapie-verlauf'],
      contradictingEvidenceIds: [],
      clinicalSummary: 'Marked insomnia and circadian disruption — likely both precipitant and maintaining factor.',
      uncertainty: '',
      missingData: 'Actigraphy not performed.',
      reviewStatus: 'accepted',
      source: 'evidence_based',
    },
    {
      dimensionId: 'substance-addictive-contribution',
      dimensionName: dimName('substance-addictive-contribution'),
      severity: 3,
      confidence: 'moderate',
      longitudinalPattern: 'Daily alcohol (~0.5–1 L wine) until admission; abstinence since day of admission.',
      supportingEvidenceIds: ['aufnahme', 'medication'],
      contradictingEvidenceIds: [],
      clinicalSummary: 'Active substance use likely lowered threshold for psychotic relapse; abstinence is a treatment target.',
      uncertainty: 'Timeline does not fully explain 5-week symptom course alone.',
      missingData: 'Quantitative toxicology panel pending at discharge.',
      reviewStatus: 'pending',
      source: 'evidence_based',
    },
    {
      dimensionId: 'anxiety-threat-anticipation',
      dimensionName: dimName('anxiety-threat-anticipation'),
      severity: 2,
      confidence: 'moderate',
      longitudinalPattern: 'Situational anxiety in public spaces; overlaps with paranoid ideation.',
      supportingEvidenceIds: ['aufnahme'],
      contradictingEvidenceIds: [],
      clinicalSummary: 'Heightened threat anticipation — may amplify misinterpretation of neutral social cues.',
      uncertainty: '',
      missingData: '',
      reviewStatus: 'pending',
      source: 'evidence_based',
    },
    {
      dimensionId: 'negative-deficit-dimension',
      dimensionName: dimName('negative-deficit-dimension'),
      severity: 2,
      confidence: 'moderate',
      longitudinalPattern: 'Reduced drive and social withdrawal over past 3 months.',
      supportingEvidenceIds: ['therapie-verlauf'],
      contradictingEvidenceIds: [],
      clinicalSummary: 'Avolition and social disengagement present but less prominent than positive symptoms.',
      uncertainty: 'May improve as sleep and substance use stabilise.',
      missingData: '',
      reviewStatus: 'pending',
      source: 'evidence_based',
    },
    {
      dimensionId: 'affective-instability-emotion-regulation',
      dimensionName: dimName('affective-instability-emotion-regulation'),
      severity: 2,
      confidence: 'moderate',
      longitudinalPattern: 'Labile affect between irritable and anxious poles during admission.',
      supportingEvidenceIds: ['aufnahme', 'therapie-verlauf'],
      contradictingEvidenceIds: [],
      clinicalSummary: 'Emotional lability without sustained manic episode — monitor for mood polarity.',
      uncertainty: '',
      missingData: '',
      reviewStatus: 'accepted',
      source: 'evidence_based',
    },
    {
      dimensionId: 'functional-longitudinal-adaptation',
      dimensionName: dimName('functional-longitudinal-adaptation'),
      severity: 3,
      confidence: 'high',
      longitudinalPattern: 'Job loss and housing stress 3 months before admission; occupational function impaired.',
      supportingEvidenceIds: ['aufnahme', 'therapie-verlauf'],
      contradictingEvidenceIds: [],
      clinicalSummary: 'Psychosocial stressors and functional decline — discharge planning must address housing and work.',
      uncertainty: '',
      missingData: 'Social services assessment in progress.',
      reviewStatus: 'pending',
      source: 'evidence_based',
    },
  ]

  const activeMechanisms: MechanismHypothesis[] = [
    {
      mechanismId: 'dopamine-aberrant-salience-dysregulation',
      label: mechLabel('dopamine-aberrant-salience-dysregulation'),
      confidence: 'high',
      linkedDimensions: ['aberrant-salience-psychotic-meaning', 'sleep-circadian-regulation'],
      supportingEvidenceIds: ['diagnosis', 'therapie-verlauf'],
      contradictingEvidenceIds: [],
      clinicalImplication:
        'Positive symptoms and salience disturbances fit mesolimbic dopamine dysregulation — antipsychotic response supports this pathway.',
      treatmentRelevance:
        'Continue partial D2 agonist (aripiprazole); monitor for akathisia. Avoid prolactin-elevating agents given prior hyperprolactinaemia on risperidone.',
      uncertainty: 'Stimulant-induced dopamine surge may have contributed acutely.',
      reviewStatus: 'accepted',
      source: 'evidence_based',
    },
    {
      mechanismId: 'stress-system-hpa-axis-dysregulation',
      label: mechLabel('stress-system-hpa-axis-dysregulation'),
      confidence: 'moderate',
      linkedDimensions: ['sleep-circadian-regulation', 'anxiety-threat-anticipation', 'functional-longitudinal-adaptation'],
      supportingEvidenceIds: ['aufnahme', 'therapie-verlauf'],
      contradictingEvidenceIds: [],
      clinicalImplication: 'Chronic psychosocial stress and sleep deprivation may have sensitized stress-response systems.',
      treatmentRelevance: 'Sleep hygiene, stress management, and structured daily routine as adjuncts to antipsychotic therapy.',
      uncertainty: 'No cortisol sampling in this demo dataset.',
      reviewStatus: 'pending',
      source: 'evidence_based',
    },
    {
      mechanismId: 'glutamate-gaba-dysconnectivity',
      label: mechLabel('glutamate-gaba-dysconnectivity'),
      confidence: 'moderate',
      linkedDimensions: ['aberrant-salience-psychotic-meaning', 'formal-thought-language-disorganization'],
      supportingEvidenceIds: ['aufnahme'],
      contradictingEvidenceIds: [],
      clinicalImplication: 'Mild formal thought disorder suggests E/I imbalance may contribute alongside dopamine pathways.',
      treatmentRelevance: 'Consider NMDA-modulating strategies only within specialist pathways — not first-line here.',
      uncertainty: 'Exploratory — insufficient direct evidence.',
      reviewStatus: 'pending',
      source: 'exploratory',
    },
    {
      mechanismId: 'circadian-sleep-wake-dysregulation',
      label: mechLabel('circadian-sleep-wake-dysregulation'),
      confidence: 'high',
      linkedDimensions: ['sleep-circadian-regulation', 'aberrant-salience-psychotic-meaning'],
      supportingEvidenceIds: ['aufnahme', 'therapie-verlauf'],
      contradictingEvidenceIds: [],
      clinicalImplication: 'Sleep loss is a plausible precipitant of psychotic decompensation in this case.',
      treatmentRelevance: 'Prioritise sleep stabilisation; limit PRN benzodiazepine to avoid dependence.',
      uncertainty: '',
      reviewStatus: 'accepted',
      source: 'evidence_based',
    },
  ]

  return {
    builtAt: BUILT_AT,
    language: 'en',
    dimensional: {
      activeDimensions,
      exploratoryInsufficientEvidence: [
        {
          topic: 'Trauma-related limbic hyperreactivity',
          rationale: 'No clear trauma narrative documented — insufficient evidence for dimensional scoring.',
        },
      ],
      quarantined: [],
    },
    mechanism: {
      activeMechanisms,
      exploratoryInsufficientEvidence: [],
      quarantined: [],
    },
    evidenceItemCount: 12,
    diagnostics: {
      dimensional: {
        provider: 'demo',
        modelId: 'pre-baked',
        tier: 'demo',
        mock: true,
        promptCharCount: 0,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        latencyMs: 0,
        truncated: false,
        validation: { salvagedCount: 0, quarantinedCount: 0, issues: [] },
        rawResponseSnippet: '{"source":"demo-fixture"}',
        error: null,
      },
      mechanism: {
        provider: 'demo',
        modelId: 'pre-baked',
        tier: 'demo',
        mock: true,
        promptCharCount: 0,
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        latencyMs: 0,
        truncated: false,
        validation: { salvagedCount: 0, quarantinedCount: 0, issues: [] },
        rawResponseSnippet: '{"source":"demo-fixture"}',
        error: null,
      },
    },
  }
}

export function buildDemoClinicalIntelligenceState(locale: DemoLocale = 'en'): ClinicalIntelligenceCaseState {
  const caseId = demoCaseIdForLocale(locale)
  return {
    version: CLINICAL_INTELLIGENCE_STATE_VERSION,
    caseId,
    latestRun: buildLatestRun(),
    rejectedDimensionIds: [],
    rejectedMechanismIds: ['neurodegenerative-neurocognitive-decline'],
    audit: [
      {
        id: 'demo-ci-audit-01',
        timestamp: BUILT_AT,
        action: 'run-completed',
        actor: 'demo-seed',
        targetKind: 'run',
        targetId: BUILT_AT,
        notes: 'Pre-baked demo Clinical Intelligence run (synthetic, no live API).',
      },
    ],
    clinicianComment:
      'Demo review: dimensional profile supports psychotic decompensation with sleep and substance contributors. Accept mechanisms after ward round.',
    discussMessages: [],
    savedAcceptedAt: null,
  }
}
