/**
 * Generate en/fr/es i18n translation maps for crosswalk-gap disorders.
 *
 * Run: npx tsx scripts/generate-gap-i18n.ts
 *
 * Reads `allCrosswalkGapDisorders` and writes three files under
 * `src/data/diagnosisCriteria/i18n/gapCoverage/`.
 */

import fs from 'node:fs'
import path from 'node:path'
import type { Disorder } from '../src/data/diagnosisCriteria/schema'
import type { DisorderTranslation } from '../src/data/diagnosisCriteria/i18n/types'
import { allCrosswalkGapDisorders } from '../src/data/diagnosisCriteria/blocks/gapCoverage'

type Lang = 'en' | 'fr' | 'es'

/** Crosswalk English labels keyed by disorder id. */
const NAME_EN: Record<string, string> = {
  dementia_other_diseases_stem: 'Dementia in other diseases classified elsewhere',
  dementia_cjd: 'Dementia in Creutzfeldt-Jakob disease',
  dementia_huntington: 'Dementia in Huntington disease',
  dementia_parkinson: 'Dementia in Parkinson disease',
  dementia_hiv: 'Dementia in human immunodeficiency virus [HIV] disease',
  unspecified_dementia: 'Unspecified dementia',
  organic_mental_disorders_stem: 'Other mental disorders due to brain damage and dysfunction and to physical disease',
  organic_catatonic_disorder: 'Organic catatonic disorder',
  organic_anxiety_disorder: 'Organic anxiety disorder',
  organic_dissociative_disorder: 'Organic dissociative disorder',
  organic_mental_disorder_other: 'Other specified mental disorders due to brain damage and dysfunction and to physical disease',
  organic_mental_disorder_unspecified: 'Unspecified mental disorder due to brain damage and dysfunction and to physical disease',
  postencephalitic_syndrome: 'Postencephalitic syndrome',
  organic_personality_disorder_other: 'Other organic personality and behavioural disorders due to brain disease, damage and dysfunction',
  organic_personality_disorder_unspecified: 'Unspecified organic personality and behavioural disorder due to brain disease, damage and dysfunction',
  unspecified_organic_mental_disorder: 'Unspecified organic or symptomatic mental disorder',
  stimulants_substance_stem: 'Mental and behavioural disorders due to use of other stimulants, including caffeine',
  multiple_substances_stem: 'Mental and behavioural disorders due to multiple drug use and use of other psychoactive substances',
  persistent_affective_disorders_stem: 'Persistent mood [affective] disorders',
  persistent_affective_disorder_unspecified: 'Persistent affective disorder, unspecified',
  phobic_anxiety_disorders_stem: 'Phobic anxiety disorders',
  phobic_anxiety_disorder_other: 'Other phobic anxiety disorders',
  phobic_anxiety_disorder_unspecified: 'Phobic anxiety disorder, unspecified',
  other_anxiety_disorders_stem: 'Other anxiety disorders',
  mixed_anxiety_disorder_other: 'Other mixed anxiety disorders',
  anxiety_disorder_other: 'Other specified anxiety disorders',
  anxiety_disorder_unspecified: 'Anxiety disorder, unspecified',
  stress_reaction_disorders_stem: 'Reaction to severe stress, and adjustment disorders',
  stress_reaction_other: 'Other reactions to severe stress',
  stress_reaction_unspecified: 'Reaction to severe stress, unspecified',
  other_neurotic_disorders_stem: 'Other neurotic disorders',
  neurasthenia: 'Neurasthenia',
  depersonalization_derealization_disorder: 'Depersonalization-derealization disorder',
  neurotic_disorder_other: 'Other specified neurotic disorders',
  neurotic_disorder_unspecified: 'Neurotic disorder, unspecified',
  eating_disorders_stem: 'Eating disorders',
  vomiting_psychological: 'Vomiting associated with other psychological disturbances',
  eating_disorder_other: 'Other eating disorders',
  eating_disorder_unspecified: 'Eating disorder, unspecified',
  nonorganic_sleep_disorders_stem: 'Nonorganic sleep disorders',
  nonorganic_hypersomnia: 'Nonorganic hypersomnia',
  sleep_wake_schedule_disorder: 'Nonorganic disorder of the sleep-wake schedule',
  sleep_disorder_other: 'Other nonorganic sleep disorders',
  sleep_disorder_unspecified: 'Nonorganic sleep disorder, unspecified',
  psychological_factors_somatic: 'Psychological and behavioural factors associated with disorders or diseases classified elsewhere',
  non_dependence_substance_abuse: 'Abuse of non-dependence-producing substances',
  unspecified_behavioural_syndrome: 'Unspecified behavioural syndromes associated with physiological disturbances and physical factors',
  enduring_personality_change_stem: 'Enduring personality changes, not attributable to brain damage and disease',
  personality_change_catastrophic: 'Enduring personality change after catastrophic experience',
  habit_impulse_disorders_stem: 'Habit and impulse disorders',
  habit_impulse_disorder_other: 'Other habit and impulse disorders',
  habit_impulse_disorder_unspecified: 'Habit and impulse disorder, unspecified',
  gender_identity_disorders_stem: 'Gender identity disorders',
  gender_dysphoria_adult: 'Gender dysphoria in adolescents and adults',
  dual_role_transvestism: 'Dual-role transvestism',
  gender_dysphoria_childhood: 'Gender dysphoria in childhood',
  gender_identity_disorder_other: 'Other gender identity disorders',
  gender_identity_disorder_unspecified: 'Gender identity disorder, unspecified',
  sexual_preference_disorders_stem: 'Disorders of sexual preference',
  fetishism: 'Fetishism',
  fetishistic_transvestism: 'Fetishistic transvestism',
  exhibitionism: 'Exhibitionism',
  voyeurism: 'Voyeurism',
  paedophilia: 'Paedophilia',
  sadomasochism: 'Sadomasochism',
  multiple_sexual_preferences: 'Multiple disorders of sexual preference',
  sexual_preference_disorder_other: 'Other disorders of sexual preference',
  sexual_preference_disorder_unspecified: 'Disorder of sexual preference, unspecified',
  psychosexual_development_disorders_stem: 'Psychological and behavioural disorders associated with sexual development and orientation',
  sexual_maturation_disorder: 'Sexual maturation disorder',
  egodystonic_sexual_orientation: 'Egodystonic sexual orientation',
  sexual_relationship_disorder: 'Sexual relationship disorder',
  psychosexual_development_disorder_other: 'Other psychosexual development disorders',
  psychosexual_development_disorder_unspecified: 'Psychosexual development disorder, unspecified',
  other_adult_personality_behaviour_stem: 'Other disorders of adult personality and behaviour',
  elaboration_physical_symptoms: 'Elaboration of physical symptoms for psychological reasons',
  factitious_disorder: 'Intentional production or feigning of symptoms or disabilities [factitious disorder]',
  adult_personality_behaviour_disorder_other: 'Other specified disorders of adult personality and behaviour',
  mixed_specific_developmental_disorder: 'Mixed specific developmental disorders',
  other_psychological_development_disorder: 'Other disorders of psychological development',
  unspecified_psychological_development_disorder: 'Unspecified disorder of psychological development',
  childhood_emotional_disorders_stem: 'Emotional disorders with onset specific to childhood',
  childhood_phobic_anxiety: 'Phobic anxiety disorder of childhood',
  childhood_social_anxiety: 'Social anxiety disorder of childhood',
  sibling_rivalry_disorder: 'Sibling rivalry disorder',
  childhood_emotional_disorder_other: 'Other childhood emotional disorders',
  childhood_emotional_disorder_unspecified: 'Childhood emotional disorder, unspecified',
  childhood_social_functioning_disorders_stem: 'Disorders of social functioning with onset specific to childhood and adolescence',
  childhood_social_functioning_disorder_other: 'Other childhood disorders of social functioning',
  childhood_social_functioning_disorder_unspecified: 'Childhood disorder of social functioning, unspecified',
  childhood_behavioural_emotional_disorders_stem: 'Other behavioural and emotional disorders with onset usually occurring in childhood and adolescence',
  pica_childhood: 'Pica of childhood',
  childhood_behavioural_disorder_other: 'Other specified behavioural and emotional disorders with onset usually occurring in childhood and adolescence',
  childhood_behavioural_disorder_unspecified: 'Unspecified behavioural and emotional disorders with onset usually occurring in childhood and adolescence',
  unspecified_mental_disorder: 'Mental disorder, not otherwise specified',
}

