import type { DisorderTranslationMap } from '../types'
import { withIcd11SubstanceTranslations } from '../icd11SubstanceI18n'

/** FR translations — ICD-10 F1 block (base; ICD-11 fragments merged below). */
const frSubstanceUseBase: DisorderTranslationMap = {
  alcohol_dependence: {
    name: 'Dépendance à l’alcool',
    differentials: [
      'Usage nocif / consommation à risque (F10.1) sans dépendance',
      'Intoxication aiguë (F10.0)',
      'Trouble affectif ou anxieux induit par une substance',
    ],
    groups: {
      'f10_2.dependence': 'Caractéristiques de dépendance (au moins 3 en 12 mois)',
    },
    criteria: {
      'f10_2.craving':
        'Désir puissant ou sorte de compulsion à consommer de l’alcool (craving)',
      'f10_2.impaired_control':
        'Contrôle réduit sur le début, l’arrêt et la quantité de la consommation',
      'f10_2.withdrawal':
        'Syndrome de sevrage physique lors de la réduction ou de l’arrêt de la consommation, ou consommation visant à soulager voire à éviter les symptômes de sevrage',
      'f10_2.tolerance':
        'Développement d’une tolérance nécessitant une augmentation des doses pour obtenir l’effet initial',
      'f10_2.neglect':
        'Négligence croissante d’autres intérêts et activités au profit de la consommation, ainsi qu’un temps accru consacré à se procurer la substance, à la consommer et à récupérer',
      'f10_2.persistence_harm':
        'Poursuite de la consommation malgré la preuve de conséquences physiques, psychiques ou sociales manifestement nocives',
    },
  },
  alcohol_acute_intoxication: {
    name: 'Intoxication aiguë par l’alcool',
    differentials: [
      'Syndrome de sevrage (F10.3)',
      'Delirium ou autre cause organique',
      'Trouble psychotique aigu',
      'Intoxication par une autre substance ou intoxication mixte',
    ],
    groups: {
      'f10_0.use': 'Mise en évidence de la consommation',
      'f10_0.signs': 'Signes d’intoxication typiques de la substance (au moins 1)',
      'f10_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f10_0.recent_use':
        'Consommation récente d’alcool à une dose suffisamment élevée',
      'f10_0.causal_link':
        'Les symptômes sont en lien temporel et causal direct avec l’effet aigu de la substance et sont transitoires',
      'f10_0.disinhibition':
        'Désinhibition, labilité de l’humeur ou agressivité querelleuse',
      'f10_0.ataxia':
        'Instabilité de la marche et de la station debout (ataxie), trouble de la coordination',
      'f10_0.slurred_speech': 'Discours bredouillant',
      'f10_0.nystagmus': 'Nystagmus ou trouble de l’oculomotricité',
      'f10_0.attention': 'Trouble de l’attention et de la concentration',
      'f10_0.reduced_consciousness':
        'Diminution de la conscience pouvant aller jusqu’à la stupeur (à forte dose)',
      'f10_0.exclude_other_cause':
        'Les symptômes ne sont pas mieux expliqués par une affection somatique, un delirium ou un autre trouble psychique',
    },
  },
  alcohol_withdrawal: {
    name: 'Syndrome de sevrage de l’alcool',
    differentials: [
      'Intoxication aiguë (F10.0)',
      'Syndrome de sevrage avec delirium (F10.4)',
      'Trouble anxieux ou affectif',
      'Affection somatique avec symptomatologie végétative',
    ],
    groups: {
      'f10_3.context': 'Contexte de sevrage',
      'f10_3.symptoms': 'Symptômes de sevrage (au moins 1)',
      'f10_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f10_3.cessation':
        'Arrêt ou réduction de l’alcool après une consommation répétée, le plus souvent prolongée et/ou à forte dose',
      'f10_3.withdrawal_syndrome':
        'Il existe un syndrome de sevrage typique de la substance',
      'f10_3.tremor': 'Tremblement, surtout des mains',
      'f10_3.sweating_autonomic':
        'Sueurs, tachycardie et autres signes d’hyperactivité végétative',
      'f10_3.anxiety_agitation':
        'Anxiété, agitation intérieure ou agitation psychomotrice',
      'f10_3.nausea': 'Nausées ou vomissements',
      'f10_3.insomnia':
        'Difficultés d’endormissement et de maintien du sommeil',
      'f10_3.transient_hallucinations':
        'Perceptions trompeuses transitoires visuelles, tactiles ou auditives',
      'f10_3.exclude_other_cause':
        'Les symptômes ne sont pas mieux expliqués par un autre trouble somatique ou psychique',
    },
  },
  alcohol_withdrawal_delirium: {
    name: 'Syndrome de sevrage avec delirium de l’alcool',
    differentials: [
      'Syndrome de sevrage sans delirium (F10.3)',
      'Delirium d’autre cause (somatique) (F05)',
      'Trouble psychotique induit par une substance',
      'Encéphalopathie de Wernicke (en cas d’alcool)',
    ],
    groups: {
      'f10_4.context': 'Sevrage avec trouble de la conscience',
      'f10_4.features': 'Symptômes déliriants associés (au moins 1)',
      'f10_4.exclusions': 'Exclusions',
    },
    criteria: {
      'f10_4.withdrawal_context':
        'Arrêt ou réduction de l’alcool sur fond de syndrome de dépendance préexistant',
      'f10_4.clouding':
        'Obnubilation de la conscience avec altération de la vigilance et de l’attention (état délirant)',
      'f10_4.disorientation':
        'Désorientation et trouble global des fonctions cognitives',
      'f10_4.hallucinations':
        'Hallucinations ou illusions vives (souvent visuelles ou scéniques)',
      'f10_4.psychomotor': 'Agitation psychomotrice marquée',
      'f10_4.autonomic':
        'Hyperactivité végétative marquée (p. ex. tachycardie, sueurs, hypertension, tremblement ample) ; crises convulsives possibles',
      'f10_4.exclude_other_cause':
        'Le delirium n’est pas mieux expliqué par une affection somatique indépendante',
    },
  },
  alcohol_psychotic_disorder: {
    name: 'Trouble psychotique induit par l’alcool',
    differentials: [
      'Schizophrénie ou trouble délirant persistant',
      'Intoxication aiguë (F10.0) avec phénomènes psychotiques',
      'Syndrome de sevrage avec delirium (F10.4)',
      'Trouble affectif avec symptômes psychotiques',
    ],
    groups: {
      'f10_5.symptoms': 'Symptômes psychotiques (au moins 1)',
      'f10_5.context': 'Lien temporel avec la consommation',
      'f10_5.exclusions': 'Exclusions',
    },
    criteria: {
      'f10_5.hallucinations':
        'Hallucinations (souvent auditives ou visuelles) qui ne sont pas uniquement l’expression d’une simple intoxication',
      'f10_5.delusions':
        'Idées délirantes, souvent de persécution ou de référence',
      'f10_5.temporal_relation':
        'Début des symptômes psychotiques pendant ou peu après (en règle générale dans les deux semaines) la consommation d’alcool',
      'f10_5.partial_remission':
        'Les symptômes régressent typiquement, au moins partiellement, dans un délai limité (de l’ordre de quelques semaines à quelques mois)',
      'f10_5.exclude_primary_psychosis':
        'La symptomatologie n’est pas mieux expliquée par un trouble psychotique primaire et ne survient pas exclusivement dans le cadre d’une intoxication ou d’un delirium de sevrage',
    },
  },
  opioids_acute_intoxication: {
    name: 'Intoxication aiguë par des opioïdes',
    differentials: [
      'Syndrome de sevrage (F11.3)',
      'Delirium ou autre cause organique',
      'Trouble psychotique aigu',
      'Intoxication par une autre substance ou intoxication mixte',
    ],
    groups: {
      'f11_0.use': 'Mise en évidence de la consommation',
      'f11_0.signs': 'Signes d’intoxication typiques de la substance (au moins 1)',
      'f11_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f11_0.recent_use':
        'Consommation récente d’opioïdes à une dose suffisamment élevée',
      'f11_0.causal_link':
        'Les symptômes sont en lien temporel et causal direct avec l’effet aigu de la substance et sont transitoires',
      'f11_0.miosis': 'Rétrécissement pupillaire (myosis)',
      'f11_0.sedation': 'Apathie, sédation ou diminution de la conscience',
      'f11_0.euphoria':
        'Euphorie initiale suivie d’apathie ou de dysphorie',
      'f11_0.respiratory_depression':
        'Ralentissement de la respiration (dépression respiratoire) à forte dose',
      'f11_0.slurred_speech':
        'Discours bredouillant et atteinte de l’attention',
      'f11_0.exclude_other_cause':
        'Les symptômes ne sont pas mieux expliqués par une affection somatique, un delirium ou un autre trouble psychique',
    },
  },
  opioids_harmful_use: {
    name: 'Usage nocif d’opioïdes',
    differentials: [
      'Syndrome de dépendance (F11.2)',
      'Intoxication aiguë (F11.0)',
      'Usage à faible risque sans dommage identifiable',
    ],
    groups: {
      'f11_1.harm': 'Consommation avec dommage pour la santé',
      'f11_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f11_1.actual_use':
        'La consommation effective d’opioïdes est documentée',
      'f11_1.health_damage':
        'Atteinte démontrable de la santé physique ou psychique résultant de la consommation',
      'f11_1.exclude_dependence':
        'Les critères d’un syndrome de dépendance (F11.2) ne sont pas remplis',
    },
  },
  opioids_dependence: {
    name: 'Syndrome de dépendance aux opioïdes',
    differentials: [
      'Usage nocif d’opioïdes (F11.1) sans dépendance',
      'Intoxication aiguë (F11.0)',
      'Trouble affectif ou psychotique induit par une substance',
    ],
    groups: {
      'f11_2.dependence': 'Caractéristiques de dépendance (au moins 3 en 12 mois)',
    },
    criteria: {
      'f11_2.craving':
        'Désir puissant ou sorte de compulsion à consommer des opioïdes (craving)',
      'f11_2.impaired_control':
        'Contrôle réduit sur le début, l’arrêt et la quantité de la consommation',
      'f11_2.withdrawal':
        'Syndrome de sevrage physique lors de la réduction ou de l’arrêt de la consommation, ou consommation visant à soulager les symptômes de sevrage',
      'f11_2.tolerance':
        'Développement d’une tolérance nécessitant une augmentation des doses pour obtenir l’effet initial',
      'f11_2.neglect':
        'Négligence croissante d’autres intérêts et temps accru consacré à se procurer la substance, à la consommer et à récupérer',
      'f11_2.persistence_harm':
        'Poursuite de la consommation malgré des conséquences physiques, psychiques ou sociales manifestement nocives avérées',
    },
  },
  opioids_withdrawal: {
    name: 'Syndrome de sevrage des opioïdes',
    differentials: [
      'Intoxication aiguë (F11.0)',
      'Syndrome de sevrage avec delirium (F11.4)',
      'Trouble anxieux ou affectif',
      'Affection somatique avec symptomatologie végétative',
    ],
    groups: {
      'f11_3.context': 'Contexte de sevrage',
      'f11_3.symptoms': 'Symptômes de sevrage (au moins 1)',
      'f11_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f11_3.cessation':
        'Arrêt ou réduction des opioïdes après une consommation répétée, le plus souvent prolongée et/ou à forte dose',
      'f11_3.withdrawal_syndrome':
        'Il existe un syndrome de sevrage typique de la substance',
      'f11_3.craving': 'Désir intense de consommer (craving)',
      'f11_3.rhinorrhea_lacrimation': 'Écoulement nasal et larmoiement',
      'f11_3.mydriasis_piloerection':
        'Dilatation pupillaire, chair de poule (piloérection) et accès de sueurs',
      'f11_3.myalgia': 'Douleurs musculaires et des membres',
      'f11_3.gi_symptoms':
        'Nausées, vomissements, crampes abdominales ou diarrhée',
      'f11_3.dysphoria':
        'Humeur dysphorique, bâillements et trouble du sommeil',
      'f11_3.exclude_other_cause':
        'Les symptômes ne sont pas mieux expliqués par un autre trouble somatique ou psychique',
    },
  },
  cannabinoids_acute_intoxication: {
    name: 'Intoxication aiguë par des cannabinoïdes',
    differentials: [
      'Syndrome de sevrage (F12.3)',
      'Delirium ou autre cause organique',
      'Trouble psychotique aigu',
      'Intoxication par une autre substance ou intoxication mixte',
    ],
    groups: {
      'f12_0.use': 'Mise en évidence de la consommation',
      'f12_0.signs': 'Signes d’intoxication typiques de la substance (au moins 1)',
      'f12_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f12_0.recent_use':
        'Consommation récente de cannabinoïdes à une dose suffisamment élevée',
      'f12_0.causal_link':
        'Les symptômes sont en lien temporel et causal direct avec l’effet aigu de la substance et sont transitoires',
      'f12_0.euphoria_anxiety':
        'Euphorie et détente ou, à l’inverse, anxiété et agitation',
      'f12_0.time_perception':
        'Altération de la perception du temps et impression de perception aiguisée',
      'f12_0.impaired_coordination':
        'Altération de la coordination et des capacités de réaction',
      'f12_0.appetite': 'Appétit accru',
      'f12_0.conjunctival_injection':
        'Rougeur conjonctivale, sécheresse buccale et tachycardie',
      'f12_0.suspiciousness': 'Méfiance ou idées paranoïdes',
      'f12_0.exclude_other_cause':
        'Les symptômes ne sont pas mieux expliqués par une affection somatique, un delirium ou un autre trouble psychique',
    },
  },
  cannabinoids_harmful_use: {
    name: 'Usage nocif de cannabinoïdes',
    differentials: [
      'Syndrome de dépendance (F12.2)',
      'Intoxication aiguë (F12.0)',
      'Usage à faible risque sans dommage identifiable',
    ],
    groups: {
      'f12_1.harm': 'Consommation avec dommage pour la santé',
      'f12_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f12_1.actual_use':
        'La consommation effective de cannabinoïdes est documentée',
      'f12_1.health_damage':
        'Atteinte démontrable de la santé physique ou psychique résultant de la consommation',
      'f12_1.exclude_dependence':
        'Les critères d’un syndrome de dépendance (F12.2) ne sont pas remplis',
    },
  },
  cannabinoids_dependence: {
    name: 'Syndrome de dépendance aux cannabinoïdes',
    differentials: [
      'Usage nocif de cannabinoïdes (F12.1) sans dépendance',
      'Intoxication aiguë (F12.0)',
      'Trouble affectif ou psychotique induit par une substance',
    ],
    groups: {
      'f12_2.dependence': 'Caractéristiques de dépendance (au moins 3 en 12 mois)',
    },
    criteria: {
      'f12_2.craving':
        'Désir puissant ou sorte de compulsion à consommer des cannabinoïdes (craving)',
      'f12_2.impaired_control':
        'Contrôle réduit sur le début, l’arrêt et la quantité de la consommation',
      'f12_2.withdrawal':
        'Syndrome de sevrage physique lors de la réduction ou de l’arrêt de la consommation, ou consommation visant à soulager les symptômes de sevrage',
      'f12_2.tolerance':
        'Développement d’une tolérance nécessitant une augmentation des doses pour obtenir l’effet initial',
      'f12_2.neglect':
        'Négligence croissante d’autres intérêts et temps accru consacré à se procurer la substance, à la consommer et à récupérer',
      'f12_2.persistence_harm':
        'Poursuite de la consommation malgré des conséquences physiques, psychiques ou sociales manifestement nocives avérées',
    },
  },
  cannabinoids_withdrawal: {
    name: 'Syndrome de sevrage des cannabinoïdes',
    differentials: [
      'Intoxication aiguë (F12.0)',
      'Syndrome de sevrage avec delirium (F12.4)',
      'Trouble anxieux ou affectif',
      'Affection somatique avec symptomatologie végétative',
    ],
    groups: {
      'f12_3.context': 'Contexte de sevrage',
      'f12_3.symptoms': 'Symptômes de sevrage (au moins 1)',
      'f12_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f12_3.cessation':
        'Arrêt ou réduction des cannabinoïdes après une consommation répétée, le plus souvent prolongée et/ou à forte dose',
      'f12_3.withdrawal_syndrome':
        'Il existe un syndrome de sevrage typique de la substance',
      'f12_3.irritability':
        'Irritabilité, agitation intérieure ou nervosité',
      'f12_3.anxiety': 'Anxiété ou tension',
      'f12_3.sleep_disturbance':
        'Trouble du sommeil, parfois avec rêves vifs',
      'f12_3.appetite_loss': 'Diminution de l’appétit et perte de poids',
      'f12_3.depressed_mood': 'Humeur dépressive',
      'f12_3.exclude_other_cause':
        'Les symptômes ne sont pas mieux expliqués par un autre trouble somatique ou psychique',
    },
  },
  cannabinoids_psychotic_disorder: {
    name: 'Trouble psychotique induit par les cannabinoïdes',
    differentials: [
      'Schizophrénie ou trouble délirant persistant',
      'Intoxication aiguë (F12.0) avec phénomènes psychotiques',
      'Syndrome de sevrage avec delirium (F12.4)',
      'Trouble affectif avec symptômes psychotiques',
    ],
    groups: {
      'f12_5.symptoms': 'Symptômes psychotiques (au moins 1)',
      'f12_5.context': 'Lien temporel avec la consommation',
      'f12_5.exclusions': 'Exclusions',
    },
    criteria: {
      'f12_5.hallucinations':
        'Hallucinations (souvent auditives ou visuelles) qui ne sont pas uniquement l’expression d’une simple intoxication',
      'f12_5.delusions':
        'Idées délirantes, souvent de persécution ou de référence',
      'f12_5.temporal_relation':
        'Début des symptômes psychotiques pendant ou peu après (en règle générale dans les deux semaines) la consommation de cannabinoïdes',
      'f12_5.partial_remission':
        'Les symptômes régressent typiquement, au moins partiellement, dans un délai limité (de l’ordre de quelques semaines à quelques mois)',
      'f12_5.exclude_primary_psychosis':
        'La symptomatologie n’est pas mieux expliquée par un trouble psychotique primaire et ne survient pas exclusivement dans le cadre d’une intoxication ou d’un delirium de sevrage',
    },
  },
  sedatives_acute_intoxication: {
    name: 'Intoxication aiguë par des sédatifs ou hypnotiques',
    differentials: [
      'Syndrome de sevrage (F13.3)',
      'Delirium ou autre cause organique',
      'Trouble psychotique aigu',
      'Intoxication par une autre substance ou intoxication mixte',
    ],
    groups: {
      'f13_0.use': 'Mise en évidence de la consommation',
      'f13_0.signs': 'Signes d’intoxication typiques de la substance (au moins 1)',
      'f13_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f13_0.recent_use':
        'Consommation récente de sédatifs ou hypnotiques à une dose suffisamment élevée',
      'f13_0.causal_link':
        'Les symptômes sont en lien temporel et causal direct avec l’effet aigu de la substance et sont transitoires',
      'f13_0.sedation': 'Sédation, somnolence et baisse de la vigilance',
      'f13_0.ataxia':
        'Instabilité de la marche (ataxie) et trouble de la coordination',
      'f13_0.slurred_speech': 'Discours bredouillant',
      'f13_0.nystagmus': 'Nystagmus',
      'f13_0.memory_attention':
        'Trouble de l’attention et de la mémorisation (amnésie antérograde possible)',
      'f13_0.disinhibition': 'Désinhibition ou excitation paradoxale',
      'f13_0.exclude_other_cause':
        'Les symptômes ne sont pas mieux expliqués par une affection somatique, un delirium ou un autre trouble psychique',
    },
  },
  sedatives_harmful_use: {
    name: 'Usage nocif de sédatifs ou hypnotiques',
    differentials: [
      'Syndrome de dépendance (F13.2)',
      'Intoxication aiguë (F13.0)',
      'Usage à faible risque sans dommage identifiable',
    ],
    groups: {
      'f13_1.harm': 'Consommation avec dommage pour la santé',
      'f13_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f13_1.actual_use':
        'La consommation effective de sédatifs ou hypnotiques est documentée',
      'f13_1.health_damage':
        'Atteinte démontrable de la santé physique ou psychique résultant de la consommation',
      'f13_1.exclude_dependence':
        'Les critères d’un syndrome de dépendance (F13.2) ne sont pas remplis',
    },
  },
  sedatives_dependence: {
    name: 'Syndrome de dépendance aux sédatifs ou hypnotiques',
    differentials: [
      'Usage nocif de sédatifs ou hypnotiques (F13.1) sans dépendance',
      'Intoxication aiguë (F13.0)',
      'Trouble affectif ou psychotique induit par une substance',
    ],
    groups: {
      'f13_2.dependence': 'Caractéristiques de dépendance (au moins 3 en 12 mois)',
    },
    criteria: {
      'f13_2.craving':
        'Désir puissant ou sorte de compulsion à consommer des sédatifs ou hypnotiques (craving)',
      'f13_2.impaired_control':
        'Contrôle réduit sur le début, l’arrêt et la quantité de la consommation',
      'f13_2.withdrawal':
        'Syndrome de sevrage physique lors de la réduction ou de l’arrêt de la consommation, ou consommation visant à soulager les symptômes de sevrage',
      'f13_2.tolerance':
        'Développement d’une tolérance nécessitant une augmentation des doses pour obtenir l’effet initial',
      'f13_2.neglect':
        'Négligence croissante d’autres intérêts et temps accru consacré à se procurer la substance, à la consommer et à récupérer',
      'f13_2.persistence_harm':
        'Poursuite de la consommation malgré des conséquences physiques, psychiques ou sociales manifestement nocives avérées',
    },
  },
  sedatives_withdrawal: {
    name: 'Syndrome de sevrage des sédatifs ou hypnotiques',
    differentials: [
      'Intoxication aiguë (F13.0)',
      'Syndrome de sevrage avec delirium (F13.4)',
      'Trouble anxieux ou affectif',
      'Affection somatique avec symptomatologie végétative',
    ],
    groups: {
      'f13_3.context': 'Contexte de sevrage',
      'f13_3.symptoms': 'Symptômes de sevrage (au moins 1)',
      'f13_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f13_3.cessation':
        'Arrêt ou réduction des sédatifs ou hypnotiques après une consommation répétée, le plus souvent prolongée et/ou à forte dose',
      'f13_3.withdrawal_syndrome':
        'Il existe un syndrome de sevrage typique de la substance',
      'f13_3.tremor':
        'Tremblement et hyperactivité végétative (sueurs, tachycardie)',
      'f13_3.insomnia':
        'Difficultés marquées d’endormissement et de maintien du sommeil',
      'f13_3.anxiety_agitation':
        'Anxiété, agitation intérieure et agitation',
      'f13_3.nausea': 'Nausées ou vomissements',
      'f13_3.perceptual_disturbance':
        'Troubles de la perception ou hallucinations transitoires',
      'f13_3.seizures': 'Crises convulsives possibles',
      'f13_3.exclude_other_cause':
        'Les symptômes ne sont pas mieux expliqués par un autre trouble somatique ou psychique',
    },
  },
  sedatives_withdrawal_delirium: {
    name: 'Syndrome de sevrage avec delirium des sédatifs ou hypnotiques',
    differentials: [
      'Syndrome de sevrage sans delirium (F13.3)',
      'Delirium d’autre cause (somatique) (F05)',
      'Trouble psychotique induit par une substance',
      'Encéphalopathie de Wernicke (en cas d’alcool)',
    ],
    groups: {
      'f13_4.context': 'Sevrage avec trouble de la conscience',
      'f13_4.features': 'Symptômes déliriants associés (au moins 1)',
      'f13_4.exclusions': 'Exclusions',
    },
    criteria: {
      'f13_4.withdrawal_context':
        'Arrêt ou réduction des sédatifs ou hypnotiques sur fond de syndrome de dépendance préexistant',
      'f13_4.clouding':
        'Obnubilation de la conscience avec altération de la vigilance et de l’attention (état délirant)',
      'f13_4.disorientation':
        'Désorientation et trouble global des fonctions cognitives',
      'f13_4.hallucinations':
        'Hallucinations ou illusions vives (souvent visuelles ou scéniques)',
      'f13_4.psychomotor': 'Agitation psychomotrice marquée',
      'f13_4.autonomic':
        'Hyperactivité végétative marquée (p. ex. tachycardie, sueurs, hypertension, tremblement ample) ; crises convulsives possibles',
      'f13_4.exclude_other_cause':
        'Le delirium n’est pas mieux expliqué par une affection somatique indépendante',
    },
  },
  cocaine_acute_intoxication: {
    name: 'Intoxication aiguë par la cocaïne',
    differentials: [
      'Syndrome de sevrage (F14.3)',
      'Delirium ou autre cause organique',
      'Trouble psychotique aigu',
      'Intoxication par une autre substance ou intoxication mixte',
    ],
    groups: {
      'f14_0.use': 'Mise en évidence de la consommation',
      'f14_0.signs': 'Signes d’intoxication typiques de la substance (au moins 1)',
      'f14_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f14_0.recent_use':
        'Consommation récente de cocaïne à une dose suffisamment élevée',
      'f14_0.causal_link':
        'Les symptômes sont en lien temporel et causal direct avec l’effet aigu de la substance et sont transitoires',
      'f14_0.euphoria_grandiosity':
        'Euphorie, estime de soi accrue et logorrhée',
      'f14_0.hypervigilance':
        'Hypervigilance, agitation et activité accrue',
      'f14_0.autonomic':
        'Tachycardie, élévation de la tension artérielle, dilatation pupillaire et sueurs',
      'f14_0.stereotypies':
        'Mouvements stéréotypés ou grincement des dents',
      'f14_0.paranoia':
        'Méfiance, idées paranoïdes ou sensations tactiles anormales',
      'f14_0.exclude_other_cause':
        'Les symptômes ne sont pas mieux expliqués par une affection somatique, un delirium ou un autre trouble psychique',
    },
  },
  cocaine_harmful_use: {
    name: 'Usage nocif de cocaïne',
    differentials: [
      'Syndrome de dépendance (F14.2)',
      'Intoxication aiguë (F14.0)',
      'Usage à faible risque sans dommage identifiable',
    ],
    groups: {
      'f14_1.harm': 'Consommation avec dommage pour la santé',
      'f14_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f14_1.actual_use':
        'La consommation effective de cocaïne est documentée',
      'f14_1.health_damage':
        'Atteinte démontrable de la santé physique ou psychique résultant de la consommation',
      'f14_1.exclude_dependence':
        'Les critères d’un syndrome de dépendance (F14.2) ne sont pas remplis',
    },
  },
  cocaine_dependence: {
    name: 'Syndrome de dépendance à la cocaïne',
    differentials: [
      'Usage nocif de cocaïne (F14.1) sans dépendance',
      'Intoxication aiguë (F14.0)',
      'Trouble affectif ou psychotique induit par une substance',
    ],
    groups: {
      'f14_2.dependence': 'Caractéristiques de dépendance (au moins 3 en 12 mois)',
    },
    criteria: {
      'f14_2.craving':
        'Désir puissant ou sorte de compulsion à consommer de la cocaïne (craving)',
      'f14_2.impaired_control':
        'Contrôle réduit sur le début, l’arrêt et la quantité de la consommation',
      'f14_2.withdrawal':
        'Syndrome de sevrage physique lors de la réduction ou de l’arrêt de la consommation, ou consommation visant à soulager les symptômes de sevrage',
      'f14_2.tolerance':
        'Développement d’une tolérance nécessitant une augmentation des doses pour obtenir l’effet initial',
      'f14_2.neglect':
        'Négligence croissante d’autres intérêts et temps accru consacré à se procurer la substance, à la consommer et à récupérer',
      'f14_2.persistence_harm':
        'Poursuite de la consommation malgré des conséquences physiques, psychiques ou sociales manifestement nocives avérées',
    },
  },
  cocaine_withdrawal: {
    name: 'Syndrome de sevrage de la cocaïne',
    differentials: [
      'Intoxication aiguë (F14.0)',
      'Syndrome de sevrage avec delirium (F14.4)',
      'Trouble anxieux ou affectif',
      'Affection somatique avec symptomatologie végétative',
    ],
    groups: {
      'f14_3.context': 'Contexte de sevrage',
      'f14_3.symptoms': 'Symptômes de sevrage (au moins 1)',
      'f14_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f14_3.cessation':
        'Arrêt ou réduction de la cocaïne après une consommation répétée, le plus souvent prolongée et/ou à forte dose',
      'f14_3.withdrawal_syndrome':
        'Il existe un syndrome de sevrage typique de la substance',
      'f14_3.dysphoria': 'Humeur dysphorique et dépressive (« crash »)',
      'f14_3.fatigue': 'Épuisement et baisse de l’élan vital',
      'f14_3.sleep':
        'Besoin de sommeil accru ou insomnie avec rêves vifs',
      'f14_3.appetite': 'Appétit accru',
      'f14_3.craving': 'Désir intense de consommer (craving)',
      'f14_3.exclude_other_cause':
        'Les symptômes ne sont pas mieux expliqués par un autre trouble somatique ou psychique',
    },
  },
  cocaine_psychotic_disorder: {
    name: 'Trouble psychotique induit par la cocaïne',
    differentials: [
      'Schizophrénie ou trouble délirant persistant',
      'Intoxication aiguë (F14.0) avec phénomènes psychotiques',
      'Syndrome de sevrage avec delirium (F14.4)',
      'Trouble affectif avec symptômes psychotiques',
    ],
    groups: {
      'f14_5.symptoms': 'Symptômes psychotiques (au moins 1)',
      'f14_5.context': 'Lien temporel avec la consommation',
      'f14_5.exclusions': 'Exclusions',
    },
    criteria: {
      'f14_5.hallucinations':
        'Hallucinations (souvent auditives ou visuelles) qui ne sont pas uniquement l’expression d’une simple intoxication',
      'f14_5.delusions':
        'Idées délirantes, souvent de persécution ou de référence',
      'f14_5.temporal_relation':
        'Début des symptômes psychotiques pendant ou peu après (en règle générale dans les deux semaines) la consommation de cocaïne',
      'f14_5.partial_remission':
        'Les symptômes régressent typiquement, au moins partiellement, dans un délai limité (de l’ordre de quelques semaines à quelques mois)',
      'f14_5.exclude_primary_psychosis':
        'La symptomatologie n’est pas mieux expliquée par un trouble psychotique primaire et ne survient pas exclusivement dans le cadre d’une intoxication ou d’un delirium de sevrage',
    },
  },
  stimulants_acute_intoxication: {
    name: 'Intoxication aiguë par d’autres stimulants, y compris la caféine',
    differentials: [
      'Syndrome de sevrage (F15.3)',
      'Delirium ou autre cause organique',
      'Trouble psychotique aigu',
      'Intoxication par une autre substance ou intoxication mixte',
    ],
    groups: {
      'f15_0.use': 'Mise en évidence de la consommation',
      'f15_0.signs': 'Signes d’intoxication typiques de la substance (au moins 1)',
      'f15_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f15_0.recent_use':
        'Consommation récente d’autres stimulants, y compris la caféine, à une dose suffisamment élevée',
      'f15_0.causal_link':
        'Les symptômes sont en lien temporel et causal direct avec l’effet aigu de la substance et sont transitoires',
      'f15_0.euphoria_energy':
        'Euphorie, logorrhée et énergie/vigilance accrues',
      'f15_0.insomnia': 'Insomnie et besoin de sommeil réduit',
      'f15_0.autonomic':
        'Tachycardie, élévation de la tension artérielle, dilatation pupillaire ; hyperthermie possible',
      'f15_0.agitation':
        'Agitation, fébrilité ou comportement agressif',
      'f15_0.paranoia':
        'Méfiance ou idées paranoïdes (à dose plus élevée)',
      'f15_0.exclude_other_cause':
        'Les symptômes ne sont pas mieux expliqués par une affection somatique, un delirium ou un autre trouble psychique',
    },
  },
  stimulants_harmful_use: {
    name: 'Usage nocif d’autres stimulants, y compris la caféine',
    differentials: [
      'Syndrome de dépendance (F15.2)',
      'Intoxication aiguë (F15.0)',
      'Usage à faible risque sans dommage identifiable',
    ],
    groups: {
      'f15_1.harm': 'Consommation avec dommage pour la santé',
      'f15_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f15_1.actual_use':
        'La consommation effective d’autres stimulants, y compris la caféine, est documentée',
      'f15_1.health_damage':
        'Atteinte démontrable de la santé physique ou psychique résultant de la consommation',
      'f15_1.exclude_dependence':
        'Les critères d’un syndrome de dépendance (F15.2) ne sont pas remplis',
    },
  },
  stimulants_dependence: {
    name: 'Syndrome de dépendance à d’autres stimulants, y compris la caféine',
    differentials: [
      'Usage nocif d’autres stimulants, y compris la caféine (F15.1) sans dépendance',
      'Intoxication aiguë (F15.0)',
      'Trouble affectif ou psychotique induit par une substance',
    ],
    groups: {
      'f15_2.dependence': 'Caractéristiques de dépendance (au moins 3 en 12 mois)',
    },
    criteria: {
      'f15_2.craving':
        'Désir puissant ou sorte de compulsion à consommer d’autres stimulants, y compris la caféine (craving)',
      'f15_2.impaired_control':
        'Contrôle réduit sur le début, l’arrêt et la quantité de la consommation',
      'f15_2.withdrawal':
        'Syndrome de sevrage physique lors de la réduction ou de l’arrêt de la consommation, ou consommation visant à soulager les symptômes de sevrage',
      'f15_2.tolerance':
        'Développement d’une tolérance nécessitant une augmentation des doses pour obtenir l’effet initial',
      'f15_2.neglect':
        'Négligence croissante d’autres intérêts et temps accru consacré à se procurer la substance, à la consommer et à récupérer',
      'f15_2.persistence_harm':
        'Poursuite de la consommation malgré des conséquences physiques, psychiques ou sociales manifestement nocives avérées',
    },
  },
  stimulants_withdrawal: {
    name: 'Syndrome de sevrage d’autres stimulants, y compris la caféine',
    differentials: [
      'Intoxication aiguë (F15.0)',
      'Syndrome de sevrage avec delirium (F15.4)',
      'Trouble anxieux ou affectif',
      'Affection somatique avec symptomatologie végétative',
    ],
    groups: {
      'f15_3.context': 'Contexte de sevrage',
      'f15_3.symptoms': 'Symptômes de sevrage (au moins 1)',
      'f15_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f15_3.cessation':
        'Arrêt ou réduction d’autres stimulants, y compris la caféine, après une consommation répétée, le plus souvent prolongée et/ou à forte dose',
      'f15_3.withdrawal_syndrome':
        'Il existe un syndrome de sevrage typique de la substance',
      'f15_3.fatigue': 'Fatigue et épuisement marqués',
      'f15_3.depressed_mood': 'Humeur dépressive et anhédonie',
      'f15_3.hypersomnia': 'Besoin de sommeil accru',
      'f15_3.appetite': 'Appétit accru',
      'f15_3.caffeine_headache':
        'En cas de caféine : céphalées, fatigue et trouble de la concentration',
      'f15_3.exclude_other_cause':
        'Les symptômes ne sont pas mieux expliqués par un autre trouble somatique ou psychique',
    },
  },
  stimulants_psychotic_disorder: {
    name: 'Trouble psychotique induit par d’autres stimulants, y compris la caféine',
    differentials: [
      'Schizophrénie ou trouble délirant persistant',
      'Intoxication aiguë (F15.0) avec phénomènes psychotiques',
      'Syndrome de sevrage avec delirium (F15.4)',
      'Trouble affectif avec symptômes psychotiques',
    ],
    groups: {
      'f15_5.symptoms': 'Symptômes psychotiques (au moins 1)',
      'f15_5.context': 'Lien temporel avec la consommation',
      'f15_5.exclusions': 'Exclusions',
    },
    criteria: {
      'f15_5.hallucinations':
        'Hallucinations (souvent auditives ou visuelles) qui ne sont pas uniquement l’expression d’une simple intoxication',
      'f15_5.delusions':
        'Idées délirantes, souvent de persécution ou de référence',
      'f15_5.temporal_relation':
        'Début des symptômes psychotiques pendant ou peu après (en règle générale dans les deux semaines) la consommation d’autres stimulants, y compris la caféine',
      'f15_5.partial_remission':
        'Les symptômes régressent typiquement, au moins partiellement, dans un délai limité (de l’ordre de quelques semaines à quelques mois)',
      'f15_5.exclude_primary_psychosis':
        'La symptomatologie n’est pas mieux expliquée par un trouble psychotique primaire et ne survient pas exclusivement dans le cadre d’une intoxication ou d’un delirium de sevrage',
    },
  },
  hallucinogens_acute_intoxication: {
    name: 'Intoxication aiguë par des hallucinogènes',
    differentials: [
      'Syndrome de sevrage (F16.3)',
      'Delirium ou autre cause organique',
      'Trouble psychotique aigu',
      'Intoxication par une autre substance ou intoxication mixte',
    ],
    groups: {
      'f16_0.use': 'Mise en évidence de la consommation',
      'f16_0.signs': 'Signes d’intoxication typiques de la substance (au moins 1)',
      'f16_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f16_0.recent_use':
        'Consommation récente d’hallucinogènes à une dose suffisamment élevée',
      'f16_0.causal_link':
        'Les symptômes sont en lien temporel et causal direct avec l’effet aigu de la substance et sont transitoires',
      'f16_0.perceptual_changes':
        'Perception altérée avec illusions, hallucinations ou synesthésies, l’épreuve de réalité étant le plus souvent préservée',
      'f16_0.depersonalization':
        'Vécu de dépersonnalisation ou de déréalisation',
      'f16_0.anxiety_panic':
        'Anxiété, panique ou réaction paranoïde (« bad trip »)',
      'f16_0.autonomic':
        'Dilatation pupillaire, tachycardie et tremblement',
      'f16_0.exclude_other_cause':
        'Les symptômes ne sont pas mieux expliqués par une affection somatique, un delirium ou un autre trouble psychique',
    },
  },
  hallucinogens_harmful_use: {
    name: 'Usage nocif d’hallucinogènes',
    differentials: [
      'Syndrome de dépendance (F16.2)',
      'Intoxication aiguë (F16.0)',
      'Usage à faible risque sans dommage identifiable',
    ],
    groups: {
      'f16_1.harm': 'Consommation avec dommage pour la santé',
      'f16_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f16_1.actual_use':
        'La consommation effective d’hallucinogènes est documentée',
      'f16_1.health_damage':
        'Atteinte démontrable de la santé physique ou psychique résultant de la consommation',
      'f16_1.exclude_dependence':
        'Les critères d’un syndrome de dépendance (F16.2) ne sont pas remplis',
    },
  },
  hallucinogens_psychotic_disorder: {
    name: 'Trouble psychotique induit par les hallucinogènes',
    differentials: [
      'Schizophrénie ou trouble délirant persistant',
      'Intoxication aiguë (F16.0) avec phénomènes psychotiques',
      'Syndrome de sevrage avec delirium (F16.4)',
      'Trouble affectif avec symptômes psychotiques',
    ],
    groups: {
      'f16_5.symptoms': 'Symptômes psychotiques (au moins 1)',
      'f16_5.context': 'Lien temporel avec la consommation',
      'f16_5.exclusions': 'Exclusions',
    },
    criteria: {
      'f16_5.hallucinations':
        'Hallucinations (souvent auditives ou visuelles) qui ne sont pas uniquement l’expression d’une simple intoxication',
      'f16_5.delusions':
        'Idées délirantes, souvent de persécution ou de référence',
      'f16_5.temporal_relation':
        'Début des symptômes psychotiques pendant ou peu après (en règle générale dans les deux semaines) la consommation d’hallucinogènes',
      'f16_5.partial_remission':
        'Les symptômes régressent typiquement, au moins partiellement, dans un délai limité (de l’ordre de quelques semaines à quelques mois)',
      'f16_5.exclude_primary_psychosis':
        'La symptomatologie n’est pas mieux expliquée par un trouble psychotique primaire et ne survient pas exclusivement dans le cadre d’une intoxication ou d’un delirium de sevrage',
    },
  },
  nicotine_harmful_use: {
    name: 'Usage nocif de tabac/nicotine',
    differentials: [
      'Syndrome de dépendance (F17.2)',
      'Intoxication aiguë (F17.0)',
      'Usage à faible risque sans dommage identifiable',
    ],
    groups: {
      'f17_1.harm': 'Consommation avec dommage pour la santé',
      'f17_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f17_1.actual_use':
        'La consommation effective de tabac/nicotine est documentée',
      'f17_1.health_damage':
        'Atteinte démontrable de la santé physique ou psychique résultant de la consommation',
      'f17_1.exclude_dependence':
        'Les critères d’un syndrome de dépendance (F17.2) ne sont pas remplis',
    },
  },
  nicotine_dependence: {
    name: 'Syndrome de dépendance au tabac/à la nicotine',
    differentials: [
      'Usage nocif de tabac/nicotine (F17.1) sans dépendance',
      'Intoxication aiguë (F17.0)',
      'Trouble affectif ou psychotique induit par une substance',
    ],
    groups: {
      'f17_2.dependence': 'Caractéristiques de dépendance (au moins 3 en 12 mois)',
    },
    criteria: {
      'f17_2.craving':
        'Désir puissant ou sorte de compulsion à consommer du tabac/de la nicotine (craving)',
      'f17_2.impaired_control':
        'Contrôle réduit sur le début, l’arrêt et la quantité de la consommation',
      'f17_2.withdrawal':
        'Syndrome de sevrage physique lors de la réduction ou de l’arrêt de la consommation, ou consommation visant à soulager les symptômes de sevrage',
      'f17_2.tolerance':
        'Développement d’une tolérance nécessitant une augmentation des doses pour obtenir l’effet initial',
      'f17_2.neglect':
        'Négligence croissante d’autres intérêts et temps accru consacré à se procurer la substance, à la consommer et à récupérer',
      'f17_2.persistence_harm':
        'Poursuite de la consommation malgré des conséquences physiques, psychiques ou sociales manifestement nocives avérées',
    },
  },
  nicotine_withdrawal: {
    name: 'Syndrome de sevrage du tabac/de la nicotine',
    differentials: [
      'Intoxication aiguë (F17.0)',
      'Syndrome de sevrage avec delirium (F17.4)',
      'Trouble anxieux ou affectif',
      'Affection somatique avec symptomatologie végétative',
    ],
    groups: {
      'f17_3.context': 'Contexte de sevrage',
      'f17_3.symptoms': 'Symptômes de sevrage (au moins 1)',
      'f17_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f17_3.cessation':
        'Arrêt ou réduction du tabac/de la nicotine après une consommation répétée, le plus souvent prolongée et/ou à forte dose',
      'f17_3.withdrawal_syndrome':
        'Il existe un syndrome de sevrage typique de la substance',
      'f17_3.craving': 'Désir intense de fumer (craving)',
      'f17_3.irritability': 'Irritabilité, frustration ou colère',
      'f17_3.anxiety': 'Anxiété ou agitation intérieure',
      'f17_3.concentration': 'Difficultés de concentration',
      'f17_3.restlessness': 'Fébrilité',
      'f17_3.appetite': 'Appétit accru ou prise de poids',
      'f17_3.depressed_mood': 'Humeur dépressive',
      'f17_3.insomnia': 'Trouble du sommeil',
      'f17_3.exclude_other_cause':
        'Les symptômes ne sont pas mieux expliqués par un autre trouble somatique ou psychique',
    },
  },
  volatile_solvents_acute_intoxication: {
    name: 'Intoxication aiguë par des solvants volatils',
    differentials: [
      'Syndrome de sevrage (F18.3)',
      'Delirium ou autre cause organique',
      'Trouble psychotique aigu',
      'Intoxication par une autre substance ou intoxication mixte',
    ],
    groups: {
      'f18_0.use': 'Mise en évidence de la consommation',
      'f18_0.signs': 'Signes d’intoxication typiques de la substance (au moins 1)',
      'f18_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f18_0.recent_use':
        'Consommation récente de solvants volatils à une dose suffisamment élevée',
      'f18_0.causal_link':
        'Les symptômes sont en lien temporel et causal direct avec l’effet aigu de la substance et sont transitoires',
      'f18_0.euphoria_disinhibition':
        'Euphorie, désinhibition et apathie',
      'f18_0.dizziness': 'Vertiges et étourdissement',
      'f18_0.ataxia':
        'Instabilité de la marche (ataxie) et trouble de la coordination',
      'f18_0.slurred_speech': 'Discours bredouillant et vision floue',
      'f18_0.lethargy':
        'Léthargie pouvant aller jusqu’à la stupeur ou la diminution de la conscience',
      'f18_0.exclude_other_cause':
        'Les symptômes ne sont pas mieux expliqués par une affection somatique, un delirium ou un autre trouble psychique',
    },
  },
  volatile_solvents_harmful_use: {
    name: 'Usage nocif de solvants volatils',
    differentials: [
      'Syndrome de dépendance (F18.2)',
      'Intoxication aiguë (F18.0)',
      'Usage à faible risque sans dommage identifiable',
    ],
    groups: {
      'f18_1.harm': 'Consommation avec dommage pour la santé',
      'f18_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f18_1.actual_use':
        'La consommation effective de solvants volatils est documentée',
      'f18_1.health_damage':
        'Atteinte démontrable de la santé physique ou psychique résultant de la consommation',
      'f18_1.exclude_dependence':
        'Les critères d’un syndrome de dépendance (F18.2) ne sont pas remplis',
    },
  },
  volatile_solvents_dependence: {
    name: 'Syndrome de dépendance aux solvants volatils',
    differentials: [
      'Usage nocif de solvants volatils (F18.1) sans dépendance',
      'Intoxication aiguë (F18.0)',
      'Trouble affectif ou psychotique induit par une substance',
    ],
    groups: {
      'f18_2.dependence': 'Caractéristiques de dépendance (au moins 3 en 12 mois)',
    },
    criteria: {
      'f18_2.craving':
        'Désir puissant ou sorte de compulsion à consommer des solvants volatils (craving)',
      'f18_2.impaired_control':
        'Contrôle réduit sur le début, l’arrêt et la quantité de la consommation',
      'f18_2.withdrawal':
        'Syndrome de sevrage physique lors de la réduction ou de l’arrêt de la consommation, ou consommation visant à soulager les symptômes de sevrage',
      'f18_2.tolerance':
        'Développement d’une tolérance nécessitant une augmentation des doses pour obtenir l’effet initial',
      'f18_2.neglect':
        'Négligence croissante d’autres intérêts et temps accru consacré à se procurer la substance, à la consommer et à récupérer',
      'f18_2.persistence_harm':
        'Poursuite de la consommation malgré des conséquences physiques, psychiques ou sociales manifestement nocives avérées',
    },
  },
}

