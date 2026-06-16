import type { DiagnoseEntry } from '../diagnosenArchive'
import type { ClinicalImprintIndex, ClinicalImprintRecord } from '../../types/clinicalImprint'
import type { MedicationPlanState } from '../../types/medicationPlan'
import type {
  CoursePattern,
  DiagnosticMapping,
  InterviewGap,
  IsdmClinicalAnalysis,
  IsdmInputState,
  IsdmOverallUncertainty,
  IsdmPhenomenologyDomain,
  SyndromeCluster,
  SymptomFinding,
} from '../../types/isdm'
import { getCurrentPlan, isMedicationVisible } from '../medication/planOps'
import {
  buildMedicationEntryClinicalText,
  buildSideEffectClinicalText,
} from '../medication/doseLine'
import {
  ISDM_PHENOMENOLOGY_DOMAINS,
} from '../../types/isdm'
import { defaultPsychopathSections } from '../../data/psychopathSections'
import {
  IMPRINT_FIELD_DOMAIN_MAP,
  matchDomainsInText,
  PSYCHOPATH_SECTION_DOMAIN_MAP,
} from './domainMap'
import { matchDisorderToCodes } from '../../data/diagnosisCriteria'
import type { AttestationMap } from '../diagnosisCriteria/context'
import { buildEvaluationContext } from '../diagnosisCriteria/context'
import { evaluateDisorder } from '../diagnosisCriteria/evaluateDisorder'

export interface IsdmBuildInput {
  caseId: string
  imprints: ClinicalImprintIndex
  checklistSelections: Record<string, Record<string, boolean>>
  isdmInput?: IsdmInputState
  diagnoses: DiagnoseEntry[]
  verlaufText?: string
  medicationPlanState?: MedicationPlanState
  /** Butterfly clinician attestations (criterionId → met/not_met). */
  attestations?: AttestationMap
}

function emptyPhenomenology(): Record<IsdmPhenomenologyDomain, SymptomFinding[]> {
  const record = {} as Record<IsdmPhenomenologyDomain, SymptomFinding[]>
  for (const domain of ISDM_PHENOMENOLOGY_DOMAINS) {
    record[domain] = []
  }
  return record
}

function findingId(domain: IsdmPhenomenologyDomain, suffix: string): string {
  return `${domain}:${suffix}`
}

function confidenceFromEvidence(count: number, hasDirect: boolean): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0
  if (count === 1) return hasDirect ? 2 : 1
  if (count === 2) return hasDirect ? 3 : 2
  return hasDirect ? 4 : 3
}

function addFinding(
  phenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>,
  finding: SymptomFinding,
): void {
  const existing = phenomenology[finding.domain]
  const duplicate = existing.find(
    (item) => item.label === finding.label && item.polarity === finding.polarity,
  )
  if (duplicate) {
    duplicate.sourceImprintKeys = [
      ...new Set([...duplicate.sourceImprintKeys, ...finding.sourceImprintKeys]),
    ]
    duplicate.confidence = Math.max(duplicate.confidence, finding.confidence) as SymptomFinding['confidence']
    return
  }
  existing.push(finding)
}

function mapImprintsToFindings(
  imprints: ClinicalImprintRecord[],
  phenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>,
): void {
  for (const imprint of imprints) {
    const text = [
      imprint.readableClinicalSentence,
      imprint.evidenceText ?? '',
      ...(imprint.symptoms ?? []),
      ...(imprint.diagnosisHints ?? []),
    ].join(' ')

    const keywordDomains = matchDomainsInText(text)
    for (const domain of keywordDomains) {
      addFinding(phenomenology, {
        id: findingId(domain, imprint.imprintKey),
        domain,
        label: imprint.readableClinicalSentence.slice(0, 120),
        keywords: imprint.symptoms.length ? imprint.symptoms : [domain],
        evidenceStrength: imprint.evidenceStrength,
        sourceImprintKeys: [imprint.imprintKey],
        confidence: imprint.evidenceStrength === 'direct_observation' ? 3 : 2,
        polarity: 'present',
      })
    }

    for (const [field, domain] of Object.entries(IMPRINT_FIELD_DOMAIN_MAP)) {
      const value = imprint[field as keyof ClinicalImprintRecord]
      if (typeof value === 'string' && value.trim()) {
        addFinding(phenomenology, {
          id: findingId(domain, `${imprint.imprintKey}:${field}`),
          domain,
          label: value.trim(),
          keywords: [value.trim()],
          evidenceStrength: imprint.evidenceStrength,
          sourceImprintKeys: [imprint.imprintKey],
          confidence: 2,
          polarity: 'present',
        })
      }
    }
  }
}

