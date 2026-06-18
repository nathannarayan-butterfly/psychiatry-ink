import type { DisorderTranslationMap } from '../types'

/** FR translations — ICD-10 F3 block. */
export const frMood: DisorderTranslationMap = {
  'depressive_episode': {
    name: 'Épisode dépressif',
    differentials: [
      'Trouble de l’adaptation',
      'Dépression bipolaire (rechercher des phases maniaques/hypomaniaques antérieures)',
      'Dysthymie / trouble dépressif persistant',
      'Trouble affectif d’origine organique ou induit par une substance',
    ],
    groups: {
      'f32.core': 'Symptômes fondamentaux (au moins 2 sur 3)',
      'f32.additional': 'Symptômes additionnels (au moins 2)',
      'f32.exclusions': 'Exclusions',
      '6a70.affective_core': 'Symptôme affectif fondamental (au moins un requis)',
      '6a70.total_symptoms':
        'Symptomatologie globale issue des trois groupes (au moins 5, presque tous les jours, dont au moins un symptôme affectif)',
      '6a70.duration': 'Critère de durée',
      '6a70.severity': 'Spécificateur de sévérité (léger / moyen / sévère)',
      '6a70.exclusions': 'Exclusions',
    },
    criteria: {
      'f32.depressed_mood':
        'Humeur abaissée, morose, présente presque tous les jours et la majeure partie de la journée, largement indépendante des circonstances extérieures',
      'f32.anhedonia':
        'Perte marquée de l’intérêt ou du plaisir pour des activités habituellement agréables',
      'f32.reduced_energy':
        'Réduction de l’énergie ou de l’élan, ou fatigabilité accrue survenant même après un faible effort',
      'f32.concentration':
        'Diminution de la capacité à penser, à se concentrer ou à prendre des décisions',
      'f32.guilt_worthlessness':
        'Diminution de l’estime de soi ou de la confiance en soi, ou sentiments inappropriés de culpabilité et de dévalorisation',
      'f32.hopelessness': 'Vision pessimiste et désespérée de l’avenir',
      'f32.sleep': 'Troubles du sommeil de toute nature',
      'f32.appetite':
        'Modification de l’appétit (diminution ou augmentation) avec variation pondérale correspondante',
      'f32.psychomotor':
        'Modification de l’activité psychomotrice avec agitation ou ralentissement (subjectif ou observable)',
      'f32.suicidality':
        'Pensées récurrentes de mort ou de suicide, ou comportements suicidaires ou auto-agressifs',
      'f32.exclude_mania':
        'À aucun moment de l’histoire de vie, présence de symptômes hypomaniaques ou maniaques d’une intensité suffisante pour remplir les critères d’un épisode hypomaniaque/maniaque (ce qui orienterait vers un trouble bipolaire)',
      'f32.exclude_organic_substance':
        'L’épisode n’est pas imputable à une substance psychoactive ou à un trouble mental organique',
      '6a70.depressed_mood':
        'Humeur abaissée, morose, la majeure partie de la journée et presque tous les jours, largement indépendante des circonstances extérieures (groupe affectif)',
      '6a70.anhedonia':
        'Réduction marquée de l’intérêt ou du plaisir pour les activités, en particulier celles habituellement vécues comme agréables (groupe affectif)',
      '6a70.concentration':
        'Diminution de la capacité de concentration et d’attention, ou indécision marquée (groupe cognitivo-comportemental)',
      '6a70.worthlessness':
        'Sentiments de dévalorisation ou culpabilité excessive et inappropriée (groupe cognitivo-comportemental)',
      '6a70.hopelessness': 'Désespoir quant à l’avenir (groupe cognitivo-comportemental)',
      '6a70.suicidality':
        'Pensées récurrentes de mort ou de suicide, ou comportements suicidaires ou auto-agressifs (groupe cognitivo-comportemental)',
      '6a70.sleep':
        'Troubles du sommeil (difficultés d’endormissement ou de maintien du sommeil, réveil précoce ou besoin de sommeil accru), presque tous les jours (groupe neurovégétatif)',
      '6a70.appetite':
        'Modification marquée de l’appétit ou du poids (diminution ou augmentation) (groupe neurovégétatif)',
      '6a70.fatigue':
        'Réduction de l’énergie, fatigabilité marquée ou épuisement même après un faible effort (groupe neurovégétatif)',
      '6a70.psychomotor':
        'Agitation ou ralentissement psychomoteur, rapporté subjectivement ou observable (groupe neurovégétatif)',
      '6a70.duration_two_weeks':
        'La symptomatologie persiste de façon quasi continue sur une période d’au moins deux semaines',
      '6a70.severity_mild':
        'Épisode léger : aucun symptôme n’est particulièrement intense, avec seulement une légère altération du fonctionnement quotidien',
      '6a70.severity_moderate':
        'Épisode moyen : plusieurs symptômes marqués, ou de nombreux symptômes plus légers, avec une altération notable du fonctionnement, sans idées délirantes ni hallucinations',
      '6a70.severity_severe':
        'Épisode sévère : nombre élevé ou majorité de symptômes nettement présents avec une altération marquée du fonctionnement, éventuellement avec des symptômes psychotiques',
      '6a70.exclude_mania':
        'À aucun moment de l’histoire de vie, survenue d’épisodes maniaques, mixtes ou hypomaniaques (leur présence orienterait vers un trouble bipolaire)',
      '6a70.exclude_substance_organic':
        'La symptomatologie n’est pas imputable à une substance psychoactive, à un médicament ou à une autre cause physique ou organique',
    },
  },
  'manic_episode': {
    name: 'Épisode maniaque (y compris l’hypomanie et la manie avec symptômes psychotiques)',
    differentials: [
      'Trouble affectif bipolaire (F31) — en présence d’au moins deux épisodes affectifs au cours de l’évolution',
      'Trouble schizo-affectif, type maniaque (F25.0)',
      'Trouble maniaque induit par une substance (p. ex. stimulants, stéroïdes) ou d’origine organique',
      'Trouble déficitaire de l’attention/hyperactivité à l’âge adulte',
      'Forme agitée d’un épisode affectif mixte',
    ],
    groups: {
      'f30.mood_core': 'Symptôme directeur de l’humeur (élevée ou irritable)',
      'f30.symptoms':
        'Symptômes d’accompagnement de la manie (au moins 3 ; au moins 4 lorsque l’humeur est seulement irritable)',
      'f30.duration':
        'Critère de durée (manie au moins 1 semaine ; hypomanie au moins quelques jours)',
      'f30.severity_hypomania': 'Spécificateur de sévérité : hypomanie (F30.0)',
      'f30.severity_mania':
        'Spécificateur de sévérité : manie sans symptômes psychotiques (F30.1)',
      'f30.severity_psychotic':
        'Spécificateur de sévérité : manie avec symptômes psychotiques (F30.2)',
      'f30.exclusions': 'Exclusions',
      '6a60.core_dyad': 'Dyade fondamentale : changement de l’humeur ET activité/énergie accrue (les deux requis)',
      '6a60.symptoms': 'Symptômes caractéristiques d’accompagnement (plusieurs ; au moins 3)',
      '6a60.duration': 'Critère de durée (au moins 1 semaine, ou moins en cas de nécessité d’une hospitalisation)',
      '6a60.exclusions': 'Exclusions',
    },
    criteria: {
      'f30.elevated_mood':
        'Humeur nettement élevée, expansive ou euphorique, non adaptée aux circonstances de vie',
      'f30.irritable_mood': 'Humeur nettement irritable ou expansive-dysphorique',
      'f30.increased_activity':
        'Activité accrue, agitation motrice ou élan augmenté',
      'f30.talkativeness':
        'Besoin accru de parler ou logorrhée (volubilité augmentée)',
      'f30.distractibility':
        'Distractibilité accrue ou changement incessant d’activités et de projets',
      'f30.reduced_sleep_need':
        'Réduction du besoin de sommeil tout en conservant ou en augmentant l’activité diurne',
      'f30.grandiosity':
        'Estime de soi exagérée ou idées de grandeur allant jusqu’à la surestimation de soi',
      'f30.reckless_behavior':
        'Comportement désinhibé, sans distance ou imprudent, avec méconnaissance des conséquences possibles (p. ex. dépenses inconsidérées, entreprises à risque)',
      'f30.increased_sociability_libido':
        'Sociabilité accrue, hyperactivité ou augmentation de la pulsion sexuelle',
      'f30.duration_one_week':
        'La symptomatologie persiste au moins une semaine (ou moins en cas de nécessité d’une hospitalisation) ; pour une hypomanie, plusieurs jours consécutifs suffisent',
      'f30.hypomania_mild':
        'Humeur légèrement à modérément élevée avec élan accru pendant plusieurs jours, sans altération notable de l’activité professionnelle ni rejet social et sans symptômes psychotiques',
      'f30.mania_marked_impairment':
        'Manie pleinement développée avec altération marquée de la conduite de la vie quotidienne, mais sans idées délirantes ni hallucinations',
      'f30.psychotic_delusions':
        'Idées de grandeur congruentes à l’humeur ou (plus rarement) idées délirantes non congruentes à l’humeur',
      'f30.psychotic_hallucinations':
        'Hallucinations survenant dans le cadre de l’épisode maniaque',
      'f30.exclude_organic_substance':
        'L’épisode n’est pas imputable à une substance psychoactive (p. ex. stimulants, corticostéroïdes) ni à un trouble mental organique',
      'f30.exclude_schizoaffective':
        'Absence d’une symptomatologie schizophrénique concomitante dominante qui évoquerait un trouble schizo-affectif',
      '6a60.mood_change':
        'État d’humeur extrême d’euphorie, d’irritabilité ou d’expansivité la plupart des jours et la majeure partie de la journée',
      '6a60.increased_activity_energy':
        'Activité accrue ou énergie subjectivement augmentée de façon concomitante (la seconde caractéristique fondamentale obligatoire de la CIM-11, en plus du changement d’humeur)',
      '6a60.grandiosity':
        'Estime de soi exagérée ou idées de grandeur allant jusqu’à la surestimation de soi',
      '6a60.decreased_sleep_need':
        'Réduction du besoin de sommeil tout en conservant ou en augmentant l’activité diurne',
      '6a60.pressured_speech':
        'Besoin accru de parler ou volubilité excessive et difficile à interrompre (logorrhée)',
      '6a60.flight_of_ideas': 'Pensée subjectivement accélérée, fuite des idées ou pensées qui se bousculent',
      '6a60.distractibility': 'Distractibilité accrue ou changement incessant d’activités et de projets',
      '6a60.increased_goal_directed_activity':
        'Augmentation de l’activité orientée vers un but, hyperactivité ou augmentation de la sociabilité ou de la libido',
      '6a60.risky_behaviour':
        'Comportement imprudent ou désinhibé avec méconnaissance des conséquences possibles (p. ex. dépenses inconsidérées, entreprises à risque)',
      '6a60.duration_one_week':
        'La symptomatologie est présente la plupart des jours de façon quasi continue pendant au moins une semaine (ou moins en cas de nécessité d’une hospitalisation)',
      '6a60.exclude_substance_organic':
        'L’épisode n’est pas imputable à une substance psychoactive, à un médicament ou à une autre cause physique ou organique',
    },
  },
  'bipolar_affective_disorder': {
    name: 'Trouble affectif bipolaire',
    differentials: [
      'Trouble dépressif récurrent (F33) — en présence exclusive d’épisodes dépressifs sans phases (hypo)maniaques',
      'Trouble schizo-affectif (F25)',
      'Cyclothymie (F34.0) — en cas de fluctuations chroniques infraliminaires',
      'Trouble de la personnalité émotionnellement labile (type borderline)',
      'Trouble affectif induit par une substance ou d’origine organique',
    ],
    groups: {
      'f31.recurrence': 'Coupe longitudinale : épisodes affectifs répétés',
      'f31.current_hypomanic':
        'Spécificateur : épisode actuel hypomaniaque (F31.0)',
      'f31.current_manic':
        'Spécificateur : épisode actuel maniaque (F31.1 sans / F31.2 avec symptômes psychotiques)',
      'f31.current_mixed': 'Spécificateur : épisode actuel mixte (F31.6)',
      'f31.current_depressed':
        'Spécificateur : épisode actuel dépressif (F31.3 léger/moyen · F31.4 sévère · F31.5 avec symptômes psychotiques)',
      'f31.exclusions': 'Exclusions',
      '6a60_61.core': 'Noyau : au moins un épisode (hypo)maniaque ou mixte au cours de l’évolution (requis)',
      '6a60.type_i': 'Sous-type : trouble bipolaire de type I (6A60) — au moins un épisode maniaque ou mixte',
      '6a61.type_ii':
        'Sous-type : trouble bipolaire de type II (6A61) — au moins un épisode hypomaniaque ET un épisode dépressif, jamais d’épisode maniaque',
      '6a60_61.exclusions': 'Exclusions',
    },
    criteria: {
      'f31.two_episodes':
        'Au cours de l’évolution, au moins deux épisodes affectifs nettement distincts, séparés par des phases de rémission largement complète',
      'f31.lifetime_elevated_episode':
        'Au moins un des épisodes a été hypomaniaque, maniaque ou mixte (une évolution exclusivement dépressive exclut le trouble bipolaire)',
      'f31.current_hypomanic_state':
        'Actuellement humeur légèrement élevée avec élan accru pendant plusieurs jours, sans altération notable du fonctionnement et sans symptômes psychotiques',
      'f31.current_manic_state':
        'Actuellement manie pleinement développée avec humeur élevée ou irritable, élan accru et altération marquée du fonctionnement',
      'f31.current_manic_psychotic':
        'Spécificateur F31.2 : présence concomitante d’idées délirantes congruentes ou non à l’humeur, ou d’hallucinations, pendant l’épisode maniaque',
      'f31.current_mixed_state':
        'Actuellement présence simultanée ou alternant rapidement de symptômes maniaques et dépressifs marqués pendant au moins deux semaines',
      'f31.current_depressed_state':
        'Actuellement épisode dépressif avec humeur abaissée, perte d’intérêt et réduction de l’élan',
      'f31.current_depressed_psychotic':
        'Spécificateur F31.5 : idées délirantes congruentes (synthymes) ou non congruentes (parathymes) à l’humeur, ou hallucinations, pendant l’épisode dépressif',
      'f31.exclude_organic_substance':
        'Les épisodes affectifs ne sont pas imputables à une substance psychoactive ni à un trouble mental organique',
      'f31.exclude_schizoaffective':
        'La symptomatologie n’est pas mieux expliquée par un trouble schizo-affectif ou une schizophrénie',
      '6a60_61.manic_or_mixed_episode': 'Au cours de l’évolution, survenue d’au moins un épisode maniaque ou mixte',
      '6a60_61.hypomanic_episode':
        'Au cours de l’évolution, survenue d’au moins un épisode hypomaniaque (moins sévère, sans altération notable du fonctionnement et sans symptômes psychotiques)',
      '6a60.type_i_manic_episode':
        'Un seul épisode maniaque ou mixte pleinement développé suffit pour le type I ; un épisode dépressif n’est pas requis',
      '6a61.type_ii_hypomanic_episode':
        'Au moins un épisode hypomaniaque au cours de l’évolution, mais à aucun moment un épisode maniaque ou mixte pleinement développé',
      '6a61.type_ii_depressive_episode':
        'Au moins un épisode dépressif au cours de l’évolution (requis en plus pour le type II)',
      '6a60_61.exclude_substance_organic':
        'Les épisodes affectifs ne sont pas imputables à une substance psychoactive, à un médicament ou à une autre cause physique ou organique',
      '6a60_61.exclude_schizoaffective':
        'La symptomatologie n’est pas mieux expliquée par un trouble schizo-affectif ou une schizophrénie',
    },
  },
  'recurrent_depressive_disorder': {
    name: 'Trouble dépressif récurrent',
    differentials: [
      'Épisode dépressif (F32) — lors d’un premier épisode unique',
      'Trouble affectif bipolaire (F31) — en présence d’épisodes (hypo)maniaques dans les antécédents',
      'Dysthymie (F34.1) — en cas de symptomatologie chronique infraliminaire',
      'Trouble de l’adaptation avec réaction dépressive',
      'Trouble affectif d’origine organique ou induit par une substance',
    ],
    groups: {
      'f33.current_episode':
        'Épisode dépressif actuel (symptômes fondamentaux, au moins 2 sur 3)',
      'f33.additional': 'Symptômes additionnels de l’épisode actuel (au moins 2)',
      'f33.recurrence': 'Coupe longitudinale : évolution récurrente',
      'f33.severity_psychotic':
        'Spécificateur : épisode actuel sévère avec symptômes psychotiques (F33.3)',
      'f33.exclusions': 'Exclusions',
      '6a71.affective_core': 'Symptôme affectif fondamental de l’épisode actuel (au moins un requis)',
      '6a71.total_symptoms':
        'Symptomatologie globale de l’épisode actuel issue des trois groupes (au moins 5, presque tous les jours, dont au moins un symptôme affectif)',
      '6a71.recurrence': 'Coupe longitudinale : évolution récurrente',
      '6a71.exclusions': 'Exclusions',
    },
    criteria: {
      'f33.depressed_mood':
        'Humeur abaissée la majeure partie de la journée, largement indépendante des circonstances extérieures',
      'f33.anhedonia':
        'Perte marquée de l’intérêt ou du plaisir pour des activités habituellement agréables',
      'f33.reduced_energy':
        'Réduction de l’élan ou de l’énergie, ou fatigabilité accrue',
      'f33.concentration': 'Diminution de la concentration et de l’attention',
      'f33.guilt_worthlessness':
        'Diminution de l’estime de soi ou sentiments inappropriés de culpabilité et de dévalorisation',
      'f33.suicidality':
        'Pensées récurrentes de mort ou de suicide, ou comportements suicidaires',
      'f33.sleep': 'Troubles du sommeil de toute nature',
      'f33.appetite':
        'Modification de l’appétit avec variation pondérale correspondante',
      'f33.prior_episode':
        'Dans les antécédents, au moins un autre épisode dépressif, séparé par un intervalle libre de symptômes de plusieurs mois',
      'f33.psychotic_delusions':
        'Idées délirantes congruentes à l’humeur (p. ex. délire de culpabilité, de ruine ou de péché, délire nihiliste) pendant l’épisode actuel',
      'f33.psychotic_hallucinations':
        'Hallucinations (souvent des voix accusatrices ou insultantes) pendant l’épisode actuel',
      'f33.exclude_mania':
        'À aucun moment des antécédents, présence d’épisodes hypomaniaques ou maniaques d’une intensité suffisante pour remplir les critères d’un épisode (hypo)maniaque (ce qui orienterait vers un trouble bipolaire)',
      'f33.exclude_organic_substance':
        'Les épisodes ne sont pas imputables à une substance psychoactive ni à un trouble mental organique',
      '6a71.depressed_mood':
        'Humeur abaissée la majeure partie de la journée et presque tous les jours (groupe affectif de l’épisode actuel)',
      '6a71.anhedonia':
        'Réduction marquée de l’intérêt ou du plaisir pour les activités (groupe affectif de l’épisode actuel)',
      '6a71.concentration':
        'Diminution de la capacité de concentration et d’attention, ou indécision marquée (groupe cognitivo-comportemental)',
      '6a71.worthlessness':
        'Sentiments de dévalorisation ou culpabilité excessive et inappropriée (groupe cognitivo-comportemental)',
      '6a71.hopelessness': 'Désespoir quant à l’avenir (groupe cognitivo-comportemental)',
      '6a71.suicidality':
        'Pensées récurrentes de mort ou de suicide, ou comportements suicidaires ou auto-agressifs (groupe cognitivo-comportemental)',
      '6a71.sleep':
        'Troubles du sommeil (difficultés d’endormissement ou de maintien du sommeil, réveil précoce ou besoin de sommeil accru), presque tous les jours (groupe neurovégétatif)',
      '6a71.appetite':
        'Modification marquée de l’appétit ou du poids (diminution ou augmentation) (groupe neurovégétatif)',
      '6a71.fatigue':
        'Réduction de l’énergie, fatigabilité marquée ou épuisement même après un faible effort (groupe neurovégétatif)',
      '6a71.psychomotor':
        'Agitation ou ralentissement psychomoteur, rapporté subjectivement ou observable (groupe neurovégétatif)',
      '6a71.recurrent_episodes':
        'Au cours de l’évolution, au moins deux épisodes dépressifs, séparés par un intervalle largement libre de symptômes de plusieurs mois sans perturbation thymique notable',
      '6a71.exclude_mania':
        'À aucun moment de l’histoire de vie, survenue d’épisodes maniaques, mixtes ou hypomaniaques (leur présence orienterait vers un trouble bipolaire)',
      '6a71.exclude_substance_organic':
        'Les épisodes ne sont pas imputables à une substance psychoactive, à un médicament ou à une autre cause physique ou organique',
    },
  },
  'cyclothymia': {
    name: 'Cyclothymie',
    differentials: [
      'Trouble affectif bipolaire (F31) — en présence d’épisodes affectifs pleinement développés',
      'Dysthymie (F34.1) — en cas d’abaissement dépressif chronique purement dépressif',
      'Trouble de la personnalité émotionnellement labile',
      'Fluctuations de l’humeur liées à une substance',
    ],
    groups: {
      'f34_0.core': 'Noyau : instabilité chronique de l’humeur',
      'f34_0.exclusions': 'Exclusions',
      '6a62.core': 'Noyau : instabilité persistante de l’humeur avec de nombreuses périodes hypomaniaques et dépressives',
      '6a62.exclusions': 'Exclusions',
    },
    criteria: {
      'f34_0.mood_instability':
        'Instabilité persistante de l’humeur avec de nombreuses phases d’humeur légèrement élevée et légèrement abaissée, dont aucune n’atteint la sévérité d’un épisode (hypo)maniaque ou dépressif',
      'f34_0.duration_two_years':
        'Les fluctuations de l’humeur persistent sur une période d’au moins deux ans (en cas de début à l’âge adulte)',
      'f34_0.exclude_full_episodes':
        'Les oscillations de l’humeur ne remplissent à aucun moment l’ensemble des critères d’un épisode maniaque, hypomaniaque ou dépressif (sinon trouble bipolaire ou trouble dépressif récurrent)',
      'f34_0.exclude_organic_substance':
        'L’instabilité de l’humeur n’est pas imputable à une substance psychoactive ni à un trouble mental organique',
      '6a62.mood_instability':
        'Instabilité persistante de l’humeur avec de nombreuses périodes distinctes de symptômes hypomaniaques et dépressifs, chacune restant infraliminaire (aucun épisode pleinement développé)',
      '6a62.duration_two_years':
        'L’instabilité de l’humeur persiste sur une période d’au moins deux ans et pendant plus de la moitié du temps',
      '6a62.exclude_full_episodes':
        'Les oscillations de l’humeur ne remplissent à aucun moment l’ensemble des critères d’un épisode maniaque, mixte, hypomaniaque ou dépressif (sinon trouble bipolaire ou dépressif)',
      '6a62.exclude_substance_organic':
        'L’instabilité de l’humeur n’est pas imputable à une substance psychoactive, à un médicament ou à une autre cause physique ou organique',
    },
  },
  'dysthymia': {
    name: 'Dysthymie',
    differentials: [
      'Trouble dépressif récurrent (F33) — en présence d’épisodes pleinement développés',
      'Épisode dépressif (F32)',
      'Cyclothymie (F34.0) — en cas de fluctuation bipolaire',
      'Trouble de l’adaptation',
      'Trouble affectif d’origine organique ou induit par une substance',
    ],
    groups: {
      'f34_1.core': 'Noyau : humeur chroniquement abaissée',
      'f34_1.additional': 'Symptômes d’accompagnement de l’abaissement thymique (au moins 2)',
      'f34_1.exclusions': 'Exclusions',
      '6a72.core': 'Noyau : humeur chroniquement abaissée sur au moins deux ans',
      '6a72.additional': 'Symptômes d’accompagnement de l’abaissement thymique (au moins 2)',
      '6a72.exclusions': 'Exclusions',
    },
    criteria: {
      'f34_1.chronic_low_mood':
        'Humeur abaissée persistante ou récurrente pendant au moins deux ans, les intervalles libres de symptômes ne durant que quelques semaines et sans survenue de phases hypomaniaques',
      'f34_1.duration_two_years':
        'L’abaissement thymique persiste sur une période d’au moins deux ans',
      'f34_1.reduced_energy': 'Réduction de l’élan ou de l’activité',
      'f34_1.sleep': 'Troubles du sommeil',
      'f34_1.low_self_esteem':
        'Diminution de la confiance en soi ou sentiments d’insuffisance',
      'f34_1.concentration': 'Difficultés de concentration',
      'f34_1.hopelessness':
        'Ruminations fréquentes, pessimisme ou sentiment de désespoir',
      'f34_1.social_withdrawal':
        'Retrait social ou réduction de la communication verbale',
      'f34_1.exclude_recurrent_depression':
        'La sévérité et la durée des différentes phases ne remplissent pas les critères d’un trouble dépressif récurrent (même léger)',
      'f34_1.exclude_mania':
        'Absence de phases hypomaniaques dans les antécédents (ce qui orienterait vers une cyclothymie ou un trouble bipolaire)',
      'f34_1.exclude_organic_substance':
        'L’abaissement thymique n’est pas imputable à une substance psychoactive ni à un trouble mental organique',
      '6a72.chronic_low_mood':
        'Humeur abaissée persistante la majeure partie de la journée et plus de jours qu’autrement, sans intervalle libre de symptômes de plus d’environ deux mois',
      '6a72.duration_two_years':
        'L’abaissement thymique persiste sur une période d’au moins deux ans',
      '6a72.reduced_energy': 'Réduction de l’élan ou de l’activité',
      '6a72.sleep': 'Troubles du sommeil',
      '6a72.appetite': 'Modification de l’appétit (diminution ou augmentation)',
      '6a72.low_self_esteem': 'Diminution de la confiance en soi ou sentiments d’insuffisance',
      '6a72.concentration': 'Difficultés de concentration ou indécision',
      '6a72.hopelessness': 'Ruminations fréquentes, pessimisme ou sentiment de désespoir',
      '6a72.exclude_depressive_episode':
        'La symptomatologie ne remplit pas l’ensemble des critères d’un épisode dépressif pendant la majeure partie des deux premières années (sinon trouble dépressif récurrent)',
      '6a72.exclude_mania':
        'Absence d’épisodes hypomaniaques, maniaques ou mixtes dans les antécédents (ce qui orienterait vers une cyclothymie ou un trouble bipolaire)',
      '6a72.exclude_substance_organic':
        'L’abaissement thymique n’est pas imputable à une substance psychoactive, à un médicament ou à une autre cause physique ou organique',
    },
  },
  'mixed_affective_episode': {
    name: 'Épisode affectif mixte',
    differentials: [
      'Trouble affectif bipolaire, épisode actuel mixte (F31.6) — en présence d’une évolution bipolaire connue',
      'Épisode maniaque avec humeur irritable-dysphorique (F30)',
      'Épisode dépressif agité (F32)',
      'Trouble affectif induit par une substance ou d’origine organique',
    ],
    groups: {
      'f38_0.core': 'Noyau : symptomatologie affective mixte',
      'f38_0.exclusions': 'Exclusions',
      '6a60_3.core': 'Noyau : symptômes maniaques ET dépressifs marqués au sein du même épisode',
      '6a60_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f38_0.mixed_symptoms':
        'Présence simultanée ou alternant rapidement, en l’espace de quelques heures, de symptômes maniaques et dépressifs marqués pendant au moins deux semaines',
      'f38_0.duration_two_weeks':
        'La symptomatologie mixte persiste sur une période d’au moins deux semaines',
      'f38_0.exclude_organic_substance':
        'L’épisode n’est pas imputable à une substance psychoactive ni à un trouble mental organique',
      '6a60_3.mixed_symptoms':
        'Plusieurs symptômes maniaques marqués et plusieurs symptômes dépressifs marqués sont présents simultanément ou en alternance rapide la plupart des jours',
      '6a60_3.duration_two_weeks':
        'La symptomatologie mixte est présente la plupart des jours sur une période d’au moins deux semaines',
      '6a60_3.exclude_substance_organic':
        'L’épisode n’est pas imputable à une substance psychoactive, à un médicament ou à une autre cause physique ou organique',
    },
  },
  'other_persistent_mood_disorder': {
    name: 'Autre trouble affectif persistant',
    differentials: [
      'Cyclothymie (F34.0)',
      'Dysthymie (F34.1)',
      'Trouble dépressif récurrent (F33)',
      'Trouble affectif d’origine organique ou induit par une substance',
    ],
    groups: {
      'f34_8.core':
        'Symptomatologie affective persistante en dehors des catégories définies',
      'f34_8.exclusions': 'Exclusions',
    },
    criteria: {
      'f34_8.persistent_affective':
        'Symptomatologie affective chronique persistante, qui n’est pas suffisamment sévère ou prolongée pour remplir les critères d’une cyclothymie ou d’une dysthymie, mais qui demeure cliniquement significative',
      'f34_8.not_otherwise_classifiable':
        'Le tableau clinique ne peut être rattaché clairement à aucun trouble affectif persistant plus spécifique (cyclothymie, dysthymie) (catégorie résiduelle nommée)',
      'f34_8.exclude_organic_substance':
        'La symptomatologie n’est pas imputable à une substance psychoactive ni à un trouble mental organique',
    },
  },
  'other_mood_disorder': {
    name: 'Autre trouble affectif',
    differentials: [
      'Épisode maniaque (F30) ou épisode dépressif (F32) lorsque les critères sont pleinement remplis',
      'Trouble affectif bipolaire (F31) ou trouble dépressif récurrent (F33)',
      'Épisode affectif mixte (F38.00)',
      'Trouble affectif d’origine organique ou induit par une substance',
    ],
    groups: {
      'f38_8.core':
        'Trouble affectif spécifié en dehors des autres catégories',
      'f38_8.exclusions': 'Exclusions',
    },
    criteria: {
      'f38_8.affective_symptoms':
        'Symptomatologie affective cliniquement significative (p. ex. épisodes dépressifs brefs récurrents), identifiable mais ne remplissant pas les critères des autres catégories affectives',
      'f38_8.not_classifiable_elsewhere':
        'La symptomatologie ne remplit pas l’ensemble des critères d’un trouble maniaque, dépressif, bipolaire, dépressif récurrent ou affectif persistant (catégorie résiduelle nommée)',
      'f38_8.exclude_organic_substance':
        'La symptomatologie n’est pas imputable à une substance psychoactive ni à un trouble mental organique',
    },
  },
  'unspecified_mood_disorder': {
    name: 'Trouble affectif sans précision',
    differentials: [
      'Autre trouble affectif (F38) en présence d’un tableau spécifié',
      'Épisode maniaque (F30) ou dépressif (F32) lorsque les critères sont pleinement remplis',
      'Trouble affectif bipolaire (F31) ou trouble dépressif récurrent (F33)',
      'Trouble affectif d’origine organique ou induit par une substance',
    ],
    groups: {
      'f39.core':
        'Symptomatologie affective sans information suffisante pour un rattachement plus spécifique',
      'f39.exclusions': 'Exclusions',
    },
    criteria: {
      'f39.affective_symptoms':
        'Une symptomatologie affective cliniquement significative est présente, mais ne peut être rattachée à aucune catégorie affective spécifique faute d’informations suffisantes',
      'f39.insufficient_information':
        'Les données disponibles sont insuffisantes pour un diagnostic affectif plus spécifique ou sont contradictoires (catégorie provisoire ou de recours)',
      'f39.exclude_organic_substance':
        'La symptomatologie affective n’est pas imputable à une substance psychoactive ni à un trouble mental organique',
    },
  },
}
