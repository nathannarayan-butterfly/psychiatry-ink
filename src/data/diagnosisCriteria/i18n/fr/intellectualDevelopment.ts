import type { DisorderTranslationMap } from '../types'

/** FR translations — ICD-10 F7 block. */
export const frIntellectualDevelopment: DisorderTranslationMap = {
  intellectual_disability_mild: {
    name: 'Retard mental léger',
    differentials: [
      'Trouble spécifique des apprentissages / du développement (déficit circonscrit plutôt que retard global)',
      'Retard des performances d’origine socio-économique ou éducative',
      'Trouble sensoriel non détecté (baisse de la vision ou de l’audition)',
      'Trouble du spectre de l’autisme sans retard mental',
    ],
    groups: {
      'f70.core': 'Noyau : les trois piliers diagnostiques du retard mental',
      'f70.assessment': 'Conditions diagnostiques de l’évaluation',
      'f70.exclusions': 'Exclusions / diagnostic différentiel',
      '6a00_0.functioning': 'Efficience intellectuelle altérée avec début pendant la période de développement',
      '6a00_0.adaptive_domains': 'Limitation du comportement adaptatif dans les trois domaines (profil spécifique au degré de sévérité)',
      '6a00_0.assessment': 'Détermination du degré de sévérité et établissement diagnostique',
      '6a00_0.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f70.intellectual_functioning':
        'Efficience intellectuelle générale nettement inférieure à la moyenne, environ dans la zone d’un QI de 50 à 69 (correspondant chez l’adulte, de façon approximative, à un âge de développement de 9 à moins de 12 ans)',
      'f70.adaptive_functioning':
        'Difficultés d’apprentissage scolaire, mais autonomie souvent accessible dans les soins personnels et les compétences pratiques et domestiques ; un soutien est requis surtout pour les exigences abstraites et complexes',
      'f70.functional_profile':
        'Le langage est en règle générale acquis de manière suffisante pour les usages quotidiens ; beaucoup de personnes concernées sont aptes au travail à l’âge adulte et peuvent entretenir des relations sociales',
      'f70.developmental_onset':
        'Début des altérations pendant la période de développement (avant l’achèvement de la maturation cérébrale), et non sous la forme d’un déclin des performances acquis plus tardivement au sens d’une affection démentielle',
      'f70.standardized_assessment':
        'Évaluation de l’efficience intellectuelle et adaptative si possible au moyen de procédures standardisées, normées et adaptées de façon équitable sur le plan culturel ; l’attribution du degré de sévérité ne repose pas sur un seul score de test isolé',
      'f70.exclude_acquired_decline':
        'La baisse du niveau de fonctionnement n’est pas expliquée par un déclin cognitif acquis seulement après la période de développement (démence, traumatisme crânio-cérébral à l’âge adulte)',
      'f70.exclude_sensory_deprivation':
        'Le retard des performances n’est pas suffisamment expliqué à lui seul par un trouble sensoriel non corrigé, un trouble psychique sévère ou une absence de scolarisation / une privation sociale',
      '6a00_0.intellectual_functioning':
        'Limitation significative de l’efficience intellectuelle générale, si possible attestée par des tests standardisés, administrés individuellement et normés, à environ deux écarts-types ou plus en dessous de la moyenne (ou par des indicateurs comportementaux lorsque des normes adaptées ne sont pas disponibles)',
      '6a00_0.developmental_onset':
        'Début pendant la période de développement : les limitations sont présentes depuis l’enfance et ne représentent pas un déclin des performances acquis seulement plus tard',
      '6a00_0.conceptual_domain':
        'Domaine conceptuel : souvent peu apparent dans la petite enfance ; à l’âge scolaire, difficultés d’acquisition des compétences scolaires (lecture, écriture, calcul) ainsi que de la pensée abstraite, de la planification et de la résolution de problèmes, alors que les tâches concrètes du quotidien sont généralement gérées',
      '6a00_0.social_domain':
        'Domaine social : interaction sociale immature par rapport aux pairs, avec des difficultés à reconnaître de façon fiable les signaux et les risques sociaux ; la régulation émotionnelle et le jugement social sont diminués pour l’âge, d’où une plus grande influençabilité',
      '6a00_0.practical_domain':
        'Domaine pratique : les soins personnels adaptés à l’âge sont en règle générale possibles ; un soutien est nécessaire pour les exigences quotidiennes complexes (achats, gestion de l’argent, tenue du foyer, tâches d’organisation) ; un emploi à exigences essentiellement concrètes est accessible',
      '6a00_0.severity_by_adaptive':
        'L’attribution du degré de sévérité repose sur le profil du comportement adaptatif dans les trois domaines (conceptuel, social, pratique) et non sur un seul score de QI',
      '6a00_0.standardized_or_behavioural':
        'Lorsque cela est possible, le diagnostic est établi au moyen d’instruments standardisés, équitables sur le plan culturel et normés pour les fonctions intellectuelles et adaptatives ; à défaut de normes adaptées, il s’appuie sur des indicateurs comportementaux soigneusement recueillis',
      '6a00_0.exclude_acquired_decline':
        'Les limitations ne s’expliquent pas par un trouble neurocognitif acquis seulement après la période de développement (p. ex. démence, lésion cérébrale acquise)',
      '6a00_0.exclude_sensory_deprivation':
        'Le niveau de fonctionnement ne s’explique pas à lui seul par un trouble sensoriel non corrigé, un autre trouble mental, ou par une privation sociale ou une absence de scolarisation',
    },
  },
  intellectual_disability_moderate: {
    name: 'Retard mental moyen',
    differentials: [
      'Retard mental sévère (F72)',
      'Trouble envahissant du développement avec retard global',
      'Trouble neurocognitif acquis dans l’enfance',
      'Privation sévère avec retard de développement',
    ],
    groups: {
      'f71.core': 'Noyau : les trois piliers diagnostiques du retard mental',
      'f71.assessment': 'Conditions diagnostiques de l’évaluation',
      'f71.exclusions': 'Exclusions / diagnostic différentiel',
      '6a00_1.functioning': 'Efficience intellectuelle altérée avec début pendant la période de développement',
      '6a00_1.adaptive_domains': 'Limitation du comportement adaptatif dans les trois domaines (profil spécifique au degré de sévérité)',
      '6a00_1.assessment': 'Détermination du degré de sévérité et établissement diagnostique',
      '6a00_1.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f71.intellectual_functioning':
        'Efficience intellectuelle générale nettement inférieure à la moyenne, environ dans la zone d’un QI de 35 à 49 (correspondant de façon approximative à un âge de développement de 6 à moins de 9 ans)',
      'f71.adaptive_functioning':
        'Développement nettement ralenti de la compréhension et de l’usage du langage ainsi que des compétences de soins personnels et motrices ; un soutien durable est requis dans la vie quotidienne et la conduite de la vie',
      'f71.functional_profile':
        'Progrès scolaires limités ; à l’âge adulte, des activités simples et supervisées sont le plus souvent possibles ; participation sociale dans un environnement structuré',
      'f71.developmental_onset':
        'Début des altérations pendant la période de développement (avant l’achèvement de la maturation cérébrale), et non sous la forme d’un déclin des performances acquis plus tardivement au sens d’une affection démentielle',
      'f71.standardized_assessment':
        'Évaluation de l’efficience intellectuelle et adaptative si possible au moyen de procédures standardisées, normées et adaptées de façon équitable sur le plan culturel ; l’attribution du degré de sévérité ne repose pas sur un seul score de test isolé',
      'f71.exclude_acquired_decline':
        'La baisse du niveau de fonctionnement n’est pas expliquée par un déclin cognitif acquis seulement après la période de développement (démence, traumatisme crânio-cérébral à l’âge adulte)',
      'f71.exclude_sensory_deprivation':
        'Le retard des performances n’est pas suffisamment expliqué à lui seul par un trouble sensoriel non corrigé, un trouble psychique sévère ou une absence de scolarisation / une privation sociale',
      '6a00_1.intellectual_functioning':
        'Limitation significative de l’efficience intellectuelle générale, si possible attestée par des tests standardisés, administrés individuellement et normés, à environ deux écarts-types ou plus en dessous de la moyenne (ou par des indicateurs comportementaux lorsque des normes adaptées ne sont pas disponibles)',
      '6a00_1.developmental_onset':
        'Début pendant la période de développement : les limitations sont présentes depuis l’enfance et ne représentent pas un déclin des performances acquis seulement plus tard',
      '6a00_1.conceptual_domain':
        'Domaine conceptuel : développement nettement ralenti du langage et des compétences scolaires, qui restent le plus souvent à un niveau élémentaire ; un soutien continu est requis pour presque toutes les exigences conceptuelles de la vie quotidienne',
      '6a00_1.social_domain':
        'Domaine social : différences marquées du comportement social et communicatif par rapport aux pairs ; le langage est plus simple et plus concret ; des relations avec des personnes de référence familières sont possibles, mais le jugement social et la prise de décision sont nettement limités',
      '6a00_1.practical_domain':
        'Domaine pratique : les soins personnels sont en grande partie acquérables après un entraînement prolongé ; des activités simples et supervisées sont possibles ; un soutien continu et une structuration de la vie quotidienne sont nécessaires',
      '6a00_1.severity_by_adaptive':
        'L’attribution du degré de sévérité repose sur le profil du comportement adaptatif dans les trois domaines (conceptuel, social, pratique) et non sur un seul score de QI',
      '6a00_1.standardized_or_behavioural':
        'Lorsque cela est possible, le diagnostic est établi au moyen d’instruments standardisés, équitables sur le plan culturel et normés pour les fonctions intellectuelles et adaptatives ; à défaut de normes adaptées, il s’appuie sur des indicateurs comportementaux soigneusement recueillis',
      '6a00_1.exclude_acquired_decline':
        'Les limitations ne s’expliquent pas par un trouble neurocognitif acquis seulement après la période de développement (p. ex. démence, lésion cérébrale acquise)',
      '6a00_1.exclude_sensory_deprivation':
        'Le niveau de fonctionnement ne s’explique pas à lui seul par un trouble sensoriel non corrigé, un autre trouble mental, ou par une privation sociale ou une absence de scolarisation',
    },
  },
  intellectual_disability_severe: {
    name: 'Retard mental sévère',
    differentials: [
      'Retard mental profond (F73)',
      'Maladie neurologique ou métabolique progressive',
      'Polyhandicap sensoriel ou moteur sans retard mental global',
    ],
    groups: {
      'f72.core': 'Noyau : les trois piliers diagnostiques du retard mental',
      'f72.assessment': 'Conditions diagnostiques de l’évaluation',
      'f72.exclusions': 'Exclusions / diagnostic différentiel',
      '6a00_2.functioning': 'Efficience intellectuelle altérée avec début pendant la période de développement',
      '6a00_2.adaptive_domains': 'Limitation du comportement adaptatif dans les trois domaines (profil spécifique au degré de sévérité)',
      '6a00_2.assessment': 'Détermination du degré de sévérité et établissement diagnostique',
      '6a00_2.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f72.intellectual_functioning':
        'Efficience intellectuelle générale très fortement inférieure à la moyenne, environ dans la zone d’un QI de 20 à 34 (correspondant de façon approximative à un âge de développement de 3 à moins de 6 ans)',
      'f72.adaptive_functioning':
        'Déficits marqués et constants dans presque tous les domaines adaptatifs ; acquisition seulement rudimentaire du langage ; une prise en charge continue et une aide aux soins personnels sont requises',
      'f72.functional_profile':
        'Atteintes motrices fréquemment associées et affections neurologiques concomitantes ; soutien continu dans l’ensemble de la vie quotidienne',
      'f72.developmental_onset':
        'Début des altérations pendant la période de développement (avant l’achèvement de la maturation cérébrale), et non sous la forme d’un déclin des performances acquis plus tardivement au sens d’une affection démentielle',
      'f72.standardized_assessment':
        'Évaluation de l’efficience intellectuelle et adaptative si possible au moyen de procédures standardisées, normées et adaptées de façon équitable sur le plan culturel ; l’attribution du degré de sévérité ne repose pas sur un seul score de test isolé',
      'f72.exclude_acquired_decline':
        'La baisse du niveau de fonctionnement n’est pas expliquée par un déclin cognitif acquis seulement après la période de développement (démence, traumatisme crânio-cérébral à l’âge adulte)',
      'f72.exclude_sensory_deprivation':
        'Le retard des performances n’est pas suffisamment expliqué à lui seul par un trouble sensoriel non corrigé, un trouble psychique sévère ou une absence de scolarisation / une privation sociale',
      '6a00_2.intellectual_functioning':
        'Limitation significative de l’efficience intellectuelle générale, si possible attestée par des tests standardisés, administrés individuellement et normés, à environ deux écarts-types ou plus en dessous de la moyenne (ou par des indicateurs comportementaux lorsque des normes adaptées ne sont pas disponibles)',
      '6a00_2.developmental_onset':
        'Début pendant la période de développement : les limitations sont présentes depuis l’enfance et ne représentent pas un déclin des performances acquis seulement plus tard',
      '6a00_2.conceptual_domain':
        'Domaine conceptuel : compréhension très limitée du langage écrit ainsi que des concepts de nombre, de temps et d’argent ; acquisition seulement rudimentaire du langage, avec des mots isolés ou de brèves énoncés',
      '6a00_2.social_domain':
        'Domaine social : le langage parlé est fortement limité (mots isolés ou phrases simples) et la communication est centrée sur l’ici et maintenant immédiat ; les relations sociales passent surtout par des personnes de référence familières',
      '6a00_2.practical_domain':
        'Domaine pratique : un soutien est nécessaire pour presque toutes les activités de la vie quotidienne, y compris manger, s’habiller et l’hygiène personnelle ; une surveillance et une prise en charge continues sont requises',
      '6a00_2.severity_by_adaptive':
        'L’attribution du degré de sévérité repose sur le profil du comportement adaptatif dans les trois domaines (conceptuel, social, pratique) et non sur un seul score de QI',
      '6a00_2.standardized_or_behavioural':
        'Lorsque cela est possible, le diagnostic est établi au moyen d’instruments standardisés, équitables sur le plan culturel et normés pour les fonctions intellectuelles et adaptatives ; à défaut de normes adaptées, il s’appuie sur des indicateurs comportementaux soigneusement recueillis',
      '6a00_2.exclude_acquired_decline':
        'Les limitations ne s’expliquent pas par un trouble neurocognitif acquis seulement après la période de développement (p. ex. démence, lésion cérébrale acquise)',
      '6a00_2.exclude_sensory_deprivation':
        'Le niveau de fonctionnement ne s’explique pas à lui seul par un trouble sensoriel non corrigé, un autre trouble mental, ou par une privation sociale ou une absence de scolarisation',
    },
  },
  intellectual_disability_profound: {
    name: 'Retard mental profond',
    differentials: [
      'Retard mental sévère (F72)',
      'Affection neurologique sous-jacente grave avec état végétatif / réactivité minimale',
      'Polyhandicap sensoriel masquant le niveau de fonctionnement',
    ],
    groups: {
      'f73.core': 'Noyau : les trois piliers diagnostiques du retard mental',
      'f73.assessment': 'Conditions diagnostiques de l’évaluation',
      'f73.exclusions': 'Exclusions / diagnostic différentiel',
      '6a00_3.functioning': 'Efficience intellectuelle altérée avec début pendant la période de développement',
      '6a00_3.adaptive_domains': 'Limitation du comportement adaptatif dans les trois domaines (profil spécifique au degré de sévérité)',
      '6a00_3.assessment': 'Détermination du degré de sévérité et établissement diagnostique',
      '6a00_3.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f73.intellectual_functioning':
        'Efficience intellectuelle générale extrêmement inférieure à la moyenne, environ dans la zone d’un QI inférieur à 20 (correspondant de façon approximative à un âge de développement inférieur à 3 ans)',
      'f73.adaptive_functioning':
        'Limitation extrême de la compréhension et de l’usage du langage, de la mobilité, de la continence et des soins personnels ; des soins et une prise en charge complets et continus sont requis',
      'f73.functional_profile':
        'Capacité très limitée à comprendre des consignes simples ; atteintes physiques et neurologiques associées souvent graves ainsi qu’une mobilité réduite',
      'f73.developmental_onset':
        'Début des altérations pendant la période de développement (avant l’achèvement de la maturation cérébrale), et non sous la forme d’un déclin des performances acquis plus tardivement au sens d’une affection démentielle',
      'f73.standardized_assessment':
        'Évaluation de l’efficience intellectuelle et adaptative si possible au moyen de procédures standardisées, normées et adaptées de façon équitable sur le plan culturel ; l’attribution du degré de sévérité ne repose pas sur un seul score de test isolé',
      'f73.exclude_acquired_decline':
        'La baisse du niveau de fonctionnement n’est pas expliquée par un déclin cognitif acquis seulement après la période de développement (démence, traumatisme crânio-cérébral à l’âge adulte)',
      'f73.exclude_sensory_deprivation':
        'Le retard des performances n’est pas suffisamment expliqué à lui seul par un trouble sensoriel non corrigé, un trouble psychique sévère ou une absence de scolarisation / une privation sociale',
      '6a00_3.intellectual_functioning':
        'Limitation significative de l’efficience intellectuelle générale, si possible attestée par des tests standardisés, administrés individuellement et normés, à environ deux écarts-types ou plus en dessous de la moyenne (ou par des indicateurs comportementaux lorsque des normes adaptées ne sont pas disponibles)',
      '6a00_3.developmental_onset':
        'Début pendant la période de développement : les limitations sont présentes depuis l’enfance et ne représentent pas un déclin des performances acquis seulement plus tard',
      '6a00_3.conceptual_domain':
        'Domaine conceptuel : les concepts symboliques et linguistiques restent largement inaccessibles ; la compréhension se limite à des aspects simples et concrets de l’environnement immédiat',
      '6a00_3.social_domain':
        'Domaine social : compréhension très limitée de la communication verbale ou gestuelle ; les besoins sont exprimés principalement de façon non verbale ; des atteintes sensorielles et motrices associées restreignent encore l’interaction sociale',
      '6a00_3.practical_domain':
        'Domaine pratique : dépendance complète vis-à-vis d’autrui dans tous les domaines des soins physiques, de la santé et de la sécurité ; souvent accompagnée d’atteintes motrices et sensorielles sévères',
      '6a00_3.severity_by_adaptive':
        'L’attribution du degré de sévérité repose sur le profil du comportement adaptatif dans les trois domaines (conceptuel, social, pratique) et non sur un seul score de QI',
      '6a00_3.standardized_or_behavioural':
        'Lorsque cela est possible, le diagnostic est établi au moyen d’instruments standardisés, équitables sur le plan culturel et normés pour les fonctions intellectuelles et adaptatives ; à défaut de normes adaptées, il s’appuie sur des indicateurs comportementaux soigneusement recueillis',
      '6a00_3.exclude_acquired_decline':
        'Les limitations ne s’expliquent pas par un trouble neurocognitif acquis seulement après la période de développement (p. ex. démence, lésion cérébrale acquise)',
      '6a00_3.exclude_sensory_deprivation':
        'Le niveau de fonctionnement ne s’explique pas à lui seul par un trouble sensoriel non corrigé, un autre trouble mental, ou par une privation sociale ou une absence de scolarisation',
    },
  },
}
