import type { Disorder } from './schema'
import { UNKNOWN, met } from './schema'
import { domainSignal } from './predicateHelpers'

/**
 * Panikstörung — operationalized from ICD-10 F41.0 / ICD-11 6B01.
 * Original wording; the standard is referenced via `sourceRef`.
 */
export const panicDisorder: Disorder = {
  id: 'panic_disorder',
  classification: 'icd10',
  code: 'F41.0',
  name_de: 'Panikstörung',
  crosswalkKey: 'F41.0',
  sourceRef: 'operationalisiert nach ICD-10 F41.0 / ICD-11 6B01',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F41.0', label_de: 'Panikstörung (episodisch paroxysmale Angst)' },
    icd11: { code: '6B01', label_de: 'Panikstörung' },
    dsm5tr: { code: '300.01', label_de: 'Panic Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Generalisierte Angststörung',
    'Agoraphobie / spezifische Phobie',
    'Kardiale oder endokrine Ursache (z. B. Hyperthyreose, Arrhythmie)',
    'Substanz-/Koffein-induzierte Panik',
  ],
  groups: [
    {
      id: 'f41_0.core',
      label_de: 'Kern: wiederkehrende, unerwartete Panikattacken',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f41_0.recurrent_attacks',
          text_de: 'Wiederkehrende, schwere Panikattacken, die nicht konsistent auf eine spezifische Situation oder ein bestimmtes Objekt beschränkt sind und oft spontan auftreten',
          citation: [{ classification: 'icd10', code: 'F41.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('anxiety_panic_phobic_symptoms', /panik|panikattacke|paroxysmal/i, /keine\s+angst/i),
        },
        {
          id: 'f41_0.anticipatory_worry',
          text_de: 'Anhaltende Besorgnis über weitere Attacken oder deren Folgen zwischen den Attacken (Erwartungsangst)',
          citation: [{ classification: 'icd10', code: 'F41.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const worry = ctx.present('anxiety_panic_phobic_symptoms', /erwartungsangst|sorge.*attacke|angst\s+vor\s+der\s+angst/i)
            return worry ? met(worry.label) : UNKNOWN
          },
        },
      ],
    },
    {
      id: 'f41_0.autonomic',
      label_de: 'Vegetative Attacken-Symptome (mindestens 3)',
      logic: 'at_least_n_of',
      threshold: 3,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f41_0.palpitations',
          text_de: 'Herzklopfen, Herzstolpern oder beschleunigter Herzschlag',
          citation: [{ classification: 'icd10', code: 'F41.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /herzklopfen|palpit|herzrasen|tachykard/i),
        },
        {
          id: 'f41_0.sweating_trembling',
          text_de: 'Schwitzen, Zittern oder Beben',
          citation: [{ classification: 'icd10', code: 'F41.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /schwitz|zittern|beben|tremor/i),
        },
        {
          id: 'f41_0.dyspnea',
          text_de: 'Atemnot, Erstickungs- oder Würgegefühl bzw. Beklemmung in der Brust',
          citation: [{ classification: 'icd10', code: 'F41.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /atemnot|erstick|engegef|brustenge|dyspno/i),
        },
        {
          id: 'f41_0.dizziness',
          text_de: 'Schwindel, Benommenheit, Unsicherheits- oder Ohnmachtsgefühl',
          citation: [{ classification: 'icd10', code: 'F41.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /schwindel|benommen|unsicher/i),
        },
        {
          id: 'f41_0.depersonalization',
          text_de: 'Entfremdungserleben (Depersonalisation oder Derealisation) während der Attacke',
          citation: [{ classification: 'icd10', code: 'F41.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'self_experience_ego_disturbance' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('self_experience_ego_disturbance', /depersonal|dereal|entfremd/i),
        },
        {
          id: 'f41_0.fear_dying',
          text_de: 'Angst zu sterben, die Kontrolle zu verlieren oder „verrückt zu werden“',
          citation: [{ classification: 'icd10', code: 'F41.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('anxiety_panic_phobic_symptoms', /todesangst|angst\s+zu\s+sterben|kontrollverlust|verr[üu]ckt\s+zu\s+werden/i),
        },
      ],
    },
    {
      id: 'f41_0.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f41_0.exclude_organic_substance',
          text_de: 'Attacken sind nicht Folge einer körperlichen Störung, einer organischen psychischen Störung oder einer anderen psychischen Störung',
          citation: [{ classification: 'icd10', code: 'F41.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}
