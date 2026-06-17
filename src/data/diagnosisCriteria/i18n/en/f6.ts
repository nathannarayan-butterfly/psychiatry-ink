import type { DisorderTranslationMap } from '../types'

/** EN translations — ICD-10 F6 block. */
export const enF6: DisorderTranslationMap = {
  binge_eating_disorder: {
    name: 'Binge-eating disorder',
    differentials: [
      'Bulimia nervosa (with regular compensatory measures)',
      'Obesity without binge-eating episodes',
      'Depressive episode with increased appetite',
      'Night-eating syndrome',
    ],
    groups: {
      'f50_4.core': 'Core: recurrent binge-eating episodes without regular compensatory measures',
      'f50_4.exclusions': 'Exclusions',
    },
    criteria: {
      'binge_eating.recurrent_binges':
        'Recurrent binge-eating episodes involving the consumption of unusually large amounts of food with a marked loss of control over eating',
      'binge_eating.distress':
        'Marked distress in connection with the binge-eating episodes (e.g. shame, guilt, disgust) without regular compensatory measures',
      'binge_eating.exclude_compensatory':
        'There are no regular compensatory measures that would point more towards bulimia nervosa',
    },
  },
  paranoid_personality_disorder: {
    name: 'Paranoid personality disorder',
    differentials: [
      'Delusional disorder / paranoid schizophrenia (circumscribed psychotic symptoms)',
      'Schizoid or schizotypal personality disorder',
      'Persistent paranoid reaction to a genuine stressor',
      'Substance-induced paranoid symptoms',
    ],
    groups: {
      'f60_0.general': 'General criteria for a personality disorder (F60 General)',
      'f60_0.features': 'Characteristic features (at least 4)',
      'f60_0.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f60_0.general_deviation':
        'An enduring pattern of inner experience and behaviour that deviates markedly from the expectations of the sociocultural environment and is manifest in cognition, affectivity, impulse control or interpersonal behaviour',
      'f60_0.general_pervasive':
        'The deviant pattern is pervasive and inflexible across a broad range of personal and social situations (not confined to a single triggering situation)',
      'f60_0.general_distress':
        'The pattern leads to personal distress and/or marked impairment in social, occupational or other important areas of functioning',
      'f60_0.general_onset':
        'The pattern is stable and long-standing, with its onset traceable back to adolescence or early adulthood',
      'f60_0.general_not_organic':
        'The pattern is not an expression or consequence of another mental disorder and is not directly caused by a brain disease, injury or dysfunction',
      'f60_0.suspiciousness':
        'Pervasive distrust and a tendency to interpret the actions of others as hostile or demeaning without sufficient evidence',
      'f60_0.grudges':
        'Grudge-bearing behaviour: persistent resentment and an unwillingness to forgive insults or slights',
      'f60_0.distrust_loyalty':
        'Recurrent, unfounded doubts about the loyalty or trustworthiness of friends, partners or colleagues',
      'f60_0.reluctance_confide':
        'A reluctance to confide in others out of an unfounded fear that the information might be misused',
      'f60_0.hidden_meanings':
        'A tendency to read hidden demeaning or threatening meanings into harmless remarks or events',
      'f60_0.self_reference':
        'Excessive self-reference, often combined with a marked sense of entitlement and a combative insistence on one’s own rights',
      'f60_0.jealousy':
        'Unjustified, persistent suspicion regarding the sexual fidelity of the partner',
      'f60_0.exclude_psychosis':
        'The distrust does not occur exclusively in the context of a schizophrenic or persistent delusional disorder and does not reach a circumscribed delusional quality',
    },
  },
  schizoid_personality_disorder: {
    name: 'Schizoid personality disorder',
    differentials: [
      'Autism spectrum disorder (early-childhood onset, repetitive patterns)',
      'Schizotypal disorder / schizophrenia prodrome',
      'Paranoid personality disorder',
      'Anxious–avoidant personality disorder (withdrawal out of anxiety rather than disinterest)',
      'Depressive episode with social withdrawal',
    ],
    groups: {
      'f60_1.general': 'General criteria for a personality disorder (F60 General)',
      'f60_1.features': 'Characteristic features (at least 4)',
      'f60_1.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f60_1.general_deviation':
        'An enduring pattern of inner experience and behaviour that deviates markedly from the expectations of the sociocultural environment and is manifest in cognition, affectivity, impulse control or interpersonal behaviour',
      'f60_1.general_pervasive':
        'The deviant pattern is pervasive and inflexible across a broad range of personal and social situations (not confined to a single triggering situation)',
      'f60_1.general_distress':
        'The pattern leads to personal distress and/or marked impairment in social, occupational or other important areas of functioning',
      'f60_1.general_onset':
        'The pattern is stable and long-standing, with its onset traceable back to adolescence or early adulthood',
      'f60_1.general_not_organic':
        'The pattern is not an expression or consequence of another mental disorder and is not directly caused by a brain disease, injury or dysfunction',
      'f60_1.anhedonia':
        'Few, if any, activities provide pleasure (a reduced capacity to experience enjoyment)',
      'f60_1.emotional_coldness':
        'Emotional coldness, detachment or flattened affectivity in interpersonal contact',
      'f60_1.limited_warmth':
        'A limited capacity to express warm, tender feelings towards others — or, equally, anger',
      'f60_1.indifference_praise':
        'Apparent indifference to praise or criticism from others',
      'f60_1.little_sexual_interest':
        'Little interest in sexual experiences with another person',
      'f60_1.solitary':
        'A marked preference for solitary activities; an almost consistent choice of solitary pursuits',
      'f60_1.no_close_friends':
        'Few or no close friendships or trusting relationships, and no desire for them',
      'f60_1.insensitive_norms':
        'Insensitivity to prevailing social norms and conventions (unintentional disregard)',
      'f60_1.exclude_asd_schizo':
        'The withdrawal is not better explained by an autism spectrum disorder, a schizotypal disorder or a schizophrenic illness',
    },
  },
  dissocial_personality_disorder: {
    name: 'Dissocial (antisocial) personality disorder',
    differentials: [
      'Conduct disorder (before the age of 18)',
      'Manic or hypomanic episode with disinhibition',
      'Substance use disorder with dissocial behaviour during intoxication',
      'Emotionally unstable personality disorder',
      'Secondary dissocial behaviour in a psychotic disorder',
    ],
    groups: {
      'f60_2.general': 'General criteria for a personality disorder (F60 General)',
      'f60_2.features': 'Characteristic features (at least 3)',
      'f60_2.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f60_2.general_deviation':
        'An enduring pattern of inner experience and behaviour that deviates markedly from the expectations of the sociocultural environment and is manifest in cognition, affectivity, impulse control or interpersonal behaviour',
      'f60_2.general_pervasive':
        'The deviant pattern is pervasive and inflexible across a broad range of personal and social situations (not confined to a single triggering situation)',
      'f60_2.general_distress':
        'The pattern leads to personal distress and/or marked impairment in social, occupational or other important areas of functioning',
      'f60_2.general_onset':
        'The pattern is stable and long-standing, with its onset traceable back to adolescence or early adulthood',
      'f60_2.general_not_organic':
        'The pattern is not an expression or consequence of another mental disorder and is not directly caused by a brain disease, injury or dysfunction',
      'f60_2.callousness':
        'Callous unconcern for the feelings of others and a lack of empathy',
      'f60_2.irresponsibility':
        'Marked and persistent irresponsibility, together with disregard for social norms, rules and obligations',
      'f60_2.unstable_relationships':
        'An inability to maintain lasting relationships, despite a preserved ability to form them',
      'f60_2.low_frustration_aggression':
        'A very low tolerance of frustration, with a low threshold for aggressive or violent behaviour',
      'f60_2.no_guilt':
        'An absence of any sense of guilt and an inability to learn from adverse experience, particularly punishment',
      'f60_2.blaming_others':
        'A marked tendency to blame others or to offer superficial rationalisations for one’s own behaviour',
      'f60_2.deceitfulness':
        'Repeated lying, deceiving or manipulating of others for personal gain or pleasure (ICD-11/DSM crosswalk)',
      'f60_2.exclude_mania_substance':
        'The behaviour does not occur exclusively in the context of a manic episode, a schizophrenic disorder or substance intoxication',
    },
  },
  emotionally_unstable_pd_impulsive: {
    name: 'Emotionally unstable personality disorder, impulsive type',
    differentials: [
      'Emotionally unstable personality disorder, borderline type (F60.31)',
      'Hypomanic/manic episode',
      'Adult ADHD with impulsivity',
      'Substance-related disinhibition',
      'Dissocial personality disorder',
    ],
    groups: {
      'f60_30.general': 'General criteria for a personality disorder (F60 General)',
      'f60_30.features':
        'Characteristic features (impulsive type; at least 3, including affective instability)',
      'f60_30.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f60_30.general_deviation':
        'An enduring pattern of inner experience and behaviour that deviates markedly from the expectations of the sociocultural environment and is manifest in cognition, affectivity, impulse control or interpersonal behaviour',
      'f60_30.general_pervasive':
        'The deviant pattern is pervasive and inflexible across a broad range of personal and social situations (not confined to a single triggering situation)',
      'f60_30.general_distress':
        'The pattern leads to personal distress and/or marked impairment in social, occupational or other important areas of functioning',
      'f60_30.general_onset':
        'The pattern is stable and long-standing, with its onset traceable back to adolescence or early adulthood',
      'f60_30.general_not_organic':
        'The pattern is not an expression or consequence of another mental disorder and is not directly caused by a brain disease, injury or dysfunction',
      'f60_30.impulsivity':
        'A marked tendency to act unexpectedly and impulsively without regard for the consequences',
      'f60_30.quarrelsome':
        'A marked tendency towards quarrels and conflict with others, especially when impulsive acts are thwarted or criticised',
      'f60_30.outbursts':
        'A liability to outbursts of anger or violence, with an inability to control the resulting explosive behaviour',
      'f60_30.affective_instability':
        'An unstable and capricious mood, with rapid swings of affect',
      'f60_30.difficulty_planning':
        'Difficulty in planning actions ahead and seeing them through to completion when they offer no immediate reward',
      'f60_30.exclude_mania_substance':
        'The impulsivity/affective lability does not occur exclusively in the context of an affective episode or a substance effect',
    },
  },
  emotionally_unstable_pd_borderline: {
    name: 'Emotionally unstable personality disorder, borderline type',
    differentials: [
      'Emotionally unstable personality disorder, impulsive type (F60.30)',
      'Bipolar affective disorder (episodes rather than continuous instability)',
      'Complex post-traumatic stress disorder',
      'Histrionic or dissocial personality disorder',
      'Substance use disorder',
    ],
    groups: {
      'f60_31.general': 'General criteria for a personality disorder (F60 General)',
      'f60_31.impulsive_core': 'Features of the impulsive type (at least 2)',
      'f60_31.borderline_features': 'Borderline features (at least 2)',
      'f60_31.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f60_31.general_deviation':
        'An enduring pattern of inner experience and behaviour that deviates markedly from the expectations of the sociocultural environment and is manifest in cognition, affectivity, impulse control or interpersonal behaviour',
      'f60_31.general_pervasive':
        'The deviant pattern is pervasive and inflexible across a broad range of personal and social situations (not confined to a single triggering situation)',
      'f60_31.general_distress':
        'The pattern leads to personal distress and/or marked impairment in social, occupational or other important areas of functioning',
      'f60_31.general_onset':
        'The pattern is stable and long-standing, with its onset traceable back to adolescence or early adulthood',
      'f60_31.general_not_organic':
        'The pattern is not an expression or consequence of another mental disorder and is not directly caused by a brain disease, injury or dysfunction',
      'f60_31.impulsivity':
        'Marked impulsivity, acting without regard for the consequences',
      'f60_31.affective_instability':
        'An unstable, rapidly shifting mood with marked affective lability',
      'f60_31.self_image':
        'Disturbances of, and uncertainty about, self-image, goals and inner preferences (including sexual ones)',
      'f60_31.intense_unstable_relationships':
        'A tendency to become involved in intense but unstable relationships, often alternating between idealisation and devaluation',
      'f60_31.abandonment':
        'Excessive efforts to avoid real or feared abandonment',
      'f60_31.self_harm':
        'Recurrent suicidal threats or self-harming acts (e.g. self-injurious behaviour)',
      'f60_31.chronic_emptiness':
        'A persistent feeling of inner emptiness',
      'f60_31.dissociation':
        'Transient, stress-related paranoid ideation or dissociative symptoms (ICD-11/DSM crosswalk)',
      'f60_31.exclude_bipolar':
        'The pattern is not better explained by a bipolar affective disorder with circumscribed episodes',
    },
  },
  histrionic_personality_disorder: {
    name: 'Histrionic personality disorder',
    differentials: [
      'Emotionally unstable personality disorder (borderline type)',
      'Dependent personality disorder',
      'Narcissistic personality disorder',
      'Manic/hypomanic episode',
    ],
    groups: {
      'f60_4.general': 'General criteria for a personality disorder (F60 General)',
      'f60_4.features': 'Characteristic features (at least 4)',
      'f60_4.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f60_4.general_deviation':
        'An enduring pattern of inner experience and behaviour that deviates markedly from the expectations of the sociocultural environment and is manifest in cognition, affectivity, impulse control or interpersonal behaviour',
      'f60_4.general_pervasive':
        'The deviant pattern is pervasive and inflexible across a broad range of personal and social situations (not confined to a single triggering situation)',
      'f60_4.general_distress':
        'The pattern leads to personal distress and/or marked impairment in social, occupational or other important areas of functioning',
      'f60_4.general_onset':
        'The pattern is stable and long-standing, with its onset traceable back to adolescence or early adulthood',
      'f60_4.general_not_organic':
        'The pattern is not an expression or consequence of another mental disorder and is not directly caused by a brain disease, injury or dysfunction',
      'f60_4.dramatization':
        'Exaggerated, theatrical expression of emotion and dramatisation of one’s own experiences',
      'f60_4.suggestibility':
        'Heightened suggestibility and a ready susceptibility to influence by others or by circumstances',
      'f60_4.shallow_affect':
        'Shallow and labile affectivity',
      'f60_4.attention_seeking':
        'A continual seeking of excitement, recognition from others and activities in which the person is the centre of attention',
      'f60_4.seductiveness':
        'Inappropriately seductive appearance or behaviour',
      'f60_4.appearance_focus':
        'Excessive preoccupation with one’s own physical attractiveness',
      'f60_4.exclude_other':
        'The pattern is not better explained by an affective episode or another personality disorder',
    },
  },
  anankastic_personality_disorder: {
    name: 'Anankastic (obsessive–compulsive) personality disorder',
    differentials: [
      'Obsessive–compulsive disorder (true, ego-dystonic obsessions/compulsions)',
      'Anxious–avoidant personality disorder',
      'Autism spectrum disorder with attachment to routines',
      'Depressive episode with a tendency to ruminate',
    ],
    groups: {
      'f60_5.general': 'General criteria for a personality disorder (F60 General)',
      'f60_5.features': 'Characteristic features (at least 4)',
      'f60_5.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f60_5.general_deviation':
        'An enduring pattern of inner experience and behaviour that deviates markedly from the expectations of the sociocultural environment and is manifest in cognition, affectivity, impulse control or interpersonal behaviour',
      'f60_5.general_pervasive':
        'The deviant pattern is pervasive and inflexible across a broad range of personal and social situations (not confined to a single triggering situation)',
      'f60_5.general_distress':
        'The pattern leads to personal distress and/or marked impairment in social, occupational or other important areas of functioning',
      'f60_5.general_onset':
        'The pattern is stable and long-standing, with its onset traceable back to adolescence or early adulthood',
      'f60_5.general_not_organic':
        'The pattern is not an expression or consequence of another mental disorder and is not directly caused by a brain disease, injury or dysfunction',
      'f60_5.doubt_caution':
        'Excessive doubt and caution when making decisions',
      'f60_5.preoccupation_detail':
        'A constant preoccupation with details, rules, lists, order, organisation or schedules, to the point that the main purpose is lost',
      'f60_5.perfectionism':
        'Perfectionism that interferes with the completion of tasks',
      'f60_5.conscientiousness':
        'Excessive conscientiousness and scrupulousness, with a disproportionate focus on productivity to the neglect of pleasure and relationships',
      'f60_5.rigidity':
        'Marked rigidity and stubbornness regarding one’s own standards, procedures and moral values',
      'f60_5.insistence_submission':
        'Unreasonable insistence that others submit exactly to one’s own habits, or an unfounded reluctance to let others do things',
      'f60_5.intrusive_thoughts':
        'Intrusive, persistent thoughts or impulses to act that do not reach the severity of an obsessive–compulsive disorder',
      'f60_5.exclude_ocd':
        'There are no true, ego-dystonic obsessions or compulsions in the sense of an obsessive–compulsive disorder (F42)',
    },
  },
  anxious_avoidant_personality_disorder: {
    name: 'Anxious (avoidant) personality disorder',
    differentials: [
      'Social anxiety disorder (situation-bound, not pervasive)',
      'Schizoid personality disorder (withdrawal out of disinterest rather than anxiety)',
      'Dependent personality disorder',
      'Depressive episode with withdrawal',
    ],
    groups: {
      'f60_6.general': 'General criteria for a personality disorder (F60 General)',
      'f60_6.features': 'Characteristic features (at least 4)',
      'f60_6.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f60_6.general_deviation':
        'An enduring pattern of inner experience and behaviour that deviates markedly from the expectations of the sociocultural environment and is manifest in cognition, affectivity, impulse control or interpersonal behaviour',
      'f60_6.general_pervasive':
        'The deviant pattern is pervasive and inflexible across a broad range of personal and social situations (not confined to a single triggering situation)',
      'f60_6.general_distress':
        'The pattern leads to personal distress and/or marked impairment in social, occupational or other important areas of functioning',
      'f60_6.general_onset':
        'The pattern is stable and long-standing, with its onset traceable back to adolescence or early adulthood',
      'f60_6.general_not_organic':
        'The pattern is not an expression or consequence of another mental disorder and is not directly caused by a brain disease, injury or dysfunction',
      'f60_6.tension_apprehension':
        'Persistent, pervasive feelings of tension and apprehension',
      'f60_6.feeling_inferior':
        'A belief that one is socially inept, unappealing or inferior to others',
      'f60_6.preoccupation_criticism':
        'Excessive preoccupation with the possibility of being criticised or rejected in social situations',
      'f60_6.reluctance_without_acceptance':
        'An unwillingness to enter into interpersonal contact unless there is a sure guarantee of acceptance',
      'f60_6.restricted_lifestyle':
        'A restricted lifestyle arising from the need for physical security',
      'f60_6.avoidance_activities':
        'Avoidance of occupational or social activities involving significant interpersonal contact, for fear of criticism, disapproval or rejection',
      'f60_6.exclude_social_phobia':
        'The pattern is pervasive and enduring and not confined to circumscribed phobic situations in the sense of a social anxiety disorder',
    },
  },
  dependent_personality_disorder: {
    name: 'Dependent personality disorder',
    differentials: [
      'Anxious–avoidant personality disorder',
      'Emotionally unstable personality disorder',
      'Depressive episode with a tendency to cling',
      'Agoraphobia with a need for an accompanying person',
    ],
    groups: {
      'f60_7.general': 'General criteria for a personality disorder (F60 General)',
      'f60_7.features': 'Characteristic features (at least 4)',
      'f60_7.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f60_7.general_deviation':
        'An enduring pattern of inner experience and behaviour that deviates markedly from the expectations of the sociocultural environment and is manifest in cognition, affectivity, impulse control or interpersonal behaviour',
      'f60_7.general_pervasive':
        'The deviant pattern is pervasive and inflexible across a broad range of personal and social situations (not confined to a single triggering situation)',
      'f60_7.general_distress':
        'The pattern leads to personal distress and/or marked impairment in social, occupational or other important areas of functioning',
      'f60_7.general_onset':
        'The pattern is stable and long-standing, with its onset traceable back to adolescence or early adulthood',
      'f60_7.general_not_organic':
        'The pattern is not an expression or consequence of another mental disorder and is not directly caused by a brain disease, injury or dysfunction',
      'f60_7.delegating_decisions':
        'Encouraging or allowing others to make most of the important decisions in one’s own life',
      'f60_7.subordination':
        'Subordination of one’s own needs to those of the people on whom one depends, with excessive compliance with their wishes',
      'f60_7.reluctance_demands':
        'An unwillingness to make even reasonable demands of the people one depends upon',
      'f60_7.discomfort_alone':
        'Discomfort or feelings of helplessness when alone, out of an exaggerated fear of being unable to care for oneself',
      'f60_7.fear_abandonment':
        'Frequent fear of being abandoned by a close person and left to fend for oneself',
      'f60_7.need_reassurance':
        'A limited ability to make everyday decisions without excessive advice and reassurance from others',
      'f60_7.exclude_depression_agora':
        'The dependent pattern is enduring and not better explained by a depressive episode or an agoraphobic disorder',
    },
  },
  icd11_dimensional_personality_disorder: {
    name: 'Personality disorder — dimensional model (ICD-11)',
    differentials: [
      'Personality difficulty (6D11.0, subclinical)',
      'Transient stress-reactive change in behaviour',
      'Another primary mental disorder with secondary personality traits',
      'Organic personality disorder',
    ],
    groups: {
      '6d10.core': 'Core: enduring disturbance of personality functioning',
      '6d10.severity': 'Severity grading (exactly one level; 6D10)',
      '6d11.trait_domains': 'Trait domain qualifiers (one or more; 6D11)',
      '6d10.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      '6d10.self_functioning':
        'Persistent impairment in aspects of the self (e.g. identity, self-worth, self-direction, goal-setting)',
      '6d10.interpersonal_functioning':
        'Persistent impairment in interpersonal functioning (the ability to establish and maintain close, mutually satisfying relationships)',
      '6d10.duration_pervasive':
        'The pattern has been present over an extended period (of the order of ≥ 2 years) and is manifest across situations',
      '6d10.manifest_patterns':
        'The disturbance is manifest in maladaptive patterns of cognition, emotional experience, emotional expression and behaviour',
      '6d10.severity_mild':
        'Mild personality disorder: impairment in some areas of functioning, but preserved functioning in many others; a low risk of harm to self or others (6D10.0)',
      '6d10.severity_moderate':
        'Moderate personality disorder: marked problems across several areas of functioning, with pronounced impairment in most interpersonal relationships and social/occupational roles (6D10.1)',
      '6d10.severity_severe':
        'Severe personality disorder: severe impairment of self and interpersonal functioning across nearly all areas of life; often a substantial risk of harm to self or others (6D10.2)',
      '6d11.negative_affectivity':
        'Negative affectivity: a tendency towards a broad range of negative emotions (anxiousness, emotional lability, mistrust, low self-worth) at a disproportionate frequency/intensity (6D11.0)',
      '6d11.detachment':
        'Detachment: a tendency towards social and emotional withdrawal, limited engagement in relationships and reduced expression of affect (6D11.1)',
      '6d11.dissociality':
        'Dissociality: disregard for the rights and feelings of others, self-centredness, a lack of empathy and a lack of consideration (6D11.2)',
      '6d11.disinhibition':
        'Disinhibition: a tendency to act impulsively in response to immediate internal or external stimuli, without regard for longer-term consequences (6D11.3)',
      '6d11.anankastia':
        'Anankastia: a focus on rigid standards of perfection, order and control over one’s own and others’ behaviour (6D11.4)',
      '6d11.borderline_pattern':
        'Borderline pattern: pervasive instability of self-image, relationships and affect, with impulsivity, fear of abandonment and recurrent self-harm (6D11.5)',
      '6d10.exclude_other_organic':
        'The features are not better explained by another mental disorder, a substance effect or a disease of the nervous system, and are not developmentally appropriate or socioculturally normative',
    },
  },
  gambling_disorder: {
    name: 'Pathological gambling (gambling disorder)',
    differentials: [
      'Manic/hypomanic episode with excessive gambling',
      'Dissocial personality disorder with gambling problems',
      'Gambling in the context of a substance use disorder',
      'Habitual, socially acceptable gambling without loss of control',
    ],
    groups: {
      'f63_0.core': 'Core: recurrent, maladaptive gambling behaviour',
      'f63_0.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f63_0.recurrent_gambling':
        'Repeated, persistent gambling that continues and intensifies despite adverse social, occupational, material and family consequences',
      'f63_0.impaired_control':
        'Impaired control over the gambling behaviour (its onset, frequency, intensity, duration and termination)',
      'f63_0.priority':
        'Gambling takes increasing precedence over other interests and everyday obligations',
      'f63_0.preoccupation':
        'A preoccupation with gambling — and with obtaining the means required for it — driven by mental rumination and urges',
      'f63_0.exclude_mania_dissocial':
        'The gambling does not occur exclusively in the context of a manic episode and is not better explained by a dissocial personality disorder',
    },
  },
  pyromania: {
    name: 'Pyromania (pathological fire-setting)',
    differentials: [
      'Deliberate fire-setting for financial gain, revenge or political motivation',
      'Fire-setting in the context of a dissocial personality disorder or conduct disorder',
      'Fire-setting during intoxication or in a psychotic disorder',
      'Fire-setting in intellectual disability or a dementing illness',
    ],
    groups: {
      'f63_1.core': 'Core: recurrent fire-setting without a comprehensible motive',
      'f63_1.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f63_1.repeated_firesetting':
        'Multiple instances of setting, or attempting to set, fire to objects or property without any discernible rational motive',
      'f63_1.preoccupation_fire':
        'Intense preoccupation with fire and burning, and a persistent interest in everything connected with fire',
      'f63_1.tension_relief':
        'A rising sense of tension before the act and an intense feeling of relief, excitement or gratification during and immediately after fire-setting',
      'f63_1.exclude_motivated_firesetting':
        'The fire-setting does not serve material gain, revenge, a political aim or the concealment of a criminal offence',
      'f63_1.exclude_other_disorder':
        'The behaviour is not better explained by a dissocial personality disorder, a psychotic disorder, substance intoxication or an organic disorder',
    },
  },
  kleptomania: {
    name: 'Kleptomania (pathological stealing)',
    differentials: [
      'Theft for personal gain (ordinary shoplifting)',
      'Theft in the context of a dissocial personality disorder or conduct disorder',
      'Stealing during intoxication or in a psychotic/manic disorder',
      'Stealing in a dementing or other organic disorder',
    ],
    groups: {
      'f63_2.core': 'Core: repeated stealing without an intention to enrich oneself',
      'f63_2.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f63_2.repeated_stealing':
        'A recurrent failure to resist the impulse to steal objects that are not needed for personal use or for material gain',
      'f63_2.tension_relief':
        'A rising sense of tension immediately before the act and a feeling of relief, gratification or pleasure during and after the stealing',
      'f63_2.no_personal_gain':
        'The stolen objects are not needed and are often given away, discarded or hoarded; the stealing is not done out of anger or revenge',
      'f63_2.exclude_motivated_theft':
        'The theft is not committed for enrichment and is not better explained by a dissocial personality disorder, a manic episode or an organic disorder',
    },
  },
  trichotillomania: {
    name: 'Trichotillomania (pathological hair-pulling)',
    differentials: [
      'Dermatological cause of hair loss (e.g. alopecia areata)',
      'Hair-pulling in response to a delusion or hallucination',
      'Stereotypic movement disorder',
      'Body dysmorphic disorder with picking behaviour',
      'Obsessive–compulsive disorder with ritualised behaviour',
    ],
    groups: {
      'f63_3.core': 'Core: repeated hair-pulling with noticeable hair loss',
      'f63_3.exclusions': 'Exclusions / differentiation',
    },
    criteria: {
      'f63_3.hair_pulling':
        'Repeated pulling out of one’s own hair, resulting in noticeable hair loss',
      'f63_3.failed_resistance':
        'Repeated unsuccessful attempts to reduce or stop the hair-pulling',
      'f63_3.tension_relief':
        'A rising sense of tension before pulling (or when trying to resist the impulse) and relief or gratification afterwards',
      'f63_3.exclude_dermatological_psychotic':
        'The hair loss is not due to an inflammatory skin condition, and the pulling does not occur in response to a delusion or hallucination',
    },
  },
}
