/**
 * Butterfly criteria — block F1: psychische und Verhaltensstörungen durch
 * psychotrope Substanzen (ICD-10 F10–F19).
 *
 * MODELLING APPROACH
 * ------------------
 * The ICD organizes this block as a 2-D matrix: substance class (F1x) ×
 * clinical syndrome (.0 intoxication, .1 harmful use, .2 dependence,
 * .3 withdrawal, .4 withdrawal with delirium, .5 psychotic disorder). Rather
 * than hand-write every cell, we describe each substance class once
 * ({@link SubstanceSpec}) and generate the syndrome disorders with factories
 * parametrized by substance — mirroring the structure of the existing
 * `alcoholDependence` template. We deliberately generate only the cells a
 * psychiatrist actually diagnoses for each class (judgment over completeness).
 *
 * NOTE: Alcohol dependence (F10.2) already exists as its own template and is
 * intentionally NOT reproduced here; this block adds the remaining alcohol
 * syndromes (F10.0/.3/.4/.5) plus the other substance classes.
 *
 * LICENSING: every `text_de` is an ORIGINAL German operational paraphrase
 * encoding clinical FACTS only — never ICD/DSM criterion wording. Criteria are
 * anchored to ICD-10 via structured `citation`; ICD-11 crosswalks live in
 * `codingSystems.icd11`. DSM is a label-only crosswalk.
 *
 * AUTO-RULES: an `operationalRule` is attached ONLY where the mapping to the
 * structured phenomenology is clean (dependence features and recent use →
 * `substance_related_features`; delirium clouding → `consciousness_orientation`;
 * substance-induced psychosis → `perception_hallucinations` /
 * `delusions_overvalued_ideas`). Aetiology/temporal-relation and most discrete
 * intoxication/withdrawal signs are left attestation-only. All records ship as
 * `status: 'draft'`.
 */

import type { Criterion, Disorder, Icd11CriteriaSet, OperationalRule } from '../schema'
import { UNKNOWN, met, notMet } from '../schema'
import { domainSignal } from '../predicateHelpers'
import type { IsdmPhenomenologyDomain } from '../../../types/isdm'

const SUBSTANCE_DOMAIN: IsdmPhenomenologyDomain = 'substance_related_features'

/** Lowercased, dot-free id prefix derived from an ICD-10 code (F11.2 → "f11_2"). */
function idp(code: string): string {
  return code.toLowerCase().replace(/\./g, '_')
}

/** Globally-unique criterion prefix; disambiguates specs that share an ICD-10 code. */
function criteriaPrefix(spec: SubstanceSpec, code: string): string {
  if (spec.criteriaIdPrefix) {
    const icd = idp(code)
    const syndrome = icd.includes('_') ? icd.split('_').slice(1).join('_') : icd
    return `${spec.criteriaIdPrefix}_${syndrome}`
  }
  return idp(code)
}

/** A discrete clinical sign for an intoxication/withdrawal/psychotic picture. */
interface SyndromeFeature {
  key: string
  text_de: string
  /** Optional phenomenology domain for deep-linking (no auto-rule attached). */
  hint?: IsdmPhenomenologyDomain
}

export interface SubstanceSpec {
  /** Stable snake_case key (e.g. "opioids"). */
  key: string
  /** ICD-10 block stem (e.g. "F11"). */
  icd10: string
  /** ICD-11 block stem (e.g. "6C43"). */
  icd11: string
  /**
   * Optional criterion-id prefix when multiple specs share the same ICD-10 syndrome
   * code (e.g. F15.1 for both stimulants and caffeine). Defaults to idp(code).
   */
  criteriaIdPrefix?: string
  /** Display name (German), used in accusative/nominative as "… durch {name_de}". */
  name_de: string
  /** Dative form for "von {dativeName}" / "Konsum von …" contexts. */
  dativeName: string
  /** English DSM label stem for the label-only crosswalk (e.g. "Opioid"). */
  dsmLabel: string
  /** Regex that recognises this substance in `substance_related_features`. */
  useMatch: RegExp
  /** Characteristic acute-intoxication signs (attestation-only checklist). */
  intox: SyndromeFeature[]
  /** Characteristic withdrawal signs (attestation-only checklist). */
  withdrawal: SyndromeFeature[]
}

/**
 * Dependence-feature predicate (generic version of the alcohol template): a
 * present substance finding matching the feature → met; an explicit absent
 * finding → not_met; documented controlled/occasional use without any
 * dependence feature → not_met; otherwise unknown (clinician checkbox).
 */
function dependenceFeature(match: RegExp): OperationalRule {
  return (ctx) => {
    const present = ctx.present(SUBSTANCE_DOMAIN, match)
    if (present) return met(present.label)
    const absent = ctx.absent(SUBSTANCE_DOMAIN, match)
    if (absent) return notMet(absent.label)
    if (ctx.substanceControlledUse) {
      return notMet('Dokumentierter kontrollierter/gelegentlicher Konsum ohne Abhängigkeitsmerkmal')
    }
    return UNKNOWN
  }
}

const ICD11_SUFFIX = {
  intoxication: '.3',
  harmfulUse: '.1',
  dependence: '.2',
  withdrawal: '.4',
  withdrawalDelirium: '.5',
  psychotic: '.6',
} as const

/** Build the standard substance-domain mapping hint for a criterion. */
function substanceHint(domain: IsdmPhenomenologyDomain = SUBSTANCE_DOMAIN) {
  return [{ kind: 'isdm_domain' as const, ref: domain, deepLinkPageId: 'anamnese' }]
}

/** Render a feature list into attestation-only criteria under a disorder code. */
function featureCriteria(spec: SubstanceSpec, code: string, features: SyndromeFeature[]): Criterion[] {
  const prefix = criteriaPrefix(spec, code)
  return features.map((feature) => ({
    id: `${prefix}.${feature.key}`,
    text_de: feature.text_de,
    citation: [{ classification: 'icd10' as const, code }],
    mappingHints: substanceHint(feature.hint ?? SUBSTANCE_DOMAIN),
    allowClinicianAttest: true,
  }))
}

// ---------------------------------------------------------------------------
// ICD-11 criteria sets (DISTINCT structure from ICD-10)
// ---------------------------------------------------------------------------

/**
 * ICD-11 dependence (6C4x.2) — the headline structural divergence from ICD-10.
 * ICD-11 requires ≥ 2 of THREE central features (vs ICD-10's ≥ 3 of six) present
 * together over ≥ 12 months, or — with continuous (daily/near-daily) use — over
 * ≥ 1 month. The three features fold the ICD-10 six into broader constructs:
 *   1. impaired control (incl. craving),
 *   2. increasing salience/priority over other activities, persistence despite harm,
 *   3. physiological features (tolerance, withdrawal, use to relieve/avoid withdrawal).
 */