function mapChecklistToFindings(
  selections: Record<string, Record<string, boolean>>,
  phenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>,
): void {
  for (const section of defaultPsychopathSections) {
    const sectionSelections = selections[section.id] ?? {}
    const domains = PSYCHOPATH_SECTION_DOMAIN_MAP[section.id] ?? []

    for (const item of section.checklistItems ?? []) {
      if (!sectionSelections[item.id]) continue
      const polarity = item.normal ? ('absent' as const) : ('present' as const)
      const targetDomains = domains.length ? domains : matchDomainsInText(item.text)
      for (const domain of targetDomains.length ? targetDomains : (['mood_affect'] as IsdmPhenomenologyDomain[])) {
        addFinding(phenomenology, {
          id: findingId(domain, `checklist:${item.id}`),
          domain,
          label: item.label,
          keywords: [item.text],
          evidenceStrength: 'direct_observation',
          sourceImprintKeys: [`checklist:${section.id}:${item.id}`],
          confidence: item.normal ? 2 : 3,
          polarity,
        })
      }
    }
  }
}

function mapMedicationPlanToFindings(
  state: MedicationPlanState | undefined,
  phenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>,
): void {
  if (!state) return

  const currentPlan = getCurrentPlan(state)
  const medications = currentPlan?.medications ?? []
  const activeMedications = medications.filter((med) => isMedicationVisible(med) && med.status !== 'discontinued')

  for (const med of activeMedications) {
    const text = buildMedicationEntryClinicalText(med)
    if (!text.trim()) continue

    for (const domain of matchDomainsInText(text)) {
      addFinding(phenomenology, {
        id: findingId(domain, `med-entry:${med.id}`),
        domain,
        label: med.doseLineGerman.trim() || med.substance.trim(),
        keywords: [med.substance.trim(), ...med.sideEffects].filter(Boolean),
        evidenceStrength: 'direct_observation',
        sourceImprintKeys: [`medication:med-entry:${med.id}`],
        confidence: 3,
        polarity: 'present',
      })
    }

    if (med.adherenceNote.trim()) {
      addFinding(phenomenology, {
        id: findingId('insight_judgment', `med-adherence:${med.id}`),
        domain: 'insight_judgment',
        label: med.adherenceNote.trim().slice(0, 120),
        keywords: [med.adherenceNote.trim()],
        evidenceStrength: 'patient_report',
        sourceImprintKeys: [`medication:med-entry:${med.id}`],
        confidence: 2,
        polarity: /nicht|unregelm|vergess|miss|poor|irregular/i.test(med.adherenceNote)
          ? 'present'
          : 'unclear',
      })
    }
  }

  for (const report of state.sideEffectReports ?? []) {
    const text = buildSideEffectClinicalText(report, medications)
    if (!text.trim()) continue

    for (const domain of matchDomainsInText(text)) {
      addFinding(phenomenology, {
        id: findingId(domain, `side-effect:${report.id}`),
        domain,
        label: report.symptom.trim().slice(0, 120),
        keywords: [report.symptom.trim()],
        evidenceStrength: 'patient_report',
        sourceImprintKeys: [`medication:side-effect:${report.id}`],
        confidence: 2,
        polarity: 'present',
        notes: report.note.trim() || undefined,
      })
    }

    addFinding(phenomenology, {
      id: findingId('somatic_preoccupation', `side-effect:${report.id}`),
      domain: 'somatic_preoccupation',
      label: `Nebenwirkung: ${report.symptom.trim()}`,
      keywords: [report.symptom.trim(), 'Nebenwirkung'],
      evidenceStrength: 'patient_report',
      sourceImprintKeys: [`medication:side-effect:${report.id}`],
      confidence: 2,
      polarity: 'present',
    })
  }
}

