import type { EnglishVariant, UiLanguage } from '../types/settings'
import type { IsdmPhenomenologyDomain, IsdmPresence } from '../types/isdm'

type LocaleKey = UiLanguage | 'en_US'

export const localizedProfileLabels: Record<
  'international_structured_diagnostic_mapping',
  Record<LocaleKey, string>
> = {
  international_structured_diagnostic_mapping: {
    de: 'Internationale strukturierte diagnostische Zuordnung V.1',
    en: 'International Structured Diagnostic Mapping V.1',
    en_US: 'International Structured Diagnostic Mapping V.1',
    fr: 'Cartographie diagnostique structurée internationale V.1',
    es: 'Mapeo diagnóstico estructurado internacional V.1',
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

export type IsdmDomainGroupId =
  | 'presentation'
  | 'cognition_attention'
  | 'mood_drive'
  | 'thought'
  | 'perception_self'
  | 'anxiety_trauma'
  | 'somatic_vegetative'
  | 'interpersonal_insight'
  | 'risk_function'

export const ISDM_DOMAIN_GROUPS: {
  id: IsdmDomainGroupId
  domains: IsdmPhenomenologyDomain[]
}[] = [
  {
    id: 'presentation',
    domains: ['appearance_behavior', 'speech_language', 'consciousness_orientation'],
  },
  {
    id: 'cognition_attention',
    domains: ['attention_concentration', 'memory_cognition'],
  },
  {
    id: 'mood_drive',
    domains: ['mood_affect', 'drive_psychomotor_activity'],
  },
  {
    id: 'thought',
    domains: ['formal_thought_disorder', 'thought_content', 'delusions_overvalued_ideas'],
  },
  {
    id: 'perception_self',
    domains: ['perception_hallucinations', 'self_experience_ego_disturbance'],
  },
  {
    id: 'anxiety_trauma',
    domains: [
      'anxiety_panic_phobic_symptoms',
      'obsessions_compulsions',
      'trauma_intrusions_dissociation',
    ],
  },
  {
    id: 'somatic_vegetative',
    domains: [
      'somatic_preoccupation',
      'sleep_appetite_vegetative',
      'substance_related_features',
    ],
  },
  {
    id: 'interpersonal_insight',
    domains: ['personality_interpersonal_style', 'insight_judgment'],
  },
  {
    id: 'risk_function',
    domains: ['risk_self', 'risk_others', 'functional_impairment'],
  },
]

const domainGroupLabels: Record<IsdmDomainGroupId, Record<LocaleKey, string>> = {
  presentation: {
    de: 'Erscheinungsbild und Bewusstsein',
    en: 'Presentation and consciousness',
    en_US: 'Presentation and consciousness',
    fr: 'Présentation et conscience',
    es: 'Presentación y conciencia',
  },
  cognition_attention: {
    de: 'Kognition und Aufmerksamkeit',
    en: 'Cognition and attention',
    en_US: 'Cognition and attention',
    fr: 'Cognition et attention',
    es: 'Cognición y atención',
  },
  mood_drive: {
    de: 'Stimmung und Antrieb',
    en: 'Mood and drive',
    en_US: 'Mood and drive',
    fr: 'Humeur et pulsion',
    es: 'Estado de ánimo e impulso',
  },
  thought: {
    de: 'Denken',
    en: 'Thought processes',
    en_US: 'Thought processes',
    fr: 'Pensée',
    es: 'Pensamiento',
  },
  perception_self: {
    de: 'Wahrnehmung und Ich-Erleben',
    en: 'Perception and self-experience',
    en_US: 'Perception and self-experience',
    fr: 'Perception et vécu de soi',
    es: 'Percepción y experiencia del yo',
  },
  anxiety_trauma: {
    de: 'Angst, Zwang und Trauma',
    en: 'Anxiety, OCD and trauma',
    en_US: 'Anxiety, OCD and trauma',
    fr: 'Anxiété, TOC et trauma',
    es: 'Ansiedad, TOC y trauma',
  },
  somatic_vegetative: {
    de: 'Somatik, Vegetativum und Substanz',
    en: 'Somatic, vegetative and substance',
    en_US: 'Somatic, vegetative and substance',
    fr: 'Somato, végétatif et substances',
    es: 'Somático, vegetativo y sustancias',
  },
  interpersonal_insight: {
    de: 'Interpersonell und Einsicht',
    en: 'Interpersonal style and insight',
    en_US: 'Interpersonal style and insight',
    fr: 'Interpersonnel et insight',
    es: 'Estilo interpersonal e insight',
  },
  risk_function: {
    de: 'Risiko und Funktion',
    en: 'Risk and functioning',
    en_US: 'Risk and functioning',
    fr: 'Risque et fonctionnement',
    es: 'Riesgo y funcionamiento',
  },
}

export function getIsdmDomainGroupLabel(
  groupId: IsdmDomainGroupId,
  language: UiLanguage,
  englishVariant: EnglishVariant = 'uk',
): string {
  const key = resolveLocaleKey(language, englishVariant)
  return domainGroupLabels[groupId][key]
}

const presenceLabels: Record<IsdmPresence, Record<LocaleKey, string>> = {
  not_assessed: {
    de: 'Nicht erhoben',
    en: 'Not assessed',
    en_US: 'Not assessed',
    fr: 'Non évalué',
    es: 'No evaluado',
  },
  absent: {
    de: 'Nicht vorhanden',
    en: 'Absent',
    en_US: 'Absent',
    fr: 'Absent',
    es: 'Ausente',
  },
  present: {
    de: 'Vorhanden',
    en: 'Present',
    en_US: 'Present',
    fr: 'Présent',
    es: 'Presente',
  },
  unclear: {
    de: 'Unklar',
    en: 'Unclear',
    en_US: 'Unclear',
    fr: 'Peu clair',
    es: 'Poco claro',
  },
}

export function getIsdmPresenceLabel(
  presence: IsdmPresence,
  language: UiLanguage,
  englishVariant: EnglishVariant = 'uk',
): string {
  const key = resolveLocaleKey(language, englishVariant)
  return presenceLabels[presence][key]
}

export const ISDM_PRESENCE_OPTIONS: IsdmPresence[] = [
  'not_assessed',
  'absent',
  'present',
  'unclear',
]
