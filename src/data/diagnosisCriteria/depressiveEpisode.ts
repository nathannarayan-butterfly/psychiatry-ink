import type { Criterion, Disorder } from './schema'
import { UNKNOWN, met } from './schema'
import { domainSignal, durationSignal } from './predicateHelpers'

/**
 * ICD-11 6A70 — distinct depressive-episode symptom clusters.
 *
 * ICD-11 reorganizes the depressive syndrome into THREE clusters: AFFECTIVE
 * (depressed mood; markedly diminished interest/pleasure), COGNITIVE-BEHAVIOURAL
 * (reduced concentration, worthlessness/excessive guilt, hopelessness, recurrent
 * thoughts of death/suicidality) and NEUROVEGETATIVE (sleep disturbance,
 * appetite/weight change, fatigue/loss of energy, psychomotor agitation or
 * retardation). A depressive episode requires ≥ 5 symptoms present nearly every
 * day for ≥ 2 weeks, INCLUDING ≥ 1 affective symptom — a different structure from
 * the ICD-10 F32 "≥ 2 of 3 core + ≥ 2 additional" rule. Authored as ORIGINAL
 * German paraphrases of clinical facts only (no CDDR wording).
 */
const depression6a70Affective: Criterion[] = [
  {
    id: '6a70.depressed_mood',
    text_de:
      'Gedrückte, niedergeschlagene Stimmung über die meiste Zeit des Tages und nahezu täglich, weitgehend unabhängig von den äußeren Umständen (affektives Cluster)',
    citation: [{ classification: 'icd11', code: '6A70', ref: 'affective-mood' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal(
      'mood_affect',
      /gedr[üu]ckt|depress|niedergeschlagen|traurig|dysphor/i,
      /euthym/i,
    ),
  },
  {
    id: '6a70.anhedonia',
    text_de:
      'Deutlich vermindertes Interesse oder Freude an Aktivitäten, besonders an üblicherweise als angenehm erlebten (affektives Cluster)',
    citation: [{ classification: 'icd11', code: '6A70', ref: 'affective-anhedonia' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal(
      'mood_affect',
      /anhedon|interessenverlust|freudlos|freude.*verlust|interesselos/i,
      /keine\s+anhedonie/i,
    ),
  },
]

const depression6a70CognitiveBehavioural: Criterion[] = [
  {
    id: '6a70.concentration',
    text_de:
      'Verminderte Konzentrations- und Aufmerksamkeitsfähigkeit oder ausgeprägte Unschlüssigkeit (kognitiv-behaviorales Cluster)',
    citation: [{ classification: 'icd11', code: '6A70', ref: 'cognitive-concentration' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal(
      'attention_concentration',
      /vermindert|gest[öo]rt|konzentrationsst[öo]rung|unschl[üu]ssig|entscheidung/i,
      /unauff[äa]llig/i,
    ),
  },
  {
    id: '6a70.worthlessness',
    text_de:
      'Gefühle von Wertlosigkeit oder unangemessene, übermäßige Schuldgefühle (kognitiv-behaviorales Cluster)',
    citation: [{ classification: 'icd11', code: '6A70', ref: 'cognitive-worthlessness' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('thought_content', /schuld|wertlos|insuffizien|selbstvorw/i),
  },
  {
    id: '6a70.hopelessness',
    text_de: 'Hoffnungslosigkeit bezogen auf die Zukunft (kognitiv-behaviorales Cluster)',
    citation: [{ classification: 'icd11', code: '6A70', ref: 'cognitive-hopelessness' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('thought_content', /hoffnungslos|perspektivlos|aussichtslos/i),
  },
  {
    id: '6a70.suicidality',
    text_de:
      'Wiederkehrende Gedanken an den Tod oder an Suizid bzw. suizidales oder selbstschädigendes Verhalten (kognitiv-behaviorales Cluster)',
    citation: [{ classification: 'icd11', code: '6A70', ref: 'cognitive-suicidality' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'risk_self', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal(
      'risk_self',
      /suizid|selbstt[öo]tung|selbstsch[äa]dig|lebensm[üu]de|todeswunsch/i,
      /verneint|keine\s+suizid/i,
    ),
  },
]

const depression6a70Neurovegetative: Criterion[] = [
  {
    id: '6a70.sleep',
    text_de:
      'Schlafstörung (Ein- oder Durchschlafstörung, Früherwachen oder vermehrtes Schlafbedürfnis), nahezu täglich (neurovegetatives Cluster)',
    citation: [{ classification: 'icd11', code: '6A70', ref: 'neuroveg-sleep' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal(
      'sleep_appetite_vegetative',
      /schlaf.*(reduziert|gest[öo]rt|verschlecht)|insomn|durchschlaf|einschlaf|fr[üu]herwachen/i,
    ),
  },
  {
    id: '6a70.appetite',
    text_de:
      'Deutliche Veränderung von Appetit oder Gewicht (Minderung oder Steigerung), neurovegetatives Cluster',
    citation: [{ classification: 'icd11', code: '6A70', ref: 'neuroveg-appetite' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('sleep_appetite_vegetative', /appetit|gewicht/i),
  },
  {
    id: '6a70.fatigue',
    text_de:
      'Verminderte Energie, ausgeprägte Ermüdbarkeit oder Erschöpfung bereits nach geringer Anstrengung (neurovegetatives Cluster)',
    citation: [{ classification: 'icd11', code: '6A70', ref: 'neuroveg-fatigue' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal(
      'drive_psychomotor_activity',
      /vermindert|gehemmt|energielos|ersch[öo]pf|m[üu]d|antriebslos/i,
    ),
  },
  {
    id: '6a70.psychomotor',
    text_de:
      'Psychomotorische Unruhe (Agitiertheit) oder Verlangsamung (Hemmung), subjektiv berichtet oder beobachtbar (neurovegetatives Cluster)',
    citation: [{ classification: 'icd11', code: '6A70', ref: 'neuroveg-psychomotor' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('drive_psychomotor_activity', /verlangsamt|gehemmt|agitiert|unruhig|erstarrt/i),
  },
]

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
          text_de:
            'Gedrückte, niedergeschlagene Stimmung an fast allen Tagen und über die meiste Zeit des Tages, weitgehend unabhängig von den äußeren Umständen',
          citation: [{ classification: 'icd10', code: 'F32', ref: 'B1' }],
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
          text_de:
            'Deutlicher Verlust von Interesse oder Freude an üblicherweise angenehmen Aktivitäten',
          citation: [{ classification: 'icd10', code: 'F32', ref: 'B2' }],
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
          text_de:
            'Verminderte Energie bzw. verminderter Antrieb oder erhöhte Ermüdbarkeit, bereits nach geringer Anstrengung',
          citation: [{ classification: 'icd10', code: 'F32', ref: 'B3' }],
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
          text_de: 'Verminderte Fähigkeit zu denken, sich zu konzentrieren oder Entscheidungen zu treffen',
          citation: [{ classification: 'icd10', code: 'F32', ref: 'C4' }],
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
          text_de: 'Vermindertes Selbstwertgefühl bzw. Selbstvertrauen oder unangemessene Schuld- und Wertlosigkeitsgefühle',
          citation: [{ classification: 'icd10', code: 'F32', ref: 'C1/C2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('thought_content', /schuld|wertlos|insuffizien|selbstvorw/i),
        },
        {
          id: 'f32.hopelessness',
          text_de: 'Pessimistische, hoffnungslose Sicht auf die Zukunft',
          citation: [{ classification: 'icd10', code: 'F32' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('thought_content', /hoffnungslos|perspektivlos|aussichtslos/i),
        },
        {
          id: 'f32.sleep',
          text_de: 'Schlafstörung jeglicher Art',
          citation: [{ classification: 'icd10', code: 'F32', ref: 'C6' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'sleep_appetite_vegetative',
            /schlaf.*(reduziert|gest[öo]rt|verschlecht)|insomn|durchschlaf|einschlaf/i,
          ),
        },
        {
          id: 'f32.appetite',
          text_de: 'Appetitveränderung (Minderung oder Steigerung) mit entsprechender Gewichtsveränderung',
          citation: [{ classification: 'icd10', code: 'F32', ref: 'C7' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /appetit|gewicht/i),
        },
        {
          id: 'f32.psychomotor',
          text_de: 'Veränderung der psychomotorischen Aktivität mit Agitiertheit oder Hemmung (subjektiv oder beobachtbar)',
          citation: [{ classification: 'icd10', code: 'F32', ref: 'C5' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('drive_psychomotor_activity', /verlangsamt|gehemmt|agitiert|unruhig|erstarrt/i),
        },
        {
          id: 'f32.suicidality',
          text_de: 'Wiederkehrende Gedanken an den Tod oder an Suizid bzw. suizidales oder selbstschädigendes Verhalten',
          citation: [{ classification: 'icd10', code: 'F32', ref: 'C3' }],
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
          text_de: 'Zu keinem Zeitpunkt der Lebensgeschichte hypomanische oder manische Symptome in einem Ausmaß, das die Kriterien einer hypomanen/manischen Episode erfüllt (spräche für eine bipolare Störung)',
          citation: [{ classification: 'icd10', code: 'F32', ref: 'G2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const manic = ctx.present('mood_affect', /man(i|ie)|gehoben|euphor|expansiv/i)
            return manic ? met(manic.label) : UNKNOWN
          },
        },
        {
          id: 'f32.exclude_organic_substance',
          text_de: 'Episode ist nicht auf eine psychotrope Substanz oder eine organische psychische Störung zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F32', ref: 'G3' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6A70 (Depressive Störung, einzelne Episode) — DISTINCT structure.
  // ICD-10 F32 counts ≥ 2 of 3 core symptoms PLUS ≥ 2 additional symptoms.
  // ICD-11 instead requires ≥ 5 symptoms (nearly every day, ≥ 2 weeks) drawn
  // from THREE clusters (affective / cognitive-behavioural / neurovegetative),
  // of which at least ONE must be affective. Modelled as an `any_of` affective
  // gate (≥ 1), an `at_least_n_of` total-symptom group (threshold 5 across all
  // clusters, reusing the affective criteria as in the 6A20 pattern), a duration
  // group (≥ 14 days), a severity specifier (mild/moderate/severe) and the
  // standard mania/hypomania + substance/organic exclusions.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6A70',
    groups: [
      {
        id: '6a70.affective_core',
        label_de: 'Affektives Kernsymptom (mindestens eines erforderlich)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: depression6a70Affective,
      },
      {
        id: '6a70.total_symptoms',
        label_de:
          'Gesamtsymptomatik aus allen drei Clustern (mindestens 5, nahezu täglich, einschließlich mindestens eines affektiven Symptoms)',
        logic: 'at_least_n_of',
        threshold: 5,
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 14 },
        criteria: [
          ...depression6a70Affective,
          ...depression6a70CognitiveBehavioural,
          ...depression6a70Neurovegetative,
        ],
      },
      {
        id: '6a70.duration',
        label_de: 'Zeitkriterium',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 14 },
        criteria: [
          {
            id: '6a70.duration_two_weeks',
            text_de:
              'Die Symptomatik besteht über einen Zeitraum von mindestens zwei Wochen nahezu durchgehend',
            citation: [{ classification: 'icd11', code: '6A70', ref: 'duration' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
            operationalRule: durationSignal(14),
          },
        ],
      },
      {
        id: '6a70.severity',
        label_de: 'Schweregrad-Spezifizierer (leicht / mittelgradig / schwer)',
        logic: 'any_of',
        groupType: 'severity',
        criteria: [
          {
            id: '6a70.severity_mild',
            text_de:
              'Leichte Episode: keines der Symptome ist besonders stark ausgeprägt, mit nur geringer Beeinträchtigung der alltäglichen Funktionsfähigkeit',
            citation: [{ classification: 'icd11', code: '6A70.0', ref: 'mild' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
          },
          {
            id: '6a70.severity_moderate',
            text_de:
              'Mittelgradige Episode: mehrere Symptome ausgeprägt oder zahlreiche leichtere Symptome mit deutlicher Beeinträchtigung der Funktionsfähigkeit, ohne Wahn oder Halluzinationen',
            citation: [{ classification: 'icd11', code: '6A70.1', ref: 'moderate' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
          },
          {
            id: '6a70.severity_severe',
            text_de:
              'Schwere Episode: viele oder die meisten Symptome stark ausgeprägt mit erheblicher Funktionsbeeinträchtigung, gegebenenfalls mit psychotischen Symptomen',
            citation: [{ classification: 'icd11', code: '6A70.2', ref: 'severe' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: '6a70.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6a70.exclude_mania',
            text_de:
              'Zu keinem Zeitpunkt der Lebensgeschichte traten manische, gemischte oder hypomanische Episoden auf (deren Vorliegen spräche für eine bipolare Störung)',
            citation: [{ classification: 'icd11', code: '6A70', ref: 'exclude-mania' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
            allowClinicianAttest: true,
            operationalRule: (ctx) => {
              const manic = ctx.present('mood_affect', /man(i|ie)|gehoben|euphor|expansiv/i)
              return manic ? met(manic.label) : UNKNOWN
            },
          },
          {
            id: '6a70.exclude_substance_organic',
            text_de:
              'Die Symptomatik ist nicht auf eine psychotrope Substanz, ein Medikament oder eine andere körperliche bzw. organische Ursache zurückzuführen',
            citation: [{ classification: 'icd11', code: '6A70', ref: 'exclude-substance' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}
