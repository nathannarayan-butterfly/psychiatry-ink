import type { DisorderTranslationMap } from '../types'

/** ES translations — ICD-10 F7 block. */
export const esIntellectualDevelopment: DisorderTranslationMap = {
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
      '6a00_0.functioning': 'Capacidad intelectual alterada con inicio durante el período de desarrollo',
      '6a00_0.adaptive_domains': 'Limitación del comportamiento adaptativo en los tres dominios (perfil específico del grado de gravedad)',
      '6a00_0.assessment': 'Determinación del grado de gravedad y establecimiento diagnóstico',
      '6a00_0.exclusions': 'Exclusiones / diagnóstico diferencial',
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
      '6a00_0.intellectual_functioning':
        'Limitación significativa de la capacidad intelectual general, preferiblemente acreditada mediante pruebas estandarizadas, de administración individual y normalizadas, aproximadamente dos o más desviaciones estándar por debajo de la media (o mediante indicadores conductuales cuando no se dispone de normas adecuadas)',
      '6a00_0.developmental_onset':
        'Inicio durante el período de desarrollo: las limitaciones están presentes desde la infancia y no representan un deterioro del rendimiento adquirido solo más tarde',
      '6a00_0.conceptual_domain':
        'Dominio conceptual: a menudo poco evidente en la primera infancia; en la edad escolar, dificultades para adquirir habilidades académicas (lectura, escritura, cálculo), así como para el pensamiento abstracto, la planificación y la resolución de problemas, mientras que las tareas concretas cotidianas suelen resolverse',
      '6a00_0.social_domain':
        'Dominio social: interacción social inmadura en comparación con los pares, con dificultad para reconocer de forma fiable las señales y los riesgos sociales; la regulación emocional y el juicio social están disminuidos para la edad, con mayor susceptibilidad a ser influido',
      '6a00_0.practical_domain':
        'Dominio práctico: el autocuidado adecuado a la edad suele ser posible; se requiere apoyo en las exigencias cotidianas complejas (compras, manejo del dinero, llevar un hogar, tareas de organización); es alcanzable un empleo con exigencias mayoritariamente concretas',
      '6a00_0.severity_by_adaptive':
        'La asignación del grado de gravedad se basa en el perfil del comportamiento adaptativo en los tres dominios (conceptual, social, práctico) y no en una única puntuación de CI',
      '6a00_0.standardized_or_behavioural':
        'Cuando es posible, el diagnóstico se establece mediante instrumentos estandarizados, culturalmente equitativos y normalizados para las funciones intelectuales y adaptativas; a falta de normas adecuadas, se apoya en indicadores conductuales cuidadosamente recogidos',
      '6a00_0.exclude_acquired_decline':
        'Las limitaciones no se explican por un trastorno neurocognitivo adquirido solo después del período de desarrollo (p. ej., demencia, lesión cerebral adquirida)',
      '6a00_0.exclude_sensory_deprivation':
        'El nivel de funcionamiento no se explica únicamente por un déficit sensorial no corregido, otro trastorno mental, o por privación social o falta de escolarización',
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
      '6a00_1.functioning': 'Capacidad intelectual alterada con inicio durante el período de desarrollo',
      '6a00_1.adaptive_domains': 'Limitación del comportamiento adaptativo en los tres dominios (perfil específico del grado de gravedad)',
      '6a00_1.assessment': 'Determinación del grado de gravedad y establecimiento diagnóstico',
      '6a00_1.exclusions': 'Exclusiones / diagnóstico diferencial',
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
      '6a00_1.intellectual_functioning':
        'Limitación significativa de la capacidad intelectual general, preferiblemente acreditada mediante pruebas estandarizadas, de administración individual y normalizadas, aproximadamente dos o más desviaciones estándar por debajo de la media (o mediante indicadores conductuales cuando no se dispone de normas adecuadas)',
      '6a00_1.developmental_onset':
        'Inicio durante el período de desarrollo: las limitaciones están presentes desde la infancia y no representan un deterioro del rendimiento adquirido solo más tarde',
      '6a00_1.conceptual_domain':
        'Dominio conceptual: desarrollo claramente enlentecido del lenguaje y de las habilidades académicas, que suelen permanecer en un nivel elemental; se requiere apoyo continuo para casi todas las exigencias conceptuales de la vida diaria',
      '6a00_1.social_domain':
        'Dominio social: diferencias marcadas en el comportamiento social y comunicativo respecto a los pares; el lenguaje es más simple y concreto; son posibles relaciones con personas de referencia familiares, pero el juicio social y la toma de decisiones están marcadamente limitados',
      '6a00_1.practical_domain':
        'Dominio práctico: el autocuidado es en gran medida aprendible tras una práctica prolongada; son posibles actividades sencillas y supervisadas; se requiere apoyo continuo y estructuración de la vida diaria',
      '6a00_1.severity_by_adaptive':
        'La asignación del grado de gravedad se basa en el perfil del comportamiento adaptativo en los tres dominios (conceptual, social, práctico) y no en una única puntuación de CI',
      '6a00_1.standardized_or_behavioural':
        'Cuando es posible, el diagnóstico se establece mediante instrumentos estandarizados, culturalmente equitativos y normalizados para las funciones intelectuales y adaptativas; a falta de normas adecuadas, se apoya en indicadores conductuales cuidadosamente recogidos',
      '6a00_1.exclude_acquired_decline':
        'Las limitaciones no se explican por un trastorno neurocognitivo adquirido solo después del período de desarrollo (p. ej., demencia, lesión cerebral adquirida)',
      '6a00_1.exclude_sensory_deprivation':
        'El nivel de funcionamiento no se explica únicamente por un déficit sensorial no corregido, otro trastorno mental, o por privación social o falta de escolarización',
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
      '6a00_2.functioning': 'Capacidad intelectual alterada con inicio durante el período de desarrollo',
      '6a00_2.adaptive_domains': 'Limitación del comportamiento adaptativo en los tres dominios (perfil específico del grado de gravedad)',
      '6a00_2.assessment': 'Determinación del grado de gravedad y establecimiento diagnóstico',
      '6a00_2.exclusions': 'Exclusiones / diagnóstico diferencial',
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
      '6a00_2.intellectual_functioning':
        'Limitación significativa de la capacidad intelectual general, preferiblemente acreditada mediante pruebas estandarizadas, de administración individual y normalizadas, aproximadamente dos o más desviaciones estándar por debajo de la media (o mediante indicadores conductuales cuando no se dispone de normas adecuadas)',
      '6a00_2.developmental_onset':
        'Inicio durante el período de desarrollo: las limitaciones están presentes desde la infancia y no representan un deterioro del rendimiento adquirido solo más tarde',
      '6a00_2.conceptual_domain':
        'Dominio conceptual: comprensión muy limitada del lenguaje escrito y de los conceptos de número, tiempo y dinero; adquisición solo rudimentaria del lenguaje, con palabras aisladas o enunciados breves',
      '6a00_2.social_domain':
        'Dominio social: el lenguaje hablado está gravemente limitado (palabras aisladas o frases sencillas) y la comunicación se centra en el aquí y ahora inmediato; las relaciones sociales se dan sobre todo a través de personas de referencia familiares',
      '6a00_2.practical_domain':
        'Dominio práctico: se requiere apoyo para casi todas las actividades de la vida diaria, incluidas comer, vestirse y la higiene personal; se requieren supervisión y atención continuas',
      '6a00_2.severity_by_adaptive':
        'La asignación del grado de gravedad se basa en el perfil del comportamiento adaptativo en los tres dominios (conceptual, social, práctico) y no en una única puntuación de CI',
      '6a00_2.standardized_or_behavioural':
        'Cuando es posible, el diagnóstico se establece mediante instrumentos estandarizados, culturalmente equitativos y normalizados para las funciones intelectuales y adaptativas; a falta de normas adecuadas, se apoya en indicadores conductuales cuidadosamente recogidos',
      '6a00_2.exclude_acquired_decline':
        'Las limitaciones no se explican por un trastorno neurocognitivo adquirido solo después del período de desarrollo (p. ej., demencia, lesión cerebral adquirida)',
      '6a00_2.exclude_sensory_deprivation':
        'El nivel de funcionamiento no se explica únicamente por un déficit sensorial no corregido, otro trastorno mental, o por privación social o falta de escolarización',
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
      '6a00_3.functioning': 'Capacidad intelectual alterada con inicio durante el período de desarrollo',
      '6a00_3.adaptive_domains': 'Limitación del comportamiento adaptativo en los tres dominios (perfil específico del grado de gravedad)',
      '6a00_3.assessment': 'Determinación del grado de gravedad y establecimiento diagnóstico',
      '6a00_3.exclusions': 'Exclusiones / diagnóstico diferencial',
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
      '6a00_3.intellectual_functioning':
        'Limitación significativa de la capacidad intelectual general, preferiblemente acreditada mediante pruebas estandarizadas, de administración individual y normalizadas, aproximadamente dos o más desviaciones estándar por debajo de la media (o mediante indicadores conductuales cuando no se dispone de normas adecuadas)',
      '6a00_3.developmental_onset':
        'Inicio durante el período de desarrollo: las limitaciones están presentes desde la infancia y no representan un deterioro del rendimiento adquirido solo más tarde',
      '6a00_3.conceptual_domain':
        'Dominio conceptual: los conceptos simbólicos y lingüísticos permanecen en gran medida inaccesibles; la comprensión se limita a aspectos simples y concretos del entorno inmediato',
      '6a00_3.social_domain':
        'Dominio social: comprensión muy limitada de la comunicación verbal o gestual; las necesidades se expresan principalmente de forma no verbal; las alteraciones sensoriales y motoras concomitantes restringen aún más la interacción social',
      '6a00_3.practical_domain':
        'Dominio práctico: dependencia completa de los demás en todas las áreas del cuidado físico, la salud y la seguridad; con frecuencia acompañada de alteraciones motoras y sensoriales graves',
      '6a00_3.severity_by_adaptive':
        'La asignación del grado de gravedad se basa en el perfil del comportamiento adaptativo en los tres dominios (conceptual, social, práctico) y no en una única puntuación de CI',
      '6a00_3.standardized_or_behavioural':
        'Cuando es posible, el diagnóstico se establece mediante instrumentos estandarizados, culturalmente equitativos y normalizados para las funciones intelectuales y adaptativas; a falta de normas adecuadas, se apoya en indicadores conductuales cuidadosamente recogidos',
      '6a00_3.exclude_acquired_decline':
        'Las limitaciones no se explican por un trastorno neurocognitivo adquirido solo después del período de desarrollo (p. ej., demencia, lesión cerebral adquirida)',
      '6a00_3.exclude_sensory_deprivation':
        'El nivel de funcionamiento no se explica únicamente por un déficit sensorial no corregido, otro trastorno mental, o por privación social o falta de escolarización',
    },
  },
}
