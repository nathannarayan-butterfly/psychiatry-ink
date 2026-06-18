import type { DisorderTranslationMap } from '../types'

/** EN translations — ICD-10 F2 block. */
export const enPsychotic: DisorderTranslationMap = {
  schizophrenia: {
    name: 'Schizophrenia',
    differentials: [
      'Schizoaffective disorder',
      'Mood disorder with psychotic symptoms',
      'Acute and transient psychotic disorder',
      'Substance-induced or organic psychosis',
    ],
    groups: {
      'f20.characteristic': 'Characteristic symptoms (at least 1 unambiguous symptom)',
      'f20.duration': 'Time criterion',
      'f20.exclusions': 'Exclusions',
      '6a20.core_symptom':
        'At least one core symptom (persistent delusions, persistent hallucinations, disorganised thinking, or experiences of influence/passivity/control)',
      '6a20.symptoms': 'At least two characteristic symptoms, of which at least one is from the core set',
      '6a20.duration': 'Time criterion',
      '6a20.exclusions': 'Exclusions',
    },
    criteria: {
      'f20.ego_disturbance':
        'Disturbances of ego boundaries: thought broadcasting (audible thoughts), thought insertion, withdrawal or diffusion, together with experiences of being controlled or influenced or a sense of being made to act (passivity phenomena)',
      'f20.auditory_hallucinations':
        'Running commentary or conversing (third-person) voices discussing the person, or other persistent voices arising from a part of the body',
      'f20.delusions':
        'Persistent, culturally inappropriate and entirely unrealistic (bizarre) delusions',
      'f20.formal_thought_disorder':
        'Thought blocking or interpolations in the flow of thought, giving rise to incoherence, tangential speech or neologisms',
      'f20.duration_one_month':
        'The characteristic symptoms are present for most of the time over a period of at least one month',
      'f20.exclude_mood_primary':
        'Where pronounced manic or depressive symptoms coexist, the schizophrenic symptoms preceded the affective disturbance (no predominant affective picture)',
      'f20.exclude_organic_substance':
        'The symptoms are not attributable to an organic brain disorder or to intoxication, dependence or withdrawal involving a psychoactive substance',
      '6a20.persistent_delusions':
        'Persistent delusional phenomena (e.g. persecutory, referential, grandiose or bizarre delusions)',
      '6a20.persistent_hallucinations':
        'Persistent hallucinations in any sensory modality (most commonly auditory)',
      '6a20.disorganised_thinking':
        'Disorganised thinking or formal thought disorder (incoherence, thought blocking, tangential speech or neologisms)',
      '6a20.passivity':
        'Experiences of influence, passivity or control, together with ego-boundary disturbances (thought insertion, withdrawal or broadcasting)',
      '6a20.negative_symptoms':
        'Negative symptoms (affective flattening, poverty of speech, lack of drive and initiative, anhedonia or social withdrawal)',
      '6a20.disorganised_behaviour':
        'Grossly disorganised behaviour that impairs the goal-directedness of everyday activities',
      '6a20.psychomotor_disturbance':
        'Psychomotor disturbances (catatonic symptoms such as stupor, posturing, mutism, negativism or excitement)',
      '6a20.duration_one_month':
        'The characteristic symptoms are present for most of the time over a period of at least one month',
      '6a20.exclude_substance_organic':
        'The symptoms are not attributable to a psychoactive substance, a medication or another physical or organic cause',
      '6a20.exclude_mood':
        'The symptoms are not better explained by a mood disorder with psychotic features (where a concurrent moderate-to-severe episode is present, schizoaffective disorder should be considered)',
    },
  },
  schizotypal_disorder: {
    name: 'Schizotypal disorder',
    differentials: [
      'Schizophrenia (F20) — where psychotic symptoms are unambiguous',
      'Schizoid or paranoid personality disorder',
      'Autism spectrum disorder with social idiosyncrasy',
      'Emerging (prodromal) schizophrenia',
    ],
    groups: {
      'f21.features': 'Characteristic features (at least 4 of 9, persistent or episodic)',
      'f21.duration': 'Time criterion',
      'f21.exclusions': 'Exclusions',
    },
    criteria: {
      'f21.constricted_affect':
        'Inappropriate or constricted affect, with a cold, aloof and emotionally impoverished demeanour',
      'f21.odd_behavior': 'Peculiar, eccentric or odd behaviour and appearance',
      'f21.social_withdrawal':
        'Social withdrawal and impoverished contact with others (limited capacity for relationships)',
      'f21.magical_thinking':
        'Unusual, magical beliefs that influence behaviour and are inconsistent with sociocultural norms',
      'f21.suspiciousness': 'Suspiciousness or paranoid ideas without delusional quality',
      'f21.ruminations':
        'Obsessive ruminations without inner resistance, frequently with dysmorphophobic, sexual or aggressive content',
      'f21.unusual_perceptions':
        'Unusual perceptual experiences, including bodily-sensation disturbances, as well as depersonalisation or derealisation',
      'f21.odd_speech':
        'Circumstantial, metaphorical, stilted or vague thinking, expressed through idiosyncratic speech without marked incoherence',
      'f21.quasi_psychotic':
        'Occasional transient quasi-psychotic episodes with intense illusions, auditory or other hallucinations and delusion-like ideas, usually arising without an external trigger',
      'f21.duration_two_years':
        'The features are present, persistently or episodically, over a period of at least two years',
      'f21.exclude_schizophrenia':
        'The criteria for schizophrenia (F20) have never been fully met at any time',
      'f21.exclude_organic':
        'The symptoms are not attributable to an organic mental disorder or to a psychoactive substance',
    },
  },
  persistent_delusional_disorder: {
    name: 'Persistent delusional disorder',
    differentials: [
      'Schizophrenia (F20) — where additional typically schizophrenic symptoms are present',
      'Mood disorder with mood-congruent delusions',
      'Organically or substance-induced delusions',
      'Persistent delusional disorder occurring within a personality disorder',
    ],
    groups: {
      'f22.core': 'Core: persistent delusion',
      'f22.exclusions': 'Exclusions (no full schizophrenic picture, not organic)',
    },
    criteria: {
      'f22.delusion':
        'A delusion or a system of thematically connected delusional ideas (e.g. persecutory, grandiose, hypochondriacal, jealous or amorous delusions)',
      'f22.duration_three_months':
        'The delusion is present over a period of at least three months',
      'f22.exclude_schizophrenic_symptoms':
        'No persistent auditory hallucinations, ego-boundary disturbances or other symptoms characteristic of schizophrenia (at most fleetingly present)',
      'f22.exclude_organic':
        'The delusion is not explicable by an organic mental disorder, a substance effect or a predominant affective disorder',
    },
  },
  acute_transient_psychotic_disorder: {
    name: 'Acute and transient psychotic disorder',
    differentials: [
      'Schizophrenia (F20) — where symptoms persist beyond one month',
      'Mood disorder with psychotic symptoms',
      'Substance-induced or organic psychosis',
      'Persistent delusional disorder (F22)',
    ],
    groups: {
      'f23.onset': 'Acute onset',
      'f23.symptoms': 'Psychotic symptoms (at least one)',
      'f23.exclusions': 'Exclusions',
      '6a23.onset': 'Acute onset',
      '6a23.symptoms': 'Rapidly shifting polymorphic psychotic symptoms (at least one)',
      '6a23.course': 'Course criterion',
      '6a23.exclusions': 'Exclusions',
    },
    criteria: {
      'f23.acute_onset':
        'Acute onset of the psychotic symptoms within no more than two weeks, arising from an unremarkable state',
      'f23.delusions':
        'Delusional phenomena that may shift rapidly in form and content (a polymorphic picture)',
      'f23.hallucinations': 'Hallucinations of varying modality and intensity',
      'f23.perplexity':
        'Rapidly shifting, multiform (polymorphic) symptoms with emotional turmoil or perplexity',
      'f23.exclude_organic':
        'The symptoms are not attributable to an organic mental disorder or to a psychoactive substance (intoxication, withdrawal)',
      '6a23.acute_onset':
        'Acute onset of the psychotic symptoms within no more than two weeks, arising from a largely unremarkable state',
      '6a23.rapidly_changing':
        'A polymorphic picture with the type and intensity of symptoms shifting rapidly (from day to day or within a single day) — the hallmark of the ICD-11 category',
      '6a23.delusions': 'Delusional phenomena that may shift rapidly in form and content',
      '6a23.hallucinations': 'Hallucinations of varying modality and intensity',
      '6a23.transient_remission':
        'The episode is transient: the symptoms usually remit fully within about three months and do not exceed the symptom duration required for schizophrenia',
      '6a23.exclude_substance_organic':
        'The symptoms are not attributable to a psychoactive substance, a medication or another physical or organic cause',
    },
  },
  induced_delusional_disorder: {
    name: 'Induced delusional disorder (folie à deux)',
    differentials: [
      'Independent delusional disorder (F22) present in both individuals',
      'Schizophrenia (F20)',
      'Shared realistic, non-delusional beliefs',
    ],
    groups: {
      'f24.core': 'Core criteria of induction',
      'f24.exclusions': 'Exclusions',
    },
    criteria: {
      'f24.shared_delusion':
        'The affected person shares a delusion or delusional system with another person who has a genuine delusional disorder',
      'f24.close_relationship':
        'An unusually close, emotionally bonded relationship exists between the individuals (e.g. familial or within a partnership)',
      'f24.induction_context':
        'There is a temporal and thematic connection: the delusion was adopted through contact with the primarily ill person and did not previously exist independently',
      'f24.exclude_primary_psychosis':
        'The induced person did not meet criteria for an independent psychotic disorder before the contact; the symptoms are not explicable as organic or substance-related',
    },
  },
  schizoaffective_disorder: {
    name: 'Schizoaffective disorder',
    differentials: [
      'Schizophrenia (F20) with accompanying affective symptoms',
      'Mood disorder with mood-incongruent psychotic symptoms',
      'Bipolar disorder with psychotic features',
      'Substance-induced or organic psychosis',
    ],
    groups: {
      'f25.schizophrenic': 'Schizophrenic symptoms (at least one, prominent within the same episode)',
      'f25.affective': 'Affective syndrome (manic or depressive, prominent concurrently)',
      'f25.simultaneity': 'Concurrence',
      'f25.exclusions': 'Exclusions',
      '6a21.schizophrenic':
        'Schizophrenia symptom requirements (6A20) met (at least one prominent within the same episode)',
      '6a21.mood_episode': 'Concurrent moderate-to-severe mood episode (at least one)',
      '6a21.concurrence': 'Concurrence and severity',
      '6a21.exclusions': 'Exclusions',
    },
    criteria: {
      'f25.ego_disturbance':
        'Ego-boundary disturbances such as thought insertion, withdrawal, diffusion, or experiences of being controlled or influenced',
      'f25.hallucinations':
        'Running commentary or conversing voices, or persistent hallucinations',
      'f25.bizarre_delusions':
        'Bizarre or entirely culturally inappropriate persistent delusions',
      'f25.thought_disorder':
        'Formal thought disorder with incoherence, thought blocking or neologisms',
      'f25.manic_syndrome':
        'A pronounced manic picture with elevated or irritable mood and heightened drive',
      'f25.depressive_syndrome':
        'A pronounced depressive picture with low mood, loss of interest and reduced drive',
      'f25.simultaneous_prominence':
        'Schizophrenic and affective symptoms are prominent concurrently, or at most a few days apart, within the same episode of illness',
      'f25.exclude_organic':
        'The symptoms are not attributable to an organic mental disorder or to a psychoactive substance',
      '6a21.delusions': 'Persistent delusions (e.g. persecutory, referential or bizarre delusions)',
      '6a21.hallucinations':
        'Persistent hallucinations, frequently running-commentary or conversing voices',
      '6a21.disorganised_thinking':
        'Disorganised thinking or formal thought disorder (incoherence, thought blocking, neologisms)',
      '6a21.passivity':
        'Experiences of influence, passivity or control, together with ego-boundary disturbances (thought insertion, withdrawal or broadcasting)',
      '6a21.manic_episode':
        'A manic (or hypomanic-to-manic) episode of moderate-to-severe degree with elevated or irritable mood and heightened drive, meeting the full requirements of a mood episode',
      '6a21.depressive_episode':
        'A depressive episode of moderate-to-severe degree with low mood, loss of interest and reduced drive, meeting the full requirements of a mood episode',
      '6a21.mixed_episode':
        'A mixed episode with manic and depressive features present concurrently or alternating rapidly, of moderate-to-severe degree',
      '6a21.simultaneous_episode':
        'The schizophrenic symptoms and the mood episode occur concurrently within the same episode of illness, with the mood episode being at least moderate in severity and meeting its full diagnostic requirements',
      '6a21.exclude_substance_organic':
        'The symptoms are not attributable to a psychoactive substance, a medication or another physical or organic cause',
    },
  },
  other_nonorganic_psychosis: {
    name: 'Other non-organic psychotic disorder',
    differentials: [
      'Schizophrenia (F20) or persistent delusional disorder (F22) where criteria are fully met',
      'Acute and transient psychotic disorder (F23)',
      'Schizoaffective disorder (F25)',
      'Organic or substance-induced psychosis',
    ],
    groups: {
      'f28.core':
        'Psychotic symptoms that cannot be assigned to a specific category but are nameable',
      'f28.exclusions': 'Exclusions',
    },
    criteria: {
      'f28.psychotic_symptoms':
        'Psychotic symptoms (delusions, hallucinations or formal thought disorder) are present and clinically describable',
      'f28.no_specific_category':
        'The clinical picture does not fully meet the criteria for schizophrenia, a delusional disorder, an acute and transient disorder or a schizoaffective disorder (a named residual category)',
      'f28.exclude_organic':
        'The psychotic symptoms are not attributable to an organic mental disorder or to a psychoactive substance',
    },
  },
  unspecified_nonorganic_psychosis: {
    name: 'Unspecified non-organic psychosis',
    differentials: [
      'Other non-organic psychotic disorder (F28) where the picture is more specifically defined',
      'Schizophrenia (F20), persistent delusional disorder (F22) or schizoaffective disorder (F25) where criteria are fully met',
      'Acute and transient psychotic disorder (F23)',
      'Organic or substance-induced psychosis',
    ],
    groups: {
      'f29.core':
        'Psychotic symptoms with insufficient information for a more specific assignment',
      'f29.exclusions': 'Exclusions',
    },
    criteria: {
      'f29.psychotic_symptoms':
        'Clearly psychotic symptoms are present but, for want of sufficient information, cannot be assigned to a specific category',
      'f29.insufficient_information':
        'The available information is insufficient or contradictory for a more specific diagnosis (a provisional or holding category)',
      'f29.exclude_organic':
        'The psychotic symptoms are not attributable to an organic mental disorder or to a psychoactive substance',
    },
  },
}
