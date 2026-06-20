/**
 * Clinical Intelligence — Layer 1: Dimensional Integration catalog.
 *
 * The 27 psychopathological dimensions CI reasons over. Each dimension is a
 * compact, clinician-readable transdiagnostic construct. Catalog content is
 * static and ships with the bundle; per-case findings live in the run state.
 */

import type { UiTranslationKey } from '../uiTranslations'
import type { ClinicalIntelligenceDimensionId } from '../../types/clinicalIntelligence'
import { CLINICAL_INTELLIGENCE_DIMENSION_IDS } from '../../types/clinicalIntelligence'

export interface ClinicalIntelligenceDimension {
  id: ClinicalIntelligenceDimensionId
  /** Primary German clinical label (CI is DE-primary). */
  nameDe: string
  /** English fallback label (clinical-minimal). */
  nameEn: string
  /** i18n key for the dimension name. */
  nameI18nKey: UiTranslationKey
  /** Short clinician-facing description (≤ 240 chars). */
  descriptionDe: string
  descriptionEn: string
  /** Loose grouping for UI ordering and band headers (clinical-minimal). */
  band: 'cognition' | 'psychosis' | 'mood' | 'anxiety-trauma' | 'somatic' | 'behavior' | 'context'
}

export const CLINICAL_INTELLIGENCE_DIMENSIONS: readonly ClinicalIntelligenceDimension[] = [
  {
    id: 'neurodevelopmental-architecture',
    nameDe: 'Neurodevelopmentale Architektur',
    nameEn: 'Neurodevelopmental architecture',
    nameI18nKey: 'ciDimNeurodevelopmentalArchitecture',
    descriptionDe:
      'Lebenslang wirkende neurodevelopmentale Grundstruktur (Autismus-Spektrum, ADHS, Intelligenzminderung, motorische/sprachliche Reifungsabweichungen).',
    descriptionEn:
      'Lifelong neurodevelopmental structure (autism spectrum, ADHD, intellectual disability, motor/language maturation atypia).',
    band: 'cognition',
  },
  {
    id: 'attention-executive-control',
    nameDe: 'Aufmerksamkeit und exekutive Kontrolle',
    nameEn: 'Attention and executive control',
    nameI18nKey: 'ciDimAttentionExecutive',
    descriptionDe:
      'Selektive/anhaltende Aufmerksamkeit, Arbeitsgedächtnis, kognitive Flexibilität, Inhibition, Planungs- und Monitoringfunktionen.',
    descriptionEn:
      'Selective/sustained attention, working memory, cognitive flexibility, inhibition, planning and monitoring.',
    band: 'cognition',
  },
  {
    id: 'cognitive-decline-neurocognitive-integrity',
    nameDe: 'Kognitiver Abbau und neurokognitive Integrität',
    nameEn: 'Cognitive decline and neurocognitive integrity',
    nameI18nKey: 'ciDimCognitiveDecline',
    descriptionDe:
      'Akquirierte kognitive Verschlechterung gegenüber Vorniveau (Gedächtnis, Sprache, Visuell-räumlich, Exekutiv) — relevant für demenzielle und neurokognitive Prozesse.',
    descriptionEn:
      'Acquired cognitive decline from prior baseline (memory, language, visuospatial, executive) — relevant for neurocognitive processes.',
    band: 'cognition',
  },
  {
    id: 'aberrant-salience-psychotic-meaning',
    nameDe: 'Aberrante Salienz und psychotische Bedeutungsbildung',
    nameEn: 'Aberrant salience and psychotic meaning',
    nameI18nKey: 'ciDimAberrantSalience',
    descriptionDe:
      'Pathologische Bedeutungszuschreibung, Wahnstimmung, Beziehungs-, Verfolgungs-, Größen- und ähnliche wahnhafte Erlebnisformen.',
    descriptionEn:
      'Pathological meaning attribution, delusional mood, referential, persecutory, grandiose or related delusional experiences.',
    band: 'psychosis',
  },
  {
    id: 'perceptual-dysregulation',
    nameDe: 'Wahrnehmungsdysregulation',
    nameEn: 'Perceptual dysregulation',
    nameI18nKey: 'ciDimPerceptualDysregulation',
    descriptionDe:
      'Halluzinationen, Illusionen und perzeptive Verzerrungen über Sinnesmodalitäten hinweg, einschließlich substanzinduzierter Formen.',
    descriptionEn:
      'Hallucinations, illusions and perceptual distortions across modalities, including substance-induced forms.',
    band: 'psychosis',
  },
  {
    id: 'self-disturbance-agency-dysfunction',
    nameDe: 'Ich-Störung und Agency-Dysfunktion',
    nameEn: 'Self-disturbance and agency dysfunction',
    nameI18nKey: 'ciDimSelfDisturbance',
    descriptionDe:
      'Gedankenentzug, -eingebung, -ausbreitung, fremde Beeinflussung, Depersonalisation/Derealisation, gestörtes Ich-Erleben.',
    descriptionEn:
      'Thought withdrawal/insertion/broadcasting, made experiences, depersonalisation/derealisation, disturbed self-experience.',
    band: 'psychosis',
  },
  {
    id: 'formal-thought-language-disorganization',
    nameDe: 'Formale Denk- und Sprachdesorganisation',
    nameEn: 'Formal thought and language disorganization',
    nameI18nKey: 'ciDimFormalThought',
    descriptionDe:
      'Gelockerter Gedankengang, Zerfahrenheit, Neologismen, Tangentialität, inkohärente Sprache, paragrammatische Verarmung.',
    descriptionEn:
      'Loosened associations, derailment, neologisms, tangentiality, incoherent speech, paragrammatic impoverishment.',
    band: 'psychosis',
  },
  {
    id: 'negative-deficit-dimension',
    nameDe: 'Negativ- und Defizitdimension',
    nameEn: 'Negative and deficit dimension',
    nameI18nKey: 'ciDimNegativeDeficit',
    descriptionDe:
      'Affektabflachung, Avolition, Anhedonie, sozialer Rückzug, Sprachverarmung, Aufmerksamkeitsdefizite mit Defizitqualität.',
    descriptionEn:
      'Affective flattening, avolition, anhedonia, social withdrawal, alogia, attention deficits with deficit quality.',
    band: 'psychosis',
  },
  {
    id: 'catatonic-motor-regulation',
    nameDe: 'Katatonie und motorische Regulation',
    nameEn: 'Catatonic and motor regulation',
    nameI18nKey: 'ciDimCatatonicMotor',
    descriptionDe:
      'Stupor, Mutismus, Negativismus, Haltungsverharren, Wachsweichigkeit, Echophänomene und exzitatorische katatone Zustände.',
    descriptionEn:
      'Stupor, mutism, negativism, posturing, waxy flexibility, echo phenomena and excited catatonic states.',
    band: 'psychosis',
  },
  {
    id: 'depressive-inhibition',
    nameDe: 'Depressive Hemmung',
    nameEn: 'Depressive inhibition',
    nameI18nKey: 'ciDimDepressiveInhibition',
    descriptionDe:
      'Gedrückte Stimmung, Antriebshemmung, psychomotorische Verlangsamung, Hoffnungslosigkeit, Insuffizienzerleben, Vitalstörung.',
    descriptionEn:
      'Depressed mood, drive inhibition, psychomotor slowing, hopelessness, worthlessness, vital disturbance.',
    band: 'mood',
  },
  {
    id: 'reward-motivation-deficit',
    nameDe: 'Belohnungs- und Motivationsdefizit',
    nameEn: 'Reward and motivation deficit',
    nameI18nKey: 'ciDimRewardMotivationDeficit',
    descriptionDe:
      'Anhedonie, Antizipationsdefizite, motivationale Apathie, reduzierte Reaktivität auf Belohnungssignale jenseits einer reinen Stimmungsstörung.',
    descriptionEn:
      'Anhedonia, anticipatory deficits, motivational apathy, reduced reactivity to reward beyond mood disturbance.',
    band: 'mood',
  },
  {
    id: 'mania-activation',
    nameDe: 'Manie und Aktivierung',
    nameEn: 'Mania and activation',
    nameI18nKey: 'ciDimManiaActivation',
    descriptionDe:
      'Gehobene/expansive/gereizte Stimmung, Antriebs- und Aktivitätssteigerung, vermindertes Schlafbedürfnis, Ideenflucht, Größenideen, Impulsivität.',
    descriptionEn:
      'Elevated/expansive/irritable mood, increased drive and activity, reduced sleep need, flight of ideas, grandiosity, impulsivity.',
    band: 'mood',
  },
  {
    id: 'affective-instability-emotion-regulation',
    nameDe: 'Affektinstabilität und Emotionsregulation',
    nameEn: 'Affective instability and emotion regulation',
    nameI18nKey: 'ciDimAffectiveInstability',
    descriptionDe:
      'Rasche, reaktive, oft kontextgebundene Affektschwankungen, Reizbarkeit, Wutdurchbrüche, eingeschränkte Emotionsregulationskapazität.',
    descriptionEn:
      'Rapid, reactive, often context-bound affect shifts, irritability, anger outbursts, limited emotion regulation capacity.',
    band: 'mood',
  },
  {
    id: 'anxiety-threat-anticipation',
    nameDe: 'Angst und Bedrohungsantizipation',
    nameEn: 'Anxiety and threat anticipation',
    nameI18nKey: 'ciDimAnxietyThreatAnticipation',
    descriptionDe:
      'Generalisierte Sorgen, antizipatorische Angst, situationsspezifische Angstmuster, Panikepisoden und vegetative Aktivierung.',
    descriptionEn:
      'Generalised worry, anticipatory anxiety, situational anxiety patterns, panic episodes and autonomic activation.',
    band: 'anxiety-trauma',
  },
  {
    id: 'trauma-stress-response',
    nameDe: 'Trauma- und Stressantwort',
    nameEn: 'Trauma-stress response',
    nameI18nKey: 'ciDimTraumaStressResponse',
    descriptionDe:
      'Reaktionen auf belastende Ereignisse: Intrusion, Vermeidung, Hypervigilanz, Numbing, anhaltende Stressfolgen.',
    descriptionEn:
      'Responses to stressful events: intrusion, avoidance, hypervigilance, numbing, persistent stress sequelae.',
    band: 'anxiety-trauma',
  },
  {
    id: 'dissociation-compartmentalization',
    nameDe: 'Dissoziation und Kompartimentalisierung',
    nameEn: 'Dissociation and compartmentalization',
    nameI18nKey: 'ciDimDissociation',
    descriptionDe:
      'Depersonalisations- und Derealisationserleben, Amnesie, Identitätsfragmentierung, dissoziative Krampfanfälle und sensomotorische Phänomene.',
    descriptionEn:
      'Depersonalisation/derealisation, amnesia, identity fragmentation, dissociative seizures and sensorimotor phenomena.',
    band: 'anxiety-trauma',
  },
  {
    id: 'obsessive-compulsive-control-loop',
    nameDe: 'Zwangs- und Kontrollschleife',
    nameEn: 'Obsessive-compulsive control loop',
    nameI18nKey: 'ciDimObsessiveCompulsive',
    descriptionDe:
      'Intrusive Zwangsgedanken, Zwangshandlungen, perfektionistische Rituale, körperdysmorphe Kontrollmuster, Hortverhalten.',
    descriptionEn:
      'Intrusive obsessions, compulsions, perfectionistic rituals, body-focused checking and hoarding patterns.',
    band: 'anxiety-trauma',
  },
  {
    id: 'somatic-bodily-experience',
    nameDe: 'Somatisches/körperliches Erleben',
    nameEn: 'Somatic/bodily experience',
    nameI18nKey: 'ciDimSomaticBodily',
    descriptionDe:
      'Belastende Körpersymptomatik, Krankheitsängste, funktionelle neurologische Phänomene, Schmerzleben, gestörte Körperwahrnehmung.',
    descriptionEn:
      'Distressing bodily symptoms, illness anxiety, functional neurological phenomena, pain experience, altered bodily perception.',
    band: 'somatic',
  },
  {
    id: 'eating-weight-appetite-regulation',
    nameDe: 'Ess-, Gewichts- und Appetitregulation',
    nameEn: 'Eating, weight and appetite regulation',
    nameI18nKey: 'ciDimEatingWeight',
    descriptionDe:
      'Restriktion, Binge-Episoden, kompensatorische Verhaltensweisen, Körperbildstörungen, gestörte hunger-/sättigungsbezogene Selbstwahrnehmung.',
    descriptionEn:
      'Restriction, binge episodes, compensatory behaviours, body-image disturbance, disturbed hunger/satiety self-perception.',
    band: 'somatic',
  },
  {
    id: 'impulsivity-disinhibition',
    nameDe: 'Impulsivität und Enthemmung',
    nameEn: 'Impulsivity and disinhibition',
    nameI18nKey: 'ciDimImpulsivityDisinhibition',
    descriptionDe:
      'Rapides, kontextentkoppeltes Handeln, mangelnde Belohnungsverzögerung, Risikoverhalten, impulsive Selbst- oder Fremdgefährdung.',
    descriptionEn:
      'Rapid context-decoupled action, poor delay of gratification, risk behaviour, impulsive self/other harm.',
    band: 'behavior',
  },
  {
    id: 'aggression-threat-reactivity',
    nameDe: 'Aggression und Bedrohungsreaktivität',
    nameEn: 'Aggression and threat reactivity',
    nameI18nKey: 'ciDimAggressionThreatReactivity',
    descriptionDe:
      'Reaktive und proaktive Aggression, hostiles Attributionsmuster, Bedrohungs- und Frustrationsreaktivität, Gewaltanamnese.',
    descriptionEn:
      'Reactive and proactive aggression, hostile attribution, threat/frustration reactivity, violence history.',
    band: 'behavior',
  },
  {
    id: 'personality-organization',
    nameDe: 'Persönlichkeitsorganisation',
    nameEn: 'Personality organization',
    nameI18nKey: 'ciDimPersonalityOrganization',
    descriptionDe:
      'Strukturniveau, Identitätsdiffusion, Abwehrmuster, interpersonelles Funktionsniveau und Selbst-Andere-Repräsentation (Kernberg/OPD-orientiert).',
    descriptionEn:
      'Structural level, identity diffusion, defence patterns, interpersonal functioning and self-other representation (Kernberg/OPD-oriented).',
    band: 'behavior',
  },
  {
    id: 'social-cognition-attachment',
    nameDe: 'Soziale Kognition und Bindung',
    nameEn: 'Social cognition and attachment',
    nameI18nKey: 'ciDimSocialCognitionAttachment',
    descriptionDe:
      'Mentalisierung, Empathie, Bindungsmuster, soziale Kontextverarbeitung, Beziehungsgestaltung über die Zeit.',
    descriptionEn:
      'Mentalisation, empathy, attachment patterns, social context processing, relational functioning over time.',
    band: 'behavior',
  },
  {
    id: 'sleep-circadian-regulation',
    nameDe: 'Schlaf- und zirkadiane Regulation',
    nameEn: 'Sleep and circadian regulation',
    nameI18nKey: 'ciDimSleepCircadian',
    descriptionDe:
      'Ein-/Durchschlafstörungen, frühes Erwachen, Phasenverschiebungen, Hypersomnie, REM-Dysregulation, schichtbedingte Rhythmusstörungen.',
    descriptionEn:
      'Initiation/maintenance insomnia, early waking, phase shifts, hypersomnia, REM dysregulation, shift-related rhythm disturbance.',
    band: 'somatic',
  },
  {
    id: 'substance-addictive-contribution',
    nameDe: 'Substanzbezogener und additionsbezogener Beitrag',
    nameEn: 'Substance and addictive contribution',
    nameI18nKey: 'ciDimSubstanceAddictive',
    descriptionDe:
      'Substanzkonsumstörungen, Verhaltensabhängigkeiten, akute/chronische substanzinduzierte Symptomanteile, Entzugs- und Toleranzmuster.',
    descriptionEn:
      'Substance use disorders, behavioural addictions, acute/chronic substance-induced symptom load, withdrawal/tolerance patterns.',
    band: 'behavior',
  },
  {
    id: 'neurobiological-burden-medical-modifiers',
    nameDe: 'Neurobiologische Belastung und medizinische Modifikatoren',
    nameEn: 'Neurobiological burden and medical modifiers',
    nameI18nKey: 'ciDimNeurobiologicalBurden',
    descriptionDe:
      'Somatische Komorbiditäten, endokrine/metabolische/infektiöse Modifikatoren, ZNS-Läsionen, medikamentös induzierte Beiträge.',
    descriptionEn:
      'Somatic comorbidities, endocrine/metabolic/infectious modifiers, CNS lesions, medication-induced contributions.',
    band: 'context',
  },
  {
    id: 'functional-longitudinal-adaptation',
    nameDe: 'Funktionsniveau und Längsschnittadaptation',
    nameEn: 'Functional and longitudinal adaptation',
    nameI18nKey: 'ciDimFunctionalLongitudinal',
    descriptionDe:
      'Alltagsfunktion, Arbeits-/Ausbildungsfähigkeit, Rollenübernahme, Krankheitsverlauf, Rezidivmuster, soziale Reintegration.',
    descriptionEn:
      'Daily functioning, work/education capacity, role engagement, illness course, relapse patterns, social reintegration.',
    band: 'context',
  },
]

