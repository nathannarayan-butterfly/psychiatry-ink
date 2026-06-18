import type { DisorderTranslationMap } from '../types'

/** ES translations — ICD-10 F5 block. */
export const esBehaviouralSyndromes: DisorderTranslationMap = {
  anorexia_nervosa: {
    name: 'Anorexia nerviosa',
    differentials: [
      'Bulimia nerviosa (peso habitualmente normal o aumentado)',
      'Causa somática de la pérdida de peso (p. ej. neoplasia maligna, hipertiroidismo, malabsorción)',
      'Episodio depresivo con pérdida de apetito',
      'Trastorno de evitación/restricción de la ingesta de alimentos (ARFID; sin alteración de la imagen corporal)',
    ],
    groups: {
      'f50_0.core': 'Núcleo: bajo peso autoinducido con fobia al peso',
      'f50_0.endocrine': 'Rasgos endocrinos/somáticos secundarios (al menos 1)',
      'f50_0.exclusions': 'Exclusiones',
      '6b80.core': 'Núcleo: bajo peso significativo con conducta y cognición de mantenimiento del peso',
      '6b80.exclusions': 'Exclusiones',
    },
    criteria: {
      'f50_0.low_weight':
        'Peso corporal marcadamente bajo (p. ej. IMC ≤ 17,5 kg/m² en adultos o por debajo del peso esperado en edad de crecimiento), autoinducido',
      'f50_0.self_induced_weight_loss':
        'Reducción activa del peso mediante una ingesta restringida de alimentos o medidas adicionales (ejercicio excesivo, vómitos, laxantes, anorexígenos)',
      'f50_0.body_image_distortion':
        'Alteración de la imagen corporal con un miedo sobrevalorado a engordar y un umbral de peso personal bajo',
      'f50_0.endocrine_disturbance':
        'Trastorno endocrino (p. ej. amenorrea, pérdida de la libido o de la potencia) o desarrollo puberal retrasado como consecuencia de la malnutrición',
      'f50_0.exclude_organic':
        'El bajo peso no se explica por otra enfermedad somática que curse con pérdida de apetito o de peso',
      '6b80.low_weight':
        'Peso corporal significativamente bajo para la talla, la edad y la etapa de desarrollo (valor orientativo IMC < 18,5 kg/m² en adultos) o pérdida de peso rápida (p. ej. > 20 % en unos seis meses), no explicada por otra enfermedad ni por falta de alimentos',
      '6b80.weight_control_behaviours':
        'Patrón conductual persistente dirigido a inducir o mantener el peso anormalmente bajo (ingesta restringida, ayuno, vómitos autoinducidos, abuso de laxantes/diuréticos, actividad física excesiva)',
      '6b80.cognitive':
        'Sobrevaloración del bajo peso o preocupación excesiva por la figura/el peso, O bien falta de conciencia de la gravedad del bajo peso',
      '6b80.exclude_other':
        'El bajo peso no se explica mejor por otra enfermedad somática, por falta de alimentos ni por otro trastorno mental',
    },
  },
  bulimia_nervosa: {
    name: 'Bulimia nerviosa',
    differentials: [
      'Anorexia nerviosa, tipo atracones/purgas (con bajo peso marcado)',
      'Trastorno por atracón (sin medidas compensatorias)',
      'Causa gastrointestinal de los vómitos',
      'Episodio depresivo con atracones',
    ],
    groups: {
      'f50_2.core': 'Núcleo: atracones recurrentes con medidas compensatorias',
      'f50_2.exclusions': 'Exclusiones',
      '6b81.core': 'Núcleo: atracones frecuentes con medidas compensatorias durante ≥ 1 mes (en promedio ≥ 1×/semana)',
      '6b81.exclusions': 'Exclusiones',
    },
    criteria: {
      'f50_2.binge_episodes':
        'Atracones recurrentes con ingesta de grandes cantidades de alimento en poco tiempo y pérdida subjetiva del control sobre la conducta alimentaria',
      'f50_2.compensatory':
        'Medidas compensatorias repetidas para controlar el peso (p. ej. vómitos autoinducidos, abuso de laxantes/diuréticos, ayuno, ejercicio excesivo)',
      'f50_2.overvalued_weight':
        'Preocupación excesiva por la figura y el peso, con un miedo sobrevalorado a aumentar de peso',
      'f50_2.exclude_anorexia':
        'El cuadro no se explica mejor por una anorexia nerviosa (tipo atracones/purgas) con bajo peso marcado',
      '6b81.binge_episodes':
        'Atracones frecuentes y recurrentes (en promedio al menos una vez por semana durante al menos un mes) con ingesta de grandes cantidades de alimento y pérdida subjetiva del control sobre la conducta alimentaria',
      '6b81.compensatory':
        'Medidas compensatorias inapropiadas repetidas para evitar el aumento de peso (vómitos autoinducidos, abuso de laxantes/diuréticos, ayuno, ejercicio excesivo)',
      '6b81.overvaluation':
        'Preocupación excesiva por la figura o el peso que influye de forma inapropiada en la autoevaluación',
      '6b81.exclude_low_weight':
        'El peso corporal no es significativamente bajo (de lo contrario, anorexia nerviosa, tipo atracones/purgas)',
    },
  },
  nonorganic_insomnia: {
    name: 'Insomnio no orgánico',
    differentials: [
      'Trastorno del sueño orgánico (p. ej. apnea del sueño, síndrome de piernas inquietas)',
      'Episodio depresivo o trastorno de ansiedad con alteración del sueño',
      'Insomnio inducido por sustancias o medicamentos',
      'Trastorno del ritmo circadiano de sueño-vigilia',
    ],
    groups: {
      'f51_0.core': 'Núcleo: alteración persistente de conciliación/mantenimiento del sueño con repercusión diurna',
      'f51_0.exclusions': 'Exclusiones',
    },
    criteria: {
      'f51_0.sleep_complaint':
        'Quejas de dificultad para conciliar el sueño, dificultad para mantenerlo o sueño no reparador en varias noches por semana',
      'f51_0.duration':
        'La alteración del sueño persiste durante un periodo prolongado (del orden de ≥ 1 mes)',
      'f51_0.daytime_distress':
        'Malestar marcado o deterioro del bienestar/rendimiento diurnos a consecuencia de la alteración del sueño',
      'f51_0.exclude_organic':
        'La alteración del sueño no se explica suficientemente por una enfermedad orgánica del sueño, el efecto de una sustancia u otro trastorno mental',
    },
  },
  nonorganic_nightmare_disorder: {
    name: 'Pesadillas (no orgánicas)',
    differentials: [
      'Terrores nocturnos (despertar sin contenido onírico claro, no REM)',
      'Trastorno de estrés postraumático con pesadillas asociadas al trauma',
      'Pesadillas inducidas por medicamentos o sustancias',
      'Crisis de pánico nocturnas',
    ],
    groups: {
      'f51_5.core': 'Núcleo: sueños angustiosos repetidos con despertar completo',
      'f51_5.exclusions': 'Exclusiones',
    },
    criteria: {
      'f51_5.nightmares':
        'Despertares repetidos con recuerdo vívido y detallado de sueños intensamente angustiosos (típicamente en la segunda mitad de la noche)',
      'f51_5.full_orientation':
        'Tras el despertar, rápida orientación y vigilia; malestar marcado a causa de los sueños',
      'f51_5.exclude_organic_substance':
        'Las pesadillas no se explican suficientemente por el efecto de una sustancia/medicamento ni por una enfermedad somática',
    },
  },
  nonorganic_sleep_terrors: {
    name: 'Terrores nocturnos (pavor nocturnus)',
    differentials: [
      'Trastorno por pesadillas (recuerdo onírico vívido, despertar completo)',
      'Crisis epilépticas nocturnas',
      'Sonambulismo',
      'Crisis de pánico nocturnas',
    ],
    groups: {
      'f51_4.core': 'Núcleo: despertar episódico de tipo pánico desde el sueño profundo',
      'f51_4.exclusions': 'Exclusiones',
    },
    criteria: {
      'f51_4.terror_episodes':
        'Episodios repetidos de sobresalto brusco de tipo pánico desde el sueño (por lo general en el primer tercio de la noche) con grito de angustia, hiperactivación vegetativa y difícil despertabilidad',
      'f51_4.amnesia':
        'Amnesia casi completa del episodio; durante el suceso la persona es difícil de tranquilizar y apenas accesible',
      'f51_4.exclude_organic':
        'Los episodios no se explican por una enfermedad orgánica (p. ej. epilepsia nocturna) ni por el efecto de una sustancia',
    },
  },
  nonorganic_sexual_dysfunction: {
    name: 'Disfunción sexual no orgánica',
    differentials: [
      'Disfunción sexual de causa orgánica/médica (p. ej. vascular, endocrina, neurológica)',
      'Disfunción sexual inducida por medicamentos o sustancias',
      'Episodio depresivo o trastorno de ansiedad con disfunción secundaria',
      'Conflicto de pareja/relación como causa primaria',
    ],
    groups: {
      'f52.core': 'Núcleo: disfunción sexual persistente sin explicación orgánica suficiente',
      'f52.qualifiers': 'Condiciones',
      'f52.exclusions': 'Exclusiones',
    },
    criteria: {
      'f52.desire_arousal':
        'Falta o pérdida persistente del deseo sexual, o alteración de la excitación sexual (p. ej. disfunción eréctil o de la lubricación)',
      'f52.orgasm':
        'Trastorno del orgasmo (ausencia, retraso marcado) o eyaculación precoz/retardada',
      'f52.pain':
        'Dolor o disfunción de origen sexual (p. ej. vaginismo, dispareunia no orgánica)',
      'f52.persistent_distress':
        'La disfunción es frecuente o persistente e impide la relación sexual deseada por la persona o causa un malestar marcado',
      'f52.exclude_organic':
        'La disfunción no está causada de forma predominante por una enfermedad somática, medicamentos o sustancias',
    },
  },
  puerperal_mental_disorder: {
    name: 'Trastorno mental del puerperio',
    differentials: [
      'Episodio depresivo o psicosis independiente con inicio periparto',
      '«Baby blues» (leve, autolimitado, sin entidad patológica)',
      'Causa tiroidea u otra causa somática posparto',
      'Trastorno bipolar con episodio posparto',
    ],
    groups: {
      'f53.core': 'Núcleo: trastorno mental de inicio en el puerperio',
      'f53.severity': 'Rasgos de gravedad/tipificación (al menos 1)',
      'f53.exclusions': 'Exclusiones',
    },
    criteria: {
      'f53.postpartum_onset':
        'Inicio de un trastorno mental relevante en estrecha relación temporal con el parto (por lo general en el plazo de aproximadamente seis semanas posparto)',
      'f53.clinical_syndrome':
        'Presencia de un síndrome psíquico clínicamente significativo (p. ej. depresivo, ansioso o psicótico), con entidad patológica que va más allá de un mero «baby blues»',
      'f53.psychotic_features':
        'Rasgos psicóticos (delirio, alucinaciones, desorganización grave) en el sentido de una psicosis posparto (CIE-11 6E21)',
      'f53.nonpsychotic_features':
        'Sintomatología no psicótica (p. ej. depresión posparto con agotamiento, sentimientos de culpa, preocupación por el hijo; CIE-11 6E20)',
      'f53.risk':
        'Indicios de riesgo para sí misma o para terceros (incluidas ideas de dañar al hijo) — requiere atención especial',
      'f53.exclude_classifiable':
        'El trastorno se codifica aquí únicamente cuando no puede asignarse suficientemente a otro trastorno clasificado en otro lugar (p. ej. episodio depresivo independiente o esquizofrenia)',
    },
  },
}
