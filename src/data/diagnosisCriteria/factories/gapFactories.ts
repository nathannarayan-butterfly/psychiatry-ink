/**
 * Reusable factories for crosswalk-gap ICD-10 F codes.
 *
 * These helpers keep the residual coverage set DRY: stem anchors, unspecified/
 * other-specified holding categories, and templated organic/secondary syndromes.
 * Every `text_de` is an original operational paraphrase; all records ship as
 * `status: 'draft'`.
 */

import type { Criterion, CriterionGroup, Disorder, DisorderCodingRef } from '../schema'
import { domainSignal } from '../predicateHelpers'
import type { IsdmPhenomenologyDomain } from '../../../types/isdm'

/** Lowercased, dot-free id prefix (F48.1 → "f48_1"). */
export function idp(code: string): string {
  return code.toLowerCase().replace(/\./g, '_')
}

export interface CodingCrosswalk {
  icd10: DisorderCodingRef
  icd11?: DisorderCodingRef
  dsm5tr?: DisorderCodingRef
}

export interface StemAnchorSpec {
  id: string
  /** 3-character ICD-10 stem (e.g. "F40"). */
  code: string
  name_de: string
  crosswalkKey: string
  sourceRef: string
  codingSystems: CodingCrosswalk
  differentials_de: string[]
  /** Core symptom criterion text. */
  coreSymptomText_de: string
  /** Optional phenomenology domain + regex for auto-rule. */
  domain?: IsdmPhenomenologyDomain
  presentMatch?: RegExp
  absentMatch?: RegExp
  /** When true, adds the standard "insufficient information" criterion (F39-style). */
  holdingCategory?: boolean
  exclusionText_de?: string
}

