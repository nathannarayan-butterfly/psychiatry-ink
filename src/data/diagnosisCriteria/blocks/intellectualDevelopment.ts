import type { Disorder, CriterionGroup } from '../schema'
import { domainSignal } from '../predicateHelpers'

/**
 * Butterfly criteria block F7 — Intelligenzminderung / Störungen der
 * intellektuellen Entwicklung (ICD-10 F70–F73), operationalized with ICD-11
 * crosswalks (6A00.x Disorders of intellectual development).
 *
 * LICENSING: every `text_de` is an ORIGINAL German operational paraphrase that
 * encodes clinical FACTS only (the three diagnostic pillars — subaverage
 * intellectual functioning with the conventional IQ band, concurrent adaptive/
 * behavioural deficits, and onset during the developmental period — plus the
 * required exclusions and severity gradation). No ICD/DSM criterion wording is
 * reproduced. Each record cites the standard it was operationalized from via
 * `sourceRef` / `citation`.
 *
 * MAPPING NOTE: the diagnosis rests on standardized psychometric and adaptive-
 * behaviour assessment plus a developmental history — none of which the adult-
 * state ISDM phenomenology domains capture cleanly. The closest domain is
 * `memory_cognition` (global cognitive level) and `functional_impairment`
 * (adaptive deficits); a conservative `operationalRule` is attached only there.
 * IQ bands and developmental onset are authored attestation-only
 * (`allowClinicianAttest: true`, no `operationalRule`, `mappingHints: []`).
 * All records ship as `status: 'draft'`.
 *
 * IMPORTANT: IQ cut-offs are statistical guidance for the clinician; the formal
 * diagnosis weights adaptive functioning equally and is never made on a single
 * test score alone.
 */

interface SeveritySpec {
  id: string
  icd10: string
  icd11: string
  name_de: string
  dsm5tr: string
  /** Original paraphrase of the intellectual-functioning band for this severity. */
  intellectual_de: string
  /** Original paraphrase of the adaptive/behavioural profile for this severity. */
  adaptive_de: string
  /** Severity-typical functional/communicative profile. */
  functioning_de: string
  /** Severity-specific differentials. */
  differentials_de: string[]
  /**
   * ICD-11 domain-based reframing — severity-specific adaptive-behaviour profile
   * in each of the three domains the ICD-11 grade is read from. These describe
   * THIS grade's profile (the grade is set by the domain profile, not IQ alone).
   */
  icd11_conceptual_de: string
  icd11_social_de: string
  icd11_practical_de: string
}

