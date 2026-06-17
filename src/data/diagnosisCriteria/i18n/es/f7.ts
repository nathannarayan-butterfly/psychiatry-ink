import type { DisorderTranslationMap } from '../types'

/** ES translations — ICD-10 F7 block. */
export const esF7: DisorderTranslationMap = {
  intellectual_disability_mild: {
    name: 'Discapacidad intelectual leve',
    differentials: [
      'Trastorno específico del aprendizaje o del desarrollo (déficit parcial en lugar de retraso global)',
      'Retraso del rendimiento de origen socioeconómico o educativo',
      'Déficit sensorial no detectado (disminución de la visión o la audición)',
      'Trastorno del espectro autista sin discapacidad intelectual',
    ],
    groups: {
      'f70.core': 'Núcleo: los tres pilares diagnósticos de la discapacidad intelectual',
      'f70.assessment': 'Condiciones diagnósticas para la evaluación',
      'f70.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f70.intellectual_functioning':
        'Capacidad intelectual general claramente por debajo del promedio, aproximadamente en el rango de un CI de 50–69 (corresponde en la edad adulta, de forma aproximada, a una edad de desarrollo de 9 a menos de 12 años)',
      'f70.adaptive_functioning':
        'Dificultades de aprendizaje escolar, aunque con frecuencia se alcanza autonomía en el autocuidado y en habilidades prácticas y domésticas; se requiere apoyo sobre todo ante exigencias abstractas y complejas',
      'f70.functional_profile':
        'El lenguaje suele adquirirse de forma suficiente para fines cotidianos; muchas personas afectadas son capaces de trabajar en la edad adulta y de mantener relaciones sociales',
      'f70.developmental_onset':
        'Inicio de las limitaciones durante el período de desarrollo (antes de completarse la maduración cerebral), y no como un deterioro del rendimiento adquirido más tarde en el sentido de una enfermedad demencial',
      'f70.standardized_assessment':
        'Determinación de la capacidad intelectual y adaptativa preferiblemente mediante procedimientos estandarizados, normalizados y adaptados de forma culturalmente equitativa; la asignación de la gravedad no se basa únicamente en una puntuación de prueba aislada',
      'f70.exclude_acquired_decline':
        'El nivel reducido de funcionamiento no se explica por un deterioro cognitivo adquirido únicamente tras el período de desarrollo (demencia, traumatismo craneoencefálico en la edad adulta)',
      'f70.exclude_sensory_deprivation':
        'El retraso del rendimiento no se explica de forma suficiente solo por un déficit sensorial no corregido, un trastorno mental grave o por la ausencia de escolarización / privación social',
    },
  },
  intellectual_disability_moderate: {
    name: 'Discapacidad intelectual moderada',
    differentials: [
      'Discapacidad intelectual grave (F72)',
      'Trastorno generalizado del desarrollo con retraso global',
      'Trastorno neurocognitivo adquirido en la infancia',
      'Privación grave con retraso del desarrollo',
    ],
    groups: {
      'f71.core': 'Núcleo: los tres pilares diagnósticos de la discapacidad intelectual',
      'f71.assessment': 'Condiciones diagnósticas para la evaluación',
      'f71.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f71.intellectual_functioning':
        'Capacidad intelectual general claramente por debajo del promedio, aproximadamente en el rango de un CI de 35–49 (corresponde de forma aproximada a una edad de desarrollo de 6 a menos de 9 años)',
      'f71.adaptive_functioning':
        'Desarrollo claramente enlentecido de la comprensión y el uso del lenguaje, así como de las habilidades de autocuidado y motoras; se requiere apoyo permanente en la vida cotidiana y en el desenvolvimiento general',
      'f71.functional_profile':
        'Progresos escolares limitados; en la edad adulta suelen ser posibles tareas sencillas y supervisadas; participación social en un entorno estructurado',
      'f71.developmental_onset':
        'Inicio de las limitaciones durante el período de desarrollo (antes de completarse la maduración cerebral), y no como un deterioro del rendimiento adquirido más tarde en el sentido de una enfermedad demencial',
      'f71.standardized_assessment':
        'Determinación de la capacidad intelectual y adaptativa preferiblemente mediante procedimientos estandarizados, normalizados y adaptados de forma culturalmente equitativa; la asignación de la gravedad no se basa únicamente en una puntuación de prueba aislada',
      'f71.exclude_acquired_decline':
        'El nivel reducido de funcionamiento no se explica por un deterioro cognitivo adquirido únicamente tras el período de desarrollo (demencia, traumatismo craneoencefálico en la edad adulta)',
      'f71.exclude_sensory_deprivation':
        'El retraso del rendimiento no se explica de forma suficiente solo por un déficit sensorial no corregido, un trastorno mental grave o por la ausencia de escolarización / privación social',
    },
  },
  intellectual_disability_severe: {
    name: 'Discapacidad intelectual grave',
    differentials: [
      'Discapacidad intelectual profunda (F73)',
      'Enfermedad neurológica o metabólica progresiva',
      'Discapacidad sensorial o motora múltiple sin discapacidad intelectual global',
    ],
    groups: {
      'f72.core': 'Núcleo: los tres pilares diagnósticos de la discapacidad intelectual',
      'f72.assessment': 'Condiciones diagnósticas para la evaluación',
      'f72.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f72.intellectual_functioning':
        'Capacidad intelectual general muy marcadamente por debajo del promedio, aproximadamente en el rango de un CI de 20–34 (corresponde de forma aproximada a una edad de desarrollo de 3 a menos de 6 años)',
      'f72.adaptive_functioning':
        'Déficits acusados y constantes en casi todas las áreas adaptativas; adquisición del lenguaje solo rudimentaria; se requiere atención continua y ayuda en el autocuidado',
      'f72.functional_profile':
        'Con frecuencia se asocian alteraciones motoras y enfermedades neurológicas concomitantes; apoyo continuo en toda la vida cotidiana',
      'f72.developmental_onset':
        'Inicio de las limitaciones durante el período de desarrollo (antes de completarse la maduración cerebral), y no como un deterioro del rendimiento adquirido más tarde en el sentido de una enfermedad demencial',
      'f72.standardized_assessment':
        'Determinación de la capacidad intelectual y adaptativa preferiblemente mediante procedimientos estandarizados, normalizados y adaptados de forma culturalmente equitativa; la asignación de la gravedad no se basa únicamente en una puntuación de prueba aislada',
      'f72.exclude_acquired_decline':
        'El nivel reducido de funcionamiento no se explica por un deterioro cognitivo adquirido únicamente tras el período de desarrollo (demencia, traumatismo craneoencefálico en la edad adulta)',
      'f72.exclude_sensory_deprivation':
        'El retraso del rendimiento no se explica de forma suficiente solo por un déficit sensorial no corregido, un trastorno mental grave o por la ausencia de escolarización / privación social',
    },
  },
  intellectual_disability_profound: {
    name: 'Discapacidad intelectual profunda',
    differentials: [
      'Discapacidad intelectual grave (F72)',
      'Enfermedad neurológica de base grave con estado vegetativo / respuesta mínima',
      'Discapacidad sensorial múltiple que enmascara el nivel de funcionamiento',
    ],
    groups: {
      'f73.core': 'Núcleo: los tres pilares diagnósticos de la discapacidad intelectual',
      'f73.assessment': 'Condiciones diagnósticas para la evaluación',
      'f73.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f73.intellectual_functioning':
        'Capacidad intelectual general profundamente por debajo del promedio, aproximadamente en el rango de un CI inferior a 20 (corresponde de forma aproximada a una edad de desarrollo inferior a 3 años)',
      'f73.adaptive_functioning':
        'Limitación profunda de la comprensión y el uso del lenguaje, la movilidad, la continencia y el autocuidado; se requiere cuidado y atención completos y continuos',
      'f73.functional_profile':
        'Capacidad muy limitada para comprender órdenes sencillas; con frecuencia coexisten alteraciones físicas y neurológicas graves, así como movilidad reducida',
      'f73.developmental_onset':
        'Inicio de las limitaciones durante el período de desarrollo (antes de completarse la maduración cerebral), y no como un deterioro del rendimiento adquirido más tarde en el sentido de una enfermedad demencial',
      'f73.standardized_assessment':
        'Determinación de la capacidad intelectual y adaptativa preferiblemente mediante procedimientos estandarizados, normalizados y adaptados de forma culturalmente equitativa; la asignación de la gravedad no se basa únicamente en una puntuación de prueba aislada',
      'f73.exclude_acquired_decline':
        'El nivel reducido de funcionamiento no se explica por un deterioro cognitivo adquirido únicamente tras el período de desarrollo (demencia, traumatismo craneoencefálico en la edad adulta)',
      'f73.exclude_sensory_deprivation':
        'El retraso del rendimiento no se explica de forma suficiente solo por un déficit sensorial no corregido, un trastorno mental grave o por la ausencia de escolarización / privación social',
    },
  },
}
