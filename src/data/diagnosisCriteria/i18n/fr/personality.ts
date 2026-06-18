import type { DisorderTranslationMap } from '../types'

/**
 * Chaînes FR partagées pour les ensembles dimensionnels distincts CIM-11 6D10/6D11
 * rattachés à chaque trouble catégoriel F60.x. Le texte général/sévérité/exclusion
 * est identique d’un trouble à l’autre (seul le slug d’id par trouble diffère) ; les
 * domaines de traits sélectionnés encodent la passerelle catégoriel→dimensionnel.
 */
type Icd11TraitKey =
  | 'negative_affectivity'
  | 'detachment'
  | 'dissociality'
  | 'disinhibition'
  | 'anankastia'
  | 'borderline_pattern'

const ICD11_PD_GROUP_TEXT = {
  general:
    'Critères généraux d’un trouble de la personnalité (CIM-11 6D10 : altération du fonctionnement du self et/ou interpersonnel)',
  severity: 'Cotation de la sévérité (exactement un niveau ; 6D10)',
  traits: 'Qualificatifs de domaines de traits (un ou plusieurs ; 6D11)',
  exclusions: 'Exclusions / diagnostic différentiel',
}

const ICD11_PD_CORE_TEXT = {
  self: 'Altération d’aspects du self (identité, estime de soi, vision réaliste de soi, autorégulation et capacité à fixer des objectifs)',
  interpersonal:
    'Altération du fonctionnement interpersonnel (établir et maintenir des relations proches et mutuellement satisfaisantes, comprendre le point de vue d’autrui et gérer les conflits)',
  duration:
    'Le mode persiste sur une période prolongée (de l’ordre de ≥ 2 ans), se manifeste de façon envahissante à travers les situations et n’est pas limité à une situation déclenchante circonscrite',
}

const ICD11_PD_SEVERITY_TEXT = {
  mild: 'Léger : altération de certains domaines du fonctionnement du self et/ou interpersonnel, avec fonctionnement préservé dans de nombreux domaines ; en général pas de risque notable d’atteinte à soi ou à autrui (6D10.0)',
  moderate:
    'Modéré : problèmes nets dans plusieurs domaines de fonctionnement, avec altération marquée de la plupart des relations interpersonnelles et des rôles sociaux/professionnels (6D10.1)',
  severe:
    'Sévère : altération grave du fonctionnement du self et interpersonnel à travers presque tous les domaines de la vie ; souvent risque considérable d’atteinte à soi ou à autrui (6D10.2)',
}

const ICD11_PD_EXCLUDE_TEXT =
  'Les anomalies ne sont pas mieux expliquées par un autre trouble mental, un effet d’une substance ou une maladie du système nerveux, et ne sont ni typiques d’une phase de développement ni normatives sur le plan socioculturel'

const ICD11_PD_TRAIT_TEXT: Record<Icd11TraitKey, string> = {
  negative_affectivity:
    'Affectivité négative : tendance à un large éventail d’émotions négatives avec une fréquence et une intensité disproportionnées (p. ex. anxiété, labilité émotionnelle, méfiance, faible estime de soi) (6D11.0)',
  detachment:
    'Détachement : tendance au retrait social et émotionnel, à un engagement relationnel limité et à une expression affective réduite (6D11.1)',
  dissociality:
    'Dissocialité : mépris des droits et des sentiments d’autrui, égocentrisme, absence d’empathie et manque d’égards (y compris méfiance ou dédain persistants envers autrui) (6D11.2)',
  disinhibition:
    'Désinhibition : tendance à agir impulsivement en réponse à des stimuli internes ou externes immédiats, sans tenir compte des conséquences à plus long terme (6D11.3)',
  anankastia:
    'Anankasme : focalisation sur des standards rigides de perfection, d’ordre, de régularité et de contrôle de son propre comportement et de celui d’autrui (6D11.4)',
  borderline_pattern:
    'Mode borderline : instabilité envahissante de l’image de soi, des relations et de l’affect, avec impulsivité, crainte de l’abandon et auto-agression récurrente (6D11.5)',
}

function icd11PdGroups(slug: string): Record<string, string> {
  return {
    [`6d10_${slug}.general`]: ICD11_PD_GROUP_TEXT.general,
    [`6d10_${slug}.severity`]: ICD11_PD_GROUP_TEXT.severity,
    [`6d11_${slug}.traits`]: ICD11_PD_GROUP_TEXT.traits,
    [`6d10_${slug}.exclusions`]: ICD11_PD_GROUP_TEXT.exclusions,
  }
}

function icd11PdCriteria(slug: string, traits: Icd11TraitKey[]): Record<string, string> {
  const out: Record<string, string> = {
    [`6d10_${slug}.self_dysfunction`]: ICD11_PD_CORE_TEXT.self,
    [`6d10_${slug}.interpersonal_dysfunction`]: ICD11_PD_CORE_TEXT.interpersonal,
    [`6d10_${slug}.duration_pervasive`]: ICD11_PD_CORE_TEXT.duration,
    [`6d10_${slug}.severity_mild`]: ICD11_PD_SEVERITY_TEXT.mild,
    [`6d10_${slug}.severity_moderate`]: ICD11_PD_SEVERITY_TEXT.moderate,
    [`6d10_${slug}.severity_severe`]: ICD11_PD_SEVERITY_TEXT.severe,
    [`6d10_${slug}.not_better_explained`]: ICD11_PD_EXCLUDE_TEXT,
  }
  for (const t of traits) out[`6d11_${slug}.${t}`] = ICD11_PD_TRAIT_TEXT[t]
  return out
}