/** Stem-anchored disorder (F32-style): matches any sub-code sharing the stem. */
export function stemAnchorDisorder(spec: StemAnchorSpec): Disorder {
  const prefix = idp(spec.code)
  const criteria: Criterion[] = [
    {
      id: `${prefix}.core_symptoms`,
      text_de: spec.coreSymptomText_de,
      citation: [{ classification: 'icd10', code: spec.code }],
      mappingHints: spec.domain
        ? [{ kind: 'isdm_domain', ref: spec.domain, deepLinkPageId: 'psychopathologie' }]
        : [],
      allowClinicianAttest: true,
      ...(spec.domain && spec.presentMatch
        ? { operationalRule: domainSignal(spec.domain, spec.presentMatch, spec.absentMatch) }
        : {}),
    },
  ]
  if (spec.holdingCategory) {
    criteria.push({
      id: `${prefix}.insufficient_information`,
      text_de:
        'Die vorliegenden Angaben reichen für eine spezifischere Diagnose nicht aus oder sind widersprüchlich (vorläufige bzw. Verlegenheitskategorie)',
      citation: [{ classification: 'icd10', code: spec.code }],
      mappingHints: [],
      allowClinicianAttest: true,
    })
  }
  const groups: CriterionGroup[] = [
    {
      id: `${prefix}.core`,
      label_de: spec.holdingCategory
        ? 'Klinische Symptomatik ohne ausreichende Information für eine spezifischere Zuordnung'
        : 'Kernkriterien',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria,
    },
  ]
  if (spec.exclusionText_de) {
    groups.push({
      id: `${prefix}.exclusions`,
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: `${prefix}.exclude_other`,
          text_de: spec.exclusionText_de,
          citation: [{ classification: 'icd10', code: spec.code }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    })
  }
  return {
    id: spec.id,
    classification: 'icd10',
    code: spec.code,
    name_de: spec.name_de,
    crosswalkKey: spec.crosswalkKey,
    sourceRef: spec.sourceRef,
    version: 1,
    status: 'draft',
    codingSystems: spec.codingSystems,
    differentials_de: spec.differentials_de,
    groups,
  }
}

export interface SpecificCodeSpec extends Omit<StemAnchorSpec, 'code'> {
  /** Full ICD-10 code (e.g. "F48.0"). */
  code: string
  groups?: CriterionGroup[]
}

/** Sub-code-anchored disorder: matches exact code or finer extensions only. */
export function specificCodeDisorder(spec: SpecificCodeSpec): Disorder {
  const prefix = idp(spec.code)
  const groups =
    spec.groups ??
    [
      {
        id: `${prefix}.core`,
        label_de: spec.holdingCategory
          ? 'Klinische Symptomatik ohne ausreichende Information für eine spezifischere Zuordnung'
          : 'Kernkriterien',
        logic: 'all_of' as const,
        groupType: 'inclusion' as const,
        criteria: [
          {
            id: `${prefix}.core_symptoms`,
            text_de: spec.coreSymptomText_de,
            citation: [{ classification: 'icd10' as const, code: spec.code }],
            mappingHints: spec.domain
              ? [{ kind: 'isdm_domain' as const, ref: spec.domain, deepLinkPageId: 'psychopathologie' }]
              : [],
            allowClinicianAttest: true,
            ...(spec.domain && spec.presentMatch
              ? { operationalRule: domainSignal(spec.domain, spec.presentMatch, spec.absentMatch) }
              : {}),
          },
          ...(spec.holdingCategory
            ? [
                {
                  id: `${prefix}.insufficient_information`,
                  text_de:
                    'Die vorliegenden Angaben reichen für eine spezifischere Diagnose nicht aus oder sind widersprüchlich (vorläufige bzw. Verlegenheitskategorie)',
                  citation: [{ classification: 'icd10' as const, code: spec.code }],
                  mappingHints: [],
                  allowClinicianAttest: true,
                },
              ]
            : []),
        ],
      },
      ...(spec.exclusionText_de
        ? [
            {
              id: `${prefix}.exclusions`,
              label_de: 'Ausschlüsse',
              logic: 'none_of' as const,
              groupType: 'exclusion' as const,
              criteria: [
                {
                  id: `${prefix}.exclude_other`,
                  text_de: spec.exclusionText_de,
                  citation: [{ classification: 'icd10' as const, code: spec.code }],
                  mappingHints: [] as { kind: 'isdm_domain'; ref: string }[],
                  allowClinicianAttest: true,
                },
              ],
            },
          ]
        : []),
    ]
  return {
    id: spec.id,
    classification: 'icd10',
    code: spec.code,
    name_de: spec.name_de,
    crosswalkKey: spec.crosswalkKey,
    sourceRef: spec.sourceRef,
    version: 1,
    status: 'draft',
    codingSystems: spec.codingSystems,
    differentials_de: spec.differentials_de,
    groups,
  }
}

// Shared regexes for organic/neurocognitive gaps.
const MEMORY_DECLINE = /ged[äa]chtnis|merkf[äa]hig|amnesie|vergess|einpr[äa]g|neuged[äa]chtnis|erinnerung/i
const COGNITIVE_DECLINE = /kognitiv|aphas|apraxi|agnos|exekutiv|urteilsverm|abstrakt|wortfindung|planung|denkverlangsam/i
const FUNCTIONAL = /alltag|beeintr[äa]cht|selbstversorgung|funktionsverlust|haushalt|berufsf[äa]hig|pflegebed/i

export interface DementiaInOtherDiseaseSpec {
  id: string
  code: string
  name_de: string
  diseaseText_de: string
  sourceRef: string
  codingSystems: CodingCrosswalk
  differentials_de: string[]
}

/** F02.x — dementia attributable to another classified disease. */
export function dementiaInOtherDisease(spec: DementiaInOtherDiseaseSpec): Disorder {
  const prefix = idp(spec.code)
  return {
    id: spec.id,
    classification: 'icd10',
    code: spec.code,
    name_de: spec.name_de,
    crosswalkKey: spec.code,
    sourceRef: spec.sourceRef,
    version: 1,
    status: 'draft',
    codingSystems: spec.codingSystems,
    differentials_de: spec.differentials_de,
    groups: [
      {
        id: `${prefix}.cognition`,
        label_de: 'Demenzsyndrom',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 180 },
        criteria: [
          {
            id: `${prefix}.memory_decline`,
            text_de:
              'Nachlassen des Gedächtnisses und/oder anderer kognitiver Funktionen, das die Alltagsbewältigung beeinträchtigt',
            citation: [{ classification: 'icd10', code: spec.code }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('memory_cognition', MEMORY_DECLINE, /ged[äa]chtnis.*(unauff[äa]llig|intakt)/i),
          },
          {
            id: `${prefix}.cognitive_decline`,
            text_de: 'Abnahme höherer kognitiver Funktionen gegenüber dem früheren Leistungsniveau',
            citation: [{ classification: 'icd10', code: spec.code }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('memory_cognition', COGNITIVE_DECLINE),
          },
          {
            id: `${prefix}.functional_impact`,
            text_de: 'Beeinträchtigung der Bewältigung von Alltagsaktivitäten infolge des kognitiven Abbaus',
            citation: [{ classification: 'icd10', code: spec.code }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('functional_impairment', FUNCTIONAL),
          },
        ],
      },
      {
        id: `${prefix}.aetiology`,
        label_de: 'Ätiologische Zuordnung',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.underlying_disease`,
            text_de: spec.diseaseText_de,
            citation: [{ classification: 'icd10', code: spec.code }],
            mappingHints: [{ kind: 'diagnosis', ref: 'aetiology' }],
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
            id: `${prefix}.exclude_delirium`,
            text_de: 'Keine Bewusstseinstrübung, die auf ein Delir hinweisen würde',
            citation: [{ classification: 'icd10', code: spec.code }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'consciousness_orientation' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  }
}

export interface OrganicSecondarySyndromeSpec {
  id: string
  code: string
  name_de: string
  syndromeText_de: string
  sourceRef: string
  codingSystems: CodingCrosswalk
  differentials_de: string[]
  domain: IsdmPhenomenologyDomain
  presentMatch: RegExp
  absentMatch?: RegExp
}

/** F06.x — mental disorder secondary to brain damage/dysfunction/physical disease. */
export function organicSecondarySyndrome(spec: OrganicSecondarySyndromeSpec): Disorder {
  const prefix = idp(spec.code)
  return {
    id: spec.id,
    classification: 'icd10',
    code: spec.code,
    name_de: spec.name_de,
    crosswalkKey: spec.code,
    sourceRef: spec.sourceRef,
    version: 1,
    status: 'draft',
    codingSystems: spec.codingSystems,
    differentials_de: spec.differentials_de,
    groups: [
      {
        id: `${prefix}.syndrome`,
        label_de: 'Klinisches Syndrom',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.clinical_picture`,
            text_de: spec.syndromeText_de,
            citation: [{ classification: 'icd10', code: spec.code }],
            mappingHints: [{ kind: 'isdm_domain', ref: spec.domain, deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal(spec.domain, spec.presentMatch, spec.absentMatch),
          },
          {
            id: `${prefix}.organic_cause`,
            text_de:
              'Nachweis oder begründete Annahme einer ursächlichen körperlichen, zerebralen oder systemischen Erkrankung, die das psychische Syndrom erklären kann',
            citation: [{ classification: 'icd10', code: spec.code }],
            mappingHints: [{ kind: 'diagnosis', ref: 'aetiology' }],
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
            id: `${prefix}.exclude_primary`,
            text_de: 'Das Syndrom ist nicht besser durch eine primäre psychische Störung oder durch Substanzwirkung allein erklärbar',
            citation: [{ classification: 'icd10', code: spec.code }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  }
}

export interface ParaphiliaSpec {
  id: string
  code: string
  name_de: string
  preferenceText_de: string
  sourceRef: string
  codingSystems: CodingCrosswalk
  differentials_de: string[]
}

/** F65.x — disorder of sexual preference (paraphilia). */
export function paraphiliaDisorder(spec: ParaphiliaSpec): Disorder {
  const prefix = idp(spec.code)
  return {
    id: spec.id,
    classification: 'icd10',
    code: spec.code,
    name_de: spec.name_de,
    crosswalkKey: spec.code,
    sourceRef: spec.sourceRef,
    version: 1,
    status: 'draft',
    codingSystems: spec.codingSystems,
    differentials_de: spec.differentials_de,
    groups: [
      {
        id: `${prefix}.preference`,
        label_de: 'Sexuelle Präferenz und Verhalten',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.recurrent_preference`,
            text_de: spec.preferenceText_de,
            citation: [{ classification: 'icd10', code: spec.code }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.distress_impairment`,
            text_de:
              'Die Präferenz führt zu persönlichem Leidensdruck und/oder zu Beeinträchtigungen in sozialen, beruflichen oder anderen wichtigen Funktionsbereichen, oder es besteht ein Risiko einer Schädigung Dritter',
            citation: [{ classification: 'icd10', code: spec.code }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('functional_impairment', /beeintr[äa]chtig|leidensdruck|konflikt|strafrecht/i),
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
            id: `${prefix}.exclude_consensual_adult`,
            text_de:
              'Bei einvernehmlichen sexuellen Praktiken zwischen Erwachsenen ohne Leidensdruck oder Beeinträchtigung ist keine Störung anzunehmen',
            citation: [{ classification: 'icd10', code: spec.code }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  }
}
