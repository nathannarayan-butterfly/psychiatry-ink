import type { DisorderTranslationMap } from '../types'

/** ES translations — ICD-10 F4 block. */
export const esNeuroticStressSomatoform: DisorderTranslationMap = {
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
      '6b00.core': 'Núcleo: aprensión marcada O ansiedad de libre flotación (al menos uno)',
      '6b00.additional': 'Síntomas característicos adicionales (al menos 3)',
      '6b00.duration': 'Duración',
      '6b00.exclusions': 'Exclusiones',
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
      '6b00.general_apprehension':
        'Preocupación o aprensión marcada referida a varios ámbitos de la vida cotidiana (p. ej. familia, salud, finanzas, trabajo) y difícil de controlar',
      '6b00.free_floating':
        'Ansiedad o nerviosismo general y de libre flotación, no ligados a preocupaciones o situaciones concretas',
      '6b00.muscle_tension': 'Tensión muscular o inquietud motora',
      '6b00.autonomic':
        'Hiperexcitabilidad vegetativa simpática (p. ej. palpitaciones, sudoración, temblores, sequedad de boca, molestias gastrointestinales)',
      '6b00.restlessness': 'Inquietud o sensación de estar constantemente «en vilo»',
      '6b00.concentration': 'Dificultades de concentración por las preocupaciones o la tensión',
      '6b00.irritability': 'Irritabilidad',
      '6b00.sleep':
        'Alteración del sueño (dificultad para conciliar o mantener el sueño, o sueño inquieto y no reparador)',
      '6b00.several_months':
        'Los síntomas están presentes la mayoría de los días durante un período de al menos varios meses',
      '6b00.exclude_other':
        'La ansiedad no se explica mejor por otro trastorno mental, una enfermedad somática (p. ej. hipertiroidismo) o el efecto de una sustancia/medicamento',
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
      '6b20.core': 'Obsesiones y/o compulsiones persistentes',
      '6b20.burden': 'Consumo de tiempo o malestar/deterioro clínicamente significativo',
      '6b20.insight': 'Especificador de introspección (CIE-11)',
      '6b20.exclusions': 'Exclusiones',
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
      '6b20.obsessions':
        'Obsesiones persistentes: pensamientos, imágenes o impulsos recurrentes, intrusivos e indeseados (p. ej. temas de contaminación, agresión o simetría) que típicamente provocan ansiedad o malestar',
      '6b20.compulsions':
        'Compulsiones persistentes: conductas repetidas o actos mentales (p. ej. lavarse, comprobar, contar, repetir mentalmente) que se realizan en respuesta a una obsesión o según reglas rígidas',
      '6b20.time_distress':
        'Los síntomas obsesivo-compulsivos consumen tiempo (p. ej. más de una hora diaria) o causan malestar marcado o un deterioro significativo en los ámbitos personal, familiar, social o laboral',
      '6b20.insight_specifier':
        'Debe especificarse el grado de introspección (buena o moderada frente a escasa o ausente/delirante); incluso con convicción delirante el trastorno se sigue codificando dentro del espectro obsesivo-compulsivo',
      '6b20.exclude_other':
        'La sintomatología no se explica mejor por otro trastorno mental (p. ej. trastorno de ansiedad generalizada, trastorno delirante) ni por el efecto de una sustancia o una enfermedad somática',
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
      '6b40.exposure': 'Criterio del estresor (CIE-11)',
      '6b40.reexperiencing': 'Síntoma central 1: reexperimentación en el aquí y ahora',
      '6b40.avoidance': 'Síntoma central 2: evitación',
      '6b40.threat': 'Síntoma central 3: sensación persistente de amenaza actual',
      '6b40.duration': 'Duración',
      '6b40.functional': 'Deterioro funcional',
      '6b40.exclusions': 'Exclusiones',
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
      '6b40.traumatic_event':
        'Exposición a un acontecimiento extremadamente amenazante u horripilante, o a una serie de tales acontecimientos',
      '6b40.reexperiencing_now':
        'Reexperimentación del trauma en el presente (no un mero recuerdo) en forma de recuerdos intrusivos vívidos, flashbacks o pesadillas, típicamente acompañados de un intenso miedo u horror',
      '6b40.avoidance_reminders':
        'Evitación activa de pensamientos y recuerdos del acontecimiento, o de actividades, situaciones o personas que lo recuerden',
      '6b40.current_threat':
        'Percepción persistente de una amenaza actual aumentada, p. ej. hipervigilancia marcada o reacción de sobresalto exagerada ante los estímulos',
      '6b40.several_weeks':
        'Los síntomas persisten durante un período de al menos varias semanas',
      '6b40.functional_impairment':
        'Deterioro marcado en el ámbito personal, familiar, social, educativo, laboral u otras áreas importantes del funcionamiento',
      '6b40.exclude_other':
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
      '6b43.stressor': 'Estresor psicosocial identificable',
      '6b43.core': 'Núcleo: preocupación por el estresor y fracaso de la adaptación',
      '6b43.course': 'Curso',
      '6b43.exclusions': 'Exclusiones',
    },
    criteria: {
      'f43_2.identifiable_stressor':
        'Aparición de los síntomas en estrecha relación temporal (por lo general en el plazo de un mes) con un acontecimiento vital estresante identificable o un cambio vital',
      'f43_2.emotional_symptoms':
        'Afectación emocional (p. ej. ánimo deprimido, ansiedad, preocupación) o afectación del comportamiento social/del rendimiento que excede una reacción normal',
      'f43_2.exclude_full_disorder':
        'Los síntomas no cumplen los criterios de un trastorno afectivo, de ansiedad o por estrés específico que debiera codificarse de forma prioritaria',
      '6b43.identifiable_stressor':
        'Aparición de los síntomas en torno al mes siguiente a un estresor psicosocial identificable o un cambio vital (único o múltiple)',
      '6b43.preoccupation':
        'Preocupación excesiva por el estresor o sus consecuencias (p. ej. preocupaciones persistentes, pensamientos angustiantes recurrentes sobre el acontecimiento o rumiación constante sobre su significado)',
      '6b43.failure_to_adapt':
        'Fracaso en la adaptación al estresor, con deterioro significativo en los ámbitos personal, familiar, social, educativo o laboral',
      '6b43.resolution':
        'Los síntomas suelen remitir en un plazo de unos seis meses tras la desaparición del estresor o de sus consecuencias',
      '6b43.exclude_other':
        'Los síntomas no cumplen los criterios de otro trastorno mental (p. ej. trastorno depresivo, TEPT) y exceden una reacción de estrés normal o un duelo',
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
      '6c20.core': 'Núcleo: síntomas corporales angustiantes con atención excesiva',
      '6c20.persistence': 'Persistencia',
      '6c20.severity': 'Gravedad (CIE-11: leve / moderada / grave)',
      '6c20.exclusions': 'Exclusiones',
    },
    criteria: {
      'f45.persistent_symptoms':
        'Molestias corporales persistentes o recurrentes (a menudo múltiples y cambiantes) que resultan angustiantes para la persona y que conducen a la búsqueda repetida de ayuda médica',
      'f45.excessive_attention':
        'Atención excesiva a los síntomas y/o realización repetida de pruebas, pese a la reiterada tranquilización ante hallazgos normales',
      'f45.exclude_organic':
        'Las molestias no se explican de forma suficiente por una enfermedad somática demostrable; se ha realizado un estudio somático adecuado',
      '6c20.bodily_symptoms':
        'Presencia de uno o varios síntomas corporales angustiantes para la persona (a menudo, aunque no necesariamente, múltiples y cambiantes)',
      '6c20.excessive_attention':
        'Atención excesiva a los síntomas y conducta marcada relacionada con la salud (p. ej. realización repetida de pruebas, búsqueda persistente de tranquilización), desproporcionada respecto a los hallazgos',
      '6c20.persistent_course':
        'Los síntomas y la preocupación excesiva son persistentes (la mayoría de los días durante al menos varios meses, del orden de ≥ 3 meses)',
      '6c20.mild':
        'Leve: cierta preocupación por los síntomas, pero sin deterioro sustancial del funcionamiento',
      '6c20.moderate':
        'Moderada: preocupación marcada con deterioro claro en algunas áreas del funcionamiento',
      '6c20.severe':
        'Grave: preocupación generalizada e intrusiva con deterioro grave en muchas áreas (p. ej. pérdida extensa del funcionamiento laboral/social)',
      '6c20.exclude_other':
        'Los síntomas y la preocupación asociada no se explican mejor por otro trastorno mental (p. ej. trastorno de pánico, trastorno depresivo, trastorno de ansiedad por la enfermedad)',
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
      '6b23.core': 'Núcleo: preocupación persistente/miedo a una enfermedad grave',
      '6b23.behaviour': 'Conducta del espectro obsesivo-compulsivo (al menos una)',
      '6b23.persistence': 'Persistencia y resistencia a la tranquilización',
      '6b23.exclusions': 'Exclusiones',
    },
    criteria: {
      'f45_2.disease_conviction':
        'Convicción persistente o miedo marcado de padecer una o varias enfermedades somáticas graves, a partir de la malinterpretación de sensaciones corporales normales',
      'f45_2.reassurance_resistant':
        'Los temores persisten pese a los resultados normales de las pruebas y a la tranquilización médica',
      'f45_2.exclude_delusional':
        'La convicción de enfermedad no alcanza una intensidad delirante y no se explica mejor por un trastorno esquizofrénico o afectivo',
      '6b23.illness_preoccupation':
        'Preocupación persistente por el temor o la convicción de padecer, o de desarrollar, una o varias enfermedades graves, progresivas o potencialmente mortales',
      '6b23.checking_reassurance':
        'Conducta repetitiva y excesiva relacionada con la salud (p. ej. autoexploración corporal repetida, consultas médicas frecuentes, búsqueda persistente de tranquilización)',
      '6b23.maladaptive_avoidance':
        'Evitación desadaptativa (p. ej. evitar citas médicas, hospitales o información relacionada con la enfermedad) por miedo a que se confirme el temor',
      '6b23.reassurance_resistant':
        'La preocupación o el temor persiste durante al menos varios meses y se mantiene pese a una evaluación médica adecuada y a la tranquilización',
      '6b23.exclude_other':
        'La convicción de enfermedad no alcanza una intensidad delirante y no se explica mejor por un trastorno de malestar corporal, un trastorno depresivo u otro trastorno mental',
    },
  },
  complex_ptsd: {
    name: 'Trastorno de estrés postraumático complejo',
    differentials: [
      'Trastorno de estrés postraumático (sin alteraciones de la organización del self; CIE-11 6B40)',
      'Trastorno de la personalidad emocionalmente inestable (límite)',
      'Cambio persistente de la personalidad tras experiencia catastrófica (CIE-10 F62.0)',
      'Trastorno depresivo o disociativo con relación traumática',
    ],
    groups: {
      '6b41.exposure': 'Criterio del estresor: traumatización prolongada/repetida',
      '6b41.ptsd_core': 'Conjuntos centrales del TEPT (los tres son necesarios)',
      '6b41.dso': 'Alteraciones de la organización del self (DSO — las tres son necesarias)',
      '6b41.functional': 'Deterioro funcional',
      '6b41.exclusions': 'Exclusiones',
    },
    criteria: {
      '6b41.prolonged_trauma':
        'Exposición a un acontecimiento extremadamente amenazante u horripilante, por lo general prolongado o repetido y del que resulta difícil o imposible escapar (p. ej. violencia doméstica continuada, tortura, esclavitud, abuso repetido en la infancia)',
      '6b41.reexperiencing':
        'Reexperimentación del trauma en el presente (recuerdos intrusivos vívidos, flashbacks o pesadillas), típicamente acompañada de miedo u horror',
      '6b41.avoidance':
        'Evitación de pensamientos y recuerdos, o de actividades, situaciones o personas que recuerden al trauma',
      '6b41.current_threat':
        'Percepción persistente de una amenaza actual aumentada (p. ej. hipervigilancia, reacción de sobresalto exagerada)',
      '6b41.affect_dysregulation':
        'Desregulación afectiva grave y persistente (p. ej. reactividad emocional aumentada, arrebatos violentos, embotamiento emocional o vivencias disociativas bajo estrés)',
      '6b41.negative_self_concept':
        'Autoconcepto persistentemente negativo, con creencias de inutilidad, fracaso o empequeñecimiento, a menudo acompañadas de profundos sentimientos de vergüenza, culpa o fracaso',
      '6b41.relationship_disturbance':
        'Dificultades persistentes para mantener relaciones y sentirse cercano a los demás (p. ej. evitación de las relaciones, sensación de distancia o escaso interés por las relaciones)',
      '6b41.functional_impairment':
        'Deterioro marcado en el ámbito personal, familiar, social, educativo, laboral u otras áreas importantes del funcionamiento',
      '6b41.exclude_other':
        'La sintomatología no se explica mejor por otro trastorno mental; en ausencia de alteraciones de la organización del self, debe codificarse en su lugar un TEPT (6B40)',
    },
  },
}
