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
  },
]

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
  }
}

const mildIntellectualDisability = buildIntellectualDisorder(SEVERITIES[0])
const moderateIntellectualDisability = buildIntellectualDisorder(SEVERITIES[1])
const severeIntellectualDisability = buildIntellectualDisorder(SEVERITIES[2])
const profoundIntellectualDisability = buildIntellectualDisorder(SEVERITIES[3])

export const f7IntellectualDisorders: Disorder[] = [
  mildIntellectualDisability,
  moderateIntellectualDisability,
  severeIntellectualDisability,
  profoundIntellectualDisability,
]