function mapIsdmInputToFindings(
  isdmInput: IsdmInputState | undefined,
  phenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>,
): void {
  if (!isdmInput?.domains) return

  for (const domain of ISDM_PHENOMENOLOGY_DOMAINS) {
    const entry = isdmInput.domains[domain]
    if (!entry || entry.presence === 'not_assessed') continue

    const polarity =
      entry.presence === 'present'
        ? ('present' as const)
        : entry.presence === 'absent'
          ? ('absent' as const)
          : ('unclear' as const)

    const label = entry.notes?.trim()
      ? entry.notes.trim().slice(0, 120)
      : `${domain.replace(/_/g, ' ')} (${entry.presence})`

    addFinding(phenomenology, {
      id: findingId(domain, 'isdm_input'),
      domain,
      label,
      keywords: [domain],
      evidenceStrength: 'direct_observation',
      sourceImprintKeys: [`manual_note:isdm_input:${domain}`],
      confidence:
        entry.presence === 'present'
          ? ((entry.severity ?? 2) as SymptomFinding['confidence'])
          : 2,
      polarity,
      notes: entry.notes?.trim() || undefined,
    })
  }
}

function buildCoursePattern(
  imprints: ClinicalImprintRecord[],
  verlaufText?: string,
): CoursePattern {
  const trajectories = imprints
    .map((item) => item.courseDirection)
    .filter((value): value is NonNullable<typeof value> => Boolean(value))

  const combined = [verlaufText ?? '', ...imprints.map((item) => item.readableClinicalSentence)].join(
    '\n',
  )

  const onset: CoursePattern['onset'] = /akut|acute|plötzlich|sudden/i.test(combined)
    ? 'acute'
    : /schleichend|insidious|gradual/i.test(combined)
      ? 'insidious'
      : /subakut|subacute/i.test(combined)
        ? 'subacute'
        : 'unclear'

  const duration: CoursePattern['duration'] = /seit\s+\d+\s+jahr|years|chronic|chronisch/i.test(
    combined,
  )
    ? 'years'
    : /monat|month/i.test(combined)
      ? 'months'
      : /woche|week/i.test(combined)
        ? 'weeks'
        : /tag|day/i.test(combined)
          ? 'days'
          : 'unclear'

  const episodicity: CoursePattern['episodicity'] = /rezidiv|recurrent|episode/i.test(combined)
    ? 'recurrent'
    : /kontinuier|continuous|persistent/i.test(combined)
      ? 'continuous'
      : /erstmalig|first\s*episode|single/i.test(combined)
        ? 'single_episode'
        : 'unclear'

  const triggers = matchLabels(combined, [/stress/i, /belast/i, /trauma/i, /substanz/i])
  const precipitants = matchLabels(combined, [/auslöser/i, /trigger/i, /nach\s+/i])

  const summaryParts = [
    onset !== 'unclear' ? `Onset pattern: ${onset}` : null,
    duration !== 'unclear' ? `Duration scale: ${duration}` : null,
    episodicity !== 'unclear' ? `Course: ${episodicity}` : null,
    trajectories.length ? `Trajectory signals: ${[...new Set(trajectories)].join(', ')}` : null,
  ].filter(Boolean)

  return {
    onset,
    duration,
    episodicity,
    trajectory: [...new Set(trajectories)],
    contextualTriggers: triggers,
    precipitants,
    summary: summaryParts.join(' · ') || 'Course pattern insufficiently documented.',
  }
}

function matchLabels(text: string, patterns: RegExp[]): string[] {
  const hits = new Set<string>()
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) hits.add(match[0].trim())
  }
  return [...hits]
}