/** FR translations — bloc CIM-10 F1 + fragments CIM-11 (6C4x) générés. */
export const frSubstanceUse: DisorderTranslationMap = withIcd11SubstanceTranslations(frSubstanceUseBase, {
  substanceNames: {
    alcohol_dependence: "d’alcool",
    opioids_dependence: "d’opioïdes",
    cannabinoids_dependence: 'de cannabinoïdes',
    sedatives_dependence: 'de sédatifs ou hypnotiques',
    cocaine_dependence: 'de cocaïne',
    stimulants_dependence: "d’autres stimulants dont la caféine",
    nicotine_dependence: 'de tabac/nicotine',
    volatile_solvents_dependence: 'de solvants volatils',
    opioids_harmful_use: "d’opioïdes",
    cannabinoids_harmful_use: 'de cannabinoïdes',
    sedatives_harmful_use: 'de sédatifs ou hypnotiques',
    cocaine_harmful_use: 'de cocaïne',
    stimulants_harmful_use: "d’autres stimulants dont la caféine",
    hallucinogens_harmful_use: "d’hallucinogènes",
    nicotine_harmful_use: 'de tabac/nicotine',
    volatile_solvents_harmful_use: 'de solvants volatils',
  },
  depGroupLabel:
    'Caractéristiques de dépendance selon la CIM-11 (au moins 2 sur 3, sur ≥ 12 mois — ou ≥ 1 mois en cas de consommation continue)',
  depImpairedControl: (s) =>
    `Contrôle altéré de la consommation ${s} (début, quantité, circonstances ou arrêt), souvent accompagné d’un fort désir de consommer (craving)`,
  depSalience:
    'Priorité croissante accordée à la consommation par rapport aux autres intérêts et obligations, avec poursuite de la consommation malgré la survenue de conséquences nocives',
  depPhysiological:
    'Caractéristiques physiologiques : tolérance, symptômes de sevrage lors de la réduction ou de l’arrêt, ou consommation répétée pour prévenir ou soulager le sevrage',
  harmPatternGroupLabel:
    'Mode de consommation persistant (épisodique ou continu, généralement sur ≥ 12 mois — ou ≥ 1 mois si continu)',
  harmGroupLabel: 'Préjudice démontrable (au moins un des domaines suivants)',
  exclusionsGroupLabel: 'Exclusions',
  usePattern: (s) => `Un mode de consommation ${s} répété ou persistant est documenté`,
  harmSelf:
    'Atteinte cliniquement significative de la santé physique ou mentale de la personne du fait de la consommation (y compris le comportement lié à la consommation ou à l’intoxication)',
  harmOthers:
    'Atteinte à la santé d’autrui résultant du comportement de la personne lié à la consommation ou à l’intoxication (p. ex. blessures de tiers, préjudice dans la circulation) — extension spécifique à la CIM-11',
  excludeDependence: (depCode) => `Les critères d’une dépendance (${depCode}) ne sont pas remplis`,
})