/** FR translations — ICD-10 F6 block. */
export const frPersonality: DisorderTranslationMap = {
  binge_eating_disorder: {
    name: 'Trouble d’hyperphagie boulimique (binge eating)',
    differentials: [
      'Boulimie nerveuse (avec mesures compensatoires régulières)',
      'Obésité sans accès hyperphagiques',
      'Épisode dépressif avec augmentation de l’appétit',
      'Syndrome d’alimentation nocturne',
    ],
    groups: {
      'f50_4.core':
        'Noyau : accès hyperphagiques récurrents sans mesures compensatoires régulières',
      'f50_4.exclusions': 'Exclusions',
    },
    criteria: {
      'binge_eating.recurrent_binges':
        'Accès hyperphagiques récurrents avec ingestion de quantités d’aliments inhabituellement importantes et perte de contrôle marquée sur la prise alimentaire',
      'binge_eating.distress':
        'Souffrance nette en lien avec les accès hyperphagiques (p. ex. honte, culpabilité, dégoût), sans mesures compensatoires régulières',
      'binge_eating.exclude_compensatory':
        'Absence de mesures compensatoires régulières qui orienteraient plutôt vers une boulimie nerveuse',
    },
  },
  paranoid_personality_disorder: {
    name: 'Personnalité paranoïaque',
    differentials: [
      'Trouble délirant / schizophrénie paranoïde (symptômes psychotiques circonscrits)',
      'Personnalité schizoïde ou schizotypique',
      'Réaction paranoïde persistante face à un stress réel',
      'Symptomatologie paranoïde induite par une substance',
    ],
    groups: {
      ...icd11PdGroups('par'),
      'f60_0.general':
        'Critères généraux d’un trouble de la personnalité (F60 généraux)',
      'f60_0.features': 'Traits caractéristiques (au moins 4)',
      'f60_0.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      ...icd11PdCriteria('par', ['negative_affectivity', 'dissociality']),
      'f60_0.general_deviation':
        'Mode durable de vécu intérieur et de comportement qui dévie nettement des attentes de l’environnement socioculturel et se manifeste dans la cognition, l’affectivité, le contrôle des impulsions ou les relations interpersonnelles',
      'f60_0.general_pervasive':
        'Le mode déviant est envahissant et rigide à travers un large éventail de situations personnelles et sociales (non limité à une seule situation déclenchante)',
      'f60_0.general_distress':
        'Le mode entraîne une souffrance personnelle et/ou une altération marquée du fonctionnement social, professionnel ou d’autres domaines importants',
      'f60_0.general_onset':
        'Le mode est stable et de longue durée, et son début peut être retracé jusqu’à l’adolescence ou au début de l’âge adulte',
      'f60_0.general_not_organic':
        'Le mode n’est pas l’expression ou la conséquence d’un autre trouble mental et n’est pas directement causé par une maladie, une lésion ou un dysfonctionnement cérébral',
      'f60_0.suspiciousness':
        'Méfiance permanente et tendance à interpréter les agissements d’autrui comme hostiles ou méprisants, sans éléments suffisants',
      'f60_0.grudges':
        'Comportement rancunier : ressentiment durable, manque de disposition à pardonner les offenses ou les marques de mépris',
      'f60_0.distrust_loyalty':
        'Doutes récurrents et injustifiés quant à la loyauté ou la fiabilité des amis, des partenaires ou des collègues',
      'f60_0.reluctance_confide':
        'Réticence à se confier à autrui par crainte injustifiée que l’information puisse être utilisée à mauvais escient',
      'f60_0.hidden_meanings':
        'Tendance à percevoir des significations cachées, dégradantes ou menaçantes dans des remarques ou des événements anodins',
      'f60_0.self_reference':
        'Sentiment exagéré de l’importance de soi, souvent associé à un fort sentiment d’avoir droit à tout et à une revendication querelleuse de ses propres droits',
      'f60_0.jealousy':
        'Soupçon injustifié et tenace concernant la fidélité sexuelle du partenaire',
      'f60_0.exclude_psychosis':
        'La méfiance ne survient pas exclusivement dans le cadre d’une schizophrénie ou d’un trouble délirant persistant et n’atteint pas une qualité délirante circonscrite',
    },
  },
  schizoid_personality_disorder: {
    name: 'Personnalité schizoïde',
    differentials: [
      'Trouble du spectre de l’autisme (début dans la petite enfance, modes répétitifs)',
      'Trouble schizotypique / prodrome schizophrénique',
      'Personnalité paranoïaque',
      'Personnalité anxieuse (évitante) (retrait par anxiété, et non par désintérêt)',
      'Épisode dépressif avec retrait social',
    ],
    groups: {
      ...icd11PdGroups('szd'),
      'f60_1.general':
        'Critères généraux d’un trouble de la personnalité (F60 généraux)',
      'f60_1.features': 'Traits caractéristiques (au moins 4)',
      'f60_1.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      ...icd11PdCriteria('szd', ['detachment']),
      'f60_1.general_deviation':
        'Mode durable de vécu intérieur et de comportement qui dévie nettement des attentes de l’environnement socioculturel et se manifeste dans la cognition, l’affectivité, le contrôle des impulsions ou les relations interpersonnelles',
      'f60_1.general_pervasive':
        'Le mode déviant est envahissant et rigide à travers un large éventail de situations personnelles et sociales (non limité à une seule situation déclenchante)',
      'f60_1.general_distress':
        'Le mode entraîne une souffrance personnelle et/ou une altération marquée du fonctionnement social, professionnel ou d’autres domaines importants',
      'f60_1.general_onset':
        'Le mode est stable et de longue durée, et son début peut être retracé jusqu’à l’adolescence ou au début de l’âge adulte',
      'f60_1.general_not_organic':
        'Le mode n’est pas l’expression ou la conséquence d’un autre trouble mental et n’est pas directement causé par une maladie, une lésion ou un dysfonctionnement cérébral',
      'f60_1.anhedonia':
        'Peu ou pas d’activités procurant du plaisir (capacité réduite à éprouver du plaisir)',
      'f60_1.emotional_coldness':
        'Froideur émotionnelle, détachement ou affectivité émoussée dans les contacts interpersonnels',
      'f60_1.limited_warmth':
        'Capacité réduite à exprimer des sentiments chaleureux, tendres, ou même de la colère, envers autrui',
      'f60_1.indifference_praise':
        'Indifférence apparente aux éloges comme aux critiques d’autrui',
      'f60_1.little_sexual_interest':
        'Faible intérêt pour les expériences sexuelles avec une autre personne',
      'f60_1.solitary':
        'Nette préférence pour les activités solitaires ; choix quasi systématique d’occupations menées seul',
      'f60_1.no_close_friends':
        'Peu ou pas d’amitiés proches ou de relations de confiance, et absence de désir d’en avoir',
      'f60_1.insensitive_norms':
        'Insensibilité aux normes et conventions sociales en vigueur (non-respect involontaire)',
      'f60_1.exclude_asd_schizo':
        'Le retrait n’est pas mieux expliqué par un trouble du spectre de l’autisme, un trouble schizotypique ou une affection schizophrénique',
    },
  },
  dissocial_personality_disorder: {
    name: 'Personnalité dyssociale (antisociale)',
    differentials: [
      'Trouble des conduites (avant l’âge de 18 ans)',
      'Épisode maniaque ou hypomaniaque avec désinhibition',
      'Trouble lié à l’usage de substances avec comportement dyssocial sous intoxication',
      'Personnalité émotionnellement labile',
      'Comportement dyssocial secondaire à un trouble psychotique',
    ],
    groups: {
      ...icd11PdGroups('dsoc'),
      'f60_2.general':
        'Critères généraux d’un trouble de la personnalité (F60 généraux)',
      'f60_2.features': 'Traits caractéristiques (au moins 3)',
      'f60_2.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      ...icd11PdCriteria('dsoc', ['dissociality', 'disinhibition']),
      'f60_2.general_deviation':
        'Mode durable de vécu intérieur et de comportement qui dévie nettement des attentes de l’environnement socioculturel et se manifeste dans la cognition, l’affectivité, le contrôle des impulsions ou les relations interpersonnelles',
      'f60_2.general_pervasive':
        'Le mode déviant est envahissant et rigide à travers un large éventail de situations personnelles et sociales (non limité à une seule situation déclenchante)',
      'f60_2.general_distress':
        'Le mode entraîne une souffrance personnelle et/ou une altération marquée du fonctionnement social, professionnel ou d’autres domaines importants',
      'f60_2.general_onset':
        'Le mode est stable et de longue durée, et son début peut être retracé jusqu’à l’adolescence ou au début de l’âge adulte',
      'f60_2.general_not_organic':
        'Le mode n’est pas l’expression ou la conséquence d’un autre trouble mental et n’est pas directement causé par une maladie, une lésion ou un dysfonctionnement cérébral',
      'f60_2.callousness':
        'Indifférence froide envers les sentiments d’autrui et manque d’empathie',
      'f60_2.irresponsibility':
        'Irresponsabilité marquée et persistante, avec mépris des normes, règles et obligations sociales',
      'f60_2.unstable_relationships':
        'Incapacité à maintenir des relations durables, alors que la capacité à les nouer est préservée',
      'f60_2.low_frustration_aggression':
        'Très faible tolérance à la frustration, avec seuil bas de déclenchement de comportements agressifs ou violents',
      'f60_2.no_guilt':
        'Absence de sentiment de culpabilité et incapacité à tirer des leçons des expériences négatives, en particulier des sanctions',
      'f60_2.blaming_others':
        'Tendance marquée à blâmer autrui ou à fournir des rationalisations superficielles pour son propre comportement',
      'f60_2.deceitfulness':
        'Mensonges, tromperies ou manipulations répétés d’autrui à des fins personnelles ou par plaisir (passerelle CIM-11/DSM)',
      'f60_2.exclude_mania_substance':
        'Le comportement ne survient pas exclusivement dans le cadre d’un épisode maniaque, d’un trouble schizophrénique ou d’une intoxication par une substance',
    },
  },
  emotionally_unstable_pd_impulsive: {
    name: 'Personnalité émotionnellement labile, type impulsif',
    differentials: [
      'Personnalité émotionnellement labile, type borderline (F60.31)',
      'Épisode hypomaniaque/maniaque',
      'TDAH de l’adulte avec impulsivité',
      'Désinhibition liée à une substance',
      'Personnalité dyssociale',
    ],
    groups: {
      ...icd11PdGroups('eui'),
      'f60_30.general':
        'Critères généraux d’un trouble de la personnalité (F60 généraux)',
      'f60_30.features':
        'Traits caractéristiques (type impulsif ; au moins 3, dont l’instabilité affective)',
      'f60_30.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      ...icd11PdCriteria('eui', ['disinhibition', 'negative_affectivity']),
      'f60_30.general_deviation':
        'Mode durable de vécu intérieur et de comportement qui dévie nettement des attentes de l’environnement socioculturel et se manifeste dans la cognition, l’affectivité, le contrôle des impulsions ou les relations interpersonnelles',
      'f60_30.general_pervasive':
        'Le mode déviant est envahissant et rigide à travers un large éventail de situations personnelles et sociales (non limité à une seule situation déclenchante)',
      'f60_30.general_distress':
        'Le mode entraîne une souffrance personnelle et/ou une altération marquée du fonctionnement social, professionnel ou d’autres domaines importants',
      'f60_30.general_onset':
        'Le mode est stable et de longue durée, et son début peut être retracé jusqu’à l’adolescence ou au début de l’âge adulte',
      'f60_30.general_not_organic':
        'Le mode n’est pas l’expression ou la conséquence d’un autre trouble mental et n’est pas directement causé par une maladie, une lésion ou un dysfonctionnement cérébral',
      'f60_30.impulsivity':
        'Nette tendance à agir de manière inattendue et impulsive, sans tenir compte des conséquences',
      'f60_30.quarrelsome':
        'Nette tendance aux querelles et aux conflits avec autrui, surtout lorsque les actes impulsifs sont contrariés ou critiqués',
      'f60_30.outbursts':
        'Tendance aux accès de colère ou de violence, avec incapacité à contrôler le comportement explosif qui en résulte',
      'f60_30.affective_instability':
        'Humeur instable et capricieuse, avec rapide labilité affective',
      'f60_30.difficulty_planning':
        'Difficulté à planifier les actions à l’avance et à les mener à terme lorsqu’elles n’apportent pas de récompense immédiate',
      'f60_30.exclude_mania_substance':
        'L’impulsivité/la labilité affective ne survient pas exclusivement dans le cadre d’un épisode affectif ou d’un effet d’une substance',
    },
  },
  emotionally_unstable_pd_borderline: {
    name: 'Personnalité émotionnellement labile, type borderline',
    differentials: [
      'Personnalité émotionnellement labile, type impulsif (F60.30)',
      'Trouble affectif bipolaire (épisodes plutôt qu’instabilité continue)',
      'Trouble de stress post-traumatique complexe',
      'Personnalité histrionique ou dyssociale',
      'Trouble lié à l’usage de substances',
    ],
    groups: {
      ...icd11PdGroups('bdl'),
      'f60_31.general':
        'Critères généraux d’un trouble de la personnalité (F60 généraux)',
      'f60_31.impulsive_core': 'Traits du type impulsif (au moins 2)',
      'f60_31.borderline_features': 'Traits borderline (au moins 2)',
      'f60_31.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      ...icd11PdCriteria('bdl', ['borderline_pattern', 'negative_affectivity']),
      'f60_31.general_deviation':
        'Mode durable de vécu intérieur et de comportement qui dévie nettement des attentes de l’environnement socioculturel et se manifeste dans la cognition, l’affectivité, le contrôle des impulsions ou les relations interpersonnelles',
      'f60_31.general_pervasive':
        'Le mode déviant est envahissant et rigide à travers un large éventail de situations personnelles et sociales (non limité à une seule situation déclenchante)',
      'f60_31.general_distress':
        'Le mode entraîne une souffrance personnelle et/ou une altération marquée du fonctionnement social, professionnel ou d’autres domaines importants',
      'f60_31.general_onset':
        'Le mode est stable et de longue durée, et son début peut être retracé jusqu’à l’adolescence ou au début de l’âge adulte',
      'f60_31.general_not_organic':
        'Le mode n’est pas l’expression ou la conséquence d’un autre trouble mental et n’est pas directement causé par une maladie, une lésion ou un dysfonctionnement cérébral',
      'f60_31.impulsivity':
        'Impulsivité marquée, avec passage à l’acte sans tenir compte des conséquences',
      'f60_31.affective_instability':
        'Humeur instable, rapidement fluctuante, avec labilité affective marquée',
      'f60_31.self_image':
        'Perturbations et incertitude concernant l’image de soi, les objectifs et les préférences internes (y compris sexuelles)',
      'f60_31.intense_unstable_relationships':
        'Tendance à s’engager dans des relations intenses mais instables, souvent avec alternance entre idéalisation et dévalorisation',
      'f60_31.abandonment':
        'Efforts excessifs pour éviter un abandon réel ou redouté',
      'f60_31.self_harm':
        'Menaces suicidaires récurrentes ou actes auto-agressifs (p. ex. comportement d’automutilation)',
      'f60_31.chronic_emptiness': 'Sentiment persistant de vide intérieur',
      'f60_31.dissociation':
        'Idées paranoïdes ou symptômes dissociatifs transitoires, liés au stress (passerelle CIM-11/DSM)',
      'f60_31.exclude_bipolar':
        'Le mode n’est pas mieux expliqué par un trouble affectif bipolaire à épisodes circonscrits',
    },
  },
  histrionic_personality_disorder: {
    name: 'Personnalité histrionique',
    differentials: [
      'Personnalité émotionnellement labile (type borderline)',
      'Personnalité dépendante',
      'Personnalité narcissique',
      'Épisode maniaque/hypomaniaque',
    ],
    groups: {
      ...icd11PdGroups('his'),
      'f60_4.general':
        'Critères généraux d’un trouble de la personnalité (F60 généraux)',
      'f60_4.features': 'Traits caractéristiques (au moins 4)',
      'f60_4.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      ...icd11PdCriteria('his', ['dissociality', 'negative_affectivity']),
      'f60_4.general_deviation':
        'Mode durable de vécu intérieur et de comportement qui dévie nettement des attentes de l’environnement socioculturel et se manifeste dans la cognition, l’affectivité, le contrôle des impulsions ou les relations interpersonnelles',
      'f60_4.general_pervasive':
        'Le mode déviant est envahissant et rigide à travers un large éventail de situations personnelles et sociales (non limité à une seule situation déclenchante)',
      'f60_4.general_distress':
        'Le mode entraîne une souffrance personnelle et/ou une altération marquée du fonctionnement social, professionnel ou d’autres domaines importants',
      'f60_4.general_onset':
        'Le mode est stable et de longue durée, et son début peut être retracé jusqu’à l’adolescence ou au début de l’âge adulte',
      'f60_4.general_not_organic':
        'Le mode n’est pas l’expression ou la conséquence d’un autre trouble mental et n’est pas directement causé par une maladie, une lésion ou un dysfonctionnement cérébral',
      'f60_4.dramatization':
        'Expression émotionnelle exagérée et théâtrale, avec dramatisation de ses propres vécus',
      'f60_4.suggestibility':
        'Suggestibilité accrue et grande influençabilité par autrui ou par les circonstances',
      'f60_4.shallow_affect': 'Affectivité superficielle et labile',
      'f60_4.attention_seeking':
        'Quête permanente de sensations, de reconnaissance par autrui et d’activités où la personne est au centre de l’attention',
      'f60_4.seductiveness':
        'Apparence ou comportement séducteur de façon inappropriée',
      'f60_4.appearance_focus':
        'Préoccupation excessive pour sa propre attractivité physique',
      'f60_4.exclude_other':
        'Le mode n’est pas mieux expliqué par un épisode affectif ou un autre trouble de la personnalité',
    },
  },
  anankastic_personality_disorder: {
    name: 'Personnalité anankastique (obsessionnelle-compulsive)',
    differentials: [
      'Trouble obsessionnel-compulsif (véritables obsessions/compulsions, égo-dystoniques)',
      'Personnalité anxieuse (évitante)',
      'Trouble du spectre de l’autisme avec attachement aux routines',
      'Épisode dépressif avec tendance à la rumination',
    ],
    groups: {
      ...icd11PdGroups('ana'),
      'f60_5.general':
        'Critères généraux d’un trouble de la personnalité (F60 généraux)',
      'f60_5.features': 'Traits caractéristiques (au moins 4)',
      'f60_5.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      ...icd11PdCriteria('ana', ['anankastia']),
      'f60_5.general_deviation':
        'Mode durable de vécu intérieur et de comportement qui dévie nettement des attentes de l’environnement socioculturel et se manifeste dans la cognition, l’affectivité, le contrôle des impulsions ou les relations interpersonnelles',
      'f60_5.general_pervasive':
        'Le mode déviant est envahissant et rigide à travers un large éventail de situations personnelles et sociales (non limité à une seule situation déclenchante)',
      'f60_5.general_distress':
        'Le mode entraîne une souffrance personnelle et/ou une altération marquée du fonctionnement social, professionnel ou d’autres domaines importants',
      'f60_5.general_onset':
        'Le mode est stable et de longue durée, et son début peut être retracé jusqu’à l’adolescence ou au début de l’âge adulte',
      'f60_5.general_not_organic':
        'Le mode n’est pas l’expression ou la conséquence d’un autre trouble mental et n’est pas directement causé par une maladie, une lésion ou un dysfonctionnement cérébral',
      'f60_5.doubt_caution':
        'Doutes et prudence excessifs au moment de prendre des décisions',
      'f60_5.preoccupation_detail':
        'Préoccupation constante pour les détails, les règles, les listes, l’ordre, l’organisation ou les plans, au point d’en perdre l’objectif réel',
      'f60_5.perfectionism':
        'Perfectionnisme qui entrave l’achèvement des tâches',
      'f60_5.conscientiousness':
        'Scrupulosité et conscience professionnelle excessives, avec un investissement disproportionné dans la performance au détriment du plaisir et des relations',
      'f60_5.rigidity':
        'Rigidité et obstination marquées concernant ses propres normes, procédures et critères moraux',
      'f60_5.insistence_submission':
        'Insistance inappropriée pour que les autres se conforment exactement à ses propres habitudes, ou réticence injustifiée à laisser les autres faire les choses',
      'f60_5.intrusive_thoughts':
        'Pensées ou impulsions à agir qui s’imposent, tenaces, sans atteindre la gravité d’un trouble obsessionnel-compulsif',
      'f60_5.exclude_ocd':
        'Il n’existe pas de véritables obsessions ou compulsions égo-dystoniques au sens d’un trouble obsessionnel-compulsif (F42)',
    },
  },
  anxious_avoidant_personality_disorder: {
    name: 'Personnalité anxieuse (évitante)',
    differentials: [
      'Trouble anxiété sociale (lié à des situations, non continu)',
      'Personnalité schizoïde (retrait par désintérêt plutôt que par anxiété)',
      'Personnalité dépendante',
      'Épisode dépressif avec retrait',
    ],
    groups: {
      ...icd11PdGroups('avd'),
      'f60_6.general':
        'Critères généraux d’un trouble de la personnalité (F60 généraux)',
      'f60_6.features': 'Traits caractéristiques (au moins 4)',
      'f60_6.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      ...icd11PdCriteria('avd', ['negative_affectivity', 'detachment']),
      'f60_6.general_deviation':
        'Mode durable de vécu intérieur et de comportement qui dévie nettement des attentes de l’environnement socioculturel et se manifeste dans la cognition, l’affectivité, le contrôle des impulsions ou les relations interpersonnelles',
      'f60_6.general_pervasive':
        'Le mode déviant est envahissant et rigide à travers un large éventail de situations personnelles et sociales (non limité à une seule situation déclenchante)',
      'f60_6.general_distress':
        'Le mode entraîne une souffrance personnelle et/ou une altération marquée du fonctionnement social, professionnel ou d’autres domaines importants',
      'f60_6.general_onset':
        'Le mode est stable et de longue durée, et son début peut être retracé jusqu’à l’adolescence ou au début de l’âge adulte',
      'f60_6.general_not_organic':
        'Le mode n’est pas l’expression ou la conséquence d’un autre trouble mental et n’est pas directement causé par une maladie, une lésion ou un dysfonctionnement cérébral',
      'f60_6.tension_apprehension':
        'Sentiments persistants et envahissants de tension et d’appréhension',
      'f60_6.feeling_inferior':
        'Conviction d’être soi-même socialement maladroit, peu attirant ou inférieur aux autres',
      'f60_6.preoccupation_criticism':
        'Préoccupation excessive à l’idée d’être critiqué ou rejeté dans les situations sociales',
      'f60_6.reluctance_without_acceptance':
        'Réticence à s’engager dans des relations interpersonnelles sans garantie certaine d’être accepté',
      'f60_6.restricted_lifestyle':
        'Mode de vie restreint en raison d’un besoin de sécurité physique',
      'f60_6.avoidance_activities':
        'Évitement des activités professionnelles ou sociales impliquant des contacts interpersonnels importants, par crainte de la critique, de la désapprobation ou du rejet',
      'f60_6.exclude_social_phobia':
        'Le mode est continu et durable et n’est pas limité à des situations phobiques circonscrites au sens d’un trouble anxiété sociale',
    },
  },
  dependent_personality_disorder: {
    name: 'Personnalité dépendante',
    differentials: [
      'Personnalité anxieuse (évitante)',
      'Personnalité émotionnellement labile',
      'Épisode dépressif avec tendance à l’accrochage',
      'Agoraphobie avec besoin d’une personne accompagnante',
    ],
    groups: {
      ...icd11PdGroups('dep'),
      'f60_7.general':
        'Critères généraux d’un trouble de la personnalité (F60 généraux)',
      'f60_7.features': 'Traits caractéristiques (au moins 4)',
      'f60_7.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      ...icd11PdCriteria('dep', ['negative_affectivity']),
      'f60_7.general_deviation':
        'Mode durable de vécu intérieur et de comportement qui dévie nettement des attentes de l’environnement socioculturel et se manifeste dans la cognition, l’affectivité, le contrôle des impulsions ou les relations interpersonnelles',
      'f60_7.general_pervasive':
        'Le mode déviant est envahissant et rigide à travers un large éventail de situations personnelles et sociales (non limité à une seule situation déclenchante)',
      'f60_7.general_distress':
        'Le mode entraîne une souffrance personnelle et/ou une altération marquée du fonctionnement social, professionnel ou d’autres domaines importants',
      'f60_7.general_onset':
        'Le mode est stable et de longue durée, et son début peut être retracé jusqu’à l’adolescence ou au début de l’âge adulte',
      'f60_7.general_not_organic':
        'Le mode n’est pas l’expression ou la conséquence d’un autre trouble mental et n’est pas directement causé par une maladie, une lésion ou un dysfonctionnement cérébral',
      'f60_7.delegating_decisions':
        'Inciter autrui à prendre, ou laisser autrui prendre, la plupart des décisions importantes de sa propre vie',
      'f60_7.subordination':
        'Subordination de ses propres besoins à ceux des personnes dont on dépend, et soumission excessive à leurs souhaits',
      'f60_7.reluctance_demands':
        'Manque de disposition à formuler, même des exigences raisonnables, envers les personnes dont on dépend',
      'f60_7.discomfort_alone':
        'Malaise ou sentiment d’impuissance dans la solitude, par crainte exagérée d’être incapable de se débrouiller seul',
      'f60_7.fear_abandonment':
        'Crainte fréquente d’être abandonné par une personne proche et de se retrouver livré à soi-même',
      'f60_7.need_reassurance':
        'Capacité réduite à prendre des décisions quotidiennes sans un avis et un réconfort excessifs d’autrui',
      'f60_7.exclude_depression_agora':
        'Le mode de dépendance est durable et n’est pas mieux expliqué par un épisode dépressif ou un trouble agoraphobique',
    },
  },
  icd11_dimensional_personality_disorder: {
    name: 'Trouble de la personnalité — modèle dimensionnel (CIM-11)',
    differentials: [
      'Difficulté de personnalité (6D11.0, sous-clinique)',
      'Modification transitoire du comportement réactionnelle à un stress',
      'Autre trouble mental primaire avec traits de personnalité secondaires',
      'Trouble organique de la personnalité',
    ],
    groups: {
      '6d10.core':
        'Noyau : dysfonctionnement durable du fonctionnement de la personnalité',
      '6d10.severity': 'Cotation de la sévérité (exactement un niveau ; 6D10)',
      '6d11.trait_domains':
        'Qualificatifs de domaines de traits (un ou plusieurs ; 6D11)',
      '6d10.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      '6d10.self_functioning':
        'Altération persistante d’aspects du self (p. ex. identité, estime de soi, autorégulation, fixation d’objectifs)',
      '6d10.interpersonal_functioning':
        'Altération persistante du fonctionnement interpersonnel (établir et maintenir des relations proches et mutuellement satisfaisantes)',
      '6d10.duration_pervasive':
        'Le mode persiste sur une période prolongée (de l’ordre de ≥ 2 ans) et se manifeste à travers les situations',
      '6d10.manifest_patterns':
        'Le trouble se manifeste par des modes inadaptés de cognition, de vécu émotionnel, d’expression des émotions et de comportement',
      '6d10.severity_mild':
        'Trouble léger de la personnalité : altérations de certains domaines de fonctionnement, mais fonctionnement préservé dans de nombreux domaines ; faible risque d’atteinte à soi ou à autrui (6D10.0)',
      '6d10.severity_moderate':
        'Trouble modéré de la personnalité : problèmes nets dans plusieurs domaines de fonctionnement, altération marquée de la plupart des relations interpersonnelles et des rôles sociaux/professionnels (6D10.1)',
      '6d10.severity_severe':
        'Trouble sévère de la personnalité : altération grave du fonctionnement du self et interpersonnel à travers presque tous les domaines de la vie ; souvent risque considérable d’atteinte à soi ou à autrui (6D10.2)',
      '6d11.negative_affectivity':
        'Affectivité négative : tendance à un large éventail d’émotions négatives (anxiété, labilité émotionnelle, méfiance, faible estime de soi) avec une fréquence/intensité disproportionnée (6D11.0)',
      '6d11.detachment':
        'Détachement : tendance au retrait social et émotionnel, à un engagement relationnel limité et à une expression affective réduite (6D11.1)',
      '6d11.dissociality':
        'Dissocialité : mépris des droits et des sentiments d’autrui, égocentrisme, absence d’empathie et manque d’égards (6D11.2)',
      '6d11.disinhibition':
        'Désinhibition : tendance à agir impulsivement en réponse à des stimuli internes ou externes immédiats, sans tenir compte des conséquences à plus long terme (6D11.3)',
      '6d11.anankastia':
        'Anankasme : focalisation sur des standards rigides de perfection, d’ordre et de contrôle de son propre comportement et de celui d’autrui (6D11.4)',
      '6d11.borderline_pattern':
        'Mode borderline : instabilité continue de l’image de soi, des relations et de l’affect, avec impulsivité, crainte de l’abandon et auto-agression récurrente (6D11.5)',
      '6d10.exclude_other_organic':
        'Les anomalies ne sont pas mieux expliquées par un autre trouble mental, un effet d’une substance ou une maladie du système nerveux, et ne sont ni typiques d’une phase de développement ni normatives sur le plan socioculturel',
    },
  },
  gambling_disorder: {
    name: 'Jeu pathologique (trouble du jeu d’argent)',
    differentials: [
      'Épisode maniaque/hypomaniaque avec jeu excessif',
      'Personnalité dyssociale avec problèmes de jeu',
      'Jeu dans le cadre d’un trouble lié à l’usage de substances',
      'Jeu habituel, socialement acceptable, sans perte de contrôle',
    ],
    groups: {
      'f63_0.core': 'Noyau : comportement de jeu récurrent et inadapté',
      'f63_0.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f63_0.recurrent_gambling':
        'Comportement de jeu répété et persistant, poursuivi et s’intensifiant malgré des conséquences sociales, professionnelles, matérielles et familiales défavorables',
      'f63_0.impaired_control':
        'Contrôle altéré sur le comportement de jeu (initiation, fréquence, intensité, durée, arrêt)',
      'f63_0.priority':
        'Le jeu prend une place prioritaire croissante par rapport aux autres centres d’intérêt et aux obligations quotidiennes',
      'f63_0.preoccupation':
        'Préoccupation mentale et besoin impérieux concernant le jeu, ainsi que l’obtention des moyens nécessaires pour jouer',
      'f63_0.exclude_mania_dissocial':
        'Le comportement de jeu ne survient pas exclusivement dans le cadre d’un épisode maniaque et n’est pas mieux expliqué par une personnalité dyssociale',
    },
  },
  pyromania: {
    name: 'Pyromanie (incendie pathologique)',
    differentials: [
      'Incendie volontaire par appât du gain, vengeance ou motivation politique',
      'Incendie dans le cadre d’une personnalité dyssociale ou d’un trouble des conduites',
      'Incendie sous intoxication ou lors d’un trouble psychotique',
      'Incendie en cas de déficience intellectuelle ou de maladie démentielle',
    ],
    groups: {
      'f63_1.core':
        'Noyau : incendies récurrents sans motif compréhensible',
      'f63_1.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f63_1.repeated_firesetting':
        'Allumage répété, ou tentative d’allumage, d’incendies sur des objets ou des biens, sans motif rationnel reconnaissable',
      'f63_1.preoccupation_fire':
        'Préoccupation mentale intense pour le feu et la combustion, ainsi qu’intérêt persistant pour tout ce qui se rapporte au feu',
      'f63_1.tension_relief':
        'Sentiment de tension croissant avant l’acte et sentiment intense de soulagement, d’excitation ou de satisfaction pendant et immédiatement après l’allumage de l’incendie',
      'f63_1.exclude_motivated_firesetting':
        'L’incendie ne vise pas un gain matériel, une vengeance, une intention politique ni la dissimulation d’un délit',
      'f63_1.exclude_other_disorder':
        'Le comportement n’est pas mieux expliqué par une personnalité dyssociale, un trouble psychotique, une intoxication par une substance ou un trouble organique',
    },
  },
  kleptomania: {
    name: 'Kleptomanie (vol pathologique)',
    differentials: [
      'Vol par appât du gain personnel (vol à l’étalage ordinaire)',
      'Vol dans le cadre d’une personnalité dyssociale ou d’un trouble des conduites',
      'Vol sous intoxication ou lors d’un trouble psychotique/maniaque',
      'Vol lors d’un trouble démentiel ou d’un autre trouble organique',
    ],
    groups: {
      'f63_2.core': 'Noyau : vols répétés sans intention d’enrichissement',
      'f63_2.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f63_2.repeated_stealing':
        'Incapacité répétée à résister à l’impulsion de voler des objets qui ne servent ni à un usage personnel ni à un gain matériel',
      'f63_2.tension_relief':
        'Sentiment de tension croissant immédiatement avant l’acte et sentiment de soulagement, de satisfaction ou de plaisir pendant et après le vol',
      'f63_2.no_personal_gain':
        'Les objets volés ne sont pas nécessaires ; ils sont souvent donnés, jetés ou amassés ; le vol n’est pas motivé par la colère ou la vengeance',
      'f63_2.exclude_motivated_theft':
        'Le vol n’est pas commis dans un but d’enrichissement et n’est pas mieux expliqué par une personnalité dyssociale, un épisode maniaque ou un trouble organique',
    },
  },
  trichotillomania: {
    name: 'Trichotillomanie (arrachage pathologique des cheveux)',
    differentials: [
      'Cause dermatologique de la perte de cheveux (p. ex. pelade)',
      'Arrachage des cheveux en réaction à un délire ou à une hallucination',
      'Trouble du mouvement stéréotypé',
      'Dysmorphophobie avec comportement de triturage',
      'Trouble obsessionnel-compulsif avec comportement ritualisé',
    ],
    groups: {
      'f63_3.core':
        'Noyau : arrachage répété des cheveux avec perte de cheveux visible',
      'f63_3.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f63_3.hair_pulling':
        'Arrachage répété de ses propres cheveux, entraînant une perte de cheveux nette',
      'f63_3.failed_resistance':
        'Tentatives répétées et infructueuses de réduire ou de cesser l’arrachage des cheveux',
      'f63_3.tension_relief':
        'Sentiment de tension croissant avant l’arrachage (ou lors d’une tentative de résister à l’impulsion) et soulagement ou satisfaction après',
      'f63_3.exclude_dermatological_psychotic':
        'La perte de cheveux n’est pas due à une affection cutanée inflammatoire et l’arrachage ne survient pas en réaction à un délire ou à une hallucination',
    },
  },
}
