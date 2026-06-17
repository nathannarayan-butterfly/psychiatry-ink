import type { DisorderTranslationMap } from '../types'

/** ES translations — ICD-10 F8 block. */
export const esF8: DisorderTranslationMap = {
  developmental_speech_language_disorder: {
    name: 'Trastorno específico del desarrollo del habla y del lenguaje',
    differentials: [
      'Déficit auditivo como causa de la alteración del lenguaje',
      'Discapacidad intelectual con retraso global del desarrollo',
      'Trastorno del espectro autista',
      'Mutismo selectivo (capaz de hablar, pero enmudecido según la situación)',
      'Multilingüismo / factores del entorno',
    ],
    groups: {
      'f80.core': 'Núcleo: retraso específico del desarrollo del lenguaje o del habla',
      'f80.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f80.delayed_acquisition':
        'La adquisición de las capacidades lingüísticas (articulación, lenguaje expresivo o receptivo) se sitúa, desde las primeras fases del desarrollo, claramente por debajo del nivel esperado para la edad',
      'f80.early_onset':
        'La alteración está presente desde los primeros años del desarrollo y no es consecuencia de una pérdida del lenguaje adquirida más tarde',
      'f80.functional_impact':
        'El retraso del lenguaje afecta al rendimiento escolar, a la comunicación cotidiana o a la participación social',
      'f80.exclude_hearing_neuro':
        'El retraso del lenguaje no se explica de forma suficiente por un déficit auditivo, una enfermedad neurológica o una anomalía del aparato fonador',
      'f80.exclude_global_delay':
        'Las capacidades lingüísticas se sitúan claramente por debajo del nivel general de desarrollo no verbal (no se trata de un retraso global en el sentido de una discapacidad intelectual)',
    },
  },
  developmental_learning_disorder: {
    name: 'Trastorno específico del desarrollo de las habilidades escolares',
    differentials: [
      'Discapacidad intelectual (retraso global del rendimiento)',
      'Escolarización insuficiente o interrumpida',
      'Déficit sensorial (disminución de la visión o la audición)',
      'Trastorno por déficit de atención (TDAH) como causa de las dificultades de aprendizaje',
      'Trastorno del desarrollo del lenguaje',
    ],
    groups: {
      'f81.core': 'Núcleo: afectación específica de las habilidades escolares',
      'f81.qualifiers': 'Condiciones diagnósticas',
      'f81.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f81.reading_spelling':
        'Capacidades de lectura o de escritura claramente afectadas que no se explican únicamente por la edad, la inteligencia o una escolarización inadecuada (trastorno de la lectura y la escritura)',
      'f81.arithmetic':
        'Capacidades de cálculo claramente afectadas (operaciones básicas, comprensión numérica) que no se explican únicamente por la edad, la inteligencia o una escolarización inadecuada (trastorno del cálculo / discalculia)',
      'f81.early_onset':
        'La afectación del aprendizaje aparece desde el inicio de la enseñanza escolar formal y no se adquiere de forma secundaria más tarde',
      'f81.functional_impact':
        'El retraso del rendimiento afecta al rendimiento escolar o a las exigencias cotidianas que requieren estas habilidades',
      'f81.exclude_intellectual_sensory':
        'El retraso no se explica de forma suficiente por una discapacidad intelectual, un déficit sensorial no corregido o la falta de escolarización',
    },
  },
  developmental_motor_coordination_disorder: {
    name: 'Trastorno específico del desarrollo de las funciones motoras',
    differentials: [
      'Enfermedad neurológica (p. ej., parálisis cerebral, miopatía)',
      'Discapacidad intelectual con retraso general del desarrollo',
      'Trastorno de la visión',
      'Trastorno del espectro autista',
    ],
    groups: {
      'f82.core': 'Núcleo: coordinación motora afectada',
      'f82.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f82.coordination_deficit':
        'La coordinación motora (motricidad fina o gruesa) se sitúa claramente por debajo del nivel esperado para la edad y la inteligencia (p. ej., torpeza en la manipulación, retraso en la adquisición de hitos motores)',
      'f82.early_onset':
        'La debilidad de la coordinación está presente desde el desarrollo temprano y no se adquiere más tarde',
      'f82.functional_impact':
        'La torpeza motora afecta de forma notable al rendimiento escolar, a las actividades cotidianas o al juego',
      'f82.exclude_neuro_intellectual':
        'El trastorno de la coordinación no se explica de forma suficiente por una enfermedad neurológica circunscrita o por una discapacidad intelectual',
    },
  },
  autism_spectrum_disorder: {
    name: 'Trastorno del espectro autista',
    differentials: [
      'Discapacidad intelectual sin rasgos nucleares autistas',
      'Trastorno específico del desarrollo del lenguaje',
      'Trastorno de la comunicación social (pragmática)',
      'Trastorno reactivo del apego / privación',
      'Esquizofrenia de inicio temprano',
      'TDAH (problemas de atención e impulsividad sin núcleo autista)',
    ],
    groups: {
      'f84.social_communication': 'Déficits persistentes de la comunicación e interacción social',
      'f84.restricted_repetitive':
        'Patrones restringidos y repetitivos de comportamiento, intereses y actividades (al menos 2)',
      'f84.developmental_context': 'Inicio y afectación',
      'f84.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f84.social_reciprocity':
        'Afectación persistente de la reciprocidad socioemocional (p. ej., contacto limitado, atención compartida o respuesta a la aproximación social reducidas)',
      'f84.nonverbal_communication':
        'Afectación de la comunicación no verbal (p. ej., contacto ocular, expresión facial, gestos) y del uso social del lenguaje',
      'f84.relationships':
        'Dificultad para establecer y mantener relaciones acordes a la edad o para adaptar el comportamiento a los contextos sociales',
      'f84.stereotyped_behavior':
        'Movimientos motores, patrones del habla (p. ej., ecolalia) o uso de objetos estereotipados o repetitivos',
      'f84.insistence_sameness':
        'Apego excesivo a la invariabilidad, las rutinas o los rituales; malestar acusado ante los cambios',
      'f84.restricted_interests':
        'Intereses especiales muy restringidos, de intensidad inusual o fijos',
      'f84.sensory':
        'Hiper- o hiporreactividad a los estímulos sensoriales o interés inusual por aspectos sensoriales del entorno',
      'f84.early_onset':
        'Las características están presentes desde la primera infancia (pueden hacerse plenamente reconocibles más tarde cuando las exigencias sociales son menores)',
      'f84.functional_impact':
        'Las características provocan una afectación clínicamente significativa en áreas sociales, escolares u otras áreas importantes del funcionamiento',
      'f84.exclude_better_explained':
        'Las alteraciones no se explican mejor por una discapacidad intelectual aislada o por otro trastorno mental',
    },
  },
}
