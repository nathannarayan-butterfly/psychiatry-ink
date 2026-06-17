/**
 * Butterfly criteria — block F0: organische, einschließlich symptomatischer
 * psychischer Störungen (neurokognitive Störungen, ICD-10 F00–F09).
 *
 * LICENSING: every `text_de` is an ORIGINAL German operational paraphrase. Only
 * the clinical FACTS (symptom profile, duration thresholds, onset pattern) are
 * encoded — never ICD/DSM criterion wording. Each criterion carries a
 * structured `citation` anchoring it to the ICD-10 code whose criterion
 * STRUCTURE the app follows; ICD-11 crosswalks live in `codingSystems.icd11`
 * (and in citations where confident). DSM is a label-only crosswalk.
 *
 * AUTO-RULES: an `operationalRule` is attached ONLY where the mapping to the
 * app's structured phenomenology (DisorderEvaluationContext) is clean and
 * obviously correct (e.g. memory decline → `memory_cognition`, hallucinations →
 * `perception_hallucinations`). Everything that depends on aetiology, course
 * shape, or "absence of clouding" is left attestation-only (clinician checkbox)
 * to keep the engine honest. All records ship as `status: 'draft'`.
 */

import type { Disorder } from '../schema'
import { domainSignal, durationSignal } from '../predicateHelpers'

// Shared regexes for the cognitive phenomenology domain.
const MEMORY_DECLINE = /ged[äa]chtnis|merkf[äa]hig|amnesie|vergess|einpr[äa]g|neuged[äa]chtnis|erinnerung/i
const COGNITIVE_DECLINE = /kognitiv|aphas|apraxi|agnos|exekutiv|urteilsverm|abstrakt|wortfindung|planung|denkverlangsam/i
const DISORIENTATION = /orientierung|desorient|verwirrt|zeitlich.*[öo]rtlich/i
const CLOUDING = /bewusstsein.*(getr[üu]bt|tr[üu]b|st[öo]r)|somnolen|sopor|vigilanzminder|qualitative\s+bewusstsein|benommen/i
const FUNCTIONAL = /alltag|beeintr[äa]cht|selbstversorgung|funktionsverlust|haushalt|berufsf[äa]hig|pflegebed/i

