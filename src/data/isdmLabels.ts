import type { EnglishVariant, UiLanguage } from '../types/settings'
import type { IsdmPhenomenologyDomain } from '../types/isdm'

type LocaleKey = UiLanguage | 'en_US'

export const localizedProfileLabels: Record<
  'international_structured_diagnostic_mapping',
  Record<LocaleKey, string>
> = {
  international_structured_diagnostic_mapping: {
    de: 'Internationale strukturierte diagnostische Zuordnung',
    en: 'International Structured Diagnostic Mapping',
    en_US: 'International Structured Diagnostic Mapping with DSM-5-TR support',
    fr: 'Cartographie diagnostique structurée internationale',
    es: 'Mapeo diagnóstico estructurado internacional',
  },
}

export function resolveLocaleKey(language: UiLanguage, englishVariant: EnglishVariant): LocaleKey {
  if (language === 'en' && englishVariant === 'us') return 'en_US'
  return language
}

export function getIsdmProfileLabel(
  language: UiLanguage,
  englishVariant: EnglishVariant = 'uk',
): string {
  const key = resolveLocaleKey(language, englishVariant)
  return localizedProfileLabels.international_structured_diagnostic_mapping[key]
}

export function getLocalClinicalStandardLabel(
  language: UiLanguage,
  englishVariant: EnglishVariant = 'uk',
): string {
  switch (language) {
    case 'de':
      return 'AMDP-orientiert'
    case 'en':
      return englishVariant === 'us' ? 'Mental Status Examination' : 'MSE / Mental State Examination'
    case 'fr':
      return 'Examen psychiatrique structuré'
    case 'es':
      return 'Exploración psicopatológica estructurada'
  }
}

const domainLabels: Record<IsdmPhenomenologyDomain, Record<LocaleKey, string>> = {
  appearance_behavior: {
    de: 'Erscheinungsbild und Verhalten',
    en: 'Appearance and behaviour',
    en_US: 'Appearance and behavior',
    fr: 'Apparence et comportement',
    es: 'Apariencia y conducta',
  },
  speech_language: {
    de: 'Sprache und Sprechverhalten',
    en: 'Speech and language',
    en_US: 'Speech and language',
    fr: 'Langage et parole',
    es: 'Lenguaje y habla',
  },
  consciousness_orientation: {
    de: 'Bewusstsein und Orientierung',
    en: 'Consciousness and orientation',
    en_US: 'Consciousness and orientation',
    fr: 'Conscience et orientation',
    es: 'Conciencia y orientación',
  },
  attention_concentration: {
    de: 'Aufmerksamkeit und Konzentration',
    en: 'Attention and concentration',
    en_US: 'Attention and concentration',
    fr: 'Attention et concentration',
    es: 'Atención y concentración',
  },
  memory_cognition: {
    de: 'Gedächtnis und Kognition',
    en: 'Memory and cognition',
    en_US: 'Memory and cognition',
    fr: 'Mémoire et cognition',
    es: 'Memoria y cognición',
  },
  mood_affect: {
    de: 'Stimmung und Affektivität',
    en: 'Mood and affect',
    en_US: 'Mood and affect',
    fr: 'Humeur et affect',
    es: 'Estado de ánimo y afecto',
  },
  drive_psychomotor_activity: {
    de: 'Antrieb und Psychomotorik',
    en: 'Drive and psychomotor activity',
    en_US: 'Drive and psychomotor activity',
    fr: 'Pulsion et activité psychomotrice',
    es: 'Impulso y actividad psicomotriz',
  },
  formal_thought_disorder: {
    de: 'Formales Denken',
    en: 'Formal thought processes',
    en_US: 'Formal thought processes',
    fr: 'Processus formels de la pensée',
    es: 'Procesos formales del pensamiento',
  },
  thought_content: {
    de: 'Inhaltliches Denken',
    en: 'Thought content',
    en_US: 'Thought content',
    fr: 'Contenu de la pensée',
    es: 'Contenido del pensamiento',
  },
  delusions_overvalued_ideas: {
    de: 'Wahn und überwertige Ideen',
    en: 'Delusions and overvalued ideas',
    en_US: 'Delusions and overvalued ideas',
    fr: 'Délires et idées survalorisées',
    es: 'Delirios e ideas sobrevaloradas',
  },
  perception_hallucinations: {
    de: 'Wahrnehmung und Halluzinationen',
    en: 'Perception and hallucinations',
    en_US: 'Perception and hallucinations',
    fr: 'Perception et hallucinations',
    es: 'Percepción y alucinaciones',
  },
  self_experience_ego_disturbance: {
    de: 'Ich-Störungen und Selbsterleben',
    en: 'Self-experience and ego disturbance',
    en_US: 'Self-experience and ego disturbance',
    fr: 'Vécu de soi et perturbation du moi',
    es: 'Experiencia del yo y perturbación del ego',
  },
  anxiety_panic_phobic_symptoms: {
    de: 'Angst, Panik und Phobien',
    en: 'Anxiety, panic and phobic symptoms',
    en_US: 'Anxiety, panic and phobic symptoms',
    fr: 'Anxiété, panique et symptômes phobiques',
    es: 'Ansiedad, pánico y síntomas fóbicos',
  },
  obsessions_compulsions: {
    de: 'Zwangssymptome',
    en: 'Obsessions and compulsions',
    en_US: 'Obsessions and compulsions',
    fr: 'Obsessions et compulsions',
    es: 'Obsesiones y compulsiones',
  },
  trauma_intrusions_dissociation: {
    de: 'Trauma, Intrusionen und Dissoziation',
    en: 'Trauma, intrusions and dissociation',
    en_US: 'Trauma, intrusions and dissociation',
    fr: 'Trauma, intrusions et dissociation',
    es: 'Trauma, intrusiones y disociación',
  },
  somatic_preoccupation: {
    de: 'Somatoforme Präoccupation',
    en: 'Somatic preoccupation',
    en_US: 'Somatic preoccupation',
    fr: 'Préoccupation somatique',
    es: 'Preocupación somática',
  },
  sleep_appetite_vegetative: {
    de: 'Schlaf, Appetit und vegetative Funktionen',
    en: 'Sleep, appetite and vegetative functions',
    en_US: 'Sleep, appetite and vegetative functions',
    fr: 'Sommeil, appétit et fonctions végétatives',
    es: 'Sueño, apetito y funciones vegetativas',
  },
  substance_related_features: {
    de: 'Substanzbezogene Merkmale',
    en: 'Substance-related features',
    en_US: 'Substance-related features',
    fr: 'Éléments liés aux substances',
    es: 'Características relacionadas con sustancias',
  },
  personality_interpersonal_style: {
    de: 'Persönlichkeit und zwischenmenschlicher Stil',
    en: 'Personality and interpersonal style',
    en_US: 'Personality and interpersonal style',
    fr: 'Personnalité et style interpersonnel',
    es: 'Personalidad y estilo interpersonal',
  },
  insight_judgment: {
    de: 'Krankheitseinsicht und Urteilsvermögen',
    en: 'Insight and judgment',
    en_US: 'Insight and judgment',
    fr: 'Conscience de la maladie et jugement',
    es: 'Insight y juicio',
  },
  risk_self: {
    de: 'Risiko für sich selbst',
    en: 'Risk to self',
    en_US: 'Risk to self',
    fr: 'Risque pour soi',
    es: 'Riesgo para uno mismo',
  },
  risk_others: {
    de: 'Risiko für andere',
    en: 'Risk to others',
    en_US: 'Risk to others',
    fr: 'Risque pour autrui',
    es: 'Riesgo para otros',
  },
  functional_impairment: {
    de: 'Funktionelle Beeinträchtigung',
    en: 'Functional impairment',
    en_US: 'Functional impairment',
    fr: 'Altération fonctionnelle',
    es: 'Deterioro funcional',
  },
}

