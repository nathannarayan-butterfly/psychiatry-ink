import type { Disorder } from '../schema'
import { domainSignal } from '../predicateHelpers'

/**
 * Butterfly criteria block F8 — Entwicklungsstörungen (disorders of psychological
 * development), operationalized from ICD-10 F80–F84 with ICD-11 crosswalks.
 *
 * LICENSING: every `text_de` is an ORIGINAL German operational paraphrase that
 * encodes clinical FACTS only (the existence of a feature, onset pattern, the
 * required exclusions). No ICD/DSM criterion wording is reproduced. Each record
 * cites the standard it was operationalized from via `sourceRef` / `citation`.
 *
 * MAPPING NOTE: the ISDM phenomenology domains are oriented at adult-state
 * psychopathology and do not cleanly capture developmental skill deficits
 * (Lese-/Rechtschreib-, Rechen- und motorische Entwicklungsstörungen). Where a
 * clean data mapping is not possible, criteria are authored attestation-only
 * (`allowClinicianAttest: true`, no `operationalRule`, `mappingHints: []`).
 */

/**
 * F80 — Umschriebene Entwicklungsstörung des Sprechens und der Sprache.
 * ICD-11 crosswalk: 6A01 (Developmental speech or language disorders).
 */
const speechLanguageDisorder: Disorder = {
  id: 'developmental_speech_language_disorder',
  classification: 'icd10',
  code: 'F80',
  name_de: 'Umschriebene Entwicklungsstörung des Sprechens und der Sprache',
  crosswalkKey: 'F80',
  sourceRef: 'operationalisiert nach ICD-10 F80 / ICD-11 6A01',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F80', label_de: 'Umschriebene Entwicklungsstörungen des Sprechens und der Sprache' },
    icd11: { code: '6A01', label_de: 'Entwicklungsbedingte Sprech- oder Sprachstörungen' },
    dsm5tr: { code: '315.39', label_de: 'Language / Speech Sound Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Hörstörung als Ursache der Sprachauffälligkeit',
    'Intelligenzminderung mit globalem Entwicklungsrückstand',
    'Autismus-Spektrum-Störung',
    'Selektiver Mutismus (sprachfähig, aber situativ verstummt)',
    'Mehrsprachigkeit / Umgebungsfaktoren',
  ],
  groups: [
    {
      id: 'f80.core',
      label_de: 'Kern: umschriebener Sprach-/Sprechentwicklungsrückstand',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f80.delayed_acquisition',
          text_de: 'Erwerb sprachlicher Fähigkeiten (Artikulation, expressive und/oder rezeptive Sprache) ist von frühen Entwicklungsphasen an deutlich unter dem für das Alter erwarteten Niveau',
          citation: [{ classification: 'icd10', code: 'F80' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'speech_language', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'speech_language',
            /sprachentwicklung|sprechst[öo]rung|artikulation|wortschatz|sprachverst[äa]ndnis|spracharm|verz[öo]gert/i,
            /altersgerecht|unauff[äa]llig/i,
          ),
        },
        {
          id: 'f80.early_onset',
          text_de: 'Auffälligkeit besteht seit den frühen Entwicklungsjahren und ist nicht Folge eines erst später erworbenen Sprachverlusts',
          citation: [{ classification: 'icd11', code: '6A01' }],
          mappingHints: [{ kind: 'course', ref: 'onset' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f80.functional_impact',
          text_de: 'Der Sprachrückstand beeinträchtigt schulische Leistungen, Alltagskommunikation oder soziale Teilhabe',
          citation: [{ classification: 'icd11', code: '6A01' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|einschr[äa]nk|schul|kommunikation/i),
        },
      ],
    },
    {
      id: 'f80.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f80.exclude_hearing_neuro',
          text_de: 'Der Sprachrückstand ist nicht ausreichend durch eine Hörstörung, eine neurologische Erkrankung oder eine Anomalie des Sprechapparates erklärbar',
          citation: [{ classification: 'icd10', code: 'F80' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f80.exclude_global_delay',
          text_de: 'Die Sprachfähigkeiten liegen deutlich unterhalb des allgemeinen nonverbalen Entwicklungsniveaus (kein globaler Rückstand im Sinne einer Intelligenzminderung)',
          citation: [{ classification: 'icd10', code: 'F80' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6A01 — DISTINCT structure. ICD-10 F80 fasst Sprechen und Sprache in
  // einer Kategorie zusammen und gliedert nach Oberflächenform (F80.0
  // Artikulation, F80.1 expressive, F80.2 rezeptive Sprache, F80.3 erworbene
  // Aphasie/Landau-Kleffner). ICD-11 reorganisiert das Gruppierungskonzept um
  // DREI konzeptuell getrennte entwicklungsbedingte Präsentationen: (1)
  // Entwicklungsbedingte Störung der Sprechlautbildung (6A01.0), (2)
  // Entwicklungsbedingte Redeflussstörung / Stottern (6A01.1 — in ICD-10 noch
  // außerhalb dieses Blocks unter F98.5/F98.6 geführt) und (3)
  // Entwicklungsbedingte Sprachstörung (6A01.2) mit eigenen Spezifizierern
  // (rezeptiv-expressiv, vorwiegend expressiv, vorwiegend pragmatisch). Diese
  // Neugliederung wird hier als eigenständiger Baum abgebildet.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6A01',
    groups: [
      {
        id: '6a01.core',
        label_de: 'Kern: eine der entwicklungsbedingten Sprech- oder Sprachpräsentationen (mindestens eine)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a01.speech_sound',
            text_de: 'Entwicklungsbedingte Störung der Sprechlautbildung: anhaltende Schwierigkeiten beim Erwerb und der korrekten Produktion von Sprechlauten, deutlich unter dem für das Alter erwarteten Niveau',
            citation: [{ classification: 'icd11', code: '6A01.0' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'speech_language', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'speech_language',
              /sprechlaut|artikulation|aussprache|lautbildung|undeutlich/i,
              /altersgerecht|unauff[äa]llig/i,
            ),
          },
          {
            id: '6a01.speech_fluency',
            text_de: 'Entwicklungsbedingte Redeflussstörung: anhaltende, dem Alter unangemessene Beeinträchtigung des Redeflusses (z. B. Stottern mit Lautwiederholungen, Dehnungen oder Blockaden)',
            citation: [{ classification: 'icd11', code: '6A01.1' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'speech_language' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('speech_language', /redefluss|stottern|blockad|wiederholung.*laut|dehnung/i),
          },
          {
            id: '6a01.language',
            text_de: 'Entwicklungsbedingte Sprachstörung: anhaltende Defizite beim Erwerb, Verständnis oder Gebrauch der Sprache (rezeptiv-expressiv, vorwiegend expressiv oder vorwiegend pragmatisch), deutlich unter dem Altersniveau',
            citation: [{ classification: 'icd11', code: '6A01.2' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'speech_language' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'speech_language',
              /sprachentwicklung|sprachverst[äa]ndnis|wortschatz|grammati|spracharm|verz[öo]gert/i,
              /altersgerecht|unauff[äa]llig/i,
            ),
          },
        ],
      },
      {
        id: '6a01.qualifiers',
        label_de: 'Diagnostische Bedingungen',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a01.developmental_onset',
            text_de: 'Beginn in der Entwicklungsperiode; die Auffälligkeit ist kein erst später erworbener Sprach- oder Sprechverlust',
            citation: [{ classification: 'icd11', code: '6A01', ref: 'onset' }],
            mappingHints: [{ kind: 'course', ref: 'onset' }],
            allowClinicianAttest: true,
          },
          {
            id: '6a01.functional_impact',
            text_de: 'Die Sprech- oder Sprachdefizite beeinträchtigen die Alltagskommunikation, schulische Leistungen oder soziale Teilhabe deutlich',
            citation: [{ classification: 'icd11', code: '6A01', ref: 'impairment' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|einschr[äa]nk|schul|kommunikation/i),
          },
        ],
      },
      {
        id: '6a01.exclusions',
        label_de: 'Ausschlüsse / Abgrenzung',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6a01.exclude_other_cause',
            text_de: 'Die Defizite sind nicht ausreichend durch eine Intelligenzminderung, eine Hör- oder andere Sinnesstörung, eine neurologische Erkrankung oder unzureichenden Sprachkontakt erklärbar',
            citation: [{ classification: 'icd11', code: '6A01', ref: 'exclude' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}

/**
 * F81 — Umschriebene Entwicklungsstörungen schulischer Fertigkeiten
 * (Lese-/Rechtschreib- und Rechenstörung). ICD-11 crosswalk: 6A03
 * (Developmental learning disorder).
 */
const scholasticSkillsDisorder: Disorder = {
  id: 'developmental_learning_disorder',
  classification: 'icd10',
  code: 'F81',
  name_de: 'Umschriebene Entwicklungsstörung schulischer Fertigkeiten',
  crosswalkKey: 'F81',
  sourceRef: 'operationalisiert nach ICD-10 F81 (inkl. F81.0 Lese-Rechtschreib-, F81.2 Rechenstörung) / ICD-11 6A03',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F81', label_de: 'Umschriebene Entwicklungsstörungen schulischer Fertigkeiten' },
    icd11: { code: '6A03', label_de: 'Entwicklungsbedingte Lernstörung' },
    dsm5tr: { code: '315.x', label_de: 'Specific Learning Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Intelligenzminderung (globaler Leistungsrückstand)',
    'Unzureichende oder unterbrochene Beschulung',
    'Sinnesstörung (Seh-/Hörminderung)',
    'Aufmerksamkeitsstörung (ADHS) als Ursache von Lernproblemen',
    'Sprachentwicklungsstörung',
  ],
  groups: [
    {
      id: 'f81.core',
      label_de: 'Kern: umschriebene Beeinträchtigung schulischer Fertigkeiten',
      logic: 'any_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f81.reading_spelling',
          text_de: 'Deutlich beeinträchtigte Lese- und/oder Rechtschreibfertigkeiten, die nicht allein durch Alter, Intelligenz oder unangemessene Beschulung erklärbar sind (Lese-Rechtschreib-Störung)',
          citation: [{ classification: 'icd10', code: 'F81.0' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f81.arithmetic',
          text_de: 'Deutlich beeinträchtigte Rechenfertigkeiten (Grundrechenarten, Zahlenverständnis), die nicht allein durch Alter, Intelligenz oder unangemessene Beschulung erklärbar sind (Rechenstörung/Dyskalkulie)',
          citation: [{ classification: 'icd10', code: 'F81.2' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f81.qualifiers',
      label_de: 'Diagnostische Bedingungen',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f81.early_onset',
          text_de: 'Die Lernbeeinträchtigung tritt von Beginn des formalen Schulunterrichts an auf und ist nicht erst sekundär erworben',
          citation: [{ classification: 'icd11', code: '6A03' }],
          mappingHints: [{ kind: 'course', ref: 'onset' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f81.functional_impact',
          text_de: 'Der Leistungsrückstand beeinträchtigt die schulische Leistung oder Alltagsanforderungen, die diese Fertigkeiten erfordern',
          citation: [{ classification: 'icd11', code: '6A03' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|einschr[äa]nk|schul|leistung/i),
        },
      ],
    },
    {
      id: 'f81.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f81.exclude_intellectual_sensory',
          text_de: 'Der Rückstand ist nicht durch eine Intelligenzminderung, eine unkorrigierte Sinnesstörung oder fehlende Beschulung ausreichend erklärbar',
          citation: [{ classification: 'icd10', code: 'F81' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6A03 — DISTINCT structure. ICD-10 F81 subtypisiert nach betroffener
  // Fertigkeit als Lese-Rechtschreib-Störung (F81.0), isolierte
  // Rechtschreibstörung (F81.1), Rechenstörung (F81.2) und kombinierte Störung
  // (F81.3). ICD-11 definiert EINE "Entwicklungsbedingte Lernstörung" mit DREI
  // Spezifizierern: Beeinträchtigung des Lesens (6A03.0), des schriftlichen
  // Ausdrucks (6A03.1 — als eigenständiger Spezifizierer neu, in ICD-10 nicht
  // getrennt von der Lese-Rechtschreib-Störung geführt) und der Mathematik
  // (6A03.2). Zusätzlich verlangt ICD-11 explizit das Fortbestehen deutlich
  // unter dem Altersniveau TROTZ gezielter Förderung. Diese Struktur wird hier
  // eigenständig abgebildet.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6A03',
    groups: [
      {
        id: '6a03.core',
        label_de: 'Kern: anhaltende Beeinträchtigung einer schulischen Fertigkeit (mindestens eine)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a03.reading',
            text_de: 'Beeinträchtigung des Lesens: deutlich erschwertes Lesen hinsichtlich Genauigkeit, Geschwindigkeit oder Sinnverständnis',
            citation: [{ classification: 'icd11', code: '6A03.0' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
          {
            id: '6a03.written_expression',
            text_de: 'Beeinträchtigung des schriftlichen Ausdrucks: deutliche Schwierigkeiten bei Rechtschreibung, Grammatik, Zeichensetzung oder der Organisation schriftlicher Texte',
            citation: [{ classification: 'icd11', code: '6A03.1' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
          {
            id: '6a03.mathematics',
            text_de: 'Beeinträchtigung der Mathematik: deutliche Schwierigkeiten mit Zahlenverständnis, Rechenfakten oder rechnerischen Verfahren',
            citation: [{ classification: 'icd11', code: '6A03.2' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: '6a03.qualifiers',
        label_de: 'Diagnostische Bedingungen',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a03.below_expected',
            text_de: 'Die betroffene Fertigkeit liegt deutlich und anhaltend unter dem für das Alter erwarteten Niveau und bessert sich nicht ausreichend trotz gezielter Förderung',
            citation: [{ classification: 'icd11', code: '6A03', ref: 'persistence' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
          {
            id: '6a03.developmental_onset',
            text_de: 'Die Lernschwierigkeiten beginnen in der Schulzeit bzw. der Entwicklungsperiode und sind nicht erst sekundär erworben',
            citation: [{ classification: 'icd11', code: '6A03', ref: 'onset' }],
            mappingHints: [{ kind: 'course', ref: 'onset' }],
            allowClinicianAttest: true,
          },
          {
            id: '6a03.functional_impact',
            text_de: 'Der Leistungsrückstand beeinträchtigt schulische, berufliche oder alltägliche Anforderungen, die diese Fertigkeiten erfordern',
            citation: [{ classification: 'icd11', code: '6A03', ref: 'impairment' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|einschr[äa]nk|schul|leistung/i),
          },
        ],
      },
      {
        id: '6a03.exclusions',
        label_de: 'Ausschlüsse / Abgrenzung',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6a03.exclude_other_cause',
            text_de: 'Der Rückstand ist nicht ausreichend durch eine Intelligenzminderung, eine unkorrigierte Sinnesstörung, eine neurologische Erkrankung oder fehlenden bzw. unzureichenden Unterricht erklärbar',
            citation: [{ classification: 'icd11', code: '6A03', ref: 'exclude' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}

/**
 * F82 — Umschriebene Entwicklungsstörung der motorischen Funktionen.
 * ICD-11 crosswalk: 6A04 (Developmental motor coordination disorder).
 *
 * ICD-11 6A04 — DELIBERATE icd10==icd11 mapping (KEIN distinkter `icd11`-Baum).
 * Beide Systeme verlangen identisch: Erwerb und Ausführung koordinierter
 * motorischer Fertigkeiten deutlich unter dem für Alter und Lerngelegenheit
 * erwarteten Niveau, Beginn in der Entwicklungsperiode, deutliche
 * Beeinträchtigung von Alltag/Schule und Ausschluss einer neurologischen
 * Erkrankung oder Intelligenzminderung als hinreichende Erklärung. ICD-11 führt
 * keine Subtypen und keine zusätzlichen operationalisierbaren Schwellen ein, die
 * über den F82-Baum hinausgehen; auf der hier kodierten Granularität sind die
 * Operationalisierungen klinisch deckungsgleich → ICD-11-Modus nutzt den
 * F82-Baum als dokumentierten Fallback.
 */
const motorFunctionDisorder: Disorder = {
  id: 'developmental_motor_coordination_disorder',
  classification: 'icd10',
  code: 'F82',
  name_de: 'Umschriebene Entwicklungsstörung der motorischen Funktionen',
  crosswalkKey: 'F82',
  sourceRef: 'operationalisiert nach ICD-10 F82 / ICD-11 6A04',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F82', label_de: 'Umschriebene Entwicklungsstörung der motorischen Funktionen' },
    icd11: { code: '6A04', label_de: 'Entwicklungsbedingte Koordinationsstörung' },
    dsm5tr: { code: '315.4', label_de: 'Developmental Coordination Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Neurologische Erkrankung (z. B. Zerebralparese, Myopathie)',
    'Intelligenzminderung mit allgemeinem Entwicklungsrückstand',
    'Sehstörung',
    'Autismus-Spektrum-Störung',
  ],
  groups: [
    {
      id: 'f82.core',
      label_de: 'Kern: beeinträchtigte motorische Koordination',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f82.coordination_deficit',
          text_de: 'Motorische Koordination (Fein- und/oder Grobmotorik) liegt deutlich unter dem für Alter und Intelligenz erwarteten Niveau (z. B. ungeschicktes Hantieren, verzögertes Erlernen motorischer Meilensteine)',
          citation: [{ classification: 'icd10', code: 'F82' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f82.early_onset',
          text_de: 'Die Koordinationsschwäche besteht seit der frühen Entwicklung und ist nicht erst später erworben',
          citation: [{ classification: 'icd11', code: '6A04' }],
          mappingHints: [{ kind: 'course', ref: 'onset' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f82.functional_impact',
          text_de: 'Die motorische Ungeschicklichkeit beeinträchtigt schulische Leistungen, Alltagsaktivitäten oder Spiel deutlich',
          citation: [{ classification: 'icd11', code: '6A04' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|einschr[äa]nk|alltag|schul/i),
        },
      ],
    },
    {
      id: 'f82.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f82.exclude_neuro_intellectual',
          text_de: 'Die Koordinationsstörung ist nicht durch eine umschriebene neurologische Erkrankung oder eine Intelligenzminderung ausreichend erklärbar',
          citation: [{ classification: 'icd10', code: 'F82' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

/**
 * F84 — Tiefgreifende Entwicklungsstörungen, hier als Autismus-Spektrum-Störung
 * zusammengeführt (frühkindlicher Autismus F84.0 + Asperger-Syndrom F84.5).
 * ICD-11 crosswalk: 6A02 (Autism spectrum disorder).
 */
const autismSpectrumDisorder: Disorder = {
  id: 'autism_spectrum_disorder',
  classification: 'icd10',
  code: 'F84',
  name_de: 'Autismus-Spektrum-Störung',
  crosswalkKey: 'F84',
  sourceRef:
    'operationalisiert nach ICD-10 F84 (frühkindlicher Autismus F84.0, Asperger-Syndrom F84.5 zusammengeführt) / ICD-11 6A02',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F84.0', label_de: 'Frühkindlicher Autismus (inkl. Asperger F84.5 als Spektrum)' },
    icd11: { code: '6A02', label_de: 'Autismus-Spektrum-Störung' },
    dsm5tr: { code: '299.00', label_de: 'Autism Spectrum Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Intelligenzminderung ohne autistische Kernmerkmale',
    'Umschriebene Sprachentwicklungsstörung',
    'Soziale (pragmatische) Kommunikationsstörung',
    'Reaktive Bindungsstörung / Deprivation',
    'Schizophrenie mit frühem Beginn',
    'ADHS (Aufmerksamkeits-/Impulskontrollprobleme ohne Kernautistik)',
  ],
  groups: [
    {
      id: 'f84.social_communication',
      label_de: 'Persistierende Defizite der sozialen Kommunikation und Interaktion',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f84.social_reciprocity',
          text_de: 'Anhaltende Beeinträchtigung der sozial-emotionalen Gegenseitigkeit (z. B. eingeschränkte Kontaktaufnahme, geteilte Aufmerksamkeit oder Reaktion auf soziale Annäherung)',
          citation: [{ classification: 'icd10', code: 'F84' }, { classification: 'icd11', code: '6A02' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'personality_interpersonal_style',
            /sozial.*(r[üu]ckzug|kontakt|interaktion)|distanziert|wenig\s+gegenseitig|kontaktst[öo]rung|autistisch/i,
          ),
        },
        {
          id: 'f84.nonverbal_communication',
          text_de: 'Beeinträchtigung der nonverbalen Kommunikation (z. B. Blickkontakt, Mimik, Gestik) und der sozialen Sprachverwendung',
          citation: [{ classification: 'icd10', code: 'F84' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'speech_language' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('speech_language', /nonverbal|blickkontakt|mimik|gestik|pragmati|kommunikation/i),
        },
        {
          id: 'f84.relationships',
          text_de: 'Schwierigkeiten, altersgerechte Beziehungen aufzubauen und aufrechtzuerhalten bzw. das Verhalten an soziale Kontexte anzupassen',
          citation: [{ classification: 'icd11', code: '6A02' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style' }],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f84.restricted_repetitive',
      label_de: 'Eingeschränkte, repetitive Verhaltens-, Interessens- und Aktivitätsmuster (mindestens 2)',
      logic: 'at_least_n_of',
      threshold: 2,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f84.stereotyped_behavior',
          text_de: 'Stereotype oder repetitive motorische Bewegungen, Sprachmuster (z. B. Echolalie) oder Objektgebrauch',
          citation: [{ classification: 'icd10', code: 'F84' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'appearance_behavior', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('appearance_behavior', /stereotyp|repetitiv|echolalie|man[ie]rismen|sch[au]kel/i),
        },
        {
          id: 'f84.insistence_sameness',
          text_de: 'Übermäßiges Festhalten an Gleichförmigkeit, Routinen oder ritualisierten Abläufen; deutliches Unbehagen bei Veränderungen',
          citation: [{ classification: 'icd10', code: 'F84' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f84.restricted_interests',
          text_de: 'Stark begrenzte, ungewöhnlich intensive oder fixierte Spezialinteressen',
          citation: [{ classification: 'icd10', code: 'F84' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f84.sensory',
          text_de: 'Über- oder Unterempfindlichkeit gegenüber sensorischen Reizen oder ungewöhnliches Interesse an sensorischen Aspekten der Umwelt',
          citation: [{ classification: 'icd11', code: '6A02' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f84.developmental_context',
      label_de: 'Beginn und Beeinträchtigung',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f84.early_onset',
          text_de: 'Die Merkmale sind seit der frühen Kindheit vorhanden (können bei geringeren sozialen Anforderungen erst später voll erkennbar werden)',
          citation: [{ classification: 'icd10', code: 'F84', ref: 'Beginn < 3 J. (frühkindlicher Typ)' }],
          mappingHints: [{ kind: 'course', ref: 'onset' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f84.functional_impact',
          text_de: 'Die Merkmale verursachen klinisch bedeutsame Beeinträchtigungen in sozialen, schulischen oder anderen wichtigen Funktionsbereichen',
          citation: [{ classification: 'icd11', code: '6A02' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|einschr[äa]nk|sozial|schul/i),
        },
      ],
    },
    {
      id: 'f84.exclusions',
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f84.exclude_better_explained',
          text_de: 'Die Auffälligkeiten sind nicht besser durch eine isolierte Intelligenzminderung oder eine andere psychische Störung erklärbar',
          citation: [{ classification: 'icd11', code: '6A02' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6A02 — DISTINCT structure (GENUINE DIVERGENCE). ICD-11 VEREINIGT die
  // früheren ICD-10 F84-Subtypen (frühkindlicher Autismus F84.0, Asperger-Syndrom
  // F84.5, atypischer Autismus F84.1 u. a.) in EINER "Autismus-Spektrum-Störung",
  // die über ZWEI Kerndomänen definiert ist: (1) anhaltende Defizite der sozialen
  // Kommunikation und der wechselseitigen sozialen Interaktion sowie (2)
  // eingeschränkte, repetitive und unflexible Verhaltens-, Interessen- und
  // Aktivitätsmuster (einschließlich sensorischer Besonderheiten). Die in ICD-10
  // geforderte Trias mit OBLIGATER Sprachentwicklungsverzögerung ENTFÄLLT: Sprach-
  // und Intelligenzniveau sind keine diagnostische Voraussetzung mehr, sondern
  // werden als SEPARATE Qualifizierer erfasst (mit/ohne Beeinträchtigung der
  // intellektuellen Entwicklung, mit/ohne Beeinträchtigung der funktionalen
  // Sprache). Beginn in der Entwicklungsperiode, wobei die Merkmale erst später
  // voll erkennbar werden können, sobald die Anforderungen die Fähigkeiten
  // übersteigen.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6A02',
    groups: [
      {
        id: '6a02.social_communication',
        label_de: 'Domäne 1: anhaltende Defizite der sozialen Kommunikation und wechselseitigen Interaktion',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a02.social_reciprocity',
            text_de: 'Anhaltende Beeinträchtigung der sozial-emotionalen Gegenseitigkeit (z. B. eingeschränkte Initiative zur Kontaktaufnahme, geteilte Aufmerksamkeit oder Reaktion auf soziale Annäherung)',
            citation: [{ classification: 'icd11', code: '6A02', ref: 'social-reciprocity' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'personality_interpersonal_style',
              /sozial.*(r[üu]ckzug|kontakt|interaktion)|distanziert|wenig\s+gegenseitig|kontaktst[öo]rung|autistisch/i,
            ),
          },
          {
            id: '6a02.nonverbal_communication',
            text_de: 'Beeinträchtigung der nonverbalen Kommunikation und ihrer Integration mit der Sprache (z. B. Blickkontakt, Mimik, Gestik, Körperhaltung)',
            citation: [{ classification: 'icd11', code: '6A02', ref: 'nonverbal' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'speech_language' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('speech_language', /nonverbal|blickkontakt|mimik|gestik|pragmati|kommunikation/i),
          },
          {
            id: '6a02.relationships',
            text_de: 'Schwierigkeiten, Beziehungen zu entwickeln, aufrechtzuerhalten und zu verstehen sowie das Verhalten flexibel an unterschiedliche soziale Kontexte anzupassen',
            citation: [{ classification: 'icd11', code: '6A02', ref: 'relationships' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: '6a02.restricted_repetitive',
        label_de: 'Domäne 2: eingeschränkte, repetitive und unflexible Muster (mindestens 2)',
        logic: 'at_least_n_of',
        threshold: 2,
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a02.stereotypies',
            text_de: 'Stereotype oder repetitive motorische Bewegungen, Sprachmuster (z. B. Echolalie) oder Objektgebrauch',
            citation: [{ classification: 'icd11', code: '6A02', ref: 'stereotypies' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'appearance_behavior', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('appearance_behavior', /stereotyp|repetitiv|echolalie|man[ie]rismen|sch[au]kel/i),
          },
          {
            id: '6a02.insistence_sameness',
            text_de: 'Übermäßiges Festhalten an Gleichförmigkeit, Routinen oder ritualisierten Handlungsmustern; deutliches Unbehagen bei Veränderungen',
            citation: [{ classification: 'icd11', code: '6A02', ref: 'sameness' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
          {
            id: '6a02.restricted_interests',
            text_de: 'Stark eingeschränkte, ungewöhnlich intensive oder fixierte Interessen',
            citation: [{ classification: 'icd11', code: '6A02', ref: 'interests' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
          {
            id: '6a02.sensory',
            text_de: 'Über- oder Unterempfindlichkeit gegenüber sensorischen Reizen oder ungewöhnliches Interesse an sensorischen Aspekten der Umwelt',
            citation: [{ classification: 'icd11', code: '6A02', ref: 'sensory' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: '6a02.developmental_context',
        label_de: 'Beginn, Beeinträchtigung und Qualifizierer',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a02.developmental_onset',
            text_de: 'Die Merkmale beginnen in der Entwicklungsperiode, können jedoch erst später voll erkennbar werden, wenn die sozialen Anforderungen die Fähigkeiten übersteigen',
            citation: [{ classification: 'icd11', code: '6A02', ref: 'onset' }],
            mappingHints: [{ kind: 'course', ref: 'onset' }],
            allowClinicianAttest: true,
          },
          {
            id: '6a02.functional_impact',
            text_de: 'Die Merkmale verursachen eine bedeutsame Beeinträchtigung in persönlichen, familiären, sozialen, schulischen, beruflichen oder anderen wichtigen Funktionsbereichen',
            citation: [{ classification: 'icd11', code: '6A02', ref: 'impairment' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|einschr[äa]nk|sozial|schul/i),
          },
          {
            id: '6a02.separate_qualifiers',
            text_de: 'Sprach- und intellektuelles Funktionsniveau sind keine diagnostische Voraussetzung, sondern werden als gesonderte Qualifizierer dokumentiert (mit/ohne Beeinträchtigung der intellektuellen Entwicklung bzw. der funktionalen Sprache)',
            citation: [{ classification: 'icd11', code: '6A02', ref: 'qualifiers' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: '6a02.exclusions',
        label_de: 'Ausschlüsse / Abgrenzung',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6a02.exclude_better_explained',
            text_de: 'Die Auffälligkeiten sind nicht besser durch eine isolierte Intelligenzminderung, eine Sprachentwicklungsstörung oder eine andere psychische Störung erklärbar',
            citation: [{ classification: 'icd11', code: '6A02', ref: 'exclude' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}

export const neurodevelopmentalDisorders: Disorder[] = [
  speechLanguageDisorder,
  scholasticSkillsDisorder,
  motorFunctionDisorder,
  autismSpectrumDisorder,
]
