import type { Disorder } from './schema'
import { UNKNOWN, met } from './schema'
import { domainSignal } from './predicateHelpers'

/**
 * Depressive episode — operationalized from ICD-10 F32 / ICD-11 6A70.
 * Wording is original; clinical facts (≥2 core + ≥2 additional symptoms,
 * ≥2 weeks) reference the standard via `sourceRef`.
 */
export const depressiveEpisode: Disorder = {
  id: 'depressive_episode',
  classification: 'icd10',
  code: 'F32',
  name_de: 'Depressive Episode',
  crosswalkKey: 'F32.9',
  sourceRef: 'operationalisiert nach ICD-10 F32 / ICD-11 6A70',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F32.9', label_de: 'Depressive Episode, nicht näher bezeichnet' },
    icd11: { code: '6A70', label_de: 'Depressive Störung, einzelne Episode' },
    dsm5tr: { code: '296.2x', label_de: 'Major Depressive Disorder, single episode (Crosswalk)' },
  },
  differentials_de: [
    'Anpassungsstörung',
    'Bipolare Depression (Hinweise auf frühere manische/hypomane Phasen prüfen)',
    'Dysthymie / anhaltende depressive Störung',
    'Organische oder substanzbedingte affektive Störung',
  ],
  groups: [
    {
      id: 'f32.core',
      label_de: 'Kernsymptome (mindestens 2 von 3)',
      logic: 'at_least_n_of',
      threshold: 2,
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 14 },
      criteria: [
        {
          id: 'f32.depressed_mood',
          text_de: 'Gedrückte, niedergeschlagene Stimmung über die meiste Zeit des Tages',
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'mood_affect',
            /gedr[üu]ckt|depress|niedergeschlagen|traurig|dysphor/i,
            /euthym/i,
          ),
        },
        {
          id: 'f32.anhedonia',
          text_de: 'Verlust von Interesse oder Freude an üblicherweise angenehmen Aktivitäten',
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'mood_affect',
            /anhedon|interessenverlust|freudlos|freude.*verlust|interesselos/i,
            /keine\s+anhedonie/i,
          ),
        },
        {
          id: 'f32.reduced_energy',
          text_de: 'Verminderter Antrieb oder gesteigerte Ermüdbarkeit',
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'drive_psychomotor_activity',
            /vermindert|gehemmt|energielos|ersch[öo]pf|m[üu]d|antriebslos/i,
          ),
        },
      ],
    },
    {
      id: 'f32.additional',
      label_de: 'Zusatzsymptome (mindestens 2)',
      logic: 'at_least_n_of',
      threshold: 2,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f32.concentration',
          text_de: 'Verminderte Konzentration und Aufmerksamkeit',
          mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'attention_concentration',
            /vermindert|gest[öo]rt|konzentrationsst[öo]rung/i,
            /unauff[äa]llig/i,
          ),
        },
        {
          id: 'f32.guilt_worthlessness',
          text_de: 'Gefühle von Wertlosigkeit oder unangemessene Schuldgefühle',
          mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('thought_content', /schuld|wertlos|insuffizien|selbstvorw/i),
        },
        {
          id: 'f32.hopelessness',
          text_de: 'Pessimistische, hoffnungslose Zukunftsperspektive',
          mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('thought_content', /hoffnungslos|perspektivlos|aussichtslos/i),
        },
        {
          id: 'f32.sleep',
          text_de: 'Schlafstörung jeglicher Art',
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'sleep_appetite_vegetative',
            /schlaf.*(reduziert|gest[öo]rt|verschlecht)|insomn|durchschlaf|einschlaf/i,
          ),
        },
        {
          id: 'f32.appetite',
          text_de: 'Appetit- oder Gewichtsveränderung',
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /appetit|gewicht/i),
        },
        {
          id: 'f32.psychomotor',
          text_de: 'Psychomotorische Hemmung oder Agitiertheit',
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('drive_psychomotor_activity', /verlangsamt|gehemmt|agitiert|unruhig|erstarrt/i),
        },
        {
          id: 'f32.suicidality',
          text_de: 'Suizidgedanken oder selbstschädigendes Verhalten',
          mappingHints: [{ kind: 'isdm_domain', ref: 'risk_self', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'risk_self',
            /suizid|selbstt[öo]tung|selbstsch[äa]dig|lebensm[üu]de|todeswunsch/i,
            /verneint|keine\s+suizid/i,
          ),
        },
      ],
    },
    {
      id: 'f32.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f32.exclude_mania',
          text_de: 'Aktuelle oder frühere manische bzw. hypomane Episode (spräche für eine bipolare Störung)',
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const manic = ctx.present('mood_affect', /man(i|ie)|gehoben|euphor|expansiv/i)
            return manic ? met(manic.label) : UNKNOWN
          },
        },
        {
          id: 'f32.exclude_organic_substance',
          text_de: 'Symptome sind besser durch eine organische Ursache oder Substanzwirkung erklärt',
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}
