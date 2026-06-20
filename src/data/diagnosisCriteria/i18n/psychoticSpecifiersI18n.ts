/** ICD-11 6A25 psychotic symptom specifier translations (en/fr/es). */

import type { DisorderTranslationMap } from './types'

const SPECIFIER_IDS = [
  'psychotic_positive_symptoms',
  'psychotic_negative_symptoms',
  'psychotic_depressive_mood_symptoms',
  'psychotic_manic_mood_symptoms',
  'psychotic_psychomotor_symptoms',
  'psychotic_cognitive_symptoms',
] as const

function enEntry(
  id: (typeof SPECIFIER_IDS)[number],
  name: string,
  cluster: string,
  icd11: string,
): DisorderTranslationMap[string] {
  const p = icd11.toLowerCase().replace(/\./g, '_')
  return {
    name,
    differentials: [
      'Schizophrenia (6A20) — when the full syndrome is met',
      'Acute and transient psychotic disorder (6A23)',
      'Substance- or medication-induced psychotic disorder',
      'Mood disorder with psychotic symptoms',
    ],
    groups: {
      [`${id}.f29_anchor`]: 'Psychotic symptomatology (ICD-10 anchor)',
      [`${p}.core`]: 'Dominant symptom cluster (6A25 qualifier)',
      [`${p}.exclusions`]: 'Exclusions',
    },
    criteria: {
      [`${id}.f29_symptoms`]: 'Psychotic symptomatology is present; for ICD-11 the 6A25 qualifier is coded separately',
      [`${p}.symptom_cluster`]: cluster,
      [`${p}.primary_psychosis_context`]: 'Symptoms occur in the context of a primary psychotic disorder and are documented as a qualifier of the current episode',
      [`${p}.exclude_substance_organic`]: 'The symptom cluster is not better explained by a psychoactive substance, medication or organic cause alone',
    },
  }
}

export const enPsychoticSpecifiers: DisorderTranslationMap = {
  psychotic_positive_symptoms: enEntry(
    'psychotic_positive_symptoms',
    'Positive symptoms in primary psychotic disorders',
    'Dominant positive symptoms (delusions, hallucinations, disorganisation) are pronounced and clinically leading in the current episode',
    '6A25.0',
  ),
  psychotic_negative_symptoms: enEntry(
    'psychotic_negative_symptoms',
    'Negative symptoms in primary psychotic disorders',
    'Dominant negative symptoms (affective flattening, reduced drive and spontaneity, social withdrawal, alogia) are pronounced and clinically leading in the current episode',
    '6A25.1',
  ),
  psychotic_depressive_mood_symptoms: enEntry(
    'psychotic_depressive_mood_symptoms',
    'Depressive mood symptoms in primary psychotic disorders',
    'Depressive mood symptoms (low mood, hopelessness, anhedonia) are prominent and clinically leading within the psychotic episode',
    '6A25.2',
  ),
  psychotic_manic_mood_symptoms: enEntry(
    'psychotic_manic_mood_symptoms',
    'Manic mood symptoms in primary psychotic disorders',
    'Manic mood symptoms (elevated or irritable mood, increased drive) are prominent and clinically leading within the psychotic episode',
    '6A25.3',
  ),
  psychotic_psychomotor_symptoms: enEntry(
    'psychotic_psychomotor_symptoms',
    'Psychomotor symptoms in primary psychotic disorders',
    'Psychomotor symptoms (agitation, rigidity, posturing, mutism or catatonic phenomena) are pronounced and clinically leading in the current episode',
    '6A25.4',
  ),
  psychotic_cognitive_symptoms: enEntry(
    'psychotic_cognitive_symptoms',
    'Cognitive symptoms in primary psychotic disorders',
    'Cognitive symptoms (attention and memory impairment, slowing, executive dysfunction) are pronounced and clinically leading in the current episode',
    '6A25.5',
  ),
}

function frEntry(
  id: (typeof SPECIFIER_IDS)[number],
  name: string,
  cluster: string,
  icd11: string,
): DisorderTranslationMap[string] {
  const p = icd11.toLowerCase().replace(/\./g, '_')
  return {
    name,
    differentials: [
      'Schizophrénie (6A20) — lorsque le syndrome complet est rempli',
      'Trouble psychotique aigu et transitoire (6A23)',
      'Trouble psychotique induit par une substance ou un médicament',
      'Trouble de l’humeur avec symptômes psychotiques',
    ],
    groups: {
      [`${id}.f29_anchor`]: 'Symptomatologie psychotique (ancrage CIM-10)',
      [`${p}.core`]: 'Cluster symptomatique dominant (qualifiant 6A25)',
      [`${p}.exclusions`]: 'Exclusions',
    },
    criteria: {
      [`${id}.f29_symptoms`]: 'Une symptomatologie psychotique est présente ; en CIM-11 le qualifiant 6A25 est codé séparément',
      [`${p}.symptom_cluster`]: cluster,
      [`${p}.primary_psychosis_context`]: 'La symptomatologie survient dans le cadre d’un trouble psychotique primaire et est documentée comme qualifiant de l’épisode actuel',
      [`${p}.exclude_substance_organic`]: 'Le cluster symptomatique ne s’explique pas mieux par une substance psychoactive, un médicament ou une cause organique seule',
    },
  }
}