const DIMENSION_BY_ID: Record<ClinicalIntelligenceDimensionId, ClinicalIntelligenceDimension> = Object.fromEntries(
  CLINICAL_INTELLIGENCE_DIMENSIONS.map((dim) => [dim.id, dim]),
) as Record<ClinicalIntelligenceDimensionId, ClinicalIntelligenceDimension>

// Compile-time safety: the catalog must cover every id exactly once.
if (CLINICAL_INTELLIGENCE_DIMENSIONS.length !== CLINICAL_INTELLIGENCE_DIMENSION_IDS.length) {
  throw new Error(
    `[clinicalIntelligence] dimensions catalog length mismatch: ${CLINICAL_INTELLIGENCE_DIMENSIONS.length} vs ${CLINICAL_INTELLIGENCE_DIMENSION_IDS.length}`,
  )
}

export function getClinicalIntelligenceDimension(
  id: ClinicalIntelligenceDimensionId,
): ClinicalIntelligenceDimension {
  return DIMENSION_BY_ID[id]
}

export function clinicalIntelligenceDimensionName(
  id: ClinicalIntelligenceDimensionId,
  language: 'de' | 'en' | 'fr' | 'es',
): string {
  const dim = DIMENSION_BY_ID[id]
  if (language === 'en') return dim.nameEn
  return dim.nameDe
}
