import type { DisorderTranslationMap } from '../types'
import { withIcd11SubstanceTranslations } from '../icd11SubstanceI18n'
import { buildEsPhaseBSubstance } from '../substancePhaseBI18n'

/** ES translations — ICD-10 F1 block (base; ICD-11 fragments merged below). */
const esSubstanceUseBase: DisorderTranslationMap = {
  alcohol_dependence: {
    name: 'Dependencia del alcohol',
    differentials: [
      'Uso perjudicial / consumo de riesgo (F10.1) sin dependencia',
      'Intoxicación aguda (F10.0)',
      'Trastorno afectivo o de ansiedad inducido por sustancias',
    ],
    groups: {
      'f10_2.dependence': 'Rasgos de dependencia (al menos 3 en un período de 12 meses)',
    },
    criteria: {
      'f10_2.craving': 'Deseo intenso o una especie de compulsión por consumir alcohol (craving)',
      'f10_2.impaired_control': 'Disminución de la capacidad de controlar el inicio, la finalización y la cantidad del consumo',
      'f10_2.withdrawal': 'Síndrome de abstinencia físico al reducir o interrumpir el consumo, o consumo para aliviar o evitar los síntomas de abstinencia',
      'f10_2.tolerance': 'Desarrollo de tolerancia, con necesidad de aumentar la dosis para lograr el efecto inicial',
      'f10_2.neglect': 'Abandono progresivo de otros intereses y actividades en favor del consumo, así como mayor tiempo dedicado a obtener la sustancia, consumirla y recuperarse de sus efectos',
      'f10_2.persistence_harm': 'Consumo continuado a pesar de la evidencia de consecuencias claramente perjudiciales a nivel físico, psíquico o social',
    },
  },
  alcohol_acute_intoxication: {
    name: 'Intoxicación aguda por alcohol',
    differentials: [
      'Síndrome de abstinencia (F10.3)',
      'Delírium u otra causa orgánica',
      'Trastorno psicótico agudo',
      'Intoxicación por otra sustancia o intoxicación mixta',
    ],
    groups: {
      'f10_0.use': 'Evidencia de consumo',
      'f10_0.signs': 'Signos de intoxicación típicos de la sustancia (al menos 1)',
      'f10_0.exclusions': 'Exclusiones',
    },
    criteria: {
      'f10_0.recent_use': 'Consumo reciente de alcohol en una dosis suficientemente alta',
      'f10_0.causal_link': 'Los síntomas guardan una relación temporal y causal directa con el efecto agudo de la sustancia y son transitorios',
      'f10_0.disinhibition': 'Desinhibición, labilidad del estado de ánimo o tendencia a la discusión',
      'f10_0.ataxia': 'Inestabilidad de la marcha y de la bipedestación (ataxia), alteración de la coordinación',
      'f10_0.slurred_speech': 'Habla farfullante',
      'f10_0.nystagmus': 'Nistagmo o alteración de la motilidad ocular',
      'f10_0.attention': 'Alteración de la atención y de la concentración',
      'f10_0.reduced_consciousness': 'Disminución del nivel de conciencia, llegando hasta el sopor (con dosis altas)',
      'f10_0.exclude_other_cause': 'Los síntomas no se explican mejor por una enfermedad somática, un delírium u otro trastorno mental',
    },
  },
  alcohol_withdrawal: {
    name: 'Síndrome de abstinencia por alcohol',
    differentials: [
      'Intoxicación aguda (F10.0)',
      'Síndrome de abstinencia con delírium (F10.4)',
      'Trastorno de ansiedad o afectivo',
      'Enfermedad somática con sintomatología vegetativa',
    ],
    groups: {
      'f10_3.context': 'Contexto de abstinencia',
      'f10_3.symptoms': 'Síntomas de abstinencia (al menos 1)',
      'f10_3.exclusions': 'Exclusiones',
    },
    criteria: {
      'f10_3.cessation': 'Interrupción o reducción del alcohol tras un consumo repetido, por lo general prolongado o en dosis altas',
      'f10_3.withdrawal_syndrome': 'Existe un síndrome de abstinencia típico de la sustancia',
      'f10_3.tremor': 'Temblor, sobre todo de las manos',
      'f10_3.sweating_autonomic': 'Sudoración, taquicardia y otros signos de hiperactividad vegetativa',
      'f10_3.anxiety_agitation': 'Ansiedad, inquietud o agitación psicomotriz',
      'f10_3.nausea': 'Náuseas o vómitos',
      'f10_3.insomnia': 'Dificultad para conciliar y mantener el sueño',
      'f10_3.transient_hallucinations': 'Percepciones engañosas transitorias visuales, táctiles o auditivas',
      'f10_3.exclude_other_cause': 'Los síntomas no se explican mejor por otro trastorno somático o mental',
    },
  },
  alcohol_withdrawal_delirium: {
    name: 'Síndrome de abstinencia con delírium por alcohol',
    differentials: [
      'Síndrome de abstinencia sin delírium (F10.3)',
      'Delírium de otra causa (somática) (F05)',
      'Trastorno psicótico inducido por sustancias',
      'Encefalopatía de Wernicke (en el caso del alcohol)',
    ],
    groups: {
      'f10_4.context': 'Abstinencia con alteración de la conciencia',
      'f10_4.features': 'Síntomas deliriosos acompañantes (al menos 1)',
      'f10_4.exclusions': 'Exclusiones',
    },
    criteria: {
      'f10_4.withdrawal_context': 'Interrupción o reducción del alcohol en presencia de un síndrome de dependencia preexistente',
      'f10_4.clouding': 'Obnubilación de la conciencia con alteración del estado de alerta y de la atención (estado delirioso)',
      'f10_4.disorientation': 'Desorientación y alteración global de las funciones cognitivas',
      'f10_4.hallucinations': 'Alucinaciones vívidas (con frecuencia visuales o escénicas) o ilusiones',
      'f10_4.psychomotor': 'Inquietud o agitación psicomotriz marcada',
      'f10_4.autonomic': 'Hiperactividad vegetativa marcada (p. ej. taquicardia, sudoración, hipertensión, temblor de gran amplitud); posibilidad de crisis convulsivas',
      'f10_4.exclude_other_cause': 'El delírium no se explica mejor por una enfermedad somática independiente',
    },
  },
  alcohol_psychotic_disorder: {
    name: 'Trastorno psicótico por alcohol',
    differentials: [
      'Esquizofrenia o trastorno delirante persistente',
      'Intoxicación aguda (F10.0) con fenómenos psicóticos',
      'Síndrome de abstinencia con delírium (F10.4)',
      'Trastorno afectivo con síntomas psicóticos',
    ],
    groups: {
      'f10_5.symptoms': 'Síntomas psicóticos (al menos 1)',
      'f10_5.context': 'Relación temporal con el consumo',
      'f10_5.exclusions': 'Exclusiones',
    },
    criteria: {
      'f10_5.hallucinations': 'Alucinaciones (con frecuencia auditivas o visuales) que no son exclusivamente expresión de una simple intoxicación',
      'f10_5.delusions': 'Ideas delirantes, a menudo de persecución o de referencia',
      'f10_5.temporal_relation': 'Inicio de los síntomas psicóticos durante el consumo de alcohol o poco después (por lo general en un plazo de dos semanas)',
      'f10_5.partial_remission': 'Los síntomas suelen remitir, al menos parcialmente, dentro de un período limitado (del orden de semanas a unos pocos meses)',
      'f10_5.exclude_primary_psychosis': 'La sintomatología no se explica mejor por un trastorno psicótico primario y no aparece exclusivamente en el contexto de una intoxicación o de un delírium de abstinencia',
    },
  },
  opioids_acute_intoxication: {
    name: 'Intoxicación aguda por opioides',
    differentials: [
      'Síndrome de abstinencia (F11.3)',
      'Delírium u otra causa orgánica',
      'Trastorno psicótico agudo',
      'Intoxicación por otra sustancia o intoxicación mixta',
    ],
    groups: {
      'f11_0.use': 'Evidencia de consumo',
      'f11_0.signs': 'Signos de intoxicación típicos de la sustancia (al menos 1)',
      'f11_0.exclusions': 'Exclusiones',
    },
    criteria: {
      'f11_0.recent_use': 'Consumo reciente de opioides en una dosis suficientemente alta',
      'f11_0.causal_link': 'Los síntomas guardan una relación temporal y causal directa con el efecto agudo de la sustancia y son transitorios',
      'f11_0.miosis': 'Constricción pupilar (miosis)',
      'f11_0.sedation': 'Apatía, sedación o disminución del nivel de conciencia',
      'f11_0.euphoria': 'Euforia inicial seguida de apatía o disforia',
      'f11_0.respiratory_depression': 'Respiración lenta (depresión respiratoria) con dosis altas',
      'f11_0.slurred_speech': 'Habla farfullante y atención alterada',
      'f11_0.exclude_other_cause': 'Los síntomas no se explican mejor por una enfermedad somática, un delírium u otro trastorno mental',
    },
  },
  opioids_harmful_use: {
    name: 'Uso perjudicial de opioides',
    differentials: [
      'Síndrome de dependencia (F11.2)',
      'Intoxicación aguda (F11.0)',
      'Consumo de bajo riesgo sin daño identificable',
    ],
    groups: {
      'f11_1.harm': 'Consumo con daño para la salud',
      'f11_1.exclusions': 'Exclusiones',
    },
    criteria: {
      'f11_1.actual_use': 'Está documentado un consumo real de opioides',
      'f11_1.health_damage': 'Daño demostrable de la salud física o psíquica como consecuencia del consumo',
      'f11_1.exclude_dependence': 'No se cumplen los criterios de un síndrome de dependencia (F11.2)',
    },
  },
  opioids_dependence: {
    name: 'Síndrome de dependencia de opioides',
    differentials: [
      'Uso perjudicial de opioides (F11.1) sin dependencia',
      'Intoxicación aguda (F11.0)',
      'Trastorno afectivo o psicótico inducido por sustancias',
    ],
    groups: {
      'f11_2.dependence': 'Rasgos de dependencia (al menos 3 en un período de 12 meses)',
    },
    criteria: {
      'f11_2.craving': 'Deseo intenso o una especie de compulsión por consumir opioides (craving)',
      'f11_2.impaired_control': 'Disminución de la capacidad de controlar el inicio, la finalización y la cantidad del consumo',
      'f11_2.withdrawal': 'Síndrome de abstinencia físico al reducir o interrumpir el consumo, o consumo para aliviar los síntomas de abstinencia',
      'f11_2.tolerance': 'Desarrollo de tolerancia, con necesidad de aumentar la dosis para lograr el efecto inicial',
      'f11_2.neglect': 'Abandono progresivo de otros intereses y mayor tiempo dedicado a obtener la sustancia, consumirla y recuperarse de sus efectos',
      'f11_2.persistence_harm': 'Consumo continuado a pesar de evidencia de consecuencias perjudiciales a nivel físico, psíquico o social',
    },
  },
  opioids_withdrawal: {
    name: 'Síndrome de abstinencia por opioides',
    differentials: [
      'Intoxicación aguda (F11.0)',
      'Síndrome de abstinencia con delírium (F11.4)',
      'Trastorno de ansiedad o afectivo',
      'Enfermedad somática con sintomatología vegetativa',
    ],
    groups: {
      'f11_3.context': 'Contexto de abstinencia',
      'f11_3.symptoms': 'Síntomas de abstinencia (al menos 1)',
      'f11_3.exclusions': 'Exclusiones',
    },
    criteria: {
      'f11_3.cessation': 'Interrupción o reducción de opioides tras un consumo repetido, por lo general prolongado o en dosis altas',
      'f11_3.withdrawal_syndrome': 'Existe un síndrome de abstinencia típico de la sustancia',
      'f11_3.craving': 'Deseo intenso de consumir la sustancia (craving)',
      'f11_3.rhinorrhea_lacrimation': 'Rinorrea y lagrimeo',
      'f11_3.mydriasis_piloerection': 'Midriasis, piloerección y sudoración',
      'f11_3.myalgia': 'Dolores musculares y en las extremidades',
      'f11_3.gi_symptoms': 'Náuseas, vómitos, retortijones abdominales o diarrea',
      'f11_3.dysphoria': 'Estado de ánimo disfórico, bostezos y alteración del sueño',
      'f11_3.exclude_other_cause': 'Los síntomas no se explican mejor por otro trastorno somático o mental',
    },
  },
  cannabinoids_acute_intoxication: {
    name: 'Intoxicación aguda por cannabinoides',
    differentials: [
      'Síndrome de abstinencia (F12.3)',
      'Delírium u otra causa orgánica',
      'Trastorno psicótico agudo',
      'Intoxicación por otra sustancia o intoxicación mixta',
    ],
    groups: {
      'f12_0.use': 'Evidencia de consumo',
      'f12_0.signs': 'Signos de intoxicación típicos de la sustancia (al menos 1)',
      'f12_0.exclusions': 'Exclusiones',
    },
    criteria: {
      'f12_0.recent_use': 'Consumo reciente de cannabinoides en una dosis suficientemente alta',
      'f12_0.causal_link': 'Los síntomas guardan una relación temporal y causal directa con el efecto agudo de la sustancia y son transitorios',
      'f12_0.euphoria_anxiety': 'Euforia y relajación o, por el contrario, ansiedad y agitación',
      'f12_0.time_perception': 'Alteración de la vivencia del tiempo y sensación de percepción más aguda',
      'f12_0.impaired_coordination': 'Coordinación y capacidad de reacción alteradas',
      'f12_0.appetite': 'Aumento del apetito',
      'f12_0.conjunctival_injection': 'Enrojecimiento conjuntival, sequedad bucal y taquicardia',
      'f12_0.suspiciousness': 'Suspicacia o ideas paranoides',
      'f12_0.exclude_other_cause': 'Los síntomas no se explican mejor por una enfermedad somática, un delírium u otro trastorno mental',
    },
  },
  cannabinoids_harmful_use: {
    name: 'Uso perjudicial de cannabinoides',
    differentials: [
      'Síndrome de dependencia (F12.2)',
      'Intoxicación aguda (F12.0)',
      'Consumo de bajo riesgo sin daño identificable',
    ],
    groups: {
      'f12_1.harm': 'Consumo con daño para la salud',
      'f12_1.exclusions': 'Exclusiones',
    },
    criteria: {
      'f12_1.actual_use': 'Está documentado un consumo real de cannabinoides',
      'f12_1.health_damage': 'Daño demostrable de la salud física o psíquica como consecuencia del consumo',
      'f12_1.exclude_dependence': 'No se cumplen los criterios de un síndrome de dependencia (F12.2)',
    },
  },
  cannabinoids_dependence: {
    name: 'Síndrome de dependencia de cannabinoides',
    differentials: [
      'Uso perjudicial de cannabinoides (F12.1) sin dependencia',
      'Intoxicación aguda (F12.0)',
      'Trastorno afectivo o psicótico inducido por sustancias',
    ],
    groups: {
      'f12_2.dependence': 'Rasgos de dependencia (al menos 3 en un período de 12 meses)',
    },
    criteria: {
      'f12_2.craving': 'Deseo intenso o una especie de compulsión por consumir cannabinoides (craving)',
      'f12_2.impaired_control': 'Disminución de la capacidad de controlar el inicio, la finalización y la cantidad del consumo',
      'f12_2.withdrawal': 'Síndrome de abstinencia físico al reducir o interrumpir el consumo, o consumo para aliviar los síntomas de abstinencia',
      'f12_2.tolerance': 'Desarrollo de tolerancia, con necesidad de aumentar la dosis para lograr el efecto inicial',
      'f12_2.neglect': 'Abandono progresivo de otros intereses y mayor tiempo dedicado a obtener la sustancia, consumirla y recuperarse de sus efectos',
      'f12_2.persistence_harm': 'Consumo continuado a pesar de evidencia de consecuencias perjudiciales a nivel físico, psíquico o social',
    },
  },
  cannabinoids_withdrawal: {
    name: 'Síndrome de abstinencia por cannabinoides',
    differentials: [
      'Intoxicación aguda (F12.0)',
      'Síndrome de abstinencia con delírium (F12.4)',
      'Trastorno de ansiedad o afectivo',
      'Enfermedad somática con sintomatología vegetativa',
    ],
    groups: {
      'f12_3.context': 'Contexto de abstinencia',
      'f12_3.symptoms': 'Síntomas de abstinencia (al menos 1)',
      'f12_3.exclusions': 'Exclusiones',
    },
    criteria: {
      'f12_3.cessation': 'Interrupción o reducción de cannabinoides tras un consumo repetido, por lo general prolongado o en dosis altas',
      'f12_3.withdrawal_syndrome': 'Existe un síndrome de abstinencia típico de la sustancia',
      'f12_3.irritability': 'Irritabilidad, inquietud interior o nerviosismo',
      'f12_3.anxiety': 'Ansiedad o tensión',
      'f12_3.sleep_disturbance': 'Alteración del sueño, en parte con sueños vívidos',
      'f12_3.appetite_loss': 'Disminución del apetito y pérdida de peso',
      'f12_3.depressed_mood': 'Estado de ánimo deprimido',
      'f12_3.exclude_other_cause': 'Los síntomas no se explican mejor por otro trastorno somático o mental',
    },
  },
  cannabinoids_psychotic_disorder: {
    name: 'Trastorno psicótico por cannabinoides',
    differentials: [
      'Esquizofrenia o trastorno delirante persistente',
      'Intoxicación aguda (F12.0) con fenómenos psicóticos',
      'Síndrome de abstinencia con delírium (F12.4)',
      'Trastorno afectivo con síntomas psicóticos',
    ],
    groups: {
      'f12_5.symptoms': 'Síntomas psicóticos (al menos 1)',
      'f12_5.context': 'Relación temporal con el consumo',
      'f12_5.exclusions': 'Exclusiones',
    },
    criteria: {
      'f12_5.hallucinations': 'Alucinaciones (con frecuencia auditivas o visuales) que no son exclusivamente expresión de una simple intoxicación',
      'f12_5.delusions': 'Ideas delirantes, a menudo de persecución o de referencia',
      'f12_5.temporal_relation': 'Inicio de los síntomas psicóticos durante el consumo de cannabinoides o poco después (por lo general en un plazo de dos semanas)',
      'f12_5.partial_remission': 'Los síntomas suelen remitir, al menos parcialmente, dentro de un período limitado (del orden de semanas a unos pocos meses)',
      'f12_5.exclude_primary_psychosis': 'La sintomatología no se explica mejor por un trastorno psicótico primario y no aparece exclusivamente en el contexto de una intoxicación o de un delírium de abstinencia',
    },
  },
  sedatives_acute_intoxication: {
    name: 'Intoxicación aguda por sedantes o hipnóticos',
    differentials: [
      'Síndrome de abstinencia (F13.3)',
      'Delírium u otra causa orgánica',
      'Trastorno psicótico agudo',
      'Intoxicación por otra sustancia o intoxicación mixta',
    ],
    groups: {
      'f13_0.use': 'Evidencia de consumo',
      'f13_0.signs': 'Signos de intoxicación típicos de la sustancia (al menos 1)',
      'f13_0.exclusions': 'Exclusiones',
    },
    criteria: {
      'f13_0.recent_use': 'Consumo reciente de sedantes o hipnóticos en una dosis suficientemente alta',
      'f13_0.causal_link': 'Los síntomas guardan una relación temporal y causal directa con el efecto agudo de la sustancia y son transitorios',
      'f13_0.sedation': 'Sedación, somnolencia y disminución del estado de alerta',
      'f13_0.ataxia': 'Inestabilidad de la marcha (ataxia) y alteración de la coordinación',
      'f13_0.slurred_speech': 'Habla farfullante',
      'f13_0.nystagmus': 'Nistagmo',
      'f13_0.memory_attention': 'Alteración de la atención y de la memoria (posible amnesia anterógrada)',
      'f13_0.disinhibition': 'Desinhibición o excitación paradójica',
      'f13_0.exclude_other_cause': 'Los síntomas no se explican mejor por una enfermedad somática, un delírium u otro trastorno mental',
    },
  },
  sedatives_harmful_use: {
    name: 'Uso perjudicial de sedantes o hipnóticos',
    differentials: [
      'Síndrome de dependencia (F13.2)',
      'Intoxicación aguda (F13.0)',
      'Consumo de bajo riesgo sin daño identificable',
    ],
    groups: {
      'f13_1.harm': 'Consumo con daño para la salud',
      'f13_1.exclusions': 'Exclusiones',
    },
    criteria: {
      'f13_1.actual_use': 'Está documentado un consumo real de sedantes o hipnóticos',
      'f13_1.health_damage': 'Daño demostrable de la salud física o psíquica como consecuencia del consumo',
      'f13_1.exclude_dependence': 'No se cumplen los criterios de un síndrome de dependencia (F13.2)',
    },
  },
  sedatives_dependence: {
    name: 'Síndrome de dependencia de sedantes o hipnóticos',
    differentials: [
      'Uso perjudicial de sedantes o hipnóticos (F13.1) sin dependencia',
      'Intoxicación aguda (F13.0)',
      'Trastorno afectivo o psicótico inducido por sustancias',
    ],
    groups: {
      'f13_2.dependence': 'Rasgos de dependencia (al menos 3 en un período de 12 meses)',
    },
    criteria: {
      'f13_2.craving': 'Deseo intenso o una especie de compulsión por consumir sedantes o hipnóticos (craving)',
      'f13_2.impaired_control': 'Disminución de la capacidad de controlar el inicio, la finalización y la cantidad del consumo',
      'f13_2.withdrawal': 'Síndrome de abstinencia físico al reducir o interrumpir el consumo, o consumo para aliviar los síntomas de abstinencia',
      'f13_2.tolerance': 'Desarrollo de tolerancia, con necesidad de aumentar la dosis para lograr el efecto inicial',
      'f13_2.neglect': 'Abandono progresivo de otros intereses y mayor tiempo dedicado a obtener la sustancia, consumirla y recuperarse de sus efectos',
      'f13_2.persistence_harm': 'Consumo continuado a pesar de evidencia de consecuencias perjudiciales a nivel físico, psíquico o social',
    },
  },
  sedatives_withdrawal: {
    name: 'Síndrome de abstinencia por sedantes o hipnóticos',
    differentials: [
      'Intoxicación aguda (F13.0)',
      'Síndrome de abstinencia con delírium (F13.4)',
      'Trastorno de ansiedad o afectivo',
      'Enfermedad somática con sintomatología vegetativa',
    ],
    groups: {
      'f13_3.context': 'Contexto de abstinencia',
      'f13_3.symptoms': 'Síntomas de abstinencia (al menos 1)',
      'f13_3.exclusions': 'Exclusiones',
    },
    criteria: {
      'f13_3.cessation': 'Interrupción o reducción de sedantes o hipnóticos tras un consumo repetido, por lo general prolongado o en dosis altas',
      'f13_3.withdrawal_syndrome': 'Existe un síndrome de abstinencia típico de la sustancia',
      'f13_3.tremor': 'Temblor e hiperactividad vegetativa (sudoración, taquicardia)',
      'f13_3.insomnia': 'Marcada dificultad para conciliar y mantener el sueño',
      'f13_3.anxiety_agitation': 'Ansiedad, inquietud interior y agitación',
      'f13_3.nausea': 'Náuseas o vómitos',
      'f13_3.perceptual_disturbance': 'Alteraciones de la percepción o alucinaciones transitorias',
      'f13_3.seizures': 'Posibilidad de crisis convulsivas',
      'f13_3.exclude_other_cause': 'Los síntomas no se explican mejor por otro trastorno somático o mental',
    },
  },
  sedatives_withdrawal_delirium: {
    name: 'Síndrome de abstinencia con delírium por sedantes o hipnóticos',
    differentials: [
      'Síndrome de abstinencia sin delírium (F13.3)',
      'Delírium de otra causa (somática) (F05)',
      'Trastorno psicótico inducido por sustancias',
      'Encefalopatía de Wernicke (en el caso del alcohol)',
    ],
    groups: {
      'f13_4.context': 'Abstinencia con alteración de la conciencia',
      'f13_4.features': 'Síntomas deliriosos acompañantes (al menos 1)',
      'f13_4.exclusions': 'Exclusiones',
    },
    criteria: {
      'f13_4.withdrawal_context': 'Interrupción o reducción de sedantes o hipnóticos en presencia de un síndrome de dependencia preexistente',
      'f13_4.clouding': 'Obnubilación de la conciencia con alteración del estado de alerta y de la atención (estado delirioso)',
      'f13_4.disorientation': 'Desorientación y alteración global de las funciones cognitivas',
      'f13_4.hallucinations': 'Alucinaciones vívidas (con frecuencia visuales o escénicas) o ilusiones',
      'f13_4.psychomotor': 'Inquietud o agitación psicomotriz marcada',
      'f13_4.autonomic': 'Hiperactividad vegetativa marcada (p. ej. taquicardia, sudoración, hipertensión, temblor de gran amplitud); posibilidad de crisis convulsivas',
      'f13_4.exclude_other_cause': 'El delírium no se explica mejor por una enfermedad somática independiente',
    },
  },
  cocaine_acute_intoxication: {
    name: 'Intoxicación aguda por cocaína',
    differentials: [
      'Síndrome de abstinencia (F14.3)',
      'Delírium u otra causa orgánica',
      'Trastorno psicótico agudo',
      'Intoxicación por otra sustancia o intoxicación mixta',
    ],
    groups: {
      'f14_0.use': 'Evidencia de consumo',
      'f14_0.signs': 'Signos de intoxicación típicos de la sustancia (al menos 1)',
      'f14_0.exclusions': 'Exclusiones',
    },
    criteria: {
      'f14_0.recent_use': 'Consumo reciente de cocaína en una dosis suficientemente alta',
      'f14_0.causal_link': 'Los síntomas guardan una relación temporal y causal directa con el efecto agudo de la sustancia y son transitorios',
      'f14_0.euphoria_grandiosity': 'Euforia, aumento de la autoestima y verborrea',
      'f14_0.hypervigilance': 'Hipervigilancia, agitación y aumento de la actividad',
      'f14_0.autonomic': 'Taquicardia, aumento de la presión arterial, midriasis y sudoración',
      'f14_0.stereotypies': 'Movimientos estereotipados o bruxismo',
      'f14_0.paranoia': 'Suspicacia, ideas paranoides o sensaciones táctiles anómalas',
      'f14_0.exclude_other_cause': 'Los síntomas no se explican mejor por una enfermedad somática, un delírium u otro trastorno mental',
    },
  },
  cocaine_harmful_use: {
    name: 'Uso perjudicial de cocaína',
    differentials: [
      'Síndrome de dependencia (F14.2)',
      'Intoxicación aguda (F14.0)',
      'Consumo de bajo riesgo sin daño identificable',
    ],
    groups: {
      'f14_1.harm': 'Consumo con daño para la salud',
      'f14_1.exclusions': 'Exclusiones',
    },
    criteria: {
      'f14_1.actual_use': 'Está documentado un consumo real de cocaína',
      'f14_1.health_damage': 'Daño demostrable de la salud física o psíquica como consecuencia del consumo',
      'f14_1.exclude_dependence': 'No se cumplen los criterios de un síndrome de dependencia (F14.2)',
    },
  },
  cocaine_dependence: {
    name: 'Síndrome de dependencia de cocaína',
    differentials: [
      'Uso perjudicial de cocaína (F14.1) sin dependencia',
      'Intoxicación aguda (F14.0)',
      'Trastorno afectivo o psicótico inducido por sustancias',
    ],
    groups: {
      'f14_2.dependence': 'Rasgos de dependencia (al menos 3 en un período de 12 meses)',
    },
    criteria: {
      'f14_2.craving': 'Deseo intenso o una especie de compulsión por consumir cocaína (craving)',
      'f14_2.impaired_control': 'Disminución de la capacidad de controlar el inicio, la finalización y la cantidad del consumo',
      'f14_2.withdrawal': 'Síndrome de abstinencia físico al reducir o interrumpir el consumo, o consumo para aliviar los síntomas de abstinencia',
      'f14_2.tolerance': 'Desarrollo de tolerancia, con necesidad de aumentar la dosis para lograr el efecto inicial',
      'f14_2.neglect': 'Abandono progresivo de otros intereses y mayor tiempo dedicado a obtener la sustancia, consumirla y recuperarse de sus efectos',
      'f14_2.persistence_harm': 'Consumo continuado a pesar de evidencia de consecuencias perjudiciales a nivel físico, psíquico o social',
    },
  },
  cocaine_withdrawal: {
    name: 'Síndrome de abstinencia por cocaína',
    differentials: [
      'Intoxicación aguda (F14.0)',
      'Síndrome de abstinencia con delírium (F14.4)',
      'Trastorno de ansiedad o afectivo',
      'Enfermedad somática con sintomatología vegetativa',
    ],
    groups: {
      'f14_3.context': 'Contexto de abstinencia',
      'f14_3.symptoms': 'Síntomas de abstinencia (al menos 1)',
      'f14_3.exclusions': 'Exclusiones',
    },
    criteria: {
      'f14_3.cessation': 'Interrupción o reducción de cocaína tras un consumo repetido, por lo general prolongado o en dosis altas',
      'f14_3.withdrawal_syndrome': 'Existe un síndrome de abstinencia típico de la sustancia',
      'f14_3.dysphoria': 'Estado de ánimo disfórico y deprimido («crash»)',
      'f14_3.fatigue': 'Agotamiento y disminución del impulso',
      'f14_3.sleep': 'Aumento de la necesidad de sueño o insomnio con sueños vívidos',
      'f14_3.appetite': 'Aumento del apetito',
      'f14_3.craving': 'Deseo intenso de consumir la sustancia (craving)',
      'f14_3.exclude_other_cause': 'Los síntomas no se explican mejor por otro trastorno somático o mental',
    },
  },
  cocaine_psychotic_disorder: {
    name: 'Trastorno psicótico por cocaína',
    differentials: [
      'Esquizofrenia o trastorno delirante persistente',
      'Intoxicación aguda (F14.0) con fenómenos psicóticos',
      'Síndrome de abstinencia con delírium (F14.4)',
      'Trastorno afectivo con síntomas psicóticos',
    ],
    groups: {
      'f14_5.symptoms': 'Síntomas psicóticos (al menos 1)',
      'f14_5.context': 'Relación temporal con el consumo',
      'f14_5.exclusions': 'Exclusiones',
    },
    criteria: {
      'f14_5.hallucinations': 'Alucinaciones (con frecuencia auditivas o visuales) que no son exclusivamente expresión de una simple intoxicación',
      'f14_5.delusions': 'Ideas delirantes, a menudo de persecución o de referencia',
      'f14_5.temporal_relation': 'Inicio de los síntomas psicóticos durante el consumo de cocaína o poco después (por lo general en un plazo de dos semanas)',
      'f14_5.partial_remission': 'Los síntomas suelen remitir, al menos parcialmente, dentro de un período limitado (del orden de semanas a unos pocos meses)',
      'f14_5.exclude_primary_psychosis': 'La sintomatología no se explica mejor por un trastorno psicótico primario y no aparece exclusivamente en el contexto de una intoxicación o de un delírium de abstinencia',
    },
  },
  stimulants_acute_intoxication: {
    name: 'Intoxicación aguda por otros estimulantes, incluida la cafeína',
    differentials: [
      'Síndrome de abstinencia (F15.3)',
      'Delírium u otra causa orgánica',
      'Trastorno psicótico agudo',
      'Intoxicación por otra sustancia o intoxicación mixta',
    ],
    groups: {
      'f15_0.use': 'Evidencia de consumo',
      'f15_0.signs': 'Signos de intoxicación típicos de la sustancia (al menos 1)',
      'f15_0.exclusions': 'Exclusiones',
    },
    criteria: {
      'f15_0.recent_use': 'Consumo reciente de otros estimulantes, incluida la cafeína, en una dosis suficientemente alta',
      'f15_0.causal_link': 'Los síntomas guardan una relación temporal y causal directa con el efecto agudo de la sustancia y son transitorios',
      'f15_0.euphoria_energy': 'Euforia, verborrea y aumento de la energía/del estado de alerta',
      'f15_0.insomnia': 'Insomnio y reducción de la necesidad de sueño',
      'f15_0.autonomic': 'Taquicardia, aumento de la presión arterial, midriasis; posible hipertermia',
      'f15_0.agitation': 'Agitación, inquietud o conducta agresiva',
      'f15_0.paranoia': 'Suspicacia o ideas paranoides (con dosis más altas)',
      'f15_0.exclude_other_cause': 'Los síntomas no se explican mejor por una enfermedad somática, un delírium u otro trastorno mental',
    },
  },
  stimulants_harmful_use: {
    name: 'Uso perjudicial de otros estimulantes, incluida la cafeína',
    differentials: [
      'Síndrome de dependencia (F15.2)',
      'Intoxicación aguda (F15.0)',
      'Consumo de bajo riesgo sin daño identificable',
    ],
    groups: {
      'f15_1.harm': 'Consumo con daño para la salud',
      'f15_1.exclusions': 'Exclusiones',
    },
    criteria: {
      'f15_1.actual_use': 'Está documentado un consumo real de otros estimulantes, incluida la cafeína',
      'f15_1.health_damage': 'Daño demostrable de la salud física o psíquica como consecuencia del consumo',
      'f15_1.exclude_dependence': 'No se cumplen los criterios de un síndrome de dependencia (F15.2)',
    },
  },
  stimulants_dependence: {
    name: 'Síndrome de dependencia de otros estimulantes, incluida la cafeína',
    differentials: [
      'Uso perjudicial de otros estimulantes, incluida la cafeína (F15.1), sin dependencia',
      'Intoxicación aguda (F15.0)',
      'Trastorno afectivo o psicótico inducido por sustancias',
    ],
    groups: {
      'f15_2.dependence': 'Rasgos de dependencia (al menos 3 en un período de 12 meses)',
    },
    criteria: {
      'f15_2.craving': 'Deseo intenso o una especie de compulsión por consumir otros estimulantes, incluida la cafeína (craving)',
      'f15_2.impaired_control': 'Disminución de la capacidad de controlar el inicio, la finalización y la cantidad del consumo',
      'f15_2.withdrawal': 'Síndrome de abstinencia físico al reducir o interrumpir el consumo, o consumo para aliviar los síntomas de abstinencia',
      'f15_2.tolerance': 'Desarrollo de tolerancia, con necesidad de aumentar la dosis para lograr el efecto inicial',
      'f15_2.neglect': 'Abandono progresivo de otros intereses y mayor tiempo dedicado a obtener la sustancia, consumirla y recuperarse de sus efectos',
      'f15_2.persistence_harm': 'Consumo continuado a pesar de evidencia de consecuencias perjudiciales a nivel físico, psíquico o social',
    },
  },
  stimulants_withdrawal: {
    name: 'Síndrome de abstinencia por otros estimulantes, incluida la cafeína',
    differentials: [
      'Intoxicación aguda (F15.0)',
      'Síndrome de abstinencia con delírium (F15.4)',
      'Trastorno de ansiedad o afectivo',
      'Enfermedad somática con sintomatología vegetativa',
    ],
    groups: {
      'f15_3.context': 'Contexto de abstinencia',
      'f15_3.symptoms': 'Síntomas de abstinencia (al menos 1)',
      'f15_3.exclusions': 'Exclusiones',
    },
    criteria: {
      'f15_3.cessation': 'Interrupción o reducción de otros estimulantes, incluida la cafeína, tras un consumo repetido, por lo general prolongado o en dosis altas',
      'f15_3.withdrawal_syndrome': 'Existe un síndrome de abstinencia típico de la sustancia',
      'f15_3.fatigue': 'Cansancio y agotamiento marcados',
      'f15_3.depressed_mood': 'Estado de ánimo deprimido y anhedonia',
      'f15_3.hypersomnia': 'Aumento de la necesidad de sueño',
      'f15_3.appetite': 'Aumento del apetito',
      'f15_3.caffeine_headache': 'En el caso de la cafeína: cefalea, cansancio y dificultad de concentración',
      'f15_3.exclude_other_cause': 'Los síntomas no se explican mejor por otro trastorno somático o mental',
    },
  },
  stimulants_psychotic_disorder: {
    name: 'Trastorno psicótico por otros estimulantes, incluida la cafeína',
    differentials: [
      'Esquizofrenia o trastorno delirante persistente',
      'Intoxicación aguda (F15.0) con fenómenos psicóticos',
      'Síndrome de abstinencia con delírium (F15.4)',
      'Trastorno afectivo con síntomas psicóticos',
    ],
    groups: {
      'f15_5.symptoms': 'Síntomas psicóticos (al menos 1)',
      'f15_5.context': 'Relación temporal con el consumo',
      'f15_5.exclusions': 'Exclusiones',
    },
    criteria: {
      'f15_5.hallucinations': 'Alucinaciones (con frecuencia auditivas o visuales) que no son exclusivamente expresión de una simple intoxicación',
      'f15_5.delusions': 'Ideas delirantes, a menudo de persecución o de referencia',
      'f15_5.temporal_relation': 'Inicio de los síntomas psicóticos durante el consumo de otros estimulantes, incluida la cafeína, o poco después (por lo general en un plazo de dos semanas)',
      'f15_5.partial_remission': 'Los síntomas suelen remitir, al menos parcialmente, dentro de un período limitado (del orden de semanas a unos pocos meses)',
      'f15_5.exclude_primary_psychosis': 'La sintomatología no se explica mejor por un trastorno psicótico primario y no aparece exclusivamente en el contexto de una intoxicación o de un delírium de abstinencia',
    },
  },
  hallucinogens_acute_intoxication: {
    name: 'Intoxicación aguda por alucinógenos',
    differentials: [
      'Síndrome de abstinencia (F16.3)',
      'Delírium u otra causa orgánica',
      'Trastorno psicótico agudo',
      'Intoxicación por otra sustancia o intoxicación mixta',
    ],
    groups: {
      'f16_0.use': 'Evidencia de consumo',
      'f16_0.signs': 'Signos de intoxicación típicos de la sustancia (al menos 1)',
      'f16_0.exclusions': 'Exclusiones',
    },
    criteria: {
      'f16_0.recent_use': 'Consumo reciente de alucinógenos en una dosis suficientemente alta',
      'f16_0.causal_link': 'Los síntomas guardan una relación temporal y causal directa con el efecto agudo de la sustancia y son transitorios',
      'f16_0.perceptual_changes': 'Percepción alterada con ilusiones, alucinaciones o sinestesias, por lo general con conservación del juicio de realidad',
      'f16_0.depersonalization': 'Vivencias de despersonalización o desrealización',
      'f16_0.anxiety_panic': 'Ansiedad, pánico o reacción paranoide («mal viaje»)',
      'f16_0.autonomic': 'Midriasis, taquicardia y temblor',
      'f16_0.exclude_other_cause': 'Los síntomas no se explican mejor por una enfermedad somática, un delírium u otro trastorno mental',
    },
  },
  hallucinogens_harmful_use: {
    name: 'Uso perjudicial de alucinógenos',
    differentials: [
      'Síndrome de dependencia (F16.2)',
      'Intoxicación aguda (F16.0)',
      'Consumo de bajo riesgo sin daño identificable',
    ],
    groups: {
      'f16_1.harm': 'Consumo con daño para la salud',
      'f16_1.exclusions': 'Exclusiones',
    },
    criteria: {
      'f16_1.actual_use': 'Está documentado un consumo real de alucinógenos',
      'f16_1.health_damage': 'Daño demostrable de la salud física o psíquica como consecuencia del consumo',
      'f16_1.exclude_dependence': 'No se cumplen los criterios de un síndrome de dependencia (F16.2)',
    },
  },
  hallucinogens_psychotic_disorder: {
    name: 'Trastorno psicótico por alucinógenos',
    differentials: [
      'Esquizofrenia o trastorno delirante persistente',
      'Intoxicación aguda (F16.0) con fenómenos psicóticos',
      'Síndrome de abstinencia con delírium (F16.4)',
      'Trastorno afectivo con síntomas psicóticos',
    ],
    groups: {
      'f16_5.symptoms': 'Síntomas psicóticos (al menos 1)',
      'f16_5.context': 'Relación temporal con el consumo',
      'f16_5.exclusions': 'Exclusiones',
    },
    criteria: {
      'f16_5.hallucinations': 'Alucinaciones (con frecuencia auditivas o visuales) que no son exclusivamente expresión de una simple intoxicación',
      'f16_5.delusions': 'Ideas delirantes, a menudo de persecución o de referencia',
      'f16_5.temporal_relation': 'Inicio de los síntomas psicóticos durante el consumo de alucinógenos o poco después (por lo general en un plazo de dos semanas)',
      'f16_5.partial_remission': 'Los síntomas suelen remitir, al menos parcialmente, dentro de un período limitado (del orden de semanas a unos pocos meses)',
      'f16_5.exclude_primary_psychosis': 'La sintomatología no se explica mejor por un trastorno psicótico primario y no aparece exclusivamente en el contexto de una intoxicación o de un delírium de abstinencia',
    },
  },
  nicotine_harmful_use: {
    name: 'Uso perjudicial de tabaco/nicotina',
    differentials: [
      'Síndrome de dependencia (F17.2)',
      'Intoxicación aguda (F17.0)',
      'Consumo de bajo riesgo sin daño identificable',
    ],
    groups: {
      'f17_1.harm': 'Consumo con daño para la salud',
      'f17_1.exclusions': 'Exclusiones',
    },
    criteria: {
      'f17_1.actual_use': 'Está documentado un consumo real de tabaco/nicotina',
      'f17_1.health_damage': 'Daño demostrable de la salud física o psíquica como consecuencia del consumo',
      'f17_1.exclude_dependence': 'No se cumplen los criterios de un síndrome de dependencia (F17.2)',
    },
  },
  nicotine_dependence: {
    name: 'Síndrome de dependencia de tabaco/nicotina',
    differentials: [
      'Uso perjudicial de tabaco/nicotina (F17.1) sin dependencia',
      'Intoxicación aguda (F17.0)',
      'Trastorno afectivo o psicótico inducido por sustancias',
    ],
    groups: {
      'f17_2.dependence': 'Rasgos de dependencia (al menos 3 en un período de 12 meses)',
    },
    criteria: {
      'f17_2.craving': 'Deseo intenso o una especie de compulsión por consumir tabaco/nicotina (craving)',
      'f17_2.impaired_control': 'Disminución de la capacidad de controlar el inicio, la finalización y la cantidad del consumo',
      'f17_2.withdrawal': 'Síndrome de abstinencia físico al reducir o interrumpir el consumo, o consumo para aliviar los síntomas de abstinencia',
      'f17_2.tolerance': 'Desarrollo de tolerancia, con necesidad de aumentar la dosis para lograr el efecto inicial',
      'f17_2.neglect': 'Abandono progresivo de otros intereses y mayor tiempo dedicado a obtener la sustancia, consumirla y recuperarse de sus efectos',
      'f17_2.persistence_harm': 'Consumo continuado a pesar de evidencia de consecuencias perjudiciales a nivel físico, psíquico o social',
    },
  },
  nicotine_withdrawal: {
    name: 'Síndrome de abstinencia por tabaco/nicotina',
    differentials: [
      'Intoxicación aguda (F17.0)',
      'Síndrome de abstinencia con delírium (F17.4)',
      'Trastorno de ansiedad o afectivo',
      'Enfermedad somática con sintomatología vegetativa',
    ],
    groups: {
      'f17_3.context': 'Contexto de abstinencia',
      'f17_3.symptoms': 'Síntomas de abstinencia (al menos 1)',
      'f17_3.exclusions': 'Exclusiones',
    },
    criteria: {
      'f17_3.cessation': 'Interrupción o reducción de tabaco/nicotina tras un consumo repetido, por lo general prolongado o en dosis altas',
      'f17_3.withdrawal_syndrome': 'Existe un síndrome de abstinencia típico de la sustancia',
      'f17_3.craving': 'Deseo intenso de fumar (craving)',
      'f17_3.irritability': 'Irritabilidad, frustración o enfado',
      'f17_3.anxiety': 'Ansiedad o inquietud interior',
      'f17_3.concentration': 'Dificultades de concentración',
      'f17_3.restlessness': 'Desasosiego',
      'f17_3.appetite': 'Aumento del apetito o ganancia de peso',
      'f17_3.depressed_mood': 'Estado de ánimo deprimido',
      'f17_3.insomnia': 'Alteración del sueño',
      'f17_3.exclude_other_cause': 'Los síntomas no se explican mejor por otro trastorno somático o mental',
    },
  },
  volatile_solvents_acute_intoxication: {
    name: 'Intoxicación aguda por disolventes volátiles',
    differentials: [
      'Síndrome de abstinencia (F18.3)',
      'Delírium u otra causa orgánica',
      'Trastorno psicótico agudo',
      'Intoxicación por otra sustancia o intoxicación mixta',
    ],
    groups: {
      'f18_0.use': 'Evidencia de consumo',
      'f18_0.signs': 'Signos de intoxicación típicos de la sustancia (al menos 1)',
      'f18_0.exclusions': 'Exclusiones',
    },
    criteria: {
      'f18_0.recent_use': 'Consumo reciente de disolventes volátiles en una dosis suficientemente alta',
      'f18_0.causal_link': 'Los síntomas guardan una relación temporal y causal directa con el efecto agudo de la sustancia y son transitorios',
      'f18_0.euphoria_disinhibition': 'Euforia, desinhibición y apatía',
      'f18_0.dizziness': 'Mareo y aturdimiento',
      'f18_0.ataxia': 'Inestabilidad de la marcha (ataxia) y alteración de la coordinación',
      'f18_0.slurred_speech': 'Habla farfullante y visión borrosa',
      'f18_0.lethargy': 'Letargo, llegando hasta el estupor o la disminución del nivel de conciencia',
      'f18_0.exclude_other_cause': 'Los síntomas no se explican mejor por una enfermedad somática, un delírium u otro trastorno mental',
    },
  },
  volatile_solvents_harmful_use: {
    name: 'Uso perjudicial de disolventes volátiles',
    differentials: [
      'Síndrome de dependencia (F18.2)',
      'Intoxicación aguda (F18.0)',
      'Consumo de bajo riesgo sin daño identificable',
    ],
    groups: {
      'f18_1.harm': 'Consumo con daño para la salud',
      'f18_1.exclusions': 'Exclusiones',
    },
    criteria: {
      'f18_1.actual_use': 'Está documentado un consumo real de disolventes volátiles',
      'f18_1.health_damage': 'Daño demostrable de la salud física o psíquica como consecuencia del consumo',
      'f18_1.exclude_dependence': 'No se cumplen los criterios de un síndrome de dependencia (F18.2)',
    },
  },
  volatile_solvents_dependence: {
    name: 'Síndrome de dependencia de disolventes volátiles',
    differentials: [
      'Uso perjudicial de disolventes volátiles (F18.1) sin dependencia',
      'Intoxicación aguda (F18.0)',
      'Trastorno afectivo o psicótico inducido por sustancias',
    ],
    groups: {
      'f18_2.dependence': 'Rasgos de dependencia (al menos 3 en un período de 12 meses)',
    },
    criteria: {
      'f18_2.craving': 'Deseo intenso o una especie de compulsión por consumir disolventes volátiles (craving)',
      'f18_2.impaired_control': 'Disminución de la capacidad de controlar el inicio, la finalización y la cantidad del consumo',
      'f18_2.withdrawal': 'Síndrome de abstinencia físico al reducir o interrumpir el consumo, o consumo para aliviar los síntomas de abstinencia',
      'f18_2.tolerance': 'Desarrollo de tolerancia, con necesidad de aumentar la dosis para lograr el efecto inicial',
      'f18_2.neglect': 'Abandono progresivo de otros intereses y mayor tiempo dedicado a obtener la sustancia, consumirla y recuperarse de sus efectos',
      'f18_2.persistence_harm': 'Consumo continuado a pesar de evidencia de consecuencias perjudiciales a nivel físico, psíquico o social',
    },
  },
  multiple_substances_acute_intoxication: {
    name: 'Intoxicación aguda por consumo múltiple de sustancias y otras sustancias psicotrópicas',
    differentials: [
      'Síndrome de abstinencia (F19.3)',
      'Delírium u otra causa orgánica',
      'Trastorno psicótico agudo',
      'Intoxicación por una sola clase de sustancia (F10–F18)',
    ],
    groups: {
      'f19_0.use': 'Evidencia de consumo',
      'f19_0.signs': 'Signos de intoxicación típicos de la sustancia (al menos 1)',
      'f19_0.exclusions': 'Exclusiones',
    },
    criteria: {
      'f19_0.recent_use':
        'Consumo reciente de múltiples sustancias u otras sustancias psicotrópicas en una dosis suficientemente alta',
      'f19_0.causal_link':
        'Los síntomas guardan una relación temporal y causal directa con el efecto agudo de la sustancia y son transitorios',
      'f19_0.mixed_signs':
        'Cuadro de intoxicación variable según las sustancias involucradas (p. ej. patrón de estimulantes o de sedantes/opioides)',
      'f19_0.disinhibition': 'Desinhibición, labilidad del ánimo o agitación paradójica',
      'f19_0.consciousness':
        'Conciencia alterada, llegando al estupor con sustancias sedantes',
      'f19_0.autonomic':
        'Síntomas autonómicos (taquicardia, tamaño pupilar, sudoración) acordes con las sustancias consumidas',
      'f19_0.coordination': 'Alteración de la coordinación o la marcha, habla farfullante',
      'f19_0.perceptual':
        'Alteraciones perceptivas o alucinaciones con sustancias psicotrópicas',
      'f19_0.exclude_other_cause':
        'Los síntomas no se explican mejor por una enfermedad somática, un delírium u otro trastorno mental',
    },
  },
  multiple_substances_harmful_use: {
    name: 'Uso perjudicial de múltiples sustancias y otras sustancias psicotrópicas',
    differentials: [
      'Síndrome de dependencia (F19.2)',
      'Intoxicación aguda (F19.0)',
      'Consumo de bajo riesgo sin daño identificable',
    ],
    groups: {
      'f19_1.harm': 'Consumo con daño para la salud',
      'f19_1.exclusions': 'Exclusiones',
    },
    criteria: {
      'f19_1.actual_use':
        'Está documentado un consumo real de múltiples sustancias u otras sustancias psicotrópicas',
      'f19_1.health_damage':
        'Daño demostrable de la salud física o psíquica como consecuencia del consumo',
      'f19_1.exclude_dependence':
        'No se cumplen los criterios de un síndrome de dependencia (F19.2)',
    },
  },
  multiple_substances_dependence: {
    name: 'Síndrome de dependencia por consumo múltiple de sustancias y otras sustancias psicotrópicas',
    differentials: [
      'Uso perjudicial de múltiples sustancias (F19.1) sin dependencia',
      'Intoxicación aguda (F19.0)',
      'Trastorno afectivo o psicótico inducido por sustancias',
    ],
    groups: {
      'f19_2.dependence': 'Rasgos de dependencia (al menos 3 en un período de 12 meses)',
    },
    criteria: {
      'f19_2.craving':
        'Deseo intenso o una especie de compulsión por consumir múltiples sustancias u otras sustancias psicotrópicas (craving)',
      'f19_2.impaired_control':
        'Disminución de la capacidad de controlar el inicio, la finalización y la cantidad del consumo',
      'f19_2.withdrawal':
        'Síndrome de abstinencia físico al reducir o interrumpir el consumo, o consumo para aliviar los síntomas de abstinencia',
      'f19_2.tolerance':
        'Desarrollo de tolerancia, con necesidad de aumentar la dosis para lograr el efecto inicial',
      'f19_2.neglect':
        'Abandono progresivo de otros intereses y mayor tiempo dedicado a obtener la sustancia, consumirla y recuperarse de sus efectos',
      'f19_2.persistence_harm':
        'Consumo continuado a pesar de evidencia de consecuencias perjudiciales a nivel físico, psíquico o social',
    },
  },
  multiple_substances_withdrawal: {
    name: 'Síndrome de abstinencia por consumo múltiple de sustancias y otras sustancias psicotrópicas',
    differentials: [
      'Intoxicación aguda (F19.0)',
      'Síndrome de abstinencia con delírium (F19.4)',
      'Trastorno de ansiedad o afectivo',
      'Enfermedad somática con síntomas autonómicos',
    ],
    groups: {
      'f19_3.context': 'Contexto de abstinencia',
      'f19_3.symptoms': 'Síntomas de abstinencia (al menos 1)',
      'f19_3.exclusions': 'Exclusiones',
    },
    criteria: {
      'f19_3.cessation':
        'Interrupción o reducción del consumo de múltiples sustancias u otras sustancias psicotrópicas tras un consumo repetido, generalmente sostenido y/o en dosis altas',
      'f19_3.withdrawal_syndrome': 'Existe un síndrome de abstinencia típico de la sustancia',
      'f19_3.mixed_withdrawal':
        'Síntomas de abstinencia acordes con las sustancias involucradas (p. ej. temblor, hiperactividad autonómica, disforia, alteración del sueño)',
      'f19_3.craving': 'Deseo intenso (craving) de una o más sustancias',
      'f19_3.anxiety_agitation': 'Ansiedad, inquietud o agitación',
      'f19_3.autonomic': 'Síntomas autonómicos de abstinencia (sudoración, taquicardia, temblor)',
      'f19_3.insomnia': 'Alteración del sueño',
      'f19_3.dysphoria': 'Estado de ánimo disfórico o depresivo',
      'f19_3.exclude_other_cause':
        'Los síntomas no se explican mejor por otro trastorno somático o mental',
    },
  },
  multiple_substances_withdrawal_delirium: {
    name: 'Síndrome de abstinencia con delírium por consumo múltiple de sustancias y otras sustancias psicotrópicas',
    differentials: [
      'Síndrome de abstinencia sin delírium (F19.3)',
      'Delírium de otra (física) causa (F05)',
      'Trastorno psicótico inducido por sustancias',
      'Encefalopatía de Wernicke (en consumo de alcohol)',
    ],
    groups: {
      'f19_4.context': 'Abstinencia con alteración de la conciencia',
      'f19_4.features': 'Rasgos delirantes asociados (al menos 1)',
      'f19_4.exclusions': 'Exclusiones',
    },
    criteria: {
      'f19_4.withdrawal_context':
        'Interrupción o reducción del consumo de múltiples sustancias u otras sustancias psicotrópicas en contexto de dependencia preexistente',
      'f19_4.clouding':
        'Alteración de la conciencia con disminución de la alerta y la atención (estado delirante)',
      'f19_4.disorientation': 'Desorientación y alteración global de las funciones cognitivas',
      'f19_4.hallucinations':
        'Alucinaciones o ilusiones vívidas (frecuentemente visuales o escénicas)',
      'f19_4.psychomotor': 'Agitación psicomotora o inquietud marcada',
      'f19_4.autonomic':
        'Hiperactividad autonómica marcada (p. ej. taquicardia, sudoración, hipertensión, temblor amplio); posibles convulsiones',
      'f19_4.exclude_other_cause':
        'El delírium no se explica mejor por una enfermedad física independiente',
    },
  },
  multiple_substances_psychotic_disorder: {
    name: 'Trastorno psicótico por consumo múltiple de sustancias y otras sustancias psicotrópicas',
    differentials: [
      'Esquizofrenia o trastorno delirante persistente',
      'Intoxicación aguda (F19.0) con fenómenos psicóticos',
      'Síndrome de abstinencia con delírium (F19.4)',
      'Trastorno afectivo con síntomas psicóticos',
    ],
    groups: {
      'f19_5.symptoms': 'Síntomas psicóticos (al menos 1)',
      'f19_5.context': 'Relación temporal con el consumo',
      'f19_5.exclusions': 'Exclusiones',
    },
    criteria: {
      'f19_5.hallucinations':
        'Alucinaciones (frecuentemente auditivas o visuales) que no son únicamente expresión de una intoxicación simple',
      'f19_5.delusions': 'Ideas delirantes, frecuentemente delirios persecutorios o de referencia',
      'f19_5.temporal_relation':
        'Inicio de los síntomas psicóticos durante o poco después (generalmente dentro de dos semanas) del consumo de múltiples sustancias u otras sustancias psicotrópicas',
      'f19_5.partial_remission':
        'Los síntomas suelen remitir al menos parcialmente en un período limitado (del orden de semanas a pocos meses)',
      'f19_5.exclude_primary_psychosis':
        'El cuadro no se explica mejor por un trastorno psicótico primario y no ocurre exclusivamente en contexto de intoxicación o delírium de abstinencia',
    },
  },
}