function buildSyndromeClusters(
  phenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>,
): SyndromeCluster[] {
  const presentByDomain = (domain: IsdmPhenomenologyDomain) =>
    phenomenology[domain].filter((item) => item.polarity === 'present')

  const clusters: SyndromeCluster[] = []

  const psychoticFindings = [
    ...presentByDomain('delusions_overvalued_ideas'),
    ...presentByDomain('perception_hallucinations'),
    ...presentByDomain('formal_thought_disorder'),
  ]
  if (psychoticFindings.length >= 1) {
    clusters.push({
      id: 'cluster:psychotic',
      clusterType: 'psychotic',
      label: 'Psychotic symptom pattern',
      supportingFindings: psychoticFindings.map((item) => item.id),
      opposingFindings: [],
      confidence: confidenceFromEvidence(
        psychoticFindings.length,
        psychoticFindings.some((item) => item.evidenceStrength === 'direct_observation'),
      ),
      rationale: 'Delusional, perceptual or formal thought findings co-occur.',
    })
  }

  const depressiveFindings = [
    ...presentByDomain('mood_affect'),
    ...presentByDomain('drive_psychomotor_activity'),
    ...presentByDomain('sleep_appetite_vegetative'),
  ].filter((item) => /depress|gedrückt|antrieb|schlaf|appetit|mood|affect/i.test(item.label))
  if (depressiveFindings.length >= 2) {
    clusters.push({
      id: 'cluster:depressive',
      clusterType: 'depressive',
      label: 'Depressive symptom pattern',
      supportingFindings: depressiveFindings.map((item) => item.id),
      opposingFindings: presentByDomain('mood_affect')
        .filter((item) => /euphor|manic|manisch/i.test(item.label))
        .map((item) => item.id),
      confidence: confidenceFromEvidence(
        depressiveFindings.length,
        depressiveFindings.some((item) => item.evidenceStrength === 'direct_observation'),
      ),
      rationale: 'Mood, drive or vegetative findings suggest a depressive syndrome.',
    })
  }

  const manicFindings = presentByDomain('mood_affect').filter((item) =>
    /euphor|manic|manisch|antrieb\s*gesteigert|elevated/i.test(item.label),
  )
  if (manicFindings.length >= 1) {
    clusters.push({
      id: 'cluster:manic',
      clusterType: 'manic',
      label: 'Manic or hypomanic pattern',
      supportingFindings: manicFindings.map((item) => item.id),
      opposingFindings: [],
      confidence: confidenceFromEvidence(manicFindings.length, true),
      rationale: 'Elevated mood or increased drive features present.',
    })
  }

  const anxietyFindings = presentByDomain('anxiety_panic_phobic_symptoms')
  if (anxietyFindings.length >= 1) {
    clusters.push({
      id: 'cluster:anxiety',
      clusterType: 'anxiety',
      label: 'Anxiety-related pattern',
      supportingFindings: anxietyFindings.map((item) => item.id),
      opposingFindings: [],
      confidence: confidenceFromEvidence(anxietyFindings.length, false),
      rationale: 'Anxiety, panic or phobic symptoms documented.',
    })
  }

  const traumaFindings = presentByDomain('trauma_intrusions_dissociation')
  if (traumaFindings.length >= 1) {
    clusters.push({
      id: 'cluster:trauma',
      clusterType: 'trauma',
      label: 'Trauma-related pattern',
      supportingFindings: traumaFindings.map((item) => item.id),
      opposingFindings: [],
      confidence: confidenceFromEvidence(traumaFindings.length, false),
      rationale: 'Trauma, intrusion or dissociation features noted.',
    })
  }

  const substanceFindings = presentByDomain('substance_related_features')
  if (substanceFindings.length >= 1) {
    clusters.push({
      id: 'cluster:substance',
      clusterType: 'substance',
      label: 'Substance-related pattern',
      supportingFindings: substanceFindings.map((item) => item.id),
      opposingFindings: [],
      confidence: confidenceFromEvidence(substanceFindings.length, false),
      rationale: 'Substance use or withdrawal features mentioned.',
    })
  }

  const ocdFindings = presentByDomain('obsessions_compulsions')
  if (ocdFindings.length >= 1) {
    clusters.push({
      id: 'cluster:ocd',
      clusterType: 'obsessive_compulsive',
      label: 'Obsessive-compulsive pattern',
      supportingFindings: ocdFindings.map((item) => item.id),
      opposingFindings: [],
      confidence: confidenceFromEvidence(ocdFindings.length, false),
      rationale: 'Obsessional or compulsive phenomenology present.',
    })
  }

  const medicationAdverseFindings = phenomenology.somatic_preoccupation.filter(
    (item) =>
      item.polarity === 'present' &&
      /nebenwirk|side\s*effect|sedier|gewicht|tremor|extrapyram/i.test(item.label),
  )
  if (medicationAdverseFindings.length >= 1) {
    clusters.push({
      id: 'cluster:medication-adverse',
      clusterType: 'mixed',
      label: 'Medication adverse-effect pattern',
      supportingFindings: medicationAdverseFindings.map((item) => item.id),
      opposingFindings: [],
      confidence: confidenceFromEvidence(medicationAdverseFindings.length, false),
      rationale: 'Documented adverse effects potentially linked to psychiatric medication.',
    })
  }

  if (clusters.length >= 2) {
    clusters.push({
      id: 'cluster:mixed',
      clusterType: 'mixed',
      label: 'Mixed syndromic pattern',
      supportingFindings: clusters.flatMap((item) => item.supportingFindings),
      opposingFindings: [],
      confidence: 2,
      rationale: 'Multiple syndromic patterns overlap — differential review advised.',
    })
  }

  return clusters
}

