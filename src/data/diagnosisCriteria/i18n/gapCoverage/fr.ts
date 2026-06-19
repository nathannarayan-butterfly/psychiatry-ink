import type { DisorderTranslationMap } from '../types'

export const gapFR: DisorderTranslationMap = {
  "dementia_other_diseases_stem": {
    "name": "Dementia in other diseases classified elsewhere",
    "differentials": [
      "Demenz bei Alzheimer-Krankheit (F00)",
      "Vaskuläre Demenz (F01)",
      "Primär psychiatrische Störung mit kognitiven Symptomen",
      "Delir (akuter Beginn, fluktuierende Bewusstseinslage)"
    ],
    "groups": {
      "f02.core": "Critères principaux",
      "f02.exclusions": "Exclusions"
    },
    "criteria": {
      "f02.core_symptoms": "Syndrome démentiel",
      "f02.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
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
      "f02_1.cognition": "Syndrome démentiel",
      "f02_1.aetiology": "Attribution étiologique",
      "f02_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f02_1.memory_decline": "Déclin de la mémoire",
      "f02_1.cognitive_decline": "Abnahme höherer kognitiver Funktionen gegenüber dem früheren Leistungsniveau",
      "f02_1.functional_impact": "Altération de la gestion des activités quotidiennes",
      "f02_1.underlying_disease": "Nachweis oder begründete Annahme einer Creutzfeldt-Jakob-Krankheit (Prionerkrankung) als ursächlicher Grunderkrankung",
      "f02_1.exclude_delirium": "Pas de trouble de la conscience suggérant un delirium"
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
      "f02_2.cognition": "Syndrome démentiel",
      "f02_2.aetiology": "Attribution étiologique",
      "f02_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f02_2.memory_decline": "Déclin de la mémoire",
      "f02_2.cognitive_decline": "Abnahme höherer kognitiver Funktionen gegenüber dem früheren Leistungsniveau",
      "f02_2.functional_impact": "Altération de la gestion des activités quotidiennes",
      "f02_2.underlying_disease": "Nachweis oder begründete Annahme einer Huntington-Krankheit als ursächlicher Grunderkrankung",
      "f02_2.exclude_delirium": "Pas de trouble de la conscience suggérant un delirium"
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
      "f02_3.cognition": "Syndrome démentiel",
      "f02_3.aetiology": "Attribution étiologique",
      "f02_3.exclusions": "Exclusions"
    },
    "criteria": {
      "f02_3.memory_decline": "Déclin de la mémoire",
      "f02_3.cognitive_decline": "Abnahme höherer kognitiver Funktionen gegenüber dem früheren Leistungsniveau",
      "f02_3.functional_impact": "Altération de la gestion des activités quotidiennes",
      "f02_3.underlying_disease": "Nachweis oder begründete Annahme einer Parkinson-Krankheit als ursächlicher Grunderkrankung",
      "f02_3.exclude_delirium": "Pas de trouble de la conscience suggérant un delirium"
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
      "f02_4.cognition": "Syndrome démentiel",
      "f02_4.aetiology": "Attribution étiologique",
      "f02_4.exclusions": "Exclusions"
    },
    "criteria": {
      "f02_4.memory_decline": "Déclin de la mémoire",
      "f02_4.cognitive_decline": "Abnahme höherer kognitiver Funktionen gegenüber dem früheren Leistungsniveau",
      "f02_4.functional_impact": "Altération de la gestion des activités quotidiennes",
      "f02_4.underlying_disease": "Nachweis oder begründete Annahme einer HIV-Infektion als ursächlicher Grunderkrankung",
      "f02_4.exclude_delirium": "Pas de trouble de la conscience suggérant un delirium"
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
      "f03.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f03.exclusions": "Exclusions"
    },
    "criteria": {
      "f03.core_symptoms": "Syndrome démentiel",
      "f03.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f03.exclude_other": "Syndrome démentiel"
    }
  },
  "organic_mental_disorders_stem": {
    "name": "Other mental troubles due to brain damage and dysfunction and to physical disease",
    "differentials": [
      "Primäre psychische Störung ohne organische Ursache",
      "Substanz-/medikamenteninduzierte psychische Störung",
      "Delir (F05)"
    ],
    "groups": {
      "f06.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f06.exclusions": "Exclusions"
    },
    "criteria": {
      "f06.core_symptoms": "Psychische Symptomatik (außerhalb der bereits separat erfassten organischen Syndrome), die einer nachgewiesenen oder wahrscheinlichen Hirnschädigung, Hirndysfunktion oder körperlichen Erkrankung zugeordnet wird",
      "f06.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f06.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "organic_catatonic_disorder": {
    "name": "Organic catatonic trouble",
    "differentials": [
      "Katatonie bei Schizophrenie",
      "Neuroleptisches malignes Syndrom",
      "Delir"
    ],
    "groups": {
      "f06_1.syndrome": "Syndrome clinique",
      "f06_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f06_1.clinical_picture": "Katatonie (z. B. Stupor, Mutismus, Negativismus, Wachsflexibilität, Stereotypien, Manierismen) im Zusammenhang mit einer organischen Ursache",
      "f06_1.organic_cause": "Preuve ou hypothèse raisonnable d’une maladie physique, cérébrale ou systémique causale pouvant expliquer le syndrome mental",
      "f06_1.exclude_primary": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "organic_anxiety_disorder": {
    "name": "Organic anxiety trouble",
    "differentials": [
      "Generalisierte Angststörung (F41.1)",
      "Panikstörung (F41.0)",
      "Substanzinduzierte Angst"
    ],
    "groups": {
      "f06_4.syndrome": "Syndrome clinique",
      "f06_4.exclusions": "Exclusions"
    },
    "criteria": {
      "f06_4.clinical_picture": "Ausgeprägte Angstsymptomatik, die einer organischen Ursache zugeordnet wird",
      "f06_4.organic_cause": "Preuve ou hypothèse raisonnable d’une maladie physique, cérébrale ou systémique causale pouvant expliquer le syndrome mental",
      "f06_4.exclude_primary": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "organic_dissociative_disorder": {
    "name": "Organic dissociative trouble",
    "differentials": [
      "Dissoziative Störungen (F44)",
      "PTBS",
      "Substanzinduzierte Dissoziation"
    ],
    "groups": {
      "f06_5.syndrome": "Syndrome clinique",
      "f06_5.exclusions": "Exclusions"
    },
    "criteria": {
      "f06_5.clinical_picture": "Dissoziative Symptomatik (z. B. Depersonalisation, Derealisation, Amnesie, Identitätsstörung), die einer organischen Ursache zugeordnet wird",
      "f06_5.organic_cause": "Preuve ou hypothèse raisonnable d’une maladie physique, cérébrale ou systémique causale pouvant expliquer le syndrome mental",
      "f06_5.exclude_primary": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "organic_mental_disorder_other": {
    "name": "Other specified mental troubles due to brain damage and dysfunction and to physical disease",
    "differentials": [
      "Spezifische organische Syndrome (F06.0–F06.7)",
      "Primäre psychische Störung"
    ],
    "groups": {
      "f06_8.core": "Critères principaux",
      "f06_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f06_8.core_symptoms": "Näher bezeichnete psychische Symptomatik, die einer Hirnschädigung, Hirndysfunktion oder körperlichen Erkrankung zugeordnet wird und keiner der spezifischeren F06-Unterkategorien entspricht",
      "f06_8.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "organic_mental_disorder_unspecified": {
    "name": "Unspecified mental trouble due to brain damage and dysfunction and to physical disease",
    "differentials": [
      "Spezifische organische Syndrome (F06.0–F06.8)",
      "Primäre psychische Störung"
    ],
    "groups": {
      "f06_9.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f06_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f06_9.core_symptoms": "Psychische Symptomatik, die einer organischen Ursache zugeordnet wird, ohne dass eine spezifischere F06-Unterkategorie zutrifft",
      "f06_9.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f06_9.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
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
      "f07_1.core": "Critères principaux",
      "f07_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f07_1.core_symptoms": "Anhaltende psychische oder Verhaltensveränderungen (z. B. Erschöpfung, Affektlabilität, Konzentrationsstörung, Schlafstörung) nach einer Enzephalitis oder vergleichbarer zerebraler Infektion/Entzündung",
      "f07_1.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "organic_personality_disorder_other": {
    "name": "Other organic personality and behavioural troubles due to brain disease, damage and dysfunction",
    "differentials": [
      "Organische Persönlichkeitsstörung (F07.0)",
      "Primäre Persönlichkeitsstörung (F60)"
    ],
    "groups": {
      "f07_8.core": "Critères principaux",
      "f07_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f07_8.core_symptoms": "Näher bezeichnete, organische Ursache zugeschriebene Veränderung von Persönlichkeit und Verhalten, die keiner spezifischeren F07-Unterkategorie entspricht",
      "f07_8.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "organic_personality_disorder_unspecified": {
    "name": "Unspecified organic personality and behavioural trouble due to brain disease, damage and dysfunction",
    "differentials": [
      "Organische Persönlichkeitsstörung (F07.0)",
      "Primäre Persönlichkeitsstörung (F60)"
    ],
    "groups": {
      "f07_9.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f07_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f07_9.core_symptoms": "Organische Ursache zugeschriebene Veränderung von Persönlichkeit und Verhalten, ohne nähere Spezifizierung",
      "f07_9.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f07_9.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "unspecified_organic_mental_disorder": {
    "name": "Unspecified organic or symptomatic mental trouble",
    "differentials": [
      "Spezifische organische Syndrome (F00–F07)",
      "Primäre psychische Störung",
      "Substanzbedingte Störung"
    ],
    "groups": {
      "f09.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f09.exclusions": "Exclusions"
    },
    "criteria": {
      "f09.core_symptoms": "Psychische Symptomatik mit Hinweis auf eine organische oder symptomatische Ursache, die keiner spezifischeren F0-Kategorie zugeordnet werden kann",
      "f09.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f09.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "stimulants_substance_stem": {
    "name": "Mental and behavioural troubles due to use of other stimulants, including caffeine",
    "differentials": [
      "Stimulanzien-Abhängigkeit (F15.2)",
      "Stimulanzien-Intoxikation (F15.0)",
      "Primäre psychische Störung ohne Substanzbezug"
    ],
    "groups": {
      "f15.core": "Critères principaux",
      "f15.exclusions": "Exclusions"
    },
    "criteria": {
      "f15.core_symptoms": "Klinisch bedeutsame psychische oder Verhaltensstörung im Zusammenhang mit dem Gebrauch anderer Stimulanzien (einschließlich Koffein), wenn keine spezifischere F15-Unterkategorie angegeben ist",
      "f15.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "multiple_substances_stem": {
    "name": "Mental and behavioural troubles due to multiple drug use and use of other psychoactive substances",
    "differentials": [
      "Abhängigkeit von multiplen Substanzen (F19.2)",
      "Einzelsubstanz-Störungen (F10–F18)",
      "Primäre psychische Störung ohne Substanzbezug"
    ],
    "groups": {
      "f19.core": "Critères principaux",
      "f19.exclusions": "Exclusions"
    },
    "criteria": {
      "f19.core_symptoms": "Klinisch bedeutsame psychische oder Verhaltensstörung im Zusammenhang mit multiplem Substanzgebrauch oder anderen psychotropen Substanzen, wenn keine spezifischere F19-Unterkategorie angegeben ist",
      "f19.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "persistent_affective_disorders_stem": {
    "name": "Persistent mood [affective] troubles",
    "differentials": [
      "Zyklothymie (F34.0)",
      "Dysthymie (F34.1)",
      "Rezidivierende depressive Störung (F33)",
      "Bipolare Störung (F31)"
    ],
    "groups": {
      "f34.core": "Critères principaux",
      "f34.exclusions": "Exclusions"
    },
    "criteria": {
      "f34.core_symptoms": "Anhaltende affektive Symptomatik über einen längeren Zeitraum, die den Schweregrad einer depressiven oder manischen Episode nicht erreicht",
      "f34.exclude_other": "La symptomatologie n’est pas attribuable à un trouble mental organique ou à une consommation de substances"
    }
  },
  "persistent_affective_disorder_unspecified": {
    "name": "Persistent affective trouble, unspecified",
    "differentials": [
      "Zyklothymie (F34.0)",
      "Dysthymie (F34.1)",
      "Autres anhaltende affektive Störung (F34.8)"
    ],
    "groups": {
      "f34_9.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f34_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f34_9.core_symptoms": "Anhaltende affektive Symptomatik, die keiner spezifischeren F34-Unterkategorie zugeordnet werden kann",
      "f34_9.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f34_9.exclude_other": "La symptomatologie n’est pas attribuable à un trouble mental organique ou à une consommation de substances"
    }
  },
  "phobic_anxiety_disorders_stem": {
    "name": "Phobic anxiety troubles",
    "differentials": [
      "Agoraphobie (F40.0)",
      "Soziale Phobie (F40.1)",
      "Spezifische Phobie (F40.2)",
      "Panikstörung (F41.0)"
    ],
    "groups": {
      "f40.core": "Critères principaux",
      "f40.exclusions": "Exclusions"
    },
    "criteria": {
      "f40.core_symptoms": "Ausgeprägte, situationsgebundene oder spezifische Angst mit Vermeidung oder Ertragen nur unter Leidensdruck",
      "f40.exclude_other": "Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "phobic_anxiety_disorder_other": {
    "name": "Other phobic anxiety troubles",
    "differentials": [
      "Agoraphobie (F40.0)",
      "Soziale Phobie (F40.1)",
      "Spezifische Phobie (F40.2)"
    ],
    "groups": {
      "f40_8.core": "Critères principaux",
      "f40_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f40_8.core_symptoms": "Näher bezeichnete phobische Angststörung, die keiner der spezifischeren F40-Unterkategorien entspricht",
      "f40_8.exclude_other": "Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "phobic_anxiety_disorder_unspecified": {
    "name": "Phobic anxiety trouble, unspecified",
    "differentials": [
      "Agoraphobie (F40.0)",
      "Soziale Phobie (F40.1)",
      "Spezifische Phobie (F40.2)"
    ],
    "groups": {
      "f40_9.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f40_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f40_9.core_symptoms": "Phobische Angstsymptomatik ohne nähere Spezifizierung der Phobie",
      "f40_9.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f40_9.exclude_other": "Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "other_anxiety_disorders_stem": {
    "name": "Other anxiety troubles",
    "differentials": [
      "Panikstörung (F41.0)",
      "Generalisierte Angststörung (F41.1)",
      "Gemischte Angst-Depression (F41.2)"
    ],
    "groups": {
      "f41.core": "Critères principaux",
      "f41.exclusions": "Exclusions"
    },
    "criteria": {
      "f41.core_symptoms": "Klinisch bedeutsame Angstsymptomatik, die keiner spezifischeren F41-Unterkategorie zugeordnet ist",
      "f41.exclude_other": "Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "mixed_anxiety_disorder_other": {
    "name": "Other mixed anxiety troubles",
    "differentials": [
      "Gemischte Angst-Depression (F41.2)",
      "Generalisierte Angststörung (F41.1)"
    ],
    "groups": {
      "f41_3.core": "Critères principaux",
      "f41_3.exclusions": "Exclusions"
    },
    "criteria": {
      "f41_3.core_symptoms": "Gemischte Angstsymptomatik mit überlappenden Angstmustern, die keiner spezifischeren F41-Unterkategorie entspricht",
      "f41_3.exclude_other": "Die Symptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "anxiety_disorder_other": {
    "name": "Other specified anxiety troubles",
    "differentials": [
      "Panikstörung (F41.0)",
      "Generalisierte Angststörung (F41.1)",
      "Phobische Störungen (F40)"
    ],
    "groups": {
      "f41_8.core": "Critères principaux",
      "f41_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f41_8.core_symptoms": "Näher bezeichnete Angststörung, die keiner der spezifischeren F41-Unterkategorien entspricht",
      "f41_8.exclude_other": "Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "anxiety_disorder_unspecified": {
    "name": "Anxiety trouble, unspecified",
    "differentials": [
      "Panikstörung (F41.0)",
      "Generalisierte Angststörung (F41.1)",
      "Phobische Störungen (F40)"
    ],
    "groups": {
      "f41_9.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f41_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f41_9.core_symptoms": "Klinisch bedeutsame Angstsymptomatik ohne nähere Spezifizierung",
      "f41_9.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f41_9.exclude_other": "Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "stress_reaction_disorders_stem": {
    "name": "Reaction to severe stress, and adjustment troubles",
    "differentials": [
      "Akute Belastungsreaktion (F43.0)",
      "PTBS (F43.1)",
      "Anpassungsstörung (F43.2)"
    ],
    "groups": {
      "f43.core": "Critères principaux",
      "f43.exclusions": "Exclusions"
    },
    "criteria": {
      "f43.core_symptoms": "Psychische Reaktion auf einen identifizierbaren schweren Stressor mit klinisch bedeutsamer Symptomatik",
      "f43.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
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
      "f43_8.core": "Critères principaux",
      "f43_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f43_8.core_symptoms": "Näher bezeichnete Reaktion auf schweren Stress, die keiner der spezifischeren F43-Unterkategorien entspricht",
      "f43_8.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
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
      "f43_9.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f43_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f43_9.core_symptoms": "Reaktion auf schweren Stress ohne nähere Spezifizierung",
      "f43_9.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f43_9.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "other_neurotic_disorders_stem": {
    "name": "Other neurotic troubles",
    "differentials": [
      "Neurasthenie (F48.0)",
      "Depersonalisation/Derealisation (F48.1)",
      "Dissoziative Störungen (F44)"
    ],
    "groups": {
      "f48.core": "Critères principaux",
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
      "f48_0.core": "Critères principaux",
      "f48_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f48_0.core_symptoms": "Anhaltende Erschöpfung mit reduzierter Leistungsfähigkeit und vegetativen Beschwerden nach psychischer oder körperlicher Überanstrengung",
      "f48_0.exclude_other": "Die Erschöpfung ist nicht besser durch eine somatische Erkrankung oder eine depressive Episode allein erklärbar"
    }
  },
  "depersonalization_derealization_disorder": {
    "name": "Depersonalization-derealization trouble",
    "differentials": [
      "Dissoziative Störungen (F44)",
      "Panikstörung",
      "Substanzinduzierte Dissoziation",
      "Schizophrenie"
    ],
    "groups": {
      "f48_1.core": "Critères principaux",
      "f48_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f48_1.core_symptoms": "Wiederkehrende oder anhaltende Depersonalisations- und/oder Derealisationserlebnisse bei erhaltenem Realitätsbewusstsein",
      "f48_1.exclude_other": "Die Erlebnisse sind nicht besser durch eine andere psychische Störung, Substanzwirkung oder organische Ursache erklärbar"
    }
  },
  "neurotic_disorder_other": {
    "name": "Other specified neurotic troubles",
    "differentials": [
      "Neurasthenie (F48.0)",
      "Depersonalisation/Derealisation (F48.1)"
    ],
    "groups": {
      "f48_8.core": "Critères principaux",
      "f48_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f48_8.core_symptoms": "Näher bezeichnete neurotische Störung, die keiner der spezifischeren F48-Unterkategorien entspricht",
      "f48_8.exclude_other": "Die Symptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "neurotic_disorder_unspecified": {
    "name": "Neurotic trouble, unspecified",
    "differentials": [
      "Neurasthenie (F48.0)",
      "Depersonalisation/Derealisation (F48.1)"
    ],
    "groups": {
      "f48_9.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f48_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f48_9.core_symptoms": "Neurotische Symptomatik ohne nähere Spezifizierung",
      "f48_9.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f48_9.exclude_other": "Die Symptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar"
    }
  },
  "eating_disorders_stem": {
    "name": "Eating troubles",
    "differentials": [
      "Anorexia nervosa (F50.0)",
      "Bulimia nervosa (F50.2)",
      "Binge-Eating-Störung"
    ],
    "groups": {
      "f50.core": "Critères principaux",
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
      "f50_5.core": "Critères principaux",
      "f50_5.exclusions": "Exclusions"
    },
    "criteria": {
      "f50_5.core_symptoms": "Wiederholtes Erbrechen ohne hinreichende somatische Erklärung, das einer psychischen Störung zugeordnet wird",
      "f50_5.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "eating_disorder_other": {
    "name": "Other eating troubles",
    "differentials": [
      "Anorexia nervosa (F50.0)",
      "Bulimia nervosa (F50.2)",
      "Binge-Eating-Störung"
    ],
    "groups": {
      "f50_8.core": "Critères principaux",
      "f50_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f50_8.core_symptoms": "Näher bezeichnete Essstörung, die keiner der spezifischeren F50-Unterkategorien entspricht",
      "f50_8.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "eating_disorder_unspecified": {
    "name": "Eating trouble, unspecified",
    "differentials": [
      "Anorexia nervosa (F50.0)",
      "Bulimia nervosa (F50.2)"
    ],
    "groups": {
      "f50_9.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f50_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f50_9.core_symptoms": "Störung des Essverhaltens ohne nähere Spezifizierung",
      "f50_9.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f50_9.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "nonorganic_sleep_disorders_stem": {
    "name": "Nonorganic sleep troubles",
    "differentials": [
      "Insomnie (F51.0)",
      "Albträume (F51.5)",
      "Pavor nocturnus (F51.4)",
      "Organische Schlafstörung"
    ],
    "groups": {
      "f51.core": "Critères principaux",
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
      "f51_1.core": "Critères principaux",
      "f51_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f51_1.core_symptoms": "Anhaltende übermäßige Tagesschläfrigkeit oder verlängerte Schlafdauer bei erhaltenem Schlafbedürfnis trotz adäquater Schlafgelegenheit",
      "f51_1.exclude_other": "Die Hypersomnie ist nicht besser durch eine somatische Erkrankung oder Substanzwirkung allein erklärbar"
    }
  },
  "sleep_wake_schedule_disorder": {
    "name": "Nonorganic trouble of the sleep-wake schedule",
    "differentials": [
      "Insomnie (F51.0)",
      "Schichtarbeit",
      "Jetlag",
      "Organische Schlafstörung"
    ],
    "groups": {
      "f51_2.core": "Critères principaux",
      "f51_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f51_2.core_symptoms": "Persistierende Störung des Schlaf-Wach-Rhythmus mit Einschlaf- oder Aufwachzeitpunkt außerhalb des gewünschten Zeitfensters und damit verbundener Beeinträchtigung",
      "f51_2.exclude_other": "Die Störung ist nicht besser durch eine somatische Erkrankung oder Substanzwirkung allein erklärbar"
    }
  },
  "sleep_disorder_other": {
    "name": "Other nonorganic sleep troubles",
    "differentials": [
      "Insomnie (F51.0)",
      "Hypersomnie (F51.1)",
      "Albträume (F51.5)"
    ],
    "groups": {
      "f51_8.core": "Critères principaux",
      "f51_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f51_8.core_symptoms": "Näher bezeichnete nichtorganische Schlafstörung, die keiner der spezifischeren F51-Unterkategorien entspricht",
      "f51_8.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "sleep_disorder_unspecified": {
    "name": "Nonorganic sleep trouble, unspecified",
    "differentials": [
      "Insomnie (F51.0)",
      "Hypersomnie (F51.1)"
    ],
    "groups": {
      "f51_9.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f51_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f51_9.core_symptoms": "Nichtorganische Schlafstörung ohne nähere Spezifizierung",
      "f51_9.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f51_9.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "psychological_factors_somatic": {
    "name": "Psychological and behavioural factors associated with troubles or diseases classified elsewhere",
    "differentials": [
      "Somatoforme Störung (F45)",
      "Körperliche Belastungsstörung",
      "Primäre psychische Störung"
    ],
    "groups": {
      "f54.core": "Critères principaux",
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
      "f55.core": "Critères principaux",
      "f55.exclusions": "Exclusions"
    },
    "criteria": {
      "f55.core_symptoms": "Wiederholter Konsum nichtabhängigkeitserzeugender Substanzen (z. B. Laxanzien, Analgetika, Vitamine, pflanzliche Präparate) mit psychischen oder körperlichen Schäden, ohne Erfüllung der Abhängigkeitskriterien",
      "f55.exclude_other": "Die Kriterien einer Substanzabhängigkeit sind nicht erfüllt"
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
      "f59.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f59.exclusions": "Exclusions"
    },
    "criteria": {
      "f59.core_symptoms": "Verhaltenssyndrom mit physiologischen Störungen und körperlichen Faktoren, das keiner spezifischeren F5-Kategorie zugeordnet werden kann",
      "f59.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f59.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
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
      "f62.core": "Critères principaux",
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
      "f62_0.core": "Critères principaux",
      "f62_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f62_0.core_symptoms": "Dauerhafte Veränderung von Persönlichkeit und Verhalten nach einer extrem belastenden Erfahrung (z. B. längerer Haft, Katastrophe, Krieg), die über eine akute Belastungsreaktion hinausgeht",
      "f62_0.exclude_other": "Die Veränderung ist nicht Folge einer Hirnschädigung oder -krankheit und nicht besser durch PTBS allein erklärbar"
    }
  },
  "habit_impulse_disorders_stem": {
    "name": "Habit and impulse troubles",
    "differentials": [
      "Pathologisches Spielen (F63.0)",
      "Pyromanie (F63.1)",
      "Kleptomanie (F63.2)",
      "Trichotillomanie (F63.3)"
    ],
    "groups": {
      "f63.core": "Critères principaux",
      "f63.exclusions": "Exclusions"
    },
    "criteria": {
      "f63.core_symptoms": "Wiederholtes, schwer kontrollierbares Verhalten mit innerem Drang und Erleichterung oder Befriedigung danach",
      "f63.exclude_other": "Das Verhalten ist nicht besser durch eine andere psychische Störung oder Substanzwirkung erklärbar"
    }
  },
  "habit_impulse_disorder_other": {
    "name": "Other habit and impulse troubles",
    "differentials": [
      "Pathologisches Spielen (F63.0)",
      "Pyromanie (F63.1)",
      "Kleptomanie (F63.2)"
    ],
    "groups": {
      "f63_8.core": "Critères principaux",
      "f63_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f63_8.core_symptoms": "Näher bezeichnete Habit- oder Impulsstörung, die keiner der spezifischeren F63-Unterkategorien entspricht",
      "f63_8.exclude_other": "Das Verhalten ist nicht besser durch eine andere psychische Störung erklärbar"
    }
  },
  "habit_impulse_disorder_unspecified": {
    "name": "Habit and impulse trouble, unspecified",
    "differentials": [
      "Pathologisches Spielen (F63.0)",
      "Pyromanie (F63.1)",
      "Kleptomanie (F63.2)"
    ],
    "groups": {
      "f63_9.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f63_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f63_9.core_symptoms": "Habit- oder Impulsstörung ohne nähere Spezifizierung",
      "f63_9.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f63_9.exclude_other": "Das Verhalten ist nicht besser durch eine andere psychische Störung erklärbar"
    }
  },
  "gender_identity_disorders_stem": {
    "name": "Gender identity troubles",
    "differentials": [
      "Geschlechtsdysphorie im Erwachsenenalter (F64.0)",
      "Geschlechtsdysphorie im Kindesalter (F64.2)",
      "Transvestismus ohne Geschlechtsdysphorie"
    ],
    "groups": {
      "f64.core": "Critères principaux",
      "f64.exclusions": "Exclusions"
    },
    "criteria": {
      "f64.core_symptoms": "Anhaltende Inkongruenz zwischen erlebtem Geschlecht und dem bei der Geburt zugewiesenen Geschlecht mit Leidensdruck und/oder Funktionsbeeinträchtigung",
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
      "f64_0.core": "Critères principaux",
      "f64_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f64_0.core_symptoms": "Anhaltende Inkongruenz zwischen erlebtem Geschlecht und dem bei der Geburt zugewiesenen Geschlecht mit Wunsch nach geschlechtsangleichenden Maßnahmen und Leidensdruck und/oder Funktionsbeeinträchtigung",
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
      "f64_1.core": "Critères principaux",
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
      "f64_2.core": "Critères principaux",
      "f64_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f64_2.core_symptoms": "Anhaltende Inkongruenz zwischen erlebtem Geschlecht und dem bei der Geburt zugewiesenen Geschlecht mit deutlichem Wunsch, das andere Geschlecht zu sein oder als anderes Geschlecht behandelt zu werden, und Leidensdruck und/oder Funktionsbeeinträchtigung",
      "f64_2.exclude_other": "Die Inkongruenz ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "gender_identity_disorder_other": {
    "name": "Other gender identity troubles",
    "differentials": [
      "Geschlechtsdysphorie (F64.0/F64.2)",
      "Zwitterrolle-Transvestismus (F64.1)"
    ],
    "groups": {
      "f64_8.core": "Critères principaux",
      "f64_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f64_8.core_symptoms": "Näher bezeichnete Störung der Geschlechtsidentität, die keiner der spezifischeren F64-Unterkategorien entspricht",
      "f64_8.exclude_other": "Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "gender_identity_disorder_unspecified": {
    "name": "Gender identity trouble, unspecified",
    "differentials": [
      "Geschlechtsdysphorie (F64.0/F64.2)"
    ],
    "groups": {
      "f64_9.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f64_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f64_9.core_symptoms": "Störung der Geschlechtsidentität ohne nähere Spezifizierung",
      "f64_9.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f64_9.exclude_other": "Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "sexual_preference_disorders_stem": {
    "name": "troubles of sexual preference",
    "differentials": [
      "Fetischismus (F65.0)",
      "Exhibitionismus (F65.2)",
      "Voyeurismus (F65.3)",
      "Pädophilie (F65.4)"
    ],
    "groups": {
      "f65.core": "Critères principaux",
      "f65.exclusions": "Exclusions"
    },
    "criteria": {
      "f65.core_symptoms": "Wiederkehrende, intensivierte sexuelle Fantasien, Impulse oder Verhaltensweisen mit atypischer Sexualpräferenz, die zu Leidensdruck oder Beeinträchtigung führen oder ein Risiko für Dritte darstellen",
      "f65.exclude_other": "Des pratiques sexuelles consensuelles entre adultes sans détresse ni altération ne constituent pas un trouble"
    }
  },
  "fetishism": {
    "name": "Fetishism",
    "differentials": [
      "Fetischistischer Transvestismus (F65.1)",
      "Normophile sexuelle Präferenz"
    ],
    "groups": {
      "f65_0.preference": "Préférence et comportement sexuels",
      "f65_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_0.recurrent_preference": "Wiederkehrende, intensive sexuelle Erregung durch unbelebte Objekte oder spezifische Körperteile (außer Kleidung des anderen Geschlechts), mit wiederholtem Verhalten oder Fantasien",
      "f65_0.distress_impairment": "La préférence entraîne une détresse personnelle et/ou une altération des fonctions sociales, professionnelles ou autres, ou présente un risque de préjudice pour autrui",
      "f65_0.exclude_consensual_adult": "Des pratiques sexuelles consensuelles entre adultes sans détresse ni altération ne constituent pas un trouble"
    }
  },
  "fetishistic_transvestism": {
    "name": "Fetishistic transvestism",
    "differentials": [
      "Geschlechtsdysphorie (F64.0)",
      "Zwitterrolle-Transvestismus (F64.1)"
    ],
    "groups": {
      "f65_1.preference": "Préférence et comportement sexuels",
      "f65_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_1.recurrent_preference": "Wiederkehrende, intensive sexuelle Erregung durch das Tragen von Kleidung des anderen Geschlechts, mit wiederholtem Verhalten oder Fantasien",
      "f65_1.distress_impairment": "La préférence entraîne une détresse personnelle et/ou une altération des fonctions sociales, professionnelles ou autres, ou présente un risque de préjudice pour autrui",
      "f65_1.exclude_consensual_adult": "Des pratiques sexuelles consensuelles entre adultes sans détresse ni altération ne constituent pas un trouble"
    }
  },
  "exhibitionism": {
    "name": "Exhibitionism",
    "differentials": [
      "Voyeurismus (F65.3)",
      "Antisoziale Persönlichkeitsstörung"
    ],
    "groups": {
      "f65_2.preference": "Préférence et comportement sexuels",
      "f65_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_2.recurrent_preference": "Wiederkehrende, intensive sexuelle Erregung durch das Entblößen des eigenen Genitales vor einer nicht einverstandenen Person, mit wiederholtem Verhalten oder Fantasien",
      "f65_2.distress_impairment": "La préférence entraîne une détresse personnelle et/ou une altération des fonctions sociales, professionnelles ou autres, ou présente un risque de préjudice pour autrui",
      "f65_2.exclude_consensual_adult": "Des pratiques sexuelles consensuelles entre adultes sans détresse ni altération ne constituent pas un trouble"
    }
  },
  "voyeurism": {
    "name": "Voyeurism",
    "differentials": [
      "Exhibitionismus (F65.2)",
      "Stalking ohne sexuelle Motivation"
    ],
    "groups": {
      "f65_3.preference": "Préférence et comportement sexuels",
      "f65_3.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_3.recurrent_preference": "Wiederkehrende, intensive sexuelle Erregung durch das heimliche Beobachten unsicherer oder nackter Personen, mit wiederholtem Verhalten oder Fantasien",
      "f65_3.distress_impairment": "La préférence entraîne une détresse personnelle et/ou une altération des fonctions sociales, professionnelles ou autres, ou présente un risque de préjudice pour autrui",
      "f65_3.exclude_consensual_adult": "Des pratiques sexuelles consensuelles entre adultes sans détresse ni altération ne constituent pas un trouble"
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
      "f65_4.preference": "Préférence et comportement sexuels",
      "f65_4.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_4.recurrent_preference": "Wiederkehrende, intensive sexuelle Erregung durch präpubertäre oder früh pubertäre Kinder (in der Regel ≤ 13 Jahre), mit wiederholtem Verhalten oder Fantasien",
      "f65_4.distress_impairment": "La préférence entraîne une détresse personnelle et/ou une altération des fonctions sociales, professionnelles ou autres, ou présente un risque de préjudice pour autrui",
      "f65_4.exclude_consensual_adult": "Des pratiques sexuelles consensuelles entre adultes sans détresse ni altération ne constituent pas un trouble"
    }
  },
  "sadomasochism": {
    "name": "Sadomasochism",
    "differentials": [
      "Einvernehmliche BDSM-Praktiken ohne Leidensdruck",
      "Antisoziale Persönlichkeitsstörung"
    ],
    "groups": {
      "f65_5.preference": "Préférence et comportement sexuels",
      "f65_5.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_5.recurrent_preference": "Wiederkehrende, intensive sexuelle Erregung durch das Zufügen von Schmerz/Humiliation oder das Erleiden von Schmerz/Humiliation, mit wiederholtem Verhalten oder Fantasien",
      "f65_5.distress_impairment": "La préférence entraîne une détresse personnelle et/ou une altération des fonctions sociales, professionnelles ou autres, ou présente un risque de préjudice pour autrui",
      "f65_5.exclude_consensual_adult": "Des pratiques sexuelles consensuelles entre adultes sans détresse ni altération ne constituent pas un trouble"
    }
  },
  "multiple_sexual_preferences": {
    "name": "Multiple troubles of sexual preference",
    "differentials": [
      "Einzelne Paraphilie (F65.0–F65.5)"
    ],
    "groups": {
      "f65_6.preference": "Préférence et comportement sexuels",
      "f65_6.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_6.recurrent_preference": "Wiederkehrende, intensive sexuelle Erregung durch mehrere atypische Sexualpräferenzen (z. B. Kombination aus Fetischismus, Exhibitionismus und Voyeurismus), mit wiederholtem Verhalten oder Fantasien",
      "f65_6.distress_impairment": "La préférence entraîne une détresse personnelle et/ou une altération des fonctions sociales, professionnelles ou autres, ou présente un risque de préjudice pour autrui",
      "f65_6.exclude_consensual_adult": "Des pratiques sexuelles consensuelles entre adultes sans détresse ni altération ne constituent pas un trouble"
    }
  },
  "sexual_preference_disorder_other": {
    "name": "Other troubles of sexual preference",
    "differentials": [
      "Spezifische Paraphilien (F65.0–F65.6)"
    ],
    "groups": {
      "f65_8.preference": "Préférence et comportement sexuels",
      "f65_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_8.recurrent_preference": "Näher bezeichnete atypische Sexualpräferenz, die keiner der spezifischeren F65-Unterkategorien entspricht, mit wiederholtem Verhalten oder Fantasien",
      "f65_8.distress_impairment": "La préférence entraîne une détresse personnelle et/ou une altération des fonctions sociales, professionnelles ou autres, ou présente un risque de préjudice pour autrui",
      "f65_8.exclude_consensual_adult": "Des pratiques sexuelles consensuelles entre adultes sans détresse ni altération ne constituent pas un trouble"
    }
  },
  "sexual_preference_disorder_unspecified": {
    "name": "trouble of sexual preference, unspecified",
    "differentials": [
      "Spezifische Paraphilien (F65.0–F65.8)"
    ],
    "groups": {
      "f65_9.preference": "Préférence et comportement sexuels",
      "f65_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f65_9.recurrent_preference": "Atypische Sexualpräferenz ohne nähere Spezifizierung, mit wiederholtem Verhalten oder Fantasien und Leidensdruck oder Beeinträchtigung",
      "f65_9.distress_impairment": "La préférence entraîne une détresse personnelle et/ou une altération des fonctions sociales, professionnelles ou autres, ou présente un risque de préjudice pour autrui",
      "f65_9.exclude_consensual_adult": "Des pratiques sexuelles consensuelles entre adultes sans détresse ni altération ne constituent pas un trouble"
    }
  },
  "psychosexual_development_disorders_stem": {
    "name": "Psychological and behavioural troubles associated with sexual development and orientation",
    "differentials": [
      "Geschlechtsdysphorie (F64)",
      "Egodystone sexuelle Orientierung (F66.1)",
      "Sexuelle Beziehungsstörung (F66.2)"
    ],
    "groups": {
      "f66.core": "Critères principaux",
      "f66.exclusions": "Exclusions"
    },
    "criteria": {
      "f66.core_symptoms": "Psychologische oder Verhaltensstörung im Zusammenhang mit sexueller Entwicklung oder -orientierung mit Leidensdruck und/oder Funktionsbeeinträchtigung",
      "f66.exclude_other": "Die sexuelle Orientierung an sich ist keine Störung; nur assoziierte Leidensdruck- oder Funktionsstörungen werden hier kodiert"
    }
  },
  "sexual_maturation_disorder": {
    "name": "Sexual maturation trouble",
    "differentials": [
      "Normale Pubertätsentwicklung",
      "Geschlechtsdysphorie (F64)"
    ],
    "groups": {
      "f66_0.core": "Critères principaux",
      "f66_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f66_0.core_symptoms": "Unsicherheit, Verwirrung oder Leidensdruck im Zusammenhang mit der sexuellen Reifung und der Entwicklung der sexuellen Identität",
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
      "f66_1.core": "Critères principaux",
      "f66_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f66_1.core_symptoms": "Leidensdruck und/oder Funktionsbeeinträchtigung aufgrund der eigenen sexuellen Orientierung, ohne Wunsch nach einer Veränderung der Orientierung selbst",
      "f66_1.exclude_other": "Die sexuelle Orientierung an sich ist keine Störung; nur der assoziierte Leidensdruck wird hier erfasst"
    }
  },
  "sexual_relationship_disorder": {
    "name": "Sexual relationship trouble",
    "differentials": [
      "Paartherapeutische Konflikte ohne Störung",
      "Sexuelle Funktionsstörung (F52)"
    ],
    "groups": {
      "f66_2.core": "Critères principaux",
      "f66_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f66_2.core_symptoms": "Leidensdruck und/oder Funktionsbeeinträchtigung in der sexuellen Beziehung zu einem Partner, unabhängig von der sexuellen Orientierung",
      "f66_2.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "psychosexual_development_disorder_other": {
    "name": "Other psychosexual development troubles",
    "differentials": [
      "Geschlechtsdysphorie (F64)",
      "Spezifische F66-Unterkategorien"
    ],
    "groups": {
      "f66_8.core": "Critères principaux",
      "f66_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f66_8.core_symptoms": "Näher bezeichnete psychosexuelle Entwicklungsstörung, die keiner der spezifischeren F66-Unterkategorien entspricht",
      "f66_8.exclude_other": "Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "psychosexual_development_disorder_unspecified": {
    "name": "Psychosexual development trouble, unspecified",
    "differentials": [
      "Geschlechtsdysphorie (F64)",
      "Spezifische F66-Unterkategorien"
    ],
    "groups": {
      "f66_9.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f66_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f66_9.core_symptoms": "Psychosexuelle Entwicklungsstörung ohne nähere Spezifizierung",
      "f66_9.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f66_9.exclude_other": "Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "other_adult_personality_behaviour_stem": {
    "name": "Other troubles of adult personality and behaviour",
    "differentials": [
      "Artifizielle Störung (F68.1)",
      "Symptomüberspitzung (F68.0)",
      "Primäre Persönlichkeitsstörung (F60)"
    ],
    "groups": {
      "f68.core": "Critères principaux",
      "f68.exclusions": "Exclusions"
    },
    "criteria": {
      "f68.core_symptoms": "Störung der erwachsenen Persönlichkeit oder des Verhaltens, die keiner spezifischeren F68-Unterkategorie zugeordnet ist",
      "f68.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
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
      "f68_0.core": "Critères principaux",
      "f68_0.exclusions": "Exclusions"
    },
    "criteria": {
      "f68_0.core_symptoms": "Übertriebene Darstellung oder Überspitzung tatsächlich vorhandener körperlicher Symptome aus psychologischen Gründen (z. B. um Aufmerksamkeit oder Unterstützung zu erhalten), ohne bewusste Täuschungsabsicht",
      "f68_0.exclude_other": "Es liegt keine bewusste Täuschung oder Simulation vor (sonst F68.1)"
    }
  },
  "factitious_disorder": {
    "name": "Intentional production or feigning of symptoms or disabilities [factitious trouble]",
    "differentials": [
      "Malingering",
      "Somatoforme Störung (F45)",
      "Symptomüberspitzung (F68.0)"
    ],
    "groups": {
      "f68_1.core": "Critères principaux",
      "f68_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f68_1.core_symptoms": "Wiederholte, absichtliche Erzeugung oder Vortäuschung körperlicher oder psychischer Symptome oder Behinderungen, um in der Rolle eines kranken oder verletzten Patienten behandelt zu werden",
      "f68_1.exclude_other": "Die Symptome sind nicht besser durch eine somatoforme Störung ohne Täuschungsabsicht erklärbar"
    }
  },
  "adult_personality_behaviour_disorder_other": {
    "name": "Other specified troubles of adult personality and behaviour",
    "differentials": [
      "Artifizielle Störung (F68.1)",
      "Symptomüberspitzung (F68.0)",
      "Primäre Persönlichkeitsstörung (F60)"
    ],
    "groups": {
      "f68_8.core": "Critères principaux",
      "f68_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f68_8.core_symptoms": "Näher bezeichnete Störung der erwachsenen Persönlichkeit oder des Verhaltens, die keiner der spezifischeren F68-Unterkategorien entspricht",
      "f68_8.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "mixed_specific_developmental_disorder": {
    "name": "Mixed specific developmental troubles",
    "differentials": [
      "Legasthenie (F81.0)",
      "Rechenstörung (F81.2)",
      "Intellektuelle Entwicklungsstörung (F70–F79)"
    ],
    "groups": {
      "f83.core": "Critères principaux",
      "f83.exclusions": "Exclusions"
    },
    "criteria": {
      "f83.core_symptoms": "Kombinierte, spezifische Entwicklungsstörungen in mindestens zwei Bereichen (z. B. Sprache und motorische Koordination oder Lesen und Rechnen), die nicht allein durch eine allgemeine intellektuelle Entwicklungsstörung erklärbar sind",
      "f83.exclude_other": "Der Leistungsrückstand ist nicht allein durch eine intellektuelle Entwicklungsstörung oder soziale Deprivation erklärbar"
    }
  },
  "other_psychological_development_disorder": {
    "name": "Other troubles of psychological development",
    "differentials": [
      "ADHS (F90)",
      "Autismus-Spektrum (F84)",
      "Spezifische Entwicklungsstörungen (F80–F83)"
    ],
    "groups": {
      "f88.core": "Critères principaux",
      "f88.exclusions": "Exclusions"
    },
    "criteria": {
      "f88.core_symptoms": "Näher bezeichnete Störung der psychologischen Entwicklung, die keiner der spezifischeren F8-Unterkategorien entspricht",
      "f88.exclude_other": "Die Störung ist nicht besser durch eine intellektuelle Entwicklungsstörung oder eine primäre psychische Störung allein erklärbar"
    }
  },
  "unspecified_psychological_development_disorder": {
    "name": "Unspecified trouble of psychological development",
    "differentials": [
      "ADHS (F90)",
      "Autismus-Spektrum (F84)",
      "Spezifische Entwicklungsstörungen (F80–F83)"
    ],
    "groups": {
      "f89.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f89.exclusions": "Exclusions"
    },
    "criteria": {
      "f89.core_symptoms": "Störung der psychologischen Entwicklung ohne nähere Spezifizierung",
      "f89.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f89.exclude_other": "Die Störung ist nicht besser durch eine intellektuelle Entwicklungsstörung allein erklärbar"
    }
  },
  "childhood_emotional_disorders_stem": {
    "name": "Emotional troubles with onset specific to childhood",
    "differentials": [
      "Trennungsangst (F93.0)",
      "Phobische Angst im Kindesalter (F93.1)",
      "Soziale Angst im Kindesalter (F93.2)"
    ],
    "groups": {
      "f93.core": "Critères principaux",
      "f93.exclusions": "Exclusions"
    },
    "criteria": {
      "f93.core_symptoms": "Emotionale Störung mit Beginn in der Kindheit, die keiner spezifischeren F93-Unterkategorie zugeordnet ist",
      "f93.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
  "childhood_phobic_anxiety": {
    "name": "Phobic anxiety trouble of childhood",
    "differentials": [
      "Spezifische Phobie (F40.2)",
      "Trennungsangst (F93.0)",
      "Normaler Entwicklungsangst"
    ],
    "groups": {
      "f93_1.core": "Critères principaux",
      "f93_1.exclusions": "Exclusions"
    },
    "criteria": {
      "f93_1.core_symptoms": "Ausgeprägte, altersunangemessene Angst vor bestimmten Objekten oder Situationen mit Vermeidung oder Ertragen nur unter Leidensdruck, mit Beginn in der Kindheit",
      "f93_1.exclude_other": "Die Angst ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "childhood_social_anxiety": {
    "name": "Social anxiety trouble of childhood",
    "differentials": [
      "Soziale Phobie (F40.1)",
      "Mutismus (F94.0)",
      "Autismus-Spektrum (F84)"
    ],
    "groups": {
      "f93_2.core": "Critères principaux",
      "f93_2.exclusions": "Exclusions"
    },
    "criteria": {
      "f93_2.core_symptoms": "Ausgeprägte, altersunangemessene Angst in sozialen Situationen mit Vermeidung oder Ertragen nur unter Leidensdruck, mit Beginn in der Kindheit",
      "f93_2.exclude_other": "Die Angst ist nicht besser durch Autismus-Spektrum-Störung oder Mutismus allein erklärbar"
    }
  },
  "sibling_rivalry_disorder": {
    "name": "Sibling rivalry trouble",
    "differentials": [
      "Normale Geschwisterrivalität",
      "Verhaltensstörung (F91)",
      "Anpassungsstörung nach Geschwistergeburt"
    ],
    "groups": {
      "f93_3.core": "Critères principaux",
      "f93_3.exclusions": "Exclusions"
    },
    "criteria": {
      "f93_3.core_symptoms": "Ausgeprägte Eifersucht, Rivalität oder aggressives Verhalten gegenüber einem Geschwisterkind, das über altersübliche Reaktionen auf die Geburt oder Anwesenheit eines Geschwisters hinausgeht und zu Funktionsbeeinträchtigung führt",
      "f93_3.exclude_other": "Das Verhalten ist nicht besser durch eine Verhaltensstörung oder eine primäre affektive Störung allein erklärbar"
    }
  },
  "childhood_emotional_disorder_other": {
    "name": "Other childhood emotional troubles",
    "differentials": [
      "Trennungsangst (F93.0)",
      "Phobische Angst im Kindesalter (F93.1)"
    ],
    "groups": {
      "f93_8.core": "Critères principaux",
      "f93_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f93_8.core_symptoms": "Näher bezeichnete emotionale Störung mit Beginn in der Kindheit, die keiner der spezifischeren F93-Unterkategorien entspricht",
      "f93_8.exclude_other": "Die Symptomatik ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "childhood_emotional_disorder_unspecified": {
    "name": "Childhood emotional trouble, unspecified",
    "differentials": [
      "Trennungsangst (F93.0)",
      "Phobische Angst im Kindesalter (F93.1)"
    ],
    "groups": {
      "f93_9.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f93_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f93_9.core_symptoms": "Emotionale Störung mit Beginn in der Kindheit ohne nähere Spezifizierung",
      "f93_9.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f93_9.exclude_other": "Die Symptomatik ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "childhood_social_functioning_disorders_stem": {
    "name": "troubles of social functioning with onset specific to childhood and adolescence",
    "differentials": [
      "Elektiver Mutismus (F94.0)",
      "Reaktive Bindungsstörung (F94.1)",
      "Bindungsstörung mit Enthemmung (F94.2)"
    ],
    "groups": {
      "f94.core": "Critères principaux",
      "f94.exclusions": "Exclusions"
    },
    "criteria": {
      "f94.core_symptoms": "Störung des Sozialverhaltens mit Beginn in Kindheit oder Jugend, die keiner spezifischeren F94-Unterkategorie zugeordnet ist",
      "f94.exclude_other": "Die Störung ist nicht besser durch Autismus-Spektrum-Störung allein erklärbar"
    }
  },
  "childhood_social_functioning_disorder_other": {
    "name": "Other childhood troubles of social functioning",
    "differentials": [
      "Elektiver Mutismus (F94.0)",
      "Bindungsstörungen (F94.1/F94.2)"
    ],
    "groups": {
      "f94_8.core": "Critères principaux",
      "f94_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f94_8.core_symptoms": "Näher bezeichnete Störung des Sozialverhaltens mit Beginn in Kindheit oder Jugend, die keiner der spezifischeren F94-Unterkategorien entspricht",
      "f94_8.exclude_other": "Die Störung ist nicht besser durch Autismus-Spektrum-Störung allein erklärbar"
    }
  },
  "childhood_social_functioning_disorder_unspecified": {
    "name": "Childhood trouble of social functioning, unspecified",
    "differentials": [
      "Elektiver Mutismus (F94.0)",
      "Bindungsstörungen (F94.1/F94.2)"
    ],
    "groups": {
      "f94_9.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f94_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f94_9.core_symptoms": "Störung des Sozialverhaltens mit Beginn in Kindheit oder Jugend ohne nähere Spezifizierung",
      "f94_9.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f94_9.exclude_other": "Die Störung ist nicht besser durch Autismus-Spektrum-Störung allein erklärbar"
    }
  },
  "childhood_behavioural_emotional_disorders_stem": {
    "name": "Other behavioural and emotional troubles with onset usually occurring in childhood and adolescence",
    "differentials": [
      "Enuresis (F98.0)",
      "Enkopresis (F98.1)",
      "Pica (F98.3)",
      "Stereotype Bewegungsstörung (F98.4)"
    ],
    "groups": {
      "f98.core": "Critères principaux",
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
      "f98_3.core": "Critères principaux",
      "f98_3.exclusions": "Exclusions"
    },
    "criteria": {
      "f98_3.core_symptoms": "Wiederholtes oder anhaltendes Essen nicht essbarer Substanzen (z. B. Erde, Farbe, Sand, Papier) über ein altersgerechtes Maß hinaus, über mindestens einen Monat",
      "f98_3.exclude_other": "Das Verhalten ist nicht besser durch eine intellektuelle Entwicklungsstörung oder kulturelle Praxis allein erklärbar"
    }
  },
  "childhood_behavioural_disorder_other": {
    "name": "Other specified behavioural and emotional troubles with onset usually occurring in childhood and adolescence",
    "differentials": [
      "Enuresis (F98.0)",
      "Enkopresis (F98.1)",
      "Pica (F98.3)"
    ],
    "groups": {
      "f98_8.core": "Critères principaux",
      "f98_8.exclusions": "Exclusions"
    },
    "criteria": {
      "f98_8.core_symptoms": "Näher bezeichnete Verhaltens- oder emotionale Störung mit Beginn in Kindheit oder Jugend, die keiner der spezifischeren F98-Unterkategorien entspricht",
      "f98_8.exclude_other": "Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "childhood_behavioural_disorder_unspecified": {
    "name": "Unspecified behavioural and emotional troubles with onset usually occurring in childhood and adolescence",
    "differentials": [
      "Enuresis (F98.0)",
      "Enkopresis (F98.1)",
      "Pica (F98.3)"
    ],
    "groups": {
      "f98_9.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f98_9.exclusions": "Exclusions"
    },
    "criteria": {
      "f98_9.core_symptoms": "Verhaltens- oder emotionale Störung mit Beginn in Kindheit oder Jugend ohne nähere Spezifizierung",
      "f98_9.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f98_9.exclude_other": "Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar"
    }
  },
  "unspecified_mental_disorder": {
    "name": "Mental trouble, not otherwise specified",
    "differentials": [
      "Spezifische psychische Störung bei vollständiger Kriterienerfüllung",
      "Organische oder substanzbedingte Störung",
      "Normale Reaktion auf Lebensumstände"
    ],
    "groups": {
      "f99.core": "Symptomatologie clinique sans information suffisante pour une attribution plus spécifique",
      "f99.exclusions": "Exclusions"
    },
    "criteria": {
      "f99.core_symptoms": "Une symptomatologie mentale cliniquement significative est présente mais ne peut être attribuée à un trouble mental spécifique faute d’informations suffisantes",
      "f99.insufficient_information": "Les informations disponibles sont insuffisantes ou contradictoires pour un diagnostic plus spécifique (catégorie provisoire ou de recours)",
      "f99.exclude_other": "La présentation n’est pas mieux expliquée par un trouble mental primaire ou une consommation de substances seule"
    }
  },
}
