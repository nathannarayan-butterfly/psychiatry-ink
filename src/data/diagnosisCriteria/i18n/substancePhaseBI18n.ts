/**
 * Phase-B substance i18n — disorders with disambiguated criterion prefixes
 * (criteriaIdPrefix) plus alcohol harmful use (F10.1 / 6C40.1).
 */

import type { DisorderTranslation, DisorderTranslationMap } from './types'

interface HarmfulSpec {
  id: string
  prefix: string
  name: string
  substance: string
  icd10Harm: string
  icd10Dep: string
}

interface DependenceSpec {
  id: string
  prefix: string
  name: string
  substance: string
  icd10Harm: string
  icd10Intox: string
}

interface WithdrawalSpec {
  id: string
  prefix: string
  name: string
  substance: string
  icd10Intox: string
  icd10Delirium: string
  extraCriteria?: Record<string, string>
}

interface AcuteSpec {
  id: string
  prefix: string
  name: string
  substance: string
  icd10Withdrawal: string
  featureCriteria: Record<string, string>
}

interface PsychoticSpec {
  id: string
  prefix: string
  name: string
  substance: string
  icd10Intox: string
  icd10Delirium: string
}

interface PhaseBTextPack {
  alcoholHarmful: HarmfulSpec
  harmful: (s: Omit<HarmfulSpec, 'id' | 'prefix'> & { id: string; prefix: string }) => DisorderTranslation
  dependence: (s: Omit<DependenceSpec, 'id' | 'prefix'> & { id: string; prefix: string }) => DisorderTranslation
  withdrawal: (s: Omit<WithdrawalSpec, 'id' | 'prefix'> & { id: string; prefix: string }) => DisorderTranslation
  acute: (s: Omit<AcuteSpec, 'id' | 'prefix'> & { id: string; prefix: string }) => DisorderTranslation
  psychotic: (s: Omit<PsychoticSpec, 'id' | 'prefix'> & { id: string; prefix: string }) => DisorderTranslation
}

function buildPack(t: PhaseBTextPack): DisorderTranslationMap {
  const out: DisorderTranslationMap = {}

  const ah = t.alcoholHarmful
  out.alcohol_harmful_use = t.harmful(ah)

  const specs: Array<{ harmful: HarmfulSpec; dependence?: DependenceSpec; withdrawal?: WithdrawalSpec; acute?: AcuteSpec; psychotic?: PsychoticSpec }> = [
    {
      harmful: { id: 'caffeine_harmful_use', prefix: 'caffeine', name: t.alcoholHarmful.name.replace('Alcohol', 'Caffeine'), substance: 'caffeine', icd10Harm: 'F15.1', icd10Dep: 'F15.2' },
      dependence: { id: 'caffeine_dependence', prefix: 'caffeine', name: 'Caffeine dependence syndrome', substance: 'caffeine', icd10Harm: 'F15.1', icd10Intox: 'F15.0' },
      withdrawal: { id: 'caffeine_withdrawal', prefix: 'caffeine', name: 'Caffeine withdrawal state', substance: 'caffeine', icd10Intox: 'F15.0', icd10Delirium: 'F15.4', extraCriteria: { 'caffeine.headache': 'Headache, tiredness and impaired concentration' } },
    },
  ]

  // Pack is built per-language below — this stub avoids duplication in the type export.
  void specs
  void out
  return out
}

