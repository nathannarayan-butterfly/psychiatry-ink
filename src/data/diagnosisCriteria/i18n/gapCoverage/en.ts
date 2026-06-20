import type { DisorderTranslationMap } from '../types'

export const gapEN: DisorderTranslationMap = {
  "dementia_other_diseases_stem": {
    "name": "Dementia in other diseases classified elsewhere",
    "differentials": [
      "Dementia in Alzheimer disease (F00)",
      "Vascular dementia (F01)",
      "Primary psychiatric disorder with cognitive symptoms",
      "Delirium (acute onset, fluctuating level of consciousness)"
    ],
    "groups": {
      "f02.core": "Core criteria",
      "f02.exclusions": "Exclusions"
    },
    "criteria": {
      "f02.core_symptoms": "Dementia syndrome",
      "f02.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "dementia_cjd": {
    "name": "Dementia in Creutzfeldt-Jakob disease",
    "differentials": [
      "Rapidly progressive dementia of other aetiology",
      "Delirium",
      "Depressive pseudodementia"
    ],
    "groups": {
      "f02_1.cognition": "Dementia syndrome",
      "f02_1.aetiology": "Aetiological attribution",
      "f02_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f02_1.memory_decline": "Decline of memory and/or other cognitive functions impairing activities of daily living",
      "f02_1.cognitive_decline": "Decline in higher cognitive functions relative to the previous level of performance",
      "f02_1.functional_impact": "Impairment of daily-living activities due to cognitive decline",
      "f02_1.underlying_disease": "Evidence or reasoned assumption of Creutzfeldt-Jakob disease (prion disease) as the causative underlying condition",
      "f02_1.exclude_delirium": "No clouding of consciousness suggestive of delirium"
    }
  },
  "dementia_huntington": {
    "name": "Dementia in Huntington disease",
    "differentials": [
      "Other neurodegenerative dementia",
      "Drug-induced chorea",
      "Tardive dyskinesia"
    ],
    "groups": {
      "f02_2.cognition": "Dementia syndrome",
      "f02_2.aetiology": "Aetiological attribution",
      "f02_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f02_2.memory_decline": "Decline of memory and/or other cognitive functions impairing activities of daily living",
      "f02_2.cognitive_decline": "Decline in higher cognitive functions relative to the previous level of performance",
      "f02_2.functional_impact": "Impairment of daily-living activities due to cognitive decline",
      "f02_2.underlying_disease": "Evidence or reasoned assumption of Huntington disease as the causative underlying condition",
      "f02_2.exclude_delirium": "No clouding of consciousness suggestive of delirium"
    }
  },
  "dementia_parkinson": {
    "name": "Dementia in Parkinson disease",
    "differentials": [
      "Dementia with Lewy bodies",
      "Vascular dementia",
      "Depressive pseudodementia"
    ],
    "groups": {
      "f02_3.cognition": "Dementia syndrome",
      "f02_3.aetiology": "Aetiological attribution",
      "f02_3.exclusions": "Exclusions"
    },
    "criteria": {
      "f02_3.memory_decline": "Decline of memory and/or other cognitive functions impairing activities of daily living",
      "f02_3.cognitive_decline": "Decline in higher cognitive functions relative to the previous level of performance",
      "f02_3.functional_impact": "Impairment of daily-living activities due to cognitive decline",
      "f02_3.underlying_disease": "Evidence or reasoned assumption of Parkinson disease as the causative underlying condition",
      "f02_3.exclude_delirium": "No clouding of consciousness suggestive of delirium"
    }
  },
  "dementia_hiv": {
    "name": "Dementia in human immunodeficiency virus [HIV] disease",
    "differentials": [
      "HIV-associated neurocognitive disorder without dementia",
      "Opportunistic CNS infection",
      "Substance-induced cognitive disorder"
    ],
    "groups": {
      "f02_4.cognition": "Dementia syndrome",
      "f02_4.aetiology": "Aetiological attribution",
      "f02_4.exclusions": "Exclusions"
    },
    "criteria": {
      "f02_4.memory_decline": "Decline of memory and/or other cognitive functions impairing activities of daily living",
      "f02_4.cognitive_decline": "Decline in higher cognitive functions relative to the previous level of performance",
      "f02_4.functional_impact": "Impairment of daily-living activities due to cognitive decline",
      "f02_4.underlying_disease": "Evidence or reasoned assumption of HIV infection as the causative underlying condition",
      "f02_4.exclude_delirium": "No clouding of consciousness suggestive of delirium"
    }
  },
  "unspecified_dementia": {
    "name": "Unspecified dementia",
    "differentials": [
      "Dementia in Alzheimer disease (F00)",
      "Vascular dementia (F01)",
      "Dementia in other diseases classified elsewhere (F02)",
      "Delirium"
    ],
    "groups": {
      "f03.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f03.exclusions": "Exclusions"
    },
    "criteria": {
      "f03.core_symptoms": "Dementia syndrome",
      "f03.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f03.exclude_other": "Dementia syndrome"
    }
  },
  "organic_mental_disorders_stem": {
    "name": "Other mental disorders due to brain damage and dysfunction and to physical disease",
    "differentials": [
      "Primary mental disorder without organic cause",
      "Substance- or medication-induced mental disorder",
      "Delirium (F05)"
    ],
    "groups": {
      "f06.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f06.exclusions": "Exclusions"
    },
    "criteria": {
      "f06.core_symptoms": "Mental symptomatology (outside the organic syndromes already recorded separately) attributed to demonstrated or probable brain damage, brain dysfunction or physical disease",
      "f06.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f06.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "organic_catatonic_disorder": {
    "name": "Organic catatonic disorder",
    "differentials": [
      "Catatonia in schizophrenia",
      "Neuroleptic malignant syndrome",
      "Delirium"
    ],
    "groups": {
      "f06_1.syndrome": "Clinical syndrome",
      "f06_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f06_1.clinical_picture": "Catatonia (e.g. stupor, mutism, negativism, waxy flexibility, stereotypies, mannerisms) in the context of an organic cause",
      "f06_1.organic_cause": "Evidence or reasonable assumption of a causal physical, cerebral or systemic disease that can explain the mental syndrome",
      "f06_1.exclude_primary": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "organic_anxiety_disorder": {
    "name": "Organic anxiety disorder",
    "differentials": [
      "Generalized anxiety disorder (F41.1)",
      "Panic disorder (F41.0)",
      "Substance-induced anxiety"
    ],
    "groups": {
      "f06_4.syndrome": "Clinical syndrome",
      "f06_4.exclusions": "Exclusions"
    },
    "criteria": {
      "f06_4.clinical_picture": "Marked anxiety symptomatology attributed to an organic cause",
      "f06_4.organic_cause": "Evidence or reasonable assumption of a causal physical, cerebral or systemic disease that can explain the mental syndrome",
      "f06_4.exclude_primary": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "organic_dissociative_disorder": {
    "name": "Organic dissociative disorder",
    "differentials": [
      "Dissociative disorders (F44)",
      "PTSD",
      "Substance-induced dissociation"
    ],
    "groups": {
      "f06_5.syndrome": "Clinical syndrome",
      "f06_5.exclusions": "Exclusions"
    },
    "criteria": {
      "f06_5.clinical_picture": "Dissociative symptomatology (e.g. depersonalization, derealization, amnesia, identity disturbance) attributed to an organic cause",
      "f06_5.organic_cause": "Evidence or reasonable assumption of a causal physical, cerebral or systemic disease that can explain the mental syndrome",
      "f06_5.exclude_primary": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "organic_mental_disorder_other": {
    "name": "Other specified mental disorders due to brain damage and dysfunction and to physical disease",
    "differentials": [
      "Specific organic syndromes (F06.0–F06.7)",
      "Primary mental disorder"
    ],
    "groups": {
      "f06_8.core": "Core criteria",
      "f06_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f06_8.core_symptoms": "Specified mental symptomatology attributed to brain damage, brain dysfunction or physical disease that does not fit any more specific F06 subcategory",
      "f06_8.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "organic_mental_disorder_unspecified": {
    "name": "Unspecified mental disorder due to brain damage and dysfunction and to physical disease",
    "differentials": [
      "Specific organic syndromes (F06.0–F06.8)",
      "Primary mental disorder"
    ],
    "groups": {
      "f06_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f06_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f06_9.core_symptoms": "Mental symptomatology attributed to an organic cause without any more specific F06 subcategory applying",
      "f06_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f06_9.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "postencephalitic_syndrome": {
    "name": "Postencephalitic syndrome",
    "differentials": [
      "Organic personality disorder (F07.0)",
      "Dementia",
      "Chronic fatigue syndrome"
    ],
    "groups": {
      "f07_1.core": "Core criteria",
      "f07_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f07_1.core_symptoms": "Persistent mental or behavioural changes (e.g. fatigue, affective lability, impaired concentration, sleep disturbance) following encephalitis or a comparable cerebral infection or inflammation",
      "f07_1.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "organic_personality_disorder_other": {
    "name": "Other organic personality and behavioural disorders due to brain disease, damage and dysfunction",
    "differentials": [
      "Organic personality disorder (F07.0)",
      "Primary personality disorder (F60)"
    ],
    "groups": {
      "f07_8.core": "Core criteria",
      "f07_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f07_8.core_symptoms": "Specified change of personality and behaviour attributed to an organic cause that does not fit any more specific F07 subcategory",
      "f07_8.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "organic_personality_disorder_unspecified": {
    "name": "Unspecified organic personality and behavioural disorder due to brain disease, damage and dysfunction",
    "differentials": [
      "Organic personality disorder (F07.0)",
      "Primary personality disorder (F60)"
    ],
    "groups": {
      "f07_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f07_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f07_9.core_symptoms": "Change of personality and behaviour attributed to an organic cause, without further specification",
      "f07_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f07_9.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "unspecified_organic_mental_disorder": {
    "name": "Unspecified organic or symptomatic mental disorder",
    "differentials": [
      "Specific organic syndromes (F00–F07)",
      "Primary mental disorder",
      "Substance-related disorder"
    ],
    "groups": {
      "f09.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f09.exclusions": "Exclusions"
    },
    "criteria": {
      "f09.core_symptoms": "Mental symptomatology with evidence of an organic or symptomatic cause that cannot be assigned to any more specific F0 category",
      "f09.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f09.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "stimulants_substance_stem": {
    "name": "Mental and behavioural disorders due to use of other stimulants, including caffeine",
    "differentials": [
      "Stimulant dependence (F15.2)",
      "Stimulant intoxication (F15.0)",
      "Primary mental disorder unrelated to substance use"
    ],
    "groups": {
      "f15.core": "Core criteria",
      "f15.exclusions": "Exclusions"
    },
    "criteria": {
      "f15.core_symptoms": "Clinically significant mental or behavioural disorder related to use of other stimulants (including caffeine) where no more specific F15 subcategory is specified",
      "f15.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "multiple_substances_stem": {
    "name": "Mental and behavioural disorders due to multiple drug use and use of other psychoactive substances",
    "differentials": [
      "Dependence on multiple substances (F19.2)",
      "Single-substance disorders (F10–F18)",
      "Primary mental disorder unrelated to substance use"
    ],
    "groups": {
      "f19.core": "Core criteria",
      "f19.exclusions": "Exclusions"
    },
    "criteria": {
      "f19.core_symptoms": "Clinically significant mental or behavioural disorder related to multiple drug use or other psychoactive substances where no more specific F19 subcategory is specified",
      "f19.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "persistent_affective_disorders_stem": {
    "name": "Persistent mood [affective] disorders",
    "differentials": [
      "Cyclothymia (F34.0)",
      "Dysthymia (F34.1)",
      "Recurrent depressive disorder (F33)",
      "Bipolar disorder (F31)"
    ],
    "groups": {
      "f34.core": "Core criteria",
      "f34.exclusions": "Exclusions"
    },
    "criteria": {
      "f34.core_symptoms": "Persistent affective symptomatology over a prolonged period that does not reach the severity of a depressive or manic episode",
      "f34.exclude_other": "The symptomatology is not attributable to an organic mental disorder or substance use"
    }
  },
  "persistent_affective_disorder_unspecified": {
    "name": "Persistent affective disorder, unspecified",
    "differentials": [
      "Cyclothymia (F34.0)",
      "Dysthymia (F34.1)",
      "Other persistent mood disorder (F34.8)"
    ],
    "groups": {
      "f34_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f34_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f34_9.core_symptoms": "Persistent affective symptomatology that cannot be assigned to any more specific F34 subcategory",
      "f34_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f34_9.exclude_other": "The symptomatology is not attributable to an organic mental disorder or substance use"
    }
  },
  "phobic_anxiety_disorders_stem": {
    "name": "Phobic anxiety disorders",
    "differentials": [
      "Agoraphobia (F40.0)",
      "Social phobia (F40.1)",
      "Specific phobia (F40.2)",
      "Panic disorder (F41.0)"
    ],
    "groups": {
      "f40.core": "Core criteria",
      "f40.exclusions": "Exclusions"
    },
    "criteria": {
      "f40.core_symptoms": "Marked situational or specific anxiety with avoidance, or endurance only under distress",
      "f40.exclude_other": "The anxiety symptomatology is not better explained by an organic disorder or substance effect alone"
    }
  },
  "phobic_anxiety_disorder_other": {
    "name": "Other phobic anxiety disorders",
    "differentials": [
      "Agoraphobia (F40.0)",
      "Social phobia (F40.1)",
      "Specific phobia (F40.2)"
    ],
    "groups": {
      "f40_8.core": "Core criteria",
      "f40_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f40_8.core_symptoms": "Specified phobic anxiety disorder that does not fit any of the more specific F40 subcategories",
      "f40_8.exclude_other": "The anxiety symptomatology is not better explained by an organic disorder or substance effect alone"
    }
  },
  "phobic_anxiety_disorder_unspecified": {
    "name": "Phobic anxiety disorder, unspecified",
    "differentials": [
      "Agoraphobia (F40.0)",
      "Social phobia (F40.1)",
      "Specific phobia (F40.2)"
    ],
    "groups": {
      "f40_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f40_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f40_9.core_symptoms": "Phobic anxiety symptomatology without further specification of the phobia",
      "f40_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f40_9.exclude_other": "The anxiety symptomatology is not better explained by an organic disorder or substance effect alone"
    }
  },
  "other_anxiety_disorders_stem": {
    "name": "Other anxiety disorders",
    "differentials": [
      "Panic disorder (F41.0)",
      "Generalized anxiety disorder (F41.1)",
      "Mixed anxiety and depressive disorder (F41.2)"
    ],
    "groups": {
      "f41.core": "Core criteria",
      "f41.exclusions": "Exclusions"
    },
    "criteria": {
      "f41.core_symptoms": "Clinically significant anxiety symptomatology not assigned to any more specific F41 subcategory",
      "f41.exclude_other": "The anxiety symptomatology is not better explained by an organic disorder or substance effect alone"
    }
  },
  "mixed_anxiety_disorder_other": {
    "name": "Other mixed anxiety disorders",
    "differentials": [
      "Mixed anxiety and depressive disorder (F41.2)",
      "Generalized anxiety disorder (F41.1)"
    ],
    "groups": {
      "f41_3.core": "Core criteria",
      "f41_3.exclusions": "Exclusions"
    },
    "criteria": {
      "f41_3.core_symptoms": "Mixed anxiety symptomatology with overlapping anxiety patterns that does not fit any more specific F41 subcategory",
      "f41_3.exclude_other": "The symptomatology is not better explained by an organic disorder or substance effect alone"
    }
  },
  "anxiety_disorder_other": {
    "name": "Other specified anxiety disorders",
    "differentials": [
      "Panic disorder (F41.0)",
      "Generalized anxiety disorder (F41.1)",
      "Phobic disorders (F40)"
    ],
    "groups": {
      "f41_8.core": "Core criteria",
      "f41_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f41_8.core_symptoms": "Specified anxiety disorder that does not fit any of the more specific F41 subcategories",
      "f41_8.exclude_other": "The anxiety symptomatology is not better explained by an organic disorder or substance effect alone"
    }
  },
  "anxiety_disorder_unspecified": {
    "name": "Anxiety disorder, unspecified",
    "differentials": [
      "Panic disorder (F41.0)",
      "Generalized anxiety disorder (F41.1)",
      "Phobic disorders (F40)"
    ],
    "groups": {
      "f41_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f41_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f41_9.core_symptoms": "Clinically significant anxiety symptomatology without further specification",
      "f41_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f41_9.exclude_other": "The anxiety symptomatology is not better explained by an organic disorder or substance effect alone"
    }
  },
  "stress_reaction_disorders_stem": {
    "name": "Reaction to severe stress, and adjustment disorders",
    "differentials": [
      "Acute stress reaction (F43.0)",
      "PTSD (F43.1)",
      "Adjustment disorder (F43.2)"
    ],
    "groups": {
      "f43.core": "Core criteria",
      "f43.exclusions": "Exclusions"
    },
    "criteria": {
      "f43.core_symptoms": "Psychological reaction to an identifiable severe stressor with clinically significant symptomatology",
      "f43.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "stress_reaction_other": {
    "name": "Other reactions to severe stress",
    "differentials": [
      "Acute stress reaction (F43.0)",
      "PTSD (F43.1)",
      "Adjustment disorder (F43.2)"
    ],
    "groups": {
      "f43_8.core": "Core criteria",
      "f43_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f43_8.core_symptoms": "Specified reaction to severe stress that does not fit any of the more specific F43 subcategories",
      "f43_8.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "stress_reaction_unspecified": {
    "name": "Reaction to severe stress, unspecified",
    "differentials": [
      "Acute stress reaction (F43.0)",
      "PTSD (F43.1)",
      "Adjustment disorder (F43.2)"
    ],
    "groups": {
      "f43_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f43_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f43_9.core_symptoms": "Reaction to severe stress without further specification",
      "f43_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f43_9.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "other_neurotic_disorders_stem": {
    "name": "Other neurotic disorders",
    "differentials": [
      "Neurasthenia (F48.0)",
      "Depersonalization/derealization (F48.1)",
      "Dissociative disorders (F44)"
    ],
    "groups": {
      "f48.core": "Core criteria",
      "f48.exclusions": "Exclusions"
    },
    "criteria": {
      "f48.core_symptoms": "Neurotic symptomatology not assigned to any more specific F4 subcategory",
      "f48.exclude_other": "The symptomatology is not better explained by an organic disorder or substance effect alone"
    }
  },
  "neurasthenia": {
    "name": "Neurasthenia",
    "differentials": [
      "Burnout",
      "Depressive episode",
      "Chronic fatigue syndrome",
      "Somatic cause of fatigue"
    ],
    "groups": {
      "f48_0.core": "Core criteria",
      "f48_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f48_0.core_symptoms": "Persistent fatigue with reduced performance and autonomic complaints following mental or physical exertion",
      "f48_0.exclude_other": "The fatigue is not better explained by a somatic illness or a depressive episode alone"
    }
  },
  "depersonalization_derealization_disorder": {
    "name": "Depersonalization-derealization disorder",
    "differentials": [
      "Dissociative disorders (F44)",
      "Panic disorder",
      "Substance-induced dissociation",
      "Schizophrenia"
    ],
    "groups": {
      "f48_1.core": "Core criteria",
      "f48_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f48_1.core_symptoms": "Recurrent or persistent depersonalization and/or derealization experiences with preserved reality testing",
      "f48_1.exclude_other": "The experiences are not better explained by another mental disorder, substance effect or organic cause"
    }
  },
  "neurotic_disorder_other": {
    "name": "Other specified neurotic disorders",
    "differentials": [
      "Neurasthenia (F48.0)",
      "Depersonalization/derealization (F48.1)"
    ],
    "groups": {
      "f48_8.core": "Core criteria",
      "f48_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f48_8.core_symptoms": "Specified neurotic disorder that does not fit any of the more specific F48 subcategories",
      "f48_8.exclude_other": "The symptomatology is not better explained by an organic disorder or substance effect alone"
    }
  },
  "neurotic_disorder_unspecified": {
    "name": "Neurotic disorder, unspecified",
    "differentials": [
      "Neurasthenia (F48.0)",
      "Depersonalization/derealization (F48.1)"
    ],
    "groups": {
      "f48_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f48_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f48_9.core_symptoms": "Neurotic symptomatology without further specification",
      "f48_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f48_9.exclude_other": "The symptomatology is not better explained by an organic disorder or substance effect alone"
    }
  },
  "eating_disorders_stem": {
    "name": "Eating disorders",
    "differentials": [
      "Anorexia nervosa (F50.0)",
      "Bulimia nervosa (F50.2)",
      "Binge-eating disorder"
    ],
    "groups": {
      "f50.core": "Core criteria",
      "f50.exclusions": "Exclusions"
    },
    "criteria": {
      "f50.core_symptoms": "Clinically significant disturbance of eating behaviour or body perception related to eating",
      "f50.exclude_other": "The symptomatology is not better explained by a somatic illness or a primary affective disorder alone"
    }
  },
  "vomiting_psychological": {
    "name": "Vomiting associated with other psychological disturbances",
    "differentials": [
      "Bulimia nervosa",
      "Gastrointestinal cause",
      "Hyperemesis gravidarum"
    ],
    "groups": {
      "f50_5.core": "Core criteria",
      "f50_5.exclusions": "Exclusions"
    },
    "criteria": {
      "f50_5.core_symptoms": "Repeated vomiting without sufficient somatic explanation, attributed to a mental disorder",
      "f50_5.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "eating_disorder_other": {
    "name": "Other eating disorders",
    "differentials": [
      "Anorexia nervosa (F50.0)",
      "Bulimia nervosa (F50.2)",
      "Binge-eating disorder"
    ],
    "groups": {
      "f50_8.core": "Core criteria",
      "f50_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f50_8.core_symptoms": "Specified eating disorder that does not fit any of the more specific F50 subcategories",
      "f50_8.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "eating_disorder_unspecified": {
    "name": "Eating disorder, unspecified",
    "differentials": [
      "Anorexia nervosa (F50.0)",
      "Bulimia nervosa (F50.2)"
    ],
    "groups": {
      "f50_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f50_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f50_9.core_symptoms": "Disturbance of eating behaviour without further specification",
      "f50_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f50_9.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "nonorganic_sleep_disorders_stem": {
    "name": "Nonorganic sleep disorders",
    "differentials": [
      "Insomnia (F51.0)",
      "Nightmares (F51.5)",
      "Sleep terrors (F51.4)",
      "Organic sleep disorder"
    ],
    "groups": {
      "f51.core": "Core criteria",
      "f51.exclusions": "Exclusions"
    },
    "criteria": {
      "f51.core_symptoms": "Clinically significant sleep disturbance without sufficient organic explanation",
      "f51.exclude_other": "The sleep disturbance is not better explained by a somatic illness or substance effect alone"
    }
  },
  "nonorganic_hypersomnia": {
    "name": "Nonorganic hypersomnia",
    "differentials": [
      "Insomnia (F51.0)",
      "Depressive episode with hypersomnia",
      "Narcolepsy",
      "Sleep apnoea"
    ],
    "groups": {
      "f51_1.core": "Core criteria",
      "f51_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f51_1.core_symptoms": "Persistent excessive daytime sleepiness or prolonged sleep duration despite adequate opportunity to sleep",
      "f51_1.exclude_other": "The hypersomnia is not better explained by a somatic illness or substance effect alone"
    }
  },
  "sleep_wake_schedule_disorder": {
    "name": "Nonorganic disorder of the sleep-wake schedule",
    "differentials": [
      "Insomnia (F51.0)",
      "Shift work",
      "Jet lag",
      "Organic sleep disorder"
    ],
    "groups": {
      "f51_2.core": "Core criteria",
      "f51_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f51_2.core_symptoms": "Persistent disturbance of the sleep-wake schedule with sleep onset or wake time outside the desired window and associated impairment",
      "f51_2.exclude_other": "The disorder is not better explained by a somatic illness or substance effect alone"
    }
  },
  "sleep_disorder_other": {
    "name": "Other nonorganic sleep disorders",
    "differentials": [
      "Insomnia (F51.0)",
      "Hypersomnia (F51.1)",
      "Nightmares (F51.5)"
    ],
    "groups": {
      "f51_8.core": "Core criteria",
      "f51_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f51_8.core_symptoms": "Specified non-organic sleep disorder that does not fit any of the more specific F51 subcategories",
      "f51_8.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "sleep_disorder_unspecified": {
    "name": "Nonorganic sleep disorder, unspecified",
    "differentials": [
      "Insomnia (F51.0)",
      "Hypersomnia (F51.1)"
    ],
    "groups": {
      "f51_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f51_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f51_9.core_symptoms": "Non-organic sleep disorder without further specification",
      "f51_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f51_9.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "psychological_factors_somatic": {
    "name": "Psychological and behavioural factors associated with disorders or diseases classified elsewhere",
    "differentials": [
      "Somatoform disorder (F45)",
      "Physical stress-related disorder",
      "Primary mental disorder"
    ],
    "groups": {
      "f54.core": "Core criteria",
      "f54.exclusions": "Exclusions"
    },
    "criteria": {
      "f54.core_symptoms": "Psychological or behavioural factors (e.g. cognitions, emotions, illness behaviour) that adversely influence the course, treatment or prognosis of a somatic disease classified elsewhere",
      "f54.exclude_other": "The somatic illness is not caused by the psychological factors alone"
    }
  },
  "non_dependence_substance_abuse": {
    "name": "Abuse of non-dependence-producing substances",
    "differentials": [
      "Substance dependence (F1x.2)",
      "Eating disorder with laxative or diuretic misuse"
    ],
    "groups": {
      "f55.core": "Core criteria",
      "f55.exclusions": "Exclusions",
      "6c4h_1.pattern": "Sustained pattern of use (episodic or continuous, typically over ≥ 12 months — or ≥ 1 month if continuous)",
      "6c4h_1.harm": "Demonstrable harm (at least one of the following areas)",
      "6c4h_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f55.core_symptoms": "Repeated use of non-dependence-producing substances (e.g. laxatives, analgesics, vitamins, herbal preparations) with mental or physical harm, without meeting dependence criteria",
      "f55.exclude_other": "Criteria for substance dependence are not met",
      "6c4h_1.use_pattern": "A repeated or sustained pattern of non-psychoactive substance use is documented",
      "6c4h_1.harm_self": "Clinically significant damage to the physical or mental health of the person as a result of use (including use- or intoxication-related behaviour)",
      "6c4h_1.harm_others": "Harm to the health of others resulting from the person's use- or intoxication-related behaviour (e.g. injuries to third parties, harm in traffic) — an ICD-11-specific extension",
      "6c4h_1.exclude_dependence": "The criteria for dependence (6C4H.2) are not met"
    }
  },
  "unspecified_behavioural_syndrome": {
    "name": "Unspecified behavioural syndromes associated with physiological disturbances and physical factors",
    "differentials": [
      "Eating disorders (F50)",
      "Sleep disorders (F51)",
      "Sexual dysfunctions (F52)"
    ],
    "groups": {
      "f59.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f59.exclusions": "Exclusions"
    },
    "criteria": {
      "f59.core_symptoms": "Behavioural syndrome with physiological disturbance and physical factors that cannot be assigned to any more specific F5 category",
      "f59.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f59.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "enduring_personality_change_stem": {
    "name": "Enduring personality changes, not attributable to brain damage and disease",
    "differentials": [
      "Organic personality disorder (F07)",
      "PTSD (F43.1)",
      "Primary personality disorder (F60)"
    ],
    "groups": {
      "f62.core": "Core criteria",
      "f62.exclusions": "Exclusions"
    },
    "criteria": {
      "f62.core_symptoms": "Enduring, pervasive change of personality following adverse life circumstances, without evidence of an organic cause",
      "f62.exclude_other": "The change is not a consequence of brain damage or disease"
    }
  },
  "personality_change_catastrophic": {
    "name": "Enduring personality change after catastrophic experience",
    "differentials": [
      "PTSD (F43.1)",
      "Adjustment disorder (F43.2)",
      "Organic personality disorder (F07)"
    ],
    "groups": {
      "f62_0.core": "Core criteria",
      "f62_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f62_0.core_symptoms": "Enduring change of personality and behaviour following an extremely stressful experience (e.g. prolonged captivity, disaster, war) that goes beyond an acute stress reaction",
      "f62_0.exclude_other": "The change is not a consequence of brain damage or disease and is not better explained by PTSD alone"
    }
  },
  "habit_impulse_disorders_stem": {
    "name": "Habit and impulse disorders",
    "differentials": [
      "Pathological gambling (F63.0)",
      "Pyromania (F63.1)",
      "Kleptomania (F63.2)",
      "Trichotillomania (F63.3)"
    ],
    "groups": {
      "f63.core": "Core criteria",
      "f63.exclusions": "Exclusions"
    },
    "criteria": {
      "f63.core_symptoms": "Repeated, poorly controllable behaviour with an inner urge and subsequent relief or gratification",
      "f63.exclude_other": "The behaviour is not better explained by another mental disorder or substance effect"
    }
  },
  "habit_impulse_disorder_other": {
    "name": "Other habit and impulse disorders",
    "differentials": [
      "Pathological gambling (F63.0)",
      "Pyromania (F63.1)",
      "Kleptomania (F63.2)"
    ],
    "groups": {
      "f63_8.core": "Core criteria",
      "f63_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f63_8.core_symptoms": "Specified habit or impulse disorder that does not fit any of the more specific F63 subcategories",
      "f63_8.exclude_other": "The behaviour is not better explained by another mental disorder"
    }
  },
  "habit_impulse_disorder_unspecified": {
    "name": "Habit and impulse disorder, unspecified",
    "differentials": [
      "Pathological gambling (F63.0)",
      "Pyromania (F63.1)",
      "Kleptomania (F63.2)"
    ],
    "groups": {
      "f63_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f63_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f63_9.core_symptoms": "Habit or impulse disorder without further specification",
      "f63_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f63_9.exclude_other": "The behaviour is not better explained by another mental disorder"
    }
  },
  "gender_identity_disorders_stem": {
    "name": "Gender identity disorders",
    "differentials": [
      "Gender dysphoria in adulthood (F64.0)",
      "Gender dysphoria in childhood (F64.2)",
      "Transvestism without gender dysphoria"
    ],
    "groups": {
      "f64.core": "Core criteria",
      "f64.exclusions": "Exclusions"
    },
    "criteria": {
      "f64.core_symptoms": "Persistent incongruence between experienced gender and gender assigned at birth, with distress and/or functional impairment",
      "f64.exclude_other": "The incongruence is not better explained by another mental disorder alone"
    }
  },
  "gender_dysphoria_adult": {
    "name": "Gender dysphoria in adolescents and adults",
    "differentials": [
      "Gender dysphoria in childhood (F64.2)",
      "Transvestism (F64.1)",
      "Body dysmorphic disorder"
    ],
    "groups": {
      "f64_0.core": "Core criteria",
      "f64_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f64_0.core_symptoms": "Persistent incongruence between experienced gender and gender assigned at birth, with a desire for gender-affirming measures and distress and/or functional impairment",
      "f64_0.exclude_other": "The incongruence is not better explained by another mental disorder alone"
    }
  },
  "dual_role_transvestism": {
    "name": "Dual-role transvestism",
    "differentials": [
      "Gender dysphoria (F64.0)",
      "Fetishistic transvestism (F65.1)"
    ],
    "groups": {
      "f64_1.core": "Core criteria",
      "f64_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f64_1.core_symptoms": "Repeated wearing of clothes of the other gender in order to temporarily experience both male and female identity, without desire for permanent gender reassignment and without primary sexual arousal from the cross-dressing",
      "f64_1.exclude_other": "The behaviour is not better explained by gender dysphoria or a primary fetishism"
    }
  },
  "gender_dysphoria_childhood": {
    "name": "Gender dysphoria in childhood",
    "differentials": [
      "Gender-atypical behaviour without dysphoria",
      "Gender dysphoria in adulthood (F64.0)"
    ],
    "groups": {
      "f64_2.core": "Core criteria",
      "f64_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f64_2.core_symptoms": "Persistent incongruence between experienced gender and gender assigned at birth, with a marked wish to be, or to be treated as, the other gender, and distress and/or functional impairment",
      "f64_2.exclude_other": "The incongruence is not better explained by another mental disorder alone"
    }
  },
  "gender_identity_disorder_other": {
    "name": "Other gender identity disorders",
    "differentials": [
      "Gender dysphoria (F64.0/F64.2)",
      "Dual-role transvestism (F64.1)"
    ],
    "groups": {
      "f64_8.core": "Core criteria",
      "f64_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f64_8.core_symptoms": "Specified gender identity disorder that does not fit any of the more specific F64 subcategories",
      "f64_8.exclude_other": "The disorder is not better explained by another mental disorder alone"
    }
  },
  "gender_identity_disorder_unspecified": {
    "name": "Gender identity disorder, unspecified",
    "differentials": [
      "Gender dysphoria (F64.0/F64.2)"
    ],
    "groups": {
      "f64_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f64_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f64_9.core_symptoms": "Gender identity disorder without further specification",
      "f64_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f64_9.exclude_other": "The disorder is not better explained by another mental disorder alone"
    }
  },
  "sexual_preference_disorders_stem": {
    "name": "Disorders of sexual preference",
    "differentials": [
      "Fetishism (F65.0)",
      "Exhibitionism (F65.2)",
      "Voyeurism (F65.3)",
      "Paedophilia (F65.4)"
    ],
    "groups": {
      "f65.core": "Core criteria",
      "f65.exclusions": "Exclusions"
    },
    "criteria": {
      "f65.core_symptoms": "Recurrent, intensified sexual fantasies, urges or behaviours involving atypical sexual preferences that lead to distress or impairment, or pose a risk of harm to others",
      "f65.exclude_other": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "fetishism": {
    "name": "Fetishism",
    "differentials": [
      "Fetishistic transvestism (F65.1)",
      "Normophilic sexual preference"
    ],
    "groups": {
      "f65_0.preference": "Sexual preference and behaviour",
      "f65_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_0.recurrent_preference": "Recurrent, intense sexual arousal involving inanimate objects or specific body parts (other than clothing of the other gender), with repeated behaviour or fantasies",
      "f65_0.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_0.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "fetishistic_transvestism": {
    "name": "Fetishistic transvestism",
    "differentials": [
      "Gender dysphoria (F64.0)",
      "Dual-role transvestism (F64.1)"
    ],
    "groups": {
      "f65_1.preference": "Sexual preference and behaviour",
      "f65_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_1.recurrent_preference": "Recurrent, intense sexual arousal involving wearing clothing of the other gender, with repeated behaviour or fantasies",
      "f65_1.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_1.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "exhibitionism": {
    "name": "Exhibitionism",
    "differentials": [
      "Voyeurism (F65.3)",
      "Antisocial personality disorder"
    ],
    "groups": {
      "f65_2.preference": "Sexual preference and behaviour",
      "f65_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_2.recurrent_preference": "Recurrent, intense sexual arousal involving exposing one's own genitalia to a non-consenting person, with repeated behaviour or fantasies",
      "f65_2.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_2.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "voyeurism": {
    "name": "Voyeurism",
    "differentials": [
      "Exhibitionism (F65.2)",
      "Stalking without sexual motivation"
    ],
    "groups": {
      "f65_3.preference": "Sexual preference and behaviour",
      "f65_3.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_3.recurrent_preference": "Recurrent, intense sexual arousal involving covertly observing unsuspecting or naked persons, with repeated behaviour or fantasies",
      "f65_3.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_3.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "paedophilia": {
    "name": "Paedophilia",
    "differentials": [
      "Hebephilia",
      "Antisocial personality disorder",
      "Intellectual developmental disorder with inappropriate sexual behaviour"
    ],
    "groups": {
      "f65_4.preference": "Sexual preference and behaviour",
      "f65_4.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_4.recurrent_preference": "Recurrent, intense sexual arousal involving prepubertal or early pubertal children (usually ≤ 13 years), with repeated behaviour or fantasies",
      "f65_4.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_4.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "sadomasochism": {
    "name": "Sadomasochism",
    "differentials": [
      "Consensual BDSM practices without distress",
      "Antisocial personality disorder"
    ],
    "groups": {
      "f65_5.preference": "Sexual preference and behaviour",
      "f65_5.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_5.recurrent_preference": "Recurrent, intense sexual arousal involving inflicting pain or humiliation, or experiencing pain or humiliation, with repeated behaviour or fantasies",
      "f65_5.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_5.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "multiple_sexual_preferences": {
    "name": "Multiple disorders of sexual preference",
    "differentials": [
      "Individual paraphilia (F65.0–F65.5)"
    ],
    "groups": {
      "f65_6.preference": "Sexual preference and behaviour",
      "f65_6.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_6.recurrent_preference": "Recurrent, intense sexual arousal involving multiple atypical sexual preferences (e.g. a combination of fetishism, exhibitionism and voyeurism), with repeated behaviour or fantasies",
      "f65_6.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_6.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "sexual_preference_disorder_other": {
    "name": "Other disorders of sexual preference",
    "differentials": [
      "Specific paraphilias (F65.0–F65.6)"
    ],
    "groups": {
      "f65_8.preference": "Sexual preference and behaviour",
      "f65_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_8.recurrent_preference": "Specified atypical sexual preference that does not fit any of the more specific F65 subcategories, with repeated behaviour or fantasies",
      "f65_8.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_8.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "sexual_preference_disorder_unspecified": {
    "name": "Disorder of sexual preference, unspecified",
    "differentials": [
      "Specific paraphilias (F65.0–F65.8)"
    ],
    "groups": {
      "f65_9.preference": "Sexual preference and behaviour",
      "f65_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_9.recurrent_preference": "Atypical sexual preference without further specification, with repeated behaviour or fantasies and distress or impairment",
      "f65_9.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_9.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "psychosexual_development_disorders_stem": {
    "name": "Psychological and behavioural disorders associated with sexual development and orientation",
    "differentials": [
      "Gender dysphoria (F64)",
      "Egodystonic sexual orientation (F66.1)",
      "Sexual relationship disorder (F66.2)"
    ],
    "groups": {
      "f66.core": "Core criteria",
      "f66.exclusions": "Exclusions"
    },
    "criteria": {
      "f66.core_symptoms": "Psychological or behavioural disorder related to sexual development or orientation, with distress and/or functional impairment",
      "f66.exclude_other": "Sexual orientation itself is not a disorder; only associated distress or functional disturbance is coded here"
    }
  },
  "sexual_maturation_disorder": {
    "name": "Sexual maturation disorder",
    "differentials": [
      "Normal pubertal development",
      "Gender dysphoria (F64)"
    ],
    "groups": {
      "f66_0.core": "Core criteria",
      "f66_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f66_0.core_symptoms": "Uncertainty, confusion or distress related to sexual maturation and the development of sexual identity",
      "f66_0.exclude_other": "The uncertainty is not better explained by another mental disorder alone"
    }
  },
  "egodystonic_sexual_orientation": {
    "name": "Egodystonic sexual orientation",
    "differentials": [
      "Internalized homo-/transphobia",
      "Depressive episode",
      "Adjustment disorder"
    ],
    "groups": {
      "f66_1.core": "Core criteria",
      "f66_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f66_1.core_symptoms": "Distress and/or functional impairment due to one's own sexual orientation, without a wish to change the orientation itself",
      "f66_1.exclude_other": "Sexual orientation itself is not a disorder; only the associated distress is captured here"
    }
  },
  "sexual_relationship_disorder": {
    "name": "Sexual relationship disorder",
    "differentials": [
      "Couple-therapy conflicts without a disorder",
      "Sexual dysfunction (F52)"
    ],
    "groups": {
      "f66_2.core": "Core criteria",
      "f66_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f66_2.core_symptoms": "Distress and/or functional impairment in the sexual relationship with a partner, independent of sexual orientation",
      "f66_2.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "psychosexual_development_disorder_other": {
    "name": "Other psychosexual development disorders",
    "differentials": [
      "Gender dysphoria (F64)",
      "Specific F66 subcategories"
    ],
    "groups": {
      "f66_8.core": "Core criteria",
      "f66_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f66_8.core_symptoms": "Specified psychosexual development disorder that does not fit any of the more specific F66 subcategories",
      "f66_8.exclude_other": "The disorder is not better explained by another mental disorder alone"
    }
  },
  "psychosexual_development_disorder_unspecified": {
    "name": "Psychosexual development disorder, unspecified",
    "differentials": [
      "Gender dysphoria (F64)",
      "Specific F66 subcategories"
    ],
    "groups": {
      "f66_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f66_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f66_9.core_symptoms": "Psychosexual development disorder without further specification",
      "f66_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f66_9.exclude_other": "The disorder is not better explained by another mental disorder alone"
    }
  },
  "other_adult_personality_behaviour_stem": {
    "name": "Other disorders of adult personality and behaviour",
    "differentials": [
      "Factitious disorder (F68.1)",
      "Elaboration of physical symptoms (F68.0)",
      "Primary personality disorder (F60)"
    ],
    "groups": {
      "f68.core": "Core criteria",
      "f68.exclusions": "Exclusions"
    },
    "criteria": {
      "f68.core_symptoms": "Disorder of adult personality or behaviour not assigned to any more specific F68 subcategory",
      "f68.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "elaboration_physical_symptoms": {
    "name": "Elaboration of physical symptoms for psychological reasons",
    "differentials": [
      "Somatoform disorder (F45)",
      "Factitious disorder (F68.1)",
      "Malingering"
    ],
    "groups": {
      "f68_0.core": "Core criteria",
      "f68_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f68_0.core_symptoms": "Exaggerated presentation or elaboration of genuinely present physical symptoms for psychological reasons (e.g. to obtain attention or support), without deliberate intent to deceive",
      "f68_0.exclude_other": "There is no deliberate deception or simulation (otherwise F68.1)"
    }
  },
  "factitious_disorder": {
    "name": "Intentional production or feigning of symptoms or disabilities [factitious disorder]",
    "differentials": [
      "Malingering",
      "Somatoform disorder (F45)",
      "Elaboration of physical symptoms (F68.0)"
    ],
    "groups": {
      "f68_1.core": "Core criteria",
      "f68_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f68_1.core_symptoms": "Repeated, deliberate production or feigning of physical or psychological symptoms or disabilities in order to assume the role of a sick or injured patient",
      "f68_1.exclude_other": "The symptoms are not better explained by a somatoform disorder without intent to deceive"
    }
  },
  "adult_personality_behaviour_disorder_other": {
    "name": "Other specified disorders of adult personality and behaviour",
    "differentials": [
      "Factitious disorder (F68.1)",
      "Elaboration of physical symptoms (F68.0)",
      "Primary personality disorder (F60)"
    ],
    "groups": {
      "f68_8.core": "Core criteria",
      "f68_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f68_8.core_symptoms": "Specified disorder of adult personality or behaviour that does not fit any of the more specific F68 subcategories",
      "f68_8.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "mixed_specific_developmental_disorder": {
    "name": "Mixed specific developmental disorders",
    "differentials": [
      "Specific reading disorder (F81.0)",
      "Specific disorder of arithmetical skills (F81.2)",
      "Intellectual developmental disorder (F70–F79)"
    ],
    "groups": {
      "f83.core": "Core criteria",
      "f83.exclusions": "Exclusions",
      "6a0z.domains": "Deficits in at least two neurodevelopmental domains",
      "6a0z.conditions": "Diagnostic conditions",
      "6a0z.exclusions": "Exclusions"
    },
    "criteria": {
      "f83.core_symptoms": "Combined specific developmental disorders in at least two domains (e.g. language and motor coordination, or reading and arithmetic) that are not explained by a general intellectual developmental disorder alone",
      "f83.exclude_other": "The performance deficit is not explained by intellectual developmental disorder or social deprivation alone",
      "6a0z.speech_language": "Developmental deficit in speech or language (e.g. articulation, language comprehension, vocabulary, pragmatics)",
      "6a0z.learning": "Developmental deficit in learning (e.g. reading, writing or arithmetic), clearly below age- and education-expected level",
      "6a0z.motor": "Developmental deficit in motor coordination (e.g. gross or fine motor skills, balance, graphomotor difficulties)",
      "6a0z.attention": "Developmental deficit in attention, impulse control or activity regulation consistent with an ADHD presentation",
      "6a0z.developmental_onset": "Onset in the developmental period; deficits are not acquired only in adulthood through illness or injury",
      "6a0z.functional_impact": "The combined deficits significantly impair school performance, everyday functioning or social participation",
      "6a0z.exclude_id_alone": "The performance deficit is not explained by intellectual developmental disorder or social deprivation alone"
    }
  },
  "other_psychological_development_disorder": {
    "name": "Other disorders of psychological development",
    "differentials": [
      "ADHD (F90)",
      "Autism spectrum (F84)",
      "Specific developmental disorders (F80–F83)"
    ],
    "groups": {
      "f88.core": "Core criteria",
      "f88.exclusions": "Exclusions"
    },
    "criteria": {
      "f88.core_symptoms": "Specified disorder of psychological development that does not fit any of the more specific F8 subcategories",
      "f88.exclude_other": "The disorder is not better explained by an intellectual developmental disorder or a primary mental disorder alone"
    }
  },
  "unspecified_psychological_development_disorder": {
    "name": "Unspecified disorder of psychological development",
    "differentials": [
      "ADHD (F90)",
      "Autism spectrum (F84)",
      "Specific developmental disorders (F80–F83)"
    ],
    "groups": {
      "f89.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f89.exclusions": "Exclusions"
    },
    "criteria": {
      "f89.core_symptoms": "Disorder of psychological development without further specification",
      "f89.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f89.exclude_other": "The disorder is not better explained by an intellectual developmental disorder alone"
    }
  },
  "childhood_emotional_disorders_stem": {
    "name": "Emotional disorders with onset specific to childhood",
    "differentials": [
      "Separation anxiety (F93.0)",
      "Phobic anxiety in childhood (F93.1)",
      "Social anxiety in childhood (F93.2)"
    ],
    "groups": {
      "f93.core": "Core criteria",
      "f93.exclusions": "Exclusions"
    },
    "criteria": {
      "f93.core_symptoms": "Emotional disorder with onset in childhood not assigned to any more specific F93 subcategory",
      "f93.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "childhood_phobic_anxiety": {
    "name": "Phobic anxiety disorder of childhood",
    "differentials": [
      "Specific phobia (F40.2)",
      "Separation anxiety (F93.0)",
      "Normal developmental anxiety"
    ],
    "groups": {
      "f93_1.core": "Core criteria",
      "f93_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f93_1.core_symptoms": "Marked, age-inappropriate anxiety of specific objects or situations with avoidance, or endurance only under distress, with onset in childhood",
      "f93_1.exclude_other": "The anxiety is not better explained by another mental disorder alone"
    }
  },
  "childhood_social_anxiety": {
    "name": "Social anxiety disorder of childhood",
    "differentials": [
      "Social phobia (F40.1)",
      "Elective mutism (F94.0)",
      "Autism spectrum (F84)"
    ],
    "groups": {
      "f93_2.core": "Core criteria",
      "f93_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f93_2.core_symptoms": "Marked, age-inappropriate anxiety in social situations with avoidance, or endurance only under distress, with onset in childhood",
      "f93_2.exclude_other": "The anxiety is not better explained by autism spectrum disorder or elective mutism alone"
    }
  },
  "sibling_rivalry_disorder": {
    "name": "Sibling rivalry disorder",
    "differentials": [
      "Normal sibling rivalry",
      "Conduct disorder (F91)",
      "Adjustment disorder after birth of a sibling"
    ],
    "groups": {
      "f93_3.core": "Core criteria",
      "f93_3.exclusions": "Exclusions"
    },
    "criteria": {
      "f93_3.core_symptoms": "Marked jealousy, rivalry or aggressive behaviour towards a sibling that goes beyond age-typical reactions to the birth or presence of a sibling and leads to functional impairment",
      "f93_3.exclude_other": "The behaviour is not better explained by a conduct disorder or a primary affective disorder alone"
    }
  },
  "childhood_emotional_disorder_other": {
    "name": "Other childhood emotional disorders",
    "differentials": [
      "Separation anxiety (F93.0)",
      "Phobic anxiety in childhood (F93.1)"
    ],
    "groups": {
      "f93_8.core": "Core criteria",
      "f93_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f93_8.core_symptoms": "Specified emotional disorder with onset in childhood that does not fit any of the more specific F93 subcategories",
      "f93_8.exclude_other": "The symptomatology is not better explained by another mental disorder alone"
    }
  },
  "childhood_emotional_disorder_unspecified": {
    "name": "Childhood emotional disorder, unspecified",
    "differentials": [
      "Separation anxiety (F93.0)",
      "Phobic anxiety in childhood (F93.1)"
    ],
    "groups": {
      "f93_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f93_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f93_9.core_symptoms": "Emotional disorder with onset in childhood without further specification",
      "f93_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f93_9.exclude_other": "The symptomatology is not better explained by another mental disorder alone"
    }
  },
  "childhood_social_functioning_disorders_stem": {
    "name": "Disorders of social functioning with onset specific to childhood and adolescence",
    "differentials": [
      "Elective mutism (F94.0)",
      "Reactive attachment disorder (F94.1)",
      "Disinhibited attachment disorder (F94.2)"
    ],
    "groups": {
      "f94.core": "Core criteria",
      "f94.exclusions": "Exclusions"
    },
    "criteria": {
      "f94.core_symptoms": "Disorder of social functioning with onset in childhood or adolescence not assigned to any more specific F94 subcategory",
      "f94.exclude_other": "The disorder is not better explained by autism spectrum disorder alone"
    }
  },
  "childhood_social_functioning_disorder_other": {
    "name": "Other childhood disorders of social functioning",
    "differentials": [
      "Elective mutism (F94.0)",
      "Attachment disorders (F94.1/F94.2)"
    ],
    "groups": {
      "f94_8.core": "Core criteria",
      "f94_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f94_8.core_symptoms": "Specified disorder of social functioning with onset in childhood or adolescence that does not fit any of the more specific F94 subcategories",
      "f94_8.exclude_other": "The disorder is not better explained by autism spectrum disorder alone"
    }
  },
  "childhood_social_functioning_disorder_unspecified": {
    "name": "Childhood disorder of social functioning, unspecified",
    "differentials": [
      "Elective mutism (F94.0)",
      "Attachment disorders (F94.1/F94.2)"
    ],
    "groups": {
      "f94_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f94_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f94_9.core_symptoms": "Disorder of social functioning with onset in childhood or adolescence without further specification",
      "f94_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f94_9.exclude_other": "The disorder is not better explained by autism spectrum disorder alone"
    }
  },
  "childhood_behavioural_emotional_disorders_stem": {
    "name": "Other behavioural and emotional disorders with onset usually occurring in childhood and adolescence",
    "differentials": [
      "Enuresis (F98.0)",
      "Encopresis (F98.1)",
      "Pica (F98.3)",
      "Stereotyped movement disorder (F98.4)"
    ],
    "groups": {
      "f98.core": "Core criteria",
      "f98.exclusions": "Exclusions"
    },
    "criteria": {
      "f98.core_symptoms": "Behavioural or emotional disorder with onset in childhood or adolescence not assigned to any more specific F98 subcategory",
      "f98.exclude_other": "The disorder is not better explained by another mental disorder alone"
    }
  },
  "pica_childhood": {
    "name": "Pica of childhood",
    "differentials": [
      "Normal exploratory behaviour in early childhood",
      "Intellectual developmental disorder",
      "Obsessive-compulsive disorder"
    ],
    "groups": {
      "f98_3.core": "Core criteria",
      "f98_3.exclusions": "Exclusions"
    },
    "criteria": {
      "f98_3.core_symptoms": "Repeated or persistent eating of non-nutritive substances (e.g. earth, paint, sand, paper) beyond an age-appropriate degree, lasting at least one month",
      "f98_3.exclude_other": "The behaviour is not better explained by an intellectual developmental disorder or cultural practice alone"
    }
  },
  "childhood_behavioural_disorder_other": {
    "name": "Other specified behavioural and emotional disorders with onset usually occurring in childhood and adolescence",
    "differentials": [
      "Enuresis (F98.0)",
      "Encopresis (F98.1)",
      "Pica (F98.3)"
    ],
    "groups": {
      "f98_8.core": "Core criteria",
      "f98_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f98_8.core_symptoms": "Specified behavioural or emotional disorder with onset in childhood or adolescence that does not fit any of the more specific F98 subcategories",
      "f98_8.exclude_other": "The disorder is not better explained by another mental disorder alone"
    }
  },
  "childhood_behavioural_disorder_unspecified": {
    "name": "Unspecified behavioural and emotional disorders with onset usually occurring in childhood and adolescence",
    "differentials": [
      "Enuresis (F98.0)",
      "Encopresis (F98.1)",
      "Pica (F98.3)"
    ],
    "groups": {
      "f98_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f98_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f98_9.core_symptoms": "Behavioural or emotional disorder with onset in childhood or adolescence without further specification",
      "f98_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f98_9.exclude_other": "The disorder is not better explained by another mental disorder alone"
    }
  },
  "unspecified_mental_disorder": {
    "name": "Mental disorder, not otherwise specified",
    "differentials": [
      "Specific mental disorder where full criteria are met",
      "Organic or substance-related disorder",
      "Normal reaction to life circumstances"
    ],
    "groups": {
      "f99.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f99.exclusions": "Exclusions"
    },
    "criteria": {
      "f99.core_symptoms": "Clinically significant mental symptomatology is present but cannot be assigned to a specific mental disorder due to insufficient information",
      "f99.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f99.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
}
