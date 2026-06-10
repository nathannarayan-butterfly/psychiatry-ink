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
import { getCurrentPlan } from '../medication/planOps'
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

export interface IsdmBuildInput {
  caseId: string
  imprints: ClinicalImprintIndex
  checklistSelections: Record<string, Record<string, boolean>>
  isdmInput?: IsdmInputState
  diagnoses: DiagnoseEntry[]
  verlaufText?: string
  medicationPlanState?: MedicationPlanState
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
  const activeMedications = medications.filter((med) => med.status !== 'discontinued')

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

function buildDiagnosticMappings(
  clusters: SyndromeCluster[],
  diagnoses: DiagnoseEntry[],
  phenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>,
): DiagnosticMapping[] {
  const mappings: DiagnosticMapping[] = []

  for (const entry of diagnoses) {
    if (!entry.icd10.code.trim() && !entry.icd10.label.trim()) continue
    mappings.push({
      id: `dx:existing:${entry.id}`,
      label: entry.icd10.label.trim() || entry.icd10.code.trim(),
      codingSystems: {
        icd10: entry.icd10.code
          ? { code: entry.icd10.code, label: entry.icd10.label }
          : undefined,
        icd11: entry.icd11.code
          ? { code: entry.icd11.code, label: entry.icd11.label }
          : undefined,
        dsm5tr: entry.dsm.code ? { code: entry.dsm.code, label: entry.dsm.label } : undefined,
      },
      confidence: 3,
      criteriaMet: ['Clinician-entered diagnosis present'],
      criteriaMissing: [],
      exclusions: [],
      differentials: [],
      supportingClusters: clusters.map((item) => item.id),
      clinicianReviewRequired: true,
    })
  }

  const hasCluster = (type: SyndromeCluster['clusterType']) =>
    clusters.some((item) => item.clusterType === type)

  if (hasCluster('psychotic') && !mappings.some((item) => /F2|schizophren|psychot/i.test(item.label))) {
    mappings.push({
      id: 'hyp:psychotic-spectrum',
      label: 'Psychotic spectrum condition (hypothesis)',
      codingSystems: {
        icd10: { code: 'F29', label: 'Nichtorganische Psychose, nicht näher bezeichnet' },
        icd11: { code: '6E60', label: 'Primary psychotic disorder, unspecified' },
        dsm5tr: { code: '298.9', label: 'Other specified schizophrenia spectrum disorder' },
      },
      confidence: 2,
      criteriaMet: ['Psychotic phenomenology documented'],
      criteriaMissing: ['Duration and functional impact not fully established', 'Exclusion of organic causes'],
      exclusions: ['Acute intoxication not ruled out'],
      differentials: ['Brief psychotic disorder', 'Schizoaffective disorder', 'Mood disorder with psychotic features'],
      supportingClusters: clusters.filter((item) => item.clusterType === 'psychotic').map((item) => item.id),
      clinicianReviewRequired: true,
    })
  }

  if (hasCluster('depressive') && !mappings.some((item) => /F32|F33|depress/i.test(item.label))) {
    mappings.push({
      id: 'hyp:depressive-episode',
      label: 'Depressive episode (hypothesis)',
      codingSystems: {
        icd10: { code: 'F32.9', label: 'Depressive Episode, nicht näher bezeichnet' },
        icd11: { code: '6A70', label: 'Single episode depressive disorder, unspecified' },
        dsm5tr: { code: '296.20', label: 'Major depressive disorder, single episode, unspecified' },
      },
      confidence: 2,
      criteriaMet: ['Depressive phenomenology cluster present'],
      criteriaMissing: ['Symptom count and duration criteria not verified', 'Functional impairment unclear'],
      exclusions: ['Substance or medical cause not excluded'],
      differentials: ['Adjustment disorder', 'Bipolar depression', 'Persistent depressive disorder'],
      supportingClusters: clusters.filter((item) => item.clusterType === 'depressive').map((item) => item.id),
      clinicianReviewRequired: true,
    })
  }

  if (hasCluster('anxiety') && !mappings.some((item) => /F40|F41|anxiety|angst/i.test(item.label))) {
    mappings.push({
      id: 'hyp:anxiety-disorder',
      label: 'Anxiety disorder (hypothesis)',
      codingSystems: {
        icd10: { code: 'F41.9', label: 'Angstneurose, nicht näher bezeichnet' },
        icd11: { code: '6B00', label: 'Generalised anxiety disorder' },
        dsm5tr: { code: '300.00', label: 'Other specified anxiety disorder' },
      },
      confidence: 2,
      criteriaMet: ['Anxiety-related findings documented'],
      criteriaMissing: ['Pattern subtype not established', 'Impairment threshold unclear'],
      exclusions: [],
      differentials: ['Panic disorder', 'Social anxiety disorder', 'Medical anxiety mimic'],
      supportingClusters: clusters.filter((item) => item.clusterType === 'anxiety').map((item) => item.id),
      clinicianReviewRequired: true,
    })
  }

  if (
    presentRisk(phenomenology) &&
    !mappings.some((item) => /risk|suizid/i.test(item.label))
  ) {
    mappings.push({
      id: 'hyp:elevated-risk',
      label: 'Elevated clinical risk (hypothesis marker)',
      codingSystems: {},
      confidence: 2,
      criteriaMet: ['Self or other-directed risk signals present'],
      criteriaMissing: ['Risk formulation and protective factors incomplete'],
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
    currentPlan?.medications.filter((med) => med.status !== 'discontinued') ?? []
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
  const diagnosticMappings = buildDiagnosticMappings(syndromeClusters, input.diagnoses, phenomenology)
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
