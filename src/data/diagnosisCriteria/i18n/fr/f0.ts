import type { DisorderTranslationMap } from '../types'

/** FR translations — ICD-10 F0 block. */
export const frF0: DisorderTranslationMap = {
  dementia_alzheimer: {
    name: 'Démence de la maladie d’Alzheimer',
    differentials: [
      'Démence vasculaire (évolution par paliers, signes neurologiques focaux)',
      'Pseudodémence dépressive',
      'Délirium (début aigu, niveau de conscience fluctuant)',
      'Démence frontotemporale ou démence à corps de Lewy',
      'Changement cognitif normal lié à l’âge',
    ],
    groups: {
      'f00.cognition': 'Symptômes cognitifs centraux',
      'f00.course': 'Évolution et retentissement',
      'f00.exclusions': 'Exclusions',
    },
    criteria: {
      'f00.memory_impairment':
        'Déclin de la mémoire, le plus net lors de l’apprentissage d’informations nouvelles, d’une ampleur dépassant l’oubli normal',
      'f00.cognitive_decline':
        'Diminution d’autres fonctions cognitives supérieures (p. ex. jugement, raisonnement, planification, langage) par rapport au niveau de performance antérieur',
      'f00.duration_six_months':
        'Les symptômes sont présents depuis au moins environ six mois',
      'f00.insidious_onset':
        'Début insidieux avec aggravation lente et continue, sans poussées de détérioration abruptes',
      'f00.functional_impact':
        'Retentissement sur la gestion des activités de la vie quotidienne du fait du déclin cognitif',
      'f00.exclude_clouding':
        'Absence d’obnubilation de la conscience évoquant un délirium (la conscience est claire)',
      'f00.exclude_other_cause':
        'Absence d’indice en faveur d’une autre maladie systémique ou cérébrale, ou de lésions cérébrovasculaires, qui expliquerait mieux le tableau',
    },
  },
  vascular_dementia: {
    name: 'Démence vasculaire',
    differentials: [
      'Démence de la maladie d’Alzheimer (insidieuse, continue)',
      'Démence mixte (vasculaire et de type Alzheimer)',
      'Délirium',
      'Dépression avec déficits cognitifs',
    ],
    groups: {
      'f01.cognition': 'Syndrome de déclin cognitif',
      'f01.vascular': 'Indices d’une origine cérébrovasculaire',
      'f01.course': 'Durée',
      'f01.exclusions': 'Exclusions',
    },
    criteria: {
      'f01.memory_impairment':
        'Déclin de la mémoire et d’autres fonctions cognitives, retentissant sur la gestion de la vie quotidienne',
      'f01.uneven_deficits':
        'Profil de déficits inégal (« en taches »), où certaines fonctions cognitives sont atteintes tandis que d’autres sont relativement préservées',
      'f01.stepwise_course':
        'Détérioration par paliers (en marches d’escalier), souvent en lien temporel avec des événements cérébrovasculaires',
      'f01.focal_signs':
        'Signes neurologiques focaux ou éléments anamnestiques/d’imagerie en faveur d’une maladie cérébrovasculaire présumée causale',
      'f01.duration_six_months':
        'La symptomatologie est présente depuis au moins environ six mois',
      'f01.exclude_clouding':
        'Absence d’obnubilation de la conscience au sens d’un délirium',
    },
  },
  frontotemporal_dementia: {
    name: 'Démence frontotemporale',
    differentials: [
      'Démence de la maladie d’Alzheimer (trouble mnésique précoce au premier plan)',
      'Trouble psychiatrique primaire (p. ex. manie ou dépression tardive)',
      'Trouble organique de la personnalité sans déclin cognitif progressif',
    ],
    groups: {
      'f02_0.behavior': 'Symptômes comportementaux/langagiers précoces au premier plan',
      'f02_0.course': 'Évolution',
      'f02_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f02_0.personality_change':
        'Modification précoce et marquée de la personnalité et du comportement social, avec désinhibition, perte des convenances sociales, apathie ou réduction de l’élan',
      'f02_0.language_decline':
        'Déclin précoce des capacités d’expression verbale (manque du mot ou appauvrissement du langage), avec une mémoire d’abord relativement préservée',
      'f02_0.insidious_onset':
        'Début insidieux et évolution lentement progressive depuis au moins environ six mois',
      'f02_0.relative_memory_sparing':
        'La mémoire et l’orientation spatiale sont relativement mieux préservées au stade précoce que les troubles du comportement ou du langage',
      'f02_0.exclude_other_cause':
        'Le tableau n’est pas mieux expliqué par une autre maladie cérébrale, un délirium ou un trouble affectif primaire',
    },
  },
  dementia_lewy_bodies: {
    name: 'Démence à corps de Lewy',
    differentials: [
      'Démence de la maladie d’Alzheimer',
      'Démence de la maladie de Parkinson',
      'Délirium (aigu, fluctuant) — peut ressembler à la démence à corps de Lewy',
      'Hallucinations induites par une substance/un médicament',
    ],
    groups: {
      'f02_8.core': 'Démence avec caractéristiques centrales évocatrices',
      'f02_8.features': 'Caractéristiques évocatrices (au moins 2)',
      'f02_8.exclusions': 'Exclusions',
    },
    criteria: {
      'f02_8.progressive_decline':
        'Déclin cognitif progressif retentissant sur la gestion de la vie quotidienne',
      'f02_8.fluctuating_cognition':
        'Fluctuations marquées des performances cognitives, en particulier de l’attention et de la vigilance',
      'f02_8.visual_hallucinations':
        'Hallucinations visuelles récurrentes, le plus souvent détaillées et concrètes',
      'f02_8.parkinsonism':
        'Symptômes parkinsoniens spontanés (p. ex. rigidité, bradykinésie, tremblement de repos)',
      'f02_8.rem_sleep_neuroleptic':
        'Éléments en faveur tels qu’un trouble comportemental du sommeil paradoxal ou une hypersensibilité marquée aux neuroleptiques',
      'f02_8.exclude_delirium_substance':
        'Les symptômes ne sont pas mieux expliqués par un délirium ou par l’effet de substances/médicaments',
    },
  },
  delirium_not_substance_induced: {
    name: 'Délirium non induit par des substances',
    differentials: [
      'Démence (début insidieux, conscience claire)',
      'Délirium induit par une substance (intoxication/sevrage, F1x.4)',
      'Trouble psychotique aigu',
      'État de mal épileptique non convulsif',
    ],
    groups: {
      'f05.consciousness': 'Trouble de la conscience et de l’attention',
      'f05.global': 'Trouble cognitif global (au moins 1)',
      'f05.course': 'Évolution aiguë et fluctuante',
      'f05.exclusions': 'Exclusions',
    },
    criteria: {
      'f05.clouded_consciousness':
        'Trouble de la conscience et de la vigilance avec réduction de la clarté de la perception de l’environnement',
      'f05.attention_disturbance':
        'Capacité réduite à orienter, soutenir et déplacer l’attention',
      'f05.disorientation':
        'Trouble de la mémoire et de l’orientation (dans le temps, dans l’espace ou quant à la personne)',
      'f05.perceptual_disturbance':
        'Troubles de la perception tels que méprises, illusions ou hallucinations (le plus souvent visuelles)',
      'f05.psychomotor_disturbance':
        'Trouble psychomoteur avec passage rapide entre hyperactivité et hypoactivité',
      'f05.sleep_wake_disturbance':
        'Trouble du rythme veille-sommeil (p. ex. insomnie, aggravation nocturne, inversion du rythme)',
      'f05.acute_fluctuating':
        'Début rapide (de quelques heures à quelques jours) et intensité fluctuant au cours de la journée',
      'f05.exclude_substance':
        'Le délirium n’est pas dû à l’alcool ni à d’autres substances psychotropes (sinon F1x.4), mais imputable à une affection somatique ou à une cause cérébrale',
    },
  },
  organic_amnestic_syndrome: {
    name: 'Syndrome amnésique organique',
    differentials: [
      'Démence (déclin cognitif plus étendu en complément)',
      'Délirium (trouble de la conscience et de l’attention)',
      'Syndrome amnésique lié à l’alcool / syndrome de Korsakoff (F10.6)',
      'Amnésie dissociative',
    ],
    groups: {
      'f04.memory': 'Trouble de la mémoire au premier plan',
      'f04.aetiology': 'Origine organique',
      'f04.exclusions': 'Exclusions',
    },
    criteria: {
      'f04.anterograde_retrograde':
        'Trouble marqué de la mémoire à court terme ou de la mémoire récente (amnésie antérograde) et souvent aussi du rappel d’informations anciennes (amnésie rétrograde)',
      'f04.immediate_recall_preserved':
        'La restitution immédiate (p. ex. répétition de chiffres) ainsi que la conscience sont préservées',
      'f04.organic_cause':
        'Mise en évidence ou présomption fondée d’une maladie ou d’un dysfonctionnement lésant le cerveau (non dû à l’alcool/aux substances) comme cause',
      'f04.exclude_global_decline':
        'Absence de déclin global des capacités intellectuelles tel qu’il serait typique d’une démence, et absence de trouble de l’attention au sens d’un délirium',
      'f04.exclude_substance':
        'Le trouble n’est pas causé par l’alcool ni par d’autres substances psychotropes',
    },
  },
  mild_cognitive_disorder: {
    name: 'Trouble cognitif léger',
    differentials: [
      'Démence (retentissement sur la gestion autonome de la vie quotidienne)',
      'Délirium',
      'Dépression avec troubles subjectifs de la concentration',
      'Changement cognitif normal lié à l’âge',
    ],
    groups: {
      'f06_7.cognition': 'Baisse cognitive légère des performances',
      'f06_7.exclusions': 'Exclusions',
    },
    criteria: {
      'f06_7.cognitive_decline':
        'Diminution des performances cognitives (p. ex. mémoire, concentration, apprentissage) par rapport au niveau antérieur, ressentie subjectivement et objectivable',
      'f06_7.organic_context':
        'Les difficultés cognitives surviennent en lien avec une affection somatique ou cérébrale',
      'f06_7.exclude_dementia':
        'L’ampleur ne justifie pas le diagnostic de démence, de délirium ou de syndrome amnésique ; la gestion autonome de la vie quotidienne est pour l’essentiel préservée',
    },
  },
  organic_personality_disorder: {
    name: 'Trouble organique de la personnalité',
    differentials: [
      'Démence frontotemporale (déclin cognitif progressif)',
      'Trouble primaire de la personnalité (durable, sans cause organique)',
      'Trouble affectif ou manie',
      'Modification de la personnalité liée à une substance',
    ],
    groups: {
      'f07_0.change': 'Modification durable de la personnalité',
      'f07_0.features': 'Modifications caractéristiques (au moins 2)',
      'f07_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f07_0.personality_change':
        'Modification durable du schéma antérieur de personnalité et de comportement à la suite d’une maladie ou d’une lésion cérébrale',
      'f07_0.organic_cause':
        'Mise en évidence ou présomption fondée d’une maladie, d’une lésion ou d’un dysfonctionnement cérébral causal',
      'f07_0.affective_change':
        'Vie affective modifiée avec labilité émotionnelle, euphorie ou apathie',
      'f07_0.disinhibition':
        'Contrôle des impulsions diminué avec désinhibition, irritabilité ou accès d’agressivité',
      'f07_0.goal_directed':
        'Altération des activités orientées vers un but, avec endurance réduite et trouble de l’élan',
      'f07_0.social_conduct':
        'Comportement social modifié avec négligence des normes sociales (p. ex. manque de tact, absence de distance sexuelle)',
      'f07_0.exclude_dementia_delirium':
        'La modification n’est pas mieux expliquée par une démence, un délirium ou un autre trouble psychique ; une atteinte cognitive notable n’est pas au premier plan',
    },
  },
  organic_hallucinosis: {
    name: 'Hallucinose organique',
    differentials: [
      'Schizophrénie ou trouble délirant',
      'Hallucinose induite par une substance / hallucinose de sevrage',
      'Délirium (obnubilation de la conscience)',
      'Privation sensorielle (p. ex. syndrome de Charles Bonnet)',
    ],
    groups: {
      'f06_0.core': 'Hallucinations persistantes avec conscience claire',
      'f06_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f06_0.persistent_hallucinations':
        'Hallucinations persistantes ou récurrentes (le plus souvent visuelles ou auditives) qui dominent le tableau',
      'f06_0.clear_consciousness':
        'Les hallucinations surviennent avec une conscience claire et une orientation préservée',
      'f06_0.organic_cause':
        'Mise en évidence ou présomption fondée d’une affection somatique ou cérébrale causale',
      'f06_0.exclude_primary_psychosis':
        'Absence de tableau schizophrénique ou affectif prédominant et absence d’obnubilation de la conscience au sens d’un délirium ; non dû à des substances',
    },
  },
  organic_delusional_disorder: {
    name: 'Trouble délirant (schizophréniforme) organique',
    differentials: [
      'Schizophrénie / trouble délirant persistant',
      'Trouble psychotique induit par une substance',
      'Délirium',
      'Trouble affectif avec symptômes psychotiques',
    ],
    groups: {
      'f06_2.core': 'Délire avec conscience claire',
      'f06_2.exclusions': 'Exclusions',
    },
    criteria: {
      'f06_2.persistent_delusions':
        'Idées délirantes persistantes au premier plan (p. ex. délire de persécution, de préjudice ou de grandeur)',
      'f06_2.clear_consciousness':
        'Le délire survient avec une conscience claire et sans déclin cognitif marqué',
      'f06_2.organic_cause':
        'Mise en évidence ou présomption fondée d’une affection somatique ou cérébrale causale',
      'f06_2.exclude_primary_substance':
        'Non mieux expliqué par une schizophrénie/un trouble affectif primaire, un délirium ou l’effet d’une substance',
    },
  },
  organic_mood_disorder: {
    name: 'Trouble affectif organique',
    differentials: [
      'Trouble dépressif ou bipolaire primaire',
      'Trouble affectif induit par une substance/un médicament',
      'Trouble de l’adaptation',
      'Démence avec symptômes affectifs',
    ],
    groups: {
      'f06_3.core': 'Trouble de l’affect d’origine organique',
      'f06_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f06_3.mood_change':
        'Modification de l’humeur ou de l’affect sous forme d’une symptomatologie dépressive, maniaque ou mixte',
      'f06_3.organic_cause':
        'Mise en évidence ou présomption fondée d’une affection somatique ou cérébrale causale (p. ex. trouble endocrinien, lésion cérébrale)',
      'f06_3.exclude_primary_substance':
        'Non mieux expliqué par un trouble affectif primaire ou par l’effet d’une substance',
    },
  },
}
