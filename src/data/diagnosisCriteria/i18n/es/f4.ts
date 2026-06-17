import type { DisorderTranslationMap } from '../types'

/** ES translations — ICD-10 F4 block. */
export const esF4: DisorderTranslationMap = {
  generalized_anxiety_disorder: {
    name: 'Trastorno de ansiedad generalizada',
    differentials: [
      'Trastorno de pánico',
      'Trastorno de ansiedad social / fobia',
      'Episodio depresivo con componente ansioso',
      'Ansiedad inducida por sustancias o cafeína, hipertiroidismo',
    ],
    groups: {
      'f41_1.core': 'Núcleo: ansiedad persistente y de libre flotación',
      'f41_1.associated': 'Síntomas vegetativos/de tensión (al menos 3)',
      'f41_1.exclusions': 'Exclusiones',
    },
    criteria: {
      'f41_1.persistent_worry':
        'Tensión, preocupación y aprensión generalizadas y de libre flotación (no ligadas a situaciones) en relación con acontecimientos y problemas cotidianos, presentes la mayoría de los días',
      'f41_1.duration':
        'Las molestias persisten durante un período de al menos varios meses (del orden de ≥ 6 meses)',
      'f41_1.restlessness':
        'Inquietud, tensión interna o incapacidad para relajarse («estar en vilo»)',
      'f41_1.fatigue': 'Fatigabilidad fácil',
      'f41_1.concentration':
        'Dificultades de concentración o sensación de «tener la mente en blanco»',
      'f41_1.irritability': 'Irritabilidad persistente o labilidad afectiva',
      'f41_1.muscle_tension':
        'Tensión o dolores musculares y otros síntomas corporales de tensión',
      'f41_1.sleep':
        'Dificultad para conciliar o mantener el sueño a causa de las preocupaciones o la tensión',
      'f41_1.autonomic':
        'Hiperexcitabilidad vegetativa (p. ej. palpitaciones, sudoración, mareo, sequedad de boca, molestias gastrointestinales)',
      'f41_1.exclude_substance_medical':
        'La ansiedad se explica mejor por una enfermedad somática (p. ej. hipertiroidismo) o por el efecto de una sustancia psicótropa',
      'f41_1.exclude_panic_primary':
        'Las molestias no se limitan exclusivamente a crisis de pánico delimitables (F41.0) ni a situaciones fóbicas (F40.-)',
    },
  },
  panic_disorder: {
    name: 'Trastorno de pánico',
    differentials: [
      'Trastorno de ansiedad generalizada',
      'Agorafobia / fobia específica',
      'Causa cardíaca o endocrina (p. ej. hipertiroidismo, arritmia)',
      'Pánico inducido por sustancias/cafeína',
    ],
    groups: {
      'f41_0.core': 'Núcleo: crisis de pánico recurrentes e inesperadas',
      'f41_0.autonomic': 'Síntomas vegetativos de la crisis (al menos 3)',
      'f41_0.exclusions': 'Exclusiones',
    },
    criteria: {
      'f41_0.recurrent_attacks':
        'Crisis de pánico graves y recurrentes que no se limitan de forma constante a una situación específica ni a un objeto determinado y que a menudo aparecen de forma espontánea',
      'f41_0.anticipatory_worry':
        'Preocupación persistente, entre las crisis, por la aparición de nuevas crisis o por sus consecuencias (ansiedad anticipatoria)',
      'f41_0.palpitations':
        'Palpitaciones, sensación de latidos irregulares o aceleración del ritmo cardíaco',
      'f41_0.sweating_trembling': 'Sudoración, temblores o sacudidas',
      'f41_0.dyspnea':
        'Disnea, sensación de ahogo o de atragantamiento u opresión torácica',
      'f41_0.dizziness':
        'Mareo, aturdimiento, sensación de inestabilidad o de desmayo',
      'f41_0.depersonalization':
        'Vivencias de extrañeza (despersonalización o desrealización) durante la crisis',
      'f41_0.fear_dying':
        'Miedo a morir, a perder el control o a «volverse loco»',
      'f41_0.exclude_organic_substance':
        'Las crisis no son consecuencia de un trastorno somático, de un trastorno mental orgánico ni de otro trastorno mental',
    },
  },
  agoraphobia: {
    name: 'Agorafobia',
    differentials: [
      'Trastorno de pánico sin ligazón situacional',
      'Trastorno de ansiedad social (evitación de la valoración social en lugar de la imposibilidad de huir)',
      'Episodio depresivo con retraimiento social',
      'Causa somática de mareo/síncope',
    ],
    groups: {
      'f40_0.core': 'Núcleo: ansiedad en situaciones agorafóbicas con evitación',
      'f40_0.autonomic': 'Síntomas vegetativos de ansiedad en las situaciones (al menos 2)',
      'f40_0.exclusions': 'Exclusiones',
    },
    criteria: {
      'f40_0.situational_fear':
        'Ansiedad marcada y recurrente en situaciones en las que escapar resulta difícil o embarazoso, o en las que la ayuda no estaría disponible (p. ej. multitudes, lugares públicos, viajes, salir solo de casa)',
      'f40_0.avoidance':
        'Las situaciones temidas se evitan o solo se soportan con notable malestar o únicamente en compañía',
      'f40_0.palpitations':
        'Palpitaciones, aceleración del ritmo cardíaco o sensación de latidos irregulares',
      'f40_0.dizziness': 'Mareo, aturdimiento o sensación de desmayo inminente',
      'f40_0.sweating_trembling': 'Sudoración, temblores o sacudidas',
      'f40_0.fear_losing_control':
        'Miedo a morir, a perder el control o a «volverse loco»',
      'f40_0.exclude_organic':
        'Los síntomas de ansiedad no se explican mejor por una enfermedad somática, el efecto de una sustancia o una sintomatología delirante u obsesiva',
    },
  },
  social_anxiety_disorder: {
    name: 'Trastorno de ansiedad social (fobia social)',
    differentials: [
      'Agorafobia (temor a la imposibilidad de huir, no a la valoración)',
      'Trastorno de pánico con crisis independientes de la situación',
      'Trastorno de la personalidad esquizoide o ansiosa por evitación',
      'Trastorno del espectro autista con afectación social',
    ],
    groups: {
      'f40_1.core': 'Núcleo: temor a la valoración social',
      'f40_1.autonomic': 'Síntomas corporales acompañantes característicos (al menos 1)',
      'f40_1.exclusions': 'Exclusiones',
    },
    criteria: {
      'f40_1.fear_scrutiny':
        'Temor o tensión marcados en situaciones sociales en las que la persona es el centro de atención o podría ser observada/evaluada de forma escrutadora por otros (p. ej. hablar ante grupos, comer en público)',
      'f40_1.fear_of_embarrassment':
        'Temor a comportarse de forma embarazosa o vergonzosa o a llamar la atención de manera negativa',
      'f40_1.avoidance':
        'Evitación de las situaciones sociales temidas, o su tolerancia solo con notable ansiedad',
      'f40_1.blushing':
        'Rubor, temblor de manos, náuseas o urgencia miccional en la situación social',
      'f40_1.exclude_other':
        'Los síntomas no son expresión de un delirio ni de un trastorno obsesivo-compulsivo y no se explican mejor por otro trastorno mental o somático',
    },
  },
  specific_phobia: {
    name: 'Fobia específica (aislada)',
    differentials: [
      'Agorafobia (varios desencadenantes situacionales, tema de la huida)',
      'Trastorno de ansiedad social (temor a la valoración)',
      'Trastorno obsesivo-compulsivo (evitación por temores obsesivos)',
      'Trastorno de estrés postraumático (desencadenantes asociados al trauma)',
    ],
    groups: {
      'f40_2.core': 'Núcleo: ansiedad circunscrita a un objeto/situación',
      'f40_2.exclusions': 'Exclusiones',
    },
    criteria: {
      'f40_2.circumscribed_fear':
        'Ansiedad marcada y persistente limitada a un objeto o una situación determinados (p. ej. animales, alturas, oscuridad, visión de sangre/heridas, viajes en avión, espacios cerrados)',
      'f40_2.avoidance':
        'El objeto o la situación fóbica se evita, o provoca de inmediato una ansiedad intensa al confrontarla',
      'f40_2.exclude_other':
        'La ansiedad no forma parte de un síndrome fóbico, delirante u obsesivo más amplio y no se explica mejor de otro modo',
    },
  },
  mixed_anxiety_depressive_disorder: {
    name: 'Trastorno mixto ansioso-depresivo',
    differentials: [
      'Episodio depresivo (cuando se cumplen plenamente los criterios de depresión)',
      'Trastorno de ansiedad generalizada (cuando se cumplen plenamente los criterios de ansiedad)',
      'Trastorno de adaptación con reacción mixta ansiosa y depresiva',
      'Distimia',
    ],
    groups: {
      'f41_2.core':
        'Núcleo: síntomas ansiosos y depresivos simultáneos por debajo de los criterios completos',
      'f41_2.exclusions': 'Exclusiones',
    },
    criteria: {
      'f41_2.anxiety_symptoms':
        'Presencia de síntomas de ansiedad (p. ej. preocupaciones, tensión, hiperexcitabilidad vegetativa)',
      'f41_2.depressive_symptoms':
        'Simultáneamente síntomas depresivos (p. ej. ánimo deprimido, anhedonia, disminución del impulso)',
      'f41_2.subthreshold':
        'Ni la sintomatología ansiosa ni la depresiva alcanzan por sí solas el cuadro completo de un trastorno ansioso o depresivo independiente',
      'f41_2.exclude_full_syndrome':
        'No existe un episodio depresivo o un trastorno de ansiedad plenamente desarrollado que debiera codificarse de forma prioritaria',
    },
  },
  obsessive_compulsive_disorder: {
    name: 'Trastorno obsesivo-compulsivo',
    differentials: [
      'Trastorno de ansiedad generalizada (preocupaciones realistas en lugar de obsesiones egodistónicas)',
      'Trastorno delirante (ausencia de introspección, sin intentos de resistencia)',
      'Trastorno de la personalidad obsesivo-compulsiva (anancástica)',
      'Trastornos por tics / síndrome de Tourette',
    ],
    groups: {
      'f42.core':
        'Núcleo: obsesiones y/o compulsiones durante la mayor parte del tiempo ≥ 2 semanas',
      'f42.features': 'Rasgos característicos (al menos 1)',
      'f42.exclusions': 'Exclusiones',
    },
    criteria: {
      'f42.obsessions':
        'Pensamientos, imágenes o impulsos recurrentes e intrusivos, vividos como propios pero absurdos/angustiantes, a los que la persona intenta oponer resistencia',
      'f42.compulsions':
        'Conductas repetidas o rituales mentales (p. ej. lavarse, comprobar, contar, ordenar) que se realizan para evitar una consecuencia temida o aliviar la tensión',
      'f42.distress_interference':
        'Las compulsiones consumen tiempo (p. ej. más de una hora diaria) o causan malestar marcado o deterioro en la vida cotidiana',
      'f42.egodystonic':
        'Al menos una obsesión o compulsión se reconoce como exagerada o absurda (introspección al menos parcial)',
      'f42.exclude_organic_schizophrenia':
        'La sintomatología obsesiva no es consecuencia de un trastorno esquizofrénico o afectivo y no se explica por causa orgánica o por sustancias',
    },
  },
  acute_stress_reaction: {
    name: 'Reacción a estrés agudo',
    differentials: [
      'Trastorno de estrés postraumático (síntomas > 1 mes, posible curso diferido)',
      'Trastorno de adaptación (menos agudo, menor gravedad del estresor)',
      'Crisis de pánico',
      'Confusión aguda orgánica o inducida por sustancias',
    ],
    groups: {
      'f43_0.core': 'Núcleo: reacción inmediata a un estrés excepcional',
      'f43_0.exclusions': 'Exclusiones',
    },
    criteria: {
      'f43_0.exceptional_stressor':
        'Vivencia de un estrés físico o psíquico excepcional (p. ej. accidente, violencia, catástrofe) inmediatamente antes del inicio de los síntomas',
      'f43_0.immediate_onset':
        'Inicio de los síntomas en cuestión de minutos a pocas horas tras el estrés, con remisión rápida (por lo general en horas a pocos días)',
      'f43_0.mixed_symptoms':
        'Cuadro mixto y cambiante de «embotamiento» inicial, estrechamiento de la conciencia, desorientación, ansiedad, desesperación, hiperactividad o retraimiento',
      'f43_0.exclude_persistent':
        'Los síntomas no persisten más allá de varios días con una intensidad que oriente más bien hacia un TEPT o un trastorno de adaptación',
    },
  },
  post_traumatic_stress_disorder: {
    name: 'Trastorno de estrés postraumático',
    differentials: [
      'TEPT complejo (alteraciones adicionales del afecto, del self y de las relaciones; CIE-11 6B41)',
      'Reacción a estrés agudo (< 1 mes, remisión rápida)',
      'Trastorno de adaptación',
      'Episodio depresivo / trastorno de ansiedad con relación traumática',
    ],
    groups: {
      'f43_1.trauma': 'Criterio del estresor',
      'f43_1.symptoms':
        'Conjuntos de síntomas característicos (reexperimentación, evitación, hiperactivación)',
      'f43_1.exclusions': 'Exclusiones',
    },
    criteria: {
      'f43_1.traumatic_event':
        'Confrontación con un acontecimiento o una situación estresante de amenaza excepcional o de proporciones catastróficas, que causaría profunda desesperación en casi cualquier persona',
      'f43_1.reexperiencing':
        'Reexperimentación involuntaria y repetida del trauma en forma de recuerdos, reminiscencias vívidas (flashbacks), pesadillas o angustia interna acuciante al evocarlo',
      'f43_1.avoidance':
        'Evitación persistente de estímulos, pensamientos o situaciones que recuerden al trauma',
      'f43_1.hyperarousal':
        'Hiperactivación persistente con, p. ej., dificultad para conciliar/mantener el sueño, irritabilidad, problemas de concentración, sobresalto o hipervigilancia',
      'f43_1.exclude_other':
        'La sintomatología no se explica mejor por otro trastorno mental, una enfermedad somática o el efecto de una sustancia',
    },
  },
  adjustment_disorder: {
    name: 'Trastorno de adaptación',
    differentials: [
      'Episodio depresivo (cumplidos los criterios completos)',
      'Trastorno de estrés postraumático (trauma de proporciones excepcionales)',
      'Reacción a estrés agudo (inmediata, de corta duración)',
      'Reacción de duelo normal',
    ],
    groups: {
      'f43_2.core':
        'Núcleo: síntomas emocionales/conductuales dependientes del estrés',
      'f43_2.exclusions': 'Exclusiones',
    },
    criteria: {
      'f43_2.identifiable_stressor':
        'Aparición de los síntomas en estrecha relación temporal (por lo general en el plazo de un mes) con un acontecimiento vital estresante identificable o un cambio vital',
      'f43_2.emotional_symptoms':
        'Afectación emocional (p. ej. ánimo deprimido, ansiedad, preocupación) o afectación del comportamiento social/del rendimiento que excede una reacción normal',
      'f43_2.exclude_full_disorder':
        'Los síntomas no cumplen los criterios de un trastorno afectivo, de ansiedad o por estrés específico que debiera codificarse de forma prioritaria',
    },
  },
  dissociative_conversion_disorders: {
    name: 'Trastornos disociativos (de conversión)',
    differentials: [
      'Enfermedad neurológica/somática (de exclusión obligada)',
      'Trastorno de estrés postraumático con síntomas disociativos',
      'Trastorno facticio / simulación',
      'Epilepsia (ante cuadros de tipo convulsivo)',
    ],
    groups: {
      'f44.core': 'Núcleo: disfunción disociativa o de conversión',
      'f44.features': 'Rasgos de apoyo',
      'f44.exclusions': 'Exclusiones',
    },
    criteria: {
      'f44.psychoform_dissociation':
        'Pérdida parcial o completa de la integración normal de los recuerdos, la identidad, las sensaciones inmediatas o el control de los movimientos (p. ej. amnesia disociativa, fuga, estupor, despersonalización/desrealización)',
      'f44.conversion_symptoms':
        'Síntomas de conversión pseudoneurológicos (p. ej. parálisis, alteraciones de la sensibilidad, crisis no epilépticas, trastornos de la visión/del habla) sin explicación orgánica suficiente',
      'f44.temporal_link':
        'Relación temporal convincente de los síntomas con acontecimientos estresantes, conflictos o necesidades',
      'f44.exclude_organic':
        'No hay indicios de una enfermedad somática (en especial neurológica) que explique los síntomas; se ha realizado un estudio somático dirigido',
    },
  },
  somatoform_bodily_distress_disorder: {
    name: 'Trastorno somatomorfo (trastorno de malestar corporal)',
    differentials: [
      'Trastorno hipocondríaco/de ansiedad por la enfermedad (miedo a enfermar en lugar de malestar por los síntomas)',
      'Trastorno depresivo o de ansiedad con síntomas corporales',
      'Enfermedad somática no estudiada de forma suficiente',
      'Trastorno disociativo (de conversión)',
    ],
    groups: {
      'f45.core': 'Núcleo: síntomas corporales angustiantes y reiteradamente expuestos',
      'f45.exclusions': 'Exclusiones',
    },
    criteria: {
      'f45.persistent_symptoms':
        'Molestias corporales persistentes o recurrentes (a menudo múltiples y cambiantes) que resultan angustiantes para la persona y que conducen a la búsqueda repetida de ayuda médica',
      'f45.excessive_attention':
        'Atención excesiva a los síntomas y/o realización repetida de pruebas, pese a la reiterada tranquilización ante hallazgos normales',
      'f45.exclude_organic':
        'Las molestias no se explican de forma suficiente por una enfermedad somática demostrable; se ha realizado un estudio somático adecuado',
    },
  },
  hypochondriasis_health_anxiety: {
    name: 'Trastorno hipocondríaco (trastorno de ansiedad por la enfermedad)',
    differentials: [
      'Trastorno somatomorfo/de malestar corporal (malestar por los síntomas en lugar de miedo a la enfermedad)',
      'Trastorno de ansiedad generalizada',
      'Trastorno obsesivo-compulsivo',
      'Trastorno delirante de tipo hipocondríaco (ausencia de introspección)',
    ],
    groups: {
      'f45_2.core': 'Núcleo: convicción/miedo a la enfermedad persistente',
      'f45_2.exclusions': 'Exclusiones',
    },
    criteria: {
      'f45_2.disease_conviction':
        'Convicción persistente o miedo marcado de padecer una o varias enfermedades somáticas graves, a partir de la malinterpretación de sensaciones corporales normales',
      'f45_2.reassurance_resistant':
        'Los temores persisten pese a los resultados normales de las pruebas y a la tranquilización médica',
      'f45_2.exclude_delusional':
        'La convicción de enfermedad no alcanza una intensidad delirante y no se explica mejor por un trastorno esquizofrénico o afectivo',
    },
  },
}
