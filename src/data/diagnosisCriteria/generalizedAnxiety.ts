import type { Disorder } from './schema'
import { UNKNOWN, met } from './schema'
import { domainSignal, durationSignal } from './predicateHelpers'

/**
 * Generalisierte Angststörung — operationalized from ICD-10 F41.1 / ICD-11 6B00.
 * Original wording; clinical facts (frei flottierende Angst, ≥6 Monate,
 * vegetative Begleitsymptome) reference the standard via `sourceRef`.
 */
export const generalizedAnxiety: Disorder = {
  id: 'generalized_anxiety_disorder',
  classification: 'icd10',
  code: 'F41.1',
  name_de: 'Generalisierte Angststörung',
  crosswalkKey: 'F41.1',
  sourceRef: 'operationalisiert nach ICD-10 F41.1 / ICD-11 6B00',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F41.1', label_de: 'Generalisierte Angststörung' },
    icd11: { code: '6B00', label_de: 'Generalisierte Angststörung' },
    dsm5tr: { code: '300.02', label_de: 'Generalized Anxiety Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Panikstörung',
    'Soziale Angststörung / Phobie',
    'Depressive Episode mit Angstanteil',
    'Substanz- oder koffeininduzierte Angst, Hyperthyreose',
  ],
  groups: [
    {
      id: 'f41_1.core',
      label_de: 'Kern: anhaltende, frei flottierende Angst',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 180 },
      criteria: [
        {
          id: 'f41_1.persistent_worry',
          text_de: 'Anhaltende, nicht situationsgebundene Anspannung, Sorge oder Befürchtungen an den meisten Tagen',
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'anxiety_panic_phobic_symptoms',
            /angst|sorge|bef[üu]rcht|anspannung|nerv[öo]s|besorg/i,
            /keine\s+angst/i,
          ),
        },
        {
          id: 'f41_1.duration',
          text_de: 'Beschwerden bestehen über mehrere Monate (Größenordnung ≥ 6 Monate)',
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
          operationalRule: durationSignal(180),
        },
      ],
    },
    {
      id: 'f41_1.associated',
      label_de: 'Vegetative/Anspannungssymptome (mindestens 3)',
      logic: 'at_least_n_of',
      threshold: 3,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f41_1.restlessness',
          text_de: 'Innere Unruhe, Ruhelosigkeit oder „Nervosität“',
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('drive_psychomotor_activity', /unruhig|ruhelos|getrieben|gesteigert/i),
        },
        {
          id: 'f41_1.fatigue',
          text_de: 'Leichte Ermüdbarkeit',
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('drive_psychomotor_activity', /ersch[öo]pf|erm[üu]d|abgeschlagen/i),
        },
        {
          id: 'f41_1.concentration',
          text_de: 'Konzentrationsschwierigkeiten oder „Leere im Kopf“',
          mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('attention_concentration', /vermindert|gest[öo]rt|konzentration/i, /unauff[äa]llig/i),
        },
        {
          id: 'f41_1.irritability',
          text_de: 'Reizbarkeit oder affektive Labilität',
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /reizbar|labil|gereizt/i),
        },
        {
          id: 'f41_1.muscle_tension',
          text_de: 'Muskelverspannung oder körperliche Anspannungssymptome',
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /verspann|anspannung|muskel|kopfschmerz|zittern/i),
        },
        {
          id: 'f41_1.sleep',
          text_de: 'Schlafstörung durch Sorgen oder Anspannung',
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /schlaf.*(reduziert|gest[öo]rt)|einschlaf|durchschlaf|insomn/i),
        },
        {
          id: 'f41_1.autonomic',
          text_de: 'Vegetative Symptome (Herzklopfen, Schwitzen, Schwindel, Magen-Darm-Beschwerden)',
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /herzklopfen|palpit|schwitz|schwindel|[üu]belkeit|magen/i),
        },
      ],
    },
    {
      id: 'f41_1.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f41_1.exclude_substance_medical',
          text_de: 'Angst ist besser durch eine somatische Ursache (z. B. Hyperthyreose) oder Substanzwirkung erklärt',
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f41_1.exclude_panic_primary',
          text_de: 'Beschwerden sind ausschließlich auf abgrenzbare Panikattacken oder phobische Situationen beschränkt',
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const panicOnly = ctx.present('anxiety_panic_phobic_symptoms', /panikattacke|nur\s+situativ|ausschlie[ßs]lich\s+phob/i)
            return panicOnly ? met(panicOnly.label) : UNKNOWN
          },
        },
      ],
    },
  ],
}