const SEVERITIES: SeveritySpec[] = [
  {
    id: 'intellectual_disability_mild',
    icd10: 'F70',
    icd11: '6A00.0',
    name_de: 'Leichte Intelligenzminderung',
    dsm5tr: '317',
    intellectual_de:
      'Allgemeine intellektuelle Leistungsfähigkeit deutlich unterdurchschnittlich, etwa im Bereich eines IQ von 50–69 (entspricht im Erwachsenenalter näherungsweise einem Entwicklungsalter von 9 bis unter 12 Jahren)',
    adaptive_de:
      'Schulische Lernschwierigkeiten, jedoch häufig erreichbare Selbstständigkeit in Selbstversorgung, praktischen und häuslichen Fertigkeiten; Unterstützung vor allem bei abstrakten und komplexen Anforderungen erforderlich',
    functioning_de:
      'Sprache wird in der Regel für Alltagszwecke ausreichend erworben; viele Betroffene sind im Erwachsenenalter arbeitsfähig und können soziale Beziehungen unterhalten',
    differentials_de: [
      'Umschriebene Lern-/Entwicklungsstörung (Teilleistung statt globalem Rückstand)',
      'Sozioökonomisch/edukativ bedingter Leistungsrückstand',
      'Unerkannte Sinnesstörung (Seh-/Hörminderung)',
      'Autismus-Spektrum-Störung ohne Intelligenzminderung',
    ],
    icd11_conceptual_de:
      'Konzeptueller Bereich: im Kleinkindalter häufig wenig auffällig; im Schulalter Schwierigkeiten beim Erwerb schulischer Fertigkeiten (Lesen, Schreiben, Rechnen) sowie beim abstrakten Denken, Planen und Problemlösen, während konkrete Alltagsaufgaben meist bewältigt werden',
    icd11_social_de:
      'Sozialer Bereich: im Vergleich zu Gleichaltrigen unreife soziale Interaktion mit Schwierigkeiten, soziale Signale und Risiken zuverlässig zu erkennen; Gefühlsregulation und soziales Urteilsvermögen altersbezogen vermindert, dadurch erhöhte Beeinflussbarkeit',
    icd11_practical_de:
      'Praktischer Bereich: altersgerechte Selbstversorgung in der Regel möglich; Unterstützung bei komplexen Alltagsanforderungen (Einkäufe, Umgang mit Geld, Haushaltsführung, organisatorische Aufgaben); eine berufliche Tätigkeit mit überwiegend konkreten Anforderungen ist erreichbar',
  },
  {
    id: 'intellectual_disability_moderate',
    icd10: 'F71',
    icd11: '6A00.1',
    name_de: 'Mittelgradige Intelligenzminderung',
    dsm5tr: '318.0',
    intellectual_de:
      'Allgemeine intellektuelle Leistungsfähigkeit deutlich unterdurchschnittlich, etwa im Bereich eines IQ von 35–49 (entspricht näherungsweise einem Entwicklungsalter von 6 bis unter 9 Jahren)',
    adaptive_de:
      'Deutlich verlangsamte Entwicklung von Sprachverständnis und -gebrauch sowie von Selbstversorgungs- und motorischen Fertigkeiten; dauerhafte Unterstützung in Alltag und Lebensführung erforderlich',
    functioning_de:
      'Begrenzte schulische Fortschritte; im Erwachsenenalter meist einfache, beaufsichtigte Tätigkeiten möglich; soziale Teilhabe in strukturierter Umgebung',
    differentials_de: [
      'Schwere Intelligenzminderung (F72)',
      'Tiefgreifende Entwicklungsstörung mit globalem Rückstand',
      'Erworbene neurokognitive Störung im Kindesalter',
      'Schwere Deprivation mit Entwicklungsrückstand',
    ],
    icd11_conceptual_de:
      'Konzeptueller Bereich: deutlich verlangsamte Entwicklung von Sprache und schulischen Fertigkeiten, die meist auf einem elementaren Niveau verbleiben; anhaltende Unterstützung bei nahezu allen konzeptuellen Anforderungen des Alltags erforderlich',
    icd11_social_de:
      'Sozialer Bereich: deutliche Unterschiede im sozialen und kommunikativen Verhalten gegenüber Gleichaltrigen; Sprache einfacher und konkreter; Beziehungen zu vertrauten Bezugspersonen möglich, soziales Urteilsvermögen und Entscheidungsfindung jedoch deutlich eingeschränkt',
    icd11_practical_de:
      'Praktischer Bereich: Selbstversorgung nach längerem Üben weitgehend erlernbar; einfache, beaufsichtigte Tätigkeiten möglich; dauerhafte Unterstützung und Strukturierung in der Lebensführung erforderlich',
  },
  {
    id: 'intellectual_disability_severe',
    icd10: 'F72',
    icd11: '6A00.2',
    name_de: 'Schwere Intelligenzminderung',
    dsm5tr: '318.1',
    intellectual_de:
      'Allgemeine intellektuelle Leistungsfähigkeit hochgradig unterdurchschnittlich, etwa im Bereich eines IQ von 20–34 (entspricht näherungsweise einem Entwicklungsalter von 3 bis unter 6 Jahren)',
    adaptive_de:
      'Ausgeprägte und durchgängige Defizite in nahezu allen adaptiven Bereichen; nur rudimentärer Spracherwerb; durchgehende Betreuung und Hilfe bei der Selbstversorgung erforderlich',
    functioning_de:
      'Häufig assoziierte motorische Beeinträchtigungen und neurologische Begleiterkrankungen; kontinuierliche Unterstützung im gesamten Alltag',
    differentials_de: [
      'Profunde Intelligenzminderung (F73)',
      'Progrediente neurologische/metabolische Erkrankung',
      'Sensorische oder motorische Mehrfachbehinderung ohne globale Intelligenzminderung',
    ],
    icd11_conceptual_de:
      'Konzeptueller Bereich: sehr begrenztes Verständnis von Schriftsprache sowie von Zahlen-, Zeit- und Geldkonzepten; nur rudimentärer Spracherwerb mit einzelnen Wörtern oder kurzen Äußerungen',
    icd11_social_de:
      'Sozialer Bereich: gesprochene Sprache stark eingeschränkt (Einzelwörter oder einfache Phrasen), die Kommunikation ist auf das unmittelbare Hier und Jetzt bezogen; soziale Beziehungen bestehen vor allem über vertraute Bezugspersonen',
    icd11_practical_de:
      'Praktischer Bereich: Unterstützung bei nahezu allen Tätigkeiten des täglichen Lebens einschließlich Essen, Anziehen und Körperpflege; kontinuierliche Beaufsichtigung und Betreuung erforderlich',
  },
  {
    id: 'intellectual_disability_profound',
    icd10: 'F73',
    icd11: '6A00.3',
    name_de: 'Schwerste (profunde) Intelligenzminderung',
    dsm5tr: '318.2',
    intellectual_de:
      'Allgemeine intellektuelle Leistungsfähigkeit schwerstgradig unterdurchschnittlich, etwa im Bereich eines IQ unter 20 (entspricht näherungsweise einem Entwicklungsalter unter 3 Jahren)',
    adaptive_de:
      'Schwerstgradige Einschränkung von Verständnis und Gebrauch von Sprache, Mobilität, Kontinenz und Selbstversorgung; vollständige und kontinuierliche Pflege und Betreuung erforderlich',
    functioning_de:
      'Sehr begrenzte Fähigkeit, einfache Aufforderungen zu verstehen; häufig schwere assoziierte körperliche und neurologische Beeinträchtigungen sowie eingeschränkte Mobilität',
    differentials_de: [
      'Schwere Intelligenzminderung (F72)',
      'Schwere neurologische Grunderkrankung mit Wachkoma/Minimalresponsivität',
      'Sensorische Mehrfachbehinderung, die das Funktionsniveau verschleiert',
    ],
    icd11_conceptual_de:
      'Konzeptueller Bereich: symbolische und sprachliche Konzepte bleiben weitgehend unzugänglich; das Verständnis beschränkt sich auf einfache, konkrete Aspekte der unmittelbaren Umgebung',
    icd11_social_de:
      'Sozialer Bereich: sehr begrenztes Verständnis sprachlicher oder gestischer Kommunikation; Bedürfnisse werden überwiegend nonverbal geäußert; begleitende Sinnes- und Bewegungsstörungen schränken die soziale Interaktion zusätzlich ein',
    icd11_practical_de:
      'Praktischer Bereich: vollständige Abhängigkeit von anderen in allen Bereichen der körperlichen Versorgung, Gesundheit und Sicherheit; häufig begleitende schwere motorische und sensorische Beeinträchtigungen',
  },
]

