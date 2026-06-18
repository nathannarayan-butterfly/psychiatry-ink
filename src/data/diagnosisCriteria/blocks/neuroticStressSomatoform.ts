import type { Disorder } from '../schema'
import { domainSignal, durationSignal } from '../predicateHelpers'

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
 *
 * ICD-11-INHALTE (Kapitel 06): Dort, wo ICD-11 strukturell abweicht, trägt die
 * Störung einen eigenständigen `icd11`-Kriterienbaum (DISTINKTE, vom 6xx-Code
 * abgeleitete IDs — niemals F-Codes). In diesem Kapitel ist die Divergenz hoch:
 *  - PTBS (6B40): drei Kernsymptomgruppen statt der ICD-10-Cluster.
 *  - Komplexe PTBS (6B41): ICD-11-spezifische Kategorie OHNE ICD-10-Äquivalent
 *    (als eigenständige Störung ergänzt).
 *  - Zwangsstörung (6B20): aus den Angststörungen herausgelöst und dem
 *    Zwangsspektrum zugeordnet.
 *  - Anpassungsstörung (6B43): um die Beschäftigung mit dem Stressor und das
 *    Anpassungsversagen herum neu gefasst.
 *  - Körperliche Belastungsstörung (6C20): um belastende Körpersymptome +
 *    exzessive Aufmerksamkeit/Gesundheitsverhalten herum strukturiert (NICHT
 *    „medizinisch unerklärt“).
 *  - Hypochondrie/Krankheitsangst (6B23): dem Zwangsspektrum zugeordnet.
 * Wo ICD-10 und ICD-11 auf dem hier kodierten Granularitätsniveau klinisch
 * äquivalent sind (Phobien 6B02–6B04, Panikstörung 6B01, gemischte Angst-/
 * depressive Störung 6A73, dissoziative Störungen 6B6x), wird BEWUSST der
 * ICD-10-Baum über den Resolver-Fallback wiederverwendet — als dokumentierte
 * icd10==icd11-Zuordnung, nicht als Auslassung (Kommentar an der jeweiligen Stelle).
 */

// ICD-11 6B02 Agoraphobie: inhaltlich klinisch äquivalent zur ICD-10-Operationali-
// sierung (deutliche, situationsgebundene Furcht vor Situationen mit erschwertem
// Entkommen/fehlender Hilfe, Vermeidung bzw. Ertragen nur unter Angst). Auf dem
// hier kodierten Granularitätsniveau besteht keine relevante strukturelle Divergenz
// → bewusster icd10==icd11-Fallback ohne eigenen `icd11`-Baum.
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

// ICD-11 6B04 Soziale Angststörung: klinisch äquivalent (Furcht vor sozialer
// Bewertung/Beobachtung, Vermeidung, körperliche Begleitsymptome). Keine
// strukturelle Divergenz → dokumentierter icd10==icd11-Fallback ohne `icd11`-Baum.
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

// ICD-11 6B03 Spezifische Phobie: klinisch äquivalent (umschriebene, anhaltende
// Furcht vor einem Objekt/einer Situation, Vermeidung bzw. sofortige Angst bei
// Konfrontation). Dokumentierter icd10==icd11-Fallback ohne eigenen `icd11`-Baum.
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