/** Maps an authored disorder to the ISDM syndrome cluster type that supports it. */
export const DISORDER_CLUSTER_MAP: Record<string, SyndromeCluster['clusterType']> = {
  depressive_episode: 'depressive',
  generalized_anxiety_disorder: 'anxiety',
  panic_disorder: 'anxiety',
  alcohol_dependence: 'substance',
  schizophrenia: 'psychotic',
}

function confidenceForVerdict(verdict: string): DiagnosticMapping['confidence'] {
  if (verdict === 'criteria_met') return 3
  if (verdict === 'insufficient_data') return 2
  return 1
}

function buildDiagnosticMappings(
  clusters: SyndromeCluster[],
  diagnoses: DiagnoseEntry[],
  phenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>,
  coursePattern: CoursePattern,
  attestations: AttestationMap,
): DiagnosticMapping[] {
  const mappings: DiagnosticMapping[] = []

  // ── Butterfly criteria verification is scoped to clinician-ENTERED diagnoses ──
  // For each entered diagnosis we either verify it against its authored criteria
  // set (matched by ICD code) or, if no set exists yet, surface a transparent
  // "not yet available" state. Butterfly never proposes/verifies disorders the
  // clinician has not entered.
  const evalContext = buildEvaluationContext({ phenomenology, coursePattern, attestations })
  const evaluatedDisorderIds = new Set<string>()

  for (const entry of diagnoses) {
    if (!entry.icd10.code.trim() && !entry.icd10.label.trim() && !entry.icd11.code.trim()) continue

    const codingSystems: DiagnosticMapping['codingSystems'] = {
      icd10: entry.icd10.code ? { code: entry.icd10.code, label: entry.icd10.label } : undefined,
      icd11: entry.icd11.code ? { code: entry.icd11.code, label: entry.icd11.label } : undefined,
      dsm5tr: entry.dsm.code ? { code: entry.dsm.code, label: entry.dsm.label } : undefined,
    }
    const label = entry.icd10.label.trim() || entry.icd10.code.trim() || entry.icd11.label.trim()

    const disorder = matchDisorderToCodes(entry.icd10.code, entry.icd11.code)

    if (!disorder) {
      // Entered diagnosis with no authored criteria set yet.
      mappings.push({
        id: `dx:existing:${entry.id}`,
        label,
        codingSystems,
        confidence: 2,
        criteriaMet: [],
        criteriaMissing: ['Kriterienprüfung für diese Diagnose noch nicht verfügbar'],
        exclusions: [],
        differentials: [],
        supportingClusters: [],
        clinicianReviewRequired: true,
      })
      continue
    }

    // De-duplicate when several entries map to the same authored disorder.
    if (evaluatedDisorderIds.has(disorder.id)) continue
    evaluatedDisorderIds.add(disorder.id)

    const evaluation = evaluateDisorder(disorder, evalContext)
    const clusterType = DISORDER_CLUSTER_MAP[disorder.id]
    const triggeredExclusions = evaluation.groupResults
      .filter((group) => group.groupType === 'exclusion' && group.satisfaction === 'yes')
      .flatMap((group) => group.metCriteria)

    mappings.push({
      id: `dx:${entry.id}`,
      label: label || disorder.name_de,
      codingSystems: {
        icd10: codingSystems.icd10 ??
          (disorder.codingSystems.icd10
            ? { code: disorder.codingSystems.icd10.code, label: disorder.codingSystems.icd10.label_de }
            : undefined),
        icd11: codingSystems.icd11 ??
          (disorder.codingSystems.icd11
            ? { code: disorder.codingSystems.icd11.code, label: disorder.codingSystems.icd11.label_de }
            : undefined),
        dsm5tr: codingSystems.dsm5tr ??
          (disorder.codingSystems.dsm5tr
            ? { code: disorder.codingSystems.dsm5tr.code, label: disorder.codingSystems.dsm5tr.label_de }
            : undefined),
      },
      confidence: confidenceForVerdict(evaluation.verdict),
      criteriaMet: evaluation.criteriaMet,
      criteriaMissing: evaluation.criteriaMissing,
      exclusions: triggeredExclusions,
      differentials: disorder.differentials_de,
      supportingClusters: clusterType
        ? clusters.filter((item) => item.clusterType === clusterType).map((item) => item.id)
        : [],
      clinicianReviewRequired: true,
    })
  }

  if (
    presentRisk(phenomenology) &&
    !mappings.some((item) => /risk|suizid/i.test(item.label))
  ) {
    mappings.push({
      id: 'hyp:elevated-risk',
      label: 'Erhöhtes klinisches Risiko (Hinweis)',
      codingSystems: {},
      confidence: 2,
      criteriaMet: ['Hinweise auf Eigen- oder Fremdgefährdung dokumentiert'],
      criteriaMissing: ['Risikoeinschätzung und Schutzfaktoren noch unvollständig'],
      exclusions: [],
      differentials: [],
      supportingClusters: [],
      clinicianReviewRequired: true,
    })
  }

  return mappings
}

