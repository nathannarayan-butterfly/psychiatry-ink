import type { Criterion, Disorder } from './schema'
import { domainSignal, durationSignal } from './predicateHelpers'

/**
 * ICD-11 6A20 — characteristic symptoms of schizophrenia.
 *
 * The four CORE symptoms (persistent delusions, persistent hallucinations,
 * disorganised thinking/formal thought disorder, and experiences of influence,
 * passivity or control). At least one of these must be present, and at least two
 * characteristic symptoms in total (core + additional) are required (see the two
 * groups below). Authored as ORIGINAL German paraphrases of clinical facts only.
 */
const schizophrenia6a20CoreSymptoms: Criterion[] = [
  {
    id: '6a20.persistent_delusions',
    text_de: 'Anhaltende Wahnphänomene (z. B. Verfolgungs-, Beziehungs-, Größen- oder bizarrer Wahn)',
    citation: [{ classification: 'icd11', code: '6A20', ref: 'core-delusions' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('delusions_overvalued_ideas', /wahn|verfolgung|gr[öo][ßs]en|beziehungs|bizarr|paranoid/i),
  },
  {
    id: '6a20.persistent_hallucinations',
    text_de: 'Anhaltende Halluzinationen jeglicher Sinnesmodalität (am häufigsten akustisch)',
    citation: [{ classification: 'icd11', code: '6A20', ref: 'core-hallucinations' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'perception_hallucinations', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('perception_hallucinations', /halluzin|stimmen|akustisch|optisch|kommentier|dialogisch/i),
  },
  {
    id: '6a20.disorganised_thinking',
    text_de: 'Desorganisiertes Denken bzw. formale Denkstörung (Zerfahrenheit, Gedankenabreißen, Danebenreden oder Neologismen)',
    citation: [{ classification: 'icd11', code: '6A20', ref: 'core-thought-disorder' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'formal_thought_disorder', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('formal_thought_disorder', /zerfahren|inkoh[äa]rent|gedankenabrei|neologism|desorganisiert|danebenreden/i),
  },
  {
    id: '6a20.passivity',
    text_de: 'Beeinflussungs-, Passivitäts- oder Kontrollerleben sowie Ich-Störungen (Gedankeneingebung, -entzug oder -ausbreitung)',
    citation: [{ classification: 'icd11', code: '6A20', ref: 'core-passivity' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'self_experience_ego_disturbance', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('self_experience_ego_disturbance', /gedankeneingebung|gedankenentzug|gedankenausbreitung|gemacht|passivit[äa]t|fremdbeeinfluss|kontrollerleben/i),
  },
]

/**
 * ICD-11 6A20 — additional (non-core) characteristic symptoms. These may NOT on
 * their own satisfy the requirement (≥ 1 of the symptoms must come from the core
 * set), but they count toward the "≥ 2 characteristic symptoms" total. Negative
 * symptoms are left attestation-only because the negative syndrome spans several
 * phenomenology domains (affect, drive, speech, sociality) and has no clean
 * single-domain signal.
 */
const schizophrenia6a20AdditionalSymptoms: Criterion[] = [
  {
    id: '6a20.negative_symptoms',
    text_de: 'Negativsymptomatik (Affektverflachung, Sprachverarmung, Antriebs- und Initiativmangel, Anhedonie oder sozialer Rückzug)',
    citation: [{ classification: 'icd11', code: '6A20', ref: 'negative' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
  },
  {
    id: '6a20.disorganised_behaviour',
    text_de: 'Grob desorganisiertes Verhalten, das die Zielgerichtetheit alltäglicher Handlungen beeinträchtigt',
    citation: [{ classification: 'icd11', code: '6A20', ref: 'disorganised-behaviour' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'appearance_behavior', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('appearance_behavior', /desorganisiert|ziellos|bizarr|verworren/i),
  },
  {
    id: '6a20.psychomotor_disturbance',
    text_de: 'Psychomotorische Störungen (katatone Symptome wie Stupor, Haltungsverharren, Mutismus, Negativismus oder Erregung)',
    citation: [{ classification: 'icd11', code: '6A20', ref: 'psychomotor' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('drive_psychomotor_activity', /katato|stupor|haltungsverharr|mutismus|negativismus|psychomotor.*erregung/i),
  },
]

/**
 * Schizophrenie — operationalized from ICD-10 F20 / ICD-11 6A20.
 * Original wording; clinical facts (charakteristische Symptome über ≥ 1 Monat,
 * Ausschluss vorrangiger affektiver/organischer Ursachen) reference the
 * standard via `sourceRef`.
 */
export const schizophrenia: Disorder = {
  id: 'schizophrenia',
  classification: 'icd10',
  code: 'F20',
  name_de: 'Schizophrenie',
  crosswalkKey: 'F20.0',
  sourceRef: 'operationalisiert nach ICD-10 F20 / ICD-11 6A20',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F20.0', label_de: 'Paranoide Schizophrenie' },
    icd11: { code: '6A20', label_de: 'Schizophrenie' },
    dsm5tr: { code: '295.90', label_de: 'Schizophrenia (Crosswalk)' },
  },
  differentials_de: [
    'Schizoaffektive Störung',
    'Affektive Störung mit psychotischen Symptomen',
    'Akute vorübergehende psychotische Störung',
    'Substanzinduzierte oder organische Psychose',
  ],
  groups: [
    {
      id: 'f20.characteristic',
      label_de: 'Charakteristische Symptome (mindestens 1 eindeutiges Symptom)',
      logic: 'any_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f20.ego_disturbance',
          text_de: 'Ich-Störungen: Gedankenlautwerden, Gedankeneingebung, -entzug oder -ausbreitung sowie Kontroll- bzw. Beeinflussungserleben oder Gefühl des Gemachten (Passivitätserleben)',
          citation: [{ classification: 'icd10', code: 'F20', ref: 'a/b' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'self_experience_ego_disturbance', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'self_experience_ego_disturbance',
            /gedankeneingebung|gedankenentzug|gedankenausbreitung|gemacht|passivit[äa]t|fremdbeeinfluss/i,
            /keine\s+ich-?st[öo]rung/i,
          ),
        },
        {
          id: 'f20.auditory_hallucinations',
          text_de: 'Kommentierende oder dialogische (über die Person sprechende) Stimmen bzw. andere anhaltende Stimmen aus einem Körperteil',
          citation: [{ classification: 'icd10', code: 'F20', ref: 'c' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'perception_hallucinations', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'perception_hallucinations',
            /halluzin|stimmen|kommentier|dialogisch|akustische/i,
            /keine\s+halluzinationen/i,
          ),
        },
        {
          id: 'f20.delusions',
          text_de: 'Anhaltender, kulturell unangemessener und völlig unrealistischer (bizarrer) Wahn',
          citation: [{ classification: 'icd10', code: 'F20', ref: 'd' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'delusions_overvalued_ideas',
            /wahn|verfolgung|gr[öo][ßs]en|beziehungs|bizarr|paranoid/i,
            /keine\s+denkst[öo]rung/i,
          ),
        },
        {
          id: 'f20.formal_thought_disorder',
          text_de: 'Gedankenabreißen oder Einschiebungen in den Gedankenfluss mit Zerfahrenheit, Danebenreden oder Neologismen',
          citation: [{ classification: 'icd10', code: 'F20', ref: 'f' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'formal_thought_disorder', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'formal_thought_disorder',
            /zerfahren|inkoh[äa]rent|gedankenabrei|neologism|ideenflucht/i,
            /geordnet|koh[äa]rent/i,
          ),
        },
      ],
    },
    {
      id: 'f20.duration',
      label_de: 'Zeitkriterium',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 30 },
      criteria: [
        {
          id: 'f20.duration_one_month',
          text_de: 'Die charakteristischen Symptome bestehen die meiste Zeit während eines Zeitraums von mindestens einem Monat',
          citation: [{ classification: 'icd10', code: 'F20' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
          operationalRule: durationSignal(30),
        },
      ],
    },
    {
      id: 'f20.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f20.exclude_mood_primary',
          text_de: 'Bei gleichzeitig ausgeprägter manischer oder depressiver Symptomatik gingen die schizophrenen Symptome der affektiven Störung voraus (kein vorrangiges affektives Zustandsbild)',
          citation: [{ classification: 'icd10', code: 'F20' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f20.exclude_organic_substance',
          text_de: 'Symptome sind nicht auf eine organische Hirnerkrankung oder auf Intoxikation, Abhängigkeit bzw. Entzug einer psychotropen Substanz zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F20' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6A20 — DISTINCT structure. ICD-10 F20 needs only ≥ 1 unambiguous
  // first-rank-type symptom; ICD-11 requires ≥ 2 characteristic symptoms, at
  // least ONE from the core set (persistent delusions, persistent hallucinations,
  // disorganised thinking, or experiences of influence/passivity/control),
  // persisting ≥ 1 month, plus substance/organic and mood exclusions. ICD-11 also
  // ABOLISHES the ICD-10 subtypes (paranoid/hebephrenic/catatonic/undifferentiated/
  // residual, F20.0–F20.6), replacing them with symptom & course specifiers; this
  // operationalization therefore encodes the symptom-cluster + duration + exclusion
  // structure only (the dropped subtypes are not modelled, catatonia/negative/
  // disorganised features appear as characteristic symptoms instead).
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6A20',
    groups: [
      {
        id: '6a20.core_symptom',
        label_de:
          'Mindestens ein Kernsymptom (anhaltender Wahn, anhaltende Halluzinationen, desorganisiertes Denken oder Beeinflussungs-/Passivitätserleben)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: schizophrenia6a20CoreSymptoms,
      },
      {
        id: '6a20.symptoms',
        label_de: 'Mindestens zwei charakteristische Symptome, davon mindestens eines aus dem Kernbereich',
        logic: 'at_least_n_of',
        threshold: 2,
        groupType: 'inclusion',
        criteria: [...schizophrenia6a20CoreSymptoms, ...schizophrenia6a20AdditionalSymptoms],
      },
      {
        id: '6a20.duration',
        label_de: 'Zeitkriterium',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 30 },
        criteria: [
          {
            id: '6a20.duration_one_month',
            text_de: 'Die charakteristischen Symptome bestehen die meiste Zeit über einen Zeitraum von mindestens einem Monat',
            citation: [{ classification: 'icd11', code: '6A20', ref: 'duration' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
            operationalRule: durationSignal(30),
          },
        ],
      },
      {
        id: '6a20.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6a20.exclude_substance_organic',
            text_de: 'Die Symptomatik ist nicht auf eine psychotrope Substanz, ein Medikament oder eine andere körperliche bzw. organische Ursache zurückzuführen',
            citation: [{ classification: 'icd11', code: '6A20', ref: 'exclude-substance' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
          {
            id: '6a20.exclude_mood',
            text_de: 'Die Symptome sind nicht besser durch eine affektive Störung mit psychotischen Merkmalen erklärbar (bei gleichzeitiger mittel- bis schwergradiger Episode ist eine schizoaffektive Störung zu erwägen)',
            citation: [{ classification: 'icd11', code: '6A20', ref: 'exclude-mood' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}
