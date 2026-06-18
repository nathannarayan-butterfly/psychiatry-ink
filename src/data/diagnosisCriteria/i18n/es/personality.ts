import type { DisorderTranslationMap } from '../types'

/**
 * Cadenas ES compartidas para los conjuntos dimensionales distintos CIE-11 6D10/6D11
 * adjuntos a cada trastorno categorial F60.x. El texto general/gravedad/exclusión es
 * idéntico entre trastornos (solo difiere el «slug» de id por trastorno); los dominios
 * de rasgos seleccionados codifican la correspondencia categorial→dimensional.
 */
type Icd11TraitKey =
  | 'negative_affectivity'
  | 'detachment'
  | 'dissociality'
  | 'disinhibition'
  | 'anankastia'
  | 'borderline_pattern'

const ICD11_PD_GROUP_TEXT = {
  general:
    'Criterios generales de un trastorno de la personalidad (CIE-11 6D10: afectación del funcionamiento del self y/o interpersonal)',
  severity: 'Clasificación de la gravedad (exactamente un nivel; 6D10)',
  traits: 'Calificadores de dominios de rasgos (uno o varios; 6D11)',
  exclusions: 'Exclusiones / diagnóstico diferencial',
}

const ICD11_PD_CORE_TEXT = {
  self: 'Afectación de aspectos del self (identidad, autoestima, una autovaloración realista, autodirección y la capacidad de fijar objetivos)',
  interpersonal:
    'Afectación del funcionamiento interpersonal (establecer y mantener relaciones próximas y mutuamente satisfactorias, comprender la perspectiva de los demás y manejar los conflictos)',
  duration:
    'El patrón persiste durante un período prolongado (del orden de ≥ 2 años), se manifiesta de forma generalizada a través de las situaciones y no se limita a una situación desencadenante circunscrita',
}

const ICD11_PD_SEVERITY_TEXT = {
  mild: 'Leve: afectación de algunas áreas del funcionamiento del self y/o interpersonal, con funcionamiento preservado en muchas áreas; por lo general sin riesgo notable de daño a sí mismo o a terceros (6D10.0)',
  moderate:
    'Moderado: problemas acusados en varias áreas de funcionamiento, con deterioro marcado en la mayoría de las relaciones interpersonales y de los roles sociales/laborales (6D10.1)',
  severe:
    'Grave: deterioro grave del funcionamiento del self e interpersonal en casi todas las áreas de la vida; con frecuencia, riesgo considerable de daño a sí mismo o a terceros (6D10.2)',
}

const ICD11_PD_EXCLUDE_TEXT =
  'Las alteraciones no se explican mejor por otro trastorno mental, por los efectos de una sustancia o por una enfermedad del sistema nervioso, y no son propias de una fase del desarrollo ni normativas desde el punto de vista sociocultural'

const ICD11_PD_TRAIT_TEXT: Record<Icd11TraitKey, string> = {
  negative_affectivity:
    'Afectividad negativa: tendencia a un amplio espectro de emociones negativas con una frecuencia e intensidad desproporcionadas (p. ej., ansiedad, labilidad emocional, desconfianza, baja autoestima) (6D11.0)',
  detachment:
    'Distanciamiento: tendencia al retraimiento social y emocional, al establecimiento limitado de relaciones y a la reducción de la expresión afectiva (6D11.1)',
  dissociality:
    'Disocialidad: menosprecio de los derechos y sentimientos de los demás, egocentrismo, falta de empatía y escasa consideración (incluida una desconfianza o un desdén persistentes hacia los demás) (6D11.2)',
  disinhibition:
    'Desinhibición: tendencia a actuar de forma impulsiva ante estímulos internos o externos inmediatos, sin considerar las consecuencias a más largo plazo (6D11.3)',
  anankastia:
    'Anancasmo: foco en estándares rígidos de perfección, orden, regularidad y control sobre la propia conducta y la de los demás (6D11.4)',
  borderline_pattern:
    'Patrón límite: inestabilidad generalizada de la autoimagen, las relaciones y el afecto, con impulsividad, temor al abandono y autolesiones recurrentes (6D11.5)',
}

function icd11PdGroups(slug: string): Record<string, string> {
  return {
    [`6d10_${slug}.general`]: ICD11_PD_GROUP_TEXT.general,
    [`6d10_${slug}.severity`]: ICD11_PD_GROUP_TEXT.severity,
    [`6d11_${slug}.traits`]: ICD11_PD_GROUP_TEXT.traits,
    [`6d10_${slug}.exclusions`]: ICD11_PD_GROUP_TEXT.exclusions,
  }
}

function icd11PdCriteria(slug: string, traits: Icd11TraitKey[]): Record<string, string> {
  const out: Record<string, string> = {
    [`6d10_${slug}.self_dysfunction`]: ICD11_PD_CORE_TEXT.self,
    [`6d10_${slug}.interpersonal_dysfunction`]: ICD11_PD_CORE_TEXT.interpersonal,
    [`6d10_${slug}.duration_pervasive`]: ICD11_PD_CORE_TEXT.duration,
    [`6d10_${slug}.severity_mild`]: ICD11_PD_SEVERITY_TEXT.mild,
    [`6d10_${slug}.severity_moderate`]: ICD11_PD_SEVERITY_TEXT.moderate,
    [`6d10_${slug}.severity_severe`]: ICD11_PD_SEVERITY_TEXT.severe,
    [`6d10_${slug}.not_better_explained`]: ICD11_PD_EXCLUDE_TEXT,
  }
  for (const t of traits) out[`6d11_${slug}.${t}`] = ICD11_PD_TRAIT_TEXT[t]
  return out
}

