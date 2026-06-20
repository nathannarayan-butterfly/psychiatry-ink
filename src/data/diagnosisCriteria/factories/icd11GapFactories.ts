/**
 * Phase B — native ICD-11 trees for crosswalk-gap and childhood-onset disorders
 * where ICD-11 structure diverges from the ICD-10 fallback tree.
 *
 * All records remain `status: 'draft'`.
 */

import type { Disorder, Icd11CriteriaSet } from '../schema'

function idp(code: string): string {
  return code.toLowerCase().replace(/\./g, '_')
}

function holdingCategorySet(code: string, coreLabel: string, idPrefix?: string): Icd11CriteriaSet {
  const prefix = idPrefix ?? idp(code)
  return {
    sourceRef: `operationalisiert nach ICD-11 ${code}`,
    groups: [
      {
        id: `${prefix}.core`,
        label_de: coreLabel,
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.clinical_presentation`,
            text_de:
              'Es liegt eine psychische, Verhaltens- oder neurodevelopmentale Symptomatik vor, die klinisch relevant ist und einer näheren Zuordnung bedarf',
            citation: [{ classification: 'icd11', code }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'general_presentation' }],
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.insufficient_specificity`,
            text_de:
              'Die vorliegenden Informationen reichen für eine spezifischere ICD-11-Diagnose nicht aus oder sind widersprüchlich (vorläufige bzw. Verlegenheitskategorie)',
            citation: [{ classification: 'icd11', code }],
            mappingHints: [{ kind: 'checklist', ref: 'diagnostic_uncertainty' }],
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
            id: `${prefix}.exclude_better_explained`,
            text_de:
              'Die Symptomatik ist nicht ausschließlich durch eine somatische Erkrankung, eine Substanzwirkung oder eine andere bereits spezifizierte psychische Störung erklärbar',
            citation: [{ classification: 'icd11', code }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  }
}

function neurocognitiveUnspecifiedSet(code: string): Icd11CriteriaSet {
  const prefix = idp(code)
  return {
    sourceRef: `operationalisiert nach ICD-11 ${code}`,
    groups: [
      {
        id: `${prefix}.syndrome`,
        label_de: 'Demenzsyndrom ohne näher bezeichnete Ursache',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.cognitive_decline`,
            text_de:
              'Erworbener Rückgang der Gedächtnisleistung und/oder anderer kognitiver Funktionen gegenüber dem früheren Niveau',
            citation: [{ classification: 'icd11', code }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'memory_cognition' }],
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.functional_impairment`,
            text_de:
              'Die kognitive Beeinträchtigung führt zu einer deutlichen Einschränkung der Selbstständigkeit im Alltag',
            citation: [{ classification: 'icd11', code }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.unknown_aetiology`,
            text_de:
              'Die zugrunde liegende Ursache der Demenz ist unbekannt oder kann zum Zeitpunkt der Diagnose nicht näher spezifiziert werden',
            citation: [{ classification: 'icd11', code }],
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
            text_de: 'Die Symptome treten nicht ausschließlich im Rahmen eines Delirs auf',
            citation: [{ classification: 'icd11', code }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'consciousness_orientation' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  }
}

function conductDisorderSet(): Icd11CriteriaSet {
  const code = '6C91'
  const prefix = idp(code)
  return {
    sourceRef: `operationalisiert nach ICD-11 ${code}`,
    groups: [
      {
        id: `${prefix}.dissocial_pattern`,
        label_de: 'Dissoziales oder aggressives Verhaltensmuster (mindestens 3 Merkmale über ≥ 12 Monate)',
        logic: 'at_least_n_of',
        threshold: 3,
        groupType: 'inclusion',
        timeWindow: { withinDays: 365 },
        criteria: [
          {
            id: `${prefix}.aggression`,
            text_de: 'Aggressives Verhalten gegenüber Menschen oder Tieren (z. B. Drohen, körperliche Auseinandersetzungen, Grausamkeit)',
            citation: [{ classification: 'icd11', code, ref: '1' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'risk_others' }],
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.destruction`,
            text_de: 'Vorsätzliche Zerstörung fremden Eigentums, einschließlich Brandstiftung',
            citation: [{ classification: 'icd11', code, ref: '2' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'risk_others' }],
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.deceit_theft`,
            text_de: 'Betrug, Lügen oder Diebstahl zum eigenen Vorteil oder zur Freude an der Verletzung anderer',
            citation: [{ classification: 'icd11', code, ref: '3' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'risk_others' }],
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.rule_violations`,
            text_de: 'Schwere Verletzung wesentlicher altersangemessener Regeln (z. B. Schulverweigerung, nächtliches Weglaufen)',
            citation: [{ classification: 'icd11', code, ref: '4' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'appearance_behavior' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: `${prefix}.impact`,
        label_de: 'Beeinträchtigung',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${prefix}.functional_impact`,
            text_de: 'Das Verhalten beeinträchtigt die soziale, schulische oder familiäre Funktionsfähigkeit deutlich',
            citation: [{ classification: 'icd11', code }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
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
            id: `${prefix}.exclude_other_primary`,
            text_de: 'Das Verhalten ist nicht ausschließlich im Rahmen einer anderen vorrangigen psychischen Störung erklärbar',
            citation: [{ classification: 'icd11', code }],
            mappingHints: [{ kind: 'checklist', ref: 'differential_review' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  }
}

function personalityChangeStressSet(): Icd11CriteriaSet {
  const code = '6B4Z'
  const prefix = idp(code)
  return {
    sourceRef: `operationalisiert nach ICD-11 ${code}`,
    groups: [
      {
        id: `${prefix}.stress_context`,
        label_de: 'Belastungsbezogener Kontext und dauerhafte Veränderung',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { withinDays: 365 },
        criteria: [
          {
            id: `${prefix}.catastrophic_stress`,
            text_de:
              'Eine extrem belastende Erfahrung (z. B. Katastrophe, längere Haft, Krieg) liegt zugrunde',
            citation: [{ classification: 'icd11', code, ref: 'A' }],
            mappingHints: [{ kind: 'checklist', ref: 'stress_exposure' }],
            allowClinicianAttest: true,
          },
          {
            id: `${prefix}.enduring_change`,
            text_de:
              'Dauerhafte, tiefgreifende Veränderung von Persönlichkeit, Verhalten oder emotionaler Regulation, die über eine akute Belastungsreaktion hinausgeht',
            citation: [{ classification: 'icd11', code, ref: 'B' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style' }],
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
            id: `${prefix}.exclude_organic`,
            text_de: 'Die Veränderung ist nicht Folge einer Hirnschädigung oder -krankheit',
            citation: [{ classification: 'icd11', code }],
            mappingHints: [{ kind: 'diagnosis', ref: 'aetiology' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  }
}

const GAP_ICD11_BY_ID: Record<string, Icd11CriteriaSet> = {
  other_nonorganic_psychosis: holdingCategorySet('6A2Y', 'Primäre psychotische Störung, sonstige näher bezeichnete Form'),
  unspecified_nonorganic_psychosis: holdingCategorySet('6A2Z', 'Primäre psychotische Störung ohne ausreichende Spezifität'),
  other_persistent_mood_disorder: holdingCategorySet('6A6Y', 'Anhaltende Stimmungsstörung, sonstige näher bezeichnete Form'),
  other_mood_disorder: holdingCategorySet('6A7Y', 'Affektive Störung, sonstige näher bezeichnete Form'),
  unspecified_mood_disorder: holdingCategorySet('6A7Z', 'Affektive Störung ohne ausreichende Spezifität'),
  unspecified_dementia: neurocognitiveUnspecifiedSet('6D8Z'),
  unspecified_organic_mental_disorder: holdingCategorySet('6E0Z', 'Organische oder symptomatische psychische Störung ohne ausreichende Spezifität'),
  other_anxiety_disorders_stem: holdingCategorySet('6B4Y', 'Angst- oder furchtbezogene Störung, sonstige näher bezeichnete Form'),
  other_neurotic_disorders_stem: holdingCategorySet('6E8Y', 'Psychische Störung mit stressassoziiertem Kontext, sonstige Form'),
  unspecified_behavioural_syndrome: holdingCategorySet(
    '6E8Z',
    'Verhaltenssyndrom mit physiologischen Störungen ohne ausreichende Spezifität',
    '6e8z_f59',
  ),
  personality_change_catastrophic: personalityChangeStressSet(),
  other_adult_personality_behaviour_stem: holdingCategorySet('6D1Y', 'Persönlichkeitsstörung oder verwandte Störung, sonstige näher bezeichnete Form'),
  other_psychological_development_disorder: holdingCategorySet('6A0Y', 'Störung der psychologischen Entwicklung, sonstige näher bezeichnete Form'),
  unspecified_psychological_development_disorder: holdingCategorySet('6A0Z', 'Störung der psychologischen Entwicklung ohne ausreichende Spezifität'),
  unspecified_mental_disorder: holdingCategorySet(
    '6E8Z',
    'Psychische, Verhaltens- oder neurodevelopmentale Störung ohne ausreichende Spezifität',
    '6e8z_f99',
  ),
  conduct_disorder: conductDisorderSet(),
}

/** Attach Phase B native ICD-11 trees for known gap disorders (skips disorders with merged LLM trees). */
export function attachGapIcd11Trees(disorders: Disorder[]): Disorder[] {
  return disorders.map((disorder) => {
    if (disorder.icd11?.groups?.length) return disorder
    const icd11 = GAP_ICD11_BY_ID[disorder.id]
    return icd11 ? { ...disorder, icd11 } : disorder
  })
}

export function attachGapIcd11Tree(disorder: Disorder): Disorder {
  return attachGapIcd11Trees([disorder])[0]!
}