export function buildEnPhaseBSubstance(): DisorderTranslationMap {
  const harmful = (s: HarmfulSpec): DisorderTranslation => ({
    name: s.name,
    differentials: [
      `Dependence syndrome (${s.icd10Dep})`,
      `Acute intoxication (${s.icd10Harm.replace('.1', '.0')})`,
      'Low-risk use without identifiable harm',
    ],
    groups: { [`${s.prefix}.harm`]: 'Consumption with damage to health', [`${s.prefix}.exclusions`]: 'Exclusions' },
    criteria: {
      [`${s.prefix}.actual_use`]: `Actual consumption of ${s.substance} is documented`,
      [`${s.prefix}.health_damage`]: 'Demonstrable damage to physical or mental health as a consequence of consumption',
      [`${s.prefix}.exclude_dependence`]: `The criteria for a dependence syndrome (${s.icd10Dep}) are not met`,
    },
  })

  const dependence = (s: DependenceSpec): DisorderTranslation => ({
    name: s.name,
    differentials: [
      `Harmful use of ${s.substance} (${s.icd10Harm}) without dependence`,
      `Acute intoxication (${s.icd10Intox})`,
      'Substance-induced mood or psychotic disorder',
    ],
    groups: { [`${s.prefix}.dependence`]: 'Features of dependence (at least 3 within a 12-month period)' },
    criteria: {
      [`${s.prefix}.craving`]: `A strong desire or sense of compulsion to consume ${s.substance} (craving)`,
      [`${s.prefix}.impaired_control`]: 'Impaired capacity to control the onset, cessation and amount of consumption',
      [`${s.prefix}.withdrawal`]: 'A physical withdrawal state on reducing or stopping consumption, or consumption to relieve withdrawal symptoms',
      [`${s.prefix}.tolerance`]: 'Development of tolerance, requiring increased doses to achieve the original effect',
      [`${s.prefix}.neglect`]: 'Progressive neglect of other interests and increased time spent obtaining, using and recovering from the substance',
      [`${s.prefix}.persistence_harm`]: 'Continued consumption despite demonstrably harmful physical, psychological or social consequences',
    },
  })

  const withdrawal = (s: WithdrawalSpec): DisorderTranslation => ({
    name: s.name,
    differentials: [
      `Acute intoxication (${s.icd10Intox})`,
      `Withdrawal state with delirium (${s.icd10Delirium})`,
      'Anxiety or mood disorder',
      'Physical illness with autonomic symptoms',
    ],
    groups: {
      [`${s.prefix}.context`]: 'Withdrawal context',
      [`${s.prefix}.symptoms`]: 'Withdrawal symptoms (at least 1)',
      [`${s.prefix}.exclusions`]: 'Exclusions',
    },
    criteria: {
      [`${s.prefix}.cessation`]: `Cessation or reduction of ${s.substance} after repeated, usually sustained and/or high-dose consumption`,
      [`${s.prefix}.withdrawal_syndrome`]: 'A withdrawal state typical of the substance is present',
      [`${s.prefix}.fatigue`]: 'Marked tiredness and exhaustion',
      [`${s.prefix}.exclude_other_cause`]: 'The symptoms are not better explained by another physical or mental disorder',
      ...(s.extraCriteria ?? {}),
    },
  })

  const acute = (s: AcuteSpec): DisorderTranslation => ({
    name: s.name,
    differentials: [
      `Withdrawal state (${s.icd10Withdrawal})`,
      'Delirium or other organic cause',
      'Acute psychotic disorder',
      'Intoxication with another substance or mixed intoxication',
    ],
    groups: {
      [`${s.prefix}.use`]: 'Evidence of consumption',
      [`${s.prefix}.signs`]: 'Signs of intoxication typical of the substance (at least 1)',
      [`${s.prefix}.exclusions`]: 'Exclusions',
    },
    criteria: {
      [`${s.prefix}.recent_use`]: `Recent consumption of ${s.substance} at a sufficiently high dose`,
      [`${s.prefix}.causal_link`]: 'The symptoms are in direct temporal and causal relationship with the acute effect of the substance and are transient',
      [`${s.prefix}.exclude_other_cause`]: 'The symptoms are not better explained by a physical illness, a delirium or another mental disorder',
      ...Object.fromEntries(Object.entries(s.featureCriteria).map(([k, v]) => [`${s.prefix}.${k}`, v])),
    },
  })

  const psychotic = (s: PsychoticSpec): DisorderTranslation => ({
    name: s.name,
    differentials: [
      'Schizophrenia or persistent delusional disorder',
      `Acute intoxication (${s.icd10Intox}) with psychotic phenomena`,
      `Withdrawal state with delirium (${s.icd10Delirium})`,
      'Mood disorder with psychotic symptoms',
    ],
    groups: {
      [`${s.prefix}.symptoms`]: 'Psychotic symptoms (at least 1)',
      [`${s.prefix}.context`]: 'Temporal relationship with consumption',
      [`${s.prefix}.exclusions`]: 'Exclusions',
    },
    criteria: {
      [`${s.prefix}.hallucinations`]: 'Hallucinations (frequently auditory or visual) that are not solely an expression of simple intoxication',
      [`${s.prefix}.delusions`]: 'Delusional ideas, frequently persecutory or referential delusions',
      [`${s.prefix}.temporal_relation`]: `Onset of the psychotic symptoms during or shortly after (usually within two weeks of) consumption of ${s.substance}`,
      [`${s.prefix}.partial_remission`]: 'The symptoms typically remit at least partially within a limited period (on the order of weeks to a few months)',
      [`${s.prefix}.exclude_primary_psychosis`]: 'The presentation is not better explained by a primary psychotic disorder and does not occur exclusively in the context of intoxication or withdrawal delirium',
    },
  })

  return {
    alcohol_harmful_use: harmful({
      id: 'alcohol_harmful_use',
      prefix: 'f10_1',
      name: 'Harmful use of alcohol',
      substance: 'alcohol',
      icd10Harm: 'F10.1',
      icd10Dep: 'F10.2',
    }),
    caffeine_harmful_use: harmful({ id: 'caffeine_harmful_use', prefix: 'caffeine_1', name: 'Harmful use of caffeine', substance: 'caffeine', icd10Harm: 'F15.1', icd10Dep: 'F15.2' }),
    caffeine_dependence: dependence({ id: 'caffeine_dependence', prefix: 'caffeine_2', name: 'Caffeine dependence syndrome', substance: 'caffeine', icd10Harm: 'F15.1', icd10Intox: 'F15.0' }),
    caffeine_withdrawal: withdrawal({
      id: 'caffeine_withdrawal',
      prefix: 'caffeine_3',
      name: 'Caffeine withdrawal state',
      substance: 'caffeine',
      icd10Intox: 'F15.0',
      icd10Delirium: 'F15.4',
      extraCriteria: {
        'caffeine_3.headache': 'Headache, tiredness and impaired concentration',
        'caffeine_3.dysphoria': 'Dysphoric mood, irritability or concentration difficulties',
        'caffeine_3.flu_like': 'Flu-like symptoms or muscle aches',
        'caffeine_3.craving': 'Strong craving for caffeinated beverages (craving)',
      },
    }),
    synthetic_cathinones_harmful_use: harmful({ id: 'synthetic_cathinones_harmful_use', prefix: 'synthetic_cathinones_1', name: 'Harmful use of synthetic cathinones', substance: 'synthetic cathinones', icd10Harm: 'F15.1', icd10Dep: 'F15.2' }),
    synthetic_cathinones_dependence: dependence({ id: 'synthetic_cathinones_dependence', prefix: 'synthetic_cathinones_2', name: 'Dependence syndrome due to synthetic cathinones', substance: 'synthetic cathinones', icd10Harm: 'F15.1', icd10Intox: 'F15.0' }),
    synthetic_cathinones_acute_intoxication: acute({
      id: 'synthetic_cathinones_acute_intoxication',
      prefix: 'synthetic_cathinones_0',
      name: 'Acute intoxication with synthetic cathinones',
      substance: 'synthetic cathinones',
      icd10Withdrawal: 'F15.3',
      featureCriteria: {
        euphoria_agitation: 'Euphoria, increased alertness and marked agitation',
        autonomic: 'Tachycardia, raised blood pressure, sweating and pupillary dilation; hyperthermia possible',
        paranoia: 'Suspiciousness, paranoid ideas or aggressive impulsivity',
        psychomotor: 'Psychomotor restlessness, stereotypies or repetitive movements',
      },
    }),
    synthetic_cathinones_psychotic_disorder: psychotic({ id: 'synthetic_cathinones_psychotic_disorder', prefix: 'synthetic_cathinones_5', name: 'Psychotic disorder induced by synthetic cathinones', substance: 'synthetic cathinones', icd10Intox: 'F15.0', icd10Delirium: 'F15.4' }),
    mdma_related_harmful_use: harmful({ id: 'mdma_related_harmful_use', prefix: 'mdma_related_1', name: 'Harmful use of MDMA or related empathogens', substance: 'MDMA or related empathogens', icd10Harm: 'F15.1', icd10Dep: 'F15.2' }),
    mdma_related_dependence: dependence({ id: 'mdma_related_dependence', prefix: 'mdma_related_2', name: 'Dependence syndrome due to MDMA or related empathogens', substance: 'MDMA or related empathogens', icd10Harm: 'F15.1', icd10Intox: 'F15.0' }),
    mdma_related_acute_intoxication: acute({
      id: 'mdma_related_acute_intoxication',
      prefix: 'mdma_related_0',
      name: 'Acute intoxication with MDMA or related empathogens',
      substance: 'MDMA or related empathogens',
      icd10Withdrawal: 'F15.3',
      featureCriteria: {
        euphoria_empathy: 'Euphoria, increased empathy and emotional openness',
        sensory: 'Heightened sensory perception and increased sociability',
        autonomic: 'Tachycardia, raised blood pressure, sweating and jaw clenching (bruxism)',
        hyperthermia: 'Hyperthermia and increased physical activity possible',
      },
    }),
    dissociative_drugs_harmful_use: harmful({ id: 'dissociative_drugs_harmful_use', prefix: 'dissociative_drugs_1', name: 'Harmful use of dissociative drugs including ketamine and PCP', substance: 'dissociative drugs including ketamine and PCP', icd10Harm: 'F19.1', icd10Dep: 'F19.2' }),
    dissociative_drugs_dependence: dependence({ id: 'dissociative_drugs_dependence', prefix: 'dissociative_drugs_2', name: 'Dependence syndrome due to dissociative drugs including ketamine and PCP', substance: 'dissociative drugs including ketamine and PCP', icd10Harm: 'F19.1', icd10Intox: 'F19.0' }),
    dissociative_drugs_acute_intoxication: acute({
      id: 'dissociative_drugs_acute_intoxication',
      prefix: 'dissociative_drugs_0',
      name: 'Acute intoxication with dissociative drugs including ketamine and PCP',
      substance: 'dissociative drugs including ketamine and PCP',
      icd10Withdrawal: 'F19.3',
      featureCriteria: {
        dissociation: 'Depersonalisation or derealisation, trance-like or out-of-body states',
        perceptual: 'Altered perception, illusions or hallucinations with partly preserved reality testing',
        motor: 'Coordination problems, gait unsteadiness or rigid posture',
        autonomic: 'Tachycardia, raised blood pressure or nystagmus',
      },
    }),
    dissociative_drugs_psychotic_disorder: psychotic({ id: 'dissociative_drugs_psychotic_disorder', prefix: 'dissociative_drugs_5', name: 'Psychotic disorder induced by dissociative drugs including ketamine and PCP', substance: 'dissociative drugs including ketamine and PCP', icd10Intox: 'F19.0', icd10Delirium: 'F19.4' }),
    multiple_specified_psychoactive_harmful_use: harmful({ id: 'multiple_specified_psychoactive_harmful_use', prefix: 'multiple_specified_psychoactive_1', name: 'Harmful use of multiple specified psychoactive substances including medications', substance: 'multiple specified psychoactive substances including medications', icd10Harm: 'F19.1', icd10Dep: 'F19.2' }),
    multiple_specified_psychoactive_dependence: dependence({ id: 'multiple_specified_psychoactive_dependence', prefix: 'multiple_specified_psychoactive_2', name: 'Dependence syndrome due to multiple specified psychoactive substances including medications', substance: 'multiple specified psychoactive substances including medications', icd10Harm: 'F19.1', icd10Intox: 'F19.0' }),
    unknown_psychoactive_harmful_use: harmful({ id: 'unknown_psychoactive_harmful_use', prefix: 'unknown_psychoactive_1', name: 'Harmful use of unknown or unspecified psychoactive substances', substance: 'unknown or unspecified psychoactive substances', icd10Harm: 'F19.1', icd10Dep: 'F19.2' }),
    unknown_psychoactive_dependence: dependence({ id: 'unknown_psychoactive_dependence', prefix: 'unknown_psychoactive_2', name: 'Dependence syndrome due to unknown or unspecified psychoactive substances', substance: 'unknown or unspecified psychoactive substances', icd10Harm: 'F19.1', icd10Intox: 'F19.0' }),
  }
}