/** ES translations — ICD-10 F6 block. */
export const esPersonality: DisorderTranslationMap = {
  binge_eating_disorder: {
    name: 'Trastorno por atracón',
    differentials: [
      'Bulimia nerviosa (con conductas compensatorias regulares)',
      'Obesidad sin episodios de atracón',
      'Episodio depresivo con aumento del apetito',
      'Síndrome de ingesta nocturna',
    ],
    groups: {
      'f50_4.core': 'Núcleo: episodios de atracón recurrentes sin conductas compensatorias regulares',
      'f50_4.exclusions': 'Exclusiones',
    },
    criteria: {
      'binge_eating.recurrent_binges':
        'Episodios de atracón recurrentes con ingesta de cantidades de alimento inusualmente grandes y marcada pérdida de control sobre la comida',
      'binge_eating.distress':
        'Malestar acusado en relación con los atracones (p. ej., vergüenza, culpa, asco), sin conductas compensatorias regulares',
      'binge_eating.exclude_compensatory':
        'No existen conductas compensatorias regulares que apuntarían más bien a una bulimia nerviosa',
    },
  },
  paranoid_personality_disorder: {
    name: 'Trastorno paranoide de la personalidad',
    differentials: [
      'Trastorno delirante / esquizofrenia paranoide (síntomas psicóticos circunscritos)',
      'Trastorno esquizoide o esquizotípico de la personalidad',
      'Reacción paranoide persistente ante una sobrecarga real',
      'Sintomatología paranoide inducida por sustancias',
    ],
    groups: {
      ...icd11PdGroups('par'),
      'f60_0.general': 'Criterios generales de un trastorno de la personalidad (F60 General)',
      'f60_0.features': 'Rasgos característicos (al menos 4)',
      'f60_0.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      ...icd11PdCriteria('par', ['negative_affectivity', 'dissociality']),
      'f60_0.general_deviation':
        'Patrón perdurable de vivencia interna y de conducta que se desvía notablemente de las expectativas del entorno sociocultural y que se manifiesta en la cognición, la afectividad, el control de impulsos o el comportamiento interpersonal',
      'f60_0.general_pervasive':
        'El patrón desviado es profundo e inflexible a lo largo de un amplio espectro de situaciones personales y sociales (no limitado a una única situación desencadenante)',
      'f60_0.general_distress':
        'El patrón conlleva malestar personal y/o deterioro acusado en el ámbito social, laboral u otras áreas importantes de funcionamiento',
      'f60_0.general_onset':
        'El patrón es estable y de larga duración, y su inicio se puede rastrear hasta la adolescencia o el inicio de la edad adulta',
      'f60_0.general_not_organic':
        'El patrón no es expresión ni consecuencia de otro trastorno mental y no está causado directamente por una enfermedad, lesión o disfunción cerebral',
      'f60_0.suspiciousness':
        'Desconfianza generalizada y tendencia a interpretar las acciones de los demás como hostiles o despectivas, sin pruebas suficientes',
      'f60_0.grudges':
        'Conducta rencorosa: resentimiento persistente y escasa disposición a perdonar agravios o desprecios',
      'f60_0.distrust_loyalty':
        'Dudas recurrentes e infundadas acerca de la lealtad o la fiabilidad de amigos, parejas o compañeros',
      'f60_0.reluctance_confide':
        'Reticencia a confiar en los demás por temor infundado a que la información se utilice de forma malintencionada',
      'f60_0.hidden_meanings':
        'Tendencia a reconocer significados humillantes o amenazantes ocultos en comentarios o sucesos inofensivos',
      'f60_0.self_reference':
        'Autorreferencialidad exagerada, a menudo asociada a un marcado sentido de tener derechos especiales y a una insistencia pendenciera en los propios derechos',
      'f60_0.jealousy':
        'Sospecha injustificada y tenaz respecto a la fidelidad sexual de la pareja',
      'f60_0.exclude_psychosis':
        'La desconfianza no aparece exclusivamente en el marco de una esquizofrenia o de un trastorno delirante persistente y no alcanza una cualidad delirante circunscrita',
    },
  },
  schizoid_personality_disorder: {
    name: 'Trastorno esquizoide de la personalidad',
    differentials: [
      'Trastorno del espectro autista (inicio en la primera infancia, patrones repetitivos)',
      'Trastorno esquizotípico / pródromo de esquizofrenia',
      'Trastorno paranoide de la personalidad',
      'Trastorno de la personalidad ansioso (evitativo) (retraimiento por temor, no por desinterés)',
      'Episodio depresivo con retraimiento social',
    ],
    groups: {
      ...icd11PdGroups('szd'),
      'f60_1.general': 'Criterios generales de un trastorno de la personalidad (F60 General)',
      'f60_1.features': 'Rasgos característicos (al menos 4)',
      'f60_1.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      ...icd11PdCriteria('szd', ['detachment']),
      'f60_1.general_deviation':
        'Patrón perdurable de vivencia interna y de conducta que se desvía notablemente de las expectativas del entorno sociocultural y que se manifiesta en la cognición, la afectividad, el control de impulsos o el comportamiento interpersonal',
      'f60_1.general_pervasive':
        'El patrón desviado es profundo e inflexible a lo largo de un amplio espectro de situaciones personales y sociales (no limitado a una única situación desencadenante)',
      'f60_1.general_distress':
        'El patrón conlleva malestar personal y/o deterioro acusado en el ámbito social, laboral u otras áreas importantes de funcionamiento',
      'f60_1.general_onset':
        'El patrón es estable y de larga duración, y su inicio se puede rastrear hasta la adolescencia o el inicio de la edad adulta',
      'f60_1.general_not_organic':
        'El patrón no es expresión ni consecuencia de otro trastorno mental y no está causado directamente por una enfermedad, lesión o disfunción cerebral',
      'f60_1.anhedonia':
        'Pocas o ninguna actividad le producen placer (capacidad reducida para experimentar disfrute)',
      'f60_1.emotional_coldness':
        'Frialdad emocional, distanciamiento o afectividad aplanada en el contacto interpersonal',
      'f60_1.limited_warmth':
        'Capacidad limitada para expresar sentimientos cálidos y tiernos, o también enfado, hacia los demás',
      'f60_1.indifference_praise':
        'Aparente indiferencia ante el elogio o la crítica de los demás',
      'f60_1.little_sexual_interest':
        'Escaso interés por las experiencias sexuales con otra persona',
      'f60_1.solitary':
        'Marcada preferencia por las actividades realizadas en solitario; elección casi constante de ocupaciones solitarias',
      'f60_1.no_close_friends':
        'Pocas o ninguna amistad estrecha o relación de confianza, y ausencia de deseo de tenerlas',
      'f60_1.insensitive_norms':
        'Insensibilidad ante las normas y convenciones sociales vigentes (incumplimiento no intencionado)',
      'f60_1.exclude_asd_schizo':
        'El retraimiento no se explica mejor por un trastorno del espectro autista, un trastorno esquizotípico o una enfermedad esquizofrénica',
    },
  },
  dissocial_personality_disorder: {
    name: 'Trastorno disocial (antisocial) de la personalidad',
    differentials: [
      'Trastorno de la conducta (antes de los 18 años)',
      'Episodio maníaco o hipomaníaco con desinhibición',
      'Trastorno por consumo de sustancias con conducta disocial durante la intoxicación',
      'Trastorno de inestabilidad emocional de la personalidad',
      'Conducta disocial secundaria a un trastorno psicótico',
    ],
    groups: {
      ...icd11PdGroups('dsoc'),
      'f60_2.general': 'Criterios generales de un trastorno de la personalidad (F60 General)',
      'f60_2.features': 'Rasgos característicos (al menos 3)',
      'f60_2.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      ...icd11PdCriteria('dsoc', ['dissociality', 'disinhibition']),
      'f60_2.general_deviation':
        'Patrón perdurable de vivencia interna y de conducta que se desvía notablemente de las expectativas del entorno sociocultural y que se manifiesta en la cognición, la afectividad, el control de impulsos o el comportamiento interpersonal',
      'f60_2.general_pervasive':
        'El patrón desviado es profundo e inflexible a lo largo de un amplio espectro de situaciones personales y sociales (no limitado a una única situación desencadenante)',
      'f60_2.general_distress':
        'El patrón conlleva malestar personal y/o deterioro acusado en el ámbito social, laboral u otras áreas importantes de funcionamiento',
      'f60_2.general_onset':
        'El patrón es estable y de larga duración, y su inicio se puede rastrear hasta la adolescencia o el inicio de la edad adulta',
      'f60_2.general_not_organic':
        'El patrón no es expresión ni consecuencia de otro trastorno mental y no está causado directamente por una enfermedad, lesión o disfunción cerebral',
      'f60_2.callousness':
        'Despreocupación insensible por los sentimientos de los demás y falta de empatía',
      'f60_2.irresponsibility':
        'Irresponsabilidad acusada y persistente, así como menosprecio de las normas, reglas y obligaciones sociales',
      'f60_2.unstable_relationships':
        'Incapacidad para mantener relaciones duraderas, pese a no tener dificultad para establecerlas',
      'f60_2.low_frustration_aggression':
        'Tolerancia a la frustración muy baja, con un umbral reducido para la conducta agresiva o violenta',
      'f60_2.no_guilt':
        'Ausencia de sentimiento de culpa e incapacidad para aprender de las experiencias negativas, en particular del castigo',
      'f60_2.blaming_others':
        'Marcada tendencia a culpar a los demás o a ofrecer racionalizaciones superficiales del propio comportamiento',
      'f60_2.deceitfulness':
        'Mentir, engañar o manipular a los demás de forma reiterada en beneficio o placer propios (correspondencia CIE-11/DSM)',
      'f60_2.exclude_mania_substance':
        'La conducta no aparece exclusivamente en el marco de un episodio maníaco, de un trastorno esquizofrénico o de una intoxicación por sustancias',
    },
  },
  emotionally_unstable_pd_impulsive: {
    name: 'Trastorno de inestabilidad emocional de la personalidad, tipo impulsivo',
    differentials: [
      'Trastorno de inestabilidad emocional de la personalidad, tipo límite (F60.31)',
      'Episodio hipomaníaco/maníaco',
      'TDAH del adulto con impulsividad',
      'Desinhibición debida a sustancias',
      'Trastorno disocial de la personalidad',
    ],
    groups: {
      ...icd11PdGroups('eui'),
      'f60_30.general': 'Criterios generales de un trastorno de la personalidad (F60 General)',
      'f60_30.features':
        'Rasgos característicos (tipo impulsivo; al menos 3, entre ellos la inestabilidad afectiva)',
      'f60_30.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      ...icd11PdCriteria('eui', ['disinhibition', 'negative_affectivity']),
      'f60_30.general_deviation':
        'Patrón perdurable de vivencia interna y de conducta que se desvía notablemente de las expectativas del entorno sociocultural y que se manifiesta en la cognición, la afectividad, el control de impulsos o el comportamiento interpersonal',
      'f60_30.general_pervasive':
        'El patrón desviado es profundo e inflexible a lo largo de un amplio espectro de situaciones personales y sociales (no limitado a una única situación desencadenante)',
      'f60_30.general_distress':
        'El patrón conlleva malestar personal y/o deterioro acusado en el ámbito social, laboral u otras áreas importantes de funcionamiento',
      'f60_30.general_onset':
        'El patrón es estable y de larga duración, y su inicio se puede rastrear hasta la adolescencia o el inicio de la edad adulta',
      'f60_30.general_not_organic':
        'El patrón no es expresión ni consecuencia de otro trastorno mental y no está causado directamente por una enfermedad, lesión o disfunción cerebral',
      'f60_30.impulsivity':
        'Marcada tendencia a actuar de forma inesperada e impulsiva, sin considerar las consecuencias',
      'f60_30.quarrelsome':
        'Marcada tendencia a las disputas y conflictos con los demás, sobre todo cuando los actos impulsivos se ven impedidos o criticados',
      'f60_30.outbursts':
        'Tendencia a accesos de ira o de violencia, con incapacidad para controlar la conducta explosiva resultante',
      'f60_30.affective_instability':
        'Estado de ánimo inestable y caprichoso, con rápida labilidad afectiva',
      'f60_30.difficulty_planning':
        'Dificultad para planificar las acciones de forma anticipada y llevarlas a término cuando no ofrecen una recompensa inmediata',
      'f60_30.exclude_mania_substance':
        'La impulsividad/labilidad afectiva no aparece exclusivamente en el marco de un episodio afectivo o de los efectos de una sustancia',
    },
  },
  emotionally_unstable_pd_borderline: {
    name: 'Trastorno de inestabilidad emocional de la personalidad, tipo límite',
    differentials: [
      'Trastorno de inestabilidad emocional de la personalidad, tipo impulsivo (F60.30)',
      'Trastorno afectivo bipolar (episodios en lugar de inestabilidad continua)',
      'Trastorno de estrés postraumático complejo',
      'Trastorno histriónico o disocial de la personalidad',
      'Trastorno por consumo de sustancias',
    ],
    groups: {
      ...icd11PdGroups('bdl'),
      'f60_31.general': 'Criterios generales de un trastorno de la personalidad (F60 General)',
      'f60_31.impulsive_core': 'Rasgos del tipo impulsivo (al menos 2)',
      'f60_31.borderline_features': 'Rasgos límite (al menos 2)',
      'f60_31.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      ...icd11PdCriteria('bdl', ['borderline_pattern', 'negative_affectivity']),
      'f60_31.general_deviation':
        'Patrón perdurable de vivencia interna y de conducta que se desvía notablemente de las expectativas del entorno sociocultural y que se manifiesta en la cognición, la afectividad, el control de impulsos o el comportamiento interpersonal',
      'f60_31.general_pervasive':
        'El patrón desviado es profundo e inflexible a lo largo de un amplio espectro de situaciones personales y sociales (no limitado a una única situación desencadenante)',
      'f60_31.general_distress':
        'El patrón conlleva malestar personal y/o deterioro acusado en el ámbito social, laboral u otras áreas importantes de funcionamiento',
      'f60_31.general_onset':
        'El patrón es estable y de larga duración, y su inicio se puede rastrear hasta la adolescencia o el inicio de la edad adulta',
      'f60_31.general_not_organic':
        'El patrón no es expresión ni consecuencia de otro trastorno mental y no está causado directamente por una enfermedad, lesión o disfunción cerebral',
      'f60_31.impulsivity':
        'Impulsividad marcada, con actuación sin considerar las consecuencias',
      'f60_31.affective_instability':
        'Estado de ánimo inestable y rápidamente cambiante, con labilidad afectiva acusada',
      'f60_31.self_image':
        'Alteraciones e inseguridad respecto a la autoimagen, los objetivos y las preferencias internas (incluidas las sexuales)',
      'f60_31.intense_unstable_relationships':
        'Tendencia a implicarse en relaciones intensas pero inestables, a menudo con alternancia entre idealización y devaluación',
      'f60_31.abandonment':
        'Esfuerzos exagerados por evitar un abandono real o temido',
      'f60_31.self_harm':
        'Amenazas suicidas o conductas autolesivas recurrentes (p. ej., comportamiento autolesivo)',
      'f60_31.chronic_emptiness': 'Sentimiento persistente de vacío interior',
      'f60_31.dissociation':
        'Ideación paranoide transitoria, dependiente del estrés, o síntomas disociativos (correspondencia CIE-11/DSM)',
      'f60_31.exclude_bipolar':
        'El patrón no se explica mejor por un trastorno afectivo bipolar con episodios circunscritos',
    },
  },
  histrionic_personality_disorder: {
    name: 'Trastorno histriónico de la personalidad',
    differentials: [
      'Trastorno de inestabilidad emocional de la personalidad (tipo límite)',
      'Trastorno dependiente de la personalidad',
      'Trastorno narcisista de la personalidad',
      'Episodio maníaco/hipomaníaco',
    ],
    groups: {
      ...icd11PdGroups('his'),
      'f60_4.general': 'Criterios generales de un trastorno de la personalidad (F60 General)',
      'f60_4.features': 'Rasgos característicos (al menos 4)',
      'f60_4.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      ...icd11PdCriteria('his', ['dissociality', 'negative_affectivity']),
      'f60_4.general_deviation':
        'Patrón perdurable de vivencia interna y de conducta que se desvía notablemente de las expectativas del entorno sociocultural y que se manifiesta en la cognición, la afectividad, el control de impulsos o el comportamiento interpersonal',
      'f60_4.general_pervasive':
        'El patrón desviado es profundo e inflexible a lo largo de un amplio espectro de situaciones personales y sociales (no limitado a una única situación desencadenante)',
      'f60_4.general_distress':
        'El patrón conlleva malestar personal y/o deterioro acusado en el ámbito social, laboral u otras áreas importantes de funcionamiento',
      'f60_4.general_onset':
        'El patrón es estable y de larga duración, y su inicio se puede rastrear hasta la adolescencia o el inicio de la edad adulta',
      'f60_4.general_not_organic':
        'El patrón no es expresión ni consecuencia de otro trastorno mental y no está causado directamente por una enfermedad, lesión o disfunción cerebral',
      'f60_4.dramatization':
        'Expresión emocional exagerada y teatral, con dramatización de las propias vivencias',
      'f60_4.suggestibility':
        'Sugestionabilidad aumentada y facilidad para ser influido por los demás o por las circunstancias',
      'f60_4.shallow_affect': 'Afectividad superficial y lábil',
      'f60_4.attention_seeking':
        'Búsqueda continua de emociones, de reconocimiento por parte de los demás y de actividades en las que la persona sea el centro de atención',
      'f60_4.seductiveness': 'Apariencia o comportamiento seductores de forma inapropiada',
      'f60_4.appearance_focus': 'Preocupación excesiva por el propio atractivo físico',
      'f60_4.exclude_other':
        'El patrón no se explica mejor por un episodio afectivo o por otro trastorno de la personalidad',
    },
  },
  anankastic_personality_disorder: {
    name: 'Trastorno anancástico (obsesivo-compulsivo) de la personalidad',
    differentials: [
      'Trastorno obsesivo-compulsivo (auténticas obsesiones/compulsiones, egodistónicas)',
      'Trastorno de la personalidad ansioso (evitativo)',
      'Trastorno del espectro autista con adhesión a rutinas',
      'Episodio depresivo con tendencia a la rumiación',
    ],
    groups: {
      ...icd11PdGroups('ana'),
      'f60_5.general': 'Criterios generales de un trastorno de la personalidad (F60 General)',
      'f60_5.features': 'Rasgos característicos (al menos 4)',
      'f60_5.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      ...icd11PdCriteria('ana', ['anankastia']),
      'f60_5.general_deviation':
        'Patrón perdurable de vivencia interna y de conducta que se desvía notablemente de las expectativas del entorno sociocultural y que se manifiesta en la cognición, la afectividad, el control de impulsos o el comportamiento interpersonal',
      'f60_5.general_pervasive':
        'El patrón desviado es profundo e inflexible a lo largo de un amplio espectro de situaciones personales y sociales (no limitado a una única situación desencadenante)',
      'f60_5.general_distress':
        'El patrón conlleva malestar personal y/o deterioro acusado en el ámbito social, laboral u otras áreas importantes de funcionamiento',
      'f60_5.general_onset':
        'El patrón es estable y de larga duración, y su inicio se puede rastrear hasta la adolescencia o el inicio de la edad adulta',
      'f60_5.general_not_organic':
        'El patrón no es expresión ni consecuencia de otro trastorno mental y no está causado directamente por una enfermedad, lesión o disfunción cerebral',
      'f60_5.doubt_caution': 'Dudas y cautela excesivas a la hora de tomar decisiones',
      'f60_5.preoccupation_detail':
        'Preocupación constante por los detalles, las reglas, las listas, el orden, la organización o los planes, hasta el punto de perder de vista el objetivo real',
      'f60_5.perfectionism': 'Perfeccionismo que interfiere en la finalización de las tareas',
      'f60_5.conscientiousness':
        'Escrupulosidad y meticulosidad excesivas, con una dedicación desproporcionada al rendimiento en detrimento del disfrute y de las relaciones',
      'f60_5.rigidity':
        'Rigidez y obstinación acusadas respecto a las propias normas, procedimientos y criterios morales',
      'f60_5.insistence_submission':
        'Insistencia inapropiada en que los demás se sometan exactamente a los propios hábitos, o resistencia injustificada a dejar que otros hagan las cosas',
      'f60_5.intrusive_thoughts':
        'Pensamientos o impulsos a actuar intrusivos y persistentes que no alcanzan la gravedad de un trastorno obsesivo-compulsivo',
      'f60_5.exclude_ocd':
        'No existen auténticas obsesiones o compulsiones egodistónicas propias de un trastorno obsesivo-compulsivo (F42)',
    },
  },
  anxious_avoidant_personality_disorder: {
    name: 'Trastorno de la personalidad ansioso (evitativo)',
    differentials: [
      'Trastorno de ansiedad social (ligado a situaciones, no continuo)',
      'Trastorno esquizoide de la personalidad (retraimiento por desinterés en lugar de por temor)',
      'Trastorno dependiente de la personalidad',
      'Episodio depresivo con retraimiento',
    ],
    groups: {
      ...icd11PdGroups('avd'),
      'f60_6.general': 'Criterios generales de un trastorno de la personalidad (F60 General)',
      'f60_6.features': 'Rasgos característicos (al menos 4)',
      'f60_6.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      ...icd11PdCriteria('avd', ['negative_affectivity', 'detachment']),
      'f60_6.general_deviation':
        'Patrón perdurable de vivencia interna y de conducta que se desvía notablemente de las expectativas del entorno sociocultural y que se manifiesta en la cognición, la afectividad, el control de impulsos o el comportamiento interpersonal',
      'f60_6.general_pervasive':
        'El patrón desviado es profundo e inflexible a lo largo de un amplio espectro de situaciones personales y sociales (no limitado a una única situación desencadenante)',
      'f60_6.general_distress':
        'El patrón conlleva malestar personal y/o deterioro acusado en el ámbito social, laboral u otras áreas importantes de funcionamiento',
      'f60_6.general_onset':
        'El patrón es estable y de larga duración, y su inicio se puede rastrear hasta la adolescencia o el inicio de la edad adulta',
      'f60_6.general_not_organic':
        'El patrón no es expresión ni consecuencia de otro trastorno mental y no está causado directamente por una enfermedad, lesión o disfunción cerebral',
      'f60_6.tension_apprehension':
        'Sentimientos persistentes y generalizados de tensión y aprensión',
      'f60_6.feeling_inferior':
        'Convicción de ser socialmente torpe, poco atractivo o inferior a los demás',
      'f60_6.preoccupation_criticism':
        'Preocupación excesiva por la posibilidad de ser criticado o rechazado en situaciones sociales',
      'f60_6.reluctance_without_acceptance':
        'Resistencia a implicarse en contactos interpersonales salvo que exista una garantía segura de aceptación',
      'f60_6.restricted_lifestyle':
        'Estilo de vida restringido derivado de la necesidad de seguridad física',
      'f60_6.avoidance_activities':
        'Evitación de actividades laborales o sociales que impliquen un contacto interpersonal significativo, por temor a la crítica, la desaprobación o el rechazo',
      'f60_6.exclude_social_phobia':
        'El patrón es continuo y perdurable, y no se limita a situaciones fóbicas circunscritas propias de un trastorno de ansiedad social',
    },
  },
  dependent_personality_disorder: {
    name: 'Trastorno dependiente de la personalidad',
    differentials: [
      'Trastorno de la personalidad ansioso (evitativo)',
      'Trastorno de inestabilidad emocional de la personalidad',
      'Episodio depresivo con tendencia al aferramiento',
      'Agorafobia con necesidad de persona acompañante',
    ],
    groups: {
      ...icd11PdGroups('dep'),
      'f60_7.general': 'Criterios generales de un trastorno de la personalidad (F60 General)',
      'f60_7.features': 'Rasgos característicos (al menos 4)',
      'f60_7.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      ...icd11PdCriteria('dep', ['negative_affectivity']),
      'f60_7.general_deviation':
        'Patrón perdurable de vivencia interna y de conducta que se desvía notablemente de las expectativas del entorno sociocultural y que se manifiesta en la cognición, la afectividad, el control de impulsos o el comportamiento interpersonal',
      'f60_7.general_pervasive':
        'El patrón desviado es profundo e inflexible a lo largo de un amplio espectro de situaciones personales y sociales (no limitado a una única situación desencadenante)',
      'f60_7.general_distress':
        'El patrón conlleva malestar personal y/o deterioro acusado en el ámbito social, laboral u otras áreas importantes de funcionamiento',
      'f60_7.general_onset':
        'El patrón es estable y de larga duración, y su inicio se puede rastrear hasta la adolescencia o el inicio de la edad adulta',
      'f60_7.general_not_organic':
        'El patrón no es expresión ni consecuencia de otro trastorno mental y no está causado directamente por una enfermedad, lesión o disfunción cerebral',
      'f60_7.delegating_decisions':
        'Pedir a los demás, o permitir que sean ellos, que tomen la mayoría de las decisiones importantes de la propia vida',
      'f60_7.subordination':
        'Subordinación de las propias necesidades a las de las personas de quienes se depende y sumisión excesiva a sus deseos',
      'f60_7.reluctance_demands':
        'Escasa disposición a expresar incluso exigencias razonables ante las personas de referencia',
      'f60_7.discomfort_alone':
        'Malestar o sentimientos de impotencia al estar solo, por un temor exagerado a no poder cuidar de uno mismo',
      'f60_7.fear_abandonment':
        'Temor frecuente a ser abandonado por una persona allegada y a quedarse valiéndose por sí mismo',
      'f60_7.need_reassurance':
        'Capacidad limitada para tomar decisiones cotidianas sin un consejo y una aprobación excesivos por parte de los demás',
      'f60_7.exclude_depression_agora':
        'El patrón de dependencia es perdurable y no se explica mejor por un episodio depresivo o por un trastorno agorafóbico',
    },
  },
  icd11_dimensional_personality_disorder: {
    name: 'Trastorno de la personalidad — modelo dimensional (CIE-11)',
    differentials: [
      'Dificultad de la personalidad (6D11.0, subclínica)',
      'Cambio conductual transitorio reactivo al estrés',
      'Otro trastorno mental primario con rasgos de personalidad secundarios',
      'Trastorno orgánico de la personalidad',
    ],
    groups: {
      '6d10.core': 'Núcleo: disfunción perdurable del funcionamiento de la personalidad',
      '6d10.severity': 'Clasificación de la gravedad (exactamente un nivel; 6D10)',
      '6d11.trait_domains': 'Calificadores de dominios de rasgos (uno o varios; 6D11)',
      '6d10.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      '6d10.self_functioning':
        'Afectación persistente de aspectos del self (p. ej., identidad, autoestima, autodirección, fijación de objetivos)',
      '6d10.interpersonal_functioning':
        'Afectación persistente del funcionamiento interpersonal (establecer y mantener relaciones próximas y mutuamente satisfactorias)',
      '6d10.duration_pervasive':
        'El patrón persiste durante un período prolongado (del orden de ≥ 2 años) y se manifiesta de forma transversal a las situaciones',
      '6d10.manifest_patterns':
        'El trastorno se manifiesta en patrones desadaptativos de cognición, vivencia emocional, expresión emocional y conducta',
      '6d10.severity_mild':
        'Trastorno leve de la personalidad: afectación de algunas áreas de funcionamiento, con capacidad funcional preservada en muchas otras; riesgo bajo de daño a sí mismo o a terceros (6D10.0)',
      '6d10.severity_moderate':
        'Trastorno moderado de la personalidad: problemas acusados en varias áreas de funcionamiento, con deterioro marcado en la mayoría de las relaciones interpersonales y de los roles sociales/laborales (6D10.1)',
      '6d10.severity_severe':
        'Trastorno grave de la personalidad: deterioro grave del funcionamiento del self y del funcionamiento interpersonal en casi todas las áreas de la vida; con frecuencia, riesgo considerable de daño a sí mismo o a terceros (6D10.2)',
      '6d11.negative_affectivity':
        'Afectividad negativa: tendencia a un amplio espectro de emociones negativas (ansiedad, labilidad emocional, desconfianza, baja autoestima) con una frecuencia/intensidad desproporcionada (6D11.0)',
      '6d11.detachment':
        'Distanciamiento: tendencia al retraimiento social y emocional, al establecimiento limitado de relaciones y a la reducción de la expresión afectiva (6D11.1)',
      '6d11.dissociality':
        'Disocialidad: menosprecio de los derechos y sentimientos de los demás, egocentrismo, falta de empatía y escasa consideración (6D11.2)',
      '6d11.disinhibition':
        'Desinhibición: tendencia a actuar de forma impulsiva ante estímulos internos o externos inmediatos, sin considerar las consecuencias a más largo plazo (6D11.3)',
      '6d11.anankastia':
        'Anancasmo: foco en estándares rígidos de perfección, orden y control sobre la propia conducta y la de los demás (6D11.4)',
      '6d11.borderline_pattern':
        'Patrón límite: inestabilidad generalizada de la autoimagen, las relaciones y el afecto, con impulsividad, temor al abandono y autolesiones recurrentes (6D11.5)',
      '6d10.exclude_other_organic':
        'Las alteraciones no se explican mejor por otro trastorno mental, por los efectos de una sustancia o por una enfermedad del sistema nervioso, y no son propias de una fase del desarrollo ni normativas desde el punto de vista sociocultural',
    },
  },
  gambling_disorder: {
    name: 'Juego patológico (trastorno por juego de azar)',
    differentials: [
      'Episodio maníaco/hipomaníaco con juego excesivo',
      'Trastorno disocial de la personalidad con problemas de juego',
      'Juego en el marco de un trastorno por consumo de sustancias',
      'Juego habitual, socialmente compatible y sin pérdida de control',
    ],
    groups: {
      'f63_0.core': 'Núcleo: conducta de juego recurrente y desadaptativa',
      'f63_0.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f63_0.recurrent_gambling':
        'Conducta de juego de azar reiterada y persistente, que se mantiene y se intensifica a pesar de sus consecuencias sociales, laborales, materiales y familiares adversas',
      'f63_0.impaired_control':
        'Control deteriorado sobre la conducta de juego (inicio, frecuencia, intensidad, duración, finalización)',
      'f63_0.priority':
        'El juego adquiere una prioridad creciente sobre otros intereses y obligaciones cotidianas',
      'f63_0.preoccupation':
        'Vivencia mental e imperiosa del juego, así como de la obtención de los medios necesarios para ello',
      'f63_0.exclude_mania_dissocial':
        'La conducta de juego no aparece exclusivamente en el marco de un episodio maníaco y no se explica mejor por un trastorno disocial de la personalidad',
    },
  },
  pyromania: {
    name: 'Piromanía (incendiarismo patológico)',
    differentials: [
      'Incendio provocado de forma deliberada por afán de lucro, venganza o motivación política',
      'Incendio provocado en el marco de un trastorno disocial de la personalidad o de un trastorno de la conducta',
      'Incendio provocado bajo intoxicación o en un trastorno psicótico',
      'Incendio provocado en una discapacidad intelectual o en una enfermedad demencial',
    ],
    groups: {
      'f63_1.core': 'Núcleo: incendio recurrente sin motivo comprensible',
      'f63_1.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f63_1.repeated_firesetting':
        'Provocación o intento de provocación reiterados de incendios en objetos o propiedades, sin un motivo racional reconocible',
      'f63_1.preoccupation_fire':
        'Intensa preocupación mental por el fuego y la combustión, así como interés persistente por todo lo relacionado con el fuego',
      'f63_1.tension_relief':
        'Sensación creciente de tensión antes del acto y vivencia intensa de alivio, excitación o satisfacción durante e inmediatamente después de provocar el incendio',
      'f63_1.exclude_motivated_firesetting':
        'El incendio no responde a un beneficio material, a una venganza, a una intención política ni al encubrimiento de un delito',
      'f63_1.exclude_other_disorder':
        'La conducta no se explica mejor por un trastorno disocial de la personalidad, un trastorno psicótico, una intoxicación por sustancias o un trastorno orgánico',
    },
  },
  kleptomania: {
    name: 'Cleptomanía (robo patológico)',
    differentials: [
      'Robo por afán de lucro personal (hurto en comercios habitual)',
      'Robo en el marco de un trastorno disocial de la personalidad o de un trastorno de la conducta',
      'Robo bajo intoxicación o en un trastorno psicótico/maníaco',
      'Robo en un trastorno demencial u otro trastorno orgánico',
    ],
    groups: {
      'f63_2.core': 'Núcleo: robo reiterado sin afán de enriquecimiento',
      'f63_2.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f63_2.repeated_stealing':
        'Fracaso reiterado en resistir el impulso de robar objetos que no se destinan al uso personal ni al beneficio material',
      'f63_2.tension_relief':
        'Sensación creciente de tensión inmediatamente antes del acto y vivencia de alivio, satisfacción o placer durante y después del robo',
      'f63_2.no_personal_gain':
        'Los objetos robados no se necesitan; con frecuencia se regalan, se desechan o se acumulan; el robo no se comete por ira ni por venganza',
      'f63_2.exclude_motivated_theft':
        'El robo no se realiza por enriquecimiento y no se explica mejor por un trastorno disocial de la personalidad, un episodio maníaco o un trastorno orgánico',
    },
  },
  trichotillomania: {
    name: 'Tricotilomanía (arrancamiento patológico del cabello)',
    differentials: [
      'Causa dermatológica de la pérdida de cabello (p. ej., alopecia areata)',
      'Arrancamiento del cabello como reacción a un delirio o una alucinación',
      'Trastorno de movimientos estereotipados',
      'Trastorno dismórfico corporal con conducta de tironeo',
      'Trastorno obsesivo-compulsivo con conducta ritualizada',
    ],
    groups: {
      'f63_3.core': 'Núcleo: arrancamiento reiterado del cabello con pérdida capilar perceptible',
      'f63_3.exclusions': 'Exclusiones / diagnóstico diferencial',
    },
    criteria: {
      'f63_3.hair_pulling':
        'Arrancamiento reiterado del propio cabello que da lugar a una pérdida capilar acusada',
      'f63_3.failed_resistance':
        'Intentos reiterados e infructuosos de reducir o detener el arrancamiento del cabello',
      'f63_3.tension_relief':
        'Sensación creciente de tensión antes de arrancarse el cabello (o al intentar resistir el impulso) y alivio o satisfacción posteriores',
      'f63_3.exclude_dermatological_psychotic':
        'La pérdida de cabello no se debe a una enfermedad cutánea inflamatoria y el arrancamiento no se produce como reacción a un delirio o una alucinación',
    },
  },
}