function presentRisk(phenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>): boolean {
  return (
    phenomenology.risk_self.some((item) => item.polarity === 'present') ||
    phenomenology.risk_others.some((item) => item.polarity === 'present')
  )
}

/**
 * INTERNAL domain-coverage signal only. These gaps feed `computeOverallUncertainty`
 * and a numeric count in the ISDM summary — they are deliberately NOT the
 * user-facing "Vorgeschlagene Fragen". Those questions are derived strictly from
 * the still-`unknown` criteria of clinician-entered diagnoses (see
 * `buildCriterionQuestions` in `utils/butterfly/criterionPrompts.ts`); no generic
 * or open-ended question text from here is ever rendered as a suggested question.
 */
function buildInterviewGaps(
  phenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>,
  course: CoursePattern,
  medicationPlanState?: MedicationPlanState,
): InterviewGap[] {
  const gaps: InterviewGap[] = []

  const uncoveredDomains = ISDM_PHENOMENOLOGY_DOMAINS.filter(
    (domain) => phenomenology[domain].length === 0,
  )

  const priorityDomains: IsdmPhenomenologyDomain[] = [
    'risk_self',
    'risk_others',
    'consciousness_orientation',
    'mood_affect',
    'perception_hallucinations',
    'delusions_overvalued_ideas',
    'insight_judgment',
    'functional_impairment',
  ]

  for (const domain of priorityDomains) {
    if (!uncoveredDomains.includes(domain)) continue
    gaps.push({
      id: `gap:${domain}`,
      domain,
      priority: domain.startsWith('risk_') ? 'high' : 'medium',
      question: gapQuestionForDomain(domain),
      rationale: 'No structured findings recorded for this domain yet.',
    })
  }

  if (course.onset === 'unclear' || course.episodicity === 'unclear') {
    gaps.push({
      id: 'gap:course',
      domain: 'course',
      priority: 'medium',
      question: 'When did symptoms begin, how have they evolved, and were there clear triggers or remissions?',
      rationale: 'Course pattern remains insufficiently documented for syndromic mapping.',
    })
  }

  if (uncoveredDomains.includes('substance_related_features')) {
    gaps.push({
      id: 'gap:substance',
      domain: 'substance_related_features',
      priority: 'medium',
      question: 'Is there current or recent use of alcohol, drugs or medications that could explain symptoms?',
      rationale: 'Substance-related contributors are not yet assessed.',
    })
  }

  const currentPlan = medicationPlanState ? getCurrentPlan(medicationPlanState) : null
  const activeMedications =
    currentPlan?.medications.filter((med) => isMedicationVisible(med) && med.status !== 'discontinued') ?? []
  const sideEffectReports = medicationPlanState?.sideEffectReports ?? []

  if (activeMedications.length > 0 && sideEffectReports.length === 0) {
    gaps.push({
      id: 'gap:medication-side-effects',
      domain: 'somatic_preoccupation',
      priority: 'medium',
      question:
        'Are there any adverse effects from current psychiatric medications, including sedation, weight change, or extrapyramidal symptoms?',
      rationale: 'Medications are documented but no side-effect reports have been captured.',
    })
  }

  if (
    activeMedications.length > 0 &&
    activeMedications.every((med) => !med.adherenceNote.trim())
  ) {
    gaps.push({
      id: 'gap:medication-adherence',
      domain: 'insight_judgment',
      priority: 'low',
      question: 'How consistently is the current medication being taken, and are there barriers to adherence?',
      rationale: 'Medication plan exists without documented adherence information.',
    })
  }

  return gaps.slice(0, 12)
}

