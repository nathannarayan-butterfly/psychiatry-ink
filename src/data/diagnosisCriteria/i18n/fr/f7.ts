import type { DisorderTranslationMap } from '../types'

/** FR translations — ICD-10 F7 block. */
export const frF7: DisorderTranslationMap = {
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
    },
  },
}
