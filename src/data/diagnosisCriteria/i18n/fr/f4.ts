import type { DisorderTranslationMap } from '../types'

/** FR translations — ICD-10 F4 block. */
export const frF4: DisorderTranslationMap = {
  'generalized_anxiety_disorder': {
    name: 'Trouble anxieux généralisé',
    differentials: [
      'Trouble panique',
      'Anxiété sociale / phobie sociale',
      'Épisode dépressif avec composante anxieuse',
      'Anxiété induite par une substance ou la caféine, hyperthyroïdie',
    ],
    groups: {
      'f41_1.core': 'Noyau : anxiété flottante persistante',
      'f41_1.associated': 'Symptômes neurovégétatifs/de tension (au moins 3)',
      'f41_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f41_1.persistent_worry':
        'Tension, inquiétude et appréhensions généralisées et flottantes (non liées à une situation précise) concernant des événements et des problèmes de la vie quotidienne, la plupart des jours',
      'f41_1.duration':
        'Les troubles persistent sur une période d’au moins plusieurs mois (de l’ordre de ≥ 6 mois)',
      'f41_1.restlessness':
        'Agitation, tension intérieure ou incapacité à se détendre (sentiment d’être « sur le qui-vive »)',
      'f41_1.fatigue': 'Fatigabilité facile',
      'f41_1.concentration':
        'Difficultés de concentration ou sensation de « tête vide »',
      'f41_1.irritability': 'Irritabilité persistante ou labilité affective',
      'f41_1.muscle_tension':
        'Tensions ou douleurs musculaires ainsi que d’autres symptômes physiques de tension',
      'f41_1.sleep':
        'Difficultés d’endormissement ou de maintien du sommeil dues aux inquiétudes ou à la tension',
      'f41_1.autonomic':
        'Hyperexcitabilité neurovégétative (p. ex. palpitations, sueurs, vertiges, sécheresse buccale, troubles gastro-intestinaux)',
      'f41_1.exclude_substance_medical':
        'L’anxiété est mieux expliquée par une affection somatique (p. ex. hyperthyroïdie) ou par l’effet d’une substance psychoactive',
      'f41_1.exclude_panic_primary':
        'Les troubles ne se limitent pas exclusivement à des attaques de panique distinctes (F41.0) ou à des situations phobiques (F40.-)',
    },
  },
  'panic_disorder': {
    name: 'Trouble panique',
    differentials: [
      'Trouble anxieux généralisé',
      'Agoraphobie / phobie spécifique',
      'Cause cardiaque ou endocrinienne (p. ex. hyperthyroïdie, arythmie)',
      'Panique induite par une substance/la caféine',
    ],
    groups: {
      'f41_0.core': 'Noyau : attaques de panique récurrentes et inattendues',
      'f41_0.autonomic': 'Symptômes neurovégétatifs de l’attaque (au moins 3)',
      'f41_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f41_0.recurrent_attacks':
        'Attaques de panique sévères et récurrentes, non systématiquement limitées à une situation spécifique ou à un objet déterminé et survenant souvent de manière spontanée',
      'f41_0.anticipatory_worry':
        'Préoccupation persistante, entre les attaques, à propos de la survenue d’autres attaques ou de leurs conséquences (anxiété anticipatoire)',
      'f41_0.palpitations':
        'Palpitations, extrasystoles ou accélération du rythme cardiaque',
      'f41_0.sweating_trembling': 'Sueurs, tremblements ou secousses',
      'f41_0.dyspnea':
        'Dyspnée, sensation d’étouffement ou de strangulation, ou oppression thoracique',
      'f41_0.dizziness':
        'Vertiges, étourdissement, sentiment d’instabilité ou impression d’évanouissement',
      'f41_0.depersonalization':
        'Vécu d’étrangeté (dépersonnalisation ou déréalisation) pendant l’attaque',
      'f41_0.fear_dying':
        'Peur de mourir, de perdre le contrôle ou de « devenir fou »',
      'f41_0.exclude_organic_substance':
        'Les attaques ne sont pas la conséquence d’un trouble physique, d’un trouble mental organique ou d’un autre trouble mental',
    },
  },
  'agoraphobia': {
    name: 'Agoraphobie',
    differentials: [
      'Trouble panique sans lien situationnel',
      'Anxiété sociale (évitement de l’évaluation sociale plutôt que de l’impossibilité de fuir)',
      'Épisode dépressif avec retrait social',
      'Cause somatique de vertiges/syncopes',
    ],
    groups: {
      'f40_0.core': 'Noyau : anxiété dans les situations agoraphobogènes avec évitement',
      'f40_0.autonomic': 'Symptômes anxieux neurovégétatifs dans ces situations (au moins 2)',
      'f40_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f40_0.situational_fear':
        'Anxiété marquée et récurrente dans des situations où il paraît difficile ou embarrassant de s’échapper, ou dans lesquelles aucun secours ne serait disponible (p. ex. foule, lieux publics, déplacements, sortie seul(e) du domicile)',
      'f40_0.avoidance':
        'Les situations redoutées sont évitées, ou ne sont supportées qu’au prix d’une détresse marquée ou uniquement accompagné(e)',
      'f40_0.palpitations':
        'Palpitations, accélération du rythme cardiaque ou extrasystoles',
      'f40_0.dizziness':
        'Vertiges, étourdissement ou impression d’évanouissement imminent',
      'f40_0.sweating_trembling': 'Sueurs, tremblements ou secousses',
      'f40_0.fear_losing_control':
        'Peur de mourir, de perdre le contrôle ou de « devenir fou »',
      'f40_0.exclude_organic':
        'Les symptômes anxieux ne sont pas mieux expliqués par une maladie physique, l’effet d’une substance ou une symptomatologie délirante ou obsessionnelle',
    },
  },
  'social_anxiety_disorder': {
    name: 'Anxiété sociale (phobie sociale)',
    differentials: [
      'Agoraphobie (crainte de l’impossibilité de fuir, et non de l’évaluation)',
      'Trouble panique avec attaques indépendantes de la situation',
      'Trouble de la personnalité schizoïde ou anxieuse-évitante',
      'Trouble du spectre de l’autisme avec altération sociale',
    ],
    groups: {
      'f40_1.core': 'Noyau : crainte de l’évaluation sociale',
      'f40_1.autonomic': 'Symptômes physiques d’accompagnement caractéristiques (au moins 1)',
      'f40_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f40_1.fear_scrutiny':
        'Crainte ou tension marquée dans des situations sociales où la personne est au centre de l’attention ou pourrait être observée/évaluée de façon critique par autrui (p. ex. parler devant un groupe, manger en société)',
      'f40_1.fear_of_embarrassment':
        'Appréhension de se comporter de façon embarrassante ou humiliante, ou de se faire remarquer négativement',
      'f40_1.avoidance':
        'Évitement des situations sociales redoutées, ou tolérance de celles-ci uniquement au prix d’une anxiété marquée',
      'f40_1.blushing':
        'Rougissement, tremblement des mains, nausées ou besoin impérieux d’uriner dans la situation sociale',
      'f40_1.exclude_other':
        'Les symptômes ne sont pas l’expression d’un délire, d’un trouble obsessionnel-compulsif, ni mieux expliqués par un autre trouble mental ou somatique',
    },
  },
  'specific_phobia': {
    name: 'Phobie spécifique (isolée)',
    differentials: [
      'Agoraphobie (déclencheurs situationnels multiples, thème de la fuite)',
      'Anxiété sociale (crainte de l’évaluation)',
      'Trouble obsessionnel-compulsif (évitement lié à des appréhensions obsessionnelles)',
      'Trouble de stress post-traumatique (déclencheurs associés au traumatisme)',
    ],
    groups: {
      'f40_2.core': 'Noyau : anxiété circonscrite à un objet/une situation',
      'f40_2.exclusions': 'Exclusions',
    },
    criteria: {
      'f40_2.circumscribed_fear':
        'Anxiété marquée et persistante, limitée à un objet déterminé ou à une situation précise (p. ex. animaux, hauteurs, obscurité, vue du sang/de blessures, voyages aériens, espaces clos)',
      'f40_2.avoidance':
        'L’objet ou la situation phobogène est évité(e) ou déclenche immédiatement une anxiété intense en cas de confrontation',
      'f40_2.exclude_other':
        'L’anxiété ne fait pas partie d’un syndrome phobique, délirant ou obsessionnel plus large et n’est pas mieux expliquée autrement',
    },
  },
  'mixed_anxiety_depressive_disorder': {
    name: 'Trouble anxieux et dépressif mixte',
    differentials: [
      'Épisode dépressif (lorsque les critères de dépression sont pleinement remplis)',
      'Trouble anxieux généralisé (lorsque les critères d’anxiété sont pleinement remplis)',
      'Trouble de l’adaptation avec réaction anxieuse et dépressive',
      'Dysthymie',
    ],
    groups: {
      'f41_2.core':
        'Noyau : symptômes anxieux et dépressifs simultanés en deçà des critères complets',
      'f41_2.exclusions': 'Exclusions',
    },
    criteria: {
      'f41_2.anxiety_symptoms':
        'Présence de symptômes anxieux (p. ex. inquiétudes, tension, hyperexcitabilité neurovégétative)',
      'f41_2.depressive_symptoms':
        'Simultanément, symptômes dépressifs (p. ex. humeur abaissée, anhédonie, réduction de l’élan)',
      'f41_2.subthreshold':
        'Ni la symptomatologie anxieuse ni la symptomatologie dépressive n’atteint à elle seule le tableau complet d’un trouble anxieux ou dépressif autonome',
      'f41_2.exclude_full_syndrome':
        'Il n’existe pas d’épisode dépressif ou de trouble anxieux pleinement constitué qui devrait être codé en priorité',
    },
  },
  'obsessive_compulsive_disorder': {
    name: 'Trouble obsessionnel-compulsif',
    differentials: [
      'Trouble anxieux généralisé (inquiétudes réalistes plutôt que compulsions égodystoniques)',
      'Trouble délirant (absence de prise de conscience, pas de tentatives de résistance)',
      'Trouble de la personnalité obsessionnelle-compulsive (anankastique)',
      'Tics / syndrome de Gilles de la Tourette',
    ],
    groups: {
      'f42.core':
        'Noyau : obsessions et/ou compulsions présentes la majeure partie du temps pendant ≥ 2 semaines',
      'f42.features': 'Caractéristiques typiques (au moins 1)',
      'f42.exclusions': 'Exclusions',
    },
    criteria: {
      'f42.obsessions':
        'Pensées, représentations ou impulsions récurrentes et intrusives, vécues comme propres à la personne mais absurdes/pénibles, et auxquelles la personne tente de résister',
      'f42.compulsions':
        'Comportements répétés ou rituels mentaux (p. ex. lavage, vérification, comptage, rangement) accomplis afin de prévenir une conséquence redoutée ou de réduire la tension',
      'f42.distress_interference':
        'Les compulsions sont chronophages (p. ex. plus d’une heure par jour) ou entraînent une souffrance marquée ou une altération du quotidien',
      'f42.egodystonic':
        'Au moins une obsession ou une compulsion est reconnue comme excessive ou absurde (prise de conscience au moins par moments)',
      'f42.exclude_organic_schizophrenia':
        'La symptomatologie obsessionnelle n’est pas la conséquence d’un trouble schizophrénique ou affectif et n’est pas explicable par une cause organique ou une substance',
    },
  },
  'acute_stress_reaction': {
    name: 'Réaction aiguë à un facteur de stress',
    differentials: [
      'Trouble de stress post-traumatique (symptômes > 1 mois, évolution différée possible)',
      'Trouble de l’adaptation (moins aigu, intensité de stress moindre)',
      'Attaque de panique',
      'Confusion aiguë d’origine organique/induite par une substance',
    ],
    groups: {
      'f43_0.core': 'Noyau : réaction immédiate à un stress exceptionnel',
      'f43_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f43_0.exceptional_stressor':
        'Exposition à un stress physique ou psychique exceptionnel (p. ex. accident, violence, catastrophe) immédiatement avant le début des symptômes',
      'f43_0.immediate_onset':
        'Début des symptômes en l’espace de quelques minutes à quelques heures après le stress, avec régression rapide (en règle générale en quelques heures à quelques jours)',
      'f43_0.mixed_symptoms':
        'Tableau mixte et fluctuant associant une « sidération » initiale, un rétrécissement du champ de la conscience, une désorientation, de l’anxiété, du désespoir, une hyperactivité ou un retrait',
      'f43_0.exclude_persistent':
        'Les symptômes ne persistent pas au-delà de plusieurs jours à un degré évoquant plutôt un trouble de stress post-traumatique ou un trouble de l’adaptation',
    },
  },
  'post_traumatic_stress_disorder': {
    name: 'Trouble de stress post-traumatique',
    differentials: [
      'TSPT complexe (perturbations supplémentaires de l’affect, de soi et des relations ; CIM-11 6B41)',
      'Réaction aiguë à un facteur de stress (< 1 mois, régression rapide)',
      'Trouble de l’adaptation',
      'Épisode dépressif / trouble anxieux en lien avec un traumatisme',
    ],
    groups: {
      'f43_1.trauma': 'Critère lié au facteur de stress',
      'f43_1.symptoms':
        'Groupes de symptômes caractéristiques (reviviscence, évitement, hyperéveil)',
      'f43_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f43_1.traumatic_event':
        'Confrontation à un événement ou à une situation comportant une menace exceptionnelle ou de nature catastrophique, qui provoquerait un désarroi profond chez presque tout le monde',
      'f43_1.reexperiencing':
        'Reviviscence répétée et involontaire du traumatisme sous forme de souvenirs, de réminiscences intenses (flashbacks), de cauchemars ou d’une détresse intérieure envahissante lors du rappel',
      'f43_1.avoidance':
        'Évitement persistant des stimuli, pensées ou situations qui rappellent le traumatisme',
      'f43_1.hyperarousal':
        'Hyperéveil persistant avec, p. ex., difficultés d’endormissement/de maintien du sommeil, irritabilité, troubles de la concentration, réactions de sursaut ou vigilance accrue',
      'f43_1.exclude_other':
        'La symptomatologie n’est pas mieux expliquée par un autre trouble mental, une maladie physique ou l’effet d’une substance',
    },
  },
  'adjustment_disorder': {
    name: 'Trouble de l’adaptation',
    differentials: [
      'Épisode dépressif (critères pleinement remplis)',
      'Trouble de stress post-traumatique (traumatisme d’ampleur exceptionnelle)',
      'Réaction aiguë à un facteur de stress (immédiate, de courte durée)',
      'Réaction de deuil normale',
    ],
    groups: {
      'f43_2.core':
        'Noyau : symptômes émotionnels/comportementaux dépendant d’un facteur de stress',
      'f43_2.exclusions': 'Exclusions',
    },
    criteria: {
      'f43_2.identifiable_stressor':
        'Survenue des symptômes en lien temporel étroit (en règle générale dans le mois) avec un événement de vie stressant identifiable ou un changement de vie',
      'f43_2.emotional_symptoms':
        'Atteinte émotionnelle (p. ex. humeur dépressive, anxiété, inquiétude) ou altération du comportement social/des performances, dépassant une réaction normale',
      'f43_2.exclude_full_disorder':
        'Les symptômes ne remplissent pas les critères d’un trouble affectif, anxieux ou lié au stress spécifique qui devrait être codé en priorité',
    },
  },
  'dissociative_conversion_disorders': {
    name: 'Troubles dissociatifs (troubles de conversion)',
    differentials: [
      'Maladie neurologique/somatique (à exclure impérativement)',
      'Trouble de stress post-traumatique avec symptômes dissociatifs',
      'Trouble factice / simulation',
      'Épilepsie (en présence de tableaux paroxystiques)',
    ],
    groups: {
      'f44.core': 'Noyau : trouble fonctionnel dissociatif ou de conversion',
      'f44.features': 'Éléments en faveur',
      'f44.exclusions': 'Exclusions',
    },
    criteria: {
      'f44.psychoform_dissociation':
        'Perte partielle ou complète de l’intégration normale des souvenirs, de l’identité, des sensations immédiates ou du contrôle des mouvements (p. ex. amnésie dissociative, fugue, stupeur, dépersonnalisation/déréalisation)',
      'f44.conversion_symptoms':
        'Symptômes de conversion pseudo-neurologiques (p. ex. paralysies, troubles de la sensibilité, crises non épileptiques, troubles de la vue/de la parole) sans explication organique suffisante',
      'f44.temporal_link':
        'Lien temporel convaincant entre les symptômes et des événements stressants, des conflits ou des besoins',
      'f44.exclude_organic':
        'Aucun élément n’oriente vers une maladie physique (notamment neurologique) susceptible d’expliquer les symptômes ; un bilan somatique ciblé a été réalisé',
    },
  },
  'somatoform_bodily_distress_disorder': {
    name: 'Trouble somatoforme (trouble de détresse corporelle)',
    differentials: [
      'Trouble hypocondriaque/d’anxiété de maladie (peur d’une maladie plutôt que détresse liée aux symptômes)',
      'Trouble dépressif ou anxieux avec symptômes physiques',
      'Maladie somatique insuffisamment explorée',
      'Trouble dissociatif (de conversion)',
    ],
    groups: {
      'f45.core':
        'Noyau : symptômes physiques pénibles, présentés de façon répétée',
      'f45.exclusions': 'Exclusions',
    },
    criteria: {
      'f45.persistent_symptoms':
        'Plaintes physiques persistantes ou récurrentes (souvent multiples et changeantes), pénibles pour la personne et conduisant à recourir de façon répétée à une aide médicale',
      'f45.excessive_attention':
        'Attention excessive portée aux symptômes et/ou recours répété à des examens, malgré des réassurances répétées sur la normalité des résultats',
      'f45.exclude_organic':
        'Les plaintes ne sont pas suffisamment expliquées par une maladie physique objectivable ; un bilan somatique approprié a été réalisé',
    },
  },
  'hypochondriasis_health_anxiety': {
    name: 'Trouble hypocondriaque (trouble d’anxiété de maladie)',
    differentials: [
      'Trouble somatoforme/de détresse corporelle (détresse liée aux symptômes plutôt qu’anxiété de maladie)',
      'Trouble anxieux généralisé',
      'Trouble obsessionnel-compulsif',
      'Trouble délirant de type hypocondriaque (absence de prise de conscience)',
    ],
    groups: {
      'f45_2.core': 'Noyau : conviction/crainte persistante d’être malade',
      'f45_2.exclusions': 'Exclusions',
    },
    criteria: {
      'f45_2.disease_conviction':
        'Conviction persistante ou crainte marquée de souffrir d’une ou de plusieurs maladies physiques graves, fondée sur une interprétation erronée de sensations corporelles normales',
      'f45_2.reassurance_resistant':
        'Les appréhensions persistent malgré des résultats d’examens normaux et la réassurance médicale',
      'f45_2.exclude_delusional':
        'La conviction de maladie n’atteint pas une intensité délirante et n’est pas mieux expliquée par un trouble schizophrénique ou affectif',
    },
  },
}
