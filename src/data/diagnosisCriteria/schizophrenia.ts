import type { Disorder } from './schema'
import { domainSignal, durationSignal } from './predicateHelpers'

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
          text_de: 'Ich-Störungen wie Gedankeneingebung, -entzug, -ausbreitung oder Gefühl des Gemachten',
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
          text_de: 'Anhaltende Halluzinationen, insbesondere kommentierende oder dialogische Stimmen',
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
          text_de: 'Anhaltende, kulturell unangemessene oder bizarre Wahnüberzeugungen',
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
          text_de: 'Formale Denkstörung mit Zerfahrenheit, Gedankenabreißen oder Neologismen',
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
          text_de: 'Symptome bestehen über einen Zeitraum von etwa einem Monat oder länger',
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
          text_de: 'Ein vorrangiges manisches oder depressives Zustandsbild erklärt die Symptomatik besser',
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f20.exclude_organic_substance',
          text_de: 'Symptome sind besser durch eine organische Erkrankung oder Substanzwirkung erklärt',
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}
