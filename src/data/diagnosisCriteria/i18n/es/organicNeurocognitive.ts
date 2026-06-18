import type { DisorderTranslationMap } from '../types'

/** ES translations — ICD-10 F0 block. */
export const esOrganicNeurocognitive: DisorderTranslationMap = {
  dementia_alzheimer: {
    name: 'Demencia en la enfermedad de Alzheimer',
    differentials: [
      'Demencia vascular (curso escalonado, signos neurológicos focales)',
      'Pseudodemencia depresiva',
      'Delírium (inicio agudo, nivel de conciencia fluctuante)',
      'Demencia frontotemporal o demencia por cuerpos de Lewy',
      'Cambio cognitivo normal asociado a la edad',
    ],
    groups: {
      'f00.cognition': 'Síntomas cognitivos nucleares',
      'f00.course': 'Curso y repercusión',
      'f00.exclusions': 'Exclusiones',
      '6d80.cognitive_domains': 'Deterioro cognitivo adquirido en al menos dos dominios',
      '6d80.independence': 'Afectación de la autonomía',
      '6d80.aetiology': 'Atribución etiológica: enfermedad de Alzheimer',
      '6d80.exclusions': 'Exclusiones',
    },
    criteria: {
      'f00.memory_impairment':
        'Deterioro de la memoria, más evidente en el aprendizaje de información nueva, en un grado que excede el olvido normal',
      'f00.cognitive_decline':
        'Declive de otras funciones cognitivas superiores (p. ej., juicio, pensamiento, planificación, lenguaje) respecto al nivel de rendimiento previo',
      'f00.duration_six_months':
        'Los síntomas persisten desde hace al menos aproximadamente seis meses',
      'f00.insidious_onset':
        'Inicio insidioso con deterioro lento y continuo, sin episodios bruscos de empeoramiento',
      'f00.functional_impact':
        'Afectación del desempeño de las actividades de la vida diaria como consecuencia del deterioro cognitivo',
      'f00.exclude_clouding':
        'Ausencia de obnubilación de la conciencia que sugiera un delírium (la conciencia está clara)',
      'f00.exclude_other_cause':
        'Ausencia de indicios de otra enfermedad sistémica o cerebral, o de daño cerebrovascular, que explique mejor el cuadro',
      '6d80.domain_memory':
        'Deterioro adquirido del aprendizaje y la memoria respecto al nivel de rendimiento previo',
      '6d80.domain_executive':
        'Deterioro de las funciones ejecutivas como la planificación, el juicio o la resolución de problemas',
      '6d80.domain_attention':
        'Deterioro de la atención, la concentración o la velocidad de procesamiento',
      '6d80.domain_language':
        'Deterioro de las funciones del lenguaje (p. ej., evocación de palabras, denominación, comprensión)',
      '6d80.domain_social_cognition':
        'Deterioro de la cognición social o de las capacidades visuoespaciales o práxicas',
      '6d80.functional_impact':
        'El deterioro cognitivo afecta la autonomía en las actividades de la vida diaria',
      '6d80.alzheimer_pattern':
        'Inicio insidioso con curso lentamente progresivo y deterioro temprano y predominante de la memoria, compatible con una enfermedad de Alzheimer como causa subyacente',
      '6d80.exclude_delirium_other':
        'El deterioro no es atribuible únicamente a un delírium ni se explica mejor por otro trastorno mental',
    },
  },
  vascular_dementia: {
    name: 'Demencia vascular',
    differentials: [
      'Demencia en la enfermedad de Alzheimer (insidiosa, continua)',
      'Demencia mixta (vascular y de tipo Alzheimer)',
      'Delírium',
      'Depresión con déficits cognitivos',
    ],
    groups: {
      'f01.cognition': 'Síndrome de deterioro cognitivo',
      'f01.vascular': 'Indicios de origen cerebrovascular',
      'f01.course': 'Duración',
      'f01.exclusions': 'Exclusiones',
      '6d81.cognitive_domains': 'Deterioro cognitivo adquirido en al menos dos dominios',
      '6d81.independence': 'Afectación de la autonomía',
      '6d81.vascular_aetiology': 'Atribución etiológica: enfermedad cerebrovascular',
      '6d81.exclusions': 'Exclusiones',
    },
    criteria: {
      'f01.memory_impairment':
        'Deterioro de la memoria y de otras funciones cognitivas que afecta el desempeño de la vida diaria',
      'f01.uneven_deficits':
        'Patrón de déficits desigual («en parches»), en el que algunas funciones cognitivas están afectadas y otras relativamente conservadas',
      'f01.stepwise_course':
        'Deterioro escalonado, a menudo con relación temporal con episodios cerebrovasculares',
      'f01.focal_signs':
        'Signos neurológicos focales o evidencia anamnésica o de neuroimagen de una enfermedad cerebrovascular que se asume causal',
      'f01.duration_six_months':
        'La sintomatología persiste desde hace al menos aproximadamente seis meses',
      'f01.exclude_clouding':
        'Ausencia de obnubilación de la conciencia en el sentido de un delírium',
      '6d81.domain_memory':
        'Deterioro adquirido del aprendizaje y la memoria respecto al nivel de rendimiento previo',
      '6d81.domain_executive':
        'Deterioro de las funciones ejecutivas como la planificación, el juicio o la resolución de problemas',
      '6d81.domain_attention':
        'Deterioro de la atención, la concentración o la velocidad de procesamiento',
      '6d81.domain_language':
        'Deterioro de las funciones del lenguaje (p. ej., evocación de palabras, denominación, comprensión)',
      '6d81.domain_social_cognition':
        'Deterioro de la cognición social o de las capacidades visuoespaciales o práxicas',
      '6d81.functional_impact':
        'El deterioro cognitivo afecta la autonomía en las actividades de la vida diaria',
      '6d81.stepwise_course':
        'Curso escalonado o fluctuante con relación temporal con episodios cerebrovasculares',
      '6d81.cerebrovascular_evidence':
        'Evidencia anamnésica, clínica o de neuroimagen de una enfermedad cerebrovascular que se presume causal',
      '6d81.exclude_delirium_other':
        'El deterioro no es atribuible únicamente a un delírium ni se explica mejor por otro trastorno mental',
    },
  },
  frontotemporal_dementia: {
    name: 'Demencia frontotemporal',
    differentials: [
      'Demencia en la enfermedad de Alzheimer (predomina el trastorno temprano de la memoria)',
      'Trastorno psiquiátrico primario (p. ej., manía o depresión de inicio tardío)',
      'Trastorno orgánico de la personalidad sin deterioro cognitivo progresivo',
    ],
    groups: {
      'f02_0.behavior': 'Síntomas conductuales o del lenguaje precoces y dominantes',
      'f02_0.course': 'Curso',
      'f02_0.exclusions': 'Exclusiones',
      '6d83.cognitive_domains': 'Deterioro cognitivo adquirido en al menos dos dominios',
      '6d83.ftd_presentation': 'Síndrome frontotemporal precoz y dominante (al menos uno)',
      '6d83.course': 'Curso y preservación relativa de la memoria',
      '6d83.independence': 'Afectación de la autonomía',
      '6d83.exclusions': 'Exclusiones',
    },
    criteria: {
      'f02_0.personality_change':
        'Cambio precoz y marcado de la personalidad y la conducta social, con desinhibición, pérdida de las formas sociales, apatía o disminución del impulso',
      'f02_0.language_decline':
        'Declive precoz de la capacidad de expresión verbal (dificultad para encontrar palabras o empobrecimiento del lenguaje), con memoria inicialmente bastante conservada',
      'f02_0.insidious_onset':
        'Inicio insidioso y curso lentamente progresivo desde hace al menos aproximadamente seis meses',
      'f02_0.relative_memory_sparing':
        'La memoria y la orientación espacial están, en las fases iniciales, relativamente más conservadas que el trastorno conductual o del lenguaje',
      'f02_0.exclude_other_cause':
        'El cuadro no se explica mejor por otra enfermedad cerebral, un delírium o un trastorno afectivo primario',
      '6d83.domain_memory':
        'Deterioro adquirido del aprendizaje y la memoria respecto al nivel de rendimiento previo',
      '6d83.domain_executive':
        'Deterioro de las funciones ejecutivas como la planificación, el juicio o la resolución de problemas',
      '6d83.domain_attention':
        'Deterioro de la atención, la concentración o la velocidad de procesamiento',
      '6d83.domain_language':
        'Deterioro de las funciones del lenguaje (p. ej., evocación de palabras, denominación, comprensión)',
      '6d83.domain_social_cognition':
        'Deterioro de la cognición social o de las capacidades visuoespaciales o práxicas',
      '6d83.behavioural_change':
        'Cambio precoz y dominante de la conducta y la personalidad (desinhibición, apatía, pérdida de las formas sociales)',
      '6d83.language_decline':
        'Declive precoz y dominante del lenguaje (evocación de palabras, producción o comprensión)',
      '6d83.insidious_onset':
        'Inicio insidioso y curso lentamente progresivo',
      '6d83.relative_memory_sparing':
        'La memoria y la orientación espacial están, en las fases iniciales, relativamente más conservadas que el trastorno conductual o del lenguaje',
      '6d83.functional_impact':
        'El deterioro cognitivo o conductual afecta la autonomía en las actividades de la vida diaria',
      '6d83.exclude_delirium_other':
        'El deterioro no es atribuible únicamente a un delírium ni se explica mejor por otro trastorno mental o afectivo primario',
    },
  },
  dementia_lewy_bodies: {
    name: 'Demencia por cuerpos de Lewy',
    differentials: [
      'Demencia en la enfermedad de Alzheimer',
      'Demencia de la enfermedad de Parkinson',
      'Delírium (agudo, fluctuante): puede asemejarse a la demencia por cuerpos de Lewy',
      'Alucinaciones inducidas por sustancias o medicamentos',
    ],
    groups: {
      'f02_8.core': 'Demencia con rasgos nucleares característicos',
      'f02_8.features': 'Rasgos característicos (al menos 2)',
      'f02_8.exclusions': 'Exclusiones',
      '6d82.cognitive_domains': 'Deterioro cognitivo adquirido en al menos dos dominios',
      '6d82.independence': 'Afectación de la autonomía',
      '6d82.lewy_features': 'Rasgos característicos de cuerpos de Lewy (al menos 2)',
      '6d82.exclusions': 'Exclusiones',
    },
    criteria: {
      'f02_8.progressive_decline':
        'Deterioro cognitivo progresivo que afecta el desempeño de la vida diaria',
      'f02_8.fluctuating_cognition':
        'Marcadas fluctuaciones del rendimiento cognitivo, en particular de la atención y el estado de alerta',
      'f02_8.visual_hallucinations':
        'Alucinaciones visuales recurrentes, por lo general detalladas y concretas',
      'f02_8.parkinsonism':
        'Síntomas parkinsonianos de aparición espontánea (p. ej., rigidez, bradicinesia, temblor de reposo)',
      'f02_8.rem_sleep_neuroleptic':
        'Indicios de apoyo como trastorno de conducta del sueño REM o marcada hipersensibilidad a los neurolépticos',
      'f02_8.exclude_delirium_substance':
        'Los síntomas no se explican mejor por un delírium ni por el efecto de sustancias o medicamentos',
      '6d82.domain_memory':
        'Deterioro adquirido del aprendizaje y la memoria respecto al nivel de rendimiento previo',
      '6d82.domain_executive':
        'Deterioro de las funciones ejecutivas como la planificación, el juicio o la resolución de problemas',
      '6d82.domain_attention':
        'Deterioro de la atención, la concentración o la velocidad de procesamiento',
      '6d82.domain_language':
        'Deterioro de las funciones del lenguaje (p. ej., evocación de palabras, denominación, comprensión)',
      '6d82.domain_social_cognition':
        'Deterioro de la cognición social o de las capacidades visuoespaciales o práxicas',
      '6d82.functional_impact':
        'El deterioro cognitivo afecta la autonomía en las actividades de la vida diaria',
      '6d82.fluctuating_cognition':
        'Marcadas fluctuaciones de la cognición, la atención y el estado de alerta',
      '6d82.visual_hallucinations':
        'Alucinaciones visuales recurrentes, por lo general detalladas y concretas',
      '6d82.parkinsonism':
        'Síntomas parkinsonianos de aparición espontánea (p. ej., rigidez, bradicinesia, temblor de reposo)',
      '6d82.rem_sleep_behaviour':
        'Indicios de apoyo como trastorno de conducta del sueño REM o marcada hipersensibilidad a los neurolépticos',
      '6d82.exclude_delirium_substance':
        'El deterioro no es atribuible únicamente a un delírium ni al efecto de sustancias o medicamentos',
    },
  },
  delirium_not_substance_induced: {
    name: 'Delírium no inducido por sustancias',
    differentials: [
      'Demencia (inicio insidioso, conciencia clara)',
      'Delírium inducido por sustancias (intoxicación/abstinencia, F1x.4)',
      'Trastorno psicótico agudo',
      'Estado epiléptico no convulsivo',
    ],
    groups: {
      'f05.consciousness': 'Alteración de la conciencia y la atención',
      'f05.global': 'Alteración cognitiva global (al menos 1)',
      'f05.course': 'Curso agudo y fluctuante',
      'f05.exclusions': 'Exclusiones',
    },
    criteria: {
      'f05.clouded_consciousness':
        'Alteración de la conciencia y del estado de alerta, con reducción de la claridad en la percepción del entorno',
      'f05.attention_disturbance':
        'Disminución de la capacidad para dirigir, mantener y desplazar la atención',
      'f05.disorientation':
        'Alteración de la memoria y de la orientación (temporal, espacial o respecto a la persona)',
      'f05.perceptual_disturbance':
        'Alteraciones de la percepción como falsos reconocimientos, ilusiones o alucinaciones (por lo general visuales)',
      'f05.psychomotor_disturbance':
        'Alteración psicomotora con rápida alternancia entre hiperactividad e hipoactividad',
      'f05.sleep_wake_disturbance':
        'Alteración del ritmo sueño-vigilia (p. ej., insomnio, empeoramiento nocturno, inversión del ritmo)',
      'f05.acute_fluctuating':
        'Inicio rápido (de horas a días) y gravedad de la sintomatología fluctuante a lo largo del día',
      'f05.exclude_substance':
        'El delírium no se debe al alcohol ni a otras sustancias psicótropas (en cuyo caso sería F1x.4), sino que es atribuible a una enfermedad somática o a una causa cerebral',
    },
  },
  organic_amnestic_syndrome: {
    name: 'Síndrome amnésico orgánico',
    differentials: [
      'Demencia (además, deterioro cognitivo más amplio)',
      'Delírium (alteración de la conciencia y la atención)',
      'Síndrome amnésico relacionado con el alcohol / síndrome de Korsakoff (F10.6)',
      'Amnesia disociativa',
    ],
    groups: {
      'f04.memory': 'Trastorno de la memoria en primer plano',
      'f04.aetiology': 'Base orgánica',
      'f04.exclusions': 'Exclusiones',
    },
    criteria: {
      'f04.anterograde_retrograde':
        'Trastorno marcado de la memoria a corto plazo o reciente (amnesia anterógrada) y, con frecuencia, también del recuerdo de contenidos pasados (amnesia retrógrada)',
      'f04.immediate_recall_preserved':
        'La reproducción inmediata (p. ej., repetición de cifras) y la conciencia están conservadas',
      'f04.organic_cause':
        'Evidencia o presunción fundada de una enfermedad o disfunción cerebral lesiva (no debida al alcohol o a sustancias) como causa',
      'f04.exclude_global_decline':
        'Ausencia de un declive global de la capacidad intelectual como el típico de una demencia, y ausencia de alteración de la atención propia de un delírium',
      'f04.exclude_substance':
        'El trastorno no está causado por el alcohol ni por otras sustancias psicótropas',
    },
  },
  mild_cognitive_disorder: {
    name: 'Trastorno cognitivo leve',
    differentials: [
      'Demencia (afectación del desempeño autónomo de la vida diaria)',
      'Delírium',
      'Depresión con quejas subjetivas de concentración',
      'Cambio cognitivo normal asociado a la edad',
    ],
    groups: {
      'f06_7.cognition': 'Leve disminución del rendimiento cognitivo',
      'f06_7.exclusions': 'Exclusiones',
    },
    criteria: {
      'f06_7.cognitive_decline':
        'Disminución del rendimiento cognitivo (p. ej., memoria, concentración, aprendizaje) respecto al nivel previo, referida subjetivamente y objetivable',
      'f06_7.organic_context':
        'Las dificultades cognitivas aparecen en relación con una enfermedad somática o cerebral',
      'f06_7.exclude_dementia':
        'La magnitud no justifica el diagnóstico de una demencia, un delírium o un síndrome amnésico; el desempeño autónomo de la vida diaria se mantiene en lo esencial',
    },
  },
  organic_personality_disorder: {
    name: 'Trastorno orgánico de la personalidad',
    differentials: [
      'Demencia frontotemporal (deterioro cognitivo progresivo)',
      'Trastorno primario de la personalidad (de por vida, sin causa orgánica)',
      'Trastorno afectivo o manía',
      'Cambio de la personalidad debido a sustancias',
    ],
    groups: {
      'f07_0.change': 'Cambio persistente de la personalidad',
      'f07_0.features': 'Cambios característicos (al menos 2)',
      'f07_0.exclusions': 'Exclusiones',
    },
    criteria: {
      'f07_0.personality_change':
        'Cambio persistente del patrón previo de personalidad y conducta tras una enfermedad o lesión cerebral',
      'f07_0.organic_cause':
        'Evidencia o presunción fundada de una enfermedad, lesión o disfunción cerebral causal',
      'f07_0.affective_change':
        'Vida afectiva alterada, con labilidad emocional, euforia o apatía',
      'f07_0.disinhibition':
        'Disminución del control de los impulsos, con desinhibición, irritabilidad o accesos de agresividad',
      'f07_0.goal_directed':
        'Afectación de las actividades dirigidas a un objetivo, con reducción de la perseverancia y trastorno del impulso',
      'f07_0.social_conduct':
        'Conducta social alterada con desatención de las normas sociales (p. ej., falta de tacto, desinhibición sexual)',
      'f07_0.exclude_dementia_delirium':
        'El cambio no se explica mejor por una demencia, un delírium u otro trastorno mental; no predomina un deterioro cognitivo relevante',
    },
  },
  organic_hallucinosis: {
    name: 'Alucinosis orgánica',
    differentials: [
      'Esquizofrenia o trastorno delirante',
      'Alucinosis inducida por sustancias / alucinosis por abstinencia',
      'Delírium (obnubilación de la conciencia)',
      'Privación sensorial (p. ej., síndrome de Charles Bonnet)',
    ],
    groups: {
      'f06_0.core': 'Alucinaciones persistentes con conciencia clara',
      'f06_0.exclusions': 'Exclusiones',
    },
    criteria: {
      'f06_0.persistent_hallucinations':
        'Alucinaciones persistentes o recurrentes (por lo general visuales o auditivas) que dominan el cuadro',
      'f06_0.clear_consciousness':
        'Las alucinaciones aparecen con conciencia clara y orientación conservada',
      'f06_0.organic_cause':
        'Evidencia o presunción fundada de una enfermedad somática o cerebral causal',
      'f06_0.exclude_primary_psychosis':
        'Ausencia de un cuadro esquizofrénico o afectivo predominante y de obnubilación de la conciencia propia de un delírium; no debida a sustancias',
    },
  },
  organic_delusional_disorder: {
    name: 'Trastorno delirante (esquizofreniforme) orgánico',
    differentials: [
      'Esquizofrenia / trastorno delirante persistente',
      'Trastorno psicótico inducido por sustancias',
      'Delírium',
      'Trastorno afectivo con síntomas psicóticos',
    ],
    groups: {
      'f06_2.core': 'Delirio con conciencia clara',
      'f06_2.exclusions': 'Exclusiones',
    },
    criteria: {
      'f06_2.persistent_delusions':
        'Ideas delirantes persistentes y predominantes (p. ej., de persecución, de perjuicio o de grandeza)',
      'f06_2.clear_consciousness':
        'El delirio aparece con conciencia clara y sin deterioro cognitivo marcado',
      'f06_2.organic_cause':
        'Evidencia o presunción fundada de una enfermedad somática o cerebral causal',
      'f06_2.exclude_primary_substance':
        'No se explica mejor por una esquizofrenia o un trastorno afectivo primarios, un delírium o el efecto de sustancias',
    },
  },
  organic_mood_disorder: {
    name: 'Trastorno afectivo orgánico',
    differentials: [
      'Trastorno depresivo o bipolar primario',
      'Trastorno afectivo inducido por sustancias o medicamentos',
      'Trastorno de adaptación',
      'Demencia con síntomas afectivos',
    ],
    groups: {
      'f06_3.core': 'Trastorno del afecto de origen orgánico',
      'f06_3.exclusions': 'Exclusiones',
    },
    criteria: {
      'f06_3.mood_change':
        'Cambio del estado de ánimo o del afecto en el sentido de una sintomatología depresiva, maníaca o mixta',
      'f06_3.organic_cause':
        'Evidencia o presunción fundada de una enfermedad somática o cerebral causal (p. ej., trastorno endocrino, lesión cerebral)',
      'f06_3.exclude_primary_substance':
        'No se explica mejor por un trastorno afectivo primario o por el efecto de sustancias',
    },
  },
}