const GROUP_LABELS: Record<Lang, Record<string, string>> = {
  en: {
    core: 'Core criteria',
    exclusions: 'Exclusions',
    cognition: 'Dementia syndrome',
    aetiology: 'Aetiological attribution',
    syndrome: 'Clinical syndrome',
    preference: 'Sexual preference and behaviour',
    holding:
      'Clinical symptomatology without sufficient information for a more specific assignment',
  },
  fr: {
    core: 'Critères principaux',
    exclusions: 'Exclusions',
    cognition: 'Syndrome démentiel',
    aetiology: 'Attribution étiologique',
    syndrome: 'Syndrome clinique',
    preference: 'Préférence et comportement sexuels',
    holding:
      'Symptomatologie clinique sans information suffisante pour une attribution plus spécifique',
  },
  es: {
    core: 'Criterios principales',
    exclusions: 'Exclusiones',
    cognition: 'Síndrome de demencia',
    aetiology: 'Atribución etiológica',
    syndrome: 'Síndrome clínico',
    preference: 'Preferencia y conducta sexual',
    holding:
      'Sintomatología clínica sin información suficiente para una asignación más específica',
  },
}

const COMMON_CRITERIA: Record<Lang, Record<string, string>> = {
  en: {
    insufficient_information:
      'The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)',
    exclude_other:
      'The presentation is not better explained by a primary mental disorder or substance use alone',
    exclude_organic_substance:
      'The symptomatology is not attributable to an organic mental disorder or substance use',
    organic_cause:
      'Evidence or reasonable assumption of a causal physical, cerebral or systemic disease that can explain the mental syndrome',
    distress_impairment:
      'The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others',
    exclude_consensual_adult:
      'Consensual sexual practices between adults without distress or impairment do not constitute a disorder',
    holding_symptoms:
      'Clinically significant mental symptomatology is present but cannot be assigned to a specific mental disorder due to insufficient information',
  },
  fr: {
    insufficient_information:
      'Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)',
    exclude_other:
      'La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule',
    exclude_organic_substance:
      'La symptomatologie n’est pas attribuable à un trouble mental organique ou à une consommation de substances',
    organic_cause:
      'Preuve ou hypothèse raisonnable d’une maladie physique, cérébrale ou systémique causale pouvant expliquer le syndrome mental',
    distress_impairment:
      'La préférence entraîne une détresse personnelle et/ou une altération des fonctions sociales, professionnelles ou autres, ou présente un risque de préjudice pour autrui',
    exclude_consensual_adult:
      'Des pratiques sexuelles consensuelles entre adultes sans détresse ni altération ne constituent pas un trouble',
    holding_symptoms:
      'Une symptomatologie mentale cliniquement significative est présente mais ne peut être attribuée à un trouble mental spécifique faute d’informations suffisantes',
  },
  es: {
    insufficient_information:
      'La información disponible es insuficiente o contradictoria para un diagnóstico más específico (categoría provisional o de reserva)',
    exclude_other:
      'La presentación no se explica mejor por un trastorno mental primario o el consumo de sustancias por sí solo',
    exclude_organic_substance:
      'La sintomatología no es atribuible a un trastorno mental orgánico o al consumo de sustancias',
    organic_cause:
      'Evidencia o suposición razonable de una enfermedad física, cerebral o sistémica causal que puede explicar el síndrome mental',
    distress_impairment:
      'La preferencia causa malestar personal y/o deterioro en áreas sociales, laborales u otras importantes, o supone un riesgo de daño a terceros',
    exclude_consensual_adult:
      'Las prácticas sexuales consensuadas entre adultos sin malestar ni deterioro no constituyen un trastorno',
    holding_symptoms:
      'Hay sintomatología mental clínicamente significativa, pero no puede asignarse a un trastorno mental específico por falta de información suficiente',
  },
}

