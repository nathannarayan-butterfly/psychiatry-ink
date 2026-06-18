import type { DisorderTranslationMap } from '../types'

/** ES translations — ICD-10 F9 block. */
export const esChildhoodOnset: DisorderTranslationMap = {
  hyperkinetic_disorder_adhd: {
    name: 'Trastorno hipercinético (TDAH)',
    differentials: [
      'Vivacidad propia de la edad / exigencias inadecuadas',
      'Trastorno de ansiedad o depresivo con quejas de concentración o inquietud',
      'Trastorno específico del aprendizaje o del lenguaje',
      'Trastorno del espectro autista',
      'Trastorno del apego / sobrecarga psicosocial',
      'Efecto de una sustancia o causa somática (p. ej., tiroides, trastorno del sueño)',
    ],
    groups: {
      'f90.inattention': 'Inatención (varias características, en distintas situaciones)',
      'f90.hyperactivity_impulsivity':
        'Hiperactividad e impulsividad (varias características, en distintas situaciones)',
      'f90.qualifiers': 'Inicio, persistencia y afectación',
      'f90.exclusions': 'Exclusiones / diagnóstico diferencial',
      '6a05.inattention': 'Dimensión de inatención (varias características, en distintas situaciones)',
      '6a05.hyperactivity_impulsivity':
        'Dimensión de hiperactividad/impulsividad (varias características, en distintas situaciones)',
      '6a05.presentation': 'Presentación (forma clínica)',
      '6a05.qualifiers': 'Inicio en el desarrollo, persistencia y afectación',
      '6a05.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f90.short_attention':
        'Las tareas o actividades de juego se interrumpen con frecuencia de forma prematura; la atención solo puede mantenerse durante poco tiempo',
      'f90.distractibility':
        'Fácil distractibilidad ante estímulos externos; dificultad para prestar atención a los detalles y aparente no escuchar',
      'f90.disorganization':
        'Dificultades para organizar las tareas; pérdida frecuente de objetos y evitación del esfuerzo mental sostenido',
      'f90.motor_overactivity':
        'Hiperactividad motora persistente (inquietud, levantarse en situaciones en las que se espera permanecer sentado, desasosiego constante)',
      'f90.restless_noisy':
        'Correr, trepar o hacer ruido de forma excesiva, así como dificultad para entretenerse en el tiempo libre de manera tranquila',
      'f90.impulsivity':
        'Comportamiento impulsivo: precipitarse en las respuestas, dificultad para esperar o aguardar su turno, interrumpir o molestar a los demás con frecuencia',
      'f90.early_onset':
        'Las alteraciones comenzaron en la primera infancia (del orden de antes de la edad escolar media) y persisten durante varios meses',
      'f90.pervasiveness':
        'Los síntomas aparecen en distintas situaciones (p. ej., en casa y en la escuela/centro de atención), no solo en un único entorno',
      'f90.functional_impact':
        'Los síntomas conducen a una afectación notable en áreas escolares, sociales o familiares del funcionamiento',
      'f90.exclude_pervasive_affective':
        'La sintomatología no se explica mejor por un trastorno generalizado del desarrollo, un trastorno afectivo o un trastorno de ansiedad',
      '6a05.inattention_sustaining':
        'Dificultad para mantener la atención en tareas que no resultan muy estimulantes o que no ofrecen una recompensa inmediata; las actividades a menudo no se llevan a término',
      '6a05.inattention_distractible':
        'Fácil distractibilidad ante estímulos externos, errores por descuido debidos a una atención insuficiente a los detalles y aparente no escuchar durante una conversación directa',
      '6a05.inattention_organization':
        'Dificultad para organizar tareas y actividades, pérdida frecuente de objetos, olvidos en la vida cotidiana y evitación del esfuerzo mental sostenido',
      '6a05.hi_motor':
        'Hiperactividad motora persistente: inquietud, levantarse del asiento o desasosiego en situaciones en las que se espera un comportamiento tranquilo',
      '6a05.hi_restless':
        'Inquietud interior o sensación de estar impulsado como por un motor, dificultad para entretenerse de forma tranquila y habla excesiva',
      '6a05.hi_impulsive':
        'Actuación impulsiva sin considerar las posibles consecuencias: precipitarse en las respuestas, dificultad para esperar e interrumpir o molestar a los demás con frecuencia',
      '6a05.presentation_inattentive':
        'Presentación predominantemente inatenta: predominan claramente las características de inatención',
      '6a05.presentation_hyperactive':
        'Presentación predominantemente hiperactiva-impulsiva: predominan claramente las características de hiperactividad/impulsividad',
      '6a05.presentation_combined':
        'Presentación combinada: las características de ambas dimensiones están presentes conjuntamente en un grado clínicamente significativo',
      '6a05.developmental_onset':
        'Inicio de los síntomas durante el período de desarrollo, típicamente antes de los 12 años aproximadamente (más amplio que la exigencia de la CIE-10 de un inicio muy temprano)',
      '6a05.persistence':
        'Los síntomas se mantienen durante un período prolongado (del orden de ≥ 6 meses)',
      '6a05.pervasiveness':
        'Los síntomas aparecen en distintas situaciones y ámbitos de la vida (p. ej., en casa, en la escuela/formación/trabajo y en las relaciones sociales)',
      '6a05.impairment':
        'Los síntomas conducen a una afectación notable en áreas escolares, laborales, sociales u otras áreas importantes del funcionamiento',
      '6a05.exclude_other':
        'Los síntomas no se explican mejor por otro trastorno mental (p. ej., trastorno de ansiedad, afectivo o del espectro autista) ni por el efecto de una sustancia',
    },
  },
  conduct_disorder: {
    name: 'Trastorno disocial',
    differentials: [
      'Fases oposicionistas propias de la edad sin patrón persistente',
      'Trastorno hipercinético (TDAH) con conflictos secundarios',
      'Trastorno de adaptación tras una sobrecarga aguda',
      'Trastorno afectivo con irritabilidad',
      'Cambio de comportamiento inducido por sustancias',
      'Trastorno disocial y de las emociones mixto (F92)',
    ],
    groups: {
      'f91.core_pattern':
        'Patrón de comportamiento disocial/agresivo repetido y persistente (al menos varias características)',
      'f91.qualifiers': 'Duración y afectación',
      'f91.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f91.aggression_people':
        'Comportamiento agresivo hacia personas o animales (p. ej., amenazas, intimidación, peleas físicas, crueldad)',
      'f91.destruction_property':
        'Destrucción deliberada de bienes ajenos, incluidos los incendios provocados',
      'f91.deceit_theft':
        'Engaño, mentiras o robo (p. ej., allanamiento, hurto sin confrontación, mentiras reiteradas para obtener un beneficio)',
      'f91.serious_rule_violations':
        'Infracciones graves de las normas (p. ej., absentismo escolar reiterado antes de los 13 años, ausencias nocturnas, fugas del hogar)',
      'f91.defiance':
        'Comportamiento persistentemente rebelde, desafiante o provocador hacia las figuras de autoridad, que excede las fases de oposición propias de la edad',
      'f91.duration':
        'El patrón de comportamiento se mantiene de forma persistente (del orden de ≥ 6 meses) y no se limita a un único episodio',
      'f91.functional_impact':
        'El comportamiento afecta de forma notable al funcionamiento social, escolar o familiar',
      'f91.exclude_other_primary':
        'El comportamiento no se explica exclusivamente en el marco de otro trastorno prioritario (p. ej., trastorno afectivo, psicosis)',
    },
  },
  mixed_conduct_emotional_disorder: {
    name: 'Trastorno disocial y de las emociones combinado',
    differentials: [
      'Trastorno disocial puro (F91) sin quejas emocionales',
      'Trastorno emocional/depresivo puro sin comportamiento disocial',
      'Trastorno hipercinético con conflictos secundarios',
      'Trastorno de adaptación',
    ],
    groups: {
      'f92.conduct': 'Patrón de comportamiento disocial/agresivo',
      'f92.emotional': 'Sintomatología emocional adicional',
    },
    criteria: {
      'f92.conduct_pattern':
        'Existe un patrón persistente de comportamiento disocial, agresivo o rebelde (correspondiente a un trastorno disocial)',
      'f92.depressive_symptoms':
        'Al mismo tiempo, síntomas depresivos notables (p. ej., estado de ánimo abatido, anhedonia, retraimiento)',
      'f92.anxiety_symptoms':
        'Al mismo tiempo, síntomas notables de ansiedad, preocupación u otros síntomas emocionales',
    },
  },
  separation_anxiety_disorder: {
    name: 'Ansiedad de separación de la infancia',
    differentials: [
      'Ansiedad de separación propia de la edad (p. ej., en la primera infancia)',
      'Ansiedad generalizada de la infancia',
      'Fobia específica o social',
      'Evitación escolar en el marco de otros trastornos',
      'Trastorno depresivo con retraimiento',
    ],
    groups: {
      'f93_0.core': 'Ansiedad irreal y persistente ante la separación de las figuras de referencia',
      'f93_0.qualifiers': 'Inicio y afectación',
      '6b05.core':
        'Miedo o ansiedad marcados e inadecuados al desarrollo ante la separación de las figuras de apego',
      '6b05.qualifiers': 'Inicio a lo largo de la vida, duración y afectación',
    },
    criteria: {
      'f93_0.worry_harm':
        'Preocupación persistente e irreal de que a una figura de referencia principal le pueda ocurrir algo o de que se vaya y no regrese',
      'f93_0.refusal_separation':
        'Negativa o resistencia persistente a ir a la escuela/centro de atención sin la figura de referencia, a estar solo o a dormir solo',
      'f93_0.somatic_on_separation':
        'Quejas físicas reiteradas (p. ej., dolor abdominal, cefalea, náuseas) o malestar acusado ante una separación real o inminente',
      'f93_0.onset_childhood':
        'Inicio de la sintomatología en la infancia; la ansiedad excede claramente el grado esperable para el nivel de desarrollo',
      'f93_0.functional_impact':
        'La ansiedad de separación afecta de forma notable a la vida cotidiana, la asistencia escolar o las actividades sociales',
      '6b05.worry_harm':
        'Preocupación persistente y excesiva por el bienestar o la posible pérdida de figuras de apego específicas (p. ej., miedo a un accidente, enfermedad o muerte)',
      '6b05.reluctance_separation':
        'Resistencia o negativa persistente a alejarse de las figuras de apego (p. ej., escuela, trabajo, salir, estar solo o dormir sin la figura de apego)',
      '6b05.somatic_distress':
        'Quejas físicas reiteradas o malestar emocional acusado ante una separación real o anticipada de la figura de apego',
      '6b05.lifespan_onset':
        'La sintomatología puede comenzar en la infancia pero, en la CIE-11, también puede surgir o persistir explícitamente por primera vez en la adolescencia o la edad adulta (no se limita a la infancia)',
      '6b05.developmentally_inappropriate':
        'El miedo/la ansiedad es inadecuado al desarrollo o al contexto y excede claramente lo esperable para la edad o la situación',
      '6b05.duration':
        'Los síntomas se mantienen durante un período prolongado (del orden de varios meses)',
      '6b05.functional_impact':
        'La ansiedad de separación conduce a una afectación notable en áreas personales, familiares, sociales, escolares, laborales u otras áreas importantes del funcionamiento',
    },
  },
  selective_mutism: {
    name: 'Mutismo electivo (selectivo)',
    differentials: [
      'Trastorno específico del desarrollo del lenguaje',
      'Trastorno del espectro autista',
      'Trastorno de ansiedad social',
      'Enmudecimiento transitorio en migración/multilingüismo (período de adaptación)',
      'Ansiedad de separación',
    ],
    groups: {
      'f94_0.core': 'Rechazo a hablar ligado a la situación, con capacidad lingüística conservada',
      'f94_0.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f94_0.situational_mutism':
        'Incapacidad persistente para hablar en determinadas situaciones sociales (p. ej., en la escuela), mientras que en otras situaciones de confianza se habla con normalidad',
      'f94_0.language_intact':
        'La comprensión del lenguaje y la capacidad básica de hablar están conservadas (no existe un defecto primario del lenguaje)',
      'f94_0.duration':
        'El enmudecimiento se mantiene durante un período prolongado (del orden de ≥ 1 mes) y no se limita al primer período de adaptación',
      'f94_0.functional_impact':
        'El rechazo a hablar afecta de forma notable al rendimiento escolar o a la comunicación social',
      'f94_0.exclude_language_asd':
        'El enmudecimiento no se explica de forma suficiente por un trastorno del desarrollo del lenguaje, un trastorno del espectro autista o un conocimiento insuficiente de la lengua hablada',
    },
  },
  reactive_attachment_disorder: {
    name: 'Trastorno reactivo del apego de la infancia',
    differentials: [
      'Trastorno del espectro autista',
      'Discapacidad intelectual con retraso del desarrollo',
      'Trastorno depresivo de la infancia',
      'Trastorno del apego con desinhibición (F94.2)',
      'Trastorno de estrés postraumático',
    ],
    groups: {
      'f94_1.core': 'Comportamiento de apego persistentemente inhibido y ambivalente',
      'f94_1.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f94_1.inhibited_attachment':
        'Comportamiento sistemáticamente inhibido y emocionalmente retraído hacia las figuras de referencia; ante el malestar, el niño apenas busca consuelo o no responde a él',
      'f94_1.emotional_disturbance':
        'Alteraciones emocionales acompañantes (p. ej., temor, cautela excesiva, respuesta positiva limitada, irritabilidad o tristeza)',
      'f94_1.pathogenic_care':
        'Antecedentes de cuidados insuficientes, negligentes o cambiantes (atención patógena) como trasfondo plausible',
      'f94_1.onset_early':
        'Inicio en los primeros años de vida (del orden de antes de los 5 años)',
      'f94_1.exclude_asd':
        'El cuadro no cumple los criterios de un trastorno del espectro autista y no se explica únicamente por una discapacidad intelectual',
    },
  },
  disinhibited_attachment_disorder: {
    name: 'Trastorno del apego con desinhibición',
    differentials: [
      'Trastorno hipercinético (TDAH) con falta de distancia',
      'Trastorno del espectro autista',
      'Trastorno reactivo del apego (tipo inhibido, F94.1)',
      'Sociabilidad propia de la edad',
    ],
    groups: {
      'f94_2.core': 'Comportamiento de apego/social difuso e indiscriminadamente carente de distancia',
    },
    criteria: {
      'f94_2.indiscriminate_friendliness':
        'Comportamiento indiscriminadamente amistoso y carente de distancia hacia desconocidos, con ausencia de la reserva propia de la edad; el niño se aleja de las figuras de referencia sin buscar seguridad',
      'f94_2.lack_selectivity':
        'Ausencia de un apego selectivo: el niño apenas distingue entre las figuras de referencia conocidas y los desconocidos, y ante el malestar busca consuelo de forma indiscriminada',
      'f94_2.pathogenic_care':
        'Antecedentes de cuidados insuficientes o con cambios frecuentes (p. ej., cambios reiterados de figura de referencia) como trasfondo plausible',
    },
  },
  tic_disorders: {
    name: 'Trastornos por tics (incl. síndrome de Tourette)',
    differentials: [
      'Estereotipias (rítmicas, influenciables voluntariamente, sin sensación premonitoria)',
      'Compulsiones (dirigidas a un fin, reductoras de la ansiedad)',
      'Mioclonías u otros trastornos neurológicos del movimiento',
      'Trastorno del movimiento inducido por medicamentos/sustancias',
      'Movimientos de origen comicial',
    ],
    groups: {
      'f95.core': 'Tics involuntarios y recurrentes',
      'f95.qualifiers': 'Curso e inicio',
      'f95.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f95.motor_tics':
        'Movimientos motores súbitos, rápidos, recurrentes y no rítmicos (p. ej., parpadeo, sacudidas de la cabeza, muecas) que se producen de forma involuntaria',
      'f95.vocal_tics':
        'Vocalizaciones súbitas y recurrentes (p. ej., carraspeo, gruñidos, sonidos o palabras) que se producen de forma involuntaria',
      'f95.onset_childhood':
        'Inicio en la infancia o la adolescencia (del orden de antes de los 18 años)',
      'f95.duration':
        'Los tics se mantienen durante un período prolongado (para un síndrome de Tourette: tics motores y vocales combinados durante el orden de ≥ 1 año)',
      'f95.exclude_secondary':
        'Los tics no se deben a otra enfermedad neurológica ni al efecto de una sustancia/medicación',
    },
  },
  nonorganic_enuresis: {
    name: 'Enuresis no orgánica',
    differentials: [
      'Causa orgánica (infección urinaria, diabetes, malformación de las vías urinarias)',
      'Trastorno neurológico de la función vesical',
      'Efecto de sustancias/medicamentos (p. ej., diuréticos)',
      'Desarrollo del control de esfínteres propio de la edad, aún no completado',
    ],
    groups: {
      'f98_0.core': 'Emisión involuntaria de orina más allá de la edad de desarrollo',
      'f98_0.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f98_0.involuntary_voiding':
        'Emisión involuntaria de orina repetida (diurna o nocturna) en un niño cuya edad de desarrollo haría esperar el control vesical (del orden de a partir de aproximadamente los 5 años)',
      'f98_0.frequency_duration':
        'El episodio de enuresis aparece con una frecuencia relevante durante un período prolongado (del orden de varios meses)',
      'f98_0.exclude_organic':
        'La enuresis no se explica por una enfermedad física (p. ej., infección urinaria, diabetes, anomalía anatómica) ni por el efecto de una sustancia',
    },
  },
  nonorganic_encopresis: {
    name: 'Encopresis no orgánica',
    differentials: [
      'Causa orgánica (estreñimiento crónico con encopresis por rebosamiento, enfermedad anorrectal)',
      'Enfermedad neurológica',
      'Efecto de sustancias/medicamentos (p. ej., laxantes)',
      'Desarrollo del control de esfínteres propio de la edad, aún no completado',
    ],
    groups: {
      'f98_1.core':
        'Deposición de heces en lugares inapropiados más allá de la edad de desarrollo',
      'f98_1.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f98_1.inappropriate_defecation':
        'Deposición repetida, voluntaria o involuntaria, de heces en lugares no destinados a ello en un niño cuya edad de desarrollo haría esperar el control intestinal (del orden de a partir de aproximadamente los 4 años)',
      'f98_1.frequency_duration':
        'El episodio de encopresis aparece con una frecuencia relevante durante un período prolongado (del orden de varios meses)',
      'f98_1.exclude_organic':
        'La encopresis no se explica de forma suficiente por una enfermedad física (salvo un estreñimiento funcional) ni por el efecto de una sustancia',
    },
  },
  feeding_disorder_childhood: {
    name: 'Trastorno de la alimentación en la primera infancia',
    differentials: [
      'Causa orgánica (enfermedad gastrointestinal, trastorno de la deglución, alergia)',
      'Retraso del crecimiento de otra etiología',
      'Negligencia / oferta insuficiente de alimentos',
      'Trastorno del espectro autista con conducta alimentaria selectiva',
    ],
    groups: {
      'f98_2.core': 'Problemática persistente de alimentación en la primera infancia',
      'f98_2.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f98_2.feeding_refusal':
        'Rechazo persistente de los alimentos o conducta alimentaria marcadamente selectiva pese a una oferta suficiente de alimentos y sin una explicación orgánica adecuada',
      'f98_2.weight_impact':
        'Ausencia del aumento de peso esperable o pérdida de peso durante un período prolongado (del orden de ≥ 1 mes)',
      'f98_2.exclude_organic':
        'La problemática no se explica de forma suficiente por una enfermedad física ni por una oferta insuficiente de alimentos',
    },
  },
  stereotyped_movement_disorder: {
    name: 'Trastorno de movimientos estereotipados',
    differentials: [
      'Trastorno por tics (súbitos, no rítmicos, con sensación premonitoria)',
      'Compulsiones',
      'Trastorno del espectro autista (estereotipias como rasgo parcial)',
      'Trastorno neurológico del movimiento',
      'Trastorno del movimiento inducido por sustancias/medicamentos',
    ],
    groups: {
      'f98_4.core': 'Movimientos repetitivos, rítmicos y aparentemente sin finalidad',
      'f98_4.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f98_4.stereotypies':
        'Movimientos de apariencia voluntaria, repetidos, rítmicos y no funcionales (p. ej., balanceo del cuerpo, golpeo de la cabeza, estereotipias de manos/dedos)',
      'f98_4.onset_persistence':
        'Inicio en el desarrollo temprano; los movimientos se mantienen durante un período prolongado (del orden de varios meses)',
      'f98_4.impact':
        'Las estereotipias afectan a la vida cotidiana o a las actividades sociales, o bien (en su forma autolesiva) provocan daño físico',
      'f98_4.exclude_tic_neuro':
        'Los movimientos no son tics y no se deben a una enfermedad neurológica ni al efecto de una sustancia/medicamento',
    },
  },
}
