import type { DisorderTranslationMap } from '../types'

/** EN translations — ICD-10 F0 block. */
export const enF0: DisorderTranslationMap = {
  dementia_alzheimer: {
    name: 'Dementia in Alzheimer’s disease',
    differentials: [
      'Vascular dementia (stepwise course, focal neurological signs)',
      'Depressive pseudodementia',
      'Delirium (acute onset, fluctuating level of consciousness)',
      'Frontotemporal dementia or dementia with Lewy bodies',
      'Normal age-related cognitive change',
    ],
    groups: {
      'f00.cognition': 'Core cognitive symptoms',
      'f00.course': 'Course and impairment',
      'f00.exclusions': 'Exclusions',
    },
    criteria: {
      'f00.memory_impairment':
        'Decline in memory, most evident in the learning of new information, to a degree that exceeds normal forgetfulness',
      'f00.cognitive_decline':
        'Decline in other higher cognitive functions (e.g. judgement, thinking, planning, language) relative to the previous level of performance',
      'f00.duration_six_months': 'The symptoms have been present for at least approximately six months',
      'f00.insidious_onset':
        'Insidious onset with slow, continuous deterioration without abrupt episodes of worsening',
      'f00.functional_impact':
        'Impairment in coping with activities of daily living as a result of the cognitive decline',
      'f00.exclude_clouding':
        'No clouding of consciousness that would suggest a delirium (consciousness is clear)',
      'f00.exclude_other_cause':
        'No evidence of another systemic or brain disease, or of cerebrovascular damage, that would better explain the picture',
    },
  },
  vascular_dementia: {
    name: 'Vascular dementia',
    differentials: [
      'Dementia in Alzheimer’s disease (insidious, continuous)',
      'Mixed (vascular and Alzheimer) dementia',
      'Delirium',
      'Depression with cognitive deficits',
    ],
    groups: {
      'f01.cognition': 'Cognitive decline syndrome',
      'f01.vascular': 'Evidence of a cerebrovascular origin',
      'f01.course': 'Duration',
      'f01.exclusions': 'Exclusions',
    },
    criteria: {
      'f01.memory_impairment':
        'Decline in memory and other cognitive functions that impairs coping with everyday life',
      'f01.uneven_deficits':
        'An uneven (“patchy”) pattern of deficits, in which some cognitive functions are affected while others are relatively preserved',
      'f01.stepwise_course':
        'Stepwise deterioration, often temporally related to cerebrovascular events',
      'f01.focal_signs':
        'Focal neurological signs, or history/imaging evidence of cerebrovascular disease presumed to be causative',
      'f01.duration_six_months': 'The symptoms have been present for at least approximately six months',
      'f01.exclude_clouding': 'No clouding of consciousness suggestive of a delirium',
    },
  },
  frontotemporal_dementia: {
    name: 'Frontotemporal dementia',
    differentials: [
      'Dementia in Alzheimer’s disease (early memory impairment predominates)',
      'Primary psychiatric disorder (e.g. late-onset mania, depression)',
      'Organic personality disorder without progressive cognitive decline',
    ],
    groups: {
      'f02_0.behavior': 'Early-leading behavioural/language symptoms',
      'f02_0.course': 'Course',
      'f02_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f02_0.personality_change':
        'Early, marked change in personality and social conduct, with disinhibition, loss of social graces, apathy or reduced drive',
      'f02_0.language_decline':
        'Early decline in expressive language ability (word-finding difficulty or impoverished speech), with memory initially relatively preserved',
      'f02_0.insidious_onset':
        'Insidious onset and slowly progressive course for at least approximately six months',
      'f02_0.relative_memory_sparing':
        'Memory and spatial orientation are relatively better preserved in the early stage than the behavioural or language disturbance',
      'f02_0.exclude_other_cause':
        'The picture is not better explained by another brain disease, a delirium or a primary affective disorder',
    },
  },
  dementia_lewy_bodies: {
    name: 'Dementia with Lewy bodies',
    differentials: [
      'Dementia in Alzheimer’s disease',
      'Parkinson’s disease dementia',
      'Delirium (acute, fluctuating) — may resemble Lewy body dementia',
      'Substance-/medication-induced hallucinations',
    ],
    groups: {
      'f02_8.core': 'Dementia with characteristic core features',
      'f02_8.features': 'Characteristic features (at least 2)',
      'f02_8.exclusions': 'Exclusions',
    },
    criteria: {
      'f02_8.progressive_decline':
        'Progressive cognitive decline that impairs coping with everyday life',
      'f02_8.fluctuating_cognition':
        'Marked fluctuations in cognitive performance, particularly in attention and alertness',
      'f02_8.visual_hallucinations':
        'Recurrent visual hallucinations, usually detailed and concrete',
      'f02_8.parkinsonism':
        'Spontaneously occurring parkinsonian symptoms (e.g. rigidity, bradykinesia, resting tremor)',
      'f02_8.rem_sleep_neuroleptic':
        'Supportive features such as REM sleep behaviour disorder or marked hypersensitivity to neuroleptics',
      'f02_8.exclude_delirium_substance':
        'The symptoms are not better explained by a delirium or by the effects of substances/medication',
    },
  },
  delirium_not_substance_induced: {
    name: 'Delirium, not induced by substances',
    differentials: [
      'Dementia (insidious onset, clear consciousness)',
      'Substance-induced delirium (intoxication/withdrawal, F1x.4)',
      'Acute psychotic disorder',
      'Non-convulsive status epilepticus',
    ],
    groups: {
      'f05.consciousness': 'Disturbance of consciousness and attention',
      'f05.global': 'Global cognitive disturbance (at least 1)',
      'f05.course': 'Acute, fluctuating course',
      'f05.exclusions': 'Exclusions',
    },
    criteria: {
      'f05.clouded_consciousness':
        'Disturbance of consciousness and alertness with reduced clarity of awareness of the environment',
      'f05.attention_disturbance':
        'Reduced ability to direct, sustain and shift attention',
      'f05.disorientation':
        'Disturbance of memory and orientation (in time, place or person)',
      'f05.perceptual_disturbance':
        'Perceptual disturbances such as misidentifications, illusions or (usually visual) hallucinations',
      'f05.psychomotor_disturbance':
        'Psychomotor disturbance with rapid shifts between hyperactivity and hypoactivity',
      'f05.sleep_wake_disturbance':
        'Disturbance of the sleep–wake cycle (e.g. insomnia, nocturnal worsening, reversal of the cycle)',
      'f05.acute_fluctuating':
        'Rapid onset (hours to days) and fluctuation of the symptoms in severity over the course of the day',
      'f05.exclude_substance':
        'The delirium is not caused by alcohol or other psychoactive substances (otherwise F1x.4), but is attributable to a physical illness or cerebral cause',
    },
  },
  organic_amnestic_syndrome: {
    name: 'Organic amnestic syndrome',
    differentials: [
      'Dementia (additionally broader cognitive decline)',
      'Delirium (disturbance of consciousness and attention)',
      'Alcohol-related amnestic syndrome / Korsakoff syndrome (F10.6)',
      'Dissociative amnesia',
    ],
    groups: {
      'f04.memory': 'Memory impairment to the fore',
      'f04.aetiology': 'Organic basis',
      'f04.exclusions': 'Exclusions',
    },
    criteria: {
      'f04.anterograde_retrograde':
        'Marked impairment of short-term/recent memory (anterograde amnesia) and frequently also of recall of more remote material (retrograde amnesia)',
      'f04.immediate_recall_preserved':
        'Immediate recall (e.g. digit span) and consciousness are preserved',
      'f04.organic_cause':
        'Evidence of, or a reasonable presumption of, a brain-damaging disease or dysfunction (not due to alcohol/substances) as the cause',
      'f04.exclude_global_decline':
        'No general decline in intellectual performance as would be typical of a dementia, and no attentional disturbance suggestive of a delirium',
      'f04.exclude_substance':
        'The disturbance is not caused by alcohol or other psychoactive substances',
    },
  },
  mild_cognitive_disorder: {
    name: 'Mild cognitive disorder',
    differentials: [
      'Dementia (impairment of independent coping with everyday life)',
      'Delirium',
      'Depression with subjective concentration difficulties',
      'Normal age-related cognitive change',
    ],
    groups: {
      'f06_7.cognition': 'Mild decline in cognitive performance',
      'f06_7.exclusions': 'Exclusions',
    },
    criteria: {
      'f06_7.cognitive_decline':
        'Decline in cognitive performance (e.g. memory, concentration, learning) relative to the previous level, subjectively reported and objectively demonstrable',
      'f06_7.organic_context':
        'The cognitive difficulties arise in association with a physical or cerebral illness',
      'f06_7.exclude_dementia':
        'The degree does not justify a diagnosis of dementia, delirium or amnestic syndrome; independent coping with everyday life is essentially preserved',
    },
  },
  organic_personality_disorder: {
    name: 'Organic personality disorder',
    differentials: [
      'Frontotemporal dementia (progressive cognitive decline)',
      'Primary personality disorder (lifelong, without an organic cause)',
      'Affective disorder or mania',
      'Substance-induced personality change',
    ],
    groups: {
      'f07_0.change': 'Persistent personality change',
      'f07_0.features': 'Characteristic changes (at least 2)',
      'f07_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f07_0.personality_change':
        'Persistent change in the previous pattern of personality and behaviour following a brain disease or injury',
      'f07_0.organic_cause':
        'Evidence of, or a reasonable presumption of, a causative brain disease, injury or dysfunction',
      'f07_0.affective_change':
        'Altered emotional life with emotional lability, euphoria or apathy',
      'f07_0.disinhibition':
        'Reduced impulse control with disinhibition, irritability or outbursts of aggression',
      'f07_0.goal_directed':
        'Impairment of goal-directed activities with reduced perseverance and a disturbance of drive',
      'f07_0.social_conduct':
        'Altered social conduct with neglect of social norms (e.g. tactlessness, sexually inappropriate familiarity)',
      'f07_0.exclude_dementia_delirium':
        'The change is not better explained by a dementia, a delirium or another mental disorder; a substantial cognitive impairment is not to the fore',
    },
  },
  organic_hallucinosis: {
    name: 'Organic hallucinosis',
    differentials: [
      'Schizophrenia or delusional disorder',
      'Substance-induced hallucinosis / withdrawal hallucinosis',
      'Delirium (clouding of consciousness)',
      'Sensory deprivation (e.g. Charles Bonnet syndrome)',
    ],
    groups: {
      'f06_0.core': 'Persistent hallucinations with clear consciousness',
      'f06_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f06_0.persistent_hallucinations':
        'Persistent or recurrent hallucinations (usually visual or auditory) that dominate the picture',
      'f06_0.clear_consciousness':
        'The hallucinations occur with clear consciousness and preserved orientation',
      'f06_0.organic_cause':
        'Evidence of, or a reasonable presumption of, a causative physical or cerebral illness',
      'f06_0.exclude_primary_psychosis':
        'No predominant schizophrenic or affective clinical picture and no clouding of consciousness suggestive of a delirium; not due to substances',
    },
  },
  organic_delusional_disorder: {
    name: 'Organic delusional (schizophrenia-like) disorder',
    differentials: [
      'Schizophrenia / persistent delusional disorder',
      'Substance-induced psychotic disorder',
      'Delirium',
      'Affective disorder with psychotic symptoms',
    ],
    groups: {
      'f06_2.core': 'Delusions with clear consciousness',
      'f06_2.exclusions': 'Exclusions',
    },
    criteria: {
      'f06_2.persistent_delusions':
        'Predominant, persistent delusions (e.g. persecutory, delusions of reference or grandiose delusions)',
      'f06_2.clear_consciousness':
        'The delusions occur with clear consciousness and without marked cognitive decline',
      'f06_2.organic_cause':
        'Evidence of, or a reasonable presumption of, a causative physical or cerebral illness',
      'f06_2.exclude_primary_substance':
        'Not better explained by a primary schizophrenia/affective disorder, a delirium or by the effects of substances',
    },
  },
  organic_mood_disorder: {
    name: 'Organic mood (affective) disorder',
    differentials: [
      'Primary depressive or bipolar disorder',
      'Substance-/medication-induced affective disorder',
      'Adjustment disorder',
      'Dementia with affective symptoms',
    ],
    groups: {
      'f06_3.core': 'Organically caused affective disturbance',
      'f06_3.exclusions': 'Exclusions',
    },
    criteria: {
      'f06_3.mood_change':
        'A change in mood or affect of a depressive, manic or mixed character',
      'f06_3.organic_cause':
        'Evidence of, or a reasonable presumption of, a causative physical or cerebral illness (e.g. endocrine disorder, brain lesion)',
      'f06_3.exclude_primary_substance':
        'Not better explained by a primary affective disorder or by the effects of substances',
    },
  },
}