function gapQuestionForDomain(domain: IsdmPhenomenologyDomain): string {
  switch (domain) {
    case 'risk_self':
      return 'Are there current thoughts, plans or behaviours of self-harm or suicide?'
    case 'risk_others':
      return 'Is there any current risk of harm to others, including threats or loss of control?'
    case 'consciousness_orientation':
      return 'How is alertness and orientation to time, place, person and situation?'
    case 'mood_affect':
      return 'How would you describe mood and affect over recent days, including diurnal variation?'
    case 'perception_hallucinations':
      return 'Any experiences of voices, visions or other perceptual phenomena others do not share?'
    case 'delusions_overvalued_ideas':
      return 'Any fixed beliefs or ideas that feel compelling but others find unusual?'
    case 'insight_judgment':
      return 'How does the patient understand their condition and recent decisions?'
    case 'functional_impairment':
      return 'How are work, relationships and daily activities affected?'
    default:
      return `Please clarify findings related to ${domain.replace(/_/g, ' ')}.`
  }
}

function computeOverallUncertainty(
  phenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>,
  gaps: InterviewGap[],
  mappings: DiagnosticMapping[],
): IsdmOverallUncertainty {
  const coveredCount = ISDM_PHENOMENOLOGY_DOMAINS.filter(
    (domain) => phenomenology[domain].length > 0,
  ).length
  const coverageRatio = coveredCount / ISDM_PHENOMENOLOGY_DOMAINS.length
  const highPriorityGaps = gaps.filter((item) => item.priority === 'high').length
  const lowConfidenceMappings = mappings.filter((item) => item.confidence <= 2).length

  if (coverageRatio >= 0.45 && highPriorityGaps === 0 && lowConfidenceMappings <= 1) {
    return 'low'
  }
  if (coverageRatio >= 0.25 && highPriorityGaps <= 1) {
    return 'moderate'
  }
  return 'high'
}

export function buildIsdmAnalysis(input: IsdmBuildInput): IsdmClinicalAnalysis {
  const phenomenology = emptyPhenomenology()
  const imprints = input.imprints.imprints ?? []

  mapImprintsToFindings(imprints, phenomenology)
  mapChecklistToFindings(input.checklistSelections, phenomenology)
  mapIsdmInputToFindings(input.isdmInput, phenomenology)
  mapMedicationPlanToFindings(input.medicationPlanState, phenomenology)

  if (input.verlaufText?.trim()) {
    for (const domain of matchDomainsInText(input.verlaufText)) {
      addFinding(phenomenology, {
        id: findingId(domain, 'verlauf:text'),
        domain,
        label: input.verlaufText.slice(0, 120),
        keywords: [domain],
        evidenceStrength: 'patient_report',
        sourceImprintKeys: ['verlauf:combined'],
        confidence: 2,
        polarity: 'present',
      })
    }
  }

  const coursePattern = buildCoursePattern(imprints, input.verlaufText)
  const syndromeClusters = buildSyndromeClusters(phenomenology)
  const diagnosticMappings = buildDiagnosticMappings(
    syndromeClusters,
    input.diagnoses,
    phenomenology,
    coursePattern,
    input.attestations ?? {},
  )
  const interviewGaps = buildInterviewGaps(
    phenomenology,
    coursePattern,
    input.medicationPlanState,
  )
  const overallUncertainty = computeOverallUncertainty(
    phenomenology,
    interviewGaps,
    diagnosticMappings,
  )

  return {
    caseId: input.caseId,
    profileId: 'international_structured_diagnostic_mapping',
    updatedAt: new Date().toISOString(),
    phenomenology,
    coursePattern,
    syndromeClusters,
    diagnosticMappings,
    interviewGaps,
    overallUncertainty,
  }
}
