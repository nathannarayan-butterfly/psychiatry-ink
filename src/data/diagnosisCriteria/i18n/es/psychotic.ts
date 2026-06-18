import type { DisorderTranslationMap } from '../types'

/** ES translations — ICD-10 F2 block. */
export const esPsychotic: DisorderTranslationMap = {
  schizophrenia: {
    name: 'Esquizofrenia',
    differentials: [
      'Trastorno esquizoafectivo',
      'Trastorno afectivo con síntomas psicóticos',
      'Trastorno psicótico agudo y transitorio',
      'Psicosis inducida por sustancias u orgánica',
    ],
    groups: {
      'f20.characteristic': 'Síntomas característicos (al menos 1 síntoma inequívoco)',
      'f20.duration': 'Criterio temporal',
      'f20.exclusions': 'Exclusiones',
      '6a20.core_symptom':
        'Al menos un síntoma nuclear (delirios persistentes, alucinaciones persistentes, pensamiento desorganizado o vivencias de influencia/pasividad/control)',
      '6a20.symptoms': 'Al menos dos síntomas característicos, de los cuales al menos uno pertenece al grupo nuclear',
      '6a20.duration': 'Criterio temporal',
      '6a20.exclusions': 'Exclusiones',
    },
    criteria: {
      'f20.ego_disturbance':
        'Trastornos del yo: sonorización del pensamiento, inserción, robo o difusión del pensamiento, así como vivencias de control o influencia o sensación de ser dirigido (vivencias de pasividad)',
      'f20.auditory_hallucinations':
        'Voces que comentan o dialogan (que hablan sobre la persona) u otras voces persistentes procedentes de alguna parte del cuerpo',
      'f20.delusions':
        'Ideas delirantes persistentes, culturalmente inapropiadas y completamente irreales (extravagantes)',
      'f20.formal_thought_disorder':
        'Bloqueo o interpolaciones en el curso del pensamiento con disgregación, respuestas tangenciales (paralogia) o neologismos',
      'f20.duration_one_month':
        'Los síntomas característicos están presentes la mayor parte del tiempo durante un periodo de al menos un mes',
      'f20.exclude_mood_primary':
        'En presencia simultánea de una sintomatología maníaca o depresiva marcada, los síntomas esquizofrénicos precedieron al trastorno afectivo (no se trata de un cuadro afectivo primario)',
      'f20.exclude_organic_substance':
        'Los síntomas no son atribuibles a una enfermedad cerebral orgánica ni a una intoxicación, dependencia o abstinencia de una sustancia psicótropa',
      '6a20.persistent_delusions':
        'Fenómenos delirantes persistentes (p. ej. delirio de persecución, de referencia, de grandeza o extravagante)',
      '6a20.persistent_hallucinations':
        'Alucinaciones persistentes de cualquier modalidad sensorial (con mayor frecuencia auditivas)',
      '6a20.disorganised_thinking':
        'Pensamiento desorganizado o trastorno formal del pensamiento (disgregación, bloqueo del pensamiento, respuestas tangenciales o neologismos)',
      '6a20.passivity':
        'Vivencias de influencia, pasividad o control, junto con trastornos del yo (inserción, robo o difusión del pensamiento)',
      '6a20.negative_symptoms':
        'Síntomas negativos (aplanamiento afectivo, pobreza del lenguaje, falta de impulso e iniciativa, anhedonia o retraimiento social)',
      '6a20.disorganised_behaviour':
        'Comportamiento gravemente desorganizado que altera la orientación hacia objetivos de las actividades cotidianas',
      '6a20.psychomotor_disturbance':
        'Alteraciones psicomotoras (síntomas catatónicos como estupor, mantenimiento de posturas, mutismo, negativismo o agitación)',
      '6a20.duration_one_month':
        'Los síntomas característicos están presentes la mayor parte del tiempo durante un periodo de al menos un mes',
      '6a20.exclude_substance_organic':
        'La sintomatología no es atribuible a una sustancia psicótropa, a un medicamento ni a otra causa física u orgánica',
      '6a20.exclude_mood':
        'Los síntomas no se explican mejor por un trastorno afectivo con rasgos psicóticos (ante un episodio concurrente moderado a grave, debe considerarse un trastorno esquizoafectivo)',
    },
  },
  schizotypal_disorder: {
    name: 'Trastorno esquizotípico',
    differentials: [
      'Esquizofrenia (F20) — ante una sintomatología psicótica inequívoca',
      'Trastorno de la personalidad esquizoide o paranoide',
      'Trastorno del espectro autista con peculiaridad social',
      'Esquizofrenia incipiente (prodrómica)',
    ],
    groups: {
      'f21.features': 'Rasgos característicos (al menos 4 de 9, persistentes o episódicos)',
      'f21.duration': 'Criterio temporal',
      'f21.exclusions': 'Exclusiones',
    },
    criteria: {
      'f21.constricted_affect':
        'Afecto inadecuado o restringido, con un trato frío y distante y escasa expresividad emocional',
      'f21.odd_behavior': 'Comportamiento y apariencia peculiares, excéntricos o extraños',
      'f21.social_withdrawal':
        'Retraimiento social y empobrecimiento del contacto con los demás (escasa capacidad de vinculación)',
      'f21.magical_thinking':
        'Creencias mágicas e inhabituales que influyen en la conducta y no se ajustan a las normas socioculturales',
      'f21.suspiciousness': 'Desconfianza o ideas paranoides sin carácter delirante',
      'f21.ruminations':
        'Rumiaciones obsesivas sin resistencia interna, con frecuencia de contenido dismorfofóbico, sexual o agresivo',
      'f21.unusual_perceptions':
        'Experiencias perceptivas inhabituales, incluidas alteraciones de la sensación corporal, así como despersonalización o desrealización',
      'f21.odd_speech':
        'Pensamiento prolijo, metafórico, rebuscado o vago que se manifiesta en un lenguaje peculiar sin disgregación marcada',
      'f21.quasi_psychotic':
        'Episodios cuasipsicóticos transitorios y ocasionales, con ilusiones intensas, alucinaciones auditivas o de otro tipo e ideas seudodelirantes, generalmente sin desencadenante externo',
      'f21.duration_two_years':
        'Los rasgos están presentes de forma persistente o episódica durante un periodo de al menos dos años',
      'f21.exclude_schizophrenia':
        'En ningún momento se han cumplido por completo los criterios de una esquizofrenia (F20)',
      'f21.exclude_organic':
        'La sintomatología no es atribuible a un trastorno mental orgánico ni a una sustancia psicótropa',
    },
  },
  persistent_delusional_disorder: {
    name: 'Trastorno delirante persistente',
    differentials: [
      'Esquizofrenia (F20) — ante síntomas adicionales típicamente esquizofrénicos',
      'Trastorno afectivo con delirio congruente con el estado de ánimo',
      'Delirio de causa orgánica o por sustancias',
      'Trastorno delirante persistente en el contexto de un trastorno de la personalidad',
    ],
    groups: {
      'f22.core': 'Núcleo: delirio persistente',
      'f22.exclusions': 'Exclusiones (sin cuadro esquizofrénico completo, no orgánico)',
    },
    criteria: {
      'f22.delusion':
        'Un delirio o un sistema de ideas delirantes relacionadas por su contenido (p. ej. delirio de persecución, de grandeza, hipocondríaco, de celos o erotomaníaco)',
      'f22.duration_three_months': 'El delirio persiste durante un periodo de al menos tres meses',
      'f22.exclude_schizophrenic_symptoms':
        'Ausencia de alucinaciones auditivas persistentes, trastornos del yo u otros síntomas característicos de la esquizofrenia (a lo sumo presentes de forma fugaz)',
      'f22.exclude_organic':
        'El delirio no es explicable por un trastorno mental orgánico, el efecto de una sustancia o un trastorno afectivo primario',
    },
  },
  acute_transient_psychotic_disorder: {
    name: 'Trastorno psicótico agudo y transitorio',
    differentials: [
      'Esquizofrenia (F20) — si los síntomas persisten más de un mes',
      'Trastorno afectivo con síntomas psicóticos',
      'Psicosis inducida por sustancias u orgánica',
      'Trastorno delirante persistente (F22)',
    ],
    groups: {
      'f23.onset': 'Inicio agudo',
      'f23.symptoms': 'Síntomas psicóticos (al menos uno)',
      'f23.exclusions': 'Exclusiones',
      '6a23.onset': 'Inicio agudo',
      '6a23.symptoms': 'Sintomatología psicótica polimorfa de variación rápida (al menos uno)',
      '6a23.course': 'Criterio evolutivo',
      '6a23.exclusions': 'Exclusiones',
    },
    criteria: {
      'f23.acute_onset':
        'Inicio agudo de la sintomatología psicótica en un plazo máximo de dos semanas a partir de un estado sin alteraciones',
      'f23.delusions':
        'Fenómenos delirantes que pueden cambiar rápidamente en tipo y contenido (cuadro polimorfo)',
      'f23.hallucinations': 'Alucinaciones de modalidad e intensidad cambiantes',
      'f23.perplexity':
        'Sintomatología polimorfa de rápida variación, con agitación emocional o perplejidad',
      'f23.exclude_organic':
        'La sintomatología no es atribuible a un trastorno mental orgánico ni a una sustancia psicótropa (intoxicación, abstinencia)',
      '6a23.acute_onset':
        'Inicio agudo de la sintomatología psicótica en un plazo máximo de dos semanas a partir de un estado en general sin alteraciones',
      '6a23.rapidly_changing':
        'Cuadro polimorfo cuyo tipo e intensidad de los síntomas cambian rápidamente (de un día a otro o dentro de un mismo día) — el rasgo distintivo de la categoría CIE-11',
      '6a23.delusions': 'Fenómenos delirantes que pueden cambiar rápidamente en tipo y contenido',
      '6a23.hallucinations': 'Alucinaciones de modalidad e intensidad cambiantes',
      '6a23.transient_remission':
        'El episodio es transitorio: los síntomas suelen remitir por completo en unos tres meses y no superan la duración sintomática exigida para una esquizofrenia',
      '6a23.exclude_substance_organic':
        'La sintomatología no es atribuible a una sustancia psicótropa, a un medicamento ni a otra causa física u orgánica',
    },
  },
  induced_delusional_disorder: {
    name: 'Trastorno delirante inducido (folie à deux)',
    differentials: [
      'Trastorno delirante independiente (F22) en ambas personas',
      'Esquizofrenia (F20)',
      'Creencias realistas y no delirantes compartidas conjuntamente',
    ],
    groups: {
      'f24.core': 'Criterios nucleares de la inducción',
      'f24.exclusions': 'Exclusiones',
    },
    criteria: {
      'f24.shared_delusion':
        'La persona afectada comparte un delirio o un sistema delirante con otra persona que padece un trastorno delirante genuino',
      'f24.close_relationship':
        'Entre ambas personas existe una relación inusualmente estrecha y vinculada emocionalmente (p. ej. familiar o de pareja)',
      'f24.induction_context':
        'Existe una relación temporal y de contenido: el delirio se adoptó por el contacto con la persona enferma primaria y no existía previamente de forma independiente',
      'f24.exclude_primary_psychosis':
        'La persona inducida no cumplía antes del contacto los criterios de un trastorno psicótico independiente; la sintomatología no es explicable por una causa orgánica ni por sustancias',
    },
  },
  schizoaffective_disorder: {
    name: 'Trastorno esquizoafectivo',
    differentials: [
      'Esquizofrenia (F20) con sintomatología afectiva acompañante',
      'Trastorno afectivo con síntomas psicóticos incongruentes con el estado de ánimo',
      'Trastorno bipolar con rasgos psicóticos',
      'Psicosis inducida por sustancias u orgánica',
    ],
    groups: {
      'f25.schizophrenic': 'Síntomas esquizofrénicos (al menos uno, prominente en el mismo episodio)',
      'f25.affective': 'Síndrome afectivo (maníaco o depresivo, prominente de forma simultánea)',
      'f25.simultaneity': 'Simultaneidad',
      'f25.exclusions': 'Exclusiones',
      '6a21.schizophrenic':
        'Requisitos sintomáticos de la esquizofrenia (6A20) cumplidos (al menos uno prominente en el mismo episodio)',
      '6a21.mood_episode': 'Episodio afectivo concurrente moderado a grave (al menos uno)',
      '6a21.concurrence': 'Simultaneidad y gravedad',
      '6a21.exclusions': 'Exclusiones',
    },
    criteria: {
      'f25.ego_disturbance':
        'Trastornos del yo como inserción, robo o difusión del pensamiento, o vivencias de control e influencia',
      'f25.hallucinations': 'Voces que comentan o dialogan, o alucinaciones persistentes',
      'f25.bizarre_delusions': 'Delirio persistente extravagante o culturalmente inapropiado por completo',
      'f25.thought_disorder':
        'Trastornos formales del pensamiento con disgregación, bloqueo del pensamiento o neologismos',
      'f25.manic_syndrome':
        'Cuadro maníaco marcado con estado de ánimo elevado o irritable e impulso (drive) aumentado',
      'f25.depressive_syndrome':
        'Cuadro depresivo marcado con estado de ánimo deprimido, pérdida de interés y disminución del impulso',
      'f25.simultaneous_prominence':
        'Los síntomas esquizofrénicos y afectivos se manifiestan de forma marcada dentro del mismo episodio de enfermedad, de manera simultánea o con un desfase de a lo sumo unos pocos días',
      'f25.exclude_organic':
        'La sintomatología no es atribuible a un trastorno mental orgánico ni a una sustancia psicótropa',
      '6a21.delusions': 'Delirios persistentes (p. ej. delirio de persecución, de referencia o extravagante)',
      '6a21.hallucinations': 'Alucinaciones persistentes, con frecuencia voces que comentan o dialogan',
      '6a21.disorganised_thinking':
        'Pensamiento desorganizado o trastorno formal del pensamiento (disgregación, bloqueo del pensamiento, neologismos)',
      '6a21.passivity':
        'Vivencias de influencia, pasividad o control, junto con trastornos del yo (inserción, robo o difusión del pensamiento)',
      '6a21.manic_episode':
        'Un episodio maníaco (o de hipomanía a manía) de grado moderado a grave, con estado de ánimo elevado o irritable e impulso aumentado, que cumple por completo los requisitos de un episodio afectivo',
      '6a21.depressive_episode':
        'Un episodio depresivo de grado moderado a grave, con estado de ánimo deprimido, pérdida de interés y disminución del impulso, que cumple por completo los requisitos de un episodio afectivo',
      '6a21.mixed_episode':
        'Un episodio mixto con rasgos maníacos y depresivos presentes de forma simultánea o alternándose rápidamente, de grado moderado a grave',
      '6a21.simultaneous_episode':
        'Los síntomas esquizofrénicos y el episodio afectivo se presentan de forma simultánea dentro del mismo episodio de enfermedad, siendo el episodio afectivo al menos de gravedad moderada y cumpliendo por completo sus requisitos diagnósticos',
      '6a21.exclude_substance_organic':
        'La sintomatología no es atribuible a una sustancia psicótropa, a un medicamento ni a otra causa física u orgánica',
    },
  },
  other_nonorganic_psychosis: {
    name: 'Otro trastorno psicótico no orgánico',
    differentials: [
      'Esquizofrenia (F20) o trastorno delirante persistente (F22) si se cumplen por completo los criterios',
      'Trastorno psicótico agudo y transitorio (F23)',
      'Trastorno esquizoafectivo (F25)',
      'Psicosis orgánica o por sustancias',
    ],
    groups: {
      'f28.core':
        'Sintomatología psicótica que no puede asignarse a una categoría específica pero sí puede describirse',
      'f28.exclusions': 'Exclusiones',
    },
    criteria: {
      'f28.psychotic_symptoms':
        'Hay síntomas psicóticos (delirio, alucinaciones o trastornos formales del pensamiento) presentes y describibles clínicamente',
      'f28.no_specific_category':
        'El cuadro no cumple los criterios completos de una esquizofrenia, un trastorno delirante, un trastorno psicótico agudo y transitorio o un trastorno esquizoafectivo (categoría residual nombrada)',
      'f28.exclude_organic':
        'La sintomatología psicótica no es atribuible a un trastorno mental orgánico ni a una sustancia psicótropa',
    },
  },
  unspecified_nonorganic_psychosis: {
    name: 'Psicosis no orgánica sin especificación',
    differentials: [
      'Otro trastorno psicótico no orgánico (F28) ante un cuadro más definido',
      'Esquizofrenia (F20), trastorno delirante persistente (F22) o trastorno esquizoafectivo (F25) si se cumplen por completo los criterios',
      'Trastorno psicótico agudo y transitorio (F23)',
      'Psicosis orgánica o por sustancias',
    ],
    groups: {
      'f29.core': 'Sintomatología psicótica sin información suficiente para una asignación más específica',
      'f29.exclusions': 'Exclusiones',
    },
    criteria: {
      'f29.psychotic_symptoms':
        'Existe una sintomatología claramente psicótica, pero no puede asignarse a ninguna categoría específica por falta de información suficiente',
      'f29.insufficient_information':
        'Los datos disponibles no bastan para un diagnóstico más específico o son contradictorios (categoría provisional o de recurso)',
      'f29.exclude_organic':
        'La sintomatología psicótica no es atribuible a un trastorno mental orgánico ni a una sustancia psicótropa',
    },
  },
}