// ICD-11 6A73 Gemischte depressive und Angststörung: in ICD-11 aus dem F4-Block in
// die Gruppe der Stimmungsstörungen (Grenzbereich Angst/Affekt) VERSCHOBEN, die
// operationalisierten Inhalte (gleichzeitige unterschwellige Angst- UND depressive
// Symptome) bleiben jedoch klinisch äquivalent → dokumentierter icd10==icd11-
// Fallback ohne eigenen `icd11`-Baum; die Verschiebung ist im Crosswalk vermerkt.
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
  // ICD-11 6B20 — strukturelle Divergenz: Die Zwangsstörung wird aus den
  // Angststörungen herausgelöst und der Gruppe „Zwangsstörung oder verwandte
  // Störungen“ zugeordnet (Regruppierung). Kriterien: anhaltende Zwangsgedanken
  // und/oder Zwangshandlungen, die zeitraubend sind oder deutliches Leiden bzw.
  // Beeinträchtigung verursachen, mit explizitem Einsichts-Spezifikator (gute/mäßige
  // bis fehlende/wahnhafte Einsicht) — letzterer ersetzt das ICD-10-Egodyston-Merkmal.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6B20 (Zwangsspektrum, aus den Angststörungen herausgelöst)',
    groups: [
      {
        id: '6b20.core',
        label_de: 'Anhaltende Zwangsgedanken und/oder Zwangshandlungen',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b20.obsessions',
            text_de:
              'Anhaltende Zwangsgedanken: wiederkehrende, sich aufdrängende und unerwünschte Gedanken, Vorstellungen oder Impulse (z. B. Kontaminations-, Aggressions- oder Symmetrie-Themen), die typischerweise Angst oder Unbehagen auslösen',
            citation: [{ classification: 'icd11', code: '6B20', ref: 'obsessions' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'obsessions_compulsions', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'obsessions_compulsions',
              /zwangsgedank|aufdr[äa]ng|grübel|kontaminations|obsess|intrusiv.*gedank/i,
              /keine\s+zw[äa]nge/i,
            ),
          },
          {
            id: '6b20.compulsions',
            text_de:
              'Anhaltende Zwangshandlungen: wiederholte Verhaltensweisen oder mentale Handlungen (z. B. Waschen, Kontrollieren, Zählen, gedankliches Wiederholen), die die Person als Reaktion auf einen Zwangsgedanken oder nach starren Regeln ausführt',
            citation: [{ classification: 'icd11', code: '6B20', ref: 'compulsions' }],
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
        id: '6b20.burden',
        label_de: 'Zeitaufwand oder klinisch bedeutsames Leiden/Beeinträchtigung',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b20.time_distress',
            text_de:
              'Die Zwangssymptome sind zeitraubend (z. B. mehr als eine Stunde täglich) oder verursachen deutliches Leiden bzw. eine bedeutsame Beeinträchtigung in persönlichen, familiären, sozialen oder beruflichen Bereichen',
            citation: [{ classification: 'icd11', code: '6B20' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('functional_impairment', /beeintr[äa]cht|leiden|zeitraubend|alltag.*gest[öo]rt|stunde.*t[äa]glich/i),
          },
        ],
      },
      {
        id: '6b20.insight',
        label_de: 'Einsichts-Spezifikator (ICD-11)',
        logic: 'all_of',
        groupType: 'severity',
        criteria: [
          {
            id: '6b20.insight_specifier',
            text_de:
              'Ausmaß der Einsicht ist zu spezifizieren (gute oder mäßige Einsicht vs. geringe bis fehlende/wahnhafte Einsicht); auch bei wahnhafter Überzeugung wird die Störung weiterhin im Zwangsspektrum kodiert',
            citation: [{ classification: 'icd11', code: '6B20', ref: 'insight' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'insight_judgment' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('insight_judgment', /einsicht|unsinnig|[üu]bertrieben|egodyston|wahnhaft.*[üu]berzeug/i),
          },
        ],
      },
      {
        id: '6b20.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6b20.exclude_other',
            text_de:
              'Die Symptomatik ist nicht besser durch eine andere psychische Störung (z. B. generalisierte Angststörung, wahnhafte Störung) oder durch eine Substanzwirkung bzw. eine somatische Erkrankung erklärbar',
            citation: [{ classification: 'icd11', code: '6B20' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
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
  // ICD-11 6B40 — strukturelle Divergenz: Die PTBS wird auf DREI obligate
  // Kernsymptomgruppen verengt, die ALLE vorliegen müssen: (1) Wiedererleben des
  // Traumas „im Hier und Jetzt“ (nicht bloßes Erinnern), typischerweise begleitet
  // von Furcht/Entsetzen; (2) Vermeidung von Erinnerungen/Reizen; (3) anhaltendes
  // Erleben einer erhöhten gegenwärtigen Bedrohung (Hypervigilanz/Schreckhaftigkeit)
  // — nach Exposition gegenüber einem extrem bedrohlichen/entsetzlichen Ereignis,
  // über mindestens mehrere Wochen, mit funktioneller Beeinträchtigung.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6B40',
    groups: [
      {
        id: '6b40.exposure',
        label_de: 'Belastungskriterium (ICD-11)',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b40.traumatic_event',
            text_de:
              'Exposition gegenüber einem extrem bedrohlichen oder entsetzlichen Ereignis oder einer Serie solcher Ereignisse',
            citation: [{ classification: 'icd11', code: '6B40', ref: 'exposure' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('trauma_intrusions_dissociation', /trauma|bedrohung|gewalt|missbrauch|unfall|katastrophe|krieg/i),
          },
        ],
      },
      {
        id: '6b40.reexperiencing',
        label_de: 'Kernsymptom 1: Wiedererleben im Hier und Jetzt',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b40.reexperiencing_now',
            text_de:
              'Wiedererleben des Traumas in der Gegenwart (nicht nur Erinnern) in Form lebhafter intrusiver Erinnerungen, Flashbacks oder Albträume, typischerweise begleitet von starker Furcht oder Entsetzen',
            citation: [{ classification: 'icd11', code: '6B40', ref: 're-experiencing' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('trauma_intrusions_dissociation', /flashback|nachhall|wiedererleb|intrusion|albtraum|alptraum|aufdr[äa]ng.*erinner/i),
          },
        ],
      },
      {
        id: '6b40.avoidance',
        label_de: 'Kernsymptom 2: Vermeidung',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b40.avoidance_reminders',
            text_de:
              'Aktive Vermeidung von Gedanken und Erinnerungen an das Ereignis oder von Aktivitäten, Situationen oder Personen, die daran erinnern',
            citation: [{ classification: 'icd11', code: '6B40', ref: 'avoidance' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('trauma_intrusions_dissociation', /vermeid|meidet|umgeht.*erinner/i),
          },
        ],
      },
      {
        id: '6b40.threat',
        label_de: 'Kernsymptom 3: anhaltend erhöhtes Bedrohungserleben',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b40.current_threat',
            text_de:
              'Anhaltende Wahrnehmung einer erhöhten gegenwärtigen Bedrohung, z. B. ausgeprägte Hypervigilanz oder verstärkte Schreckreaktion auf Reize',
            citation: [{ classification: 'icd11', code: '6B40', ref: 'threat' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('trauma_intrusions_dissociation', /[üu]bererregung|schreckhaft|hypervigil|wachsam|alarmbereit/i),
          },
        ],
      },
      {
        id: '6b40.duration',
        label_de: 'Dauer',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 21 },
        criteria: [
          {
            id: '6b40.several_weeks',
            text_de: 'Die Symptome bestehen über einen Zeitraum von mindestens mehreren Wochen',
            citation: [{ classification: 'icd11', code: '6B40' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
            operationalRule: durationSignal(21),
          },
        ],
      },
      {
        id: '6b40.functional',
        label_de: 'Funktionelle Beeinträchtigung',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b40.functional_impairment',
            text_de:
              'Deutliche Beeinträchtigung in persönlichen, familiären, sozialen, schulischen, beruflichen oder anderen wichtigen Funktionsbereichen',
            citation: [{ classification: 'icd11', code: '6B40' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('functional_impairment', /beeintr[äa]cht|leiden|alltag.*gest[öo]rt|arbeitsunf[äa]hig|sozial.*r[üu]ckzug/i),
          },
        ],
      },
      {
        id: '6b40.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6b40.exclude_other',
            text_de:
              'Die Symptomatik ist nicht besser durch eine andere psychische Störung, eine körperliche Erkrankung oder eine Substanzwirkung erklärbar',
            citation: [{ classification: 'icd11', code: '6B40' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
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
  // ICD-11 6B43 — strukturelle Divergenz: Die Anpassungsstörung wird um die
  // BESCHÄFTIGUNG mit dem Stressor (übermäßige Sorge, wiederkehrende belastende
  // Gedanken an den Stressor oder seine Folgen) und das ANPASSUNGSVERSAGEN herum neu
  // gefasst — innerhalb von ~1 Monat nach einem identifizierbaren psychosozialen
  // Stressor und mit Rückbildung in der Regel innerhalb von ~6 Monaten nach Wegfall
  // des Stressors. Das ICD-10-Bild („emotionale Symptome über die Norm hinaus“) wird
  // damit präzisiert.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6B43',
    groups: [
      {
        id: '6b43.stressor',
        label_de: 'Identifizierbarer psychosozialer Stressor',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b43.identifiable_stressor',
            text_de:
              'Auftreten der Symptome innerhalb etwa eines Monats nach einem identifizierbaren psychosozialen Stressor oder einer Lebensveränderung (einzeln oder mehrfach)',
            citation: [{ classification: 'icd11', code: '6B43', ref: 'stressor' }],
            mappingHints: [{ kind: 'course', ref: 'precipitants' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: '6b43.core',
        label_de: 'Kern: Beschäftigung mit dem Stressor und Anpassungsversagen',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b43.preoccupation',
            text_de:
              'Übermäßige Beschäftigung mit dem Stressor oder seinen Folgen (z. B. anhaltende Sorgen, wiederkehrende belastende Gedanken über das Ereignis oder ständiges Grübeln über dessen Bedeutung)',
            citation: [{ classification: 'icd11', code: '6B43', ref: 'preoccupation' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('thought_content', /gr[üu]bel|sorge.*stressor|gedanklich.*kreis|besch[äa]ftig.*ereignis|wiederkehrend.*gedank/i),
          },
          {
            id: '6b43.failure_to_adapt',
            text_de:
              'Versagen, sich an den Stressor anzupassen, mit bedeutsamer Beeinträchtigung im persönlichen, familiären, sozialen, schulischen oder beruflichen Bereich',
            citation: [{ classification: 'icd11', code: '6B43', ref: 'failure-to-adapt' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('functional_impairment', /beeintr[äa]cht|[üu]berfordert|nicht.*bew[äa]ltig|alltag.*gest[öo]rt|leistungseinbu/i),
          },
        ],
      },
      {
        id: '6b43.course',
        label_de: 'Verlauf',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b43.resolution',
            text_de:
              'Die Symptome bilden sich in der Regel innerhalb von etwa sechs Monaten nach Wegfall des Stressors oder seiner Folgen zurück',
            citation: [{ classification: 'icd11', code: '6B43', ref: 'course' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: '6b43.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6b43.exclude_other',
            text_de:
              'Die Symptome erfüllen nicht die Kriterien einer anderen psychischen Störung (z. B. depressive Störung, PTBS) und gehen über eine normale Belastungsreaktion oder Trauer hinaus',
            citation: [{ classification: 'icd11', code: '6B43' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}

// ICD-11 6B6x dissoziative Störungen: ICD-11 führt die dissoziativen Störungen als
// eigene Gruppe (6B60–6B66) auf; die hier kodierten Kernmerkmale (Verlust der
// normalen Integration von Erinnerung/Identität/Wahrnehmung/Bewegung bzw.
// pseudoneurologische Konversionssymptome ohne organische Erklärung) sind klinisch
// äquivalent → dokumentierter icd10==icd11-Fallback ohne eigenen `icd11`-Baum.
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
  // ICD-11 6C20 — strukturelle Divergenz: Die „Körperliche Belastungsstörung“
  // (Bodily Distress Disorder) ist NICHT mehr über „medizinisch unerklärte“
  // Symptome definiert; entscheidend sind (1) belastende körperliche Symptome,
  // (2) EXZESSIVE Aufmerksamkeit auf die Symptome bzw. ausgeprägtes gesundheits-
  // bezogenes Verhalten und (3) Persistenz (in der Regel ≥ mehrere Monate) — mit
  // expliziter Schweregradabstufung (leicht/mittel/schwer). Die Symptome können mit
  // einer somatischen Erkrankung koexistieren; die Diagnose hängt nicht davon ab.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6C20 (Bodily Distress Disorder; nicht über „medizinisch unerklärt“ definiert)',
    groups: [
      {
        id: '6c20.core',
        label_de: 'Kern: belastende Körpersymptome mit exzessiver Aufmerksamkeit',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6c20.bodily_symptoms',
            text_de:
              'Vorliegen eines oder mehrerer für die Person belastender körperlicher Symptome (häufig, aber nicht zwingend, multipel und wechselnd)',
            citation: [{ classification: 'icd11', code: '6C20', ref: 'symptoms' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('somatic_preoccupation', /k[öo]rperlich.*beschwerd|somatoform|multipl.*symptom|schmerz|magen|herz.*beschwerd|funktionell/i),
          },
          {
            id: '6c20.excessive_attention',
            text_de:
              'Übermäßige Aufmerksamkeit auf die Symptome und ausgeprägtes gesundheitsbezogenes Verhalten (z. B. wiederholtes Aufsuchen von Untersuchungen, anhaltende Rückversicherungssuche), das in keinem angemessenen Verhältnis zu den Befunden steht',
            citation: [{ classification: 'icd11', code: '6C20', ref: 'attention' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('somatic_preoccupation', /[üu]berm[äa][ßs]ig|wiederholt.*untersuch|r[üu]ckversicher|arztbesuche|katastrophis/i),
          },
        ],
      },
      {
        id: '6c20.persistence',
        label_de: 'Persistenz',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 90 },
        criteria: [
          {
            id: '6c20.persistent_course',
            text_de:
              'Die Symptome und die übermäßige Beschäftigung sind anhaltend (an den meisten Tagen über mindestens mehrere Monate, Größenordnung ≥ 3 Monate)',
            citation: [{ classification: 'icd11', code: '6C20', ref: 'persistence' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
            operationalRule: durationSignal(90),
          },
        ],
      },
      {
        id: '6c20.severity',
        label_de: 'Schweregrad (ICD-11: leicht / mittelgradig / schwer)',
        logic: 'any_of',
        groupType: 'severity',
        criteria: [
          {
            id: '6c20.mild',
            text_de:
              'Leicht: gewisse Beschäftigung mit den Symptomen, aber keine wesentliche Beeinträchtigung der Funktionsfähigkeit',
            citation: [{ classification: 'icd11', code: '6C20.0', ref: 'mild' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
          },
          {
            id: '6c20.moderate',
            text_de:
              'Mittelgradig: ausgeprägte Beschäftigung mit deutlicher Beeinträchtigung in einigen Funktionsbereichen',
            citation: [{ classification: 'icd11', code: '6C20.1', ref: 'moderate' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
          },
          {
            id: '6c20.severe',
            text_de:
              'Schwer: durchgängige, einschneidende Beschäftigung mit schwerer Beeinträchtigung in vielen Bereichen (z. B. weitgehender Verlust beruflicher/sozialer Funktion)',
            citation: [{ classification: 'icd11', code: '6C20.2', ref: 'severe' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: '6c20.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6c20.exclude_other',
            text_de:
              'Die Symptome und die damit verbundene Beschäftigung sind nicht besser durch eine andere psychische Störung (z. B. Panikstörung, depressive Störung, Krankheitsangststörung) erklärbar',
            citation: [{ classification: 'icd11', code: '6C20' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
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
  // ICD-11 6B23 — strukturelle Divergenz durch REGRUPPIERUNG: Die Krankheitsangst
  // wird in ICD-11 nicht den somatoformen Störungen, sondern dem Zwangsspektrum
  // („Zwangsstörung oder verwandte Störungen“) zugeordnet. Entsprechend rückt das
  // repetitive, zwangsspektrum-typische Verhalten (übermäßiges Kontrollieren des
  // Körpers, Rückversicherungssuche) ODER die maladaptive Vermeidung neben die
  // anhaltende Krankheitsbeschäftigung — und die Befürchtung ist gegenüber
  // Rückversicherung resistent und persistiert über mehrere Monate.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6B23 (Zwangsspektrum: Hypochondrie/Krankheitsangst)',
    groups: [
      {
        id: '6b23.core',
        label_de: 'Kern: anhaltende Beschäftigung mit/Angst vor schwerer Erkrankung',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b23.illness_preoccupation',
            text_de:
              'Anhaltende Beschäftigung mit der Befürchtung oder Überzeugung, an einer oder mehreren schweren, fortschreitenden oder lebensbedrohlichen Erkrankungen zu leiden bzw. zu erkranken',
            citation: [{ classification: 'icd11', code: '6B23', ref: 'preoccupation' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('somatic_preoccupation', /krankheitsangst|hypochond|gesundheitsangst|[üu]berzeugung.*krank|angst.*schwer.*erkrank/i),
          },
        ],
      },
      {
        id: '6b23.behaviour',
        label_de: 'Zwangsspektrum-typisches Verhalten (mindestens eines)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b23.checking_reassurance',
            text_de:
              'Wiederholtes, exzessives gesundheitsbezogenes Verhalten (z. B. wiederholtes Untersuchen des eigenen Körpers, häufige Arztbesuche, anhaltende Rückversicherungssuche)',
            citation: [{ classification: 'icd11', code: '6B23', ref: 'checking' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'obsessions_compulsions' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('obsessions_compulsions', /kontroll|wiederholt.*untersuch|r[üu]ckversicher|arztbesuche|abtast|body.?check/i),
          },
          {
            id: '6b23.maladaptive_avoidance',
            text_de:
              'Maladaptive Vermeidung (z. B. Meiden von Arztterminen, Krankenhäusern oder krankheitsassoziierten Informationen) aus Angst vor einer Bestätigung der Befürchtung',
            citation: [{ classification: 'icd11', code: '6B23', ref: 'avoidance' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('anxiety_panic_phobic_symptoms', /vermeid.*arzt|meidet.*untersuch|vermeid.*krankenhaus|meidet.*information/i),
          },
        ],
      },
      {
        id: '6b23.persistence',
        label_de: 'Persistenz und Rückversicherungsresistenz',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 90 },
        criteria: [
          {
            id: '6b23.reassurance_resistant',
            text_de:
              'Die Beschäftigung bzw. Angst besteht über mindestens mehrere Monate fort und bleibt trotz angemessener ärztlicher Abklärung und Rückversicherung bestehen',
            citation: [{ classification: 'icd11', code: '6B23', ref: 'persistence' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('somatic_preoccupation', /r[üu]ckversicher|trotz.*unauff[äa]llig|wiederholt.*untersuch|nicht.*beruhig/i),
          },
        ],
      },
      {
        id: '6b23.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6b23.exclude_other',
            text_de:
              'Die Krankheitsüberzeugung erreicht kein wahnhaftes Ausmaß und ist nicht besser durch eine körperliche Belastungsstörung, eine depressive oder eine andere psychische Störung erklärbar',
            citation: [{ classification: 'icd11', code: '6B23' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}

/**
 * Komplexe posttraumatische Belastungsstörung (CPTSD) — ICD-11 6B41.
 *
 * ICD-11-SPEZIFISCHE Kategorie OHNE ICD-10-Äquivalent: ICD-10 kennt keine
 * eigenständige komplexe PTBS (am ehesten näherte sich F62.0 „andauernde
 * Persönlichkeitsänderung nach Extrembelastung“ an, ist aber nicht deckungsgleich).
 * Daher trägt diese Störung als PRIMÄREN (ICD-10-Fallback-)Baum direkt die
 * ICD-11-6B41-Kriterien — der Resolver fällt im ICD-11-Modus mangels separatem
 * `icd11`-Block bewusst auf eben diese 6B41-Gruppen zurück (dokumentierte
 * Gleichsetzung, kein Daten-Gap). Klassifikation/Code sind durchgehend ICD-11.
 *
 * CPTSD = die drei PTBS-Kerncluster (Wiedererleben im Hier und Jetzt, Vermeidung,
 * erhöhtes Bedrohungserleben) PLUS drei „Störungen der Selbstorganisation“ (DSO):
 * Affektregulationsstörung, negatives Selbstkonzept und Beziehungsstörungen — nach
 * lang andauernder oder wiederholter Traumatisierung, der nur schwer oder nicht zu
 * entkommen war (z. B. anhaltende Gewalt, Folter, Missbrauch in der Kindheit).
 */
const complexPtsd: Disorder = {
  id: 'complex_ptsd',
  classification: 'icd11',
  code: '6B41',
  name_de: 'Komplexe posttraumatische Belastungsstörung',
  // Kein ICD-10-Äquivalent → der crosswalkKey trägt den ICD-11-Code 6B41 (KEIN
  // F-Code). `match.ts` behandelt ihn nicht als ICD-10-Anker (isIcd10('6B41') ist
  // false, da mit Ziffer beginnend); die Zuordnung erfolgt über codingSystems.icd11.
  crosswalkKey: '6B41',
  sourceRef: 'operationalisiert nach ICD-11 6B41 (ICD-11-spezifisch, kein ICD-10-Äquivalent)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd11: { code: '6B41', label_de: 'Komplexe posttraumatische Belastungsstörung' },
    dsm5tr: { code: 'crosswalk', label_de: 'Kein eigenständiges DSM-5-TR-Äquivalent (am ehesten PTSD mit ausgeprägten Begleitmerkmalen; Crosswalk)' },
  },
  differentials_de: [
    'Posttraumatische Belastungsstörung (ohne Störungen der Selbstorganisation; ICD-11 6B40)',
    'Emotional instabile (Borderline-)Persönlichkeitsstörung',
    'Andauernde Persönlichkeitsänderung nach Extrembelastung (ICD-10 F62.0)',
    'Depressive oder dissoziative Störung mit Traumabezug',
  ],
  groups: [
    {
      id: '6b41.exposure',
      label_de: 'Belastungskriterium: lang andauernde/wiederholte Traumatisierung',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: '6b41.prolonged_trauma',
          text_de:
            'Exposition gegenüber einem extrem bedrohlichen oder entsetzlichen Ereignis, meist lang andauernd oder wiederholt und mit erschwerter oder unmöglicher Fluchtmöglichkeit (z. B. anhaltende häusliche Gewalt, Folter, Sklaverei, wiederholter Missbrauch in der Kindheit)',
          citation: [{ classification: 'icd11', code: '6B41', ref: 'exposure' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('trauma_intrusions_dissociation', /anhaltend.*trauma|wiederholt.*missbrauch|folter|h[äa]uslich.*gewalt|langj[äa]hrig.*gewalt|kindheit.*missbrauch/i),
        },
      ],
    },
    {
      id: '6b41.ptsd_core',
      label_de: 'PTBS-Kerncluster (alle drei erforderlich)',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 21 },
      criteria: [
        {
          id: '6b41.reexperiencing',
          text_de:
            'Wiedererleben des Traumas in der Gegenwart (lebhafte intrusive Erinnerungen, Flashbacks oder Albträume), typischerweise begleitet von Furcht oder Entsetzen',
          citation: [{ classification: 'icd11', code: '6B41', ref: 're-experiencing' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('trauma_intrusions_dissociation', /flashback|nachhall|wiedererleb|intrusion|albtraum|alptraum|aufdr[äa]ng.*erinner/i),
        },
        {
          id: '6b41.avoidance',
          text_de: 'Vermeidung von Gedanken, Erinnerungen oder von Aktivitäten, Situationen oder Personen, die an das Trauma erinnern',
          citation: [{ classification: 'icd11', code: '6B41', ref: 'avoidance' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('trauma_intrusions_dissociation', /vermeid|meidet|umgeht.*erinner/i),
        },
        {
          id: '6b41.current_threat',
          text_de: 'Anhaltende Wahrnehmung einer erhöhten gegenwärtigen Bedrohung (z. B. Hypervigilanz, verstärkte Schreckreaktion)',
          citation: [{ classification: 'icd11', code: '6B41', ref: 'threat' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'trauma_intrusions_dissociation' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('trauma_intrusions_dissociation', /[üu]bererregung|schreckhaft|hypervigil|wachsam|alarmbereit/i),
        },
      ],
    },
    {
      id: '6b41.dso',
      label_de: 'Störungen der Selbstorganisation (DSO — alle drei erforderlich)',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: '6b41.affect_dysregulation',
          text_de:
            'Schwere und anhaltende Affektregulationsstörung (z. B. erhöhte emotionale Reagibilität, Gewaltausbrüche, gefühlloses Erstarren oder dissoziatives Erleben unter Belastung)',
          citation: [{ classification: 'icd11', code: '6B41', ref: 'affect' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /affektregulation|emotional.*instabil|impuls|wutausbruch|gef[üu]hllos|erstarr|affektlabil/i),
        },
        {
          id: '6b41.negative_self_concept',
          text_de:
            'Anhaltend negatives Selbstkonzept mit Überzeugungen von Wertlosigkeit, Versagen oder Kleinheit, häufig begleitet von tiefen Scham-, Schuld- oder Versagensgefühlen',
          citation: [{ classification: 'icd11', code: '6B41', ref: 'self-concept' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('thought_content', /wertlos|versagen|schuld|scham|minderwertig|selbstabwert|negativ.*selbstbild/i),
        },
        {
          id: '6b41.relationship_disturbance',
          text_de:
            'Anhaltende Schwierigkeiten, Beziehungen aufrechtzuerhalten und sich anderen nahe zu fühlen (z. B. Vermeidung von Beziehungen, Gefühl der Distanz oder geringes Interesse an Beziehungen)',
          citation: [{ classification: 'icd11', code: '6B41', ref: 'relationships' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /beziehung.*schwierig|distanz|r[üu]ckzug|n[äa]he.*vermeid|interpersonell|bindung/i),
        },
      ],
    },
    {
      id: '6b41.functional',
      label_de: 'Funktionelle Beeinträchtigung',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: '6b41.functional_impairment',
          text_de:
            'Deutliche Beeinträchtigung in persönlichen, familiären, sozialen, schulischen, beruflichen oder anderen wichtigen Funktionsbereichen',
          citation: [{ classification: 'icd11', code: '6B41' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('functional_impairment', /beeintr[äa]cht|leiden|alltag.*gest[öo]rt|arbeitsunf[äa]hig|sozial.*r[üu]ckzug/i),
        },
      ],
    },
    {
      id: '6b41.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: '6b41.exclude_other',
          text_de:
            'Die Symptomatik ist nicht besser durch eine andere psychische Störung erklärbar; liegen keine Störungen der Selbstorganisation vor, ist stattdessen eine PTBS (6B40) zu kodieren',
          citation: [{ classification: 'icd11', code: '6B41' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

export const neuroticStressSomatoformDisorders: Disorder[] = [
  agoraphobia,
  socialPhobia,
  specificPhobia,
  mixedAnxietyDepression,
  obsessiveCompulsiveDisorder,
  acuteStressReaction,
  ptsd,
  complexPtsd,
  adjustmentDisorder,
  dissociativeDisorders,
  bodilyDistressSomatoform,
  hypochondriasis,
]
