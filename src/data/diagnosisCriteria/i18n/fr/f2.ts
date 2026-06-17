import type { DisorderTranslationMap } from '../types'

/** FR translations — ICD-10 F2 block. */
export const frF2: DisorderTranslationMap = {
  schizophrenia: {
    name: 'Schizophrénie',
    differentials: [
      'Trouble schizoaffectif',
      'Trouble affectif avec symptômes psychotiques',
      'Trouble psychotique aigu et transitoire',
      'Psychose induite par une substance ou d’origine organique',
    ],
    groups: {
      'f20.characteristic': 'Symptômes caractéristiques (au moins 1 symptôme univoque)',
      'f20.duration': 'Critère de durée',
      'f20.exclusions': 'Exclusions',
    },
    criteria: {
      'f20.ego_disturbance':
        'Troubles du moi : écho de la pensée, pensées imposées, vol ou divulgation de la pensée, ainsi que vécu d’influence ou de contrôle, ou sentiment d’être agi (vécu de passivité)',
      'f20.auditory_hallucinations':
        'Voix qui commentent les actes ou qui dialoguent (en parlant de la personne), ou autres voix persistantes émanant d’une partie du corps',
      'f20.delusions':
        'Idée délirante persistante, culturellement inadéquate et totalement irréaliste (bizarre)',
      'f20.formal_thought_disorder':
        'Barrages ou intrusions dans le cours de la pensée entraînant un discours diffluent, des réponses à côté ou des néologismes',
      'f20.duration_one_month':
        'Les symptômes caractéristiques sont présents la plupart du temps pendant une période d’au moins un mois',
      'f20.exclude_mood_primary':
        'En cas de symptomatologie maniaque ou dépressive marquée concomitante, les symptômes schizophréniques ont précédé le trouble affectif (le tableau affectif n’est pas prédominant)',
      'f20.exclude_organic_substance':
        'Les symptômes ne sont pas imputables à une maladie cérébrale organique ni à une intoxication, une dépendance ou un sevrage d’une substance psychoactive',
    },
  },
  schizotypal_disorder: {
    name: 'Trouble schizotypique',
    differentials: [
      'Schizophrénie (F20) — en présence d’une symptomatologie psychotique nette',
      'Personnalité schizoïde ou paranoïaque',
      'Trouble du spectre de l’autisme avec particularités sociales',
      'Schizophrénie débutante (prodromique)',
    ],
    groups: {
      'f21.features': 'Caractéristiques typiques (au moins 4 sur 9, durables ou épisodiques)',
      'f21.duration': 'Critère de durée',
      'f21.exclusions': 'Exclusions',
    },
    criteria: {
      'f21.constricted_affect':
        'Affect inadéquat ou restreint, avec une présentation froide et distante, pauvre en émotions',
      'f21.odd_behavior':
        'Comportement et apparence singuliers, excentriques ou étranges',
      'f21.social_withdrawal':
        'Retrait social et contacts appauvris avec autrui (faible capacité relationnelle)',
      'f21.magical_thinking':
        'Croyances inhabituelles, magiques, qui influencent le comportement et qui ne correspondent pas aux normes socioculturelles',
      'f21.suspiciousness':
        'Méfiance ou idées paranoïaques sans caractère délirant',
      'f21.ruminations':
        'Ruminations obsédantes sans résistance interne, portant souvent sur des contenus dysmorphophobiques, sexuels ou agressifs',
      'f21.unusual_perceptions':
        'Expériences perceptives inhabituelles, y compris des troubles des sensations corporelles, ainsi qu’une dépersonnalisation ou une déréalisation',
      'f21.odd_speech':
        'Pensée circonstancielle, métaphorique, alambiquée ou vague, s’exprimant par un langage singulier sans diffluence marquée',
      'f21.quasi_psychotic':
        'Épisodes quasi psychotiques transitoires et occasionnels comportant des illusions intenses, des hallucinations auditives ou autres et des idées d’allure délirante, le plus souvent sans facteur déclenchant externe',
      'f21.duration_two_years':
        'Les caractéristiques sont présentes de façon durable ou épisodique sur une période d’au moins deux ans',
      'f21.exclude_schizophrenia':
        'Les critères d’une schizophrénie (F20) n’ont jamais été pleinement remplis à aucun moment',
      'f21.exclude_organic':
        'La symptomatologie n’est pas imputable à un trouble mental organique ni à une substance psychoactive',
    },
  },
  persistent_delusional_disorder: {
    name: 'Trouble délirant persistant',
    differentials: [
      'Schizophrénie (F20) — en présence de symptômes typiquement schizophréniques associés',
      'Trouble affectif avec idées délirantes congruentes à l’humeur',
      'Idée délirante d’origine organique ou induite par une substance',
      'Trouble délirant persistant survenant dans le cadre d’un trouble de la personnalité',
    ],
    groups: {
      'f22.core': 'Noyau : idée délirante persistante',
      'f22.exclusions': 'Exclusions (absence de tableau schizophrénique complet, origine non organique)',
    },
    criteria: {
      'f22.delusion':
        'Une idée délirante ou un système d’idées délirantes reliées sur le plan du contenu (p. ex. délire de persécution, de grandeur, hypocondriaque, de jalousie ou érotomaniaque)',
      'f22.duration_three_months':
        'L’idée délirante est présente pendant une période d’au moins trois mois',
      'f22.exclude_schizophrenic_symptoms':
        'Absence d’hallucinations auditives persistantes, de troubles du moi ou d’autres symptômes caractéristiques de la schizophrénie (tout au plus présents de façon fugace)',
      'f22.exclude_organic':
        'L’idée délirante n’est pas explicable par un trouble mental organique, par l’effet d’une substance ou par un trouble affectif prédominant',
    },
  },
  acute_transient_psychotic_disorder: {
    name: 'Trouble psychotique aigu et transitoire',
    differentials: [
      'Schizophrénie (F20) — en cas de persistance des symptômes au-delà d’un mois',
      'Trouble affectif avec symptômes psychotiques',
      'Psychose induite par une substance ou d’origine organique',
      'Trouble délirant persistant (F22)',
    ],
    groups: {
      'f23.onset': 'Début aigu',
      'f23.symptoms': 'Symptômes psychotiques (au moins un)',
      'f23.exclusions': 'Exclusions',
    },
    criteria: {
      'f23.acute_onset':
        'Début aigu de la symptomatologie psychotique en deux semaines au plus, à partir d’un état antérieur sans particularité',
      'f23.delusions':
        'Phénomènes délirants pouvant changer rapidement de nature et de contenu (tableau polymorphe)',
      'f23.hallucinations':
        'Hallucinations de modalité et d’intensité variables',
      'f23.perplexity':
        'Symptomatologie polymorphe changeant rapidement, avec une agitation émotionnelle ou une perplexité',
      'f23.exclude_organic':
        'La symptomatologie n’est pas imputable à un trouble mental organique ni à une substance psychoactive (intoxication, sevrage)',
    },
  },
  induced_delusional_disorder: {
    name: 'Trouble délirant induit (folie à deux)',
    differentials: [
      'Trouble délirant autonome (F22) chez les deux personnes',
      'Schizophrénie (F20)',
      'Croyances réalistes partagées, non délirantes',
    ],
    groups: {
      'f24.core': 'Critères centraux de l’induction',
      'f24.exclusions': 'Exclusions',
    },
    criteria: {
      'f24.shared_delusion':
        'La personne concernée partage une idée délirante ou un système délirant avec une autre personne qui souffre d’un véritable trouble délirant',
      'f24.close_relationship':
        'Il existe entre les personnes une relation inhabituellement étroite et émotionnellement liée (p. ex. familiale ou conjugale)',
      'f24.induction_context':
        'Il existe un lien temporel et thématique : l’idée délirante a été adoptée par le contact avec la personne primairement atteinte et n’existait pas auparavant de façon autonome',
      'f24.exclude_primary_psychosis':
        'La personne induite ne remplissait pas, avant le contact, les critères d’un trouble psychotique autonome ; la symptomatologie n’est pas explicable par une cause organique ou par une substance',
    },
  },
  schizoaffective_disorder: {
    name: 'Trouble schizoaffectif',
    differentials: [
      'Schizophrénie (F20) avec symptomatologie affective associée',
      'Trouble affectif avec symptômes psychotiques non congruents à l’humeur',
      'Trouble bipolaire avec caractéristiques psychotiques',
      'Psychose induite par une substance ou d’origine organique',
    ],
    groups: {
      'f25.schizophrenic': 'Symptômes schizophréniques (au moins un, marqué au cours du même épisode)',
      'f25.affective': 'Syndrome affectif (maniaque ou dépressif, marqué de façon concomitante)',
      'f25.simultaneity': 'Simultanéité',
      'f25.exclusions': 'Exclusions',
    },
    criteria: {
      'f25.ego_disturbance':
        'Troubles du moi tels que pensées imposées, vol ou divulgation de la pensée, ou vécu d’influence et de contrôle',
      'f25.hallucinations':
        'Voix qui commentent ou qui dialoguent, ou hallucinations persistantes',
      'f25.bizarre_delusions':
        'Idée délirante persistante bizarre ou totalement inadéquate sur le plan culturel',
      'f25.thought_disorder':
        'Troubles formels de la pensée avec diffluence, barrages ou néologismes',
      'f25.manic_syndrome':
        'Tableau maniaque marqué avec humeur exaltée ou irritable et élan vital accru',
      'f25.depressive_syndrome':
        'Tableau dépressif marqué avec humeur abaissée, perte d’intérêt et réduction de l’élan vital',
      'f25.simultaneous_prominence':
        'Les symptômes schizophréniques et affectifs se manifestent nettement au cours du même épisode pathologique, simultanément ou avec un décalage de quelques jours au plus',
      'f25.exclude_organic':
        'La symptomatologie n’est pas imputable à un trouble mental organique ni à une substance psychoactive',
    },
  },
  other_nonorganic_psychosis: {
    name: 'Autre trouble psychotique non organique',
    differentials: [
      'Schizophrénie (F20) ou trouble délirant persistant (F22) en cas de critères pleinement remplis',
      'Trouble psychotique aigu et transitoire (F23)',
      'Trouble schizoaffectif (F25)',
      'Psychose d’origine organique ou induite par une substance',
    ],
    groups: {
      'f28.core': 'Symptomatologie psychotique ne pouvant être rattachée à aucune catégorie spécifique, mais identifiable',
      'f28.exclusions': 'Exclusions',
    },
    criteria: {
      'f28.psychotic_symptoms':
        'Des symptômes psychotiques (idées délirantes, hallucinations ou troubles formels de la pensée) sont présents et cliniquement descriptibles',
      'f28.no_specific_category':
        'Le tableau ne remplit pas l’ensemble des critères d’une schizophrénie, d’un trouble délirant, d’un trouble psychotique aigu et transitoire ou d’un trouble schizoaffectif (catégorie résiduelle nommée)',
      'f28.exclude_organic':
        'La symptomatologie psychotique n’est pas imputable à un trouble mental organique ni à une substance psychoactive',
    },
  },
  unspecified_nonorganic_psychosis: {
    name: 'Psychose non organique sans précision',
    differentials: [
      'Autre trouble psychotique non organique (F28) lorsque le tableau est précisable',
      'Schizophrénie (F20), trouble délirant persistant (F22) ou trouble schizoaffectif (F25) en cas de critères pleinement remplis',
      'Trouble psychotique aigu et transitoire (F23)',
      'Psychose d’origine organique ou induite par une substance',
    ],
    groups: {
      'f29.core': 'Symptomatologie psychotique sans information suffisante pour une attribution plus spécifique',
      'f29.exclusions': 'Exclusions',
    },
    criteria: {
      'f29.psychotic_symptoms':
        'Une symptomatologie clairement psychotique est présente, mais ne peut être rattachée à aucune catégorie spécifique faute d’information suffisante',
      'f29.insufficient_information':
        'Les données disponibles ne suffisent pas pour un diagnostic plus spécifique ou sont contradictoires (catégorie provisoire ou de recours)',
      'f29.exclude_organic':
        'La symptomatologie psychotique n’est pas imputable à un trouble mental organique ni à une substance psychoactive',
    },
  },
}