void buildPack

export function buildFrPhaseBSubstance(): DisorderTranslationMap {
  const harmful = (s: HarmfulSpec): DisorderTranslation => ({
    name: s.name,
    differentials: [
      `Syndrome de dépendance (${s.icd10Dep})`,
      `Intoxication aiguë (${s.icd10Harm.replace('.1', '.0')})`,
      'Consommation à faible risque sans préjudice identifiable',
    ],
    groups: { [`${s.prefix}.harm`]: 'Consommation avec atteinte à la santé', [`${s.prefix}.exclusions`]: 'Exclusions' },
    criteria: {
      [`${s.prefix}.actual_use`]: `Une consommation effective de ${s.substance} est documentée`,
      [`${s.prefix}.health_damage`]: 'Atteinte démontrable à la santé physique ou mentale consécutive à la consommation',
      [`${s.prefix}.exclude_dependence`]: `Les critères d’un syndrome de dépendance (${s.icd10Dep}) ne sont pas remplis`,
    },
  })

  const dependence = (s: DependenceSpec): DisorderTranslation => ({
    name: s.name,
    differentials: [
      `Usage nocif de ${s.substance} (${s.icd10Harm}) sans dépendance`,
      `Intoxication aiguë (${s.icd10Intox})`,
      'Trouble de l’humeur ou psychotique induit par une substance',
    ],
    groups: { [`${s.prefix}.dependence`]: 'Caractéristiques de dépendance (au moins 3 sur une période de 12 mois)' },
    criteria: {
      [`${s.prefix}.craving`]: `Fort désir ou sentiment de contrainte de consommer ${s.substance} (craving)`,
      [`${s.prefix}.impaired_control`]: 'Capacité altérée à contrôler le début, l’arrêt et la quantité de consommation',
      [`${s.prefix}.withdrawal`]: 'État de sevrage physique lors de la réduction ou de l’arrêt, ou consommation pour soulager le sevrage',
      [`${s.prefix}.tolerance`]: 'Développement de la tolérance, nécessitant des doses accrues pour l’effet initial',
      [`${s.prefix}.neglect`]: 'Négligence progressive d’autres intérêts et temps accru consacré à l’obtention, l’usage et la récupération',
      [`${s.prefix}.persistence_harm`]: 'Poursuite de la consommation malgré des conséquences nocives démontrables',
    },
  })

  const withdrawal = (s: WithdrawalSpec): DisorderTranslation => ({
    name: s.name,
    differentials: [
      `Intoxication aiguë (${s.icd10Intox})`,
      `État de sevrage avec delirium (${s.icd10Delirium})`,
      'Trouble anxieux ou de l’humeur',
      'Maladie somatique avec symptômes autonomes',
    ],
    groups: {
      [`${s.prefix}.context`]: 'Contexte de sevrage',
      [`${s.prefix}.symptoms`]: 'Symptômes de sevrage (au moins 1)',
      [`${s.prefix}.exclusions`]: 'Exclusions',
    },
    criteria: {
      [`${s.prefix}.cessation`]: `Arrêt ou réduction de ${s.substance} après une consommation répétée, généralement soutenue et/ou à fortes doses`,
      [`${s.prefix}.withdrawal_syndrome`]: 'Un état de sevrage typique de la substance est présent',
      [`${s.prefix}.fatigue`]: 'Fatigue et épuisement marqués',
      [`${s.prefix}.exclude_other_cause`]: 'Les symptômes ne s’expliquent pas mieux par un autre trouble somatique ou mental',
      ...(s.extraCriteria ?? {}),
    },
  })

  const acute = (s: AcuteSpec): DisorderTranslation => ({
    name: s.name,
    differentials: [
      `État de sevrage (${s.icd10Withdrawal})`,
      'Delirium ou autre cause organique',
      'Trouble psychotique aigu',
      'Intoxication par une autre substance ou intoxication mixte',
    ],
    groups: {
      [`${s.prefix}.use`]: 'Preuve de consommation',
      [`${s.prefix}.signs`]: 'Signes d’intoxication typiques de la substance (au moins 1)',
      [`${s.prefix}.exclusions`]: 'Exclusions',
    },
    criteria: {
      [`${s.prefix}.recent_use`]: `Consommation récente de ${s.substance} à dose suffisamment élevée`,
      [`${s.prefix}.causal_link`]: 'Les symptômes sont en relation temporelle et causale directe avec l’effet aigu de la substance et sont transitoires',
      [`${s.prefix}.exclude_other_cause`]: 'Les symptômes ne s’expliquent pas mieux par une maladie somatique, un delirium ou un autre trouble mental',
      ...Object.fromEntries(Object.entries(s.featureCriteria).map(([k, v]) => [`${s.prefix}.${k}`, v])),
    },
  })

  const psychotic = (s: PsychoticSpec): DisorderTranslation => ({
    name: s.name,
    differentials: [
      'Schizophrénie ou trouble délirant persistant',
      `Intoxication aiguë (${s.icd10Intox}) avec phénomènes psychotiques`,
      `État de sevrage avec delirium (${s.icd10Delirium})`,
      'Trouble de l’humeur avec symptômes psychotiques',
    ],
    groups: {
      [`${s.prefix}.symptoms`]: 'Symptômes psychotiques (au moins 1)',
      [`${s.prefix}.context`]: 'Relation temporelle avec la consommation',
      [`${s.prefix}.exclusions`]: 'Exclusions',
    },
    criteria: {
      [`${s.prefix}.hallucinations`]: 'Hallucinations (souvent auditives ou visuelles) qui ne sont pas uniquement l’expression d’une intoxication simple',
      [`${s.prefix}.delusions`]: 'Idées délirantes, fréquemment délire de persécution ou de référence',
      [`${s.prefix}.temporal_relation`]: `Apparition des symptômes psychotiques pendant ou peu après (généralement dans les deux semaines) la consommation de ${s.substance}`,
      [`${s.prefix}.partial_remission`]: 'Les symptômes régressent généralement au moins partiellement dans un délai limité (de l’ordre de semaines à quelques mois)',
      [`${s.prefix}.exclude_primary_psychosis`]: 'Le tableau ne s’explique pas mieux par un trouble psychotique primaire et ne survient pas exclusivement dans un contexte d’intoxication ou de delirium de sevrage',
    },
  })

  const en = buildEnPhaseBSubstance()
  void en
  return {
    alcohol_harmful_use: harmful({ id: 'alcohol_harmful_use', prefix: 'f10_1', name: 'Usage nocif d’alcool', substance: 'alcool', icd10Harm: 'F10.1', icd10Dep: 'F10.2' }),
    caffeine_harmful_use: harmful({ id: 'caffeine_harmful_use', prefix: 'caffeine_1', name: 'Usage nocif de caféine', substance: 'caféine', icd10Harm: 'F15.1', icd10Dep: 'F15.2' }),
    caffeine_dependence: dependence({ id: 'caffeine_dependence', prefix: 'caffeine_2', name: 'Syndrome de dépendance à la caféine', substance: 'caféine', icd10Harm: 'F15.1', icd10Intox: 'F15.0' }),
    caffeine_withdrawal: withdrawal({ id: 'caffeine_withdrawal', prefix: 'caffeine_3', name: 'État de sevrage à la caféine', substance: 'caféine', icd10Intox: 'F15.0', icd10Delirium: 'F15.4', extraCriteria: { 'caffeine_3.headache': 'Céphalées, fatigue et troubles de la concentration', 'caffeine_3.dysphoria': 'Humeur dysphorique, irritabilité ou troubles de la concentration', 'caffeine_3.flu_like': 'Symptômes grippaux ou douleurs musculaires', 'caffeine_3.craving': 'Fort désir de consommer des boissons caféinées (craving)' } }),
    synthetic_cathinones_harmful_use: harmful({ id: 'synthetic_cathinones_harmful_use', prefix: 'synthetic_cathinones_1', name: 'Usage nocif de cathinones synthétiques', substance: 'cathinones synthétiques', icd10Harm: 'F15.1', icd10Dep: 'F15.2' }),
    synthetic_cathinones_dependence: dependence({ id: 'synthetic_cathinones_dependence', prefix: 'synthetic_cathinones_2', name: 'Syndrome de dépendance aux cathinones synthétiques', substance: 'cathinones synthétiques', icd10Harm: 'F15.1', icd10Intox: 'F15.0' }),
    synthetic_cathinones_acute_intoxication: acute({ id: 'synthetic_cathinones_acute_intoxication', prefix: 'synthetic_cathinones_0', name: 'Intoxication aiguë aux cathinones synthétiques', substance: 'cathinones synthétiques', icd10Withdrawal: 'F15.3', featureCriteria: { euphoria_agitation: 'Euphorie, vigilance accrue et agitation marquée', autonomic: 'Tachycardie, hypertension, sudation et mydriase ; hyperthermie possible', paranoia: 'Méfiance, idées paranoïdes ou impulsivité agressive', psychomotor: 'Agitation psychomotrice, stéréotypies ou mouvements répétitifs' } }),
    synthetic_cathinones_psychotic_disorder: psychotic({ id: 'synthetic_cathinones_psychotic_disorder', prefix: 'synthetic_cathinones_5', name: 'Trouble psychotique induit par les cathinones synthétiques', substance: 'cathinones synthétiques', icd10Intox: 'F15.0', icd10Delirium: 'F15.4' }),
    mdma_related_harmful_use: harmful({ id: 'mdma_related_harmful_use', prefix: 'mdma_related_1', name: 'Usage nocif de MDMA ou d’empathogènes apparentés', substance: 'MDMA ou empathogènes apparentés', icd10Harm: 'F15.1', icd10Dep: 'F15.2' }),
    mdma_related_dependence: dependence({ id: 'mdma_related_dependence', prefix: 'mdma_related_2', name: 'Syndrome de dépendance au MDMA ou aux empathogènes apparentés', substance: 'MDMA ou empathogènes apparentés', icd10Harm: 'F15.1', icd10Intox: 'F15.0' }),
    mdma_related_acute_intoxication: acute({ id: 'mdma_related_acute_intoxication', prefix: 'mdma_related_0', name: 'Intoxication aiguë au MDMA ou aux empathogènes apparentés', substance: 'MDMA ou empathogènes apparentés', icd10Withdrawal: 'F15.3', featureCriteria: { euphoria_empathy: 'Euphorie, empathie accrue et ouverture émotionnelle', sensory: 'Perception sensorielle accrue et sociabilité augmentée', autonomic: 'Tachycardie, hypertension, sudation et serrement de mâchoire (bruxisme)', hyperthermia: 'Hyperthermie et activité physique accrue possibles' } }),
    dissociative_drugs_harmful_use: harmful({ id: 'dissociative_drugs_harmful_use', prefix: 'dissociative_drugs_1', name: 'Usage nocif de substances dissociatives dont la kétamine et le PCP', substance: 'substances dissociatives dont la kétamine et le PCP', icd10Harm: 'F19.1', icd10Dep: 'F19.2' }),
    dissociative_drugs_dependence: dependence({ id: 'dissociative_drugs_dependence', prefix: 'dissociative_drugs_2', name: 'Syndrome de dépendance aux substances dissociatives dont la kétamine et le PCP', substance: 'substances dissociatives dont la kétamine et le PCP', icd10Harm: 'F19.1', icd10Intox: 'F19.0' }),
    dissociative_drugs_acute_intoxication: acute({ id: 'dissociative_drugs_acute_intoxication', prefix: 'dissociative_drugs_0', name: 'Intoxication aiguë par substances dissociatives dont la kétamine et le PCP', substance: 'substances dissociatives dont la kétamine et le PCP', icd10Withdrawal: 'F19.3', featureCriteria: { dissociation: 'Dépersonnalisation ou déréalisation, états de transe ou hors du corps', perceptual: 'Perception altérée, illusions ou hallucinations avec testing de la réalité partiellement conservé', motor: 'Troubles de coordination, démarche instable ou posture rigide', autonomic: 'Tachycardie, hypertension ou nystagmus' } }),
    dissociative_drugs_psychotic_disorder: psychotic({ id: 'dissociative_drugs_psychotic_disorder', prefix: 'dissociative_drugs_5', name: 'Trouble psychotique induit par des substances dissociatives dont la kétamine et le PCP', substance: 'substances dissociatives dont la kétamine et le PCP', icd10Intox: 'F19.0', icd10Delirium: 'F19.4' }),
    multiple_specified_psychoactive_harmful_use: harmful({ id: 'multiple_specified_psychoactive_harmful_use', prefix: 'multiple_specified_psychoactive_1', name: 'Usage nocif de substances psychotropes multiples spécifiées, y compris des médicaments', substance: 'substances psychotropes multiples spécifiées, y compris des médicaments', icd10Harm: 'F19.1', icd10Dep: 'F19.2' }),
    multiple_specified_psychoactive_dependence: dependence({ id: 'multiple_specified_psychoactive_dependence', prefix: 'multiple_specified_psychoactive_2', name: 'Syndrome de dépendance aux substances psychotropes multiples spécifiées, y compris des médicaments', substance: 'substances psychotropes multiples spécifiées, y compris des médicaments', icd10Harm: 'F19.1', icd10Intox: 'F19.0' }),
    unknown_psychoactive_harmful_use: harmful({ id: 'unknown_psychoactive_harmful_use', prefix: 'unknown_psychoactive_1', name: 'Usage nocif de substances psychotropes inconnues ou non précisées', substance: 'substances psychotropes inconnues ou non précisées', icd10Harm: 'F19.1', icd10Dep: 'F19.2' }),
    unknown_psychoactive_dependence: dependence({ id: 'unknown_psychoactive_dependence', prefix: 'unknown_psychoactive_2', name: 'Syndrome de dépendance aux substances psychotropes inconnues ou non précisées', substance: 'substances psychotropes inconnues ou non précisées', icd10Harm: 'F19.1', icd10Intox: 'F19.0' }),
  }
}