export const f0OrganicDisorders: Disorder[] = [
  {
    id: 'dementia_alzheimer',
    classification: 'icd10',
    code: 'F00',
    name_de: 'Demenz bei Alzheimer-Krankheit',
    crosswalkKey: 'F00',
    sourceRef: 'operationalisiert nach ICD-10 F00 / ICD-11 6D80',
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code: 'F00.9', label_de: 'Demenz bei Alzheimer-Krankheit, nicht näher bezeichnet' },
      icd11: { code: '6D80', label_de: 'Demenz bei Alzheimer-Krankheit' },
      dsm5tr: { code: '331.0 / G30.9', label_de: 'Major Neurocognitive Disorder due to Alzheimer’s Disease (Crosswalk)' },
    },
    differentials_de: [
      'Vaskuläre Demenz (schrittweiser Verlauf, fokal-neurologische Zeichen)',
      'Depressive Pseudodemenz',
      'Delir (akuter Beginn, fluktuierende Bewusstseinslage)',
      'Frontotemporale Demenz oder Lewy-Körper-Demenz',
      'Normale altersassoziierte kognitive Veränderung',
    ],
    groups: [
      {
        id: 'f00.cognition',
        label_de: 'Kognitive Kernsymptome',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 180 },
        criteria: [
          {
            id: 'f00.memory_impairment',
            text_de: 'Nachlassen des Gedächtnisses, am deutlichsten beim Lernen neuer Informationen, in einem Ausmaß, das über normales Vergessen hinausgeht',
            citation: [{ classification: 'icd10', code: 'F00', ref: 'G1.1' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('memory_cognition', MEMORY_DECLINE, /ged[äa]chtnis.*(unauff[äa]llig|intakt|erhalten)/i),
          },
          {
            id: 'f00.cognitive_decline',
            text_de: 'Abnahme weiterer höherer kognitiver Funktionen (z. B. Urteilsvermögen, Denken, Planen, Sprache) gegenüber dem früheren Leistungsniveau',
            citation: [{ classification: 'icd10', code: 'F00', ref: 'G1.2' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('memory_cognition', COGNITIVE_DECLINE),
          },
        ],
      },
      {
        id: 'f00.course',
        label_de: 'Verlauf und Beeinträchtigung',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 180 },
        criteria: [
          {
            id: 'f00.duration_six_months',
            text_de: 'Die Symptome bestehen seit mindestens etwa sechs Monaten',
            citation: [{ classification: 'icd10', code: 'F00', ref: 'G1' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
            operationalRule: durationSignal(180),
          },
          {
            id: 'f00.insidious_onset',
            text_de: 'Schleichender Beginn mit langsamer, kontinuierlicher Verschlechterung ohne abrupte Verschlechterungsschübe',
            citation: [{ classification: 'icd10', code: 'F00' }],
            mappingHints: [{ kind: 'course', ref: 'onset' }],
            allowClinicianAttest: true,
          },
          {
            id: 'f00.functional_impact',
            text_de: 'Beeinträchtigung der Bewältigung von Alltagsaktivitäten infolge des kognitiven Abbaus',
            citation: [{ classification: 'icd10', code: 'F00', ref: 'G1' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('functional_impairment', FUNCTIONAL),
          },
        ],
      },
      {
        id: 'f00.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: 'f00.exclude_clouding',
            text_de: 'Keine Bewusstseinstrübung, die auf ein Delir hinweisen würde (Bewusstsein ist klar)',
            citation: [{ classification: 'icd10', code: 'F00', ref: 'G4' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'consciousness_orientation' }],
            allowClinicianAttest: true,
          },
          {
            id: 'f00.exclude_other_cause',
            text_de: 'Kein Hinweis auf eine andere systemische oder Hirnerkrankung bzw. auf cerebrovaskuläre Schädigungen, die das Bild besser erklären',
            citation: [{ classification: 'icd10', code: 'F00' }],
            mappingHints: [{ kind: 'diagnosis', ref: 'aetiology' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },

  {
    id: 'vascular_dementia',
    classification: 'icd10',
    code: 'F01',
    name_de: 'Vaskuläre Demenz',
    crosswalkKey: 'F01',
    sourceRef: 'operationalisiert nach ICD-10 F01 / ICD-11 6D81',
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code: 'F01.9', label_de: 'Vaskuläre Demenz, nicht näher bezeichnet' },
      icd11: { code: '6D81', label_de: 'Vaskuläre Demenz' },
      dsm5tr: { code: '290.40', label_de: 'Major Vascular Neurocognitive Disorder (Crosswalk)' },
    },
    differentials_de: [
      'Demenz bei Alzheimer-Krankheit (schleichend, kontinuierlich)',
      'Gemischte (vaskuläre und Alzheimer-) Demenz',
      'Delir',
      'Depression mit kognitiven Defiziten',
    ],
    groups: [
      {
        id: 'f01.cognition',
        label_de: 'Kognitives Abbausyndrom',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 180 },
        criteria: [
          {
            id: 'f01.memory_impairment',
            text_de: 'Nachlassen des Gedächtnisses und weiterer kognitiver Funktionen, das die Alltagsbewältigung beeinträchtigt',
            citation: [{ classification: 'icd10', code: 'F01', ref: 'G1' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('memory_cognition', MEMORY_DECLINE),
          },
          {
            id: 'f01.uneven_deficits',
            text_de: 'Ungleichmäßiges („fleckförmiges“) Defizitmuster, bei dem einzelne kognitive Funktionen betroffen, andere relativ erhalten sind',
            citation: [{ classification: 'icd10', code: 'F01' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: 'f01.vascular',
        label_de: 'Hinweise auf zerebrovaskuläre Genese',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: 'f01.stepwise_course',
            text_de: 'Schrittweise (stufenförmige) Verschlechterung, häufig mit zeitlichem Bezug zu zerebrovaskulären Ereignissen',
            citation: [{ classification: 'icd10', code: 'F01' }],
            mappingHints: [{ kind: 'course', ref: 'trajectory' }],
            allowClinicianAttest: true,
          },
          {
            id: 'f01.focal_signs',
            text_de: 'Fokal-neurologische Zeichen oder anamnestische/bildgebende Belege für eine zerebrovaskuläre Erkrankung, die ursächlich angenommen wird',
            citation: [{ classification: 'icd10', code: 'F01' }],
            mappingHints: [{ kind: 'diagnosis', ref: 'cerebrovascular' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: 'f01.course',
        label_de: 'Dauer',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 180 },
        criteria: [
          {
            id: 'f01.duration_six_months',
            text_de: 'Die Symptomatik besteht seit mindestens etwa sechs Monaten',
            citation: [{ classification: 'icd10', code: 'F01' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
            operationalRule: durationSignal(180),
          },
        ],
      },
      {
        id: 'f01.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: 'f01.exclude_clouding',
            text_de: 'Keine Bewusstseinstrübung im Sinne eines Delirs',
            citation: [{ classification: 'icd10', code: 'F01' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'consciousness_orientation' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },

  {
    id: 'frontotemporal_dementia',
    classification: 'icd10',
    code: 'F02.0',
    name_de: 'Frontotemporale Demenz',
    crosswalkKey: 'F02.0',
    sourceRef: 'operationalisiert nach ICD-10 F02.0 (Demenz bei Pick-Krankheit) / ICD-11 6D83',
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code: 'F02.0', label_de: 'Demenz bei Pick-Krankheit' },
      icd11: { code: '6D83', label_de: 'Frontotemporale Demenz' },
      dsm5tr: { code: '331.19', label_de: 'Major Frontotemporal Neurocognitive Disorder (Crosswalk)' },
    },
    differentials_de: [
      'Demenz bei Alzheimer-Krankheit (frühe Gedächtnisstörung im Vordergrund)',
      'Primär psychiatrische Störung (z. B. späte Manie, Depression)',
      'Organische Persönlichkeitsstörung ohne progredienten kognitiven Abbau',
    ],
    groups: [
      {
        id: 'f02_0.behavior',
        label_de: 'Früh führende Verhaltens-/Sprachsymptome',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: 'f02_0.personality_change',
            text_de: 'Frühe, ausgeprägte Veränderung von Persönlichkeit und Sozialverhalten mit Enthemmung, Verlust sozialer Umgangsformen, Apathie oder Antriebsminderung',
            citation: [{ classification: 'icd10', code: 'F02.0' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('personality_interpersonal_style', /enthemm|distanzlos|sozialverhalten|pers[öo]nlichkeitsver[äa]nder|apath|taktlos|impulskontroll/i),
          },
          {
            id: 'f02_0.language_decline',
            text_de: 'Früher Abbau der sprachlichen Ausdrucksfähigkeit (Wortfindungs- oder Sprachverarmung) bei zunächst relativ erhaltenem Gedächtnis',
            citation: [{ classification: 'icd10', code: 'F02.0' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'speech_language', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('speech_language', /wortfindung|sprachverarmung|sprachabbau|reduzierte\s+spontansprache|verstummen/i),
          },
        ],
      },
      {
        id: 'f02_0.course',
        label_de: 'Verlauf',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 180 },
        criteria: [
          {
            id: 'f02_0.insidious_onset',
            text_de: 'Schleichender Beginn und langsam fortschreitender Verlauf seit mindestens etwa sechs Monaten',
            citation: [{ classification: 'icd10', code: 'F02.0' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
            operationalRule: durationSignal(180),
          },
          {
            id: 'f02_0.relative_memory_sparing',
            text_de: 'Gedächtnis- und räumliche Orientierungsleistungen sind im Frühstadium relativ besser erhalten als die Verhaltens- bzw. Sprachstörung',
            citation: [{ classification: 'icd10', code: 'F02.0' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: 'f02_0.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: 'f02_0.exclude_other_cause',
            text_de: 'Das Bild ist nicht besser durch eine andere Hirnerkrankung, ein Delir oder eine primär affektive Störung erklärbar',
            citation: [{ classification: 'icd10', code: 'F02.0' }],
            mappingHints: [{ kind: 'diagnosis', ref: 'aetiology' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },

  {
    id: 'dementia_lewy_bodies',
    classification: 'icd10',
    code: 'F02.8',
    name_de: 'Demenz mit Lewy-Körperchen',
    crosswalkKey: 'F02.8',
    sourceRef: 'operationalisiert nach ICD-10 F02.8 / ICD-11 6D82',
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code: 'F02.8', label_de: 'Demenz bei anderenorts klassifizierten Krankheiten' },
      icd11: { code: '6D82', label_de: 'Demenz bei Lewy-Körper-Krankheit' },
      dsm5tr: { code: '331.82', label_de: 'Major Neurocognitive Disorder with Lewy Bodies (Crosswalk)' },
    },
    differentials_de: [
      'Demenz bei Alzheimer-Krankheit',
      'Parkinson-Demenz',
      'Delir (akut, fluktuierend) — kann der Lewy-Demenz ähneln',
      'Substanz-/medikamenteninduzierte Halluzinationen',
    ],
    groups: [
      {
        id: 'f02_8.core',
        label_de: 'Demenz mit charakteristischen Kernmerkmalen',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 180 },
        criteria: [
          {
            id: 'f02_8.progressive_decline',
            text_de: 'Fortschreitender kognitiver Abbau, der die Alltagsbewältigung beeinträchtigt',
            citation: [{ classification: 'icd10', code: 'F02.8' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('memory_cognition', MEMORY_DECLINE),
          },
        ],
      },
      {
        id: 'f02_8.features',
        label_de: 'Charakteristische Merkmale (mindestens 2)',
        logic: 'at_least_n_of',
        threshold: 2,
        groupType: 'inclusion',
        criteria: [
          {
            id: 'f02_8.fluctuating_cognition',
            text_de: 'Ausgeprägte Schwankungen der kognitiven Leistungsfähigkeit, insbesondere von Aufmerksamkeit und Wachheit',
            citation: [{ classification: 'icd10', code: 'F02.8' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('attention_concentration', /fluktu|schwank|wechselnd|vigilanzschwank/i),
          },
          {
            id: 'f02_8.visual_hallucinations',
            text_de: 'Wiederkehrende, meist detaillierte und konkrete optische Halluzinationen',
            citation: [{ classification: 'icd10', code: 'F02.8' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'perception_hallucinations', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('perception_hallucinations', /optisch|visuell|sehen.*nicht.*vorhanden|gestalten|halluzin/i),
          },
          {
            id: 'f02_8.parkinsonism',
            text_de: 'Spontan auftretende Parkinson-Symptome (z. B. Rigor, Bradykinese, Ruhetremor)',
            citation: [{ classification: 'icd10', code: 'F02.8' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'appearance_behavior' }],
            allowClinicianAttest: true,
          },
          {
            id: 'f02_8.rem_sleep_neuroleptic',
            text_de: 'Unterstützende Hinweise wie REM-Schlaf-Verhaltensstörung oder ausgeprägte Überempfindlichkeit gegenüber Neuroleptika',
            citation: [{ classification: 'icd10', code: 'F02.8' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: 'f02_8.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: 'f02_8.exclude_delirium_substance',
            text_de: 'Die Symptome sind nicht besser durch ein Delir oder durch die Wirkung von Substanzen/Medikamenten erklärbar',
            citation: [{ classification: 'icd10', code: 'F02.8' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },

  {
    id: 'delirium_not_substance_induced',
    classification: 'icd10',
    code: 'F05',
    name_de: 'Delir, nicht durch Substanzen bedingt',
    crosswalkKey: 'F05',
    sourceRef: 'operationalisiert nach ICD-10 F05 / ICD-11 6D70',
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code: 'F05.9', label_de: 'Delir, nicht näher bezeichnet' },
      icd11: { code: '6D70', label_de: 'Delir' },
      dsm5tr: { code: '293.0', label_de: 'Delirium (Crosswalk)' },
    },
    differentials_de: [
      'Demenz (schleichender Beginn, klares Bewusstsein)',
      'Substanzinduziertes Delir (Intoxikation/Entzug, F1x.4)',
      'Akute psychotische Störung',
      'Nicht-konvulsiver Status epilepticus',
    ],
    groups: [
      {
        id: 'f05.consciousness',
        label_de: 'Bewusstseins- und Aufmerksamkeitsstörung',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: 'f05.clouded_consciousness',
            text_de: 'Störung von Bewusstsein und Wachheit mit reduzierter Klarheit der Umgebungswahrnehmung',
            citation: [{ classification: 'icd10', code: 'F05', ref: 'A' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'consciousness_orientation', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('consciousness_orientation', CLOUDING),
          },
          {
            id: 'f05.attention_disturbance',
            text_de: 'Verminderte Fähigkeit, die Aufmerksamkeit auszurichten, aufrechtzuerhalten und zu verlagern',
            citation: [{ classification: 'icd10', code: 'F05', ref: 'A' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('attention_concentration', /aufmerksamkeit.*(vermindert|gest[öo]rt|reduziert)|ablenkbar|unaufmerksam/i),
          },
        ],
      },
      {
        id: 'f05.global',
        label_de: 'Globale kognitive Störung (mindestens 1)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: 'f05.disorientation',
            text_de: 'Störung des Gedächtnisses und der Orientierung (zeitlich, örtlich oder zur Person)',
            citation: [{ classification: 'icd10', code: 'F05', ref: 'B' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'consciousness_orientation', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('consciousness_orientation', DISORIENTATION),
          },
          {
            id: 'f05.perceptual_disturbance',
            text_de: 'Wahrnehmungsstörungen wie Verkennungen, Illusionen oder (meist optische) Halluzinationen',
            citation: [{ classification: 'icd10', code: 'F05', ref: 'B' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'perception_hallucinations', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('perception_hallucinations', /illusion|verkennung|halluzin|optisch|szenisch/i),
          },
          {
            id: 'f05.psychomotor_disturbance',
            text_de: 'Psychomotorische Störung mit raschem Wechsel zwischen Hyper- und Hypoaktivität',
            citation: [{ classification: 'icd10', code: 'F05', ref: 'C' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('drive_psychomotor_activity', /agitiert|unruhig|hyperaktiv|verlangsamt|hypoaktiv|n[äa]chtlich/i),
          },
          {
            id: 'f05.sleep_wake_disturbance',
            text_de: 'Störung des Schlaf-Wach-Rhythmus (z. B. Schlaflosigkeit, nächtliche Verschlimmerung, Umkehr des Rhythmus)',
            citation: [{ classification: 'icd10', code: 'F05', ref: 'D' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('sleep_appetite_vegetative', /schlaf-wach|schlafumkehr|n[äa]chtlich.*unruhig|schlaflos/i),
          },
        ],
      },
      {
        id: 'f05.course',
        label_de: 'Akuter, fluktuierender Verlauf',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: 'f05.acute_fluctuating',
            text_de: 'Rascher (Stunden bis Tage) Beginn und im Tagesverlauf schwankende Ausprägung der Symptomatik',
            citation: [{ classification: 'icd10', code: 'F05', ref: 'E' }],
            mappingHints: [{ kind: 'course', ref: 'onset' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: 'f05.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: 'f05.exclude_substance',
            text_de: 'Das Delir ist nicht durch Alkohol oder andere psychotrope Substanzen bedingt (sonst F1x.4), sondern auf eine somatische Erkrankung oder zerebrale Ursache zurückzuführen',
            citation: [{ classification: 'icd10', code: 'F05' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },

  {
    id: 'organic_amnestic_syndrome',
    classification: 'icd10',
    code: 'F04',
    name_de: 'Organisches amnestisches Syndrom',
    crosswalkKey: 'F04',
    sourceRef: 'operationalisiert nach ICD-10 F04 / ICD-11 6D72',
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code: 'F04', label_de: 'Organisches amnestisches Syndrom, nicht durch Alkohol oder andere psychotrope Substanzen bedingt' },
      icd11: { code: '6D72', label_de: 'Amnestische Störung' },
      dsm5tr: { code: '294.0', label_de: 'Major Neurocognitive Disorder, amnestic presentation (Crosswalk)' },
    },
    differentials_de: [
      'Demenz (zusätzlich breiterer kognitiver Abbau)',
      'Delir (Bewusstseins- und Aufmerksamkeitsstörung)',
      'Alkoholbedingtes amnestisches Syndrom / Korsakow-Syndrom (F10.6)',
      'Dissoziative Amnesie',
    ],
    groups: [
      {
        id: 'f04.memory',
        label_de: 'Gedächtnisstörung im Vordergrund',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: 'f04.anterograde_retrograde',
            text_de: 'Deutliche Störung des Kurzzeit- bzw. Neugedächtnisses (anterograde Amnesie) und häufig auch des Abrufs zurückliegender Inhalte (retrograde Amnesie)',
            citation: [{ classification: 'icd10', code: 'F04', ref: 'A' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('memory_cognition', /amnesie|neuged[äa]chtnis|kurzzeitged[äa]chtnis|merkf[äa]hig|einpr[äa]g/i),
          },
          {
            id: 'f04.immediate_recall_preserved',
            text_de: 'Unmittelbare Wiedergabe (z. B. Zahlennachsprechen) sowie das Bewusstsein sind erhalten',
            citation: [{ classification: 'icd10', code: 'F04', ref: 'B' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'consciousness_orientation' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: 'f04.aetiology',
        label_de: 'Organische Grundlage',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: 'f04.organic_cause',
            text_de: 'Nachweis oder begründete Annahme einer hirnschädigenden Erkrankung oder Funktionsstörung (nicht durch Alkohol/Substanzen) als Ursache',
            citation: [{ classification: 'icd10', code: 'F04' }],
            mappingHints: [{ kind: 'diagnosis', ref: 'aetiology' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: 'f04.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: 'f04.exclude_global_decline',
            text_de: 'Kein allgemeiner Abbau der intellektuellen Leistungsfähigkeit, wie er für eine Demenz typisch wäre, und keine Aufmerksamkeitsstörung im Sinne eines Delirs',
            citation: [{ classification: 'icd10', code: 'F04' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition' }],
            allowClinicianAttest: true,
          },
          {
            id: 'f04.exclude_substance',
            text_de: 'Die Störung ist nicht durch Alkohol oder andere psychotrope Substanzen verursacht',
            citation: [{ classification: 'icd10', code: 'F04' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },

  {
    id: 'mild_cognitive_disorder',
    classification: 'icd10',
    code: 'F06.7',
    name_de: 'Leichte kognitive Störung',
    crosswalkKey: 'F06.7',
    sourceRef: 'operationalisiert nach ICD-10 F06.7 / ICD-11 6D71',
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code: 'F06.7', label_de: 'Leichte kognitive Störung' },
      icd11: { code: '6D71', label_de: 'Leichte neurokognitive Störung' },
      dsm5tr: { code: '331.83', label_de: 'Mild Neurocognitive Disorder (Crosswalk)' },
    },
    differentials_de: [
      'Demenz (Beeinträchtigung der selbständigen Alltagsbewältigung)',
      'Delir',
      'Depression mit subjektiven Konzentrationsstörungen',
      'Normale altersassoziierte kognitive Veränderung',
    ],
    groups: [
      {
        id: 'f06_7.cognition',
        label_de: 'Leichter kognitiver Leistungsabfall',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: 'f06_7.cognitive_decline',
            text_de: 'Abnahme kognitiver Leistungen (z. B. Gedächtnis, Konzentration, Lernen) gegenüber dem früheren Niveau, subjektiv beklagt und objektivierbar',
            citation: [{ classification: 'icd10', code: 'F06.7' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('memory_cognition', /ged[äa]chtnis|konzentration|kognitiv|merkf[äa]hig|leistungsabfall|vergess/i),
          },
          {
            id: 'f06_7.organic_context',
            text_de: 'Die kognitiven Schwierigkeiten treten im Zusammenhang mit einer körperlichen bzw. zerebralen Erkrankung auf',
            citation: [{ classification: 'icd10', code: 'F06.7' }],
            mappingHints: [{ kind: 'diagnosis', ref: 'aetiology' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: 'f06_7.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: 'f06_7.exclude_dementia',
            text_de: 'Das Ausmaß rechtfertigt nicht die Diagnose einer Demenz, eines Delirs oder eines amnestischen Syndroms; die selbständige Alltagsbewältigung ist im Wesentlichen erhalten',
            citation: [{ classification: 'icd10', code: 'F06.7' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },

  {
    id: 'organic_personality_disorder',
    classification: 'icd10',
    code: 'F07.0',
    name_de: 'Organische Persönlichkeitsstörung',
    crosswalkKey: 'F07.0',
    sourceRef: 'operationalisiert nach ICD-10 F07.0 / ICD-11 6E68',
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code: 'F07.0', label_de: 'Organische Persönlichkeitsstörung' },
      icd11: { code: '6E68', label_de: 'Sekundäres Persönlichkeitssyndrom' },
      dsm5tr: { code: '310.1', label_de: 'Personality Change Due to Another Medical Condition (Crosswalk)' },
    },
    differentials_de: [
      'Frontotemporale Demenz (progredienter kognitiver Abbau)',
      'Primäre Persönlichkeitsstörung (lebenslang, ohne organische Ursache)',
      'Affektive Störung oder Manie',
      'Substanzbedingte Persönlichkeitsveränderung',
    ],
    groups: [
      {
        id: 'f07_0.change',
        label_de: 'Anhaltende Persönlichkeitsveränderung',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: 'f07_0.personality_change',
            text_de: 'Anhaltende Veränderung des bisherigen Persönlichkeits- und Verhaltensmusters nach einer Hirnerkrankung oder -schädigung',
            citation: [{ classification: 'icd10', code: 'F07.0' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('personality_interpersonal_style', /pers[öo]nlichkeitsver[äa]nder|wesens[äa]nder|verhaltens[äa]nder|enthemm|distanzlos/i),
          },
          {
            id: 'f07_0.organic_cause',
            text_de: 'Nachweis oder begründete Annahme einer ursächlichen Hirnerkrankung, -schädigung oder -funktionsstörung',
            citation: [{ classification: 'icd10', code: 'F07.0' }],
            mappingHints: [{ kind: 'diagnosis', ref: 'aetiology' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: 'f07_0.features',
        label_de: 'Charakteristische Veränderungen (mindestens 2)',
        logic: 'at_least_n_of',
        threshold: 2,
        groupType: 'inclusion',
        criteria: [
          {
            id: 'f07_0.affective_change',
            text_de: 'Verändertes Gefühlsleben mit emotionaler Labilität, Euphorie oder Apathie',
            citation: [{ classification: 'icd10', code: 'F07.0' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('mood_affect', /labil|euphor|apath|affektinkontinen|reizbar|distanzlos/i),
          },
          {
            id: 'f07_0.disinhibition',
            text_de: 'Verminderte Impulskontrolle mit Enthemmung, Reizbarkeit oder Aggressionsausbrüchen',
            citation: [{ classification: 'icd10', code: 'F07.0' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('personality_interpersonal_style', /enthemm|impulskontroll|aggressi|reizbar/i),
          },
          {
            id: 'f07_0.goal_directed',
            text_de: 'Beeinträchtigung zielgerichteter Aktivitäten mit reduzierter Ausdauer und Antriebsstörung',
            citation: [{ classification: 'icd10', code: 'F07.0' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('drive_psychomotor_activity', /antriebs|initiativ|ausdauer|zielgerichtet/i),
          },
          {
            id: 'f07_0.social_conduct',
            text_de: 'Verändertes Sozialverhalten mit Vernachlässigung sozialer Normen (z. B. Taktlosigkeit, sexuelle Distanzlosigkeit)',
            citation: [{ classification: 'icd10', code: 'F07.0' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: 'f07_0.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: 'f07_0.exclude_dementia_delirium',
            text_de: 'Die Veränderung ist nicht durch eine Demenz, ein Delir oder eine andere psychische Störung besser erklärbar; eine wesentliche kognitive Beeinträchtigung steht nicht im Vordergrund',
            citation: [{ classification: 'icd10', code: 'F07.0' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },

  {
    id: 'organic_hallucinosis',
    classification: 'icd10',
    code: 'F06.0',
    name_de: 'Organische Halluzinose',
    crosswalkKey: 'F06.0',
    sourceRef: 'operationalisiert nach ICD-10 F06.0 / ICD-11 6E61',
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code: 'F06.0', label_de: 'Organische Halluzinose' },
      icd11: { code: '6E61', label_de: 'Sekundäres psychotisches Syndrom (mit Halluzinationen)' },
      dsm5tr: { code: '293.82', label_de: 'Psychotic Disorder Due to Another Medical Condition, with hallucinations (Crosswalk)' },
    },
    differentials_de: [
      'Schizophrenie oder wahnhafte Störung',
      'Substanzinduzierte Halluzinose / Entzugshalluzinose',
      'Delir (Bewusstseinstrübung)',
      'Sensorische Deprivation (z. B. Charles-Bonnet-Syndrom)',
    ],
    groups: [
      {
        id: 'f06_0.core',
        label_de: 'Anhaltende Halluzinationen bei klarem Bewusstsein',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: 'f06_0.persistent_hallucinations',
            text_de: 'Anhaltende oder wiederkehrende Halluzinationen (meist optisch oder akustisch), die das Bild beherrschen',
            citation: [{ classification: 'icd10', code: 'F06.0' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'perception_hallucinations', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('perception_hallucinations', /halluzin|stimmen|optisch|akustisch|trugwahrnehmung/i, /keine\s+halluzinationen/i),
          },
          {
            id: 'f06_0.clear_consciousness',
            text_de: 'Die Halluzinationen treten bei klarem Bewusstsein und erhaltener Orientierung auf',
            citation: [{ classification: 'icd10', code: 'F06.0' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'consciousness_orientation' }],
            allowClinicianAttest: true,
          },
          {
            id: 'f06_0.organic_cause',
            text_de: 'Nachweis oder begründete Annahme einer ursächlichen körperlichen bzw. zerebralen Erkrankung',
            citation: [{ classification: 'icd10', code: 'F06.0' }],
            mappingHints: [{ kind: 'diagnosis', ref: 'aetiology' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: 'f06_0.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: 'f06_0.exclude_primary_psychosis',
            text_de: 'Kein vorrangiges schizophrenes oder affektives Zustandsbild und keine Bewusstseinstrübung im Sinne eines Delirs; nicht durch Substanzen bedingt',
            citation: [{ classification: 'icd10', code: 'F06.0' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },

  {
    id: 'organic_delusional_disorder',
    classification: 'icd10',
    code: 'F06.2',
    name_de: 'Organische wahnhafte (schizophreniforme) Störung',
    crosswalkKey: 'F06.2',
    sourceRef: 'operationalisiert nach ICD-10 F06.2 / ICD-11 6E61',
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code: 'F06.2', label_de: 'Organische wahnhafte (schizophreniforme) Störung' },
      icd11: { code: '6E61', label_de: 'Sekundäres psychotisches Syndrom (mit Wahn)' },
      dsm5tr: { code: '293.81', label_de: 'Psychotic Disorder Due to Another Medical Condition, with delusions (Crosswalk)' },
    },
    differentials_de: [
      'Schizophrenie / anhaltende wahnhafte Störung',
      'Substanzinduzierte psychotische Störung',
      'Delir',
      'Affektive Störung mit psychotischen Symptomen',
    ],
    groups: [
      {
        id: 'f06_2.core',
        label_de: 'Wahn bei klarem Bewusstsein',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: 'f06_2.persistent_delusions',
            text_de: 'Im Vordergrund stehende, anhaltende Wahngedanken (z. B. Verfolgungs-, Beeinträchtigungs- oder Größenwahn)',
            citation: [{ classification: 'icd10', code: 'F06.2' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('delusions_overvalued_ideas', /wahn|verfolgung|beeintr[äa]chtigung|gr[öo][ßs]en|paranoid|beziehungs/i, /kein\s+wahn/i),
          },
          {
            id: 'f06_2.clear_consciousness',
            text_de: 'Der Wahn tritt bei klarem Bewusstsein und ohne ausgeprägten kognitiven Abbau auf',
            citation: [{ classification: 'icd10', code: 'F06.2' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'consciousness_orientation' }],
            allowClinicianAttest: true,
          },
          {
            id: 'f06_2.organic_cause',
            text_de: 'Nachweis oder begründete Annahme einer ursächlichen körperlichen bzw. zerebralen Erkrankung',
            citation: [{ classification: 'icd10', code: 'F06.2' }],
            mappingHints: [{ kind: 'diagnosis', ref: 'aetiology' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: 'f06_2.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: 'f06_2.exclude_primary_substance',
            text_de: 'Nicht besser durch eine primäre Schizophrenie/affektive Störung, ein Delir oder durch Substanzwirkung erklärbar',
            citation: [{ classification: 'icd10', code: 'F06.2' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },

  {
    id: 'organic_mood_disorder',
    classification: 'icd10',
    code: 'F06.3',
    name_de: 'Organische affektive Störung',
    crosswalkKey: 'F06.3',
    sourceRef: 'operationalisiert nach ICD-10 F06.3 / ICD-11 6E62',
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code: 'F06.3', label_de: 'Organische affektive Störung' },
      icd11: { code: '6E62', label_de: 'Sekundäres affektives Syndrom' },
      dsm5tr: { code: '293.83', label_de: 'Mood Disorder Due to Another Medical Condition (Crosswalk)' },
    },
    differentials_de: [
      'Primäre depressive oder bipolare Störung',
      'Substanz-/medikamenteninduzierte affektive Störung',
      'Anpassungsstörung',
      'Demenz mit affektiven Symptomen',
    ],
    groups: [
      {
        id: 'f06_3.core',
        label_de: 'Organisch bedingte Affektstörung',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: 'f06_3.mood_change',
            text_de: 'Veränderung der Stimmung oder des Affekts im Sinne einer depressiven, manischen oder gemischten Symptomatik',
            citation: [{ classification: 'icd10', code: 'F06.3' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('mood_affect', /depress|gedr[üu]ckt|niedergeschlagen|manisch|gehoben|euphor|expansiv|reizbar/i, /euthym/i),
          },
          {
            id: 'f06_3.organic_cause',
            text_de: 'Nachweis oder begründete Annahme einer ursächlichen körperlichen bzw. zerebralen Erkrankung (z. B. endokrine Störung, Hirnläsion)',
            citation: [{ classification: 'icd10', code: 'F06.3' }],
            mappingHints: [{ kind: 'diagnosis', ref: 'aetiology' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: 'f06_3.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: 'f06_3.exclude_primary_substance',
            text_de: 'Nicht besser durch eine primäre affektive Störung oder durch Substanzwirkung erklärbar',
            citation: [{ classification: 'icd10', code: 'F06.3' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
]