export function icd11DependenceSet(spec: SubstanceSpec): Icd11CriteriaSet {
  const code = `${spec.icd11}${ICD11_SUFFIX.dependence}`
  const prefix = idp(code)
  return {
    sourceRef: `operationalisiert nach ICD-11 ${code}`,
    groups: [
      {
        id: `${prefix}.dependence`,
        label_de:
          'Abhängigkeitsmerkmale nach ICD-11 (mindestens 2 von 3, über ≥ 12 Monate – bei kontinuierlichem Konsum ≥ 1 Monat)',
        logic: 'at_least_n_of',
        threshold: 2,
        groupType: 'inclusion',
        timeWindow: { withinDays: 365 },
        criteria: [
          {
            id: `${prefix}.impaired_control`,
            text_de: `Beeinträchtigte Kontrolle über den Konsum von ${spec.dativeName} (Beginn, Menge, Umstände oder Beendigung), häufig begleitet von starkem Verlangen (Craving)`,
            citation: [{ classification: 'icd11', code, ref: '1' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: dependenceFeature(
              /kontrollverlust|verminderte\s+kontrolle|kann.*nicht.*aufh[öo]r|exzessiv|verlangen|craving|suchtdruck|zwang.*konsum/i,
            ),
          },
          {
            id: `${prefix}.salience`,
            text_de:
              'Zunehmender Stellenwert des Konsums gegenüber anderen Interessen und Verpflichtungen, mit fortgesetztem Konsum trotz eingetretener schädlicher Folgen',
            citation: [{ classification: 'icd11', code, ref: '2' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: dependenceFeature(
              /vernachl[äa]ssig|interessenverlust.*konsum|aufgabe.*aktivit|trotz.*sch[äa]d|fortgesetzt.*trotz|weiter.*trotz.*folgen|stellenwert|priorit/i,
            ),
          },
          {
            id: `${prefix}.physiological`,
            text_de:
              'Physiologische Merkmale: Toleranzentwicklung, Entzugssymptome bei Reduktion oder Beendigung des Konsums oder wiederholter Konsum zur Vermeidung bzw. Linderung von Entzugssymptomen',
            citation: [{ classification: 'icd11', code, ref: '3' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: dependenceFeature(
              /toleranz|tolerance|dosissteiger|mehr.*menge|entzug|withdrawal|entzugssymptom/i,
            ),
          },
        ],
      },
    ],
  }
}

/**
 * ICD-11 harmful pattern of use (6C4x.1). ICD-11 restructures ICD-10 "harmful
 * use" around a sustained PATTERN of use (continuous or episodic, typically
 * ≥ 12 months — or ≥ 1 month if continuous) and EXPANDS the harm dimension to
 * include harm to the health of OTHERS resulting from the person's intoxicated
 * behaviour (e.g. injuries to third parties) — a dimension ICD-10 F1x.1 lacks.
 */
export function icd11HarmfulPatternSet(spec: SubstanceSpec): Icd11CriteriaSet {
  const code = `${spec.icd11}${ICD11_SUFFIX.harmfulUse}`
  const dependenceCode = `${spec.icd11}${ICD11_SUFFIX.dependence}`
  const prefix = idp(code)
  return {
    sourceRef: `operationalisiert nach ICD-11 ${code}`,
    groups: [
      {
        id: `${prefix}.pattern`,
        label_de:
          'Anhaltendes Konsummuster (episodisch oder kontinuierlich, in der Regel über ≥ 12 Monate – bei kontinuierlichem Konsum ≥ 1 Monat)',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.use_pattern`,
            text_de: `Wiederholtes oder anhaltendes Konsummuster von ${spec.dativeName} ist dokumentiert`,
            citation: [{ classification: 'icd11', code }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: domainSignal(SUBSTANCE_DOMAIN, spec.useMatch),
          },
        ],
      },
      {
        id: `${prefix}.harm`,
        label_de: 'Nachweisbarer Schaden (mindestens einer der folgenden Bereiche)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.harm_self`,
            text_de:
              'Klinisch bedeutsame Schädigung der körperlichen oder psychischen Gesundheit der Person als Folge des Konsums (einschließlich konsum- oder intoxikationsbedingten Verhaltens)',
            citation: [{ classification: 'icd11', code, ref: '1' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.harm_others`,
            text_de:
              'Schädigung der Gesundheit anderer durch das konsum- oder intoxikationsbedingte Verhalten der Person (z. B. Verletzungen Dritter, Schädigung im Straßenverkehr) — ICD-11-spezifische Erweiterung',
            citation: [{ classification: 'icd11', code, ref: '2' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: `${prefix}.exclusions`,
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: `${prefix}.exclude_dependence`,
            text_de: `Die Kriterien einer Abhängigkeit (${dependenceCode}) sind nicht erfüllt`,
            citation: [{ classification: 'icd11', code }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  }
}

function icd11FeatureCriteria(
  spec: SubstanceSpec,
  code: string,
  features: SyndromeFeature[],
  prefix: string,
): Criterion[] {
  if (features.length === 0) {
    return [
      {
        id: `${prefix}.clinical_signs`,
        text_de: `Klinisch erkennbare akute Wirkung von ${spec.dativeName} im zeitlichen Zusammenhang mit dem Konsum`,
        citation: [{ classification: 'icd11', code }],
        mappingHints: substanceHint(),
        allowClinicianAttest: true,
      },
    ]
  }
  return features.map((feature) => ({
    id: `${prefix}.${feature.key}`,
    text_de: feature.text_de,
    citation: [{ classification: 'icd11', code }],
    mappingHints: substanceHint(feature.hint ?? SUBSTANCE_DOMAIN),
    allowClinicianAttest: true,
  }))
}

/**
 * ICD-11 intoxication (6C4x.3) — distinct operational tree with ICD-11 citations.
 * Mirrors the ICD-10 syndrome structure (recent use + temporal link + characteristic
 * signs + exclusions) while keeping substance-specific sign checklists.
 */
export function icd11IntoxicationSet(spec: SubstanceSpec): Icd11CriteriaSet {
  const code = `${spec.icd11}${ICD11_SUFFIX.intoxication}`
  const prefix = idp(code)
  return {
    sourceRef: `operationalisiert nach ICD-11 ${code}`,
    groups: [
      {
        id: `${prefix}.use`,
        label_de: 'Akuter Konsum und zeitlicher Zusammenhang',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.recent_use`,
            text_de: `Kurz zurückliegender Konsum von ${spec.dativeName} in einer Dosis, die die akute Symptomatik erklären kann`,
            citation: [{ classification: 'icd11', code, ref: 'A' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: domainSignal(SUBSTANCE_DOMAIN, spec.useMatch),
          },
          {
            id: `${prefix}.temporal_relation`,
            text_de: 'Die Symptome treten während oder unmittelbar nach der akuten Substanzwirkung auf und sind vorübergehend',
            citation: [{ classification: 'icd11', code, ref: 'B' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: `${prefix}.signs`,
        label_de: 'Substanztypische Intoxikationszeichen (mindestens 1)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: icd11FeatureCriteria(spec, code, spec.intox, prefix),
      },
      {
        id: `${prefix}.exclusions`,
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: `${prefix}.exclude_other_cause`,
            text_de: 'Die Symptome sind nicht besser durch eine somatische Erkrankung, ein Delir oder eine primäre psychotische Störung erklärbar',
            citation: [{ classification: 'icd11', code }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  }
}

/** ICD-11 withdrawal (6C4x.4) — cessation/reduction context + characteristic withdrawal signs. */
export function icd11WithdrawalSet(spec: SubstanceSpec): Icd11CriteriaSet {
  const code = `${spec.icd11}${ICD11_SUFFIX.withdrawal}`
  const prefix = idp(code)
  return {
    sourceRef: `operationalisiert nach ICD-11 ${code}`,
    groups: [
      {
        id: `${prefix}.context`,
        label_de: 'Entzugskontext',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.cessation`,
            text_de: `Absetzen oder deutliche Reduktion von ${spec.dativeName} nach wiederholtem, meist anhaltendem und/oder hochdosiertem Konsum`,
            citation: [{ classification: 'icd11', code, ref: 'A' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.withdrawal_syndrome`,
            text_de: 'Es liegt ein substanztypisches Entzugssyndrom vor',
            citation: [{ classification: 'icd11', code, ref: 'B' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: domainSignal(SUBSTANCE_DOMAIN, /entzug|withdrawal|entzugssymptom|absetz/i),
          },
        ],
      },
      {
        id: `${prefix}.symptoms`,
        label_de: 'Entzugssymptome (mindestens 1)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: icd11FeatureCriteria(spec, code, spec.withdrawal, prefix),
      },
      {
        id: `${prefix}.exclusions`,
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: `${prefix}.exclude_other_cause`,
            text_de: 'Die Symptome sind nicht besser durch eine andere somatische oder psychische Störung erklärbar',
            citation: [{ classification: 'icd11', code }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  }
}

/** ICD-11 substance-induced delirium (6C4x.5) — withdrawal/delirium overlap with awareness/attention disturbance. */
export function icd11WithdrawalDeliriumSet(spec: SubstanceSpec): Icd11CriteriaSet {
  const code = `${spec.icd11}${ICD11_SUFFIX.withdrawalDelirium}`
  const prefix = idp(code)
  return {
    sourceRef: `operationalisiert nach ICD-11 ${code}`,
    groups: [
      {
        id: `${prefix}.context`,
        label_de: 'Substanzbezogener Entzug mit Bewusstseinsstörung',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.withdrawal_context`,
            text_de: `Absetzen oder Reduktion von ${spec.dativeName} bei vorbestehendem schädlichem Konsum oder Abhängigkeitssyndrom`,
            citation: [{ classification: 'icd11', code, ref: 'A' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.awareness_attention`,
            text_de: 'Störung von Bewusstsein und/oder Aufmerksamkeit mit reduzierter Orientierung gegenüber der Umwelt (deliranter Zustand)',
            citation: [{ classification: 'icd11', code, ref: 'B' }],
            mappingHints: substanceHint('consciousness_orientation'),
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'consciousness_orientation',
              /bewusstsein.*(getr[üu]bt|tr[üu]b|st[öo]r)|somnolen|vigilanzminder|delir|benommen/i,
            ),
          },
        ],
      },
      {
        id: `${prefix}.features`,
        label_de: 'Delirante Begleitsymptome (mindestens 1)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.disorientation`,
            text_de: 'Desorientierung und globale Störung kognitiver Funktionen',
            citation: [{ classification: 'icd11', code }],
            mappingHints: substanceHint('consciousness_orientation'),
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.hallucinations`,
            text_de: 'Lebhafte (häufig optische oder szenische) Halluzinationen oder Illusionen',
            citation: [{ classification: 'icd11', code }],
            mappingHints: substanceHint('perception_hallucinations'),
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.psychomotor`,
            text_de: 'Ausgeprägte psychomotorische Unruhe oder Agitation',
            citation: [{ classification: 'icd11', code }],
            mappingHints: substanceHint('drive_psychomotor_activity'),
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.autonomic`,
            text_de: 'Ausgeprägte vegetative Übererregung (z. B. Tachykardie, Schwitzen, Tremor); Krampfanfälle möglich',
            citation: [{ classification: 'icd11', code }],
            mappingHints: substanceHint('somatic_preoccupation'),
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: `${prefix}.exclusions`,
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: `${prefix}.exclude_other_cause`,
            text_de: 'Das Delir ist nicht besser durch eine eigenständige somatische Erkrankung erklärbar',
            citation: [{ classification: 'icd11', code }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  }
}

/** ICD-11 substance-induced psychotic disorder (6C4x.6). */
export function icd11PsychoticSet(spec: SubstanceSpec): Icd11CriteriaSet {
  const code = `${spec.icd11}${ICD11_SUFFIX.psychotic}`
  const prefix = idp(code)
  return {
    sourceRef: `operationalisiert nach ICD-11 ${code}`,
    groups: [
      {
        id: `${prefix}.symptoms`,
        label_de: 'Psychotische Symptome (mindestens 1)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.hallucinations`,
            text_de: 'Halluzinationen (häufig akustisch oder optisch), die nicht ausschließlich Ausdruck einer einfachen Intoxikation sind',
            citation: [{ classification: 'icd11', code, ref: '1' }],
            mappingHints: substanceHint('perception_hallucinations'),
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'perception_hallucinations',
              /halluzin|stimmen|optisch|akustisch|trugwahrnehmung/i,
              /keine\s+halluzinationen/i,
            ),
          },
          {
            id: `${prefix}.delusions`,
            text_de: 'Wahngedanken, häufig Verfolgungs- oder Beziehungswahn',
            citation: [{ classification: 'icd11', code, ref: '2' }],
            mappingHints: substanceHint('delusions_overvalued_ideas'),
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'delusions_overvalued_ideas',
              /wahn|verfolgung|beziehungs|paranoid|gr[öo][ßs]en/i,
              /kein\s+wahn/i,
            ),
          },
        ],
      },
      {
        id: `${prefix}.context`,
        label_de: 'Zeitlicher Zusammenhang mit dem Konsum',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.temporal_relation`,
            text_de: `Beginn der psychotischen Symptome während oder kurz (in der Regel innerhalb von zwei Wochen) nach dem Konsum von ${spec.dativeName}`,
            citation: [{ classification: 'icd11', code, ref: 'A' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: domainSignal(SUBSTANCE_DOMAIN, spec.useMatch),
          },
          {
            id: `${prefix}.partial_remission`,
            text_de: 'Die Symptome bilden sich typischerweise innerhalb eines begrenzten Zeitraums (Größenordnung Wochen bis wenige Monate) zumindest teilweise zurück',
            citation: [{ classification: 'icd11', code }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: `${prefix}.exclusions`,
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: `${prefix}.exclude_primary_psychosis`,
            text_de: 'Die Symptomatik ist nicht besser durch eine primäre psychotische Störung erklärbar und tritt nicht ausschließlich im Rahmen von Intoxikation oder Entzugsdelir auf',
            citation: [{ classification: 'icd11', code }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Syndrome factories
// ---------------------------------------------------------------------------

export function dependenceSyndrome(spec: SubstanceSpec): Disorder {
  const code = `${spec.icd10}.2`
  const prefix = criteriaPrefix(spec, code)
  return {
    id: `${spec.key}_dependence`,
    classification: 'icd10',
    code,
    name_de: `Abhängigkeitssyndrom durch ${spec.name_de}`,
    crosswalkKey: code,
    sourceRef: `operationalisiert nach ICD-10 ${code} / ICD-11 ${spec.icd11}${ICD11_SUFFIX.dependence}`,
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code, label_de: `Psychische und Verhaltensstörung durch ${spec.name_de}: Abhängigkeitssyndrom` },
      icd11: { code: `${spec.icd11}${ICD11_SUFFIX.dependence}`, label_de: `Abhängigkeit durch ${spec.name_de}` },
      dsm5tr: { code: 'crosswalk', label_de: `${spec.dsmLabel} Use Disorder, moderate–severe (Crosswalk)` },
    },
    differentials_de: [
      `Schädlicher Gebrauch von ${spec.dativeName} (${spec.icd10}.1) ohne Abhängigkeit`,
      `Akute Intoxikation (${spec.icd10}.0)`,
      'Substanzinduzierte affektive oder psychotische Störung',
    ],
    groups: [
      {
        id: `${prefix}.dependence`,
        label_de: 'Abhängigkeitsmerkmale (mindestens 3 innerhalb von 12 Monaten)',
        logic: 'at_least_n_of',
        threshold: 3,
        groupType: 'inclusion',
        timeWindow: { withinDays: 365 },
        criteria: [
          {
            id: `${prefix}.craving`,
            text_de: `Starkes Verlangen oder eine Art Zwang, ${spec.name_de} zu konsumieren (Craving)`,
            citation: [{ classification: 'icd10', code, ref: 'a' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: dependenceFeature(/verlangen|craving|suchtdruck|zwang.*konsum/i),
          },
          {
            id: `${prefix}.impaired_control`,
            text_de: 'Verminderte Kontrolle über Beginn, Beendigung und Menge des Konsums',
            citation: [{ classification: 'icd10', code, ref: 'b' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: dependenceFeature(/kontrollverlust|verminderte\s+kontrolle|kann.*nicht.*aufh[öo]r|exzessiv/i),
          },
          {
            id: `${prefix}.withdrawal`,
            text_de: 'Körperliches Entzugssyndrom bei Reduktion oder Beendigung des Konsums oder Konsum zur Linderung von Entzugssymptomen',
            citation: [{ classification: 'icd10', code, ref: 'c' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: dependenceFeature(/entzug|withdrawal|entzugssymptom/i),
          },
          {
            id: `${prefix}.tolerance`,
            text_de: 'Toleranzentwicklung mit erforderlicher Dosissteigerung für die ursprüngliche Wirkung',
            citation: [{ classification: 'icd10', code, ref: 'd' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: dependenceFeature(/toleranz|tolerance|dosissteiger|mehr.*menge/i),
          },
          {
            id: `${prefix}.neglect`,
            text_de: 'Zunehmende Vernachlässigung anderer Interessen und erhöhter Zeitaufwand für Beschaffung, Konsum und Erholung',
            citation: [{ classification: 'icd10', code, ref: 'e' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: dependenceFeature(/vernachl[äa]ssig|interessenverlust.*konsum|aufgabe.*aktivit/i),
          },
          {
            id: `${prefix}.persistence_harm`,
            text_de: 'Anhaltender Konsum trotz nachweislich schädlicher körperlicher, psychischer oder sozialer Folgen',
            citation: [{ classification: 'icd10', code, ref: 'f' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: dependenceFeature(/trotz.*sch[äa]d|fortgesetzt.*trotz|weiter.*trotz.*folgen/i),
          },
        ],
      },
    ],
    icd11: icd11DependenceSet(spec),
  }
}

export function harmfulUse(spec: SubstanceSpec): Disorder {
  const code = `${spec.icd10}.1`
  const prefix = criteriaPrefix(spec, code)
  return {
    id: `${spec.key}_harmful_use`,
    classification: 'icd10',
    code,
    name_de: `Schädlicher Gebrauch von ${spec.dativeName}`,
    crosswalkKey: code,
    sourceRef: `operationalisiert nach ICD-10 ${code} / ICD-11 ${spec.icd11}${ICD11_SUFFIX.harmfulUse}`,
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code, label_de: `Psychische und Verhaltensstörung durch ${spec.name_de}: Schädlicher Gebrauch` },
      icd11: { code: `${spec.icd11}${ICD11_SUFFIX.harmfulUse}`, label_de: `Schädliches Konsummuster von ${spec.dativeName}` },
      dsm5tr: { code: 'crosswalk', label_de: `${spec.dsmLabel} Use Disorder, mild (Crosswalk)` },
    },
    differentials_de: [
      `Abhängigkeitssyndrom (${spec.icd10}.2)`,
      `Akute Intoxikation (${spec.icd10}.0)`,
      'Risikoarmer Gebrauch ohne fassbaren Schaden',
    ],
    groups: [
      {
        id: `${prefix}.harm`,
        label_de: 'Konsum mit gesundheitlichem Schaden',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.actual_use`,
            text_de: `Tatsächlicher Konsum von ${spec.dativeName} ist dokumentiert`,
            citation: [{ classification: 'icd10', code }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: domainSignal(SUBSTANCE_DOMAIN, spec.useMatch),
          },
          {
            id: `${prefix}.health_damage`,
            text_de: 'Nachweisbare Schädigung der körperlichen oder psychischen Gesundheit als Folge des Konsums',
            citation: [{ classification: 'icd10', code, ref: 'A' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: `${prefix}.exclusions`,
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: `${prefix}.exclude_dependence`,
            text_de: `Die Kriterien eines Abhängigkeitssyndroms (${spec.icd10}.2) sind nicht erfüllt`,
            citation: [{ classification: 'icd10', code }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
    ],
    icd11: icd11HarmfulPatternSet(spec),
  }
}

// ICD-11 6C4x.3–6 — native trees attached via icd11IntoxicationSet / icd11WithdrawalSet /
// icd11WithdrawalDeliriumSet / icd11PsychoticSet (Phase B factories).

function acuteIntoxication(spec: SubstanceSpec): Disorder {
  const code = `${spec.icd10}.0`
  const prefix = criteriaPrefix(spec, code)
  return {
    id: `${spec.key}_acute_intoxication`,
    classification: 'icd10',
    code,
    name_de: `Akute Intoxikation durch ${spec.name_de}`,
    crosswalkKey: code,
    sourceRef: `operationalisiert nach ICD-10 ${code} / ICD-11 ${spec.icd11}${ICD11_SUFFIX.intoxication}`,
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code, label_de: `Psychische und Verhaltensstörung durch ${spec.name_de}: Akute Intoxikation` },
      icd11: { code: `${spec.icd11}${ICD11_SUFFIX.intoxication}`, label_de: `Intoxikation durch ${spec.name_de}` },
      dsm5tr: { code: 'crosswalk', label_de: `${spec.dsmLabel} Intoxication (Crosswalk)` },
    },
    differentials_de: [
      `Entzugssyndrom (${spec.icd10}.3)`,
      'Delir oder andere organische Ursache',
      'Akute psychotische Störung',
      'Intoxikation durch eine andere Substanz oder Mischintoxikation',
    ],
    groups: [
      {
        id: `${prefix}.use`,
        label_de: 'Nachweis des Konsums',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.recent_use`,
            text_de: `Kurz zurückliegender Konsum von ${spec.dativeName} in ausreichend hoher Dosis`,
            citation: [{ classification: 'icd10', code, ref: 'A' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: domainSignal(SUBSTANCE_DOMAIN, spec.useMatch),
          },
          {
            id: `${prefix}.causal_link`,
            text_de: 'Die Symptome stehen in unmittelbarem zeitlichem und ursächlichem Zusammenhang mit der akuten Substanzwirkung und sind vorübergehend',
            citation: [{ classification: 'icd10', code, ref: 'B' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: `${prefix}.signs`,
        label_de: 'Substanztypische Intoxikationszeichen (mindestens 1)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: featureCriteria(spec, code, spec.intox),
      },
      {
        id: `${prefix}.exclusions`,
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: `${prefix}.exclude_other_cause`,
            text_de: 'Die Symptome sind nicht besser durch eine somatische Erkrankung, ein Delir oder eine andere psychische Störung erklärbar',
            citation: [{ classification: 'icd10', code }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
    ],
    icd11: icd11IntoxicationSet(spec),
  }
}

function withdrawalState(spec: SubstanceSpec): Disorder {
  const code = `${spec.icd10}.3`
  const prefix = criteriaPrefix(spec, code)
  return {
    id: `${spec.key}_withdrawal`,
    classification: 'icd10',
    code,
    name_de: `Entzugssyndrom durch ${spec.name_de}`,
    crosswalkKey: code,
    sourceRef: `operationalisiert nach ICD-10 ${code} / ICD-11 ${spec.icd11}${ICD11_SUFFIX.withdrawal}`,
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code, label_de: `Psychische und Verhaltensstörung durch ${spec.name_de}: Entzugssyndrom` },
      icd11: { code: `${spec.icd11}${ICD11_SUFFIX.withdrawal}`, label_de: `Entzug durch ${spec.name_de}` },
      dsm5tr: { code: 'crosswalk', label_de: `${spec.dsmLabel} Withdrawal (Crosswalk)` },
    },
    differentials_de: [
      `Akute Intoxikation (${spec.icd10}.0)`,
      `Entzugssyndrom mit Delir (${spec.icd10}.4)`,
      'Angst- oder affektive Störung',
      'Somatische Erkrankung mit vegetativer Symptomatik',
    ],
    groups: [
      {
        id: `${prefix}.context`,
        label_de: 'Entzugskontext',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.cessation`,
            text_de: `Absetzen oder Reduktion von ${spec.dativeName} nach wiederholtem, meist anhaltendem und/oder hochdosiertem Konsum`,
            citation: [{ classification: 'icd10', code, ref: 'A' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.withdrawal_syndrome`,
            text_de: 'Es liegt ein substanztypisches Entzugssyndrom vor',
            citation: [{ classification: 'icd10', code, ref: 'B' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: domainSignal(SUBSTANCE_DOMAIN, /entzug|withdrawal|entzugssymptom|absetz/i),
          },
        ],
      },
      {
        id: `${prefix}.symptoms`,
        label_de: 'Entzugssymptome (mindestens 1)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: featureCriteria(spec, code, spec.withdrawal),
      },
      {
        id: `${prefix}.exclusions`,
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: `${prefix}.exclude_other_cause`,
            text_de: 'Die Symptome sind nicht besser durch eine andere somatische oder psychische Störung erklärbar',
            citation: [{ classification: 'icd10', code }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
    ],
    icd11: icd11WithdrawalSet(spec),
  }
}

function withdrawalDelirium(spec: SubstanceSpec): Disorder {
  const code = `${spec.icd10}.4`
  const prefix = criteriaPrefix(spec, code)
  return {
    id: `${spec.key}_withdrawal_delirium`,
    classification: 'icd10',
    code,
    name_de: `Entzugssyndrom mit Delir durch ${spec.name_de}`,
    crosswalkKey: code,
    sourceRef: `operationalisiert nach ICD-10 ${code} / ICD-11 ${spec.icd11}${ICD11_SUFFIX.withdrawalDelirium}`,
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code, label_de: `Psychische und Verhaltensstörung durch ${spec.name_de}: Entzugssyndrom mit Delir` },
      icd11: { code: `${spec.icd11}${ICD11_SUFFIX.withdrawalDelirium}`, label_de: `Durch ${spec.name_de} induziertes Delir` },
      dsm5tr: { code: 'crosswalk', label_de: `${spec.dsmLabel} Withdrawal Delirium (Crosswalk)` },
    },
    differentials_de: [
      `Entzugssyndrom ohne Delir (${spec.icd10}.3)`,
      'Delir anderer (somatischer) Ursache (F05)',
      'Substanzinduzierte psychotische Störung',
      'Wernicke-Enzephalopathie (bei Alkohol)',
    ],
    groups: [
      {
        id: `${prefix}.context`,
        label_de: 'Entzug mit Bewusstseinsstörung',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.withdrawal_context`,
            text_de: `Absetzen oder Reduktion von ${spec.dativeName} bei vorbestehendem Abhängigkeitssyndrom`,
            citation: [{ classification: 'icd10', code, ref: 'A' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.clouding`,
            text_de: 'Bewusstseinstrübung mit Beeinträchtigung von Wachheit und Aufmerksamkeit (deliranter Zustand)',
            citation: [{ classification: 'icd10', code, ref: 'B' }],
            mappingHints: substanceHint('consciousness_orientation'),
            allowClinicianAttest: true,
            operationalRule: domainSignal('consciousness_orientation', /bewusstsein.*(getr[üu]bt|tr[üu]b|st[öo]r)|somnolen|vigilanzminder|delir|benommen/i),
          },
        ],
      },
      {
        id: `${prefix}.features`,
        label_de: 'Delirante Begleitsymptome (mindestens 1)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.disorientation`,
            text_de: 'Desorientierung und globale Störung kognitiver Funktionen',
            citation: [{ classification: 'icd10', code }],
            mappingHints: substanceHint('consciousness_orientation'),
            allowClinicianAttest: true,
            operationalRule: domainSignal('consciousness_orientation', /orientierung|desorient|verwirrt/i),
          },
          {
            id: `${prefix}.hallucinations`,
            text_de: 'Lebhafte (häufig optische oder szenische) Halluzinationen oder Illusionen',
            citation: [{ classification: 'icd10', code }],
            mappingHints: substanceHint('perception_hallucinations'),
            allowClinicianAttest: true,
            operationalRule: domainSignal('perception_hallucinations', /halluzin|illusion|optisch|szenisch|verkennung/i),
          },
          {
            id: `${prefix}.psychomotor`,
            text_de: 'Ausgeprägte psychomotorische Unruhe oder Agitation',
            citation: [{ classification: 'icd10', code }],
            mappingHints: substanceHint('drive_psychomotor_activity'),
            allowClinicianAttest: true,
            operationalRule: domainSignal('drive_psychomotor_activity', /agitiert|unruhig|getrieben|hyperaktiv/i),
          },
          {
            id: `${prefix}.autonomic`,
            text_de: 'Ausgeprägte vegetative Übererregung (z. B. Tachykardie, Schwitzen, Hypertonie, grobschlägiger Tremor); Krampfanfälle möglich',
            citation: [{ classification: 'icd10', code }],
            mappingHints: substanceHint('somatic_preoccupation'),
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: `${prefix}.exclusions`,
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: `${prefix}.exclude_other_cause`,
            text_de: 'Das Delir ist nicht besser durch eine eigenständige somatische Erkrankung erklärbar',
            citation: [{ classification: 'icd10', code }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
    ],
    icd11: icd11WithdrawalDeliriumSet(spec),
  }
}

function psychoticDisorder(spec: SubstanceSpec): Disorder {
  const code = `${spec.icd10}.5`
  const prefix = criteriaPrefix(spec, code)
  return {
    id: `${spec.key}_psychotic_disorder`,
    classification: 'icd10',
    code,
    name_de: `Psychotische Störung durch ${spec.name_de}`,
    crosswalkKey: code,
    sourceRef: `operationalisiert nach ICD-10 ${code} / ICD-11 ${spec.icd11}${ICD11_SUFFIX.psychotic}`,
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code, label_de: `Psychische und Verhaltensstörung durch ${spec.name_de}: Psychotische Störung` },
      icd11: { code: `${spec.icd11}${ICD11_SUFFIX.psychotic}`, label_de: `Durch ${spec.name_de} induzierte psychotische Störung` },
      dsm5tr: { code: 'crosswalk', label_de: `${spec.dsmLabel}-Induced Psychotic Disorder (Crosswalk)` },
    },
    differentials_de: [
      'Schizophrenie oder anhaltende wahnhafte Störung',
      `Akute Intoxikation (${spec.icd10}.0) mit psychotischen Phänomenen`,
      `Entzugssyndrom mit Delir (${spec.icd10}.4)`,
      'Affektive Störung mit psychotischen Symptomen',
    ],
    groups: [
      {
        id: `${prefix}.symptoms`,
        label_de: 'Psychotische Symptome (mindestens 1)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.hallucinations`,
            text_de: 'Halluzinationen (häufig akustisch oder optisch), die nicht ausschließlich Ausdruck einer einfachen Intoxikation sind',
            citation: [{ classification: 'icd10', code }],
            mappingHints: substanceHint('perception_hallucinations'),
            allowClinicianAttest: true,
            operationalRule: domainSignal('perception_hallucinations', /halluzin|stimmen|optisch|akustisch|trugwahrnehmung/i, /keine\s+halluzinationen/i),
          },
          {
            id: `${prefix}.delusions`,
            text_de: 'Wahngedanken, häufig Verfolgungs- oder Beziehungswahn',
            citation: [{ classification: 'icd10', code }],
            mappingHints: substanceHint('delusions_overvalued_ideas'),
            allowClinicianAttest: true,
            operationalRule: domainSignal('delusions_overvalued_ideas', /wahn|verfolgung|beziehungs|paranoid|gr[öo][ßs]en/i, /kein\s+wahn/i),
          },
        ],
      },
      {
        id: `${prefix}.context`,
        label_de: 'Zeitlicher Zusammenhang mit dem Konsum',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.temporal_relation`,
            text_de: `Beginn der psychotischen Symptome während oder kurz (in der Regel innerhalb von zwei Wochen) nach dem Konsum von ${spec.dativeName}`,
            citation: [{ classification: 'icd10', code, ref: 'A' }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
            operationalRule: domainSignal(SUBSTANCE_DOMAIN, spec.useMatch),
          },
          {
            id: `${prefix}.partial_remission`,
            text_de: 'Die Symptome bilden sich typischerweise innerhalb eines begrenzten Zeitraums (Größenordnung Wochen bis wenige Monate) zumindest teilweise zurück',
            citation: [{ classification: 'icd10', code }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: `${prefix}.exclusions`,
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: `${prefix}.exclude_primary_psychosis`,
            text_de: 'Die Symptomatik ist nicht besser durch eine primäre psychotische Störung erklärbar und tritt nicht ausschließlich im Rahmen von Intoxikation oder Entzugsdelir auf',
            citation: [{ classification: 'icd10', code }],
            mappingHints: substanceHint(),
            allowClinicianAttest: true,
          },
        ],
      },
    ],
    icd11: icd11PsychoticSet(spec),
  }
}

// ---------------------------------------------------------------------------
// Substance specifications
// ---------------------------------------------------------------------------

const alcohol: SubstanceSpec = {
  key: 'alcohol',
  icd10: 'F10',
  icd11: '6C40',
  name_de: 'Alkohol',
  dativeName: 'Alkohol',
  dsmLabel: 'Alcohol',
  useMatch: /alkohol|trinken|ethanol|promille/i,
  intox: [
    { key: 'disinhibition', text_de: 'Enthemmung, Stimmungslabilität oder Streitlust', hint: 'mood_affect' },
    { key: 'ataxia', text_de: 'Gang- und Standunsicherheit (Ataxie), Koordinationsstörung', hint: 'appearance_behavior' },
    { key: 'slurred_speech', text_de: 'Verwaschene Sprache', hint: 'speech_language' },
    { key: 'nystagmus', text_de: 'Nystagmus oder gestörte Okulomotorik' },
    { key: 'attention', text_de: 'Aufmerksamkeits- und Konzentrationsstörung', hint: 'attention_concentration' },
    { key: 'reduced_consciousness', text_de: 'Bewusstseinsminderung bis hin zu Sopor (bei hoher Dosis)', hint: 'consciousness_orientation' },
  ],
  withdrawal: [
    { key: 'tremor', text_de: 'Tremor, vor allem der Hände', hint: 'somatic_preoccupation' },
    { key: 'sweating_autonomic', text_de: 'Schwitzen, Tachykardie und weitere vegetative Übererregung', hint: 'somatic_preoccupation' },
    { key: 'anxiety_agitation', text_de: 'Ängstlichkeit, Unruhe oder psychomotorische Agitation', hint: 'anxiety_panic_phobic_symptoms' },
    { key: 'nausea', text_de: 'Übelkeit oder Erbrechen', hint: 'somatic_preoccupation' },
    { key: 'insomnia', text_de: 'Ein- und Durchschlafstörung', hint: 'sleep_appetite_vegetative' },
    { key: 'transient_hallucinations', text_de: 'Vorübergehende optische, taktile oder akustische Trugwahrnehmungen', hint: 'perception_hallucinations' },
  ],
}

const opioids: SubstanceSpec = {
  key: 'opioids',
  icd10: 'F11',
  icd11: '6C43',
  name_de: 'Opioide',
  dativeName: 'Opioiden',
  dsmLabel: 'Opioid',
  useMatch: /opioid|opiat|heroin|morphin|fentanyl|methadon|oxycodon|codein/i,
  intox: [
    { key: 'miosis', text_de: 'Pupillenverengung (Miosis)' },
    { key: 'sedation', text_de: 'Apathie, Sedierung oder Bewusstseinsminderung', hint: 'consciousness_orientation' },
    { key: 'euphoria', text_de: 'Initiale Euphorie mit nachfolgender Apathie oder Dysphorie', hint: 'mood_affect' },
    { key: 'respiratory_depression', text_de: 'Verlangsamte Atmung (Atemdepression) bei hoher Dosis' },
    { key: 'slurred_speech', text_de: 'Verwaschene Sprache und beeinträchtigte Aufmerksamkeit', hint: 'speech_language' },
  ],
  withdrawal: [
    { key: 'craving', text_de: 'Starkes Substanzverlangen (Craving)' },
    { key: 'rhinorrhea_lacrimation', text_de: 'Laufende Nase und tränende Augen', hint: 'somatic_preoccupation' },
    { key: 'mydriasis_piloerection', text_de: 'Pupillenerweiterung, Gänsehaut (Piloerektion) und Schweißausbrüche', hint: 'somatic_preoccupation' },
    { key: 'myalgia', text_de: 'Muskel- und Gliederschmerzen', hint: 'somatic_preoccupation' },
    { key: 'gi_symptoms', text_de: 'Übelkeit, Erbrechen, Bauchkrämpfe oder Durchfall', hint: 'somatic_preoccupation' },
    { key: 'dysphoria', text_de: 'Dysphorische Verstimmung, Gähnen und Schlafstörung', hint: 'mood_affect' },
  ],
}

const cannabinoids: SubstanceSpec = {
  key: 'cannabinoids',
  icd10: 'F12',
  icd11: '6C41',
  name_de: 'Cannabinoide',
  dativeName: 'Cannabinoiden',
  dsmLabel: 'Cannabis',
  useMatch: /cannabi|marihuana|haschisch|thc|gras|joint/i,
  intox: [
    { key: 'euphoria_anxiety', text_de: 'Euphorie und Entspannung oder umgekehrt Angst und Agitiertheit', hint: 'mood_affect' },
    { key: 'time_perception', text_de: 'Verändertes Zeiterleben und Eindruck geschärfter Wahrnehmung', hint: 'perception_hallucinations' },
    { key: 'impaired_coordination', text_de: 'Beeinträchtigte Koordination und Reaktionsfähigkeit', hint: 'appearance_behavior' },
    { key: 'appetite', text_de: 'Gesteigerter Appetit', hint: 'sleep_appetite_vegetative' },
    { key: 'conjunctival_injection', text_de: 'Gerötete Bindehäute, Mundtrockenheit und Tachykardie' },
    { key: 'suspiciousness', text_de: 'Misstrauen oder paranoide Gedanken', hint: 'thought_content' },
  ],
  withdrawal: [
    { key: 'irritability', text_de: 'Reizbarkeit, innere Unruhe oder Nervosität', hint: 'mood_affect' },
    { key: 'anxiety', text_de: 'Ängstlichkeit oder Anspannung', hint: 'anxiety_panic_phobic_symptoms' },
    { key: 'sleep_disturbance', text_de: 'Schlafstörung, teils mit lebhaften Träumen', hint: 'sleep_appetite_vegetative' },
    { key: 'appetite_loss', text_de: 'Appetitminderung und Gewichtsabnahme', hint: 'sleep_appetite_vegetative' },
    { key: 'depressed_mood', text_de: 'Gedrückte Stimmung', hint: 'mood_affect' },
  ],
}

const sedatives: SubstanceSpec = {
  key: 'sedatives',
  icd10: 'F13',
  icd11: '6C44',
  name_de: 'Sedativa oder Hypnotika',
  dativeName: 'Sedativa oder Hypnotika',
  dsmLabel: 'Sedative, Hypnotic, or Anxiolytic',
  useMatch: /benzodiazepin|sedativ|hypnotik|schlafmittel|beruhigungsmittel|z-?substanz|zolpidem|diazepam/i,
  intox: [
    { key: 'sedation', text_de: 'Sedierung, Schläfrigkeit und verminderte Wachheit', hint: 'consciousness_orientation' },
    { key: 'ataxia', text_de: 'Gangunsicherheit (Ataxie) und Koordinationsstörung', hint: 'appearance_behavior' },
    { key: 'slurred_speech', text_de: 'Verwaschene Sprache', hint: 'speech_language' },
    { key: 'nystagmus', text_de: 'Nystagmus' },
    { key: 'memory_attention', text_de: 'Aufmerksamkeits- und Merkfähigkeitsstörung (anterograde Amnesie möglich)', hint: 'memory_cognition' },
    { key: 'disinhibition', text_de: 'Enthemmung oder paradoxe Erregung', hint: 'mood_affect' },
  ],
  withdrawal: [
    { key: 'tremor', text_de: 'Tremor und vegetative Übererregung (Schwitzen, Tachykardie)', hint: 'somatic_preoccupation' },
    { key: 'insomnia', text_de: 'Ausgeprägte Ein- und Durchschlafstörung', hint: 'sleep_appetite_vegetative' },
    { key: 'anxiety_agitation', text_de: 'Angst, innere Unruhe und Agitation', hint: 'anxiety_panic_phobic_symptoms' },
    { key: 'nausea', text_de: 'Übelkeit oder Erbrechen', hint: 'somatic_preoccupation' },
    { key: 'perceptual_disturbance', text_de: 'Wahrnehmungsstörungen oder transiente Halluzinationen', hint: 'perception_hallucinations' },
    { key: 'seizures', text_de: 'Krampfanfälle möglich' },
  ],
}

const cocaine: SubstanceSpec = {
  key: 'cocaine',
  icd10: 'F14',
  icd11: '6C45',
  name_de: 'Kokain',
  dativeName: 'Kokain',
  dsmLabel: 'Cocaine (Stimulant)',
  useMatch: /kokain|crack|coke/i,
  intox: [
    { key: 'euphoria_grandiosity', text_de: 'Euphorie, gesteigertes Selbstwertgefühl und Rededrang', hint: 'mood_affect' },
    { key: 'hypervigilance', text_de: 'Hypervigilanz, Agitiertheit und gesteigerte Aktivität', hint: 'drive_psychomotor_activity' },
    { key: 'autonomic', text_de: 'Tachykardie, Blutdruckanstieg, Pupillenerweiterung und Schwitzen' },
    { key: 'stereotypies', text_de: 'Stereotype Bewegungen oder Zähneknirschen', hint: 'appearance_behavior' },
    { key: 'paranoia', text_de: 'Misstrauen, paranoide Gedanken oder taktile Missempfindungen', hint: 'thought_content' },
  ],
  withdrawal: [
    { key: 'dysphoria', text_de: 'Dysphorische, gedrückte Stimmung („Crash“)', hint: 'mood_affect' },
    { key: 'fatigue', text_de: 'Erschöpfung und Antriebsminderung', hint: 'drive_psychomotor_activity' },
    { key: 'sleep', text_de: 'Vermehrtes Schlafbedürfnis oder Schlaflosigkeit mit lebhaften Träumen', hint: 'sleep_appetite_vegetative' },
    { key: 'appetite', text_de: 'Gesteigerter Appetit', hint: 'sleep_appetite_vegetative' },
    { key: 'craving', text_de: 'Starkes Substanzverlangen (Craving)' },
  ],
}

const stimulants: SubstanceSpec = {
  key: 'stimulants',
  icd10: 'F15',
  icd11: '6C46',
  name_de: 'andere Stimulanzien einschließlich Koffein',
  dativeName: 'anderen Stimulanzien einschließlich Koffein',
  dsmLabel: 'Stimulant',
  useMatch: /amphetamin|methamphetamin|speed|stimulan|koffein|ecstasy|mdma|crystal/i,
  intox: [
    { key: 'euphoria_energy', text_de: 'Euphorie, Rededrang und gesteigerte Energie/Wachheit', hint: 'mood_affect' },
    { key: 'insomnia', text_de: 'Schlaflosigkeit und reduziertes Schlafbedürfnis', hint: 'sleep_appetite_vegetative' },
    { key: 'autonomic', text_de: 'Tachykardie, Blutdruckanstieg, Pupillenerweiterung; Hyperthermie möglich' },
    { key: 'agitation', text_de: 'Agitation, Unruhe oder aggressives Verhalten', hint: 'drive_psychomotor_activity' },
    { key: 'paranoia', text_de: 'Misstrauen oder paranoide Gedanken (bei höherer Dosis)', hint: 'thought_content' },
  ],
  withdrawal: [
    { key: 'fatigue', text_de: 'Ausgeprägte Müdigkeit und Erschöpfung', hint: 'drive_psychomotor_activity' },
    { key: 'depressed_mood', text_de: 'Gedrückte Stimmung und Anhedonie', hint: 'mood_affect' },
    { key: 'hypersomnia', text_de: 'Vermehrtes Schlafbedürfnis', hint: 'sleep_appetite_vegetative' },
    { key: 'appetite', text_de: 'Gesteigerter Appetit', hint: 'sleep_appetite_vegetative' },
    { key: 'caffeine_headache', text_de: 'Bei Koffein: Kopfschmerzen, Müdigkeit und Konzentrationsstörung', hint: 'somatic_preoccupation' },
  ],
}

const hallucinogens: SubstanceSpec = {
  key: 'hallucinogens',
  icd10: 'F16',
  icd11: '6C49',
  name_de: 'Halluzinogene',
  dativeName: 'Halluzinogenen',
  dsmLabel: 'Hallucinogen',
  useMatch: /halluzinogen|lsd|psilocybin|pilze|meskalin|dmt/i,
  intox: [
    { key: 'perceptual_changes', text_de: 'Veränderte Wahrnehmung mit Illusionen, Halluzinationen oder Synästhesien bei meist erhaltener Realitätsprüfung', hint: 'perception_hallucinations' },
    { key: 'depersonalization', text_de: 'Depersonalisations- oder Derealisationserleben', hint: 'self_experience_ego_disturbance' },
    { key: 'anxiety_panic', text_de: 'Angst, Panik oder paranoide Reaktion („Horrortrip“)', hint: 'anxiety_panic_phobic_symptoms' },
    { key: 'autonomic', text_de: 'Pupillenerweiterung, Tachykardie und Tremor' },
  ],
  withdrawal: [],
}

const nicotine: SubstanceSpec = {
  key: 'nicotine',
  icd10: 'F17',
  icd11: '6C4A',
  name_de: 'Tabak/Nikotin',
  dativeName: 'Tabak/Nikotin',
  dsmLabel: 'Tobacco',
  useMatch: /tabak|nikotin|rauch|zigarette|zigarre/i,
  intox: [],
  withdrawal: [
    { key: 'craving', text_de: 'Starkes Rauchverlangen (Craving)' },
    { key: 'irritability', text_de: 'Reizbarkeit, Frustration oder Ärger', hint: 'mood_affect' },
    { key: 'anxiety', text_de: 'Ängstlichkeit oder innere Unruhe', hint: 'anxiety_panic_phobic_symptoms' },
    { key: 'concentration', text_de: 'Konzentrationsschwierigkeiten', hint: 'attention_concentration' },
    { key: 'restlessness', text_de: 'Ruhelosigkeit', hint: 'drive_psychomotor_activity' },
    { key: 'appetite', text_de: 'Gesteigerter Appetit oder Gewichtszunahme', hint: 'sleep_appetite_vegetative' },
    { key: 'depressed_mood', text_de: 'Gedrückte Stimmung', hint: 'mood_affect' },
    { key: 'insomnia', text_de: 'Schlafstörung', hint: 'sleep_appetite_vegetative' },
  ],
}

const solvents: SubstanceSpec = {
  key: 'volatile_solvents',
  icd10: 'F18',
  icd11: '6C4B',
  name_de: 'flüchtige Lösungsmittel',
  dativeName: 'flüchtigen Lösungsmitteln',
  dsmLabel: 'Inhalant',
  useMatch: /l[öo]sungsmittel|schn[üu]ffel|inhalan|klebstoff|benzin|lack/i,
  intox: [
    { key: 'euphoria_disinhibition', text_de: 'Euphorie, Enthemmung und Apathie', hint: 'mood_affect' },
    { key: 'dizziness', text_de: 'Schwindel und Benommenheit', hint: 'somatic_preoccupation' },
    { key: 'ataxia', text_de: 'Gangunsicherheit (Ataxie) und Koordinationsstörung', hint: 'appearance_behavior' },
    { key: 'slurred_speech', text_de: 'Verwaschene Sprache und verschwommenes Sehen', hint: 'speech_language' },
    { key: 'lethargy', text_de: 'Lethargie bis hin zu Stupor oder Bewusstseinsminderung', hint: 'consciousness_orientation' },
  ],
  withdrawal: [],
}

const multipleSubstances: SubstanceSpec = {
  key: 'multiple_substances',
  icd10: 'F19',
  icd11: '6C4E',
  name_de: 'multiplen Substanzgebrauch und andere psychotrope Substanzen',
  dativeName: 'multiplen Substanzen und anderen psychotropen Substanzen',
  dsmLabel: 'Polysubstance (Other Psychoactive Substance)',
  useMatch:
    /multiplen\s+substanz|mischkonsum|polysubstanz|polydrug|mehrere\s+substanz|multiple\s+(drug|substance)|psychotrop/i,
  intox: [
    {
      key: 'mixed_signs',
      text_de:
        'Variabler Intoxikationsbefund je nach involvierten Substanzen (z. B. Stimulanzien- oder Sedativa-/Opioid-Muster)',
      hint: 'substance_related_features',
    },
    { key: 'disinhibition', text_de: 'Enthemmung, Stimmungslabilität oder paradoxe Erregung', hint: 'mood_affect' },
    {
      key: 'consciousness',
      text_de: 'Beeinträchtigtes Bewusstsein bis hin zu Sopor bei sedierenden Substanzen',
      hint: 'consciousness_orientation',
    },
    {
      key: 'autonomic',
      text_de: 'Vegetative Symptome (Tachykardie, Pupillenweite, Schwitzen) im Muster der konsumierten Substanzen',
    },
    {
      key: 'coordination',
      text_de: 'Koordinations- oder Gangstörung, verwaschene Sprache',
      hint: 'appearance_behavior',
    },
    {
      key: 'perceptual',
      text_de: 'Wahrnehmungsveränderungen oder Halluzinationen bei psychotropen Substanzen',
      hint: 'perception_hallucinations',
    },
  ],
  withdrawal: [
    {
      key: 'mixed_withdrawal',
      text_de:
        'Entzugssymptome im Muster der involvierten Substanzen (z. B. Tremor, vegetative Übererregung, Dysphorie, Schlafstörung)',
    },
    { key: 'craving', text_de: 'Starkes Verlangen (Craving) nach einer oder mehreren Substanzen' },
    {
      key: 'anxiety_agitation',
      text_de: 'Ängstlichkeit, innere Unruhe oder Agitation',
      hint: 'anxiety_panic_phobic_symptoms',
    },
    {
      key: 'autonomic',
      text_de: 'Vegetative Entzugssymptome (Schwitzen, Tachykardie, Tremor)',
      hint: 'somatic_preoccupation',
    },
    { key: 'insomnia', text_de: 'Schlafstörung', hint: 'sleep_appetite_vegetative' },
    { key: 'dysphoria', text_de: 'Dysphorische oder gedrückte Stimmung', hint: 'mood_affect' },
  ],
}

/** ICD-11 6C48 — Koffein (eigenständiger Block, getrennt von 6C46 Amphetamin-Typ-Stimulanzien). */
const caffeine: SubstanceSpec = {
  key: 'caffeine',
  icd10: 'F15',
  icd11: '6C48',
  criteriaIdPrefix: 'caffeine',
  name_de: 'Koffein',
  dativeName: 'Koffein',
  dsmLabel: 'Caffeine',
  useMatch: /koffein|kaffee|energydrink|mate|teein/i,
  intox: [
    { key: 'restlessness', text_de: 'Innere Unruhe, Nervosität oder leichte Agitiertheit', hint: 'drive_psychomotor_activity' },
    { key: 'insomnia', text_de: 'Schlaflosigkeit oder vermindertes Schlafbedürfnis', hint: 'sleep_appetite_vegetative' },
    { key: 'tachycardia', text_de: 'Tachykardie, Herzklopfen oder leichte Tremor', hint: 'somatic_preoccupation' },
    { key: 'gi_upset', text_de: 'Übelkeit, Magenbeschwerden oder gesteigerter Harndrang', hint: 'somatic_preoccupation' },
    { key: 'anxiety', text_de: 'Ängstlichkeit oder Anspannung bei höherer Dosis', hint: 'anxiety_panic_phobic_symptoms' },
  ],
  withdrawal: [
    { key: 'headache', text_de: 'Kopfschmerzen', hint: 'somatic_preoccupation' },
    { key: 'fatigue', text_de: 'Müdigkeit oder Erschöpfung', hint: 'drive_psychomotor_activity' },
    { key: 'dysphoria', text_de: 'Gedrückte Stimmung, Reizbarkeit oder Konzentrationsschwierigkeiten', hint: 'mood_affect' },
    { key: 'flu_like', text_de: 'Grippale Beschwerden oder Muskelschmerzen', hint: 'somatic_preoccupation' },
    { key: 'craving', text_de: 'Starkes Verlangen nach koffeinhaltigen Getränken (Craving)' },
  ],
}

/** ICD-11 6C47 — Synthetische Cathinone (z. B. „Bath Salts“, Mephedron-Analoge). */
const syntheticCathinones: SubstanceSpec = {
  key: 'synthetic_cathinones',
  icd10: 'F15',
  icd11: '6C47',
  criteriaIdPrefix: 'synthetic_cathinones',
  name_de: 'synthetische Cathinone',
  dativeName: 'synthetischen Cathinonen',
  dsmLabel: 'Synthetic Cathinone (Stimulant)',
  useMatch: /cathinon|mephedron|bath\s*salt|alpha-?pvp|flakka|synthetisch.*stimulan/i,
  intox: [
    { key: 'euphoria_agitation', text_de: 'Euphorie, gesteigerte Wachheit und ausgeprägte Agitiertheit', hint: 'mood_affect' },
    { key: 'autonomic', text_de: 'Tachykardie, Blutdruckanstieg, Schwitzen und Pupillenerweiterung; Hyperthermie möglich' },
    { key: 'paranoia', text_de: 'Misstrauen, paranoide Gedanken oder aggressive Impulsivität', hint: 'thought_content' },
    { key: 'psychomotor', text_de: 'Psychomotorische Unruhe, Stereotypien oder repetitive Bewegungen', hint: 'drive_psychomotor_activity' },
  ],
  withdrawal: [
    { key: 'dysphoria', text_de: 'Dysphorische, gedrückte Stimmung und Anhedonie', hint: 'mood_affect' },
    { key: 'fatigue', text_de: 'Ausgeprägte Müdigkeit und Antriebsminderung', hint: 'drive_psychomotor_activity' },
    { key: 'sleep', text_de: 'Vermehrtes Schlafbedürfnis oder Schlaflosigkeit mit lebhaften Träumen', hint: 'sleep_appetite_vegetative' },
    { key: 'craving', text_de: 'Starkes Substanzverlangen (Craving)' },
  ],
}

/** ICD-11 6C4C — MDMA/MDA und verwandte Empathogene (eigenständiger Block neben 6C46). */
const mdmaRelated: SubstanceSpec = {
  key: 'mdma_related',
  icd10: 'F15',
  icd11: '6C4C',
  criteriaIdPrefix: 'mdma_related',
  name_de: 'MDMA oder verwandte Empathogene (einschließlich MDA)',
  dativeName: 'MDMA oder verwandten Empathogenen (einschließlich MDA)',
  dsmLabel: 'MDMA/Empathogen',
  useMatch: /mdma|ecstasy|xtc|mda|mdea|empathogen|xtasy/i,
  intox: [
    { key: 'euphoria_empathy', text_de: 'Euphorie, gesteigerte Empathie und emotionaler Offenheit', hint: 'mood_affect' },
    { key: 'sensory', text_de: 'Gesteigerte sensorische Wahrnehmung und gesteigerte Geselligkeit', hint: 'perception_hallucinations' },
    { key: 'autonomic', text_de: 'Tachykardie, Blutdruckanstieg, Schwitzen und Kieferpressen (Bruxismus)' },
    { key: 'hyperthermia', text_de: 'Hyperthermie und gesteigerte körperliche Aktivität möglich', hint: 'somatic_preoccupation' },
  ],
  withdrawal: [
    { key: 'dysphoria', text_de: 'Gedrückte Stimmung, Reizbarkeit und Anhedonie („Midweek Blues“)', hint: 'mood_affect' },
    { key: 'fatigue', text_de: 'Erschöpfung und Konzentrationsschwierigkeiten', hint: 'attention_concentration' },
    { key: 'sleep', text_de: 'Schlafstörung oder vermehrtes Schlafbedürfnis', hint: 'sleep_appetite_vegetative' },
    { key: 'craving', text_de: 'Starkes Verlangen (Craving)' },
  ],
}

/** ICD-11 6C4D — Dissoziative Substanzen (Ketamin, PCP u. a.). */
const dissociativeDrugs: SubstanceSpec = {
  key: 'dissociative_drugs',
  icd10: 'F19',
  icd11: '6C4D',
  criteriaIdPrefix: 'dissociative_drugs',
  name_de: 'dissoziative Substanzen einschließlich Ketamin und PCP',
  dativeName: 'dissoziativen Substanzen einschließlich Ketamin und PCP',
  dsmLabel: 'Dissociative Drug',
  useMatch: /ketamin|pcp|phencyclidin|dissoziat|n2o|lachgas|dxm|dextromethorphan/i,
  intox: [
    { key: 'dissociation', text_de: 'Depersonalisations- oder Derealisationserleben, Trance- oder „Out-of-Body“-Zustände', hint: 'self_experience_ego_disturbance' },
    { key: 'perceptual', text_de: 'Veränderte Wahrnehmung, Illusionen oder Halluzinationen bei teils erhaltener Realitätsprüfung', hint: 'perception_hallucinations' },
    { key: 'motor', text_de: 'Koordinationsstörung, Gangunsicherheit oder rigide Haltung', hint: 'appearance_behavior' },
    { key: 'autonomic', text_de: 'Tachykardie, Blutdruckanstieg oder Nystagmus' },
  ],
  withdrawal: [
    { key: 'dysphoria', text_de: 'Dysphorische Stimmung, Angst oder innere Unruhe', hint: 'mood_affect' },
    { key: 'craving', text_de: 'Starkes Substanzverlangen (Craving)' },
    { key: 'cognitive', text_de: 'Konzentrations- oder Gedächtnisstörungen', hint: 'attention_concentration' },
  ],
}

/** ICD-11 6C4F — multiple spezifizierte psychoaktive Substanzen (einschließlich Medikamente). */
const multipleSpecifiedPsychoactive: SubstanceSpec = {
  key: 'multiple_specified_psychoactive',
  icd10: 'F19',
  icd11: '6C4F',
  criteriaIdPrefix: 'multiple_specified_psychoactive',
  name_de: 'multiple spezifizierte psychoaktive Substanzen einschließlich Medikamente',
  dativeName: 'multiplen spezifizierten psychoaktiven Substanzen einschließlich Medikamente',
  dsmLabel: 'Polysubstance (Specified Psychoactive)',
  useMatch: /mehrere\s+spezif|multiplen\s+spezif|polysubstanz|kombination.*substanz|medikament.*missbrauch/i,
  intox: [
    { key: 'mixed_signs', text_de: 'Variabler Intoxikationsbefund im Muster der involvierten Substanzen', hint: 'substance_related_features' },
    { key: 'disinhibition', text_de: 'Enthemmung oder Stimmungslabilität', hint: 'mood_affect' },
    { key: 'consciousness', text_de: 'Beeinträchtigtes Bewusstsein je nach beteiligter Substanz', hint: 'consciousness_orientation' },
  ],
  withdrawal: [
    { key: 'mixed_withdrawal', text_de: 'Entzugssymptome im Muster der beteiligten Substanzen' },
    { key: 'craving', text_de: 'Starkes Verlangen (Craving) nach einer oder mehreren Substanzen' },
    { key: 'dysphoria', text_de: 'Dysphorische Stimmung, Angst oder Schlafstörung', hint: 'mood_affect' },
  ],
}

/** ICD-11 6C4G — unbekannte oder nicht näher bezeichnete psychoaktive Substanzen. */
const unknownPsychoactive: SubstanceSpec = {
  key: 'unknown_psychoactive',
  icd10: 'F19',
  icd11: '6C4G',
  criteriaIdPrefix: 'unknown_psychoactive',
  name_de: 'unbekannte oder nicht näher bezeichnete psychoaktive Substanzen',
  dativeName: 'unbekannten oder nicht näher bezeichneten psychoaktiven Substanzen',
  dsmLabel: 'Unknown Psychoactive Substance',
  useMatch: /unbekannt.*substanz|designer.*droge|neue\s+psychoaktiv|nps|research\s+chemical/i,
  intox: [
    { key: 'unknown_intox', text_de: 'Akute psychische oder vegetative Symptome im zeitlichen Zusammenhang mit dem Konsum einer nicht näher bezeichneten psychoaktiven Substanz', hint: 'substance_related_features' },
    { key: 'perceptual', text_de: 'Wahrnehmungsveränderungen oder Bewusstseinsstörung möglich', hint: 'perception_hallucinations' },
  ],
  withdrawal: [
    { key: 'unknown_withdrawal', text_de: 'Entzugssymptome nach Reduktion oder Beendigung des Konsums' },
    { key: 'craving', text_de: 'Starkes Verlangen (Craving)' },
  ],
}

/** ICD-11 6C4H — nicht-psychoaktive Substanzen (Laxanzien, Analgetika u. a.). */
export const nonPsychoactiveSubstance: SubstanceSpec = {
  key: 'non_psychoactive',
  icd10: 'F55',
  icd11: '6C4H',
  criteriaIdPrefix: 'non_psychoactive',
  name_de: 'nicht-psychoaktive Substanzen',
  dativeName: 'nicht-psychoaktiven Substanzen',
  dsmLabel: 'Non-Psychoactive Substance',
  useMatch: /laxanz|analgetik|vitamin|pflanzlich|nicht.?psychoaktiv|diuretik|abführ|schmerzmittel.*missbrauch/i,
  intox: [],
  withdrawal: [],
}

// ---------------------------------------------------------------------------
// Generated matrix — only the cells a psychiatrist routinely diagnoses.
// ---------------------------------------------------------------------------

export const substanceUseDisorders: Disorder[] = [
  // Alcohol (F10): dependence F10.2 lives in the existing template; add the rest.
  harmfulUse(alcohol),
  acuteIntoxication(alcohol),
  withdrawalState(alcohol),
  withdrawalDelirium(alcohol),
  psychoticDisorder(alcohol),

  // Opioids (F11)
  acuteIntoxication(opioids),
  harmfulUse(opioids),
  dependenceSyndrome(opioids),
  withdrawalState(opioids),

  // Cannabinoids (F12)
  acuteIntoxication(cannabinoids),
  harmfulUse(cannabinoids),
  dependenceSyndrome(cannabinoids),
  withdrawalState(cannabinoids),
  psychoticDisorder(cannabinoids),

  // Sedatives / hypnotics (F13)
  acuteIntoxication(sedatives),
  harmfulUse(sedatives),
  dependenceSyndrome(sedatives),
  withdrawalState(sedatives),
  withdrawalDelirium(sedatives),

  // Cocaine (F14)
  acuteIntoxication(cocaine),
  harmfulUse(cocaine),
  dependenceSyndrome(cocaine),
  withdrawalState(cocaine),
  psychoticDisorder(cocaine),

  // Other stimulants incl. caffeine (F15)
  acuteIntoxication(stimulants),
  harmfulUse(stimulants),
  dependenceSyndrome(stimulants),
  withdrawalState(stimulants),
  psychoticDisorder(stimulants),

  // Hallucinogens (F16)
  acuteIntoxication(hallucinogens),
  harmfulUse(hallucinogens),
  psychoticDisorder(hallucinogens),

  // Tobacco / nicotine (F17)
  harmfulUse(nicotine),
  dependenceSyndrome(nicotine),
  withdrawalState(nicotine),

  // Volatile solvents (F18)
  acuteIntoxication(solvents),
  harmfulUse(solvents),
  dependenceSyndrome(solvents),

  // Multiple drug use / other psychoactive substances (F19)
  acuteIntoxication(multipleSubstances),
  harmfulUse(multipleSubstances),
  dependenceSyndrome(multipleSubstances),
  withdrawalState(multipleSubstances),
  withdrawalDelirium(multipleSubstances),
  psychoticDisorder(multipleSubstances),

  // Caffeine (ICD-11 6C48; ICD-10-Näherung F15)
  harmfulUse(caffeine),
  dependenceSyndrome(caffeine),
  withdrawalState(caffeine),

  // Synthetic cathinones (ICD-11 6C47; ICD-10-Näherung F15)
  harmfulUse(syntheticCathinones),
  dependenceSyndrome(syntheticCathinones),
  acuteIntoxication(syntheticCathinones),
  psychoticDisorder(syntheticCathinones),

  // MDMA / MDA empathogens (ICD-11 6C4C; ICD-10-Näherung F15)
  harmfulUse(mdmaRelated),
  dependenceSyndrome(mdmaRelated),
  acuteIntoxication(mdmaRelated),

  // Dissociative drugs incl. ketamine / PCP (ICD-11 6C4D; ICD-10-Näherung F19)
  harmfulUse(dissociativeDrugs),
  dependenceSyndrome(dissociativeDrugs),
  acuteIntoxication(dissociativeDrugs),
  psychoticDisorder(dissociativeDrugs),

  // Multiple specified psychoactive substances incl. medications (ICD-11 6C4F)
  harmfulUse(multipleSpecifiedPsychoactive),
  dependenceSyndrome(multipleSpecifiedPsychoactive),

  // Unknown / unspecified psychoactive substances (ICD-11 6C4G)
  harmfulUse(unknownPsychoactive),
  dependenceSyndrome(unknownPsychoactive),
]