export function buildEsPhaseBSubstance(): DisorderTranslationMap {
  const harmful = (s: HarmfulSpec): DisorderTranslation => ({
    name: s.name,
    differentials: [
      `Síndrome de dependencia (${s.icd10Dep})`,
      `Intoxicación aguda (${s.icd10Harm.replace('.1', '.0')})`,
      'Consumo de bajo riesgo sin daño identificable',
    ],
    groups: { [`${s.prefix}.harm`]: 'Consumo con daño para la salud', [`${s.prefix}.exclusions`]: 'Exclusiones' },
    criteria: {
      [`${s.prefix}.actual_use`]: `Se documenta consumo efectivo de ${s.substance}`,
      [`${s.prefix}.health_damage`]: 'Daño demostrable para la salud física o mental como consecuencia del consumo',
      [`${s.prefix}.exclude_dependence`]: `No se cumplen los criterios de síndrome de dependencia (${s.icd10Dep})`,
    },
  })

  const dependence = (s: DependenceSpec): DisorderTranslation => ({
    name: s.name,
    differentials: [
      `Uso nocivo de ${s.substance} (${s.icd10Harm}) sin dependencia`,
      `Intoxicación aguda (${s.icd10Intox})`,
      'Trastorno del estado de ánimo o psicótico inducido por sustancias',
    ],
    groups: { [`${s.prefix}.dependence`]: 'Rasgos de dependencia (al menos 3 en un periodo de 12 meses)' },
    criteria: {
      [`${s.prefix}.craving`]: `Fuerte deseo o sensación de compulsión de consumir ${s.substance} (craving)`,
      [`${s.prefix}.impaired_control`]: 'Capacidad alterada para controlar el inicio, la cesación y la cantidad de consumo',
      [`${s.prefix}.withdrawal`]: 'Estado de abstinencia física al reducir o interrumpir el consumo, o consumo para aliviar la abstinencia',
      [`${s.prefix}.tolerance`]: 'Desarrollo de tolerancia, requiriendo dosis mayores para lograr el efecto original',
      [`${s.prefix}.neglect`]: 'Negligencia progresiva de otros intereses y mayor tiempo dedicado a obtener, usar y recuperarse de la sustancia',
      [`${s.prefix}.persistence_harm`]: 'Consumo continuado a pesar de consecuencias perjudiciales demostrables',
    },
  })

  const withdrawal = (s: WithdrawalSpec): DisorderTranslation => ({
    name: s.name,
    differentials: [
      `Intoxicación aguda (${s.icd10Intox})`,
      `Estado de abstinencia con delirio (${s.icd10Delirium})`,
      'Trastorno de ansiedad o del estado de ánimo',
      'Enfermedad somática con síntomas autonómicos',
    ],
    groups: {
      [`${s.prefix}.context`]: 'Contexto de abstinencia',
      [`${s.prefix}.symptoms`]: 'Síntomas de abstinencia (al menos 1)',
      [`${s.prefix}.exclusions`]: 'Exclusiones',
    },
    criteria: {
      [`${s.prefix}.cessation`]: `Cese o reducción de ${s.substance} tras consumo repetido, generalmente sostenido y/o en dosis altas`,
      [`${s.prefix}.withdrawal_syndrome`]: 'Está presente un estado de abstinencia típico de la sustancia',
      [`${s.prefix}.fatigue`]: 'Cansancio y agotamiento marcados',
      [`${s.prefix}.exclude_other_cause`]: 'Los síntomas no se explican mejor por otro trastorno somático o mental',
      ...(s.extraCriteria ?? {}),
    },
  })

  const acute = (s: AcuteSpec): DisorderTranslation => ({
    name: s.name,
    differentials: [
      `Estado de abstinencia (${s.icd10Withdrawal})`,
      'Delirio u otra causa orgánica',
      'Trastorno psicótico agudo',
      'Intoxicación por otra sustancia o intoxicación mixta',
    ],
    groups: {
      [`${s.prefix}.use`]: 'Evidencia de consumo',
      [`${s.prefix}.signs`]: 'Signos de intoxicación típicos de la sustancia (al menos 1)',
      [`${s.prefix}.exclusions`]: 'Exclusiones',
    },
    criteria: {
      [`${s.prefix}.recent_use`]: `Consumo reciente de ${s.substance} en dosis suficientemente alta`,
      [`${s.prefix}.causal_link`]: 'Los síntomas están en relación temporal y causal directa con el efecto agudo de la sustancia y son transitorios',
      [`${s.prefix}.exclude_other_cause`]: 'Los síntomas no se explican mejor por enfermedad somática, delirio u otro trastorno mental',
      ...Object.fromEntries(Object.entries(s.featureCriteria).map(([k, v]) => [`${s.prefix}.${k}`, v])),
    },
  })

  const psychotic = (s: PsychoticSpec): DisorderTranslation => ({
    name: s.name,
    differentials: [
      'Esquizofrenia o trastorno delirante persistente',
      `Intoxicación aguda (${s.icd10Intox}) con fenómenos psicóticos`,
      `Estado de abstinencia con delirio (${s.icd10Delirium})`,
      'Trastorno del estado de ánimo con síntomas psicóticos',
    ],
    groups: {
      [`${s.prefix}.symptoms`]: 'Síntomas psicóticos (al menos 1)',
      [`${s.prefix}.context`]: 'Relación temporal con el consumo',
      [`${s.prefix}.exclusions`]: 'Exclusiones',
    },
    criteria: {
      [`${s.prefix}.hallucinations`]: 'Alucinaciones (frecuentemente auditivas o visuales) que no son solo expresión de intoxicación simple',
      [`${s.prefix}.delusions`]: 'Ideas delirantes, frecuentemente de persecución o referencia',
      [`${s.prefix}.temporal_relation`]: `Inicio de los síntomas psicóticos durante o poco después (normalmente dentro de dos semanas) del consumo de ${s.substance}`,
      [`${s.prefix}.partial_remission`]: 'Los síntomas suelen remitir al menos parcialmente en un periodo limitado (del orden de semanas a pocos meses)',
      [`${s.prefix}.exclude_primary_psychosis`]: 'El cuadro no se explica mejor por un trastorno psicótico primario y no ocurre exclusivamente en contexto de intoxicación o delirium de abstinencia',
    },
  })

  return {
    alcohol_harmful_use: harmful({ id: 'alcohol_harmful_use', prefix: 'f10_1', name: 'Uso nocivo del alcohol', substance: 'alcohol', icd10Harm: 'F10.1', icd10Dep: 'F10.2' }),
    caffeine_harmful_use: harmful({ id: 'caffeine_harmful_use', prefix: 'caffeine_1', name: 'Uso nocivo de cafeína', substance: 'cafeína', icd10Harm: 'F15.1', icd10Dep: 'F15.2' }),
    caffeine_dependence: dependence({ id: 'caffeine_dependence', prefix: 'caffeine_2', name: 'Síndrome de dependencia de cafeína', substance: 'cafeína', icd10Harm: 'F15.1', icd10Intox: 'F15.0' }),
    caffeine_withdrawal: withdrawal({ id: 'caffeine_withdrawal', prefix: 'caffeine_3', name: 'Estado de abstinencia de cafeína', substance: 'cafeína', icd10Intox: 'F15.0', icd10Delirium: 'F15.4', extraCriteria: { 'caffeine_3.headache': 'Cefalea, cansancio y dificultades de concentración', 'caffeine_3.dysphoria': 'Estado de ánimo disfórico, irritabilidad o dificultades de concentración', 'caffeine_3.flu_like': 'Síntomas gripales o dolores musculares', 'caffeine_3.craving': 'Fuerte deseo de consumir bebidas con cafeína (craving)' } }),
    synthetic_cathinones_harmful_use: harmful({ id: 'synthetic_cathinones_harmful_use', prefix: 'synthetic_cathinones_1', name: 'Uso nocivo de catinonas sintéticas', substance: 'catinonas sintéticas', icd10Harm: 'F15.1', icd10Dep: 'F15.2' }),
    synthetic_cathinones_dependence: dependence({ id: 'synthetic_cathinones_dependence', prefix: 'synthetic_cathinones_2', name: 'Síndrome de dependencia por catinonas sintéticas', substance: 'catinonas sintéticas', icd10Harm: 'F15.1', icd10Intox: 'F15.0' }),
    synthetic_cathinones_acute_intoxication: acute({ id: 'synthetic_cathinones_acute_intoxication', prefix: 'synthetic_cathinones_0', name: 'Intoxicación aguda por catinonas sintéticas', substance: 'catinonas sintéticas', icd10Withdrawal: 'F15.3', featureCriteria: { euphoria_agitation: 'Euforia, mayor alerta y agitación marcada', autonomic: 'Taquicardia, hipertensión, sudoración y midriasis; posible hipertermia', paranoia: 'Desconfianza, ideas paranoides o impulsividad agresiva', psychomotor: 'Inquietud psicomotora, estereotipias o movimientos repetitivos' } }),
    synthetic_cathinones_psychotic_disorder: psychotic({ id: 'synthetic_cathinones_psychotic_disorder', prefix: 'synthetic_cathinones_5', name: 'Trastorno psicótico inducido por catinonas sintéticas', substance: 'catinonas sintéticas', icd10Intox: 'F15.0', icd10Delirium: 'F15.4' }),
    mdma_related_harmful_use: harmful({ id: 'mdma_related_harmful_use', prefix: 'mdma_related_1', name: 'Uso nocivo de MDMA o empatógenos relacionados', substance: 'MDMA o empatógenos relacionados', icd10Harm: 'F15.1', icd10Dep: 'F15.2' }),
    mdma_related_dependence: dependence({ id: 'mdma_related_dependence', prefix: 'mdma_related_2', name: 'Síndrome de dependencia por MDMA o empatógenos relacionados', substance: 'MDMA o empatógenos relacionados', icd10Harm: 'F15.1', icd10Intox: 'F15.0' }),
    mdma_related_acute_intoxication: acute({ id: 'mdma_related_acute_intoxication', prefix: 'mdma_related_0', name: 'Intoxicación aguda por MDMA o empatógenos relacionados', substance: 'MDMA o empatógenos relacionados', icd10Withdrawal: 'F15.3', featureCriteria: { euphoria_empathy: 'Euforia, mayor empatía y apertura emocional', sensory: 'Percepción sensorial aumentada y mayor sociabilidad', autonomic: 'Taquicardia, hipertensión, sudoración y bruxismo', hyperthermia: 'Posible hipertermia y mayor actividad física' } }),
    dissociative_drugs_harmful_use: harmful({ id: 'dissociative_drugs_harmful_use', prefix: 'dissociative_drugs_1', name: 'Uso nocivo de sustancias disociativas incluidos ketamina y PCP', substance: 'sustancias disociativas incluidos ketamina y PCP', icd10Harm: 'F19.1', icd10Dep: 'F19.2' }),
    dissociative_drugs_dependence: dependence({ id: 'dissociative_drugs_dependence', prefix: 'dissociative_drugs_2', name: 'Síndrome de dependencia por sustancias disociativas incluidos ketamina y PCP', substance: 'sustancias disociativas incluidos ketamina y PCP', icd10Harm: 'F19.1', icd10Intox: 'F19.0' }),
    dissociative_drugs_acute_intoxication: acute({ id: 'dissociative_drugs_acute_intoxication', prefix: 'dissociative_drugs_0', name: 'Intoxicación aguda por sustancias disociativas incluidos ketamina y PCP', substance: 'sustancias disociativas incluidos ketamina y PCP', icd10Withdrawal: 'F19.3', featureCriteria: { dissociation: 'Despersonalización o desrealización, estados de trance o fuera del cuerpo', perceptual: 'Percepción alterada, ilusiones o alucinaciones con juicio de realidad parcialmente conservado', motor: 'Problemas de coordinación, inestabilidad de la marcha o postura rígida', autonomic: 'Taquicardia, hipertensión o nistagmo' } }),
    dissociative_drugs_psychotic_disorder: psychotic({ id: 'dissociative_drugs_psychotic_disorder', prefix: 'dissociative_drugs_5', name: 'Trastorno psicótico inducido por sustancias disociativas incluidos ketamina y PCP', substance: 'sustancias disociativas incluidos ketamina y PCP', icd10Intox: 'F19.0', icd10Delirium: 'F19.4' }),
    multiple_specified_psychoactive_harmful_use: harmful({ id: 'multiple_specified_psychoactive_harmful_use', prefix: 'multiple_specified_psychoactive_1', name: 'Uso nocivo de múltiples sustancias psicotrópicas especificadas incluidos medicamentos', substance: 'múltiples sustancias psicotrópicas especificadas incluidos medicamentos', icd10Harm: 'F19.1', icd10Dep: 'F19.2' }),
    multiple_specified_psychoactive_dependence: dependence({ id: 'multiple_specified_psychoactive_dependence', prefix: 'multiple_specified_psychoactive_2', name: 'Síndrome de dependencia por múltiples sustancias psicotrópicas especificadas incluidos medicamentos', substance: 'múltiples sustancias psicotrópicas especificadas incluidos medicamentos', icd10Harm: 'F19.1', icd10Intox: 'F19.0' }),
    unknown_psychoactive_harmful_use: harmful({ id: 'unknown_psychoactive_harmful_use', prefix: 'unknown_psychoactive_1', name: 'Uso nocivo de sustancias psicotrópicas desconocidas o no especificadas', substance: 'sustancias psicotrópicas desconocidas o no especificadas', icd10Harm: 'F19.1', icd10Dep: 'F19.2' }),
    unknown_psychoactive_dependence: dependence({ id: 'unknown_psychoactive_dependence', prefix: 'unknown_psychoactive_2', name: 'Síndrome de dependencia por sustancias psicotrópicas desconocidas o no especificadas', substance: 'sustancias psicotrópicas desconocidas o no especificadas', icd10Harm: 'F19.1', icd10Intox: 'F19.0' }),
  }
}
