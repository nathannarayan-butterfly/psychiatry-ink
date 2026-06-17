import type { DisorderTranslationMap } from '../types'

/** FR translations — ICD-10 F5 block. */
export const frF5: DisorderTranslationMap = {
  anorexia_nervosa: {
    name: 'Anorexie mentale',
    differentials: [
      'Boulimie (poids le plus souvent normal ou élevé)',
      'Cause somatique de perte de poids (p. ex. tumeur maligne, hyperthyroïdie, malabsorption)',
      'Épisode dépressif avec perte d’appétit',
      'Trouble de l’alimentation de type évitant/restrictif (ARFID ; sans trouble de l’image corporelle)',
    ],
    groups: {
      'f50_0.core': 'Noyau : insuffisance pondérale provoquée avec phobie de prendre du poids',
      'f50_0.endocrine': 'Manifestations endocriniennes/somatiques associées (au moins 1)',
      'f50_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f50_0.low_weight':
        'Poids corporel nettement trop bas (p. ex. IMC ≤ 17,5 kg/m² chez l’adulte, ou poids inférieur à celui attendu pendant la croissance), provoqué par la personne elle-même',
      'f50_0.self_induced_weight_loss':
        'Réduction active du poids par restriction des apports alimentaires et/ou par des mesures complémentaires (exercice excessif, vomissements, laxatifs, coupe-faim)',
      'f50_0.body_image_distortion':
        'Trouble de l’image corporelle avec peur surinvestie de devenir trop gros et seuil pondéral personnel abaissé',
      'f50_0.endocrine_disturbance':
        'Trouble endocrinien (p. ex. aménorrhée, perte de la libido ou de la puissance sexuelle) ou retard du développement pubertaire consécutif à la dénutrition',
      'f50_0.exclude_organic':
        'L’insuffisance pondérale n’est pas expliquée par une autre maladie somatique entraînant une perte d’appétit ou de poids',
    },
  },
  bulimia_nervosa: {
    name: 'Boulimie',
    differentials: [
      'Anorexie mentale, type avec crises de boulimie/purgatif (en cas d’insuffisance pondérale marquée)',
      'Hyperphagie boulimique (sans mesures compensatoires)',
      'Cause gastro-intestinale de vomissements',
      'Épisode dépressif avec crises de boulimie',
    ],
    groups: {
      'f50_2.core': 'Noyau : crises de boulimie récurrentes avec mesures compensatoires',
      'f50_2.exclusions': 'Exclusions',
    },
    criteria: {
      'f50_2.binge_episodes':
        'Crises de boulimie récurrentes avec absorption de grandes quantités de nourriture en peu de temps et perte de contrôle subjective sur le comportement alimentaire',
      'f50_2.compensatory':
        'Mesures compensatoires répétées visant à contrôler le poids (p. ex. vomissements provoqués, mésusage de laxatifs ou de diurétiques, jeûne, exercice physique excessif)',
      'f50_2.overvalued_weight':
        'Préoccupation excessive concernant la silhouette et le poids, avec peur surinvestie de prendre du poids',
      'f50_2.exclude_anorexia':
        'Le tableau n’est pas mieux expliqué par une anorexie mentale (type avec crises de boulimie/purgatif) avec insuffisance pondérale marquée',
    },
  },
  nonorganic_insomnia: {
    name: 'Insomnie non organique',
    differentials: [
      'Trouble du sommeil organique (p. ex. apnée du sommeil, syndrome des jambes sans repos)',
      'Épisode dépressif ou trouble anxieux avec trouble du sommeil',
      'Insomnie induite par une substance ou un médicament',
      'Trouble du rythme circadien veille-sommeil',
    ],
    groups: {
      'f51_0.core': 'Noyau : trouble persistant de l’endormissement/du maintien du sommeil avec retentissement diurne',
      'f51_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f51_0.sleep_complaint':
        'Plaintes de difficultés d’endormissement, de maintien du sommeil ou de sommeil non réparateur, plusieurs nuits par semaine',
      'f51_0.duration':
        'Le trouble du sommeil est présent sur une période prolongée (de l’ordre de ≥ 1 mois)',
      'f51_0.daytime_distress':
        'Souffrance marquée ou altération du fonctionnement/des performances diurnes du fait du trouble du sommeil',
      'f51_0.exclude_organic':
        'Le trouble du sommeil n’est pas suffisamment expliqué par une maladie du sommeil organique, par l’effet d’une substance ou par un autre trouble mental',
    },
  },
  nonorganic_nightmare_disorder: {
    name: 'Cauchemars (non organiques)',
    differentials: [
      'Terreurs nocturnes (réveil sans contenu onirique clair, sommeil non-REM)',
      'État de stress post-traumatique avec cauchemars liés au traumatisme',
      'Cauchemars induits par un médicament ou une substance',
      'Attaques de panique nocturnes',
    ],
    groups: {
      'f51_5.core': 'Noyau : rêves anxiogènes répétés avec réveil complet',
      'f51_5.exclusions': 'Exclusions',
    },
    criteria: {
      'f51_5.nightmares':
        'Réveils répétés avec souvenir vif et détaillé de rêves intensément anxiogènes (typiquement durant la seconde moitié de la nuit)',
      'f51_5.full_orientation':
        'Après le réveil, orientation et vigilance rapides ; souffrance marquée liée aux rêves',
      'f51_5.exclude_organic_substance':
        'Les cauchemars ne sont pas suffisamment expliqués par l’effet d’une substance ou d’un médicament ni par une maladie somatique',
    },
  },
  nonorganic_sleep_terrors: {
    name: 'Terreurs nocturnes',
    differentials: [
      'Trouble cauchemardesque (souvenir onirique vif, réveil complet)',
      'Crises épileptiques nocturnes',
      'Somnambulisme',
      'Attaques de panique nocturnes',
    ],
    groups: {
      'f51_4.core': 'Noyau : réveil épisodique de type panique à partir du sommeil profond',
      'f51_4.exclusions': 'Exclusions',
    },
    criteria: {
      'f51_4.terror_episodes':
        'Épisodes répétés de réveil brusque de type panique à partir du sommeil (le plus souvent durant le premier tiers de la nuit), avec cri d’angoisse, hyperactivation neurovégétative et difficulté importante à être réveillé',
      'f51_4.amnesia':
        'Amnésie en grande partie de l’épisode ; pendant le phénomène, la personne est difficile à apaiser et peu accessible au contact',
      'f51_4.exclude_organic':
        'Les épisodes ne sont pas expliqués par une maladie organique (p. ex. épilepsie nocturne) ni par l’effet d’une substance',
    },
  },
  nonorganic_sexual_dysfunction: {
    name: 'Dysfonction sexuelle non due à une cause organique',
    differentials: [
      'Dysfonction sexuelle d’origine organique/médicale (p. ex. vasculaire, endocrinienne, neurologique)',
      'Dysfonction sexuelle induite par un médicament ou une substance',
      'Épisode dépressif ou trouble anxieux avec dysfonction secondaire',
      'Conflit conjugal/relationnel comme cause primaire',
    ],
    groups: {
      'f52.core': 'Noyau : dysfonction sexuelle persistante sans explication organique suffisante',
      'f52.qualifiers': 'Conditions',
      'f52.exclusions': 'Exclusions',
    },
    criteria: {
      'f52.desire_arousal':
        'Manque ou perte persistante du désir sexuel ou trouble de l’excitation sexuelle (p. ex. trouble de l’érection ou de la lubrification)',
      'f52.orgasm':
        'Trouble de l’orgasme (absence, retard marqué) ou éjaculation prématurée/retardée',
      'f52.pain':
        'Douleurs ou dysfonction d’origine sexuelle (p. ex. vaginisme, dyspareunie non organique)',
      'f52.persistent_distress':
        'Le trouble est fréquent ou persistant et empêche une relation sexuelle souhaitée par la personne ou entraîne une souffrance marquée',
      'f52.exclude_organic':
        'La dysfonction n’est pas principalement due à une maladie somatique, à des médicaments ou à des substances',
    },
  },
  puerperal_mental_disorder: {
    name: 'Trouble mental du post-partum (puerpéralité)',
    differentials: [
      'Épisode dépressif autonome ou psychose à début péripartum',
      '« Baby blues » (léger, spontanément résolutif, sans valeur pathologique)',
      'Cause thyroïdienne ou autre cause somatique en post-partum',
      'Trouble bipolaire avec épisode du post-partum',
    ],
    groups: {
      'f53.core': 'Noyau : trouble mental débutant dans le post-partum',
      'f53.severity': 'Critères de sévérité/de typage (au moins 1)',
      'f53.exclusions': 'Exclusions',
    },
    criteria: {
      'f53.postpartum_onset':
        'Début d’un trouble mental significatif en lien temporel étroit avec l’accouchement (en règle générale dans un délai d’environ six semaines en post-partum)',
      'f53.clinical_syndrome':
        'Présence d’un syndrome psychique cliniquement significatif (p. ex. dépressif, anxieux ou psychotique) ayant une valeur pathologique au-delà d’un simple « baby blues »',
      'f53.psychotic_features':
        'Caractéristiques psychotiques (idées délirantes, hallucinations, désorganisation sévère) au sens d’une psychose du post-partum (CIM-11 6E21)',
      'f53.nonpsychotic_features':
        'Symptomatologie non psychotique (p. ex. dépression du post-partum avec épuisement, sentiments de culpabilité, inquiétude pour l’enfant ; CIM-11 6E20)',
      'f53.risk':
        'Signes de dangerosité pour soi-même ou pour autrui (y compris des pensées de nuire à l’enfant) — nécessitant une attention particulière',
      'f53.exclude_classifiable':
        'Le trouble n’est codé ici que s’il ne peut être suffisamment rattaché à un trouble classé ailleurs (p. ex. épisode dépressif autonome ou schizophrénie)',
    },
  },
}