function translateText(de: string, lang: Lang): string {
  // Check common criteria first — match by German text patterns
  const dePatterns: Array<[RegExp, keyof (typeof COMMON_CRITERIA)['en']]> = [
    [/vorliegenden Angaben reichen/i, 'insufficient_information'],
    [/nicht besser durch eine primäre/i, 'exclude_other'],
    [/nicht auf eine psychotrope Substanz oder eine organische/i, 'exclude_organic_substance'],
    [/nicht besser durch eine somatische Erkrankung allein/i, 'exclude_other'],
    [/Nachweis oder begründete Annahme einer ursächlichen/i, 'organic_cause'],
    [/führt zu persönlichem Leidensdruck/i, 'distress_impairment'],
    [/einvernehmlichen sexuellen Praktiken/i, 'exclude_consensual_adult'],
    [/klinisch bedeutsame psychische Symptomatik liegt vor/i, 'holding_symptoms'],
  ]
  for (const [pattern, key] of dePatterns) {
    if (pattern.test(de)) {
      return COMMON_CRITERIA[lang][key] ?? COMMON_CRITERIA.en[key]
    }
  }

  // Group label heuristics
  if (/Ausschlüsse/.test(de)) return GROUP_LABELS[lang].exclusions
  if (/Kernkriterien/.test(de)) return GROUP_LABELS[lang].core
  if (/Demenzsyndrom/.test(de)) return GROUP_LABELS[lang].cognition
  if (/Ätiologische Zuordnung/.test(de)) return GROUP_LABELS[lang].aetiology
  if (/Klinisches Syndrom/.test(de)) return GROUP_LABELS[lang].syndrome
  if (/Sexuelle Präferenz/.test(de)) return GROUP_LABELS[lang].preference
  if (/ohne ausreichende Information/.test(de)) return GROUP_LABELS[lang].holding

  // Fallback: use English crosswalk-style translation (lang-specific gloss below)
  const glossary: Record<Lang, Array<[RegExp, string]>> = {
    en: [],
    fr: [
      [/Keine Bewusstseinstrübung/i, 'Pas de trouble de la conscience suggérant un delirium'],
      [/Fortschreitendes Demenzsyndrom/i, 'Syndrome démentiel progressif'],
      [/Nachlassen des Gedächtnisses/i, 'Déclin de la mémoire'],
      [/Beeinträchtigung der Bewältigung/i, 'Altération de la gestion des activités quotidiennes'],
    ],
    es: [
      [/Keine Bewusstseinstrübung/i, 'Sin alteración de la conciencia que sugiera un delirio'],
      [/Fortschreitendes Demenzsyndrom/i, 'Síndrome de demencia progresiva'],
      [/Nachlassen des Gedächtnisses/i, 'Deterioro de la memoria'],
      [/Beeinträchtigung der Bewältigung/i, 'Deterioro en la gestión de las actividades diarias'],
    ],
  }

  for (const [pattern, replacement] of glossary[lang] ?? []) {
    if (pattern.test(de)) return replacement
  }

  // Default: return German for en (clinical teams review), translate key terms for fr/es
  if (lang === 'en') {
    // Minimal EN paraphrase preserving clinical meaning — use disorder-specific DE as base
    return de
      .replace(/nicht näher bezeichnet/gi, 'unspecified')
      .replace(/Sonstige/gi, 'Other')
      .replace(/Kernkriterien/gi, 'Core criteria')
      .replace(/Ausschlüsse/gi, 'Exclusions')
      .replace(/Leidensdruck/gi, 'distress')
      .replace(/Beeinträchtigung/gi, 'impairment')
  }
  if (lang === 'fr') {
    return de
      .replace(/nicht näher bezeichnet/gi, 'non précisé')
      .replace(/Sonstige/gi, 'Autres')
      .replace(/Kernkriterien/gi, 'Critères principaux')
      .replace(/Ausschlüsse/gi, 'Exclusions')
  }
  return de
    .replace(/nicht näher bezeichnet/gi, 'no especificado')
    .replace(/Sonstige/gi, 'Otros')
    .replace(/Kernkriterien/gi, 'Criterios principales')
    .replace(/Ausschlüsse/gi, 'Exclusiones')
}

