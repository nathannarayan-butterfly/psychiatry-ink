import type { DisorderTranslationMap } from '../types'

/** FR translations — ICD-10 F9 block. */
export const frF9: DisorderTranslationMap = {
  hyperkinetic_disorder_adhd: {
    name: 'Trouble hyperkinétique (TDAH)',
    differentials: [
      'Vivacité normale pour l’âge / exigences inadaptées',
      'Trouble anxieux ou dépressif avec plaintes de concentration ou d’agitation',
      'Trouble spécifique des apprentissages ou du langage',
      'Trouble du spectre de l’autisme',
      'Trouble de l’attachement / surcharge psychosociale',
      'Effet d’une substance ou cause somatique (p. ex. thyroïde, trouble du sommeil)',
    ],
    groups: {
      'f90.inattention':
        'Inattention (plusieurs caractéristiques, présentes dans plusieurs situations)',
      'f90.hyperactivity_impulsivity':
        'Hyperactivité et impulsivité (plusieurs caractéristiques, présentes dans plusieurs situations)',
      'f90.qualifiers': 'Début, persistance et retentissement',
      'f90.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f90.short_attention':
        'Les tâches ou les activités de jeu sont souvent interrompues prématurément ; l’attention ne peut être maintenue que brièvement',
      'f90.distractibility':
        'Distractibilité facile par des stimuli externes ; difficultés à prêter attention aux détails et apparente absence d’écoute',
      'f90.disorganization':
        'Difficultés à organiser les tâches ; perte fréquente d’objets et évitement des efforts mentaux soutenus',
      'f90.motor_overactivity':
        'Hyperactivité motrice persistante (gigoter, se lever dans des situations où l’on attend de rester assis, agitation constante)',
      'f90.restless_noisy':
        'Course, escalade ou bruit excessifs ainsi que difficultés à s’occuper calmement durant les loisirs',
      'f90.impulsivity':
        'Comportement impulsif : laisser échapper des réponses, difficultés à attendre ou à patienter, interruptions ou intrusions fréquentes envers autrui',
      'f90.early_onset':
        'Les anomalies ont débuté dans la petite enfance (de l’ordre d’avant le milieu de l’âge scolaire) et persistent sur plusieurs mois',
      'f90.pervasiveness':
        'Les symptômes apparaissent dans plusieurs situations (p. ex. à la maison et à l’école / en structure d’accueil), et non dans un seul environnement',
      'f90.functional_impact':
        'Les symptômes entraînent un retentissement net dans les domaines scolaire, social ou familial',
      'f90.exclude_pervasive_affective':
        'La symptomatologie n’est pas mieux expliquée par un trouble envahissant du développement, un trouble affectif ou un trouble anxieux',
    },
  },
  conduct_disorder: {
    name: 'Trouble des conduites',
    differentials: [
      'Phases d’opposition normales pour l’âge sans schéma persistant',
      'Trouble hyperkinétique (TDAH) avec conflits secondaires',
      'Trouble de l’adaptation après un facteur de stress aigu',
      'Trouble affectif avec irritabilité',
      'Modification du comportement liée à une substance',
      'Trouble mixte des conduites et des émotions (F92)',
    ],
    groups: {
      'f91.core_pattern':
        'Schéma comportemental dissocial / agressif répété et persistant (au moins plusieurs caractéristiques)',
      'f91.qualifiers': 'Durée et retentissement',
      'f91.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f91.aggression_people':
        'Comportement agressif envers des personnes ou des animaux (p. ex. menaces, intimidation, affrontements physiques, cruauté)',
      'f91.destruction_property':
        'Destruction délibérée du bien d’autrui, y compris des incendies volontaires',
      'f91.deceit_theft':
        'Tromperie, mensonges ou vol (p. ex. effraction, vol sans confrontation, mensonges répétés pour en tirer avantage)',
      'f91.serious_rule_violations':
        'Transgressions graves des règles (p. ex. absentéisme scolaire répété avant l’âge de 13 ans, absences nocturnes, fugues du domicile)',
      'f91.defiance':
        'Comportement durablement provocateur, opposant ou défiant envers les figures d’autorité, qui dépasse les phases d’opposition habituelles pour l’âge',
      'f91.duration':
        'Le schéma comportemental persiste durablement (de l’ordre d’au moins 6 mois) et ne se limite pas à un seul épisode',
      'f91.functional_impact':
        'Le comportement altère nettement le fonctionnement social, scolaire ou familial',
      'f91.exclude_other_primary':
        'Le comportement n’est pas explicable exclusivement dans le cadre d’un autre trouble prioritaire (p. ex. trouble affectif, psychose)',
    },
  },
  mixed_conduct_emotional_disorder: {
    name: 'Trouble mixte des conduites et des émotions',
    differentials: [
      'Trouble des conduites pur (F91) sans plaintes émotionnelles',
      'Trouble émotionnel / dépressif pur sans comportement dissocial',
      'Trouble hyperkinétique avec conflits secondaires',
      'Trouble de l’adaptation',
    ],
    groups: {
      'f92.conduct': 'Schéma comportemental dissocial / agressif',
      'f92.emotional': 'Symptomatologie émotionnelle additionnelle',
    },
    criteria: {
      'f92.conduct_pattern':
        'Il existe un schéma persistant de comportement dissocial, agressif ou provocateur (correspondant à un trouble des conduites)',
      'f92.depressive_symptoms':
        'En même temps, symptômes dépressifs nets (p. ex. humeur abattue, perte de plaisir, repli)',
      'f92.anxiety_symptoms':
        'En même temps, symptômes nets d’anxiété, de préoccupation ou d’autres symptômes émotionnels',
    },
  },
  separation_anxiety_disorder: {
    name: 'Angoisse de séparation de l’enfance',
    differentials: [
      'Anxiété de séparation normale pour l’âge (p. ex. petite enfance)',
      'Anxiété généralisée de l’enfance',
      'Phobie spécifique ou sociale',
      'Évitement scolaire dans le cadre d’autres troubles',
      'Trouble dépressif avec repli',
    ],
    groups: {
      'f93_0.core':
        'Angoisse irréaliste et persistante d’être séparé des personnes de référence',
      'f93_0.qualifiers': 'Début et retentissement',
    },
    criteria: {
      'f93_0.worry_harm':
        'Inquiétude persistante et irréaliste qu’un malheur puisse arriver à une personne de référence principale ou qu’elle puisse partir et ne pas revenir',
      'f93_0.refusal_separation':
        'Refus ou réticence persistants à aller à l’école / en structure d’accueil sans la personne de référence, à rester seul ou à dormir seul',
      'f93_0.somatic_on_separation':
        'Plaintes physiques répétées (p. ex. douleurs abdominales, céphalées, nausées) ou détresse marquée lors d’une séparation effective ou imminente',
      'f93_0.onset_childhood':
        'Début de la symptomatologie dans l’enfance ; l’angoisse dépasse nettement le niveau attendu pour le stade de développement',
      'f93_0.functional_impact':
        'L’angoisse de séparation altère nettement la vie quotidienne, la fréquentation scolaire ou les activités sociales',
    },
  },
  selective_mutism: {
    name: 'Mutisme électif (sélectif)',
    differentials: [
      'Trouble spécifique du développement du langage',
      'Trouble du spectre de l’autisme',
      'Trouble d’anxiété sociale',
      'Mutité transitoire lors d’une migration / d’un plurilinguisme (phase d’adaptation)',
      'Angoisse de séparation',
    ],
    groups: {
      'f94_0.core':
        'Refus de parler lié à la situation, avec capacité langagière conservée',
      'f94_0.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f94_0.situational_mutism':
        'Incapacité persistante de parler dans certaines situations sociales (p. ex. à l’école), alors que la parole est normale dans d’autres situations familières',
      'f94_0.language_intact':
        'La compréhension du langage et la capacité fondamentale de parler sont conservées (absence de déficit primaire du langage)',
      'f94_0.duration':
        'La mutité persiste sur une période prolongée (de l’ordre d’au moins 1 mois) et ne se limite pas à la première phase d’adaptation',
      'f94_0.functional_impact':
        'Le refus de parler altère nettement les performances scolaires ou la communication sociale',
      'f94_0.exclude_language_asd':
        'La mutité n’est pas suffisamment expliquée par un trouble du développement du langage, un trouble du spectre de l’autisme ou une connaissance insuffisante de la langue parlée',
    },
  },
  reactive_attachment_disorder: {
    name: 'Trouble réactionnel de l’attachement de l’enfance',
    differentials: [
      'Trouble du spectre de l’autisme',
      'Retard mental avec retard de développement',
      'Trouble dépressif de l’enfance',
      'Trouble de l’attachement avec désinhibition (F94.2)',
      'État de stress post-traumatique',
    ],
    groups: {
      'f94_1.core':
        'Comportement d’attachement durablement inhibé et ambivalent',
      'f94_1.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f94_1.inhibited_attachment':
        'Comportement constamment inhibé, émotionnellement replié envers les personnes de référence ; en cas de détresse, l’enfant ne recherche guère de réconfort ou n’y réagit pas',
      'f94_1.emotional_disturbance':
        'Anomalies émotionnelles associées (p. ex. peur, prudence excessive, réactions positives restreintes, irritabilité ou tristesse)',
      'f94_1.pathogenic_care':
        'Antécédents de soins insuffisants, négligents ou changeants (prise en charge pathogène) comme arrière-plan plausible',
      'f94_1.onset_early':
        'Début durant les premières années de vie (de l’ordre d’avant l’âge de 5 ans)',
      'f94_1.exclude_asd':
        'Le tableau ne remplit pas les critères d’un trouble du spectre de l’autisme et n’est pas explicable par un seul retard mental',
    },
  },
  disinhibited_attachment_disorder: {
    name: 'Trouble de l’attachement avec désinhibition',
    differentials: [
      'Trouble hyperkinétique (TDAH) avec absence de distance',
      'Trouble du spectre de l’autisme',
      'Trouble réactionnel de l’attachement (type inhibé, F94.1)',
      'Sociabilité normale pour l’âge',
    ],
    groups: {
      'f94_2.core':
        'Comportement d’attachement / social diffus, indifférencié et sans distance',
    },
    criteria: {
      'f94_2.indiscriminate_friendliness':
        'Comportement indifféremment familier, sans distance envers les inconnus, avec absence de réserve adaptée à l’âge ; l’enfant s’éloigne des personnes de référence sans s’assurer de leur présence',
      'f94_2.lack_selectivity':
        'Absence d’attachement sélectif : l’enfant distingue à peine les personnes de référence familières des inconnus et recherche du réconfort de façon non sélective en cas de détresse',
      'f94_2.pathogenic_care':
        'Antécédents de soins insuffisants ou fréquemment changeants (p. ex. changements répétés de personne de référence) comme arrière-plan plausible',
    },
  },
  tic_disorders: {
    name: 'Tics (y compris syndrome de Gilles de la Tourette)',
    differentials: [
      'Stéréotypies (rythmiques, contrôlables volontairement, sans sensation prémonitoire)',
      'Compulsions (orientées vers un but, réduisant l’anxiété)',
      'Myoclonies ou autres troubles neurologiques du mouvement',
      'Trouble du mouvement induit par un médicament / une substance',
      'Mouvements liés à des crises épileptiques',
    ],
    groups: {
      'f95.core': 'Tics involontaires et récurrents',
      'f95.qualifiers': 'Évolution et début',
      'f95.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f95.motor_tics':
        'Mouvements moteurs soudains, rapides, récurrents et non rythmiques (p. ex. clignements, secousses de la tête, grimaces) survenant de façon involontaire',
      'f95.vocal_tics':
        'Émissions vocales soudaines et récurrentes (p. ex. raclements de gorge, grognements, sons ou mots) survenant de façon involontaire',
      'f95.onset_childhood':
        'Début dans l’enfance ou l’adolescence (de l’ordre d’avant l’âge de 18 ans)',
      'f95.duration':
        'Les tics persistent sur une période prolongée (pour un syndrome de Gilles de la Tourette : tics moteurs et vocaux combinés sur l’ordre d’au moins 1 an)',
      'f95.exclude_secondary':
        'Les tics ne sont pas dus à une autre affection neurologique ni à l’effet d’une substance / d’un médicament',
    },
  },
  nonorganic_enuresis: {
    name: 'Énurésie non organique',
    differentials: [
      'Cause organique (infection urinaire, diabète, malformation des voies urinaires)',
      'Trouble neurologique de la fonction vésicale',
      'Effet de substances / de médicaments (p. ex. diurétiques)',
      'Acquisition de la propreté encore inachevée et normale pour l’âge',
    ],
    groups: {
      'f98_0.core':
        'Émission involontaire d’urine au-delà de l’âge de développement attendu',
      'f98_0.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f98_0.involuntary_voiding':
        'Émission involontaire et répétée d’urine (le jour et/ou la nuit) chez un enfant dont l’âge de développement laisserait attendre un contrôle vésical (de l’ordre d’environ 5 ans)',
      'f98_0.frequency_duration':
        'L’énurésie survient avec une fréquence significative sur une période prolongée (de l’ordre de plusieurs mois)',
      'f98_0.exclude_organic':
        'L’énurésie n’est pas explicable par une affection physique (p. ex. infection urinaire, diabète, anomalie anatomique) ni par l’effet d’une substance',
    },
  },
  nonorganic_encopresis: {
    name: 'Encoprésie non organique',
    differentials: [
      'Cause organique (constipation chronique avec encoprésie par regorgement, affection ano-rectale)',
      'Affection neurologique',
      'Effet de substances / de médicaments (p. ex. laxatifs)',
      'Acquisition de la propreté encore inachevée et normale pour l’âge',
    ],
    groups: {
      'f98_1.core':
        'Émission de selles dans des lieux inappropriés au-delà de l’âge de développement attendu',
      'f98_1.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f98_1.inappropriate_defecation':
        'Émission répétée, volontaire ou involontaire, de selles dans des endroits non prévus à cet effet, chez un enfant dont l’âge de développement laisserait attendre un contrôle intestinal (de l’ordre d’environ 4 ans)',
      'f98_1.frequency_duration':
        'L’encoprésie survient avec une fréquence significative sur une période prolongée (de l’ordre de plusieurs mois)',
      'f98_1.exclude_organic':
        'L’encoprésie n’est pas suffisamment explicable par une affection physique (hormis une constipation fonctionnelle) ni par l’effet d’une substance',
    },
  },
  feeding_disorder_childhood: {
    name: 'Trouble de l’alimentation du jeune enfant',
    differentials: [
      'Cause organique (affection gastro-intestinale, trouble de la déglutition, allergie)',
      'Retard staturo-pondéral d’une autre origine',
      'Négligence / offre alimentaire insuffisante',
      'Trouble du spectre de l’autisme avec sélectivité alimentaire',
    ],
    groups: {
      'f98_2.core':
        'Problématique persistante d’alimentation au stade de la petite enfance',
      'f98_2.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f98_2.feeding_refusal':
        'Refus alimentaire persistant ou comportement alimentaire très sélectif malgré une offre alimentaire suffisante et sans explication organique adéquate',
      'f98_2.weight_impact':
        'Absence de la prise de poids attendue ou perte de poids sur une période prolongée (de l’ordre d’au moins 1 mois)',
      'f98_2.exclude_organic':
        'La problématique n’est pas suffisamment explicable par une affection physique ni par une offre alimentaire insuffisante',
    },
  },
  stereotyped_movement_disorder: {
    name: 'Trouble des mouvements stéréotypés',
    differentials: [
      'Tics (soudains, non rythmiques, avec sensation prémonitoire)',
      'Compulsions',
      'Trouble du spectre de l’autisme (stéréotypies comme caractéristique partielle)',
      'Trouble neurologique du mouvement',
      'Trouble du mouvement induit par une substance / un médicament',
    ],
    groups: {
      'f98_4.core':
        'Mouvements répétitifs, rythmiques et apparemment sans but',
      'f98_4.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f98_4.stereotypies':
        'Mouvements d’apparence volontaire, répétés, rythmiques et non fonctionnels (p. ex. balancements du corps, coups de tête, stéréotypies des mains / des doigts)',
      'f98_4.onset_persistence':
        'Début dans le développement précoce ; les mouvements persistent sur une période prolongée (de l’ordre de plusieurs mois)',
      'f98_4.impact':
        'Les stéréotypies altèrent la vie quotidienne ou les activités sociales, ou entraînent (dans leur forme auto-agressive) un dommage corporel',
      'f98_4.exclude_tic_neuro':
        'Les mouvements ne sont pas des tics et ne sont pas dus à une affection neurologique ni à l’effet d’une substance / d’un médicament',
    },
  },
}