export function getIsdmDomainLabel(
  domain: IsdmPhenomenologyDomain,
  language: UiLanguage,
  englishVariant: EnglishVariant = 'uk',
): string {
  const key = resolveLocaleKey(language, englishVariant)
  return domainLabels[domain][key]
}

export const isdmSafetyDisclaimer: Record<LocaleKey, string> = {
  de: 'Dieses Modul unterstützt strukturierte diagnostische Überlegungen. Es ersetzt nicht das klinische Urteil, lizenzierte diagnostische Interviews, nationale Leitlinien oder formale Ausbildung. Offizielle Instrumente wie SCAN/PSE oder SCID-5 erfordern gegebenenfalls entsprechende Berechtigung, Schulung oder Lizenzierung.',
  en: 'This module supports structured diagnostic reasoning. It does not replace clinical judgment, licensed diagnostic interviews, national guidelines, or formal training. Official instruments such as SCAN/PSE or SCID-5 require appropriate authorization, training or licensing where applicable.',
  en_US:
    'This module supports structured diagnostic reasoning. It does not replace clinical judgment, licensed diagnostic interviews, national guidelines, or formal training. Official instruments such as SCAN/PSE or SCID-5 require appropriate authorization, training or licensing where applicable.',
  fr: 'Ce module soutient un raisonnement diagnostique structuré. Il ne remplace pas le jugement clinique, les entretiens diagnostiques autorisés, les recommandations nationales ni la formation formelle. Les instruments officiels tels que SCAN/PSE ou SCID-5 exigent, le cas échéant, une autorisation, une formation ou une licence appropriée.',
  es: 'Este módulo apoya el razonamiento diagnóstico estructurado. No sustituye el juicio clínico, entrevistas diagnósticas autorizadas, guías nacionales ni formación formal. Instrumentos oficiales como SCAN/PSE o SCID-5 requieren, cuando corresponda, autorización, formación o licencia adecuada.',
}

export function getIsdmSafetyDisclaimer(
  language: UiLanguage,
  englishVariant: EnglishVariant = 'uk',
): string {
  const key = resolveLocaleKey(language, englishVariant)
  return isdmSafetyDisclaimer[key]
}
