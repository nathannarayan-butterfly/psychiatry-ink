import type { DisorderTranslationMap } from '../types'

/** FR translations — ICD-10 F8 block. */
export const frF8: DisorderTranslationMap = {
  developmental_speech_language_disorder: {
    name: 'Trouble spécifique du développement de la parole et du langage',
    differentials: [
      'Trouble de l’audition comme cause des anomalies du langage',
      'Retard mental avec retard global de développement',
      'Trouble du spectre de l’autisme',
      'Mutisme sélectif (capacité de parler conservée, mais mutité selon la situation)',
      'Plurilinguisme / facteurs environnementaux',
    ],
    groups: {
      'f80.core':
        'Noyau : retard circonscrit du développement du langage et de la parole',
      'f80.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f80.delayed_acquisition':
        'L’acquisition des capacités langagières (articulation, langage expressif et/ou réceptif) est, dès les premières phases du développement, nettement inférieure au niveau attendu pour l’âge',
      'f80.early_onset':
        'L’anomalie est présente depuis les premières années du développement et n’est pas la conséquence d’une perte du langage acquise plus tardivement',
      'f80.functional_impact':
        'Le retard de langage altère les performances scolaires, la communication quotidienne ou la participation sociale',
      'f80.exclude_hearing_neuro':
        'Le retard de langage n’est pas suffisamment expliqué par un trouble de l’audition, une affection neurologique ou une anomalie de l’appareil phonatoire',
      'f80.exclude_global_delay':
        'Les capacités langagières se situent nettement en deçà du niveau général de développement non verbal (absence de retard global au sens d’un retard mental)',
    },
  },
  developmental_learning_disorder: {
    name: 'Trouble spécifique du développement des acquisitions scolaires',
    differentials: [
      'Retard mental (retard global des performances)',
      'Scolarisation insuffisante ou interrompue',
      'Trouble sensoriel (baisse de la vision ou de l’audition)',
      'Trouble de l’attention (TDAH) comme cause des difficultés d’apprentissage',
      'Trouble du développement du langage',
    ],
    groups: {
      'f81.core':
        'Noyau : altération circonscrite des acquisitions scolaires',
      'f81.qualifiers': 'Conditions diagnostiques',
      'f81.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f81.reading_spelling':
        'Compétences en lecture et/ou en orthographe nettement altérées, non explicables uniquement par l’âge, l’intelligence ou une scolarisation inadéquate (trouble de la lecture et de l’orthographe)',
      'f81.arithmetic':
        'Compétences en calcul nettement altérées (opérations de base, sens du nombre), non explicables uniquement par l’âge, l’intelligence ou une scolarisation inadéquate (trouble du calcul / dyscalculie)',
      'f81.early_onset':
        'L’altération des apprentissages apparaît dès le début de l’enseignement scolaire formel et n’est pas acquise seulement de façon secondaire',
      'f81.functional_impact':
        'Le retard des performances altère le rendement scolaire ou les exigences de la vie quotidienne qui requièrent ces compétences',
      'f81.exclude_intellectual_sensory':
        'Le retard n’est pas suffisamment expliqué par un retard mental, un trouble sensoriel non corrigé ou une absence de scolarisation',
    },
  },
  developmental_motor_coordination_disorder: {
    name: 'Trouble spécifique du développement des fonctions motrices',
    differentials: [
      'Affection neurologique (p. ex. paralysie cérébrale, myopathie)',
      'Retard mental avec retard global de développement',
      'Trouble de la vision',
      'Trouble du spectre de l’autisme',
    ],
    groups: {
      'f82.core': 'Noyau : altération de la coordination motrice',
      'f82.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f82.coordination_deficit':
        'La coordination motrice (motricité fine et/ou globale) se situe nettement en deçà du niveau attendu pour l’âge et l’intelligence (p. ex. maladresse de manipulation, acquisition retardée des étapes motrices)',
      'f82.early_onset':
        'La faiblesse de la coordination est présente depuis le développement précoce et n’est pas acquise seulement plus tardivement',
      'f82.functional_impact':
        'La maladresse motrice altère nettement les performances scolaires, les activités de la vie quotidienne ou le jeu',
      'f82.exclude_neuro_intellectual':
        'Le trouble de la coordination n’est pas suffisamment expliqué par une affection neurologique circonscrite ou par un retard mental',
    },
  },
  autism_spectrum_disorder: {
    name: 'Trouble du spectre de l’autisme',
    differentials: [
      'Retard mental sans traits autistiques centraux',
      'Trouble spécifique du développement du langage',
      'Trouble de la communication sociale (pragmatique)',
      'Trouble réactionnel de l’attachement / privation',
      'Schizophrénie à début précoce',
      'TDAH (difficultés d’attention / de contrôle de l’impulsivité sans noyau autistique)',
    ],
    groups: {
      'f84.social_communication':
        'Déficits persistants de la communication et de l’interaction sociales',
      'f84.restricted_repetitive':
        'Modes de comportement, d’intérêts et d’activités restreints et répétitifs (au moins 2)',
      'f84.developmental_context': 'Début et retentissement',
      'f84.exclusions': 'Exclusions / diagnostic différentiel',
    },
    criteria: {
      'f84.social_reciprocity':
        'Altération durable de la réciprocité socio-émotionnelle (p. ex. prise de contact limitée, attention conjointe ou réponse aux approches sociales restreintes)',
      'f84.nonverbal_communication':
        'Altération de la communication non verbale (p. ex. contact visuel, mimique, gestuelle) et de l’usage social du langage',
      'f84.relationships':
        'Difficultés à établir et à maintenir des relations adaptées à l’âge, ou à adapter le comportement aux contextes sociaux',
      'f84.stereotyped_behavior':
        'Mouvements moteurs, modes de langage (p. ex. écholalie) ou usage des objets stéréotypés ou répétitifs',
      'f84.insistence_sameness':
        'Attachement excessif à l’uniformité, aux routines ou aux rituels ; net inconfort lors des changements',
      'f84.restricted_interests':
        'Intérêts spécialisés très restreints, d’une intensité inhabituelle ou fixés',
      'f84.sensory':
        'Hyper- ou hyporéactivité aux stimuli sensoriels ou intérêt inhabituel pour les aspects sensoriels de l’environnement',
      'f84.early_onset':
        'Les traits sont présents depuis la petite enfance (ils peuvent ne devenir pleinement reconnaissables que plus tard lorsque les exigences sociales sont moindres)',
      'f84.functional_impact':
        'Les traits entraînent un retentissement cliniquement significatif dans des domaines sociaux, scolaires ou d’autres domaines importants du fonctionnement',
      'f84.exclude_better_explained':
        'Les anomalies ne sont pas mieux expliquées par un retard mental isolé ou par un autre trouble psychique',
    },
  },
}
