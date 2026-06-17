import type { DisorderTranslationMap } from '../types'

/** EN translations — ICD-10 F3 block. */
export const enF3: DisorderTranslationMap = {
  depressive_episode: {
    name: 'Depressive episode',
    differentials: [
      'Adjustment disorder',
      'Bipolar depression (check for any prior manic/hypomanic phases)',
      'Dysthymia / persistent depressive disorder',
      'Organic or substance-induced affective disorder',
    ],
    groups: {
      'f32.core': 'Core symptoms (at least 2 of 3)',
      'f32.additional': 'Additional symptoms (at least 2)',
      'f32.exclusions': 'Exclusions',
    },
    criteria: {
      'f32.depressed_mood':
        'Depressed, low mood present on almost every day and for most of the day, largely independent of external circumstances',
      'f32.anhedonia':
        'Marked loss of interest or pleasure in activities that are normally enjoyable',
      'f32.reduced_energy':
        'Reduced energy or drive, or increased fatigability, even after slight exertion',
      'f32.concentration':
        'Reduced ability to think, concentrate or make decisions',
      'f32.guilt_worthlessness':
        'Reduced self-esteem or self-confidence, or inappropriate feelings of guilt and worthlessness',
      'f32.hopelessness': 'Pessimistic, hopeless view of the future',
      'f32.sleep': 'Sleep disturbance of any kind',
      'f32.appetite':
        'Change in appetite (decrease or increase) with corresponding change in weight',
      'f32.psychomotor':
        'Change in psychomotor activity with agitation or retardation (subjective or observable)',
      'f32.suicidality':
        'Recurrent thoughts of death or suicide, or suicidal or self-harming behaviour',
      'f32.exclude_mania':
        'At no point in the life history have hypomanic or manic symptoms been present to a degree meeting the criteria for a hypomanic/manic episode (which would indicate a bipolar disorder)',
      'f32.exclude_organic_substance':
        'The episode is not attributable to a psychoactive substance or an organic mental disorder',
    },
  },
  manic_episode: {
    name: 'Manic episode (including hypomania and mania with psychotic symptoms)',
    differentials: [
      'Bipolar affective disorder (F31) — where at least two affective episodes occur over the course',
      'Schizoaffective disorder, manic type (F25.0)',
      'Substance-induced (e.g. stimulants, steroids) or organic manic disorder',
      'Attention-deficit/hyperactivity disorder in adulthood',
      'Agitated form of a mixed affective episode',
    ],
    groups: {
      'f30.mood_core': 'Leading mood symptom (elevated or irritable)',
      'f30.symptoms':
        'Accompanying symptoms of mania (at least 3; at least 4 where the mood is only irritable)',
      'f30.duration':
        'Duration criterion (mania at least 1 week; hypomania at least a few days)',
      'f30.severity_hypomania': 'Severity specifier: hypomania (F30.0)',
      'f30.severity_mania':
        'Severity specifier: mania without psychotic symptoms (F30.1)',
      'f30.severity_psychotic':
        'Severity specifier: mania with psychotic symptoms (F30.2)',
      'f30.exclusions': 'Exclusions',
    },
    criteria: {
      'f30.elevated_mood':
        'Markedly elevated, expansive or euphoric mood that is inappropriate to the person’s circumstances',
      'f30.irritable_mood': 'Markedly irritable or dysphoric-expansive mood state',
      'f30.increased_activity':
        'Increased activity, motor restlessness or heightened drive',
      'f30.talkativeness':
        'Increased pressure of speech or excessive talkativeness (logorrhoea)',
      'f30.distractibility':
        'Heightened distractibility or constant change of activities and plans',
      'f30.reduced_sleep_need':
        'Decreased need for sleep while daytime activity nonetheless remains intact or is increased',
      'f30.grandiosity':
        'Inflated self-esteem or grandiose ideas, extending to overestimation of one’s abilities',
      'f30.reckless_behavior':
        'Over-familiar, disinhibited or reckless behaviour with failure to recognise possible consequences (e.g. ill-considered spending, risky ventures)',
      'f30.increased_sociability_libido':
        'Increased sociability, overactivity or heightened sexual drive',
      'f30.duration_one_week':
        'The symptoms persist for at least one week (or a shorter period if inpatient treatment is required); for hypomania several consecutive days suffice',
      'f30.hypomania_mild':
        'Mildly to moderately elevated mood with increased drive over several days, without substantial impairment of occupational functioning or social rejection and without psychotic symptoms',
      'f30.mania_marked_impairment':
        'Fully developed mania with substantial impairment of daily functioning, but without delusions or hallucinations',
      'f30.psychotic_delusions':
        'Mood-congruent grandiose or (more rarely) mood-incongruent delusional ideas',
      'f30.psychotic_hallucinations':
        'Hallucinations occurring in the context of the manic episode',
      'f30.exclude_organic_substance':
        'The episode is not attributable to a psychoactive substance (e.g. stimulants, corticosteroids) or an organic mental disorder',
      'f30.exclude_schizoaffective':
        'There is no concurrently dominant schizophrenic symptomatology suggesting a schizoaffective disorder',
    },
  },
  bipolar_affective_disorder: {
    name: 'Bipolar affective disorder',
    differentials: [
      'Recurrent depressive disorder (F33) — where there are exclusively depressive episodes without (hypo)manic phases',
      'Schizoaffective disorder (F25)',
      'Cyclothymia (F34.0) — where there is subthreshold, chronic fluctuation',
      'Emotionally unstable personality disorder (borderline type)',
      'Substance-induced or organic affective disorder',
    ],
    groups: {
      'f31.recurrence': 'Longitudinal course: repeated affective episodes',
      'f31.current_hypomanic':
        'Specifier: current hypomanic episode (F31.0)',
      'f31.current_manic':
        'Specifier: current manic episode (F31.1 without / F31.2 with psychotic symptoms)',
      'f31.current_mixed': 'Specifier: current mixed episode (F31.6)',
      'f31.current_depressed':
        'Specifier: current depressive episode (F31.3 mild/moderate · F31.4 severe · F31.5 with psychotic symptoms)',
      'f31.exclusions': 'Exclusions',
    },
    criteria: {
      'f31.two_episodes':
        'Over the course there have been at least two clearly distinguishable affective episodes, separated by phases of substantial remission',
      'f31.lifetime_elevated_episode':
        'At least one of the episodes was hypomanic, manic or mixed (an exclusively depressive course rules out bipolar disorder)',
      'f31.current_hypomanic_state':
        'Currently mildly elevated mood with increased drive over several days, without substantial functional impairment and without psychotic symptoms',
      'f31.current_manic_state':
        'Currently fully developed mania with elevated or irritable mood, increased drive and substantial functional impairment',
      'f31.current_manic_psychotic':
        'Specifier F31.2: accompanying mood-(in)congruent delusional ideas or hallucinations during the manic episode',
      'f31.current_mixed_state':
        'Currently simultaneous or rapidly alternating presence of marked manic and depressive symptoms over at least two weeks',
      'f31.current_depressed_state':
        'Currently a depressive episode with depressed mood, loss of interest and reduced drive',
      'f31.current_depressed_psychotic':
        'Specifier F31.5: accompanying mood-congruent or mood-incongruent delusional ideas or hallucinations during the depressive episode',
      'f31.exclude_organic_substance':
        'The affective episodes are not attributable to a psychoactive substance or an organic mental disorder',
      'f31.exclude_schizoaffective':
        'The symptomatology is not better explained by a schizoaffective disorder or schizophrenia',
    },
  },
  recurrent_depressive_disorder: {
    name: 'Recurrent depressive disorder',
    differentials: [
      'Depressive episode (F32) — where there is a first, single episode',
      'Bipolar affective disorder (F31) — where there are (hypo)manic episodes in the history',
      'Dysthymia (F34.1) — where there is chronic subthreshold symptomatology',
      'Adjustment disorder with depressive reaction',
      'Organic or substance-induced affective disorder',
    ],
    groups: {
      'f33.current_episode':
        'Current depressive episode (core symptoms, at least 2 of 3)',
      'f33.additional': 'Additional symptoms of the current episode (at least 2)',
      'f33.recurrence': 'Longitudinal course: recurrent course',
      'f33.severity_psychotic':
        'Specifier: current severe episode with psychotic symptoms (F33.3)',
      'f33.exclusions': 'Exclusions',
    },
    criteria: {
      'f33.depressed_mood':
        'Depressed mood for most of the day, largely independent of external circumstances',
      'f33.anhedonia':
        'Marked loss of interest or pleasure in activities that are normally enjoyable',
      'f33.reduced_energy':
        'Reduced drive or energy, or increased fatigability',
      'f33.concentration': 'Reduced concentration and attention',
      'f33.guilt_worthlessness':
        'Reduced self-esteem or inappropriate feelings of guilt and worthlessness',
      'f33.suicidality':
        'Recurrent thoughts of death or suicide, or suicidal behaviour',
      'f33.sleep': 'Sleep disturbance of any kind',
      'f33.appetite': 'Change in appetite with corresponding change in weight',
      'f33.prior_episode':
        'In the history at least one further depressive episode, separated by a symptom-free interval of several months',
      'f33.psychotic_delusions':
        'Mood-congruent delusional ideas (e.g. delusions of guilt, impoverishment or sin, nihilistic delusions) during the current episode',
      'f33.psychotic_hallucinations':
        'Hallucinations (often accusatory or abusive voices) during the current episode',
      'f33.exclude_mania':
        'At no point in the history have hypomanic or manic episodes occurred to a degree meeting the criteria for a (hypo)manic episode (which would indicate a bipolar disorder)',
      'f33.exclude_organic_substance':
        'The episodes are not attributable to a psychoactive substance or an organic mental disorder',
    },
  },
  cyclothymia: {
    name: 'Cyclothymia',
    differentials: [
      'Bipolar affective disorder (F31) — where there are fully developed affective episodes',
      'Dysthymia (F34.1) — where there is purely depressive chronic low mood',
      'Emotionally unstable personality disorder',
      'Substance-induced mood fluctuations',
    ],
    groups: {
      'f34_0.core': 'Core: chronic mood instability',
      'f34_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f34_0.mood_instability':
        'Persistent instability of mood with numerous phases of mildly elevated and mildly depressed mood, none of which reaches the severity of a (hypo)manic or depressive episode',
      'f34_0.duration_two_years':
        'The mood fluctuations persist over a period of at least two years (with onset in adulthood)',
      'f34_0.exclude_full_episodes':
        'At no point do the mood swings meet the full criteria for a manic, hypomanic or depressive episode (otherwise bipolar or recurrent depressive disorder)',
      'f34_0.exclude_organic_substance':
        'The mood instability is not attributable to a psychoactive substance or an organic mental disorder',
    },
  },
  dysthymia: {
    name: 'Dysthymia',
    differentials: [
      'Recurrent depressive disorder (F33) — where there are fully developed episodes',
      'Depressive episode (F32)',
      'Cyclothymia (F34.0) — where there is bipolar fluctuation',
      'Adjustment disorder',
      'Organic or substance-induced affective disorder',
    ],
    groups: {
      'f34_1.core': 'Core: chronically depressed mood',
      'f34_1.additional': 'Accompanying symptoms of the low mood (at least 2)',
      'f34_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f34_1.chronic_low_mood':
        'Depressed mood persisting or constantly recurring over at least two years, with symptom-free intervals lasting only a few weeks and no hypomanic phases',
      'f34_1.duration_two_years':
        'The depressive low mood persists over a period of at least two years',
      'f34_1.reduced_energy': 'Reduced drive or reduced activity',
      'f34_1.sleep': 'Sleep disturbances',
      'f34_1.low_self_esteem':
        'Reduced self-confidence or feelings of inadequacy',
      'f34_1.concentration': 'Difficulty concentrating',
      'f34_1.hopelessness':
        'Frequent rumination, pessimism or a feeling of hopelessness',
      'f34_1.social_withdrawal': 'Social withdrawal or reduced talkativeness',
      'f34_1.exclude_recurrent_depression':
        'The severity and duration of the individual phases do not meet the criteria for a (even mild) recurrent depressive disorder',
      'f34_1.exclude_mania':
        'No hypomanic phases in the history (which would indicate cyclothymia or a bipolar disorder)',
      'f34_1.exclude_organic_substance':
        'The low mood is not attributable to a psychoactive substance or an organic mental disorder',
    },
  },
  mixed_affective_episode: {
    name: 'Mixed affective episode',
    differentials: [
      'Bipolar affective disorder, currently a mixed episode (F31.6) — where a bipolar longitudinal course is known',
      'Manic episode with irritable-dysphoric mood (F30)',
      'Agitated depressive episode (F32)',
      'Substance-induced or organic affective disorder',
    ],
    groups: {
      'f38_0.core': 'Core: mixed affective symptomatology',
      'f38_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f38_0.mixed_symptoms':
        'Simultaneous presence, or rapid alternation within a few hours, of marked manic and depressive symptoms over at least two weeks',
      'f38_0.duration_two_weeks':
        'The mixed symptomatology persists over a period of at least two weeks',
      'f38_0.exclude_organic_substance':
        'The episode is not attributable to a psychoactive substance or an organic mental disorder',
    },
  },
  other_persistent_mood_disorder: {
    name: 'Other persistent affective disorder',
    differentials: [
      'Cyclothymia (F34.0)',
      'Dysthymia (F34.1)',
      'Recurrent depressive disorder (F33)',
      'Organic or substance-induced affective disorder',
    ],
    groups: {
      'f34_8.core':
        'Persistent affective symptomatology outside the defined categories',
      'f34_8.exclusions': 'Exclusions',
    },
    criteria: {
      'f34_8.persistent_affective':
        'Chronically persistent affective symptomatology that is not severe or long-lasting enough to meet the criteria for cyclothymia or dysthymia, but remains clinically significant',
      'f34_8.not_otherwise_classifiable':
        'The clinical picture cannot be clearly assigned to any more specific persistent affective disorder (cyclothymia, dysthymia) (named residual category)',
      'f34_8.exclude_organic_substance':
        'The symptomatology is not attributable to a psychoactive substance or an organic mental disorder',
    },
  },
  other_mood_disorder: {
    name: 'Other affective disorder',
    differentials: [
      'Manic episode (F30) or depressive episode (F32) where the criteria are fully met',
      'Bipolar affective disorder (F31) or recurrent depressive disorder (F33)',
      'Mixed affective episode (F38.00)',
      'Organic or substance-induced affective disorder',
    ],
    groups: {
      'f38_8.core':
        'Specified affective disorder outside the remaining categories',
      'f38_8.exclusions': 'Exclusions',
    },
    criteria: {
      'f38_8.affective_symptoms':
        'Clinically significant affective symptomatology (e.g. recurrent brief depressive episodes) that can be named but does not meet the criteria of the remaining affective categories',
      'f38_8.not_classifiable_elsewhere':
        'The symptomatology does not meet the full criteria for a manic, depressive, bipolar, recurrent depressive or persistent affective disorder (named residual category)',
      'f38_8.exclude_organic_substance':
        'The symptomatology is not attributable to a psychoactive substance or an organic mental disorder',
    },
  },
  unspecified_mood_disorder: {
    name: 'Unspecified affective disorder',
    differentials: [
      'Other affective disorder (F38) where the picture is specified',
      'Manic episode (F30) or depressive episode (F32) where the criteria are fully met',
      'Bipolar affective disorder (F31) or recurrent depressive disorder (F33)',
      'Organic or substance-induced affective disorder',
    ],
    groups: {
      'f39.core':
        'Affective symptomatology with insufficient information for a more specific assignment',
      'f39.exclusions': 'Exclusions',
    },
    criteria: {
      'f39.affective_symptoms':
        'Clinically significant affective symptomatology is present but, owing to insufficient information, cannot be assigned to any specific affective category',
      'f39.insufficient_information':
        'The available information is insufficient or contradictory for a more specific affective diagnosis (provisional or default category)',
      'f39.exclude_organic_substance':
        'The affective symptomatology is not attributable to a psychoactive substance or an organic mental disorder',
    },
  },
}