/** ES translations — bloque CIE-10 F1 + fragmentos CIE-11 (6C4x) generados. */
export const esSubstanceUse: DisorderTranslationMap = withIcd11SubstanceTranslations(
  { ...esSubstanceUseBase, ...buildEsPhaseBSubstance() },
  {
  substanceNames: {
    alcohol_dependence: 'de alcohol',
    alcohol_harmful_use: 'de alcohol',
    opioids_dependence: 'de opioides',
    cannabinoids_dependence: 'de cannabinoides',
    sedatives_dependence: 'de sedantes o hipnóticos',
    cocaine_dependence: 'de cocaína',
    stimulants_dependence: 'de otros estimulantes incluida la cafeína',
    nicotine_dependence: 'de tabaco/nicotina',
    volatile_solvents_dependence: 'de disolventes volátiles',
    multiple_substances_dependence: 'de múltiples sustancias y otras sustancias psicotrópicas',
    caffeine_dependence: 'de cafeína',
    synthetic_cathinones_dependence: 'de catinonas sintéticas',
    mdma_related_dependence: 'de MDMA o empatógenos relacionados',
    dissociative_drugs_dependence: 'de sustancias disociativas incluidos ketamina y PCP',
    multiple_specified_psychoactive_dependence: 'de múltiples sustancias psicotrópicas especificadas incluidos medicamentos',
    unknown_psychoactive_dependence: 'de sustancias psicotrópicas desconocidas o no especificadas',
    opioids_harmful_use: 'de opioides',
    cannabinoids_harmful_use: 'de cannabinoides',
    sedatives_harmful_use: 'de sedantes o hipnóticos',
    cocaine_harmful_use: 'de cocaína',
    stimulants_harmful_use: 'de otros estimulantes incluida la cafeína',
    hallucinogens_harmful_use: 'de alucinógenos',
    nicotine_harmful_use: 'de tabaco/nicotina',
    volatile_solvents_harmful_use: 'de disolventes volátiles',
    multiple_substances_harmful_use: 'de múltiples sustancias y otras sustancias psicotrópicas',
    caffeine_harmful_use: 'de cafeína',
    synthetic_cathinones_harmful_use: 'de catinonas sintéticas',
    mdma_related_harmful_use: 'de MDMA o empatógenos relacionados',
    dissociative_drugs_harmful_use: 'de sustancias disociativas incluidos ketamina y PCP',
    multiple_specified_psychoactive_harmful_use: 'de múltiples sustancias psicotrópicas especificadas incluidos medicamentos',
    unknown_psychoactive_harmful_use: 'de sustancias psicotrópicas desconocidas o no especificadas',
  },
  depGroupLabel:
    'Rasgos de dependencia según la CIE-11 (al menos 2 de 3, durante ≥ 12 meses — o ≥ 1 mes con consumo continuo)',
  depImpairedControl: (s) =>
    `Control alterado del consumo ${s} (inicio, cantidad, circunstancias o finalización), a menudo acompañado de un deseo intenso de consumir (craving)`,
  depSalience:
    'Prioridad creciente otorgada al consumo frente a otros intereses y obligaciones, con consumo continuado a pesar de la aparición de consecuencias perjudiciales',
  depPhysiological:
    'Rasgos fisiológicos: tolerancia, síntomas de abstinencia al reducir o interrumpir el consumo, o consumo repetido para prevenir o aliviar la abstinencia',
  harmPatternGroupLabel:
    'Patrón de consumo persistente (episódico o continuo, normalmente durante ≥ 12 meses — o ≥ 1 mes si es continuo)',
  harmGroupLabel: 'Daño demostrable (al menos uno de los siguientes ámbitos)',
  exclusionsGroupLabel: 'Exclusiones',
  usePattern: (s) => `Se documenta un patrón de consumo ${s} repetido o persistente`,
  harmSelf:
    'Daño clínicamente significativo a la salud física o mental de la persona como consecuencia del consumo (incluido el comportamiento relacionado con el consumo o la intoxicación)',
  harmOthers:
    'Daño a la salud de terceros derivado del comportamiento de la persona relacionado con el consumo o la intoxicación (p. ej. lesiones a terceros, daño en el tráfico) — extensión específica de la CIE-11',
  excludeDependence: (depCode) => `No se cumplen los criterios de una dependencia (${depCode})`,
  },
)
