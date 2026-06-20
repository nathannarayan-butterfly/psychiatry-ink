/**
 * Clinical Intelligence — Layer 2: Mechanism Inference catalog.
 *
 * The 15 transdiagnostic mechanism hypotheses CI may suggest based on the
 * dimensional profile. Each entry has a clinician-readable label and the
 * (clinical-minimal) hypothesis space it covers.
 */

import type { UiTranslationKey } from '../uiTranslations'
import type { ClinicalIntelligenceMechanismId } from '../../types/clinicalIntelligence'
import { CLINICAL_INTELLIGENCE_MECHANISM_IDS } from '../../types/clinicalIntelligence'

export interface ClinicalIntelligenceMechanism {
  id: ClinicalIntelligenceMechanismId
  labelDe: string
  labelEn: string
  labelI18nKey: UiTranslationKey
  descriptionDe: string
  descriptionEn: string
  /** Loose grouping for UI ordering. */
  band: 'neurochemical' | 'cognitive' | 'affective-stress' | 'developmental' | 'systemic'
}

export const CLINICAL_INTELLIGENCE_MECHANISMS: readonly ClinicalIntelligenceMechanism[] = [
  {
    id: 'dopamine-aberrant-salience-dysregulation',
    labelDe: 'Dopamin / Aberrante Salienz-Dysregulation',
    labelEn: 'Dopamine / Aberrant Salience Dysregulation',
    labelI18nKey: 'ciMechDopamineAberrantSalience',
    descriptionDe:
      'Hypothese einer dysregulierten mesolimbisch-mesokortikalen Dopaminantwort als Grundlage psychotischer Bedeutungsbildung und positiver Symptomatik.',
    descriptionEn:
      'Hypothesis of dysregulated mesolimbic–mesocortical dopamine signalling underlying psychotic meaning generation and positive symptoms.',
    band: 'neurochemical',
  },
  {
    id: 'glutamate-gaba-dysconnectivity',
    labelDe: 'Glutamat-GABA-Dyskonnektivität',
    labelEn: 'Glutamate–GABA Dysconnectivity',
    labelI18nKey: 'ciMechGlutamateGabaDysconnectivity',
    descriptionDe:
      'Hypothese einer gestörten exzitatorisch-inhibitorischen Balance (NMDA/Parvalbumin-Interneurone) mit Beitrag zu kognitiver, perzeptiver und negativer Symptomatik.',
    descriptionEn:
      'Hypothesis of disturbed excitatory–inhibitory balance (NMDA/parvalbumin interneurons) contributing to cognitive, perceptual and negative symptoms.',
    band: 'neurochemical',
  },
  {
    id: 'predictive-processing-bayesian-inference-dysfunction',
    labelDe: 'Predictive Processing / Bayesianische Inferenzdysfunktion',
    labelEn: 'Predictive Processing / Bayesian Inference Dysfunction',
    labelI18nKey: 'ciMechPredictiveProcessing',
    descriptionDe:
      'Hypothese einer Über- oder Untergewichtung sensorischer Präzision gegenüber Priors, mit Bezug zu Halluzinationen, Wahnbildung und perzeptiver Dysregulation.',
    descriptionEn:
      'Hypothesis of mis-weighted sensory precision versus priors, relevant to hallucinations, delusions and perceptual dysregulation.',
    band: 'cognitive',
  },
  {
    id: 'self-monitoring-agency-dysfunction',
    labelDe: 'Selbst-Monitoring / Agency-Dysfunktion',
    labelEn: 'Self-Monitoring / Agency Dysfunction',
    labelI18nKey: 'ciMechSelfMonitoringAgency',
    descriptionDe:
      'Hypothese einer gestörten Vorhersage und Attribution selbst-erzeugter Handlungen/Gedanken, relevant für Ich-Störungen und Stimmenhören.',
    descriptionEn:
      'Hypothesis of disturbed prediction/attribution of self-generated actions and thoughts, relevant to self-disturbance and voice hearing.',
    band: 'cognitive',
  },
  {
    id: 'trauma-limbic-hyperreactivity',
    labelDe: 'Trauma-limbische Hyperreaktivität',
    labelEn: 'Trauma–Limbic Hyperreactivity',
    labelI18nKey: 'ciMechTraumaLimbic',
    descriptionDe:
      'Hypothese einer übersteigerten Amygdala-Hippocampus-präfrontalen Reaktivität auf threat cues nach belastenden Lebensereignissen.',
    descriptionEn:
      'Hypothesis of heightened amygdala–hippocampal–prefrontal reactivity to threat cues following stressful life events.',
    band: 'affective-stress',
  },
  {
    id: 'reward-processing-dysfunction',
    labelDe: 'Belohnungsverarbeitungs-Dysfunktion',
    labelEn: 'Reward Processing Dysfunction',
    labelI18nKey: 'ciMechRewardProcessing',
    descriptionDe:
      'Hypothese gestörter Vorhersage, Erleben und Verstärkung von Belohnungssignalen — Bezug zu Anhedonie, Motivationsdefiziten und Substanzgebrauch.',
    descriptionEn:
      'Hypothesis of disturbed reward prediction, experience and reinforcement — relevant to anhedonia, motivation deficits and substance use.',
    band: 'cognitive',
  },
  {
    id: 'executive-control-network-dysfunction',
    labelDe: 'Executive-Control-Network-Dysfunktion',
    labelEn: 'Executive Control Network Dysfunction',
    labelI18nKey: 'ciMechExecutiveControlNetwork',
    descriptionDe:
      'Hypothese einer fronto-parietalen Kontrollnetzwerk-Dysfunktion mit Beitrag zu Aufmerksamkeit, kognitiver Flexibilität und exekutiven Defiziten.',
    descriptionEn:
      'Hypothesis of fronto-parietal control network dysfunction contributing to attention, flexibility and executive deficits.',
    band: 'cognitive',
  },
  {
    id: 'social-cognition-mentalization-dysfunction',
    labelDe: 'Soziale Kognition / Mentalisierungs-Dysfunktion',
    labelEn: 'Social Cognition / Mentalization Dysfunction',
    labelI18nKey: 'ciMechSocialCognitionMentalization',
    descriptionDe:
      'Hypothese einer gestörten Repräsentation eigener und fremder Mentalzustände mit Bezug zu Bindung, sozialer Funktion und interpersonellen Mustern.',
    descriptionEn:
      'Hypothesis of disturbed representation of own/others’ mental states, relevant to attachment, social functioning and interpersonal patterns.',
    band: 'cognitive',
  },
  {
    id: 'neurodevelopmental-dysmaturation',
    labelDe: 'Neurodevelopmentale Dysmaturation',
    labelEn: 'Neurodevelopmental Dysmaturation',
    labelI18nKey: 'ciMechNeurodevelopmentalDysmaturation',
    descriptionDe:
      'Hypothese atypischer kortiko-subkortikaler Reifungsverläufe mit lebenslangen Auswirkungen auf Kognition, soziale Funktion und Symptomvulnerabilität.',
    descriptionEn:
      'Hypothesis of atypical cortico-subcortical maturation with lifelong impact on cognition, social functioning and symptom vulnerability.',
    band: 'developmental',
  },
  {
    id: 'neurodegenerative-neurocognitive-decline',
    labelDe: 'Neurodegenerative / neurokognitive Abbauprozesse',
    labelEn: 'Neurodegenerative / Neurocognitive Decline',
    labelI18nKey: 'ciMechNeurodegenerativeDecline',
    descriptionDe:
      'Hypothese erworbener neurodegenerativer Prozesse (z.B. Alzheimer-, vaskuläre, Lewy-Körper-Pathologien) als Beitrag zu kognitivem Abbau und Verhaltensänderung.',
    descriptionEn:
      'Hypothesis of acquired neurodegenerative processes (e.g. Alzheimer, vascular, Lewy body) contributing to cognitive decline and behavioural change.',
    band: 'systemic',
  },
  {
    id: 'circadian-sleep-wake-dysregulation',
    labelDe: 'Zirkadiane / Schlaf-Wach-Dysregulation',
    labelEn: 'Circadian / Sleep–Wake Dysregulation',
    labelI18nKey: 'ciMechCircadianSleepWake',
    descriptionDe:
      'Hypothese gestörter zirkadianer Rhythmik und Schlafregulation mit bidirektionalem Beitrag zu affektiven, psychotischen und kognitiven Symptomen.',
    descriptionEn:
      'Hypothesis of disturbed circadian rhythm and sleep regulation with bidirectional contributions to affective, psychotic and cognitive symptoms.',
    band: 'systemic',
  },
  {
    id: 'stress-system-hpa-axis-dysregulation',
    labelDe: 'Stress-System / HPA-Achsen-Dysregulation',
    labelEn: 'Stress-System / HPA Axis Dysregulation',
    labelI18nKey: 'ciMechStressSystemHpaAxis',
    descriptionDe:
      'Hypothese dysregulierter HPA-Achsen-Antwort auf chronischen oder akuten Stress mit Beitrag zu affektiven und somatischen Verläufen.',
    descriptionEn:
      'Hypothesis of dysregulated HPA-axis response to acute or chronic stress, contributing to affective and somatic trajectories.',
    band: 'affective-stress',
  },
  {
    id: 'inflammatory-immunopsychiatric-dysregulation',
    labelDe: 'Inflammatorische / immunpsychiatrische Dysregulation',
    labelEn: 'Inflammatory / Immunopsychiatric Dysregulation',
    labelI18nKey: 'ciMechInflammatoryImmuno',
    descriptionDe:
      'Hypothese pro-inflammatorischer und immunvermittelter Beiträge zu depressiven, kognitiven und psychotischen Symptomverläufen.',
    descriptionEn:
      'Hypothesis of pro-inflammatory and immune-mediated contributions to depressive, cognitive and psychotic trajectories.',
    band: 'systemic',
  },
  {
    id: 'large-scale-network-connectivity-dysregulation',
    labelDe: 'Großskalige Netzwerk-Konnektivitäts-Dysregulation',
    labelEn: 'Large-Scale Network Connectivity Dysregulation',
    labelI18nKey: 'ciMechLargeScaleNetwork',
    descriptionDe:
      'Hypothese veränderter Konnektivität zwischen Default-Mode-, Salience- und Executive-Networks mit Bezug zu transdiagnostischen Symptommustern.',
    descriptionEn:
      'Hypothesis of altered connectivity between default-mode, salience and executive networks relevant to transdiagnostic symptom patterns.',
    band: 'systemic',
  },
  {
    id: 'habit-compulsion-loop-dysfunction',
    labelDe: 'Habit- / Zwangs-Loop-Dysfunktion',
    labelEn: 'Habit / Compulsion Loop Dysfunction',
    labelI18nKey: 'ciMechHabitCompulsionLoop',
    descriptionDe:
      'Hypothese dysregulierter cortico-striatal-thalamo-kortikaler Schleifen mit Beitrag zu Zwangs-, Sucht- und perseverativem Verhalten.',
    descriptionEn:
      'Hypothesis of dysregulated cortico-striato-thalamo-cortical loops contributing to obsessive, addictive and perseverative behaviour.',
    band: 'cognitive',
  },
]

const MECHANISM_BY_ID: Record<ClinicalIntelligenceMechanismId, ClinicalIntelligenceMechanism> = Object.fromEntries(
  CLINICAL_INTELLIGENCE_MECHANISMS.map((mech) => [mech.id, mech]),
) as Record<ClinicalIntelligenceMechanismId, ClinicalIntelligenceMechanism>

if (CLINICAL_INTELLIGENCE_MECHANISMS.length !== CLINICAL_INTELLIGENCE_MECHANISM_IDS.length) {
  throw new Error(
    `[clinicalIntelligence] mechanisms catalog length mismatch: ${CLINICAL_INTELLIGENCE_MECHANISMS.length} vs ${CLINICAL_INTELLIGENCE_MECHANISM_IDS.length}`,
  )
}

export function getClinicalIntelligenceMechanism(
  id: ClinicalIntelligenceMechanismId,
): ClinicalIntelligenceMechanism {
  return MECHANISM_BY_ID[id]
}

export function clinicalIntelligenceMechanismLabel(
  id: ClinicalIntelligenceMechanismId,
  language: 'de' | 'en' | 'fr' | 'es',
): string {
  const mech = MECHANISM_BY_ID[id]
  if (language === 'en') return mech.labelEn
  return mech.labelDe
}