/**
 * Build the DISTINCT ICD-11 (6A00.x) criteria tree for one severity grade.
 *
 * GENUINE DIVERGENCE vs the ICD-10 tree: ICD-11 reframes the diagnosis around
 * limitations in BOTH (a) intellectual functioning AND (b) adaptive behaviour
 * across THREE domains — conceptual, social and practical — with the SEVERITY
 * GRADE set by the adaptive-domain profile rather than an IQ band (the ICD-10
 * tree leads with IQ ranges). Functioning is established by standardized norm-
 * referenced testing where available (≈ 2+ SD below the mean) or, when suitable
 * norms are unavailable, by behavioural indicators. Each grade carries its own
 * conceptual/social/practical profile (the `icd11_*_de` fields).
 *
 * ID DISCIPLINE: every group/criterion id is derived from the ICD-11 code
 * (`6A00.0` → `6a00_0`), globally unique and distinct from the ICD-10 `f7x` ids.
 * Most criteria are attestation-only (intellectual disability rests on
 * standardized psychometric / adaptive-behaviour assessment); a conservative
 * `operationalRule` is attached only to the cognitive, social and functional
 * domains the adult-state ISDM phenomenology can speak to.
 */
function buildIcd11Set(spec: SeveritySpec): NonNullable<Disorder['icd11']> {
  const p = spec.icd11.toLowerCase().replace(/\./g, '_') // 6A00.0 → 6a00_0
  return {
    sourceRef: `operationalisiert nach ICD-11 ${spec.icd11}`,
    groups: [
      {
        id: `${p}.functioning`,
        label_de: 'Eingeschränkte intellektuelle Leistungsfähigkeit mit Beginn in der Entwicklungsperiode',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${p}.intellectual_functioning`,
            text_de:
              'Bedeutsame Einschränkung der allgemeinen intellektuellen Leistungsfähigkeit, möglichst belegt durch standardisierte, individuell durchgeführte und normierte Tests etwa zwei oder mehr Standardabweichungen unterhalb des Mittelwerts (bzw. anhand verhaltensbezogener Indikatoren, wenn keine geeigneten Normen vorliegen)',
            citation: [{ classification: 'icd11', code: spec.icd11, ref: 'intellectual-functioning' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'memory_cognition',
              /intelligenzminderung|minderbegab|kognitiv.*reduziert|verminderte?\s+intelligenz|geistige?\s+behinderung|entwicklungsr[üu]ckstand/i,
              /altersgerecht|unauff[äa]llig|durchschnittlich/i,
            ),
          },
          {
            id: `${p}.developmental_onset`,
            text_de:
              'Beginn während der Entwicklungsperiode: die Einschränkungen sind seit der Kindheit vorhanden und stellen keinen erst später erworbenen Leistungsabfall dar',
            citation: [{ classification: 'icd11', code: spec.icd11, ref: 'onset' }],
            mappingHints: [{ kind: 'course', ref: 'onset' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: `${p}.adaptive_domains`,
        label_de: 'Einschränkung des adaptiven Verhaltens in den drei Bereichen (schweregradspezifisches Profil)',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${p}.conceptual_domain`,
            text_de: spec.icd11_conceptual_de,
            citation: [{ classification: 'icd11', code: spec.icd11, ref: 'conceptual' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'memory_cognition',
              /sprach|lesen|schreiben|rechnen|abstrakt|wissen|ged[äa]chtnis|lernen|schulisch|konzept/i,
            ),
          },
          {
            id: `${p}.social_domain`,
            text_de: spec.icd11_social_de,
            citation: [{ classification: 'icd11', code: spec.icd11, ref: 'social' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'personality_interpersonal_style',
              /sozial|kommunikation|beziehung|empathie|urteil|interpersonell|kontakt/i,
            ),
          },
          {
            id: `${p}.practical_domain`,
            text_de: spec.icd11_practical_de,
            citation: [{ classification: 'icd11', code: spec.icd11, ref: 'practical' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'functional_impairment',
              /selbstversorgung|alltag|hilfebedarf|unterst[üu]tzung|pflege|beaufsichtig|adaptiv|alltagsbew[äa]ltig/i,
            ),
          },
        ],
      },
      {
        id: `${p}.assessment`,
        label_de: 'Bestimmung des Schweregrades und diagnostische Feststellung',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${p}.severity_by_adaptive`,
            text_de:
              'Die Zuordnung des Schweregrades richtet sich nach dem Profil des adaptiven Verhaltens in den drei Bereichen (konzeptuell, sozial, praktisch) und nicht allein nach einem einzelnen IQ-Wert',
            citation: [{ classification: 'icd11', code: spec.icd11, ref: 'severity' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
          {
            id: `${p}.standardized_or_behavioural`,
            text_de:
              'Die Feststellung erfolgt – wo verfügbar – mit standardisierten, kulturfair angepassten und normierten Verfahren für intellektuelle und adaptive Funktionen; liegen keine geeigneten Normen vor, stützt sie sich auf sorgfältig erhobene verhaltensbezogene Indikatoren',
            citation: [{ classification: 'icd11', code: spec.icd11, ref: 'assessment' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: `${p}.exclusions`,
        label_de: 'Ausschlüsse / Abgrenzung',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: `${p}.exclude_acquired_decline`,
            text_de:
              'Die Einschränkungen sind nicht durch eine erst nach der Entwicklungsperiode erworbene neurokognitive Störung (z. B. Demenz, erworbene Hirnschädigung) zu erklären',
            citation: [{ classification: 'icd11', code: spec.icd11, ref: 'exclude-acquired' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition' }],
            allowClinicianAttest: true,
          },
          {
            id: `${p}.exclude_sensory_deprivation`,
            text_de:
              'Das Funktionsniveau ist nicht allein durch eine unkorrigierte Sinnesstörung, eine andere psychische Störung oder durch soziale Deprivation bzw. fehlende Beschulung erklärbar',
            citation: [{ classification: 'icd11', code: spec.icd11, ref: 'exclude-sensory' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  }
}

/** Build the shared three-pillar criteria structure for one severity grade. */
function buildIntellectualDisorder(spec: SeveritySpec): Disorder {
  const prefix = spec.icd10.toLowerCase()
  const groups: CriterionGroup[] = [
    {
      id: `${prefix}.core`,
      label_de: 'Kern: drei diagnostische Säulen der Intelligenzminderung',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: `${prefix}.intellectual_functioning`,
          text_de: spec.intellectual_de,
          citation: [{ classification: 'icd10', code: spec.icd10 }, { classification: 'icd11', code: spec.icd11 }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'memory_cognition',
            /intelligenzminderung|minderbegab|kognitiv.*reduziert|verminderte?\s+intelligenz|geistige?\s+behinderung|entwicklungsr[üu]ckstand/i,
            /altersgerecht|unauff[äa]llig|durchschnittlich/i,
          ),
        },
        {
          id: `${prefix}.adaptive_functioning`,
          text_de: spec.adaptive_de,
          citation: [{ classification: 'icd10', code: spec.icd10 }, { classification: 'icd11', code: spec.icd11 }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('functional_impairment', /adaptiv|selbstversorgung|alltagsbew[äa]ltig|beeintr[äa]chtig|hilfebedarf|unterst[üu]tzung/i),
        },
        {
          id: `${prefix}.functional_profile`,
          text_de: spec.functioning_de,
          citation: [{ classification: 'icd11', code: spec.icd11 }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: `${prefix}.developmental_onset`,
          text_de:
            'Beginn der Beeinträchtigungen während der Entwicklungsperiode (vor Abschluss der Hirnreifung), nicht als später erworbener Leistungsabfall im Sinne einer demenziellen Erkrankung',
          citation: [{ classification: 'icd10', code: spec.icd10 }, { classification: 'icd11', code: spec.icd11 }],
          mappingHints: [{ kind: 'course', ref: 'onset' }],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: `${prefix}.assessment`,
      label_de: 'Diagnostische Bedingungen der Feststellung',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: `${prefix}.standardized_assessment`,
          text_de:
            'Feststellung der intellektuellen und adaptiven Leistungsfähigkeit möglichst durch standardisierte, normierte und kulturfair angepasste Verfahren; die Schweregradzuordnung stützt sich nicht allein auf einen einzelnen Testwert',
          citation: [{ classification: 'icd11', code: spec.icd11 }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: `${prefix}.exclusions`,
      label_de: 'Ausschlüsse / Abgrenzung',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: `${prefix}.exclude_acquired_decline`,
          text_de:
            'Das verminderte Funktionsniveau ist nicht durch einen erst nach der Entwicklungsperiode erworbenen kognitiven Abbau (Demenz, Schädel-Hirn-Trauma im Erwachsenenalter) erklärt',
          citation: [{ classification: 'icd10', code: spec.icd10 }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition' }],
          allowClinicianAttest: true,
        },
        {
          id: `${prefix}.exclude_sensory_deprivation`,
          text_de:
            'Der Leistungsrückstand ist nicht ausreichend durch eine unkorrigierte Sinnesstörung, eine schwere psychische Störung oder durch fehlende Beschulung/soziale Deprivation allein erklärbar',
          citation: [{ classification: 'icd10', code: spec.icd10 }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
  ]

  return {
    id: spec.id,
    classification: 'icd10',
    code: spec.icd10,
    name_de: spec.name_de,
    crosswalkKey: spec.icd10,
    sourceRef: `operationalisiert nach ICD-10 ${spec.icd10} / ICD-11 ${spec.icd11}`,
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code: spec.icd10, label_de: spec.name_de },
      icd11: { code: spec.icd11, label_de: `Störung der intellektuellen Entwicklung (${spec.name_de})` },
      dsm5tr: { code: spec.dsm5tr, label_de: `Intellectual Developmental Disorder — ${spec.name_de} (Crosswalk)` },
    },
    differentials_de: spec.differentials_de,
    groups,
    icd11: buildIcd11Set(spec),
  }
}

const mildIntellectualDisability = buildIntellectualDisorder(SEVERITIES[0])
const moderateIntellectualDisability = buildIntellectualDisorder(SEVERITIES[1])
const severeIntellectualDisability = buildIntellectualDisorder(SEVERITIES[2])
const profoundIntellectualDisability = buildIntellectualDisorder(SEVERITIES[3])

export const intellectualDevelopmentDisorders: Disorder[] = [
  mildIntellectualDisability,
  moderateIntellectualDisability,
  severeIntellectualDisability,
  profoundIntellectualDisability,
]
