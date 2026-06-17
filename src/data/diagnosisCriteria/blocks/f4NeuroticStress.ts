import type { Disorder } from '../schema'
import { domainSignal } from '../predicateHelpers'

/**
 * F4 block — neurotische, Belastungs- und somatoforme Störungen.
 *
 * Operationalisiert nach ICD-10 F40–F45 (mit ICD-11-Crosswalk, wo eindeutig).
 * Generalisierte Angststörung (F41.1) und Panikstörung (F41.0) sind bereits
 * separat erfasst und hier bewusst ausgelassen.
 *
 * LIZENZ: Jeder `text_de` ist eine ORIGINALE deutsche operationale Paraphrase.
 * Es werden ausschließlich klinische Fakten (Merkmalszahlen, Dauer, Schwellen)
 * kodiert — kein ICD-/DSM-Wortlaut übernommen. DSM nur als Code/Label-Crosswalk.
 *
 * Hinweis ICD-11-Codes: Agoraphobie = 6B02 (nicht 6B01, das die bereits erfasste
 * Panikstörung trägt). Die akute Belastungsreaktion ist in ICD-11 KEINE psychische
 * Störung mehr, sondern unter „Probleme im Zusammenhang mit schädlichen oder
 * traumatischen Ereignissen“ als QE84 geführt — entsprechend vermerkt.
 */