export const frPsychoticSpecifiers: DisorderTranslationMap = {
  psychotic_positive_symptoms: frEntry(
    'psychotic_positive_symptoms',
    'Symptômes positifs dans les troubles psychotiques primaires',
    'Des symptômes positifs dominants (délire, hallucinations, désorganisation) sont marqués et cliniquement prépondérants dans l’épisode actuel',
    '6A25.0',
  ),
  psychotic_negative_symptoms: frEntry(
    'psychotic_negative_symptoms',
    'Symptômes négatifs dans les troubles psychotiques primaires',
    'Des symptômes négatifs dominants (aplatissement affectif, diminution de l’élan et de la spontanéité, retrait social, alogie) sont marqués et cliniquement prépondérants',
    '6A25.1',
  ),
  psychotic_depressive_mood_symptoms: frEntry(
    'psychotic_depressive_mood_symptoms',
    'Symptômes thymiques dépressifs dans les troubles psychotiques primaires',
    'Des symptômes thymiques dépressifs (humeur abattue, désespoir, anhédonie) sont prépondérants et cliniquement dominants dans l’épisode psychotique',
    '6A25.2',
  ),
  psychotic_manic_mood_symptoms: frEntry(
    'psychotic_manic_mood_symptoms',
    'Symptômes thymiques maniaques dans les troubles psychotiques primaires',
    'Des symptômes thymiques maniaques (humeur élevée ou irritable, élan accru) sont prépondérants et cliniquement dominants dans l’épisode psychotique',
    '6A25.3',
  ),
  psychotic_psychomotor_symptoms: frEntry(
    'psychotic_psychomotor_symptoms',
    'Symptômes psychomoteurs dans les troubles psychotiques primaires',
    'Des symptômes psychomoteurs (agitation, rigidité, posture, mutisme ou phénomènes catatoniques) sont marqués et cliniquement prépondérants',
    '6A25.4',
  ),
  psychotic_cognitive_symptoms: frEntry(
    'psychotic_cognitive_symptoms',
    'Symptômes cognitifs dans les troubles psychotiques primaires',
    'Des symptômes cognitifs (troubles de l’attention et de la mémoire, ralentissement, dysfonction exécutive) sont marqués et cliniquement prépondérants',
    '6A25.5',
  ),
}

function esEntry(
  id: (typeof SPECIFIER_IDS)[number],
  name: string,
  cluster: string,
  icd11: string,
): DisorderTranslationMap[string] {
  const p = icd11.toLowerCase().replace(/\./g, '_')
  return {
    name,
    differentials: [
      'Esquizofrenia (6A20) — cuando se cumple el síndrome completo',
      'Trastorno psicótico agudo y transitorio (6A23)',
      'Trastorno psicótico inducido por sustancias o medicamentos',
      'Trastorno del estado de ánimo con síntomas psicóticos',
    ],
    groups: {
      [`${id}.f29_anchor`]: 'Sintomatología psicótica (ancla CIE-10)',
      [`${p}.core`]: 'Cluster sintomático dominante (calificador 6A25)',
      [`${p}.exclusions`]: 'Exclusiones',
    },
    criteria: {
      [`${id}.f29_symptoms`]: 'Hay sintomatología psicótica; en CIE-11 el calificador 6A25 se codifica por separado',
      [`${p}.symptom_cluster`]: cluster,
      [`${p}.primary_psychosis_context`]: 'La sintomatología aparece en el contexto de un trastorno psicótico primario y se documenta como calificador del episodio actual',
      [`${p}.exclude_substance_organic`]: 'El cluster sintomático no se explica mejor por una sustancia psicoactiva, un medicamento o una causa orgánica por sí solos',
    },
  }
}

export const esPsychoticSpecifiers: DisorderTranslationMap = {
  psychotic_positive_symptoms: esEntry(
    'psychotic_positive_symptoms',
    'Síntomas positivos en trastornos psicóticos primarios',
    'Síntomas positivos dominantes (delirio, alucinaciones, desorganización) están acentuados y son clínicamente predominantes en el episodio actual',
    '6A25.0',
  ),
  psychotic_negative_symptoms: esEntry(
    'psychotic_negative_symptoms',
    'Síntomas negativos en trastornos psicóticos primarios',
    'Síntomas negativos dominantes (aplanamiento afectivo, disminución del impulso y la espontaneidad, retraimiento social, alogia) están acentuados y son clínicamente predominantes',
    '6A25.1',
  ),
  psychotic_depressive_mood_symptoms: esEntry(
    'psychotic_depressive_mood_symptoms',
    'Síntomas de ánimo depresivo en trastornos psicóticos primarios',
    'Síntomas de ánimo depresivo (ánimo bajo, desesperanza, anhedonia) son prominentes y clínicamente predominantes en el episodio psicótico',
    '6A25.2',
  ),
  psychotic_manic_mood_symptoms: esEntry(
    'psychotic_manic_mood_symptoms',
    'Síntomas de ánimo maníaco en trastornos psicóticos primarios',
    'Síntomas de ánimo maníaco (ánimo elevado o irritable, impulso aumentado) son prominentes y clínicamente predominantes en el episodio psicótico',
    '6A25.3',
  ),
  psychotic_psychomotor_symptoms: esEntry(
    'psychotic_psychomotor_symptoms',
    'Síntomas psicomotores en trastornos psicóticos primarios',
    'Síntomas psicomotores (agitación, rigidez, postura, mutismo o fenómenos catatónicos) están acentuados y son clínicamente predominantes',
    '6A25.4',
  ),
  psychotic_cognitive_symptoms: esEntry(
    'psychotic_cognitive_symptoms',
    'Síntomas cognitivos en trastornos psicóticos primarios',
    'Síntomas cognitivos (alteración de atención y memoria, enlentecimiento, disfunción ejecutiva) están acentuados y son clínicamente predominantes',
    '6A25.5',
  ),
}
