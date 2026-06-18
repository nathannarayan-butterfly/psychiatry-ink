import type { DisorderTranslationMap } from '../types'

/** EN translations — ICD-10 F4 block. */
export const enNeuroticStressSomatoform: DisorderTranslationMap = {
  generalized_anxiety_disorder: {
    name: 'Generalised anxiety disorder',
    differentials: [
      'Panic disorder',
      'Social anxiety disorder / phobia',
      'Depressive episode with an anxiety component',
      'Substance- or caffeine-induced anxiety, hyperthyroidism',
    ],
    groups: {
      'f41_1.core': 'Core: persistent, free-floating anxiety',
      'f41_1.associated': 'Autonomic/tension symptoms (at least 3)',
      'f41_1.exclusions': 'Exclusions',
      '6b00.core': 'Core: marked apprehension OR free-floating anxiety (at least one)',
      '6b00.additional': 'Additional characteristic symptoms (at least 3)',
      '6b00.duration': 'Duration',
      '6b00.exclusions': 'Exclusions',
    },
    criteria: {
      'f41_1.persistent_worry':
        'Generalised, free-floating (not situation-bound) tension, worry and apprehension about everyday events and problems on most days',
      'f41_1.duration':
        'Symptoms persist over a period of at least several months (on the order of ≥ 6 months)',
      'f41_1.restlessness':
        'Restlessness, inner tension or an inability to relax (feeling “on edge”)',
      'f41_1.fatigue': 'Easy fatigability',
      'f41_1.concentration':
        'Difficulty concentrating or a feeling of the “mind going blank”',
      'f41_1.irritability': 'Persistent irritability or affective lability',
      'f41_1.muscle_tension':
        'Muscle tension or aches, and other physical symptoms of tension',
      'f41_1.sleep':
        'Difficulty falling or staying asleep due to worry or tension',
      'f41_1.autonomic':
        'Autonomic overactivity (e.g. palpitations, sweating, dizziness, dry mouth, gastrointestinal complaints)',
      'f41_1.exclude_substance_medical':
        'The anxiety is better explained by a physical illness (e.g. hyperthyroidism) or the effect of a psychoactive substance',
      'f41_1.exclude_panic_primary':
        'The symptoms are not restricted exclusively to discrete panic attacks (F41.0) or phobic situations (F40.-)',
      '6b00.general_apprehension':
        'Marked worry or apprehension relating to several everyday areas of life (e.g. family, health, finances, work) and difficult to control',
      '6b00.free_floating':
        'General, free-floating anxiety or nervousness that is not tied to any particular worries or situations',
      '6b00.muscle_tension': 'Muscle tension or motor restlessness',
      '6b00.autonomic':
        'Sympathetic autonomic overactivity (e.g. palpitations, sweating, trembling, dry mouth, gastrointestinal complaints)',
      '6b00.restlessness': 'Restlessness or a feeling of being constantly “on edge”',
      '6b00.concentration': 'Difficulty concentrating due to worry or tension',
      '6b00.irritability': 'Irritability',
      '6b00.sleep':
        'Sleep disturbance (difficulty falling or staying asleep, or restless, unrefreshing sleep)',
      '6b00.several_months':
        'The symptoms are present on most days over a period of at least several months',
      '6b00.exclude_other':
        'The anxiety is not better explained by another mental disorder, a physical illness (e.g. hyperthyroidism) or the effect of a substance/medication',
    },
  },
  panic_disorder: {
    name: 'Panic disorder',
    differentials: [
      'Generalised anxiety disorder',
      'Agoraphobia / specific phobia',
      'Cardiac or endocrine cause (e.g. hyperthyroidism, arrhythmia)',
      'Substance-/caffeine-induced panic',
    ],
    groups: {
      'f41_0.core': 'Core: recurrent, unexpected panic attacks',
      'f41_0.autonomic': 'Autonomic attack symptoms (at least 3)',
      'f41_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f41_0.recurrent_attacks':
        'Recurrent, severe panic attacks that are not consistently restricted to a specific situation or object and often occur spontaneously',
      'f41_0.anticipatory_worry':
        'Persistent concern about further attacks or their consequences between attacks (anticipatory anxiety)',
      'f41_0.palpitations':
        'Palpitations, skipped heartbeats or accelerated heart rate',
      'f41_0.sweating_trembling': 'Sweating, trembling or shaking',
      'f41_0.dyspnea':
        'Shortness of breath, a sensation of choking or smothering, or chest tightness',
      'f41_0.dizziness':
        'Dizziness, light-headedness, a feeling of unsteadiness or faintness',
      'f41_0.depersonalization':
        'Experience of detachment (depersonalisation or derealisation) during the attack',
      'f41_0.fear_dying':
        'Fear of dying, of losing control or of “going mad”',
      'f41_0.exclude_organic_substance':
        'The attacks are not the result of a physical disorder, an organic mental disorder or another mental disorder',
    },
  },
  agoraphobia: {
    name: 'Agoraphobia',
    differentials: [
      'Panic disorder without situational binding',
      'Social anxiety disorder (avoidance of social evaluation rather than inability to escape)',
      'Depressive episode with social withdrawal',
      'Physical cause of dizziness/syncope',
    ],
    groups: {
      'f40_0.core': 'Core: anxiety in agoraphobic situations with avoidance',
      'f40_0.autonomic':
        'Autonomic anxiety symptoms in the situations (at least 2)',
      'f40_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f40_0.situational_fear':
        'Marked, recurrent anxiety in situations where escape seems difficult or embarrassing or where help may not be available (e.g. crowds, public places, travelling, leaving home alone)',
      'f40_0.avoidance':
        'The feared situations are avoided or endured only under marked distress or only when accompanied',
      'f40_0.palpitations':
        'Palpitations, accelerated heart rate or skipped heartbeats',
      'f40_0.dizziness':
        'Dizziness, light-headedness or a feeling of impending faint',
      'f40_0.sweating_trembling': 'Sweating, trembling or shaking',
      'f40_0.fear_losing_control':
        'Fear of dying, of losing control or of “going mad”',
      'f40_0.exclude_organic':
        'The anxiety symptoms are not better explained by a physical illness, a substance effect or a delusional or obsessive-compulsive symptomatology',
    },
  },
  social_anxiety_disorder: {
    name: 'Social anxiety disorder (social phobia)',
    differentials: [
      'Agoraphobia (fear of being unable to escape, not of evaluation)',
      'Panic disorder with situation-independent attacks',
      'Schizoid or anxious-avoidant personality disorder',
      'Autism spectrum disorder with social impairment',
    ],
    groups: {
      'f40_1.core': 'Core: fear of social evaluation',
      'f40_1.autonomic':
        'Characteristic physical accompanying symptoms (at least 1)',
      'f40_1.exclusions': 'Exclusions',
    },
    criteria: {
      'f40_1.fear_scrutiny':
        'Marked fear or tension in social situations in which the person is the centre of attention or may be scrutinised/evaluated by others (e.g. speaking in front of groups, eating in company)',
      'f40_1.fear_of_embarrassment':
        'Fear of behaving in an embarrassing or shameful way or of standing out negatively',
      'f40_1.avoidance':
        'Avoidance of the feared social situations or enduring them only under considerable anxiety',
      'f40_1.blushing':
        'Blushing, trembling of the hands, nausea or an urge to urinate in the social situation',
      'f40_1.exclude_other':
        'The symptoms are not an expression of a delusion or an obsessive-compulsive disorder and are not better explained by another mental or physical disorder',
    },
  },
  specific_phobia: {
    name: 'Specific (isolated) phobia',
    differentials: [
      'Agoraphobia (several situational triggers, theme of escape)',
      'Social anxiety disorder (fear of evaluation)',
      'Obsessive-compulsive disorder (avoidance due to obsessive fears)',
      'Post-traumatic stress disorder (trauma-associated triggers)',
    ],
    groups: {
      'f40_2.core': 'Core: circumscribed object/situation anxiety',
      'f40_2.exclusions': 'Exclusions',
    },
    criteria: {
      'f40_2.circumscribed_fear':
        'Marked, persistent anxiety restricted to a particular object or situation (e.g. animals, heights, darkness, the sight of blood/injuries, air travel, enclosed spaces)',
      'f40_2.avoidance':
        'The phobic object or situation is avoided or, on confrontation, immediately provokes intense anxiety',
      'f40_2.exclude_other':
        'The anxiety is not part of a more pervasive phobic, delusional or obsessive-compulsive syndrome and is not better explained otherwise',
    },
  },
  mixed_anxiety_depressive_disorder: {
    name: 'Mixed anxiety and depressive disorder',
    differentials: [
      'Depressive episode (where depression criteria are fully met)',
      'Generalised anxiety disorder (where anxiety criteria are fully met)',
      'Adjustment disorder with anxiety and depressive reaction',
      'Dysthymia',
    ],
    groups: {
      'f41_2.core':
        'Core: simultaneous anxiety and depressive symptoms below the full criteria',
      'f41_2.exclusions': 'Exclusions',
    },
    criteria: {
      'f41_2.anxiety_symptoms':
        'Presence of anxiety symptoms (e.g. worry, tension, autonomic overactivity)',
      'f41_2.depressive_symptoms':
        'Concurrent depressive symptoms (e.g. depressed mood, loss of enjoyment, reduced drive)',
      'f41_2.subthreshold':
        'Neither the anxiety nor the depressive symptomatology, on its own, reaches the full picture of an independent anxiety or depressive disorder',
      'f41_2.exclude_full_syndrome':
        'There is no fully developed depressive episode or anxiety disorder that should be coded in preference',
    },
  },
  obsessive_compulsive_disorder: {
    name: 'Obsessive-compulsive disorder',
    differentials: [
      'Generalised anxiety disorder (realistic worries rather than ego-dystonic obsessions)',
      'Delusional disorder (lack of insight, no attempts at resistance)',
      'Obsessive-compulsive (anankastic) personality disorder',
      'Tic disorders / Tourette syndrome',
    ],
    groups: {
      'f42.core':
        'Core: obsessional thoughts and/or compulsive acts for most of the time over ≥ 2 weeks',
      'f42.features': 'Characteristic features (at least 1)',
      'f42.exclusions': 'Exclusions',
      '6b20.core': 'Persistent obsessions and/or compulsions',
      '6b20.burden': 'Time consumption or clinically significant distress/impairment',
      '6b20.insight': 'Insight specifier (ICD-11)',
      '6b20.exclusions': 'Exclusions',
    },
    criteria: {
      'f42.obsessions':
        'Recurrent, intrusive thoughts, images or impulses experienced as one’s own but as senseless/distressing, and which the person attempts to resist',
      'f42.compulsions':
        'Repetitive behaviours or mental rituals (e.g. washing, checking, counting, ordering) performed to avert a feared consequence or tension',
      'f42.distress_interference':
        'The compulsions are time-consuming (e.g. more than one hour daily) or cause marked distress or impairment in daily life',
      'f42.egodystonic':
        'At least one obsessional thought or compulsive act is recognised as excessive or senseless (at least intermittent insight)',
      'f42.exclude_organic_schizophrenia':
        'The obsessive-compulsive symptomatology is not the result of a schizophrenic or affective disorder and is not explained organically or by a substance',
      '6b20.obsessions':
        'Persistent obsessions: recurrent, intrusive and unwanted thoughts, images or impulses (e.g. contamination, aggression or symmetry themes) that typically provoke anxiety or discomfort',
      '6b20.compulsions':
        'Persistent compulsions: repetitive behaviours or mental acts (e.g. washing, checking, counting, mental repeating) performed in response to an obsession or according to rigid rules',
      '6b20.time_distress':
        'The obsessive-compulsive symptoms are time-consuming (e.g. more than one hour daily) or cause marked distress or significant impairment in personal, family, social or occupational areas',
      '6b20.insight_specifier':
        'The degree of insight is to be specified (good or fair insight vs. poor to absent/delusional insight); even with delusional conviction the disorder is still coded within the obsessive-compulsive spectrum',
      '6b20.exclude_other':
        'The symptomatology is not better explained by another mental disorder (e.g. generalised anxiety disorder, delusional disorder) or by a substance effect or a physical illness',
    },
  },
  acute_stress_reaction: {
    name: 'Acute stress reaction',
    differentials: [
      'Post-traumatic stress disorder (symptoms > 1 month, delayed course possible)',
      'Adjustment disorder (less acute, lesser severity of the stressor)',
      'Panic attack',
      'Acute organic/substance-induced confusion',
    ],
    groups: {
      'f43_0.core':
        'Core: immediate reaction to an exceptional stressor',
      'f43_0.exclusions': 'Exclusions',
    },
    criteria: {
      'f43_0.exceptional_stressor':
        'Experience of an exceptional physical or psychological stressor (e.g. accident, violence, disaster) immediately before symptom onset',
      'f43_0.immediate_onset':
        'Symptom onset within minutes to a few hours of the stressor, with rapid resolution (usually within hours to a few days)',
      'f43_0.mixed_symptoms':
        'A mixed, changing picture of initial “numbness”, narrowing of consciousness, disorientation, anxiety, despair, overactivity or withdrawal',
      'f43_0.exclude_persistent':
        'The symptoms do not persist beyond several days to a degree more suggestive of PTSD or an adjustment disorder',
    },
  },
  post_traumatic_stress_disorder: {
    name: 'Post-traumatic stress disorder',
    differentials: [
      'Complex PTSD (additional disturbances of affect, self and relationships; ICD-11 6B41)',
      'Acute stress reaction (< 1 month, rapid resolution)',
      'Adjustment disorder',
      'Depressive episode / anxiety disorder with trauma reference',
    ],
    groups: {
      'f43_1.trauma': 'Stressor criterion',
      'f43_1.symptoms':
        'Characteristic symptom clusters (re-experiencing, avoidance, hyperarousal)',
      'f43_1.exclusions': 'Exclusions',
      '6b40.exposure': 'Stressor criterion (ICD-11)',
      '6b40.reexperiencing': 'Core symptom 1: re-experiencing in the here and now',
      '6b40.avoidance': 'Core symptom 2: avoidance',
      '6b40.threat': 'Core symptom 3: persistent sense of current threat',
      '6b40.duration': 'Duration',
      '6b40.functional': 'Functional impairment',
      '6b40.exclusions': 'Exclusions',
    },
    criteria: {
      'f43_1.traumatic_event':
        'Confrontation with a distressing event or situation of exceptional threat or catastrophic proportions that would cause profound distress in almost anyone',
      'f43_1.reexperiencing':
        'Repeated involuntary re-experiencing of the trauma in the form of memories, vivid flashbacks, nightmares or intrusive inner distress on recollection',
      'f43_1.avoidance':
        'Persistent avoidance of stimuli, thoughts or situations that recall the trauma',
      'f43_1.hyperarousal':
        'Persistent hyperarousal with, e.g., difficulty falling/staying asleep, irritability, concentration problems, an exaggerated startle response or heightened vigilance',
      'f43_1.exclude_other':
        'The symptomatology is not better explained by another mental disorder, a physical illness or a substance effect',
      '6b40.traumatic_event':
        'Exposure to an extremely threatening or horrific event or series of such events',
      '6b40.reexperiencing_now':
        'Re-experiencing the trauma in the present (not merely remembering it) in the form of vivid intrusive memories, flashbacks or nightmares, typically accompanied by strong fear or horror',
      '6b40.avoidance_reminders':
        'Active avoidance of thoughts and memories of the event, or of activities, situations or people that recall it',
      '6b40.current_threat':
        'A persistent perception of heightened current threat, e.g. marked hypervigilance or an enhanced startle reaction to stimuli',
      '6b40.several_weeks':
        'The symptoms persist over a period of at least several weeks',
      '6b40.functional_impairment':
        'Marked impairment in personal, family, social, educational, occupational or other important areas of functioning',
      '6b40.exclude_other':
        'The symptomatology is not better explained by another mental disorder, a physical illness or a substance effect',
    },
  },
  adjustment_disorder: {
    name: 'Adjustment disorder',
    differentials: [
      'Depressive episode (full criteria met)',
      'Post-traumatic stress disorder (trauma of exceptional proportions)',
      'Acute stress reaction (immediate, short-lasting)',
      'Normal grief reaction',
    ],
    groups: {
      'f43_2.core':
        'Core: stressor-dependent emotional/behavioural symptoms',
      'f43_2.exclusions': 'Exclusions',
      '6b43.stressor': 'Identifiable psychosocial stressor',
      '6b43.core': 'Core: preoccupation with the stressor and failure to adapt',
      '6b43.course': 'Course',
      '6b43.exclusions': 'Exclusions',
    },
    criteria: {
      'f43_2.identifiable_stressor':
        'Onset of symptoms in close temporal connection (usually within one month) with an identifiable distressing life event or life change',
      'f43_2.emotional_symptoms':
        'Emotional impairment (e.g. depressed mood, anxiety, worry) or impairment of social/occupational functioning that goes beyond a normal reaction',
      'f43_2.exclude_full_disorder':
        'The symptoms do not meet the criteria for a specific affective, anxiety or stress disorder that should be coded in preference',
      '6b43.identifiable_stressor':
        'Onset of symptoms within about one month of an identifiable psychosocial stressor or life change (single or multiple)',
      '6b43.preoccupation':
        'Excessive preoccupation with the stressor or its consequences (e.g. persistent worry, recurrent distressing thoughts about the event, or constant rumination about its meaning)',
      '6b43.failure_to_adapt':
        'Failure to adapt to the stressor, with significant impairment in personal, family, social, educational or occupational areas',
      '6b43.resolution':
        'The symptoms usually resolve within about six months of the stressor or its consequences being removed',
      '6b43.exclude_other':
        'The symptoms do not meet the criteria for another mental disorder (e.g. depressive disorder, PTSD) and go beyond a normal stress reaction or grief',
    },
  },
  dissociative_conversion_disorders: {
    name: 'Dissociative disorders (conversion disorders)',
    differentials: [
      'Neurological/physical illness (must be ruled out)',
      'Post-traumatic stress disorder with dissociative symptoms',
      'Factitious disorder / malingering',
      'Epilepsy (in seizure-like presentations)',
    ],
    groups: {
      'f44.core':
        'Core: dissociative or conversion-related functional disturbance',
      'f44.features': 'Supporting features',
      'f44.exclusions': 'Exclusions',
    },
    criteria: {
      'f44.psychoform_dissociation':
        'Partial or complete loss of the normal integration of memories, identity, immediate sensations or control of movement (e.g. dissociative amnesia, fugue, stupor, depersonalisation/derealisation)',
      'f44.conversion_symptoms':
        'Pseudoneurological conversion symptoms (e.g. paralyses, sensory disturbances, non-epileptic seizures, visual/speech disturbances) without sufficient organic explanation',
      'f44.temporal_link':
        'A convincing temporal connection of the symptoms with stressful events, conflicts or needs',
      'f44.exclude_organic':
        'There is no evidence of a physical (in particular neurological) illness that would explain the symptoms; targeted physical investigation has been carried out',
    },
  },
  somatoform_bodily_distress_disorder: {
    name: 'Somatoform disorder (bodily distress disorder)',
    differentials: [
      'Hypochondriacal/illness-anxiety disorder (fear of illness rather than symptom burden)',
      'Depressive or anxiety disorder with physical symptoms',
      'Insufficiently investigated physical illness',
      'Dissociative (conversion) disorder',
    ],
    groups: {
      'f45.core':
        'Core: distressing, repeatedly presented physical symptoms',
      'f45.exclusions': 'Exclusions',
      '6c20.core': 'Core: distressing bodily symptoms with excessive attention',
      '6c20.persistence': 'Persistence',
      '6c20.severity': 'Severity (ICD-11: mild / moderate / severe)',
      '6c20.exclusions': 'Exclusions',
    },
    criteria: {
      'f45.persistent_symptoms':
        'Persistent or recurrent physical complaints (often multiple and changing) that are distressing to the person and lead to repeated seeking of medical help',
      'f45.excessive_attention':
        'Excessive attention to the symptoms and/or repeated seeking of investigations, despite repeated reassurance about normal findings',
      'f45.exclude_organic':
        'The complaints are not sufficiently explained by a demonstrable physical illness; an appropriate physical investigation has been carried out',
      '6c20.bodily_symptoms':
        'Presence of one or more bodily symptoms that are distressing to the person (often, but not necessarily, multiple and changing)',
      '6c20.excessive_attention':
        'Excessive attention to the symptoms and marked health-related behaviour (e.g. repeated seeking of investigations, persistent reassurance-seeking) that is disproportionate to the findings',
      '6c20.persistent_course':
        'The symptoms and excessive preoccupation are persistent (on most days over at least several months, on the order of ≥ 3 months)',
      '6c20.mild':
        'Mild: some preoccupation with the symptoms but no substantial impairment of functioning',
      '6c20.moderate':
        'Moderate: marked preoccupation with clear impairment in some areas of functioning',
      '6c20.severe':
        'Severe: pervasive, intrusive preoccupation with severe impairment in many areas (e.g. extensive loss of occupational/social functioning)',
      '6c20.exclude_other':
        'The symptoms and associated preoccupation are not better explained by another mental disorder (e.g. panic disorder, depressive disorder, illness-anxiety disorder)',
    },
  },
  hypochondriasis_health_anxiety: {
    name: 'Hypochondriacal disorder (illness-anxiety disorder)',
    differentials: [
      'Somatoform/bodily distress disorder (symptom burden rather than illness anxiety)',
      'Generalised anxiety disorder',
      'Obsessive-compulsive disorder',
      'Delusional disorder of the hypochondriacal type (lack of insight)',
    ],
    groups: {
      'f45_2.core': 'Core: persistent conviction of/anxiety about illness',
      'f45_2.exclusions': 'Exclusions',
      '6b23.core': 'Core: persistent preoccupation with/fear of serious illness',
      '6b23.behaviour': 'Obsessive-compulsive-spectrum behaviour (at least one)',
      '6b23.persistence': 'Persistence and resistance to reassurance',
      '6b23.exclusions': 'Exclusions',
    },
    criteria: {
      'f45_2.disease_conviction':
        'Persistent conviction or marked fear of suffering from one or more serious physical illnesses, based on the misinterpretation of normal bodily sensations',
      'f45_2.reassurance_resistant':
        'The fears persist despite normal investigation results and medical reassurance',
      'f45_2.exclude_delusional':
        'The conviction of illness does not reach a delusional degree and is not better explained by a schizophrenic or affective disorder',
      '6b23.illness_preoccupation':
        'Persistent preoccupation with the fear or conviction of having, or developing, one or more serious, progressive or life-threatening illnesses',
      '6b23.checking_reassurance':
        'Repetitive, excessive health-related behaviour (e.g. repeatedly examining one’s own body, frequent medical visits, persistent reassurance-seeking)',
      '6b23.maladaptive_avoidance':
        'Maladaptive avoidance (e.g. avoiding medical appointments, hospitals or illness-related information) out of fear of having the concern confirmed',
      '6b23.reassurance_resistant':
        'The preoccupation or fear persists for at least several months and remains despite appropriate medical assessment and reassurance',
      '6b23.exclude_other':
        'The conviction of illness does not reach a delusional degree and is not better explained by a bodily distress disorder, a depressive or another mental disorder',
    },
  },
  complex_ptsd: {
    name: 'Complex post-traumatic stress disorder',
    differentials: [
      'Post-traumatic stress disorder (without disturbances of self-organisation; ICD-11 6B40)',
      'Emotionally unstable (borderline) personality disorder',
      'Enduring personality change after catastrophic experience (ICD-10 F62.0)',
      'Depressive or dissociative disorder with trauma reference',
    ],
    groups: {
      '6b41.exposure': 'Stressor criterion: prolonged/repeated traumatisation',
      '6b41.ptsd_core': 'PTSD core clusters (all three required)',
      '6b41.dso': 'Disturbances in self-organisation (DSO — all three required)',
      '6b41.functional': 'Functional impairment',
      '6b41.exclusions': 'Exclusions',
    },
    criteria: {
      '6b41.prolonged_trauma':
        'Exposure to an extremely threatening or horrific event, usually prolonged or repeated and from which escape is difficult or impossible (e.g. ongoing domestic violence, torture, slavery, repeated childhood abuse)',
      '6b41.reexperiencing':
        'Re-experiencing the trauma in the present (vivid intrusive memories, flashbacks or nightmares), typically accompanied by fear or horror',
      '6b41.avoidance':
        'Avoidance of thoughts and memories, or of activities, situations or people that recall the trauma',
      '6b41.current_threat':
        'A persistent perception of heightened current threat (e.g. hypervigilance, an enhanced startle reaction)',
      '6b41.affect_dysregulation':
        'Severe and persistent affect dysregulation (e.g. heightened emotional reactivity, violent outbursts, emotional numbing or dissociative experiences under stress)',
      '6b41.negative_self_concept':
        'A persistently negative self-concept, with beliefs of worthlessness, failure or diminishment, often accompanied by deep feelings of shame, guilt or failure',
      '6b41.relationship_disturbance':
        'Persistent difficulties in sustaining relationships and feeling close to others (e.g. avoidance of relationships, a sense of distance or little interest in relationships)',
      '6b41.functional_impairment':
        'Marked impairment in personal, family, social, educational, occupational or other important areas of functioning',
      '6b41.exclude_other':
        'The symptomatology is not better explained by another mental disorder; if disturbances of self-organisation are absent, PTSD (6B40) should be coded instead',
    },
  },
}