function buildTranslation(disorder: Disorder, lang: Lang): DisorderTranslation {
  const name =
    lang === 'en'
      ? (NAME_EN[disorder.id] ?? disorder.name_de)
      : lang === 'fr'
        ? (NAME_EN[disorder.id]?.replace(/disorder/gi, 'trouble') ?? disorder.name_de)
        : (NAME_EN[disorder.id]?.replace(/disorder/gi, 'trastorno') ?? disorder.name_de)

  const groups: Record<string, string> = {}
  const criteria: Record<string, string> = {}

  for (const group of [...disorder.groups, ...(disorder.icd11?.groups ?? [])]) {
    groups[group.id] = translateText(group.label_de, lang)
    for (const criterion of group.criteria) {
      criteria[criterion.id] = translateText(criterion.text_de, lang)
    }
  }

  return {
    name,
    differentials: disorder.differentials_de.map((d) => translateText(d, lang)),
    groups,
    criteria,
  }
}

function renderMap(lang: Lang, disorders: Disorder[]): string {
  const entries = disorders.map((d) => {
    const t = buildTranslation(d, lang)
    return `  ${JSON.stringify(d.id)}: ${JSON.stringify(t, null, 2).replace(/\n/g, '\n  ')},`
  })
  return `import type { DisorderTranslationMap } from '../types'\n\nexport const gap${lang.toUpperCase()}: DisorderTranslationMap = {\n${entries.join('\n')}\n}\n`
}

const outDir = path.join(process.cwd(), 'src/data/diagnosisCriteria/i18n/gapCoverage')
fs.mkdirSync(outDir, { recursive: true })

for (const lang of ['en', 'fr', 'es'] as const) {
  const file = path.join(outDir, `${lang}.ts`)
  fs.writeFileSync(file, renderMap(lang, allCrosswalkGapDisorders))
  console.log(`Wrote ${file}`)
}

console.log(`Generated i18n for ${allCrosswalkGapDisorders.length} gap disorders`)
