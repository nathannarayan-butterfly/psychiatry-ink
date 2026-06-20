import type { DisorderTranslationMap } from '../types'

export const gapEN: DisorderTranslationMap = {
  "dementia_other_diseases_stem": {
    "name": "Dementia in other diseases classified elsewhere",
    "differentials": [
      "Demenz bei Alzheimer-Krankheit (F00)",
      "Vaskuläre Demenz (F01)",
      "Primär psychiatrische Störung mit kognitiven Symptomen",
      "Delir (akuter Beginn, fluktuierende Bewusstseinslage)"
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
      "Schnell progrediente Demenz anderer Ätiologie",
      "Delir",
      "Depressive Pseudodemenz"
    ],
    "groups": {
      "f02_1.cognition": "Dementia syndrome",
      "f02_1.aetiology": "Aetiological attribution",
      "f02_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f02_1.memory_decline": "Nachlassen des Gedächtnisses und/oder anderer kognitiver Funktionen, das die Alltagsbewältigung beeinträchtigt",
      "f02_1.cognitive_decline": "Abnahme höherer kognitiver Funktionen gegenüber dem früheren Leistungsniveau",
      "f02_1.functional_impact": "impairment der Bewältigung von Alltagsaktivitäten infolge des kognitiven Abbaus",
      "f02_1.underlying_disease": "Nachweis oder begründete Annahme einer Creutzfeldt-Jakob-Krankheit (Prionerkrankung) als ursächlicher Grunderkrankung",
      "f02_1.exclude_delirium": "Keine Bewusstseinstrübung, die auf ein Delir hinweisen würde"
    }
  },
  "dementia_huntington": {
    "name": "Dementia in Huntington disease",
    "differentials": [
      "Andere neurodegenerative Demenz",
      "Medikamenteninduzierte Chorea",
      "Tardive Dyskinesie"
    ],
    "groups": {
      "f02_2.cognition": "Dementia syndrome",
      "f02_2.aetiology": "Aetiological attribution",
      "f02_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f02_2.memory_decline": "Nachlassen des Gedächtnisses und/oder anderer kognitiver Funktionen, das die Alltagsbewältigung beeinträchtigt",
      "f02_2.cognitive_decline": "Abnahme höherer kognitiver Funktionen gegenüber dem früheren Leistungsniveau",
      "f02_2.functional_impact": "impairment der Bewältigung von Alltagsaktivitäten infolge des kognitiven Abbaus",
      "f02_2.underlying_disease": "Nachweis oder begründete Annahme einer Huntington-Krankheit als ursächlicher Grunderkrankung",
      "f02_2.exclude_delirium": "Keine Bewusstseinstrübung, die auf ein Delir hinweisen würde"
    }
  },
  "dementia_parkinson": {
    "name": "Dementia in Parkinson disease",
    "differentials": [
      "Demenz mit Lewy-Körperchen",
      "Vaskuläre Demenz",
      "Depressive Pseudodemenz"
    ],
    "groups": {
      "f02_3.cognition": "Dementia syndrome",
      "f02_3.aetiology": "Aetiological attribution",
      "f02_3.exclusions": "Exclusions"
    },
    "criteria": {
      "f02_3.memory_decline": "Nachlassen des Gedächtnisses und/oder anderer kognitiver Funktionen, das die Alltagsbewältigung beeinträchtigt",
      "f02_3.cognitive_decline": "Abnahme höherer kognitiver Funktionen gegenüber dem früheren Leistungsniveau",
      "f02_3.functional_impact": "impairment der Bewältigung von Alltagsaktivitäten infolge des kognitiven Abbaus",
      "f02_3.underlying_disease": "Nachweis oder begründete Annahme einer Parkinson-Krankheit als ursächlicher Grunderkrankung",
      "f02_3.exclude_delirium": "Keine Bewusstseinstrübung, die auf ein Delir hinweisen würde"
    }
  },
  "dementia_hiv": {
    "name": "Dementia in human immunodeficiency virus [HIV] disease",
    "differentials": [
      "HIV-assoziierte Neurokognitionsstörung ohne Demenz",
      "Opportunistische ZNS-Infektion",
      "Substanzbedingte kognitive Störung"
    ],
    "groups": {
      "f02_4.cognition": "Dementia syndrome",
      "f02_4.aetiology": "Aetiological attribution",
      "f02_4.exclusions": "Exclusions"
    },
    "criteria": {
      "f02_4.memory_decline": "Nachlassen des Gedächtnisses und/oder anderer kognitiver Funktionen, das die Alltagsbewältigung beeinträchtigt",
      "f02_4.cognitive_decline": "Abnahme höherer kognitiver Funktionen gegenüber dem früheren Leistungsniveau",
      "f02_4.functional_impact": "impairment der Bewältigung von Alltagsaktivitäten infolge des kognitiven Abbaus",
      "f02_4.underlying_disease": "Nachweis oder begründete Annahme einer HIV-Infektion als ursächlicher Grunderkrankung",
      "f02_4.exclude_delirium": "Keine Bewusstseinstrübung, die auf ein Delir hinweisen würde"
    }
  },
  "unspecified_dementia": {
    "name": "Unspecified dementia",
    "differentials": [
      "Demenz bei Alzheimer-Krankheit (F00)",
      "Vaskuläre Demenz (F01)",
      "Demenz bei anderenorts klassifizierten Krankheiten (F02)",
      "Delir"
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
      "Primäre psychische Störung ohne organische Ursache",
      "Substanz-/medikamenteninduzierte psychische Störung",
      "Delir (F05)"
    ],
    "groups": {
      "f06.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f06.exclusions": "Exclusions"
    },
    "criteria": {
      "f06.core_symptoms": "Psychische Symptomatik (außerhalb der bereits separat erfassten organischen Syndrome), die einer nachgewiesenen oder wahrscheinlichen Hirnschädigung, Hirndysfunktion oder körperlichen Erkrankung zugeordnet wird",
      "f06.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f06.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "organic_catatonic_disorder": {
    "name": "Organic catatonic disorder",
    "differentials": [
      "Katatonie bei Schizophrenie",
      "Neuroleptisches malignes Syndrom",
      "Delir"
    ],
    "groups": {
      "f06_1.syndrome": "Clinical syndrome",
      "f06_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f06_1.clinical_picture": "Katatonie (z. B. Stupor, Mutismus, Negativismus, Wachsflexibilität, Stereotypien, Manierismen) im Zusammenhang mit einer organischen Ursache",
      "f06_1.organic_cause": "Evidence or reasonable assumption of a causal physical, cerebral or systemic disease that can explain the mental syndrome",
      "f06_1.exclude_primary": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "organic_anxiety_disorder": {
    "name": "Organic anxiety disorder",
    "differentials": [
      "Generalisierte Angststörung (F41.1)",
      "Panikstörung (F41.0)",
      "Substanzinduzierte Angst"
    ],
    "groups": {
      "f06_4.syndrome": "Clinical syndrome",
      "f06_4.exclusions": "Exclusions"
    },
    "criteria": {
      "f06_4.clinical_picture": "Ausgeprägte Angstsymptomatik, die einer organischen Ursache zugeordnet wird",
      "f06_4.organic_cause": "Evidence or reasonable assumption of a causal physical, cerebral or systemic disease that can explain the mental syndrome",
      "f06_4.exclude_primary": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "organic_dissociative_disorder": {
    "name": "Organic dissociative disorder",
    "differentials": [
      "Dissoziative Störungen (F44)",
      "PTBS",
      "Substanzinduzierte Dissoziation"
    ],
    "groups": {
      "f06_5.syndrome": "Clinical syndrome",
      "f06_5.exclusions": "Exclusions"
    },
    "criteria": {
      "f06_5.clinical_picture": "Dissoziative Symptomatik (z. B. Depersonalisation, Derealisation, Amnesie, Identitätsstörung), die einer organischen Ursache zugeordnet wird",
      "f06_5.organic_cause": "Evidence or reasonable assumption of a causal physical, cerebral or systemic disease that can explain the mental syndrome",
      "f06_5.exclude_primary": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "organic_mental_disorder_other": {
    "name": "Other specified mental disorders due to brain damage and dysfunction and to physical disease",
    "differentials": [
      "Spezifische organische Syndrome (F06.0–F06.7)",
      "Primäre psychische Störung"
    ],
    "groups": {
      "f06_8.core": "Core criteria",
      "f06_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f06_8.core_symptoms": "Näher bezeichnete psychische Symptomatik, die einer Hirnschädigung, Hirndysfunktion oder körperlichen Erkrankung zugeordnet wird und keiner der spezifischeren F06-Unterkategorien entspricht",
      "f06_8.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "organic_mental_disorder_unspecified": {
    "name": "Unspecified mental disorder due to brain damage and dysfunction and to physical disease",
    "differentials": [
      "Spezifische organische Syndrome (F06.0–F06.8)",
      "Primäre psychische Störung"
    ],
    "groups": {
      "f06_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f06_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f06_9.core_symptoms": "Psychische Symptomatik, die einer organischen Ursache zugeordnet wird, ohne dass eine spezifischere F06-Unterkategorie zutrifft",
      "f06_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f06_9.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "postencephalitic_syndrome": {
    "name": "Postencephalitic syndrome",
    "differentials": [
      "Organische Persönlichkeitsstörung (F07.0)",
      "Demenz",
      "Chronisches Erschöpfungssyndrom"
    ],
    "groups": {
      "f07_1.core": "Core criteria",
      "f07_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f07_1.core_symptoms": "Anhaltende psychische oder Verhaltensveränderungen (z. B. Erschöpfung, Affektlabilität, Konzentrationsstörung, Schlafstörung) nach einer Enzephalitis oder vergleichbarer zerebraler Infektion/Entzündung",
      "f07_1.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "organic_personality_disorder_other": {
    "name": "Other organic personality and behavioural disorders due to brain disease, damage and dysfunction",
    "differentials": [
      "Organische Persönlichkeitsstörung (F07.0)",
      "Primäre Persönlichkeitsstörung (F60)"
    ],
    "groups": {
      "f07_8.core": "Core criteria",
      "f07_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f07_8.core_symptoms": "Näher bezeichnete, organische Ursache zugeschriebene Veränderung von Persönlichkeit und Verhalten, die keiner spezifischeren F07-Unterkategorie entspricht",
      "f07_8.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "organic_personality_disorder_unspecified": {
    "name": "Unspecified organic personality and behavioural disorder due to brain disease, damage and dysfunction",
    "differentials": [
      "Organische Persönlichkeitsstörung (F07.0)",
      "Primäre Persönlichkeitsstörung (F60)"
    ],
    "groups": {
      "f07_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f07_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f07_9.core_symptoms": "Organische Ursache zugeschriebene Veränderung von Persönlichkeit und Verhalten, ohne nähere Spezifizierung",
      "f07_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f07_9.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "unspecified_organic_mental_disorder": {
    "name": "Unspecified organic or symptomatic mental disorder",
    "differentials": [
      "Spezifische organische Syndrome (F00–F07)",
      "Primäre psychische Störung",
      "Substanzbedingte Störung"
    ],
    "groups": {
      "f09.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f09.exclusions": "Exclusions"
    },
    "criteria": {
      "f09.core_symptoms": "Psychische Symptomatik mit Hinweis auf eine organische oder symptomatische Ursache, die keiner spezifischeren F0-Kategorie zugeordnet werden kann",
      "f09.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f09.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "stimulants_substance_stem": {
    "name": "Mental and behavioural disorders due to use of other stimulants, including caffeine",
    "differentials": [
      "Stimulanzien-Abhängigkeit (F15.2)",
      "Stimulanzien-Intoxikation (F15.0)",
      "Primäre psychische Störung ohne Substanzbezug"
    ],
    "groups": {
      "f15.core": "Core criteria",
      "f15.exclusions": "Exclusions"
    },
    "criteria": {
      "f15.core_symptoms": "Klinisch bedeutsame psychische oder Verhaltensstörung im Zusammenhang mit dem Gebrauch anderer Stimulanzien (einschließlich Koffein), wenn keine spezifischere F15-Unterkategorie angegeben ist",
      "f15.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "multiple_substances_stem": {
    "name": "Mental and behavioural disorders due to multiple drug use and use of other psychoactive substances",
    "differentials": [
      "Abhängigkeit von multiplen Substanzen (F19.2)",
      "Einzelsubstanz-Störungen (F10–F18)",
      "Primäre psychische Störung ohne Substanzbezug"
    ],
    "groups": {
      "f19.core": "Core criteria",
      "f19.exclusions": "Exclusions"
    },
    "criteria": {
      "f19.core_symptoms": "Klinisch bedeutsame psychische oder Verhaltensstörung im Zusammenhang mit multiplem Substanzgebrauch oder anderen psychotropen Substanzen, wenn keine spezifischere F19-Unterkategorie angegeben ist",
      "f19.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "persistent_affective_disorders_stem": {
    "name": "Persistent mood [affective] disorders",
    "differentials": [
      "Zyklothymie (F34.0)",
      "Dysthymie (F34.1)",
      "Rezidivierende depressive Störung (F33)",
      "Bipolare Störung (F31)"
    ],
    "groups": {
      "f34.core": "Core criteria",
      "f34.exclusions": "Exclusions"
    },
    "criteria": {
      "f34.core_symptoms": "Anhaltende affektive Symptomatik über einen längeren Zeitraum, die den Schweregrad einer depressiven oder manischen Episode nicht erreicht",
      "f34.exclude_other": "The symptomatology is not attributable to an organic mental disorder or substance use"
    }
  },
  "persistent_affective_disorder_unspecified": {
    "name": "Persistent affective disorder, unspecified",
    "differentials": [
      "Zyklothymie (F34.0)",
      "Dysthymie (F34.1)",
      "Other anhaltende affektive Störung (F34.8)"
    ],
    "groups": {
      "f34_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f34_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f34_9.core_symptoms": "Anhaltende affektive Symptomatik, die keiner spezifischeren F34-Unterkategorie zugeordnet werden kann",
      "f34_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f34_9.exclude_other": "The symptomatology is not attributable to an organic mental disorder or substance use"
    }
  },
  "phobic_anxiety_disorders_stem": {
    "name": "Phobic anxiety disorders",
    "differentials": [
      "Agoraphobie (F40.0)",
      "Soziale Phobie (F40.1)",
      "Spezifische Phobie (F40.2)",
      "Panikstörung (F41.0)"
    ],
    "groups": {
      "f40.core": "Core criteria",
      "f40.exclusions": "Exclusions"
    },
    "criteria": {
      "f40.core_symptoms": "Ausgeprägte, situationsgebundene oder spezifische Angst mit Vermeidung oder Ertragen nur unter distress",
      "f40.exclude_other": "Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "phobic_anxiety_disorder_other": {
    "name": "Other phobic anxiety disorders",
    "differentials": [
      "Agoraphobie (F40.0)",
      "Soziale Phobie (F40.1)",
      "Spezifische Phobie (F40.2)"
    ],
    "groups": {
      "f40_8.core": "Core criteria",
      "f40_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f40_8.core_symptoms": "Näher bezeichnete phobische Angststörung, die keiner der spezifischeren F40-Unterkategorien entspricht",
      "f40_8.exclude_other": "Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "phobic_anxiety_disorder_unspecified": {
    "name": "Phobic anxiety disorder, unspecified",
    "differentials": [
      "Agoraphobie (F40.0)",
      "Soziale Phobie (F40.1)",
      "Spezifische Phobie (F40.2)"
    ],
    "groups": {
      "f40_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f40_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f40_9.core_symptoms": "Phobische Angstsymptomatik ohne nähere Spezifizierung der Phobie",
      "f40_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f40_9.exclude_other": "Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "other_anxiety_disorders_stem": {
    "name": "Other anxiety disorders",
    "differentials": [
      "Panikstörung (F41.0)",
      "Generalisierte Angststörung (F41.1)",
      "Gemischte Angst-Depression (F41.2)"
    ],
    "groups": {
      "f41.core": "Core criteria",
      "f41.exclusions": "Exclusions"
    },
    "criteria": {
      "f41.core_symptoms": "Klinisch bedeutsame Angstsymptomatik, die keiner spezifischeren F41-Unterkategorie zugeordnet ist",
      "f41.exclude_other": "Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "mixed_anxiety_disorder_other": {
    "name": "Other mixed anxiety disorders",
    "differentials": [
      "Gemischte Angst-Depression (F41.2)",
      "Generalisierte Angststörung (F41.1)"
    ],
    "groups": {
      "f41_3.core": "Core criteria",
      "f41_3.exclusions": "Exclusions"
    },
    "criteria": {
      "f41_3.core_symptoms": "Gemischte Angstsymptomatik mit überlappenden Angstmustern, die keiner spezifischeren F41-Unterkategorie entspricht",
      "f41_3.exclude_other": "Die Symptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "anxiety_disorder_other": {
    "name": "Other specified anxiety disorders",
    "differentials": [
      "Panikstörung (F41.0)",
      "Generalisierte Angststörung (F41.1)",
      "Phobische Störungen (F40)"
    ],
    "groups": {
      "f41_8.core": "Core criteria",
      "f41_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f41_8.core_symptoms": "Näher bezeichnete Angststörung, die keiner der spezifischeren F41-Unterkategorien entspricht",
      "f41_8.exclude_other": "Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "anxiety_disorder_unspecified": {
    "name": "Anxiety disorder, unspecified",
    "differentials": [
      "Panikstörung (F41.0)",
      "Generalisierte Angststörung (F41.1)",
      "Phobische Störungen (F40)"
    ],
    "groups": {
      "f41_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f41_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f41_9.core_symptoms": "Klinisch bedeutsame Angstsymptomatik ohne nähere Spezifizierung",
      "f41_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f41_9.exclude_other": "Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "stress_reaction_disorders_stem": {
    "name": "Reaction to severe stress, and adjustment disorders",
    "differentials": [
      "Akute Belastungsreaktion (F43.0)",
      "PTBS (F43.1)",
      "Anpassungsstörung (F43.2)"
    ],
    "groups": {
      "f43.core": "Core criteria",
      "f43.exclusions": "Exclusions"
    },
    "criteria": {
      "f43.core_symptoms": "Psychische Reaktion auf einen identifizierbaren schweren Stressor mit klinisch bedeutsamer Symptomatik",
      "f43.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "stress_reaction_other": {
    "name": "Other reactions to severe stress",
    "differentials": [
      "Akute Belastungsreaktion (F43.0)",
      "PTBS (F43.1)",
      "Anpassungsstörung (F43.2)"
    ],
    "groups": {
      "f43_8.core": "Core criteria",
      "f43_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f43_8.core_symptoms": "Näher bezeichnete Reaktion auf schweren Stress, die keiner der spezifischeren F43-Unterkategorien entspricht",
      "f43_8.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "stress_reaction_unspecified": {
    "name": "Reaction to severe stress, unspecified",
    "differentials": [
      "Akute Belastungsreaktion (F43.0)",
      "PTBS (F43.1)",
      "Anpassungsstörung (F43.2)"
    ],
    "groups": {
      "f43_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f43_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f43_9.core_symptoms": "Reaktion auf schweren Stress ohne nähere Spezifizierung",
      "f43_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f43_9.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "other_neurotic_disorders_stem": {
    "name": "Other neurotic disorders",
    "differentials": [
      "Neurasthenie (F48.0)",
      "Depersonalisation/Derealisation (F48.1)",
      "Dissoziative Störungen (F44)"
    ],
    "groups": {
      "f48.core": "Core criteria",
      "f48.exclusions": "Exclusions"
    },
    "criteria": {
      "f48.core_symptoms": "Neurotische Symptomatik, die keiner spezifischeren F4-Unterkategorie zugeordnet ist",
      "f48.exclude_other": "Die Symptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "neurasthenia": {
    "name": "Neurasthenia",
    "differentials": [
      "Burnout",
      "Depressive Episode",
      "Chronisches Erschöpfungssyndrom",
      "Somatische Ursache der Müdigkeit"
    ],
    "groups": {
      "f48_0.core": "Core criteria",
      "f48_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f48_0.core_symptoms": "Anhaltende Erschöpfung mit reduzierter Leistungsfähigkeit und vegetativen Beschwerden nach psychischer oder körperlicher Überanstrengung",
      "f48_0.exclude_other": "Die Erschöpfung ist nicht besser durch eine somatische Erkrankung oder eine depressive Episode allein erklärbar"
    }
  },
  "depersonalization_derealization_disorder": {
    "name": "Depersonalization-derealization disorder",
    "differentials": [
      "Dissoziative Störungen (F44)",
      "Panikstörung",
      "Substanzinduzierte Dissoziation",
      "Schizophrenie"
    ],
    "groups": {
      "f48_1.core": "Core criteria",
      "f48_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f48_1.core_symptoms": "Wiederkehrende oder anhaltende Depersonalisations- und/oder Derealisationserlebnisse bei erhaltenem Realitätsbewusstsein",
      "f48_1.exclude_other": "Die Erlebnisse sind nicht besser durch eine andere psychische Störung, Substanzwirkung oder organische Ursache erklärbar"
    }
  },
  "neurotic_disorder_other": {
    "name": "Other specified neurotic disorders",
    "differentials": [
      "Neurasthenie (F48.0)",
      "Depersonalisation/Derealisation (F48.1)"
    ],
    "groups": {
      "f48_8.core": "Core criteria",
      "f48_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f48_8.core_symptoms": "Näher bezeichnete neurotische Störung, die keiner der spezifischeren F48-Unterkategorien entspricht",
      "f48_8.exclude_other": "Die Symptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "neurotic_disorder_unspecified": {
    "name": "Neurotic disorder, unspecified",
    "differentials": [
      "Neurasthenie (F48.0)",
      "Depersonalisation/Derealisation (F48.1)"
    ],
    "groups": {
      "f48_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f48_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f48_9.core_symptoms": "Neurotische Symptomatik ohne nähere Spezifizierung",
      "f48_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f48_9.exclude_other": "Die Symptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "eating_disorders_stem": {
    "name": "Eating disorders",
    "differentials": [
      "Anorexia nervosa (F50.0)",
      "Bulimia nervosa (F50.2)",
      "Binge-Eating-Störung"
    ],
    "groups": {
      "f50.core": "Core criteria",
      "f50.exclusions": "Exclusions"
    },
    "criteria": {
      "f50.core_symptoms": "Klinisch bedeutsame Störung des Essverhaltens oder der Körperwahrnehmung im Zusammenhang mit dem Essen",
      "f50.exclude_other": "Die Symptomatik ist nicht besser durch eine somatische Erkrankung oder eine primäre affektive Störung allein erklärbar"
    }
  },
  "vomiting_psychological": {
    "name": "Vomiting associated with other psychological disturbances",
    "differentials": [
      "Bulimia nervosa",
      "Gastrointestinale Ursache",
      "Schwangerschaftserbrechen"
    ],
    "groups": {
      "f50_5.core": "Core criteria",
      "f50_5.exclusions": "Exclusions"
    },
    "criteria": {
      "f50_5.core_symptoms": "Wiederholtes Erbrechen ohne hinreichende somatische Erklärung, das einer psychischen Störung zugeordnet wird",
      "f50_5.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "eating_disorder_other": {
    "name": "Other eating disorders",
    "differentials": [
      "Anorexia nervosa (F50.0)",
      "Bulimia nervosa (F50.2)",
      "Binge-Eating-Störung"
    ],
    "groups": {
      "f50_8.core": "Core criteria",
      "f50_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f50_8.core_symptoms": "Näher bezeichnete Essstörung, die keiner der spezifischeren F50-Unterkategorien entspricht",
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
      "f50_9.core_symptoms": "Störung des Essverhaltens ohne nähere Spezifizierung",
      "f50_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f50_9.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "nonorganic_sleep_disorders_stem": {
    "name": "Nonorganic sleep disorders",
    "differentials": [
      "Insomnie (F51.0)",
      "Albträume (F51.5)",
      "Pavor nocturnus (F51.4)",
      "Organische Schlafstörung"
    ],
    "groups": {
      "f51.core": "Core criteria",
      "f51.exclusions": "Exclusions"
    },
    "criteria": {
      "f51.core_symptoms": "Klinisch bedeutsame Schlafstörung ohne hinreichende organische Erklärung",
      "f51.exclude_other": "Die Schlafstörung ist nicht besser durch eine somatische Erkrankung oder Substanzwirkung allein erklärbar"
    }
  },
  "nonorganic_hypersomnia": {
    "name": "Nonorganic hypersomnia",
    "differentials": [
      "Insomnie (F51.0)",
      "Depressive Episode mit Hypersomnie",
      "Narkolepsie",
      "Schlafapnoe"
    ],
    "groups": {
      "f51_1.core": "Core criteria",
      "f51_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f51_1.core_symptoms": "Anhaltende übermäßige Tagesschläfrigkeit oder verlängerte Schlafdauer bei erhaltenem Schlafbedürfnis trotz adäquater Schlafgelegenheit",
      "f51_1.exclude_other": "Die Hypersomnie ist nicht besser durch eine somatische Erkrankung oder Substanzwirkung allein erklärbar"
    }
  },
  "sleep_wake_schedule_disorder": {
    "name": "Nonorganic disorder of the sleep-wake schedule",
    "differentials": [
      "Insomnie (F51.0)",
      "Schichtarbeit",
      "Jetlag",
      "Organische Schlafstörung"
    ],
    "groups": {
      "f51_2.core": "Core criteria",
      "f51_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f51_2.core_symptoms": "Persistierende Störung des Schlaf-Wach-Rhythmus mit Einschlaf- oder Aufwachzeitpunkt außerhalb des gewünschten Zeitfensters und damit verbundener impairment",
      "f51_2.exclude_other": "Die Störung ist nicht besser durch eine somatische Erkrankung oder Substanzwirkung allein erklärbar"
    }
  },
  "sleep_disorder_other": {
    "name": "Other nonorganic sleep disorders",
    "differentials": [
      "Insomnie (F51.0)",
      "Hypersomnie (F51.1)",
      "Albträume (F51.5)"
    ],
    "groups": {
      "f51_8.core": "Core criteria",
      "f51_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f51_8.core_symptoms": "Näher bezeichnete nichtorganische Schlafstörung, die keiner der spezifischeren F51-Unterkategorien entspricht",
      "f51_8.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "sleep_disorder_unspecified": {
    "name": "Nonorganic sleep disorder, unspecified",
    "differentials": [
      "Insomnie (F51.0)",
      "Hypersomnie (F51.1)"
    ],
    "groups": {
      "f51_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f51_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f51_9.core_symptoms": "Nichtorganische Schlafstörung ohne nähere Spezifizierung",
      "f51_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f51_9.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "psychological_factors_somatic": {
    "name": "Psychological and behavioural factors associated with disorders or diseases classified elsewhere",
    "differentials": [
      "Somatoforme Störung (F45)",
      "Körperliche Belastungsstörung",
      "Primäre psychische Störung"
    ],
    "groups": {
      "f54.core": "Core criteria",
      "f54.exclusions": "Exclusions"
    },
    "criteria": {
      "f54.core_symptoms": "Psychologische oder Verhaltensfaktoren (z. B. Denkmuster, Emotionen, Krankheitsverhalten), die den Verlauf, die Behandlung oder die Prognose einer anderenorts klassifizierten somatischen Erkrankung nachteilig beeinflussen",
      "f54.exclude_other": "Die somatische Erkrankung ist nicht allein durch die psychologischen Faktoren verursacht"
    }
  },
  "non_dependence_substance_abuse": {
    "name": "Abuse of non-dependence-producing substances",
    "differentials": [
      "Substanzabhängigkeit (F1x.2)",
      "Essstörung mit Laxanzien-/Diuretikamissbrauch"
    ],
    "groups": {
      "f55.core": "Core criteria",
      "f55.exclusions": "Exclusions",
      "6c4h_1.pattern": "Sustained pattern of use (episodic or continuous, typically over ≥ 12 months — or ≥ 1 month if continuous)",
      "6c4h_1.harm": "Demonstrable harm (at least one of the following areas)",
      "6c4h_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f55.core_symptoms": "Wiederholter Konsum nichtabhängigkeitserzeugender Substanzen (z. B. Laxanzien, Analgetika, Vitamine, pflanzliche Präparate) mit psychischen oder körperlichen Schäden, ohne Erfüllung der Abhängigkeitskriterien",
      "f55.exclude_other": "Die Kriterien einer Substanzabhängigkeit sind nicht erfüllt",
      "6c4h_1.use_pattern": "A repeated or sustained pattern of non-psychoactive substance use is documented",
      "6c4h_1.harm_self": "Clinically significant damage to the physical or mental health of the person as a result of use (including use- or intoxication-related behaviour)",
      "6c4h_1.harm_others": "Harm to the health of others resulting from the person's use- or intoxication-related behaviour (e.g. injuries to third parties, harm in traffic) — an ICD-11-specific extension",
      "6c4h_1.exclude_dependence": "The criteria for dependence (6C4H.2) are not met"
    }
  },
  "unspecified_behavioural_syndrome": {
    "name": "Unspecified behavioural syndromes associated with physiological disturbances and physical factors",
    "differentials": [
      "Essstörungen (F50)",
      "Schlafstörungen (F51)",
      "Sexuelle Funktionsstörungen (F52)"
    ],
    "groups": {
      "f59.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f59.exclusions": "Exclusions"
    },
    "criteria": {
      "f59.core_symptoms": "Verhaltenssyndrom mit physiologischen Störungen und körperlichen Faktoren, das keiner spezifischeren F5-Kategorie zugeordnet werden kann",
      "f59.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f59.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "enduring_personality_change_stem": {
    "name": "Enduring personality changes, not attributable to brain damage and disease",
    "differentials": [
      "Organische Persönlichkeitsstörung (F07)",
      "PTBS (F43.1)",
      "Primäre Persönlichkeitsstörung (F60)"
    ],
    "groups": {
      "f62.core": "Core criteria",
      "f62.exclusions": "Exclusions"
    },
    "criteria": {
      "f62.core_symptoms": "Dauerhafte, tiefgreifende Veränderung der Persönlichkeit nach einer belastenden Lebensumstände, ohne Hinweis auf organische Ursache",
      "f62.exclude_other": "Die Veränderung ist nicht Folge einer Hirnschädigung oder -krankheit"
    }
  },
  "personality_change_catastrophic": {
    "name": "Enduring personality change after catastrophic experience",
    "differentials": [
      "PTBS (F43.1)",
      "Anpassungsstörung (F43.2)",
      "Organische Persönlichkeitsstörung (F07)"
    ],
    "groups": {
      "f62_0.core": "Core criteria",
      "f62_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f62_0.core_symptoms": "Dauerhafte Veränderung von Persönlichkeit und Verhalten nach einer extrem belastenden Erfahrung (z. B. längerer Haft, Katastrophe, Krieg), die über eine akute Belastungsreaktion hinausgeht",
      "f62_0.exclude_other": "Die Veränderung ist nicht Folge einer Hirnschädigung oder -krankheit und nicht besser durch PTBS allein erklärbar"
    }
  },
  "habit_impulse_disorders_stem": {
    "name": "Habit and impulse disorders",
    "differentials": [
      "Pathologisches Spielen (F63.0)",
      "Pyromanie (F63.1)",
      "Kleptomanie (F63.2)",
      "Trichotillomanie (F63.3)"
    ],
    "groups": {
      "f63.core": "Core criteria",
      "f63.exclusions": "Exclusions"
    },
    "criteria": {
      "f63.core_symptoms": "Wiederholtes, schwer kontrollierbares Verhalten mit innerem Drang und Erleichterung oder Befriedigung danach",
      "f63.exclude_other": "Das Verhalten ist nicht besser durch eine andere psychische Störung oder Substanzwirkung erklärbar"
    }
  },
  "habit_impulse_disorder_other": {
    "name": "Other habit and impulse disorders",
    "differentials": [
      "Pathologisches Spielen (F63.0)",
      "Pyromanie (F63.1)",
      "Kleptomanie (F63.2)"
    ],
    "groups": {
      "f63_8.core": "Core criteria",
      "f63_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f63_8.core_symptoms": "Näher bezeichnete Habit- oder Impulsstörung, die keiner der spezifischeren F63-Unterkategorien entspricht",
      "f63_8.exclude_other": "Das Verhalten ist nicht besser durch eine andere psychische Störung erklärbar"
    }
  },
  "habit_impulse_disorder_unspecified": {
    "name": "Habit and impulse disorder, unspecified",
    "differentials": [
      "Pathologisches Spielen (F63.0)",
      "Pyromanie (F63.1)",
      "Kleptomanie (F63.2)"
    ],
    "groups": {
      "f63_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f63_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f63_9.core_symptoms": "Habit- oder Impulsstörung ohne nähere Spezifizierung",
      "f63_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f63_9.exclude_other": "Das Verhalten ist nicht besser durch eine andere psychische Störung erklärbar"
    }
  },
  "gender_identity_disorders_stem": {
    "name": "Gender identity disorders",
    "differentials": [
      "Geschlechtsdysphorie im Erwachsenenalter (F64.0)",
      "Geschlechtsdysphorie im Kindesalter (F64.2)",
      "Transvestismus ohne Geschlechtsdysphorie"
    ],
    "groups": {
      "f64.core": "Core criteria",
      "f64.exclusions": "Exclusions"
    },
    "criteria": {
      "f64.core_symptoms": "Anhaltende Inkongruenz zwischen erlebtem Geschlecht und dem bei der Geburt zugewiesenen Geschlecht mit distress und/oder Funktionsimpairment",
      "f64.exclude_other": "Die Inkongruenz ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "gender_dysphoria_adult": {
    "name": "Gender dysphoria in adolescents and adults",
    "differentials": [
      "Geschlechtsdysphorie im Kindesalter (F64.2)",
      "Transvestismus (F64.1)",
      "Körperdysmorphe Störung"
    ],
    "groups": {
      "f64_0.core": "Core criteria",
      "f64_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f64_0.core_symptoms": "Anhaltende Inkongruenz zwischen erlebtem Geschlecht und dem bei der Geburt zugewiesenen Geschlecht mit Wunsch nach geschlechtsangleichenden Maßnahmen und distress und/oder Funktionsimpairment",
      "f64_0.exclude_other": "Die Inkongruenz ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "dual_role_transvestism": {
    "name": "Dual-role transvestism",
    "differentials": [
      "Geschlechtsdysphorie (F64.0)",
      "Fetischistischer Transvestismus (F65.1)"
    ],
    "groups": {
      "f64_1.core": "Core criteria",
      "f64_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f64_1.core_symptoms": "Wiederholtes Tragen von Kleidung des anderen Geschlechts, um vorübergehend sowohl männliche als auch weibliche Identität zu erleben, ohne Wunsch nach dauerhafter Geschlechtsumwandlung und ohne primäre sexuelle Erregung durch das Cross-Dressing",
      "f64_1.exclude_other": "Das Verhalten ist nicht besser durch Geschlechtsdysphorie oder einen primären Fetischismus erklärbar"
    }
  },
  "gender_dysphoria_childhood": {
    "name": "Gender dysphoria in childhood",
    "differentials": [
      "Geschlechtsuntypisches Verhalten ohne Dysphorie",
      "Geschlechtsdysphorie im Erwachsenenalter (F64.0)"
    ],
    "groups": {
      "f64_2.core": "Core criteria",
      "f64_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f64_2.core_symptoms": "Anhaltende Inkongruenz zwischen erlebtem Geschlecht und dem bei der Geburt zugewiesenen Geschlecht mit deutlichem Wunsch, das andere Geschlecht zu sein oder als anderes Geschlecht behandelt zu werden, und distress und/oder Funktionsimpairment",
      "f64_2.exclude_other": "Die Inkongruenz ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "gender_identity_disorder_other": {
    "name": "Other gender identity disorders",
    "differentials": [
      "Geschlechtsdysphorie (F64.0/F64.2)",
      "Zwitterrolle-Transvestismus (F64.1)"
    ],
    "groups": {
      "f64_8.core": "Core criteria",
      "f64_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f64_8.core_symptoms": "Näher bezeichnete Störung der Geschlechtsidentität, die keiner der spezifischeren F64-Unterkategorien entspricht",
      "f64_8.exclude_other": "Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "gender_identity_disorder_unspecified": {
    "name": "Gender identity disorder, unspecified",
    "differentials": [
      "Geschlechtsdysphorie (F64.0/F64.2)"
    ],
    "groups": {
      "f64_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f64_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f64_9.core_symptoms": "Störung der Geschlechtsidentität ohne nähere Spezifizierung",
      "f64_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f64_9.exclude_other": "Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "sexual_preference_disorders_stem": {
    "name": "Disorders of sexual preference",
    "differentials": [
      "Fetischismus (F65.0)",
      "Exhibitionismus (F65.2)",
      "Voyeurismus (F65.3)",
      "Pädophilie (F65.4)"
    ],
    "groups": {
      "f65.core": "Core criteria",
      "f65.exclusions": "Exclusions"
    },
    "criteria": {
      "f65.core_symptoms": "Wiederkehrende, intensivierte sexuelle Fantasien, Impulse oder Verhaltensweisen mit atypischer Sexualpräferenz, die zu distress oder impairment führen oder ein Risiko für Dritte darstellen",
      "f65.exclude_other": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "fetishism": {
    "name": "Fetishism",
    "differentials": [
      "Fetischistischer Transvestismus (F65.1)",
      "Normophile sexuelle Präferenz"
    ],
    "groups": {
      "f65_0.preference": "Sexual preference and behaviour",
      "f65_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_0.recurrent_preference": "Wiederkehrende, intensive sexuelle Erregung durch unbelebte Objekte oder spezifische Körperteile (außer Kleidung des anderen Geschlechts), mit wiederholtem Verhalten oder Fantasien",
      "f65_0.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_0.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "fetishistic_transvestism": {
    "name": "Fetishistic transvestism",
    "differentials": [
      "Geschlechtsdysphorie (F64.0)",
      "Zwitterrolle-Transvestismus (F64.1)"
    ],
    "groups": {
      "f65_1.preference": "Sexual preference and behaviour",
      "f65_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_1.recurrent_preference": "Wiederkehrende, intensive sexuelle Erregung durch das Tragen von Kleidung des anderen Geschlechts, mit wiederholtem Verhalten oder Fantasien",
      "f65_1.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_1.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "exhibitionism": {
    "name": "Exhibitionism",
    "differentials": [
      "Voyeurismus (F65.3)",
      "Antisoziale Persönlichkeitsstörung"
    ],
    "groups": {
      "f65_2.preference": "Sexual preference and behaviour",
      "f65_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_2.recurrent_preference": "Wiederkehrende, intensive sexuelle Erregung durch das Entblößen des eigenen Genitales vor einer nicht einverstandenen Person, mit wiederholtem Verhalten oder Fantasien",
      "f65_2.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_2.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "voyeurism": {
    "name": "Voyeurism",
    "differentials": [
      "Exhibitionismus (F65.2)",
      "Stalking ohne sexuelle Motivation"
    ],
    "groups": {
      "f65_3.preference": "Sexual preference and behaviour",
      "f65_3.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_3.recurrent_preference": "Wiederkehrende, intensive sexuelle Erregung durch das heimliche Beobachten unsicherer oder nackter Personen, mit wiederholtem Verhalten oder Fantasien",
      "f65_3.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_3.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "paedophilia": {
    "name": "Paedophilia",
    "differentials": [
      "Hebephilie",
      "Antisoziale Persönlichkeitsstörung",
      "Intellektuelle Entwicklungsstörung mit unangemessenem Sexualverhalten"
    ],
    "groups": {
      "f65_4.preference": "Sexual preference and behaviour",
      "f65_4.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_4.recurrent_preference": "Wiederkehrende, intensive sexuelle Erregung durch präpubertäre oder früh pubertäre Kinder (in der Regel ≤ 13 Jahre), mit wiederholtem Verhalten oder Fantasien",
      "f65_4.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_4.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "sadomasochism": {
    "name": "Sadomasochism",
    "differentials": [
      "Einvernehmliche BDSM-Praktiken ohne distress",
      "Antisoziale Persönlichkeitsstörung"
    ],
    "groups": {
      "f65_5.preference": "Sexual preference and behaviour",
      "f65_5.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_5.recurrent_preference": "Wiederkehrende, intensive sexuelle Erregung durch das Zufügen von Schmerz/Humiliation oder das Erleiden von Schmerz/Humiliation, mit wiederholtem Verhalten oder Fantasien",
      "f65_5.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_5.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "multiple_sexual_preferences": {
    "name": "Multiple disorders of sexual preference",
    "differentials": [
      "Einzelne Paraphilie (F65.0–F65.5)"
    ],
    "groups": {
      "f65_6.preference": "Sexual preference and behaviour",
      "f65_6.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_6.recurrent_preference": "Wiederkehrende, intensive sexuelle Erregung durch mehrere atypische Sexualpräferenzen (z. B. Kombination aus Fetischismus, Exhibitionismus und Voyeurismus), mit wiederholtem Verhalten oder Fantasien",
      "f65_6.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_6.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "sexual_preference_disorder_other": {
    "name": "Other disorders of sexual preference",
    "differentials": [
      "Spezifische Paraphilien (F65.0–F65.6)"
    ],
    "groups": {
      "f65_8.preference": "Sexual preference and behaviour",
      "f65_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_8.recurrent_preference": "Näher bezeichnete atypische Sexualpräferenz, die keiner der spezifischeren F65-Unterkategorien entspricht, mit wiederholtem Verhalten oder Fantasien",
      "f65_8.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_8.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "sexual_preference_disorder_unspecified": {
    "name": "Disorder of sexual preference, unspecified",
    "differentials": [
      "Spezifische Paraphilien (F65.0–F65.8)"
    ],
    "groups": {
      "f65_9.preference": "Sexual preference and behaviour",
      "f65_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_9.recurrent_preference": "Atypische Sexualpräferenz ohne nähere Spezifizierung, mit wiederholtem Verhalten oder Fantasien und distress oder impairment",
      "f65_9.distress_impairment": "The preference leads to personal distress and/or impairment in social, occupational or other important functional areas, or poses a risk of harm to others",
      "f65_9.exclude_consensual_adult": "Consensual sexual practices between adults without distress or impairment do not constitute a disorder"
    }
  },
  "psychosexual_development_disorders_stem": {
    "name": "Psychological and behavioural disorders associated with sexual development and orientation",
    "differentials": [
      "Geschlechtsdysphorie (F64)",
      "Egodystone sexuelle Orientierung (F66.1)",
      "Sexuelle Beziehungsstörung (F66.2)"
    ],
    "groups": {
      "f66.core": "Core criteria",
      "f66.exclusions": "Exclusions"
    },
    "criteria": {
      "f66.core_symptoms": "Psychologische oder Verhaltensstörung im Zusammenhang mit sexueller Entwicklung oder -orientierung mit distress und/oder Funktionsimpairment",
      "f66.exclude_other": "Die sexuelle Orientierung an sich ist keine Störung; nur assoziierte distress- oder Funktionsstörungen werden hier kodiert"
    }
  },
  "sexual_maturation_disorder": {
    "name": "Sexual maturation disorder",
    "differentials": [
      "Normale Pubertätsentwicklung",
      "Geschlechtsdysphorie (F64)"
    ],
    "groups": {
      "f66_0.core": "Core criteria",
      "f66_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f66_0.core_symptoms": "Unsicherheit, Verwirrung oder distress im Zusammenhang mit der sexuellen Reifung und der Entwicklung der sexuellen Identität",
      "f66_0.exclude_other": "Die Unsicherheit ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "egodystonic_sexual_orientation": {
    "name": "Egodystonic sexual orientation",
    "differentials": [
      "Interne Homo-/Transphobie",
      "Depressive Episode",
      "Anpassungsstörung"
    ],
    "groups": {
      "f66_1.core": "Core criteria",
      "f66_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f66_1.core_symptoms": "distress und/oder Funktionsimpairment aufgrund der eigenen sexuellen Orientierung, ohne Wunsch nach einer Veränderung der Orientierung selbst",
      "f66_1.exclude_other": "Die sexuelle Orientierung an sich ist keine Störung; nur der assoziierte distress wird hier erfasst"
    }
  },
  "sexual_relationship_disorder": {
    "name": "Sexual relationship disorder",
    "differentials": [
      "Paartherapeutische Konflikte ohne Störung",
      "Sexuelle Funktionsstörung (F52)"
    ],
    "groups": {
      "f66_2.core": "Core criteria",
      "f66_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f66_2.core_symptoms": "distress und/oder Funktionsimpairment in der sexuellen Beziehung zu einem Partner, unabhängig von der sexuellen Orientierung",
      "f66_2.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "psychosexual_development_disorder_other": {
    "name": "Other psychosexual development disorders",
    "differentials": [
      "Geschlechtsdysphorie (F64)",
      "Spezifische F66-Unterkategorien"
    ],
    "groups": {
      "f66_8.core": "Core criteria",
      "f66_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f66_8.core_symptoms": "Näher bezeichnete psychosexuelle Entwicklungsstörung, die keiner der spezifischeren F66-Unterkategorien entspricht",
      "f66_8.exclude_other": "Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "psychosexual_development_disorder_unspecified": {
    "name": "Psychosexual development disorder, unspecified",
    "differentials": [
      "Geschlechtsdysphorie (F64)",
      "Spezifische F66-Unterkategorien"
    ],
    "groups": {
      "f66_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f66_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f66_9.core_symptoms": "Psychosexuelle Entwicklungsstörung ohne nähere Spezifizierung",
      "f66_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f66_9.exclude_other": "Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "other_adult_personality_behaviour_stem": {
    "name": "Other disorders of adult personality and behaviour",
    "differentials": [
      "Artifizielle Störung (F68.1)",
      "Symptomüberspitzung (F68.0)",
      "Primäre Persönlichkeitsstörung (F60)"
    ],
    "groups": {
      "f68.core": "Core criteria",
      "f68.exclusions": "Exclusions"
    },
    "criteria": {
      "f68.core_symptoms": "Störung der erwachsenen Persönlichkeit oder des Verhaltens, die keiner spezifischeren F68-Unterkategorie zugeordnet ist",
      "f68.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "elaboration_physical_symptoms": {
    "name": "Elaboration of physical symptoms for psychological reasons",
    "differentials": [
      "Somatoforme Störung (F45)",
      "Artifizielle Störung (F68.1)",
      "Malingering"
    ],
    "groups": {
      "f68_0.core": "Core criteria",
      "f68_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f68_0.core_symptoms": "Übertriebene Darstellung oder Überspitzung tatsächlich vorhandener körperlicher Symptome aus psychologischen Gründen (z. B. um Aufmerksamkeit oder Unterstützung zu erhalten), ohne bewusste Täuschungsabsicht",
      "f68_0.exclude_other": "Es liegt keine bewusste Täuschung oder Simulation vor (sonst F68.1)"
    }
  },
  "factitious_disorder": {
    "name": "Intentional production or feigning of symptoms or disabilities [factitious disorder]",
    "differentials": [
      "Malingering",
      "Somatoforme Störung (F45)",
      "Symptomüberspitzung (F68.0)"
    ],
    "groups": {
      "f68_1.core": "Core criteria",
      "f68_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f68_1.core_symptoms": "Wiederholte, absichtliche Erzeugung oder Vortäuschung körperlicher oder psychischer Symptome oder Behinderungen, um in der Rolle eines kranken oder verletzten Patienten behandelt zu werden",
      "f68_1.exclude_other": "Die Symptome sind nicht besser durch eine somatoforme Störung ohne Täuschungsabsicht erklärbar"
    }
  },
  "adult_personality_behaviour_disorder_other": {
    "name": "Other specified disorders of adult personality and behaviour",
    "differentials": [
      "Artifizielle Störung (F68.1)",
      "Symptomüberspitzung (F68.0)",
      "Primäre Persönlichkeitsstörung (F60)"
    ],
    "groups": {
      "f68_8.core": "Core criteria",
      "f68_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f68_8.core_symptoms": "Näher bezeichnete Störung der erwachsenen Persönlichkeit oder des Verhaltens, die keiner der spezifischeren F68-Unterkategorien entspricht",
      "f68_8.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "mixed_specific_developmental_disorder": {
    "name": "Mixed specific developmental disorders",
    "differentials": [
      "Legasthenie (F81.0)",
      "Rechenstörung (F81.2)",
      "Intellektuelle Entwicklungsstörung (F70–F79)"
    ],
    "groups": {
      "f83.core": "Core criteria",
      "f83.exclusions": "Exclusions",
      "6a0z.domains": "Deficits in at least two neurodevelopmental domains",
      "6a0z.conditions": "Diagnostic conditions",
      "6a0z.exclusions": "Exclusions"
    },
    "criteria": {
      "f83.core_symptoms": "Kombinierte, spezifische Entwicklungsstörungen in mindestens zwei Bereichen (z. B. Sprache und motorische Koordination oder Lesen und Rechnen), die nicht allein durch eine allgemeine intellektuelle Entwicklungsstörung erklärbar sind",
      "f83.exclude_other": "Der Leistungsrückstand ist nicht allein durch eine intellektuelle Entwicklungsstörung oder soziale Deprivation erklärbar",
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
      "ADHS (F90)",
      "Autismus-Spektrum (F84)",
      "Spezifische Entwicklungsstörungen (F80–F83)"
    ],
    "groups": {
      "f88.core": "Core criteria",
      "f88.exclusions": "Exclusions"
    },
    "criteria": {
      "f88.core_symptoms": "Näher bezeichnete Störung der psychologischen Entwicklung, die keiner der spezifischeren F8-Unterkategorien entspricht",
      "f88.exclude_other": "Die Störung ist nicht besser durch eine intellektuelle Entwicklungsstörung oder eine primäre psychische Störung allein erklärbar"
    }
  },
  "unspecified_psychological_development_disorder": {
    "name": "Unspecified disorder of psychological development",
    "differentials": [
      "ADHS (F90)",
      "Autismus-Spektrum (F84)",
      "Spezifische Entwicklungsstörungen (F80–F83)"
    ],
    "groups": {
      "f89.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f89.exclusions": "Exclusions"
    },
    "criteria": {
      "f89.core_symptoms": "Störung der psychologischen Entwicklung ohne nähere Spezifizierung",
      "f89.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f89.exclude_other": "Die Störung ist nicht besser durch eine intellektuelle Entwicklungsstörung allein erklärbar"
    }
  },
  "childhood_emotional_disorders_stem": {
    "name": "Emotional disorders with onset specific to childhood",
    "differentials": [
      "Trennungsangst (F93.0)",
      "Phobische Angst im Kindesalter (F93.1)",
      "Soziale Angst im Kindesalter (F93.2)"
    ],
    "groups": {
      "f93.core": "Core criteria",
      "f93.exclusions": "Exclusions"
    },
    "criteria": {
      "f93.core_symptoms": "Emotionale Störung mit Beginn in der Kindheit, die keiner spezifischeren F93-Unterkategorie zugeordnet ist",
      "f93.exclude_other": "The presentation is not better explained by a primary mental disorder or substance use alone"
    }
  },
  "childhood_phobic_anxiety": {
    "name": "Phobic anxiety disorder of childhood",
    "differentials": [
      "Spezifische Phobie (F40.2)",
      "Trennungsangst (F93.0)",
      "Normaler Entwicklungsangst"
    ],
    "groups": {
      "f93_1.core": "Core criteria",
      "f93_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f93_1.core_symptoms": "Ausgeprägte, altersunangemessene Angst vor bestimmten Objekten oder Situationen mit Vermeidung oder Ertragen nur unter distress, mit Beginn in der Kindheit",
      "f93_1.exclude_other": "Die Angst ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "childhood_social_anxiety": {
    "name": "Social anxiety disorder of childhood",
    "differentials": [
      "Soziale Phobie (F40.1)",
      "Mutismus (F94.0)",
      "Autismus-Spektrum (F84)"
    ],
    "groups": {
      "f93_2.core": "Core criteria",
      "f93_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f93_2.core_symptoms": "Ausgeprägte, altersunangemessene Angst in sozialen Situationen mit Vermeidung oder Ertragen nur unter distress, mit Beginn in der Kindheit",
      "f93_2.exclude_other": "Die Angst ist nicht besser durch Autismus-Spektrum-Störung oder Mutismus allein erklärbar"
    }
  },
  "sibling_rivalry_disorder": {
    "name": "Sibling rivalry disorder",
    "differentials": [
      "Normale Geschwisterrivalität",
      "Verhaltensstörung (F91)",
      "Anpassungsstörung nach Geschwistergeburt"
    ],
    "groups": {
      "f93_3.core": "Core criteria",
      "f93_3.exclusions": "Exclusions"
    },
    "criteria": {
      "f93_3.core_symptoms": "Ausgeprägte Eifersucht, Rivalität oder aggressives Verhalten gegenüber einem Geschwisterkind, das über altersübliche Reaktionen auf die Geburt oder Anwesenheit eines Geschwisters hinausgeht und zu Funktionsimpairment führt",
      "f93_3.exclude_other": "Das Verhalten ist nicht besser durch eine Verhaltensstörung oder eine primäre affektive Störung allein erklärbar"
    }
  },
  "childhood_emotional_disorder_other": {
    "name": "Other childhood emotional disorders",
    "differentials": [
      "Trennungsangst (F93.0)",
      "Phobische Angst im Kindesalter (F93.1)"
    ],
    "groups": {
      "f93_8.core": "Core criteria",
      "f93_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f93_8.core_symptoms": "Näher bezeichnete emotionale Störung mit Beginn in der Kindheit, die keiner der spezifischeren F93-Unterkategorien entspricht",
      "f93_8.exclude_other": "Die Symptomatik ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "childhood_emotional_disorder_unspecified": {
    "name": "Childhood emotional disorder, unspecified",
    "differentials": [
      "Trennungsangst (F93.0)",
      "Phobische Angst im Kindesalter (F93.1)"
    ],
    "groups": {
      "f93_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f93_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f93_9.core_symptoms": "Emotionale Störung mit Beginn in der Kindheit ohne nähere Spezifizierung",
      "f93_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f93_9.exclude_other": "Die Symptomatik ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "childhood_social_functioning_disorders_stem": {
    "name": "Disorders of social functioning with onset specific to childhood and adolescence",
    "differentials": [
      "Elektiver Mutismus (F94.0)",
      "Reaktive Bindungsstörung (F94.1)",
      "Bindungsstörung mit Enthemmung (F94.2)"
    ],
    "groups": {
      "f94.core": "Core criteria",
      "f94.exclusions": "Exclusions"
    },
    "criteria": {
      "f94.core_symptoms": "Störung des Sozialverhaltens mit Beginn in Kindheit oder Jugend, die keiner spezifischeren F94-Unterkategorie zugeordnet ist",
      "f94.exclude_other": "Die Störung ist nicht besser durch Autismus-Spektrum-Störung allein erklärbar"
    }
  },
  "childhood_social_functioning_disorder_other": {
    "name": "Other childhood disorders of social functioning",
    "differentials": [
      "Elektiver Mutismus (F94.0)",
      "Bindungsstörungen (F94.1/F94.2)"
    ],
    "groups": {
      "f94_8.core": "Core criteria",
      "f94_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f94_8.core_symptoms": "Näher bezeichnete Störung des Sozialverhaltens mit Beginn in Kindheit oder Jugend, die keiner der spezifischeren F94-Unterkategorien entspricht",
      "f94_8.exclude_other": "Die Störung ist nicht besser durch Autismus-Spektrum-Störung allein erklärbar"
    }
  },
  "childhood_social_functioning_disorder_unspecified": {
    "name": "Childhood disorder of social functioning, unspecified",
    "differentials": [
      "Elektiver Mutismus (F94.0)",
      "Bindungsstörungen (F94.1/F94.2)"
    ],
    "groups": {
      "f94_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f94_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f94_9.core_symptoms": "Störung des Sozialverhaltens mit Beginn in Kindheit oder Jugend ohne nähere Spezifizierung",
      "f94_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f94_9.exclude_other": "Die Störung ist nicht besser durch Autismus-Spektrum-Störung allein erklärbar"
    }
  },
  "childhood_behavioural_emotional_disorders_stem": {
    "name": "Other behavioural and emotional disorders with onset usually occurring in childhood and adolescence",
    "differentials": [
      "Enuresis (F98.0)",
      "Enkopresis (F98.1)",
      "Pica (F98.3)",
      "Stereotype Bewegungsstörung (F98.4)"
    ],
    "groups": {
      "f98.core": "Core criteria",
      "f98.exclusions": "Exclusions"
    },
    "criteria": {
      "f98.core_symptoms": "Verhaltens- oder emotionale Störung mit Beginn in Kindheit oder Jugend, die keiner spezifischeren F98-Unterkategorie zugeordnet ist",
      "f98.exclude_other": "Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "pica_childhood": {
    "name": "Pica of childhood",
    "differentials": [
      "Normales exploratives Verhalten im Kleinkindalter",
      "Intellektuelle Entwicklungsstörung",
      "Zwangsstörung"
    ],
    "groups": {
      "f98_3.core": "Core criteria",
      "f98_3.exclusions": "Exclusions"
    },
    "criteria": {
      "f98_3.core_symptoms": "Wiederholtes oder anhaltendes Essen nicht essbarer Substanzen (z. B. Erde, Farbe, Sand, Papier) über ein altersgerechtes Maß hinaus, über mindestens einen Monat",
      "f98_3.exclude_other": "Das Verhalten ist nicht besser durch eine intellektuelle Entwicklungsstörung oder kulturelle Praxis allein erklärbar"
    }
  },
  "childhood_behavioural_disorder_other": {
    "name": "Other specified behavioural and emotional disorders with onset usually occurring in childhood and adolescence",
    "differentials": [
      "Enuresis (F98.0)",
      "Enkopresis (F98.1)",
      "Pica (F98.3)"
    ],
    "groups": {
      "f98_8.core": "Core criteria",
      "f98_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f98_8.core_symptoms": "Näher bezeichnete Verhaltens- oder emotionale Störung mit Beginn in Kindheit oder Jugend, die keiner der spezifischeren F98-Unterkategorien entspricht",
      "f98_8.exclude_other": "Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "childhood_behavioural_disorder_unspecified": {
    "name": "Unspecified behavioural and emotional disorders with onset usually occurring in childhood and adolescence",
    "differentials": [
      "Enuresis (F98.0)",
      "Enkopresis (F98.1)",
      "Pica (F98.3)"
    ],
    "groups": {
      "f98_9.core": "Clinical symptomatology without sufficient information for a more specific assignment",
      "f98_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f98_9.core_symptoms": "Verhaltens- oder emotionale Störung mit Beginn in Kindheit oder Jugend ohne nähere Spezifizierung",
      "f98_9.insufficient_information": "The available information is insufficient or contradictory for a more specific diagnosis (provisional or holding category)",
      "f98_9.exclude_other": "Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "unspecified_mental_disorder": {
    "name": "Mental disorder, not otherwise specified",
    "differentials": [
      "Spezifische psychische Störung bei vollständiger Kriterienerfüllung",
      "Organische oder substanzbedingte Störung",
      "Normale Reaktion auf Lebensumstände"
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
