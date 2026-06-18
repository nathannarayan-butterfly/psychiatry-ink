import type { DisorderTranslationMap } from '../types'

/** ES translations — ICD-10 F3 block. */
export const esMood: DisorderTranslationMap = {
  depressive_episode: {
    name: 'Episodio depresivo',
    differentials: [
      'Trastorno de adaptación',
      'Depresión bipolar (comprobar indicios de fases maníacas/hipomaníacas previas)',
      'Distimia / trastorno depresivo persistente',
      'Trastorno afectivo orgánico o inducido por sustancias',
    ],
    groups: {
      'f32.core': 'Síntomas nucleares (al menos 2 de 3)',
      'f32.additional': 'Síntomas adicionales (al menos 2)',
      'f32.exclusions': 'Exclusiones',
      '6a70.affective_core': 'Síntoma afectivo nuclear (al menos uno requerido)',
      '6a70.total_symptoms':
        'Sintomatología total de los tres grupos (al menos 5, casi todos los días, incluido al menos un síntoma afectivo)',
      '6a70.duration': 'Criterio temporal',
      '6a70.severity': 'Especificador de gravedad (leve / moderado / grave)',
      '6a70.exclusions': 'Exclusiones',
    },
    criteria: {
      'f32.depressed_mood':
        'Ánimo deprimido y abatido durante casi todos los días y la mayor parte del día, en gran medida con independencia de las circunstancias externas',
      'f32.anhedonia':
        'Pérdida marcada del interés o de la capacidad de disfrute en actividades habitualmente placenteras',
      'f32.reduced_energy':
        'Disminución de la energía o del impulso, o aumento de la fatigabilidad, ya tras un esfuerzo mínimo',
      'f32.concentration':
        'Disminución de la capacidad de pensar, concentrarse o tomar decisiones',
      'f32.guilt_worthlessness':
        'Disminución de la autoestima o de la autoconfianza, o sentimientos inapropiados de culpa y de inutilidad',
      'f32.hopelessness': 'Visión pesimista y desesperanzada del futuro',
      'f32.sleep': 'Alteración del sueño de cualquier tipo',
      'f32.appetite':
        'Cambios del apetito (disminución o aumento) con la consiguiente variación de peso',
      'f32.psychomotor':
        'Cambios de la actividad psicomotriz con agitación o inhibición (subjetivos u observables)',
      'f32.suicidality':
        'Pensamientos recurrentes de muerte o de suicidio, o conducta suicida o autolesiva',
      'f32.exclude_mania':
        'En ningún momento de la biografía han aparecido síntomas hipomaníacos o maníacos de intensidad suficiente para cumplir los criterios de un episodio hipomaníaco/maníaco (lo que orientaría hacia un trastorno bipolar)',
      'f32.exclude_organic_substance':
        'El episodio no es atribuible a una sustancia psicótropa ni a un trastorno mental orgánico',
      '6a70.depressed_mood':
        'Ánimo deprimido y abatido la mayor parte del día y casi todos los días, en gran medida con independencia de las circunstancias externas (grupo afectivo)',
      '6a70.anhedonia':
        'Disminución marcada del interés o del placer por las actividades, en especial las habitualmente vividas como placenteras (grupo afectivo)',
      '6a70.concentration':
        'Disminución de la capacidad de concentración y atención, o indecisión marcada (grupo cognitivo-conductual)',
      '6a70.worthlessness':
        'Sentimientos de inutilidad o culpa excesiva e inapropiada (grupo cognitivo-conductual)',
      '6a70.hopelessness': 'Desesperanza respecto al futuro (grupo cognitivo-conductual)',
      '6a70.suicidality':
        'Pensamientos recurrentes de muerte o de suicidio, o conducta suicida o autolesiva (grupo cognitivo-conductual)',
      '6a70.sleep':
        'Alteración del sueño (dificultad para conciliar o mantener el sueño, despertar precoz o aumento de la necesidad de sueño), casi todos los días (grupo neurovegetativo)',
      '6a70.appetite':
        'Cambio marcado del apetito o del peso (disminución o aumento) (grupo neurovegetativo)',
      '6a70.fatigue':
        'Disminución de la energía, fatigabilidad marcada o agotamiento ya tras un esfuerzo mínimo (grupo neurovegetativo)',
      '6a70.psychomotor':
        'Agitación o inhibición psicomotriz, referida subjetivamente u observable (grupo neurovegetativo)',
      '6a70.duration_two_weeks':
        'La sintomatología persiste de forma casi continua durante un período de al menos dos semanas',
      '6a70.severity_mild':
        'Episodio leve: ninguno de los síntomas es especialmente intenso, con solo un leve deterioro del funcionamiento cotidiano',
      '6a70.severity_moderate':
        'Episodio moderado: varios síntomas marcados, o numerosos síntomas más leves, con deterioro notable del funcionamiento, sin delirios ni alucinaciones',
      '6a70.severity_severe':
        'Episodio grave: muchos o la mayoría de los síntomas marcadamente presentes con deterioro relevante del funcionamiento, eventualmente con síntomas psicóticos',
      '6a70.exclude_mania':
        'En ningún momento de la biografía han aparecido episodios maníacos, mixtos o hipomaníacos (su presencia orientaría hacia un trastorno bipolar)',
      '6a70.exclude_substance_organic':
        'La sintomatología no es atribuible a una sustancia psicótropa, a un medicamento ni a otra causa física u orgánica',
    },
  },
  manic_episode: {
    name: 'Episodio maníaco (incluye hipomanía y manía con síntomas psicóticos)',
    differentials: [
      'Trastorno afectivo bipolar (F31) — ante al menos dos episodios afectivos a lo largo de la evolución',
      'Trastorno esquizoafectivo, tipo maníaco (F25.0)',
      'Trastorno maníaco inducido por sustancias (p. ej. estimulantes, esteroides) u orgánico',
      'Trastorno por déficit de atención/hiperactividad en la edad adulta',
      'Forma agitada de un episodio afectivo mixto',
    ],
    groups: {
      'f30.mood_core': 'Síntoma guía del ánimo (elevado o irritable)',
      'f30.symptoms':
        'Síntomas acompañantes de la manía (al menos 3; con ánimo solo irritable, al menos 4)',
      'f30.duration':
        'Criterio temporal (manía al menos 1 semana; hipomanía al menos varios días)',
      'f30.severity_hypomania': 'Especificador de gravedad: hipomanía (F30.0)',
      'f30.severity_mania':
        'Especificador de gravedad: manía sin síntomas psicóticos (F30.1)',
      'f30.severity_psychotic':
        'Especificador de gravedad: manía con síntomas psicóticos (F30.2)',
      'f30.exclusions': 'Exclusiones',
      '6a60.core_dyad': 'Díada nuclear: cambio del ánimo Y aumento de la actividad/energía (ambos requeridos)',
      '6a60.symptoms': 'Síntomas característicos acompañantes (varios; al menos 3)',
      '6a60.duration': 'Criterio temporal (al menos 1 semana, o menos si requiere ingreso hospitalario)',
      '6a60.exclusions': 'Exclusiones',
    },
    criteria: {
      'f30.elevated_mood':
        'Ánimo marcadamente elevado, expansivo o eufórico, no acorde con las circunstancias vitales',
      'f30.irritable_mood': 'Estado de ánimo notablemente irritable o disfórico-expansivo',
      'f30.increased_activity':
        'Aumento de la actividad, inquietud motriz o incremento del impulso',
      'f30.talkativeness': 'Aumento de la presión del habla o mayor locuacidad (logorrea)',
      'f30.distractibility':
        'Mayor distractibilidad o cambio constante de actividades y planes',
      'f30.reduced_sleep_need':
        'Disminución de la necesidad de sueño manteniendo o aumentando la actividad diurna',
      'f30.grandiosity':
        'Autoestima exagerada o ideas de grandeza que llegan a la sobreestimación de uno mismo',
      'f30.reckless_behavior':
        'Conducta desinhibida, sin distancia o imprudente con desconocimiento de las posibles consecuencias (p. ej. gastos irreflexivos, emprendimientos arriesgados)',
      'f30.increased_sociability_libido':
        'Aumento de la sociabilidad, del ajetreo o de la libido',
      'f30.duration_one_week':
        'La sintomatología persiste durante al menos una semana (o un período más corto si requiere ingreso hospitalario); para una hipomanía bastan varios días consecutivos',
      'f30.hypomania_mild':
        'Ánimo elevado de grado leve a moderado con aumento del impulso durante varios días, sin deterioro relevante de la actividad laboral ni rechazo social y sin síntomas psicóticos',
      'f30.mania_marked_impairment':
        'Manía plenamente desarrollada con deterioro relevante del funcionamiento cotidiano, pero sin delirios ni alucinaciones',
      'f30.psychotic_delusions':
        'Ideas delirantes de grandeza congruentes con el ánimo o (con menor frecuencia) incongruentes con el ánimo',
      'f30.psychotic_hallucinations': 'Alucinaciones en el marco del episodio maníaco',
      'f30.exclude_organic_substance':
        'El episodio no es atribuible a una sustancia psicótropa (p. ej. estimulantes, corticosteroides) ni a un trastorno mental orgánico',
      'f30.exclude_schizoaffective':
        'No coexiste una sintomatología esquizofrénica dominante que sugiera un trastorno esquizoafectivo',
      '6a60.mood_change':
        'Estado de ánimo extremo de euforia, irritabilidad o expansividad la mayoría de los días y la mayor parte del día',
      '6a60.increased_activity_energy':
        'Aumento concomitante de la actividad o de la energía subjetiva (la segunda característica nuclear obligatoria en la CIE-11, junto al cambio del ánimo)',
      '6a60.grandiosity':
        'Autoestima exagerada o ideas de grandeza que llegan a la sobreestimación de uno mismo',
      '6a60.decreased_sleep_need':
        'Disminución de la necesidad de sueño manteniendo o aumentando la actividad diurna',
      '6a60.pressured_speech':
        'Aumento de la presión del habla o locuacidad excesiva y difícil de interrumpir (logorrea)',
      '6a60.flight_of_ideas': 'Pensamiento subjetivamente acelerado, fuga de ideas o pensamientos que se agolpan',
      '6a60.distractibility': 'Mayor distractibilidad o cambio constante de actividades y planes',
      '6a60.increased_goal_directed_activity':
        'Aumento de la actividad dirigida a objetivos, hiperactividad o aumento de la sociabilidad o la libido',
      '6a60.risky_behaviour':
        'Conducta imprudente o desinhibida con desconocimiento de las posibles consecuencias (p. ej. gastos irreflexivos, emprendimientos arriesgados)',
      '6a60.duration_one_week':
        'La sintomatología está presente la mayoría de los días de forma casi continua durante al menos una semana (o menos si requiere ingreso hospitalario)',
      '6a60.exclude_substance_organic':
        'El episodio no es atribuible a una sustancia psicótropa, a un medicamento ni a otra causa física u orgánica',
    },
  },
  bipolar_affective_disorder: {
    name: 'Trastorno afectivo bipolar',
    differentials: [
      'Trastorno depresivo recurrente (F33) — ante episodios exclusivamente depresivos sin fases (hipo)maníacas',
      'Trastorno esquizoafectivo (F25)',
      'Ciclotimia (F34.0) — ante una oscilación subumbral y crónica',
      'Trastorno de la personalidad emocionalmente inestable (tipo límite)',
      'Trastorno afectivo inducido por sustancias u orgánico',
    ],
    groups: {
      'f31.recurrence': 'Curso longitudinal: episodios afectivos repetidos',
      'f31.current_hypomanic':
        'Especificador: episodio hipomaníaco actual (F31.0)',
      'f31.current_manic':
        'Especificador: episodio maníaco actual (F31.1 sin / F31.2 con síntomas psicóticos)',
      'f31.current_mixed': 'Especificador: episodio mixto actual (F31.6)',
      'f31.current_depressed':
        'Especificador: episodio depresivo actual (F31.3 leve/moderado · F31.4 grave · F31.5 con síntomas psicóticos)',
      'f31.exclusions': 'Exclusiones',
      '6a60_61.core': 'Núcleo: al menos un episodio (hipo)maníaco o mixto a lo largo de la evolución (requerido)',
      '6a60.type_i': 'Subtipo: trastorno bipolar de tipo I (6A60) — al menos un episodio maníaco o mixto',
      '6a61.type_ii':
        'Subtipo: trastorno bipolar de tipo II (6A61) — al menos un episodio hipomaníaco Y uno depresivo, nunca uno maníaco',
      '6a60_61.exclusions': 'Exclusiones',
    },
    criteria: {
      'f31.two_episodes':
        'A lo largo de la evolución han existido al menos dos episodios afectivos claramente delimitables, separados por fases de remisión amplia',
      'f31.lifetime_elevated_episode':
        'Al menos uno de los episodios fue hipomaníaco, maníaco o mixto (una evolución exclusivamente depresiva descarta el trastorno bipolar)',
      'f31.current_hypomanic_state':
        'Actualmente ánimo ligeramente elevado con aumento del impulso durante varios días, sin deterioro funcional relevante y sin síntomas psicóticos',
      'f31.current_manic_state':
        'Actualmente manía plenamente desarrollada con ánimo elevado o irritable, aumento del impulso y deterioro funcional relevante',
      'f31.current_manic_psychotic':
        'Especificador F31.2: ideas delirantes (in)congruentes con el ánimo o alucinaciones acompañantes durante el episodio maníaco',
      'f31.current_mixed_state':
        'Actualmente presencia simultánea o de alternancia rápida de síntomas maníacos y depresivos marcados durante al menos dos semanas',
      'f31.current_depressed_state':
        'Actualmente episodio depresivo con ánimo deprimido, pérdida de interés y disminución del impulso',
      'f31.current_depressed_psychotic':
        'Especificador F31.5: ideas delirantes congruentes (sintónicas) o incongruentes (paratímicas) con el ánimo, o alucinaciones acompañantes durante el episodio depresivo',
      'f31.exclude_organic_substance':
        'Los episodios afectivos no son atribuibles a una sustancia psicótropa ni a un trastorno mental orgánico',
      'f31.exclude_schizoaffective':
        'La sintomatología no se explica mejor por un trastorno esquizoafectivo o una esquizofrenia',
      '6a60_61.manic_or_mixed_episode': 'A lo largo de la evolución hubo al menos un episodio maníaco o mixto',
      '6a60_61.hypomanic_episode':
        'A lo largo de la evolución hubo al menos un episodio hipomaníaco (menos grave, sin deterioro funcional relevante y sin síntomas psicóticos)',
      '6a60.type_i_manic_episode':
        'Un solo episodio maníaco o mixto plenamente desarrollado basta para el tipo I; no se requiere un episodio depresivo',
      '6a61.type_ii_hypomanic_episode':
        'Al menos un episodio hipomaníaco a lo largo de la evolución, pero en ningún momento un episodio maníaco o mixto plenamente desarrollado',
      '6a61.type_ii_depressive_episode':
        'Al menos un episodio depresivo a lo largo de la evolución (requerido adicionalmente para el tipo II)',
      '6a60_61.exclude_substance_organic':
        'Los episodios afectivos no son atribuibles a una sustancia psicótropa, a un medicamento ni a otra causa física u orgánica',
      '6a60_61.exclude_schizoaffective':
        'La sintomatología no se explica mejor por un trastorno esquizoafectivo o una esquizofrenia',
    },
  },
  recurrent_depressive_disorder: {
    name: 'Trastorno depresivo recurrente',
    differentials: [
      'Episodio depresivo (F32) — ante un primer episodio único',
      'Trastorno afectivo bipolar (F31) — ante episodios (hipo)maníacos en la anamnesis',
      'Distimia (F34.1) — ante una sintomatología crónica subumbral',
      'Trastorno de adaptación con reacción depresiva',
      'Trastorno afectivo orgánico o inducido por sustancias',
    ],
    groups: {
      'f33.current_episode':
        'Episodio depresivo actual (síntomas nucleares, al menos 2 de 3)',
      'f33.additional': 'Síntomas adicionales del episodio actual (al menos 2)',
      'f33.recurrence': 'Curso longitudinal: evolución recurrente',
      'f33.severity_psychotic':
        'Especificador: episodio grave actual con síntomas psicóticos (F33.3)',
      'f33.exclusions': 'Exclusiones',
      '6a71.affective_core': 'Síntoma afectivo nuclear del episodio actual (al menos uno requerido)',
      '6a71.total_symptoms':
        'Sintomatología total del episodio actual de los tres grupos (al menos 5, casi todos los días, incluido al menos un síntoma afectivo)',
      '6a71.recurrence': 'Curso longitudinal: evolución recurrente',
      '6a71.exclusions': 'Exclusiones',
    },
    criteria: {
      'f33.depressed_mood':
        'Ánimo deprimido la mayor parte del día, en gran medida con independencia de las circunstancias externas',
      'f33.anhedonia':
        'Pérdida marcada del interés o de la capacidad de disfrute en actividades habitualmente placenteras',
      'f33.reduced_energy':
        'Disminución del impulso o de la energía, o aumento de la fatigabilidad',
      'f33.concentration': 'Disminución de la concentración y de la atención',
      'f33.guilt_worthlessness':
        'Disminución de la autoestima o sentimientos inapropiados de culpa y de inutilidad',
      'f33.suicidality':
        'Pensamientos recurrentes de muerte o de suicidio, o conducta suicida',
      'f33.sleep': 'Alteración del sueño de cualquier tipo',
      'f33.appetite': 'Cambios del apetito con la consiguiente variación de peso',
      'f33.prior_episode':
        'En la anamnesis, al menos otro episodio depresivo, separado por un intervalo libre de síntomas de varios meses',
      'f33.psychotic_delusions':
        'Ideas delirantes congruentes con el ánimo (p. ej. delirio de culpa, de ruina o de condenación, delirio nihilista) durante el episodio actual',
      'f33.psychotic_hallucinations':
        'Alucinaciones (con frecuencia voces acusatorias o injuriantes) durante el episodio actual',
      'f33.exclude_mania':
        'En ningún momento de la anamnesis han aparecido episodios hipomaníacos o maníacos de intensidad suficiente para cumplir los criterios de un episodio (hipo)maníaco (lo que orientaría hacia un trastorno bipolar)',
      'f33.exclude_organic_substance':
        'Los episodios no son atribuibles a una sustancia psicótropa ni a un trastorno mental orgánico',
      '6a71.depressed_mood':
        'Ánimo deprimido la mayor parte del día y casi todos los días (grupo afectivo del episodio actual)',
      '6a71.anhedonia':
        'Disminución marcada del interés o del placer por las actividades (grupo afectivo del episodio actual)',
      '6a71.concentration':
        'Disminución de la capacidad de concentración y atención, o indecisión marcada (grupo cognitivo-conductual)',
      '6a71.worthlessness':
        'Sentimientos de inutilidad o culpa excesiva e inapropiada (grupo cognitivo-conductual)',
      '6a71.hopelessness': 'Desesperanza respecto al futuro (grupo cognitivo-conductual)',
      '6a71.suicidality':
        'Pensamientos recurrentes de muerte o de suicidio, o conducta suicida o autolesiva (grupo cognitivo-conductual)',
      '6a71.sleep':
        'Alteración del sueño (dificultad para conciliar o mantener el sueño, despertar precoz o aumento de la necesidad de sueño), casi todos los días (grupo neurovegetativo)',
      '6a71.appetite':
        'Cambio marcado del apetito o del peso (disminución o aumento) (grupo neurovegetativo)',
      '6a71.fatigue':
        'Disminución de la energía, fatigabilidad marcada o agotamiento ya tras un esfuerzo mínimo (grupo neurovegetativo)',
      '6a71.psychomotor':
        'Agitación o inhibición psicomotriz, referida subjetivamente u observable (grupo neurovegetativo)',
      '6a71.recurrent_episodes':
        'A lo largo de la evolución han existido al menos dos episodios depresivos, separados por un intervalo en gran medida libre de síntomas de varios meses sin perturbación anímica relevante',
      '6a71.exclude_mania':
        'En ningún momento de la biografía han aparecido episodios maníacos, mixtos o hipomaníacos (su presencia orientaría hacia un trastorno bipolar)',
      '6a71.exclude_substance_organic':
        'Los episodios no son atribuibles a una sustancia psicótropa, a un medicamento ni a otra causa física u orgánica',
    },
  },
  cyclothymia: {
    name: 'Ciclotimia',
    differentials: [
      'Trastorno afectivo bipolar (F31) — ante episodios afectivos plenamente desarrollados',
      'Distimia (F34.1) — ante un ánimo crónico puramente depresivo',
      'Trastorno de la personalidad emocionalmente inestable',
      'Oscilaciones del ánimo inducidas por sustancias',
    ],
    groups: {
      'f34_0.core': 'Núcleo: inestabilidad crónica del ánimo',
      'f34_0.exclusions': 'Exclusiones',
      '6a62.core': 'Núcleo: inestabilidad persistente del ánimo con numerosos períodos hipomaníacos y depresivos',
      '6a62.exclusions': 'Exclusiones',
    },
    criteria: {
      'f34_0.mood_instability':
        'Inestabilidad persistente del ánimo con numerosas fases de ánimo ligeramente elevado y ligeramente deprimido, ninguna de las cuales alcanza la gravedad de un episodio (hipo)maníaco o depresivo',
      'f34_0.duration_two_years':
        'Las oscilaciones del ánimo persisten durante un período de al menos dos años (con inicio en la edad adulta)',
      'f34_0.exclude_full_episodes':
        'Las oscilaciones del ánimo no cumplen en ningún momento los criterios completos de un episodio maníaco, hipomaníaco o depresivo (de lo contrario, trastorno bipolar o depresivo recurrente)',
      'f34_0.exclude_organic_substance':
        'La inestabilidad del ánimo no es atribuible a una sustancia psicótropa ni a un trastorno mental orgánico',
      '6a62.mood_instability':
        'Inestabilidad persistente del ánimo con numerosos períodos diferenciables de síntomas hipomaníacos y depresivos, cada uno de los cuales permanece subumbral (ningún episodio plenamente desarrollado)',
      '6a62.duration_two_years':
        'La inestabilidad del ánimo persiste durante un período de al menos dos años y durante más de la mitad del tiempo',
      '6a62.exclude_full_episodes':
        'Las oscilaciones del ánimo no cumplen en ningún momento los criterios completos de un episodio maníaco, mixto, hipomaníaco o depresivo (de lo contrario, trastorno bipolar o depresivo)',
      '6a62.exclude_substance_organic':
        'La inestabilidad del ánimo no es atribuible a una sustancia psicótropa, a un medicamento ni a otra causa física u orgánica',
    },
  },
  dysthymia: {
    name: 'Distimia',
    differentials: [
      'Trastorno depresivo recurrente (F33) — ante episodios plenamente desarrollados',
      'Episodio depresivo (F32)',
      'Ciclotimia (F34.0) — ante una oscilación bipolar',
      'Trastorno de adaptación',
      'Trastorno afectivo orgánico o inducido por sustancias',
    ],
    groups: {
      'f34_1.core': 'Núcleo: ánimo crónicamente deprimido',
      'f34_1.additional': 'Síntomas acompañantes del ánimo decaído (al menos 2)',
      'f34_1.exclusions': 'Exclusiones',
      '6a72.core': 'Núcleo: ánimo crónicamente deprimido durante al menos dos años',
      '6a72.additional': 'Síntomas acompañantes del ánimo decaído (al menos 2)',
      '6a72.exclusions': 'Exclusiones',
    },
    criteria: {
      'f34_1.chronic_low_mood':
        'Ánimo deprimido persistente o recurrente de forma constante durante al menos dos años, en el que los intervalos libres de síntomas duran solo unas pocas semanas y no aparecen fases hipomaníacas',
      'f34_1.duration_two_years':
        'El ánimo decaído persiste durante un período de al menos dos años',
      'f34_1.reduced_energy': 'Disminución del impulso o de la actividad',
      'f34_1.sleep': 'Alteraciones del sueño',
      'f34_1.low_self_esteem':
        'Disminución de la autoconfianza o sentimientos de insuficiencia',
      'f34_1.concentration': 'Dificultades de concentración',
      'f34_1.hopelessness':
        'Rumiación frecuente, pesimismo o sentimiento de desesperanza',
      'f34_1.social_withdrawal': 'Retraimiento social o disminución de la locuacidad',
      'f34_1.exclude_recurrent_depression':
        'La gravedad y la duración de las distintas fases no cumplen los criterios de un trastorno depresivo recurrente (ni siquiera leve)',
      'f34_1.exclude_mania':
        'Sin fases hipomaníacas en la anamnesis (lo que orientaría hacia una ciclotimia o un trastorno bipolar)',
      'f34_1.exclude_organic_substance':
        'El ánimo decaído no es atribuible a una sustancia psicótropa ni a un trastorno mental orgánico',
      '6a72.chronic_low_mood':
        'Ánimo deprimido persistente la mayor parte del día y más días de los que no, sin un intervalo libre de síntomas de más de unos dos meses',
      '6a72.duration_two_years':
        'El ánimo decaído persiste durante un período de al menos dos años',
      '6a72.reduced_energy': 'Disminución del impulso o de la actividad',
      '6a72.sleep': 'Alteraciones del sueño',
      '6a72.appetite': 'Cambio del apetito (disminución o aumento)',
      '6a72.low_self_esteem': 'Disminución de la autoconfianza o sentimientos de insuficiencia',
      '6a72.concentration': 'Dificultades de concentración o indecisión',
      '6a72.hopelessness': 'Rumiación frecuente, pesimismo o sentimiento de desesperanza',
      '6a72.exclude_depressive_episode':
        'La sintomatología no cumple los criterios completos de un episodio depresivo durante la mayor parte de los dos primeros años (de lo contrario, trastorno depresivo recurrente)',
      '6a72.exclude_mania':
        'Sin episodios hipomaníacos, maníacos o mixtos en la anamnesis (lo que orientaría hacia una ciclotimia o un trastorno bipolar)',
      '6a72.exclude_substance_organic':
        'El ánimo decaído no es atribuible a una sustancia psicótropa, a un medicamento ni a otra causa física u orgánica',
    },
  },
  mixed_affective_episode: {
    name: 'Episodio afectivo mixto',
    differentials: [
      'Trastorno afectivo bipolar, episodio actual mixto (F31.6) — ante un curso longitudinal bipolar conocido',
      'Episodio maníaco con ánimo irritable-disfórico (F30)',
      'Episodio depresivo agitado (F32)',
      'Trastorno afectivo inducido por sustancias u orgánico',
    ],
    groups: {
      'f38_0.core': 'Núcleo: sintomatología afectiva mixta',
      'f38_0.exclusions': 'Exclusiones',
      '6a60_3.core': 'Núcleo: síntomas maníacos Y depresivos prominentes dentro del mismo episodio',
      '6a60_3.exclusions': 'Exclusiones',
    },
    criteria: {
      'f38_0.mixed_symptoms':
        'Presencia simultánea o de alternancia rápida (en pocas horas) de síntomas maníacos y depresivos marcados durante al menos dos semanas',
      'f38_0.duration_two_weeks':
        'La sintomatología mixta persiste durante un período de al menos dos semanas',
      'f38_0.exclude_organic_substance':
        'El episodio no es atribuible a una sustancia psicótropa ni a un trastorno mental orgánico',
      '6a60_3.mixed_symptoms':
        'Varios síntomas maníacos prominentes y varios síntomas depresivos prominentes están presentes de forma simultánea o en alternancia rápida la mayoría de los días',
      '6a60_3.duration_two_weeks':
        'La sintomatología mixta está presente la mayoría de los días durante un período de al menos dos semanas',
      '6a60_3.exclude_substance_organic':
        'El episodio no es atribuible a una sustancia psicótropa, a un medicamento ni a otra causa física u orgánica',
    },
  },
  other_persistent_mood_disorder: {
    name: 'Otros trastornos afectivos persistentes',
    differentials: [
      'Ciclotimia (F34.0)',
      'Distimia (F34.1)',
      'Trastorno depresivo recurrente (F33)',
      'Trastorno afectivo orgánico o inducido por sustancias',
    ],
    groups: {
      'f34_8.core':
        'Sintomatología afectiva persistente fuera de las categorías definidas',
      'f34_8.exclusions': 'Exclusiones',
    },
    criteria: {
      'f34_8.persistent_affective':
        'Sintomatología afectiva crónica persistente que no es lo bastante grave ni prolongada para cumplir los criterios de una ciclotimia o una distimia, pero que sigue siendo clínicamente significativa',
      'f34_8.not_otherwise_classifiable':
        'El cuadro clínico no se asigna con claridad a ningún trastorno afectivo persistente más específico (ciclotimia, distimia) (categoría residual denominada)',
      'f34_8.exclude_organic_substance':
        'La sintomatología no es atribuible a una sustancia psicótropa ni a un trastorno mental orgánico',
    },
  },
  other_mood_disorder: {
    name: 'Otros trastornos afectivos',
    differentials: [
      'Episodio maníaco (F30) o episodio depresivo (F32) cuando se cumplen plenamente los criterios',
      'Trastorno afectivo bipolar (F31) o trastorno depresivo recurrente (F33)',
      'Episodio afectivo mixto (F38.00)',
      'Trastorno afectivo orgánico o inducido por sustancias',
    ],
    groups: {
      'f38_8.core':
        'Trastorno afectivo especificado fuera de las demás categorías',
      'f38_8.exclusions': 'Exclusiones',
    },
    criteria: {
      'f38_8.affective_symptoms':
        'Sintomatología afectiva clínicamente significativa (p. ej. episodios depresivos breves recurrentes) que puede denominarse, pero que no cumple los criterios de las demás categorías afectivas',
      'f38_8.not_classifiable_elsewhere':
        'La sintomatología no cumple los criterios completos de un trastorno afectivo maníaco, depresivo, bipolar, depresivo recurrente o afectivo persistente (categoría residual denominada)',
      'f38_8.exclude_organic_substance':
        'La sintomatología no es atribuible a una sustancia psicótropa ni a un trastorno mental orgánico',
    },
  },
  unspecified_mood_disorder: {
    name: 'Trastorno afectivo sin especificación',
    differentials: [
      'Otros trastornos afectivos (F38) ante un cuadro especificado',
      'Episodio maníaco (F30) o depresivo (F32) cuando se cumplen plenamente los criterios',
      'Trastorno afectivo bipolar (F31) o trastorno depresivo recurrente (F33)',
      'Trastorno afectivo orgánico o inducido por sustancias',
    ],
    groups: {
      'f39.core':
        'Sintomatología afectiva sin información suficiente para una asignación más específica',
      'f39.exclusions': 'Exclusiones',
    },
    criteria: {
      'f39.affective_symptoms':
        'Existe una sintomatología afectiva clínicamente significativa, pero no puede asignarse a ninguna categoría afectiva específica por falta de información suficiente',
      'f39.insufficient_information':
        'Los datos disponibles no bastan para un diagnóstico afectivo más específico o son contradictorios (categoría provisional o de recurso)',
      'f39.exclude_organic_substance':
        'La sintomatología afectiva no es atribuible a una sustancia psicótropa ni a un trastorno mental orgánico',
    },
  },
}