const agoraphobia: Disorder = {
  id: 'agoraphobia',
  classification: 'icd10',
  code: 'F40.0',
  name_de: 'Agoraphobie',
  crosswalkKey: 'F40.0',
  sourceRef: 'operationalisiert nach ICD-10 F40.0 / ICD-11 6B02',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F40.0', label_de: 'Agoraphobie' },
    icd11: { code: '6B02', label_de: 'Agoraphobie' },
    dsm5tr: { code: '300.22', label_de: 'Agoraphobia (Crosswalk)' },
  },
  differentials_de: [
    'Panikstörung ohne situative Bindung',
    'Soziale Angststörung (Vermeidung sozialer Bewertung statt Fluchtunmöglichkeit)',
    'Depressive Episode mit sozialem Rückzug',
    'Somatische Ursache von Schwindel/Synkopen',
  ],
  groups: [
    {
      id: 'f40_0.core',
      label_de: 'Kern: Angst in agoraphoben Situationen mit Vermeidung',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f40_0.situational_fear',
          text_de:
            'Deutliche, wiederkehrende Angst in Situationen, in denen ein Entkommen schwer oder peinlich erscheint oder Hilfe nicht verfügbar wäre (z. B. Menschenmengen, öffentliche Plätze, Reisen, alleiniges Verlassen der Wohnung)',
          citation: [{ classification: 'icd10', code: 'F40.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'anxiety_panic_phobic_symptoms',
            /agoraphob|menschenmenge|[öo]ffentlich|warteschlange|verlassen.*(haus|wohnung)|allein.*unterwegs|reisen/i,
            /keine\s+angst/i,
          ),
        },
        {
          id: 'f40_0.avoidance',
          text_de:
            'Die gefürchteten Situationen werden vermieden oder nur unter ausgeprägtem Leidensdruck bzw. nur in Begleitung ertragen',
          citation: [{ classification: 'icd10', code: 'F40.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('anxiety_panic_phobic_symptoms', /vermeid|nur.*begleitung|r[üu]ckzug|meidet/i),
        },
      ],
    },
    {
      id: 'f40_0.autonomic',
      label_de: 'Vegetative Angstsymptome in den Situationen (mindestens 2)',
      logic: 'at_least_n_of',
      threshold: 2,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f40_0.palpitations',
          text_de: 'Herzklopfen, beschleunigter Herzschlag oder Herzstolpern',
          citation: [{ classification: 'icd10', code: 'F40.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /herzklopfen|palpit|herzrasen|tachykard/i),
        },
        {
          id: 'f40_0.dizziness',
          text_de: 'Schwindel, Benommenheit oder Gefühl drohender Ohnmacht',
          citation: [{ classification: 'icd10', code: 'F40.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /schwindel|benommen|ohnmacht|synkop/i),
        },
        {
          id: 'f40_0.sweating_trembling',
          text_de: 'Schwitzen, Zittern oder Beben',
          citation: [{ classification: 'icd10', code: 'F40.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /schwitz|zittern|beben|tremor/i),
        },
        {
          id: 'f40_0.fear_losing_control',
          text_de: 'Angst zu sterben, die Kontrolle zu verlieren oder „verrückt zu werden“',
          citation: [{ classification: 'icd10', code: 'F40.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('anxiety_panic_phobic_symptoms', /kontrollverlust|todesangst|verr[üu]ckt\s+zu\s+werden/i),
        },
      ],
    },
    {
      id: 'f40_0.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f40_0.exclude_organic',
          text_de: 'Die Angstsymptome sind nicht besser durch eine körperliche Erkrankung, eine Substanzwirkung oder eine wahnhafte bzw. zwanghafte Symptomatik erklärbar',
          citation: [{ classification: 'icd10', code: 'F40.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const socialPhobia: Disorder = {
  id: 'social_anxiety_disorder',
  classification: 'icd10',
  code: 'F40.1',
  name_de: 'Soziale Angststörung (soziale Phobie)',
  crosswalkKey: 'F40.1',
  sourceRef: 'operationalisiert nach ICD-10 F40.1 / ICD-11 6B04',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F40.1', label_de: 'Soziale Phobien' },
    icd11: { code: '6B04', label_de: 'Soziale Angststörung' },
    dsm5tr: { code: '300.23', label_de: 'Social Anxiety Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Agoraphobie (Furcht vor Fluchtunmöglichkeit, nicht vor Bewertung)',
    'Panikstörung mit situationsunabhängigen Attacken',
    'Schizoide oder ängstlich-vermeidende Persönlichkeitsstörung',
    'Autismus-Spektrum-Störung mit sozialer Beeinträchtigung',
  ],
  groups: [
    {
      id: 'f40_1.core',
      label_de: 'Kern: Furcht vor sozialer Bewertung',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f40_1.fear_scrutiny',
          text_de:
            'Ausgeprägte Furcht oder Anspannung in sozialen Situationen, in denen die Person im Mittelpunkt der Aufmerksamkeit steht oder von anderen prüfend beobachtet/bewertet werden könnte (z. B. Sprechen vor Gruppen, Essen in Gesellschaft)',
          citation: [{ classification: 'icd10', code: 'F40.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'anxiety_panic_phobic_symptoms',
            /sozial|bewert|beobachtet|prüfungsangst|im\s+mittelpunkt|blamier|peinlich/i,
            /keine\s+angst/i,
          ),
        },
        {
          id: 'f40_1.fear_of_embarrassment',
          text_de: 'Befürchtung, sich peinlich oder beschämend zu verhalten oder negativ aufzufallen',
          citation: [{ classification: 'icd10', code: 'F40.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('thought_content', /blamier|peinlich|negativ.*bewert|abgelehnt|beschäm/i),
        },
        {
          id: 'f40_1.avoidance',
          text_de: 'Vermeidung der gefürchteten sozialen Situationen oder Ertragen nur unter erheblicher Angst',
          citation: [{ classification: 'icd10', code: 'F40.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('anxiety_panic_phobic_symptoms', /vermeid|r[üu]ckzug|meidet|isolier/i),
        },
      ],
    },
    {
      id: 'f40_1.autonomic',
      label_de: 'Charakteristische körperliche Begleitsymptome (mindestens 1)',
      logic: 'at_least_n_of',
      threshold: 1,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f40_1.blushing',
          text_de: 'Erröten, Zittern der Hände, Übelkeit oder Drang zum Wasserlassen in der sozialen Situation',
          citation: [{ classification: 'icd10', code: 'F40.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /err[öo]ten|zittern|[üu]belkeit|harndrang|schwitz/i),
        },
      ],
    },
    {
      id: 'f40_1.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f40_1.exclude_other',
          text_de: 'Die Symptome sind nicht Ausdruck eines Wahns, einer Zwangsstörung oder besser durch eine andere psychische bzw. somatische Störung erklärt',
          citation: [{ classification: 'icd10', code: 'F40.1' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const specificPhobia: Disorder = {
  id: 'specific_phobia',
  classification: 'icd10',
  code: 'F40.2',
  name_de: 'Spezifische (isolierte) Phobie',
  crosswalkKey: 'F40.2',
  sourceRef: 'operationalisiert nach ICD-10 F40.2 / ICD-11 6B03',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F40.2', label_de: 'Spezifische (isolierte) Phobien' },
    icd11: { code: '6B03', label_de: 'Spezifische Phobie' },
    dsm5tr: { code: '300.29', label_de: 'Specific Phobia (Crosswalk)' },
  },
  differentials_de: [
    'Agoraphobie (mehrere situative Auslöser, Fluchtthema)',
    'Soziale Angststörung (Bewertungsfurcht)',
    'Zwangsstörung (Vermeidung aufgrund von Zwangsbefürchtungen)',
    'Posttraumatische Belastungsstörung (traumaassoziierte Auslöser)',
  ],
  groups: [
    {
      id: 'f40_2.core',
      label_de: 'Kern: umschriebene Objekt-/Situationsangst',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f40_2.circumscribed_fear',
          text_de:
            'Deutliche, anhaltende Angst, die auf ein bestimmtes Objekt oder eine bestimmte Situation begrenzt ist (z. B. Tiere, Höhen, Dunkelheit, Anblick von Blut/Verletzungen, Flugreisen, geschlossene Räume)',
          citation: [{ classification: 'icd10', code: 'F40.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'anxiety_panic_phobic_symptoms',
            /phobie|spezifisch|tier|spinne|h[öo]he|dunkel|blut|spritze|fliegen|enge\s+r[äa]ume|klaustrophob/i,
            /keine\s+angst/i,
          ),
        },
        {
          id: 'f40_2.avoidance',
          text_de: 'Das phobische Objekt bzw. die Situation wird gemieden oder löst bei Konfrontation sofort intensive Angst aus',
          citation: [{ classification: 'icd10', code: 'F40.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('anxiety_panic_phobic_symptoms', /vermeid|meidet|sofort.*angst/i),
        },
      ],
    },
    {
      id: 'f40_2.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f40_2.exclude_other',
          text_de: 'Die Angst ist nicht Teil eines umfassenderen phobischen, wahnhaften oder zwanghaften Syndroms und nicht besser anderweitig erklärbar',
          citation: [{ classification: 'icd10', code: 'F40.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const mixedAnxietyDepression: Disorder = {
  id: 'mixed_anxiety_depressive_disorder',
  classification: 'icd10',
  code: 'F41.2',
  name_de: 'Angst und depressive Störung, gemischt',
  crosswalkKey: 'F41.2',
  sourceRef: 'operationalisiert nach ICD-10 F41.2 / ICD-11 6A73',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F41.2', label_de: 'Angst und depressive Störung, gemischt' },
    icd11: { code: '6A73', label_de: 'Gemischte depressive und Angststörung' },
    dsm5tr: { code: '300.00', label_de: 'Unspecified Anxiety Disorder (näherungsweiser Crosswalk)' },
  },
  differentials_de: [
    'Depressive Episode (wenn Depressionskriterien voll erfüllt)',
    'Generalisierte Angststörung (wenn Angstkriterien voll erfüllt)',
    'Anpassungsstörung mit Angst und depressiver Reaktion',
    'Dysthymie',
  ],
  groups: [
    {
      id: 'f41_2.core',
      label_de: 'Kern: gleichzeitige Angst- und depressive Symptome unterhalb der Vollkriterien',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f41_2.anxiety_symptoms',
          text_de: 'Vorhandensein von Angstsymptomen (z. B. Sorgen, Anspannung, vegetative Übererregbarkeit)',
          citation: [{ classification: 'icd10', code: 'F41.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('anxiety_panic_phobic_symptoms', /angst|sorge|anspannung|nerv[öo]s|besorg/i, /keine\s+angst/i),
        },
        {
          id: 'f41_2.depressive_symptoms',
          text_de: 'Gleichzeitig depressive Symptome (z. B. gedrückte Stimmung, Freudlosigkeit, verminderter Antrieb)',
          citation: [{ classification: 'icd10', code: 'F41.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /gedr[üu]ckt|depress|niedergeschlagen|freudlos|traurig/i, /euthym/i),
        },
        {
          id: 'f41_2.subthreshold',
          text_de: 'Weder die Angst- noch die depressive Symptomatik erreicht für sich allein das Vollbild einer eigenständigen Angst- oder depressiven Störung',
          citation: [{ classification: 'icd10', code: 'F41.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f41_2.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f41_2.exclude_full_syndrome',
          text_de: 'Es liegt keine voll ausgeprägte depressive Episode oder Angststörung vor, die vorrangig zu kodieren wäre',
          citation: [{ classification: 'icd10', code: 'F41.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const obsessiveCompulsiveDisorder: Disorder = {
  id: 'obsessive_compulsive_disorder',
  classification: 'icd10',
  code: 'F42',
  name_de: 'Zwangsstörung',
  crosswalkKey: 'F42',
  sourceRef: 'operationalisiert nach ICD-10 F42 / ICD-11 6B20',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F42', label_de: 'Zwangsstörung' },
    icd11: { code: '6B20', label_de: 'Zwangsstörung' },
    dsm5tr: { code: '300.3', label_de: 'Obsessive-Compulsive Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Generalisierte Angststörung (realitätsnahe Sorgen statt egodystone Zwänge)',
    'Wahnhafte Störung (fehlende Einsicht, keine Widerstandsversuche)',
    'Zwanghafte (anankastische) Persönlichkeitsstörung',
    'Tic-Störungen / Tourette-Syndrom',
  ],
  groups: [
    {
      id: 'f42.core',
      label_de: 'Kern: Zwangsgedanken und/oder Zwangshandlungen über die meiste Zeit ≥ 2 Wochen',
      logic: 'any_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 14 },
      criteria: [
        {
          id: 'f42.obsessions',
          text_de:
            'Wiederkehrende, sich aufdrängende Gedanken, Vorstellungen oder Impulse, die als eigene, aber unsinnig/belastend erlebt werden und denen die Person Widerstand entgegenzusetzen versucht',
          citation: [{ classification: 'icd10', code: 'F42', ref: 'obsessions' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'obsessions_compulsions', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'obsessions_compulsions',
            /zwangsgedank|aufdr[äa]ng|grübel|kontaminations|obsess|intrusiv.*gedank/i,
            /keine\s+zw[äa]nge/i,
          ),
        },
        {
          id: 'f42.compulsions',
          text_de:
            'Wiederholte Verhaltensweisen oder mentale Rituale (z. B. Waschen, Kontrollieren, Zählen, Ordnen), die ausgeführt werden, um eine befürchtete Folge oder Anspannung abzuwenden',
          citation: [{ classification: 'icd10', code: 'F42', ref: 'compulsions' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'obsessions_compulsions', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'obsessions_compulsions',
            /zwangshandlung|ritual|wasch|kontroll|z[äa]hl|ordn|compuls/i,
            /keine\s+zw[äa]nge/i,
          ),
        },
      ],
    },
    {
      id: 'f42.features',
      label_de: 'Charakteristische Merkmale (mindestens 1)',
      logic: 'at_least_n_of',
      threshold: 1,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f42.distress_interference',
          text_de: 'Die Zwänge sind zeitraubend (z. B. mehr als eine Stunde täglich) oder verursachen deutliches Leiden bzw. Beeinträchtigung im Alltag',
          citation: [{ classification: 'icd10', code: 'F42' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('functional_impairment', /beeintr[äa]cht|leiden|zeitraubend|alltag.*gest[öo]rt/i),
        },
        {
          id: 'f42.egodystonic',
          text_de: 'Mindestens ein Zwangsgedanke oder eine Zwangshandlung wird als übertrieben oder unsinnig erkannt (zumindest zeitweise Einsicht)',
          citation: [{ classification: 'icd10', code: 'F42' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'insight_judgment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('insight_judgment', /einsicht|unsinnig|[üu]bertrieben|egodyston/i),
        },
      ],
    },
    {
      id: 'f42.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f42.exclude_organic_schizophrenia',
          text_de: 'Die Zwangssymptomatik ist nicht Folge einer schizophrenen oder affektiven Störung und nicht organisch bzw. substanzbedingt erklärbar',
          citation: [{ classification: 'icd10', code: 'F42' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const acuteStressReaction: Disorder = {
  id: 'acute_stress_reaction',
  classification: 'icd10',
  code: 'F43.0',
  name_de: 'Akute Belastungsreaktion',
  crosswalkKey: 'F43.0',
  // ICD-11 führt die akute Belastungsreaktion NICHT mehr als psychische Störung,
  // sondern als QE84 unter „Probleme im Zusammenhang mit schädlichen/traumatischen
  // Ereignissen“ (Kapitel 24). Crosswalk daher auf QE84, nicht auf 6Bxx.
  sourceRef: 'operationalisiert nach ICD-10 F43.0; ICD-11 reklassifiziert als QE84 (keine psychische Störung mehr)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F43.0', label_de: 'Akute Belastungsreaktion' },
    icd11: { code: 'QE84', label_de: 'Akute Belastungsreaktion (in ICD-11 keine psychische Störung)' },
    dsm5tr: { code: '308.3', label_de: 'Acute Stress Disorder (näherungsweiser Crosswalk)' },
  },
  differentials_de: [
    'Posttraumatische Belastungsstörung (Symptome > 1 Monat, verzögerter Verlauf möglich)',
    'Anpassungsstörung (weniger akut, geringere Belastungsschwere)',
    'Panikattacke',
    'Akute organische/substanzbedingte Verwirrtheit',
  ],
  groups: [
    {
      id: 'f43_0.core',
      label_de: 'Kern: unmittelbare Reaktion auf außergewöhnliche Belastung',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 0 },
      criteria: [
        {
          id: 'f43_0.exceptional_stressor',
          text_de: 'Erleben einer außergewöhnlichen körperlichen oder psychischen Belastung (z. B. Unfall, Gewalt, Katastrophe) unmittelbar vor Symptombeginn',
          citation: [{ classification: 'icd10', code: 'F43.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('trauma_intrusions_dissociation', /belastung|trauma|unfall|gewalt|katastrophe|[üu]berfall/i),
        },
        {
          id: 'f43_0.immediate_onset',
          text_de: 'Symptombeginn innerhalb von Minuten bis wenigen Stunden nach der Belastung mit rascher Rückbildung (in der Regel innerhalb von Stunden bis wenigen Tagen)',
          citation: [{ classification: 'icd10', code: 'F43.0' }],
          mappingHints: [{ kind: 'course', ref: 'onset' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f43_0.mixed_symptoms',
          text_de: 'Gemischtes, wechselndes Bild aus initialer „Betäubung“, Einengung des Bewusstseins, Desorientierung, Angst, Verzweiflung, Überaktivität oder Rückzug',
          citation: [{ classification: 'icd10', code: 'F43.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('trauma_intrusions_dissociation', /bet[äa]ubt|dissoziat|desorient|einengung|[üu]bererregung/i),
        },
      ],
    },
    {
      id: 'f43_0.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f43_0.exclude_persistent',
          text_de: 'Die Symptome persistieren nicht über mehrere Tage hinaus in einem Ausmaß, das eher für eine PTBS oder Anpassungsstörung spricht',
          citation: [{ classification: 'icd10', code: 'F43.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const ptsd: Disorder = {
  id: 'post_traumatic_stress_disorder',
  classification: 'icd10',
  code: 'F43.1',
  name_de: 'Posttraumatische Belastungsstörung',
  crosswalkKey: 'F43.1',
  sourceRef: 'operationalisiert nach ICD-10 F43.1 / ICD-11 6B40',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F43.1', label_de: 'Posttraumatische Belastungsstörung' },
    icd11: { code: '6B40', label_de: 'Posttraumatische Belastungsstörung' },
    dsm5tr: { code: '309.81', label_de: 'Posttraumatic Stress Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Komplexe PTBS (zusätzliche Affekt-, Selbst- und Beziehungsstörungen; ICD-11 6B41)',
    'Akute Belastungsreaktion (< 1 Monat, rasche Rückbildung)',
    'Anpassungsstörung',
    'Depressive Episode / Angststörung mit Traumabezug',
  ],
  groups: [
    {
      id: 'f43_1.trauma',
      label_de: 'Belastungskriterium',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f43_1.traumatic_event',
          text_de: 'Konfrontation mit einem belastenden Ereignis oder einer Situation außergewöhnlicher Bedrohung oder katastrophalen Ausmaßes, das bei nahezu jedem tiefe Verzweiflung auslösen würde',
          citation: [{ classification: 'icd10', code: 'F43.1', ref: 'A' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('trauma_intrusions_dissociation', /trauma|bedrohung|gewalt|missbrauch|unfall|katastrophe|krieg/i),
        },
      ],
    },
    {
      id: 'f43_1.symptoms',
      label_de: 'Charakteristische Symptomcluster (Wiedererleben, Vermeidung, Übererregung)',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 30 },
      criteria: [
        {
          id: 'f43_1.reexperiencing',
          text_de: 'Wiederholtes ungewolltes Wiedererleben des Traumas in Form von Erinnerungen, lebhaften Nachhallerinnerungen (Flashbacks), Albträumen oder bedrängender innerer Bedrängnis bei Erinnerung',
          citation: [{ classification: 'icd10', code: 'F43.1', ref: 'B' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('trauma_intrusions_dissociation', /flashback|nachhall|wiedererleb|intrusion|albtraum|alptraum|aufdr[äa]ng.*erinner/i),
        },
        {
          id: 'f43_1.avoidance',
          text_de: 'Anhaltende Vermeidung von Reizen, Gedanken oder Situationen, die an das Trauma erinnern',
          citation: [{ classification: 'icd10', code: 'F43.1', ref: 'C' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('trauma_intrusions_dissociation', /vermeid|meidet|umgeht.*erinner/i),
        },
        {
          id: 'f43_1.hyperarousal',
          text_de: 'Anhaltende Übererregung mit z. B. Ein-/Durchschlafstörung, Reizbarkeit, Konzentrationsproblemen, Schreckhaftigkeit oder gesteigerter Wachsamkeit',
          citation: [{ classification: 'icd10', code: 'F43.1', ref: 'D' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('trauma_intrusions_dissociation', /[üu]bererregung|schreckhaft|hypervigil|reizbar|wachsam|schlafst[öo]r/i),
        },
      ],
    },
    {
      id: 'f43_1.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f43_1.exclude_other',
          text_de: 'Die Symptomatik ist nicht besser durch eine andere psychische Störung, eine körperliche Erkrankung oder eine Substanzwirkung erklärbar',
          citation: [{ classification: 'icd10', code: 'F43.1' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const adjustmentDisorder: Disorder = {
  id: 'adjustment_disorder',
  classification: 'icd10',
  code: 'F43.2',
  name_de: 'Anpassungsstörung',
  crosswalkKey: 'F43.2',
  sourceRef: 'operationalisiert nach ICD-10 F43.2 / ICD-11 6B43',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F43.2', label_de: 'Anpassungsstörungen' },
    icd11: { code: '6B43', label_de: 'Anpassungsstörung' },
    dsm5tr: { code: '309.x', label_de: 'Adjustment Disorders (Crosswalk)' },
  },
  differentials_de: [
    'Depressive Episode (Vollkriterien erfüllt)',
    'Posttraumatische Belastungsstörung (Trauma außergewöhnlichen Ausmaßes)',
    'Akute Belastungsreaktion (unmittelbar, kurzdauernd)',
    'Normale Trauerreaktion',
  ],
  groups: [
    {
      id: 'f43_2.core',
      label_de: 'Kern: belastungsabhängige emotionale/verhaltensbezogene Symptome',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f43_2.identifiable_stressor',
          text_de: 'Auftreten der Symptome in engem zeitlichem Zusammenhang (in der Regel innerhalb eines Monats) mit einem identifizierbaren belastenden Lebensereignis oder einer Lebensveränderung',
          citation: [{ classification: 'icd10', code: 'F43.2' }],
          mappingHints: [{ kind: 'course', ref: 'precipitants' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f43_2.emotional_symptoms',
          text_de: 'Emotionale Beeinträchtigung (z. B. depressive Verstimmung, Angst, Sorge) oder Beeinträchtigung im Sozial-/Leistungsverhalten, die über eine normale Reaktion hinausgeht',
          citation: [{ classification: 'icd10', code: 'F43.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /depress|niedergeschlagen|angst|sorge|verzweifl|[üu]berfordert|belastet/i, /euthym/i),
        },
      ],
    },
    {
      id: 'f43_2.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f43_2.exclude_full_disorder',
          text_de: 'Die Symptome erfüllen nicht die Kriterien einer spezifischen affektiven, Angst- oder Belastungsstörung, die vorrangig zu kodieren wäre',
          citation: [{ classification: 'icd10', code: 'F43.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const dissociativeDisorders: Disorder = {
  id: 'dissociative_conversion_disorders',
  classification: 'icd10',
  code: 'F44',
  name_de: 'Dissoziative Störungen (Konversionsstörungen)',
  crosswalkKey: 'F44',
  sourceRef: 'operationalisiert nach ICD-10 F44 / ICD-11 6B60–6B66',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F44', label_de: 'Dissoziative Störungen (Konversionsstörungen)' },
    icd11: { code: '6B60', label_de: 'Dissoziative Störungen (Gruppe 6B60–6B66)' },
    dsm5tr: { code: '300.1x', label_de: 'Dissociative / Functional Neurological Disorders (Crosswalk)' },
  },
  differentials_de: [
    'Neurologische/somatische Erkrankung (zwingend auszuschließen)',
    'Posttraumatische Belastungsstörung mit dissoziativen Symptomen',
    'Vorgetäuschte Störung / Simulation',
    'Epilepsie (bei anfallsartigen Bildern)',
  ],
  groups: [
    {
      id: 'f44.core',
      label_de: 'Kern: dissoziative oder konversionsbedingte Funktionsstörung',
      logic: 'any_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f44.psychoform_dissociation',
          text_de: 'Teilweiser oder vollständiger Verlust der normalen Integration von Erinnerungen, Identität, unmittelbaren Empfindungen oder Bewegungskontrolle (z. B. dissoziative Amnesie, Fugue, Stupor, Depersonalisation/Derealisation)',
          citation: [{ classification: 'icd10', code: 'F44' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('trauma_intrusions_dissociation', /dissoziat|amnesie|fugue|stupor|depersonal|dereal|trance/i),
        },
        {
          id: 'f44.conversion_symptoms',
          text_de: 'Pseudoneurologische Konversionssymptome (z. B. Lähmungen, Gefühlsstörungen, nichtepileptische Anfälle, Seh-/Sprechstörungen) ohne hinreichende organische Erklärung',
          citation: [{ classification: 'icd10', code: 'F44' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /l[äa]hmung|konversion|pseudoneurolog|nichtepilept|anfall.*ohne|gef[üu]hlsst[öo]rung|funktionell/i),
        },
      ],
    },
    {
      id: 'f44.features',
      label_de: 'Stützende Merkmale',
      logic: 'at_least_n_of',
      threshold: 1,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f44.temporal_link',
          text_de: 'Überzeugender zeitlicher Zusammenhang der Symptome mit belastenden Ereignissen, Konflikten oder Bedürfnissen',
          citation: [{ classification: 'icd10', code: 'F44' }],
          mappingHints: [{ kind: 'course', ref: 'precipitants' }],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f44.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f44.exclude_organic',
          text_de: 'Es findet sich kein Hinweis auf eine körperliche (insbesondere neurologische) Erkrankung, die die Symptome erklären würde; gezielte somatische Abklärung ist erfolgt',
          citation: [{ classification: 'icd10', code: 'F44' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const bodilyDistressSomatoform: Disorder = {
  id: 'somatoform_bodily_distress_disorder',
  classification: 'icd10',
  code: 'F45',
  name_de: 'Somatoforme Störung (somatische Belastungsstörung)',
  crosswalkKey: 'F45',
  sourceRef: 'operationalisiert nach ICD-10 F45 / ICD-11 6C20 (Körperliche Belastungsstörung)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F45', label_de: 'Somatoforme Störungen' },
    icd11: { code: '6C20', label_de: 'Körperliche Belastungsstörung (Bodily Distress Disorder)' },
    dsm5tr: { code: '300.82', label_de: 'Somatic Symptom Disorder (näherungsweiser Crosswalk)' },
  },
  differentials_de: [
    'Hypochondrische/Krankheitsangststörung (Angst vor Erkrankung statt Symptombelastung)',
    'Depressive oder Angststörung mit körperlichen Symptomen',
    'Nicht ausreichend abgeklärte somatische Erkrankung',
    'Dissoziative (Konversions-)Störung',
  ],
  groups: [
    {
      id: 'f45.core',
      label_de: 'Kern: belastende, wiederholt vorgebrachte körperliche Symptome',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f45.persistent_symptoms',
          text_de: 'Anhaltende oder wiederkehrende körperliche Beschwerden (häufig mehrere und wechselnd), die für die Person belastend sind und zu wiederholtem Aufsuchen medizinischer Hilfe führen',
          citation: [{ classification: 'icd10', code: 'F45' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /k[öo]rperlich.*beschwerd|somatoform|multipl.*symptom|schmerz|magen|herz.*beschwerd|funktionell/i),
        },
        {
          id: 'f45.excessive_attention',
          text_de: 'Übermäßige Aufmerksamkeit auf die Symptome und/oder wiederholtes Aufsuchen von Untersuchungen, trotz wiederholter Rückversicherung über unauffällige Befunde',
          citation: [{ classification: 'icd10', code: 'F45' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /[üu]berm[äa][ßs]ig|wiederholt.*untersuch|r[üu]ckversicher|arztbesuche|katastrophis/i),
        },
      ],
    },
    {
      id: 'f45.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f45.exclude_organic',
          text_de: 'Die Beschwerden sind nicht hinreichend durch eine nachweisbare körperliche Erkrankung erklärt; eine angemessene somatische Abklärung ist erfolgt',
          citation: [{ classification: 'icd10', code: 'F45' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const hypochondriasis: Disorder = {
  id: 'hypochondriasis_health_anxiety',
  classification: 'icd10',
  code: 'F45.2',
  name_de: 'Hypochondrische Störung (Krankheitsangststörung)',
  crosswalkKey: 'F45.2',
  // ICD-11 ordnet die Hypochondrie (6B23) der Gruppe der Zwangsspektrumsstörungen
  // zu, nicht den somatoformen Störungen — daher abweichend von der ICD-10-Gruppierung.
  sourceRef: 'operationalisiert nach ICD-10 F45.2 / ICD-11 6B23 (in ICD-11 dem Zwangsspektrum zugeordnet)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F45.2', label_de: 'Hypochondrische Störung' },
    icd11: { code: '6B23', label_de: 'Hypochondrie (Krankheitsangststörung)' },
    dsm5tr: { code: '300.7', label_de: 'Illness Anxiety Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Somatoforme/körperliche Belastungsstörung (Symptombelastung statt Krankheitsangst)',
    'Generalisierte Angststörung',
    'Zwangsstörung',
    'Wahnhafte Störung vom hypochondrischen Typ (fehlende Einsicht)',
  ],
  groups: [
    {
      id: 'f45_2.core',
      label_de: 'Kern: anhaltende Krankheitsüberzeugung/-angst',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f45_2.disease_conviction',
          text_de: 'Anhaltende Überzeugung oder ausgeprägte Angst, an einer oder mehreren schweren körperlichen Erkrankungen zu leiden, ausgehend von der Fehldeutung normaler Körperempfindungen',
          citation: [{ classification: 'icd10', code: 'F45.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /krankheitsangst|hypochond|gesundheitsangst|[üu]berzeugung.*krank|angst.*schwer.*erkrank/i),
        },
        {
          id: 'f45_2.reassurance_resistant',
          text_de: 'Die Befürchtungen bestehen trotz unauffälliger Untersuchungsergebnisse und ärztlicher Rückversicherung fort',
          citation: [{ classification: 'icd10', code: 'F45.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /r[üu]ckversicher|trotz.*unauff[äa]llig|wiederholt.*untersuch|nicht.*beruhig/i),
        },
      ],
    },
    {
      id: 'f45_2.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f45_2.exclude_delusional',
          text_de: 'Die Krankheitsüberzeugung erreicht kein wahnhaftes Ausmaß und ist nicht besser durch eine schizophrene oder affektive Störung erklärbar',
          citation: [{ classification: 'icd10', code: 'F45.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

export const f4NeuroticStressDisorders: Disorder[] = [
  agoraphobia,
  socialPhobia,
  specificPhobia,
  mixedAnxietyDepression,
  obsessiveCompulsiveDisorder,
  acuteStressReaction,
  ptsd,
  adjustmentDisorder,
  dissociativeDisorders,
  bodilyDistressSomatoform,
  hypochondriasis,
]
