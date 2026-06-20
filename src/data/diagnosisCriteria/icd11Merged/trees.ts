/**
 * LLM-generated ICD-11 criteria trees merged from Phase C drafts.
 * All records remain `status: 'draft'` on the parent disorder — clinician review required.
 *
 * Regenerate: npm run criteria:merge-drafts
 */
import type { Icd11CriteriaSet } from '../schema'

export const MERGED_ICD11_TREES: Record<string, Icd11CriteriaSet> = {
  "agoraphobia": {
    groups: [
      {
        id: "agoraphobia__6b02.situations",
        label_de: "Angst in mindestens zwei agoraphoben Situationen",
        logic: "at_least_n_of",
        threshold: 2,
        groupType: "inclusion",
        criteria: [
          {
            id: "agoraphobia__6b02.situation_public_transport",
            text_de: "Die Person hat ausgeprägte Angst oder Furcht vor der Nutzung öffentlicher Verkehrsmittel wie Bus, Zug oder U-Bahn.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "anxiety_panic_phobic_symptoms"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B02"
              }
            ]
          },
          {
            id: "agoraphobia__6b02.situation_open_spaces",
            text_de: "Die Person hat ausgeprägte Angst oder Furcht davor, sich auf offenen Plätzen wie Parkplätzen oder Brücken aufzuhalten.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "anxiety_panic_phobic_symptoms"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B02"
              }
            ]
          },
          {
            id: "agoraphobia__6b02.situation_enclosed_spaces",
            text_de: "Die Person hat ausgeprägte Angst oder Furcht vor geschlossenen Räumen wie Geschäften, Kinos oder Aufzügen.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "anxiety_panic_phobic_symptoms"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B02"
              }
            ]
          },
          {
            id: "agoraphobia__6b02.situation_crowds",
            text_de: "Die Person hat ausgeprägte Angst oder Furcht davor, sich in einer Menschenmenge oder in einer Warteschlange zu befinden.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "anxiety_panic_phobic_symptoms"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B02"
              }
            ]
          },
          {
            id: "agoraphobia__6b02.situation_alone_outside",
            text_de: "Die Person hat ausgeprägte Angst oder Furcht davor, allein das Haus oder die Wohnung zu verlassen.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "anxiety_panic_phobic_symptoms"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B02"
              }
            ]
          }
        ]
      },
      {
        id: "agoraphobia__6b02.fears_reason",
        label_de: "Grund der Angst: Gedanken an Fluchtunmöglichkeit oder fehlende Hilfe",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "agoraphobia__6b02.fear_escape_help",
            text_de: "Die Person hat wiederkehrende Gedanken, dass ein Entkommen aus den gefürchteten Situationen schwierig oder peinlich sein könnte oder dass im Falle einer Panik oder hilfloser Symptome keine Hilfe verfügbar wäre.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "anxiety_panic_phobic_symptoms"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B02"
              }
            ]
          }
        ]
      },
      {
        id: "agoraphobia__6b02.avoidance",
        label_de: "Vermeidungsverhalten",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "agoraphobia__6b02.avoidance.behavior",
            text_de: "Die gefürchteten Situationen werden aktiv vermieden oder nur mit intensiver Angst oder Unwohlsein ertragen, oft in Begleitung einer Vertrauensperson.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "anxiety_panic_phobic_symptoms"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B02"
              }
            ]
          }
        ]
      },
      {
        id: "agoraphobia__6b02.duration",
        label_de: "Persistenz der Symptome",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "agoraphobia__6b02.duration.period",
            text_de: "Die Angst, die Furcht oder das Vermeidungsverhalten bestehen über einen Zeitraum von mindestens mehreren Monaten und sind anhaltend.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "anxiety_panic_phobic_symptoms"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B02"
              }
            ]
          }
        ]
      },
      {
        id: "agoraphobia__6b02.distress_impairment",
        label_de: "Klinisch bedeutsame Beeinträchtigung",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "agoraphobia__6b02.impairment.functioning",
            text_de: "Die Symptome verursachen klinisch bedeutsames Leiden oder Beeinträchtigungen in sozialen, beruflichen oder anderen wichtigen Funktionsbereichen.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "functional_impairment_distress"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B02"
              }
            ]
          }
        ]
      },
      {
        id: "agoraphobia__6b02.exclusions",
        label_de: "Ausschluss anderer Ursachen",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "agoraphobia__6b02.exclude_other_mental",
            text_de: "Die Symptome sind nicht besser durch eine andere psychische Störung erklärbar, wie Panikstörung, soziale Angststörung, spezifische Phobie, Zwangsstörung, posttraumatische Belastungsstörung oder Trennungsangststörung.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "general_presentation"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B02"
              }
            ]
          },
          {
            id: "agoraphobia__6b02.exclude_substance_medical",
            text_de: "Die Symptome sind nicht auf die direkte physiologische Wirkung einer Substanz (z. B. Droge, Medikament) oder einer körperlichen Erkrankung zurückzuführen.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "general_presentation"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B02"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6B02"
  },
  "delirium_not_substance_induced": {
    groups: [
      {
        id: "deliriumnots__6d70.awareness_attention",
        label_de: "Störung von Bewusstsein und Aufmerksamkeit",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "deliriumnots__6d70.attention_deficit",
            text_de: "Verminderte Fähigkeit, die Aufmerksamkeit zu richten, aufrechtzuerhalten oder zu wechseln",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "attention_concentration"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D70",
                ref: "A"
              }
            ]
          },
          {
            id: "deliriumnots__6d70.awareness_reduction",
            text_de: "Reduzierte Orientierung gegenüber der Umwelt (Bewusstseinstrübung), die sich nicht durch einen schwer reduzierten Arousalzustand (Koma) erklären lässt",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "consciousness_orientation"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D70",
                ref: "A"
              }
            ]
          }
        ]
      },
      {
        id: "deliriumnots__6d70.cognitive_disturbance",
        label_de: "Kognitive Störung (mindestens ein Bereich betroffen)",
        logic: "any_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "deliriumnots__6d70.memory_deficit",
            text_de: "Gedächtnisstörung, insbesondere Beeinträchtigung des Kurzzeitgedächtnisses",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "memory"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D70",
                ref: "B"
              }
            ]
          },
          {
            id: "deliriumnots__6d70.disorientation",
            text_de: "Desorientiertheit zu Zeit, Ort oder Person",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "consciousness_orientation"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D70",
                ref: "B"
              }
            ]
          },
          {
            id: "deliriumnots__6d70.language_disturbance",
            text_de: "Sprachstörung (z. B. Wortfindungsstörungen, inkohärente Äußerungen)",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "formal_thought_language"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D70",
                ref: "B"
              }
            ]
          },
          {
            id: "deliriumnots__6d70.visuospatial_deficit",
            text_de: "Visuospatiale Störung (z. B. Beeinträchtigung beim Erkennen von Gesichtern oder räumlichen Beziehungen)",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "other_cognition"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D70",
                ref: "B"
              }
            ]
          },
          {
            id: "deliriumnots__6d70.perception_disturbance",
            text_de: "Wahrnehmungsstörungen wie Illusionen oder Halluzinationen (oft optisch)",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "perception_hallucinations"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D70",
                ref: "B"
              }
            ]
          }
        ]
      },
      {
        id: "deliriumnots__6d70.temporal_profile",
        label_de: "Akuter Beginn und fluktuierender Verlauf",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "deliriumnots__6d70.acute_onset",
            text_de: "Die Störung entwickelt sich über einen kurzen Zeitraum (typischerweise Stunden bis Tage)",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D70",
                ref: "C"
              }
            ]
          },
          {
            id: "deliriumnots__6d70.fluctuating",
            text_de: "Die Symptome zeigen typischerweise eine fluktuierende, im Tagesverlauf wechselnde Intensität",
            mappingHints: [
              {
                kind: "checklist",
                ref: "fluctuation"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D70",
                ref: "C"
              }
            ]
          }
        ]
      },
      {
        id: "deliriumnots__6d70.exclusions",
        label_de: "Ausschlüsse",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "deliriumnots__6d70.exclude_dementia",
            text_de: "Die Störung ist nicht besser durch eine andere neurokognitive Störung (z. B. Demenz) erklärbar",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "other_cognition"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D70",
                ref: "D"
              }
            ]
          },
          {
            id: "deliriumnots__6d70.exclude_coma",
            text_de: "Die Bewusstseinsstörung tritt nicht im Rahmen eines tiefen Komas auf",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "consciousness_orientation"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D70",
                ref: "D"
              }
            ]
          },
          {
            id: "deliriumnots__6d70.exclude_substance",
            text_de: "Das Delir ist nicht durch Substanzintoxikation, -entzug oder Medikamentennebenwirkung bedingt (sonst Kategorie 'Substanzinduziertes Delir')",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "substance_related_features"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D70",
                ref: "E"
              }
            ]
          }
        ]
      },
      {
        id: "deliriumnots__6d70.etiology_evidence",
        label_de: "Nachweis einer zugrunde liegenden somatischen Ursache",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "deliriumnots__6d70.organic_cause",
            text_de: "Aus Anamnese, körperlicher Untersuchung oder Labordiagnostik ergibt sich ein Hinweis, dass die Störung eine direkte physiologische Folge einer medizinischen Erkrankung oder einer anderen organischen Ursache (ausgenommen Substanzen) ist",
            mappingHints: [
              {
                kind: "checklist",
                ref: "etiology"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D70",
                ref: "E"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6D70"
  },
  "dementia_cjd": {
    groups: [
      {
        id: "dementiacjd__6d85.5.dementia_syndrome",
        label_de: "Demenzsyndrom",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "dementiacjd__6d85.5.cognitive_decline",
            text_de: "Deutlicher Rückgang der Gedächtnisleistung und mindestens einer weiteren kognitiven Funktion (z. B. Exekutivfunktionen, Sprache, visuell-räumliche Fähigkeiten) im Vergleich zum früheren Niveau.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "memory_cognition"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.5"
              }
            ]
          },
          {
            id: "dementiacjd__6d85.5.functional_impairment",
            text_de: "Die kognitive Beeinträchtigung führt zu einer deutlichen Einschränkung der Selbstständigkeit im Alltag (z. B. bei Beruf, Haushalt, sozialen Aktivitäten).",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "functional_impairment"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.5"
              }
            ]
          },
          {
            id: "dementiacjd__6d85.5.not_delirium",
            text_de: "Die Symptome treten nicht ausschließlich im Rahmen eines Delirs auf.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "consciousness_orientation"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.5"
              }
            ]
          }
        ]
      },
      {
        id: "dementiacjd__6d85.5.aetiology",
        label_de: "Ätiologische Hinweise auf Prionerkrankung",
        logic: "any_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "dementiacjd__6d85.5.typical_clinical",
            text_de: "Typische klinische Merkmale einer Creutzfeldt-Jakob-Krankheit wie schnell progrediente Demenz, Myoklonien oder visuelle Symptome.",
            mappingHints: [
              {
                kind: "diagnosis",
                ref: "aetiology"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.5"
              }
            ]
          },
          {
            id: "dementiacjd__6d85.5.positive_biomarker",
            text_de: "Nachweis von 14-3-3 Protein im Liquor, periodischen Sharp-Wave-Komplexen im EEG oder hyperintensen Signalen in Basalganglien oder Kortex im MRT.",
            mappingHints: [
              {
                kind: "diagnosis",
                ref: "aetiology"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.5"
              }
            ]
          },
          {
            id: "dementiacjd__6d85.5.definite_diagnosis",
            text_de: "Histopathologisch oder molekularbiologisch gesicherte Prionerkrankung (z. B. durch Biopsie oder Autopsie).",
            mappingHints: [
              {
                kind: "diagnosis",
                ref: "aetiology"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.5"
              }
            ]
          }
        ]
      },
      {
        id: "dementiacjd__6d85.5.exclusions",
        label_de: "Ausschluss anderer Ursachen",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "dementiacjd__6d85.5.exclude_delirium",
            text_de: "Die Störung ist nicht besser durch ein Delir erklärbar.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "consciousness_orientation"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.5"
              }
            ]
          },
          {
            id: "dementiacjd__6d85.5.exclude_other_aetiology",
            text_de: "Die Demenz ist nicht besser durch eine andere neurodegenerative, zerebrovaskuläre oder metabolische Erkrankung erklärbar.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "general_presentation"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.5"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6D85.5"
  },
  "dementia_hiv": {
    groups: [
      {
        id: "dementiahiv__6d85.3.cognition",
        label_de: "Kognitive Kernbeeinträchtigung",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "dementiahiv__6d85.3.memory_and_executive_decline",
            text_de: "Nachlassende Gedächtnisfunktion und/oder Exekutivfunktionen, die das Alltagsleben merklich beeinträchtigen",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "memory_cognition"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.3"
              }
            ]
          },
          {
            id: "dementiahiv__6d85.3.functional_impairment",
            text_de: "Erheblicher Verlust an Selbstständigkeit bei Aktivitäten des täglichen Lebens infolge der kognitiven Einbußen",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "functional_impairment"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.3"
              }
            ]
          }
        ]
      },
      {
        id: "dementiahiv__6d85.3.aetiology",
        label_de: "Ätiologische Zuschreibung zur HIV-Infektion",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "dementiahiv__6d85.3.hiv_infection_evidence",
            text_de: "Dokumentierte HIV-Infektion (serologisch oder virologisch bestätigt) und kausaler Zusammenhang mit der Demenz über den Ausschluss anderer Ursachen",
            mappingHints: [
              {
                kind: "diagnosis",
                ref: "aetiology"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.3"
              }
            ]
          },
          {
            id: "dementiahiv__6d85.3.not_due_to_other_conditions",
            text_de: "Die kognitive Störung ist nicht besser durch eine andere ZNS-Erkrankung (z. B. opportunistische Infektion, Tumor) oder Substanzwirkung erklärbar",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "exclusion_criteria"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.3"
              }
            ]
          }
        ]
      },
      {
        id: "dementiahiv__6d85.3.exclusions",
        label_de: "Ausschlusskriterien",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "dementiahiv__6d85.3.exclude_delirium",
            text_de: "Kein Delir (Bewusstseinsstörung) zum Zeitpunkt der Diagnosestellung",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "consciousness_orientation"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.3"
              }
            ]
          },
          {
            id: "dementiahiv__6d85.3.exclude_temporal_relation",
            text_de: "Die Demenz trat nicht ausschließlich im Rahmen einer akuten HIV-Erkrankung oder unter antiretroviraler Therapie auf",
            mappingHints: [
              {
                kind: "checklist",
                ref: "temporal_relationship"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.3"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6D85.3"
  },
  "dementia_huntington": {
    groups: [
      {
        id: "dementiahunt__6d85.1.dementia_syndrome",
        label_de: "Demenzsyndrom (ICD-11 6D85.1)",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "dementiahunt__6d85.1.cognitive_decline",
            text_de: "Nachweis eines signifikanten kognitiven Abbaus gegenüber einem früheren Leistungsniveau in einem oder mehreren Bereichen wie Gedächtnis, Exekutivfunktionen, Sprache oder visuell-räumliche Fähigkeiten",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "memory_cognition"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D84.0",
                ref: "cognitive decline"
              }
            ]
          },
          {
            id: "dementiahunt__6d85.1.functional_impairment",
            text_de: "Die kognitiven Defizite beeinträchtigen die Selbstständigkeit im Alltag (z. B. Haushaltsführung, Finanzen, Medikamenteneinnahme)",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "functional_impairment"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D84.0",
                ref: "functional impairment"
              }
            ]
          },
          {
            id: "dementiahunt__6d85.1.consciousness",
            text_de: "Die Symptome treten nicht ausschließlich im Rahmen eines Delirs auf",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "consciousness_orientation"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D84.0",
                ref: "not delirium"
              }
            ]
          }
        ]
      },
      {
        id: "dementiahunt__6d85.1.etiology",
        label_de: "Zuordnung zur Huntington-Krankheit",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "dementiahunt__6d85.1.huntington_diagnosis",
            text_de: "Gesicherte Diagnose einer Huntington-Krankheit durch genetischen Nachweis (CAG-Repeats > 36) oder eindeutige klinische und familiäre Hinweise",
            mappingHints: [
              {
                kind: "diagnosis",
                ref: "aetiology"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.1",
                ref: "Huntington disease"
              }
            ]
          },
          {
            id: "dementiahunt__6d85.1.temporal_link",
            text_de: "Die Demenz manifestiert sich im Kontext der Huntington-Krankheit und ist nicht besser durch eine andere Erkrankung erklärbar",
            mappingHints: [
              {
                kind: "checklist",
                ref: "temporal_relationship"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.1",
                ref: "temporal link"
              }
            ]
          }
        ]
      },
      {
        id: "dementiahunt__6d85.1.exclusions",
        label_de: "Ausschlussdiagnosen",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "dementiahunt__6d85.1.exclude_other_neurodegenerative",
            text_de: "Die kognitiven Störungen sind nicht besser durch eine andere neurodegenerative Erkrankung (z. B. Alzheimer-Krankheit, Parkinson-Demenz) erklärbar",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "memory_cognition"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.1",
                ref: "differential"
              }
            ]
          },
          {
            id: "dementiahunt__6d85.1.exclude_substance_medication",
            text_de: "Die Symptome sind nicht Folge einer Substanz- oder Medikamentenwirkung, die für Huntington untypisch ist",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "substance_use"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.1",
                ref: "medication effect"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6D85.1"
  },
  "dementia_other_diseases_stem": {
    groups: [
      {
        id: "dementiaothe__6d8z.core_symptoms",
        label_de: "Kernkriterien des demenziellen Syndroms",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "dementiaothe__6d8z.cognitive_decline",
            text_de: "Nachweis einer bedeutsamen kognitiven Verschlechterung in einem oder mehreren Bereichen (Gedächtnis, Exekutivfunktionen, Aufmerksamkeit, Sprache, soziales Erkennen oder visuell-räumliche Fähigkeiten) im Vergleich zu einem vorherigen Leistungsniveau.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "memory_cognition"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D8Z"
              }
            ]
          },
          {
            id: "dementiaothe__6d8z.functional_impairment",
            text_de: "Die kognitiven Defizite beeinträchtigen die selbstständige Durchführung alltäglicher Aktivitäten (z. B. Haushaltsführung, Finanzverwaltung, Medikamenteneinnahme, Körperpflege) deutlich.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "functional_status"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D8Z"
              }
            ]
          },
          {
            id: "dementiaothe__6d8z.not_delirium",
            text_de: "Die kognitiven und funktionellen Beeinträchtigungen treten nicht ausschließlich im Rahmen eines Delirs auf.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "consciousness_attention"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D8Z"
              }
            ]
          }
        ]
      },
      {
        id: "dementiaothe__6d8z.underlying_condition",
        label_de: "Nachweis einer zugrunde liegenden Erkrankung",
        logic: "at_least_n_of",
        threshold: 1,
        groupType: "inclusion",
        criteria: [
          {
            id: "dementiaothe__6d8z.medical_condition",
            text_de: "Es liegt eine körperliche oder neurologische Erkrankung (z. B. Schädel-Hirn-Trauma, HIV-Infektion, Morbus Huntington, Normaldruckhydrozephalus, metabolische Störung) vor, die nach klinischer Beurteilung kausal oder wesentlich zur Demenz beiträgt.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "neurological_condition"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D8Z"
              }
            ]
          },
          {
            id: "dementiaothe__6d8z.temporal_relationship",
            text_de: "Die kognitiven Symptome begannen in zeitlichem Zusammenhang mit dem Auftreten oder der Verschlechterung der als ätiologisch relevant erachteten Grunderkrankung.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "history_onset"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D8Z"
              }
            ]
          }
        ]
      },
      {
        id: "dementiaothe__6d8z.exclusion_other_causes",
        label_de: "Ausschluss primärer psychiatrischer oder substanzinduzierter Störungen",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "dementiaothe__6d8z.not_mental_disorder",
            text_de: "Die kognitiven Beeinträchtigungen sind nicht besser durch eine andere psychische Störung (z. B. depressive Störung, Schizophrenie) oder durch die direkte Wirkung einer Substanz (z. B. Alkohol, Medikamente) zu erklären.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "substance_related_features"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D8Z"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6D8Z"
  },
  "dementia_parkinson": {
    groups: [
      {
        id: "dementiapark__6d85.0.cognition",
        label_de: "Kognitives Defizit",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "dementiapark__6d85.0.cognitive_decline",
            text_de: "Nachweis einer signifikanten Abnahme kognitiver Fähigkeiten gegenüber dem früheren Leistungsniveau, die nicht allein durch ein Delir erklärt wird.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "memory_cognition"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.0"
              }
            ]
          },
          {
            id: "dementiapark__6d85.0.functional_impact",
            text_de: "Die kognitiven Defizite beeinträchtigen die Durchführung von alltäglichen Aktivitäten (z. B. Haushaltsführung, Geldverwaltung, Medikamenteneinnahme) oder die berufliche und soziale Funktionsfähigkeit.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "functional_impairment"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.0"
              }
            ]
          },
          {
            id: "dementiapark__6d85.0.multiple_domains",
            text_de: "Die kognitive Beeinträchtigung betrifft mehrere Domänen, darunter typischerweise Exekutivfunktionen, Aufmerksamkeit, visuell-räumliche Fähigkeiten und/oder Gedächtnis.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "memory_cognition"
              },
              {
                kind: "isdm_domain",
                ref: "executive_function"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.0"
              }
            ]
          }
        ]
      },
      {
        id: "dementiapark__6d85.0.aetiology",
        label_de: "Ätiologische Beziehung zur Parkinson-Krankheit",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "dementiapark__6d85.0.parkinson_diagnosis",
            text_de: "Es liegt eine gesicherte Diagnose einer Parkinson-Krankheit vor (gemäß ICD-11 8A00.0).",
            mappingHints: [
              {
                kind: "diagnosis",
                ref: "aetiology"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.0"
              }
            ]
          },
          {
            id: "dementiapark__6d85.0.temporal_relationship",
            text_de: "Die kognitive Beeinträchtigung tritt im zeitlichen Zusammenhang mit der Parkinson-Krankheit auf, d. h. die Demenz manifestiert sich in der Regel mindestens ein Jahr nach Beginn der motorischen Symptome.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "temporal_pattern"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.0"
              }
            ]
          }
        ]
      },
      {
        id: "dementiapark__6d85.0.exclusions",
        label_de: "Ausschlusskriterien",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "dementiapark__6d85.0.exclude_delirium",
            text_de: "Die kognitiven Symptome treten nicht ausschließlich im Rahmen eines Delirs auf.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "consciousness_orientation"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.0"
              }
            ]
          },
          {
            id: "dementiapark__6d85.0.exclude_other",
            text_de: "Die Störung lässt sich nicht besser durch eine andere psychische Störung, Substanzgebrauch oder Medikamente erklären.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6D85.0"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6D85.0"
  },
  "disinhibited_attachment_disorder": {
    groups: [
      {
        id: "disinhibited__6b45.inclusion",
        label_de: "Diagnostische Kernsymptome (ICD-11 6B45)",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "disinhibited__6b45.indiscriminate_pattern",
            text_de: "Ein über mindestens mehrere Monate bestehendes Verhaltensmuster mit aktivem Annähern und Interagieren mit unvertrauten Erwachsenen, das mindestens zwei der folgenden Symptome umfasst: (1) verminderte oder fehlende Scheu vor Fremden, (2) übermäßig vertrauliches verbales oder körperliches Verhalten, das kulturell und altersgemäße Grenzen überschreitet, (3) vermindertes oder fehlendes Rückversichern bei der Bezugsperson nach Weggehen, (4) Bereitschaft, ohne Zögern mit einem Fremden mitzugehen",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "attachment_disorder"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B45"
              }
            ]
          },
          {
            id: "disinhibited__6b45.pathogenic_care",
            text_de: "In der Vorgeschichte liegen extreme unzureichende Fürsorgebedingungen vor, wie soziale Vernachlässigung oder Deprivation, wiederholte Wechsel der primären Bezugsperson oder Aufwachsen in ungewöhnlichen Umgebungen, die die Bildung selektiver Bindungen stark eingeschränkt haben",
            mappingHints: [
              {
                kind: "checklist",
                ref: "adverse_childhood_experiences"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B45"
              }
            ]
          },
          {
            id: "disinhibited__6b45.duration",
            text_de: "Das Verhaltensmuster besteht seit mehreren Monaten (nicht nur vorübergehend) und zeigt sich in verschiedenen sozialen Kontexten",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B45"
              }
            ]
          }
        ]
      },
      {
        id: "disinhibited__6b45.exclusions",
        label_de: "Ausschlusskriterien (ICD-11 6B45)",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "disinhibited__6b45.excl_adhd",
            text_de: "Das Verhalten wird nicht besser durch eine hyperkinetische Störung (ADHS) mit Impulsivität und Distanzlosigkeit erklärt",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "hyperkinetic_disorder"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B45"
              }
            ]
          },
          {
            id: "disinhibited__6b45.excl_autism",
            text_de: "Das Verhalten ist nicht durch eine Autismus-Spektrum-Störung bedingt, die typischerweise mit Schwierigkeiten in sozialer Reziprozität und eingeschränkten Interessen einhergeht",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "autism_spectrum"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B45"
              }
            ]
          },
          {
            id: "disinhibited__6b45.excl_culture",
            text_de: "Das Verhalten ist nicht durch kulturell übliche und altersgemäße soziale Gepflogenheiten zu erklären",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B45"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6B45"
  },
  "induced_delusional_disorder": {
    groups: [
      {
        id: "induceddelus__6a2z.core",
        label_de: "Kernkriterien für induzierte wahnhafte Störung",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "induceddelus__6a2z.primary_psychosis",
            text_de: "Eine primär psychotisch erkrankte Person (Indexfall) erfüllt die Kriterien einer primären psychotischen Störung nach ICD-11 (z. B. Schizophrenie, wahnhafte Störung oder schizoaffektive Störung).",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "delusions_overvalued_ideas"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Z"
              }
            ]
          },
          {
            id: "induceddelus__6a2z.close_relationship",
            text_de: "Die betroffene Person steht in einer engen, emotional verbundenen Beziehung zur primär erkrankten Person (z. B. als Familienmitglied, Partner oder enge Vertrauensperson).",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Z"
              }
            ]
          },
          {
            id: "induceddelus__6a2z.shared_delusion",
            text_de: "Die betroffene Person entwickelt inhaltlich ähnliche oder identische Wahnvorstellungen wie die primär erkrankte Person, die nicht durch eine andere psychische Störung erklärbar sind.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "delusions_overvalued_ideas"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Z"
              }
            ]
          },
          {
            id: "induceddelus__6a2z.no_other_cause",
            text_de: "Die Wahnvorstellungen sind nicht auf die direkte Wirkung einer Substanz (z. B. Droge, Medikament) oder einer Erkrankung des Nervensystems zurückzuführen.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "substance_related_features"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Z"
              }
            ]
          }
        ]
      },
      {
        id: "induceddelus__6a2z.exclusions",
        label_de: "Ausschlusskriterien",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "induceddelus__6a2z.exclude_primary_psychosis_recipient",
            text_de: "Die betroffene Person erfüllte vor der Beziehung zur primär erkrankten Person nicht die Kriterien einer eigenständigen psychotischen Störung (z. B. Schizophrenie oder wahnhafte Störung).",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "delusions_overvalued_ideas"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Z"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6A2Z"
  },
  "kleptomania": {
    groups: [
      {
        id: "kleptomania__6c71.core",
        label_de: "Kernsymptome der Kleptomanie",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "kleptomania__6c71.repeated_impulse",
            text_de: "Wiederholtes Versagen, dem Impuls zum Stehlen von Gegenständen zu widerstehen, die nicht für den persönlichen Gebrauch oder für materiellen Gewinn benötigt werden.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "drive_psychomotor_activity"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6C71",
                ref: "Diagnostic requirements"
              }
            ]
          },
          {
            id: "kleptomania__6c71.tension_relief",
            text_de: "Zunehmendes Spannungsgefühl unmittelbar vor dem Stehlen und Gefühle von Erleichterung, Befriedigung oder Vergnügen während und nach der Tat.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6C71",
                ref: "Diagnostic requirements"
              }
            ]
          },
          {
            id: "kleptomania__6c71.no_altruistic_motive",
            text_de: "Das Stehlen erfolgt nicht aus Wut, Rache oder aufgrund von Wahnvorstellungen oder Halluzinationen.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6C71"
              }
            ]
          },
          {
            id: "kleptomania__6c71.functional_impairment",
            text_de: "Das Verhalten führt zu klinisch bedeutsamem Leiden oder zu Beeinträchtigungen in sozialen, beruflichen oder anderen wichtigen Funktionsbereichen.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6C71"
              }
            ]
          }
        ]
      },
      {
        id: "kleptomania__6c71.exclusions",
        label_de: "Ausschlusskriterien",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "kleptomania__6c71.exclude_another_disorder",
            text_de: "Das Stehlen ist nicht auf eine andere psychische Störung zurückzuführen, wie z. B. eine dissoziale Persönlichkeitsstörung, eine manische Episode, eine psychotische Störung oder eine Substanzintoxikation.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6C71"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6C71"
  },
  "mixed_anxiety_depressive_disorder": {
    groups: [
      {
        id: "mixedanxiety__6a73.core",
        label_de: "Kernsymptome: gleichzeitige depressive und ängstliche Symptomatik",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "mixedanxiety__6a73.depressive_subthreshold",
            text_de: "Es liegen depressive Symptome vor, die nicht ausreichen, um die Diagnose einer depressiven Episode zu stellen (z. B. gedrückte Stimmung, vermindertes Interesse oder Energieverlust).",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "mood_affect"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A73"
              }
            ]
          },
          {
            id: "mixedanxiety__6a73.anxiety_subthreshold",
            text_de: "Es liegen Angst- oder Besorgnissymptome vor, die nicht ausreichen, um die Diagnose einer Angst- oder furchtbezogenen Störung zu stellen (z. B. übermäßige Sorgen, Anspannung, körperliche Angstsymptome).",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "anxiety_panic_phobic_symptoms"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A73"
              }
            ]
          },
          {
            id: "mixedanxiety__6a73.concurrent",
            text_de: "Die depressiven und ängstlichen Symptome treten gleichzeitig auf oder sind im selben Zeitraum vorhanden.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A73"
              }
            ]
          },
          {
            id: "mixedanxiety__6a73.duration",
            text_de: "Das Störungsbild besteht mindestens zwei Wochen oder länger.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A73"
              }
            ]
          }
        ]
      },
      {
        id: "mixedanxiety__6a73.exclusions",
        label_de: "Ausschlusskriterien",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "mixedanxiety__6a73.exclude_full_depression",
            text_de: "Es darf keine voll ausgeprägte depressive Episode (ICD-11 6A70-6A71) vorliegen, die die Symptome besser erklärt.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A73"
              }
            ]
          },
          {
            id: "mixedanxiety__6a73.exclude_full_anxiety",
            text_de: "Es darf keine voll ausgeprägte Angst- oder furchtbezogene Störung (ICD-11 6B00-6B06) vorliegen, die die Symptome besser erklärt.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A73"
              }
            ]
          },
          {
            id: "mixedanxiety__6a73.exclude_substance",
            text_de: "Die Symptome sind nicht auf die direkte Wirkung einer Substanz (z. B. Droge, Medikament) oder eine organische Ursache zurückzuführen.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A73"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6A73"
  },
  "other_mood_disorder": {
    groups: [
      {
        id: "othermooddis__6a7y.inclusion",
        label_de: "Notwendige Kriterien für eine sonstige näher bezeichnete Stimmungsstörung",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "othermooddis__6a7y.criterion1",
            text_de: "Es liegt eine klinisch bedeutsame affektive Symptomatik vor, die das allgemeine Konzept einer Stimmungsstörung erfüllt, jedoch nicht die syndromalen Kriterien einer spezifischen affektiven Störung des ICD-11 (z. B. depressive Episode, manische Episode, bipolare Störung).",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "mood_affect"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A7Y"
              }
            ]
          },
          {
            id: "othermooddis__6a7y.criterion2",
            text_de: "Die Störung ist durch eine oder mehrere Episoden mit affektiven Symptomen gekennzeichnet, die nicht die zeitlichen oder symptomatischen Schwellen für eine andere spezifische Stimmungsstörung erreichen (z. B. kurze depressive Episode, submanische Episode).",
            mappingHints: [
              {
                kind: "checklist",
                ref: "episodicity"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A7Y"
              }
            ]
          }
        ]
      },
      {
        id: "othermooddis__6a7y.exclusions",
        label_de: "Ausschlusskriterien",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "othermooddis__6a7y.exclude_organic",
            text_de: "Die Symptomatik ist nicht auf eine organische psychische Störung (z. B. aufgrund einer Erkrankung des Nervensystems oder einer anderen körperlichen Erkrankung) zurückzuführen.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "general_medical"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A7Y"
              }
            ]
          },
          {
            id: "othermooddis__6a7y.exclude_substance",
            text_de: "Die Symptomatik ist nicht auf die direkte Wirkung einer psychotropen Substanz oder eines Medikaments zurückzuführen (einschließlich Entzug).",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "substance_related_features"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A7Y"
              }
            ]
          },
          {
            id: "othermooddis__6a7y.exclude_full_syndrome",
            text_de: "Die Symptome erfüllen nicht die vollständigen diagnostischen Kriterien einer anderen spezifischen affektiven Störung im ICD-11 (z. B. depressive Störung, bipolare Störung, Dysthymie).",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A7Y"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6A7Y"
  },
  "other_nonorganic_psychosis": {
    groups: [
      {
        id: "othernonorga__6a2y.psychotic_symptoms",
        label_de: "Mindestens ein eindeutiges psychotisches Symptom",
        logic: "at_least_n_of",
        threshold: 1,
        groupType: "inclusion",
        criteria: [
          {
            id: "othernonorga__6a2y.delusions",
            text_de: "Es bestehen Wahnvorstellungen, die nicht kulturell bedingt sind und über einen Zeitraum von mindestens mehreren Tagen anhalten",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "delusions_overvalued_ideas"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Y",
                ref: "delusions"
              }
            ]
          },
          {
            id: "othernonorga__6a2y.hallucinations",
            text_de: "Es bestehen Halluzinationen (z. B. akustische, visuelle, taktile) mit einem subjektiven Realitätscharakter, die nicht auf eine organische Ursache oder Substanzwirkung zurückzuführen sind",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "hallucinations"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Y",
                ref: "hallucinations"
              }
            ]
          },
          {
            id: "othernonorga__6a2y.disorganized_thinking",
            text_de: "Es besteht eine formale Denkstörung (z. B. Gedankenabreißen, Neologismen, inkohärentes Sprechen), die die Kommunikation beeinträchtigt",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "formal_thought_disorder"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Y",
                ref: "disorganized_thinking"
              }
            ]
          },
          {
            id: "othernonorga__6a2y.passivity_experiences",
            text_de: "Es bestehen Ich-Störungen wie Gedankeneingebung, Gedankenentzug oder das Gefühl, von äußeren Kräften gesteuert zu werden",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "passivity_phenomena"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Y",
                ref: "passivity"
              }
            ]
          }
        ]
      },
      {
        id: "othernonorga__6a2y.no_specific_diagnosis",
        label_de: "Kriterien für eine spezifische primäre psychotische Störung nicht erfüllt",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "othernonorga__6a2y.not_schizophrenia",
            text_de: "Die Symptome erfüllen nicht die vollständigen Kriterien für Schizophrenie (6A20), insbesondere nicht hinsichtlich Dauer oder Mindestanzahl der Symptome",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Y",
                ref: "exclusion_schizophrenia"
              }
            ]
          },
          {
            id: "othernonorga__6a2y.not_schizoaffective",
            text_de: "Die Symptome treten nicht gleichzeitig mit einer affektiven Episode auf, die die Kriterien einer schizoaffektiven Störung (6A21) erfüllen würde",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Y",
                ref: "exclusion_schizoaffective"
              }
            ]
          },
          {
            id: "othernonorga__6a2y.not_atpd",
            text_de: "Das Beschwerdebild erfüllt nicht die Kriterien einer akuten vorübergehenden psychotischen Störung (6A23), z. B. hinsichtlich akuten Beginns oder Dauer unter einem Monat",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Y",
                ref: "exclusion_acute_transient"
              }
            ]
          },
          {
            id: "othernonorga__6a2y.not_delusional_disorder",
            text_de: "Die wahnhafte Symptomatik beschränkt sich nicht auf ein abgegrenztes Wahnsystem, das die Kriterien einer anhaltenden wahnhaften Störung (6A22) erfüllt",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Y",
                ref: "exclusion_delusional"
              }
            ]
          }
        ]
      },
      {
        id: "othernonorga__6a2y.functional_impairment",
        label_de: "Klinisch bedeutsame Beeinträchtigung",
        logic: "at_least_n_of",
        threshold: 1,
        groupType: "inclusion",
        criteria: [
          {
            id: "othernonorga__6a2y.distress_or_impairment",
            text_de: "Die Symptome verursachen in klinisch bedeutsamem Ausmaß Leiden oder Beeinträchtigungen in sozialen, beruflichen oder anderen wichtigen Funktionsbereichen",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "functional_impairment"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Y",
                ref: "impairment"
              }
            ]
          }
        ]
      },
      {
        id: "othernonorga__6a2y.exclusions",
        label_de: "Ausschluss organischer und substanzbedingter Ursachen",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "othernonorga__6a2y.exclude_organic",
            text_de: "Die psychotische Symptomatik ist nicht auf eine organische psychische Störung (z. B. Delir, Demenz) oder auf eine Erkrankung des Zentralnervensystems zurückzuführen",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "secondary_to_medical_condition"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Y",
                ref: "exclusion_organic"
              }
            ]
          },
          {
            id: "othernonorga__6a2y.exclude_substance",
            text_de: "Die Symptome treten nicht als direkte Folge einer Substanzintoxikation, eines Substanzentzugs oder einer substanzinduzierten psychotischen Störung auf",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "substance_induced"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Y",
                ref: "exclusion_substance"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6A2Y"
  },
  "other_persistent_mood_disorder": {
    groups: [
      {
        id: "otherpersist__6a7y.core",
        label_de: "Anhaltende affektive Symptomatik, die keiner spezifischen Stimmungsstörung zugeordnet werden kann",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "otherpersist__6a7y.persistent_mood_symptoms",
            text_de: "Die Person berichtet über eine länger andauernde (z. B. über mindestens ein Jahr) affektive Symptomatik, wie gedrückte Stimmung oder emotionale Labilität, die nicht hinreichend schwer oder anhaltend ist, um die Kriterien einer spezifischen anhaltenden Stimmungsstörung (wie Dysthymia oder Zyklothymia) zu erfüllen, aber dennoch zu klinisch bedeutsamem Leiden oder Beeinträchtigungen führt.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "mood_affect"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A7Y"
              }
            ]
          },
          {
            id: "otherpersist__6a7y.not_meeting_other_specific",
            text_de: "Das Störungsbild erfüllt nicht die vollständigen diagnostischen Kriterien einer anderen spezifischen Stimmungsstörung aus dem Kapitel der affektiven Störungen (z. B. depressive Episode, rezidivierende depressive Störung, Dysthymia, Zyklothymia, bipolare Störung).",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A7Y"
              }
            ]
          }
        ]
      },
      {
        id: "otherpersist__6a7y.exclusions",
        label_de: "Ausschlusskriterien",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "otherpersist__6a7y.exclude_substance_organic",
            text_de: "Die affektive Symptomatik ist nicht direkt auf die physiologische Wirkung einer Substanz (z. B. Droge, Medikament) oder auf eine organische Erkrankung des Gehirns oder des Körpers zurückzuführen.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "substance_related_features"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A7Y"
              }
            ]
          },
          {
            id: "otherpersist__6a7y.exclude_other_mental_disorder",
            text_de: "Die Symptome sind nicht besser durch eine andere psychische Störung erklärbar, wie z. B. eine Angststörung, eine Zwangsstörung oder eine Anpassungsstörung.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A7Y"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6A7Y"
  },
  "selective_mutism": {
    groups: [
      {
        id: "selectivemut__6b06.core",
        label_de: "Hauptmerkmale des selektiven Mutismus",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "selectivemut__6b06.situational_mutism",
            text_de: "Anhaltende Unfähigkeit zu sprechen in bestimmten sozialen Situationen, in denen Sprechen erwartet wird, während in anderen, vertrauten Situationen normales Sprechen möglich ist.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "speech_language"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B06"
              }
            ]
          },
          {
            id: "selectivemut__6b06.language_intact",
            text_de: "Die grundsätzliche Sprachfähigkeit und das Sprachverständnis sind in den Situationen, in denen die Person normal spricht, nicht beeinträchtigt.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "speech_language"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B06"
              }
            ]
          },
          {
            id: "selectivemut__6b06.duration",
            text_de: "Die Sprachunfähigkeit besteht über mindestens einen Monat und ist nicht auf die ersten vier Wochen einer neuen sozialen Situation beschränkt.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "duration"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B06"
              }
            ]
          },
          {
            id: "selectivemut__6b06.functional_impact",
            text_de: "Die Störung führt zu klinisch bedeutsamen Beeinträchtigungen der schulischen, beruflichen oder sozialen Kommunikation und Funktionsfähigkeit.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "functional_impairment"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B06"
              }
            ]
          }
        ]
      },
      {
        id: "selectivemut__6b06.exclusions",
        label_de: "Ausschluss anderer Ursachen",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "selectivemut__6b06.exclude_other_disorders",
            text_de: "Das Verstummen ist nicht besser durch eine Kommunikationsstörung, eine Autismus-Spektrum-Störung, eine psychotische Störung, eine andere psychische Störung oder mangelnde Kenntnisse der gesprochenen Sprache erklärbar.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "differential"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6B06"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6B06"
  },
  "stereotyped_movement_disorder": {
    groups: [
      {
        id: "stereotypedm__6a06.inclusion_core",
        label_de: "Kernsymptome der stereotypen Bewegungsstörung",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "stereotypedm__6a06.repetitive_movements",
            text_de: "Die Person zeigt willkürlich wirkende, wiederholte, rhythmische und scheinbar zwecklose Bewegungen, z. B. Schaukeln des Körpers, Kopfschlagen, Hand- oder Fingerstereotypien.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "appearance_behavior"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A06"
              }
            ]
          },
          {
            id: "stereotypedm__6a06.early_onset",
            text_de: "Der Beginn der stereotypen Bewegungen liegt in der frühen Kindheit, typischerweise vor dem dritten Lebensjahr.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "general_presentation"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A06"
              }
            ]
          },
          {
            id: "stereotypedm__6a06.impairment_or_harm",
            text_de: "Die stereotypen Bewegungen beeinträchtigen die täglichen Aktivitäten, die soziale Teilhabe oder führen bei selbstverletzenden Formen zu körperlichem Schaden.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "functional_impairment"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A06"
              }
            ]
          }
        ]
      },
      {
        id: "stereotypedm__6a06.exclusions",
        label_de: "Ausschluss anderer Ursachen",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "stereotypedm__6a06.not_tic_or_neuro",
            text_de: "Die Bewegungen sind keine Tics und treten nicht ausschließlich im Rahmen einer neurologischen Erkrankung oder einer Substanz-/Medikamentenwirkung auf.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "general_presentation"
              },
              {
                kind: "isdm_domain",
                ref: "general_presentation"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A06"
              }
            ]
          },
          {
            id: "stereotypedm__6a06.not_better_explained",
            text_de: "Die Symptome werden nicht besser durch eine andere psychische Störung wie eine Autismus-Spektrum-Störung oder eine Zwangsstörung erklärt, es sei denn, die Stereotypien sind die zentrale Beeinträchtigung.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "general_presentation"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A06"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6A06"
  },
  "unspecified_mood_disorder": {
    groups: [
      {
        id: "unspecifiedm__6a7z.inclusion",
        label_de: "Affektive Symptome ohne spezifische Diagnose",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "unspecifiedm__6a7z.criterion1",
            text_de: "Es liegt eine klinisch bedeutsame affektive Symptomatik vor (z. B. depressive, manische oder gemischte Stimmung), die jedoch nicht ausreicht, um die Kriterien einer spezifischen affektiven Störung wie depressive Episode, manische Episode oder bipolare Störung zu erfüllen.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "mood_affect"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A7Z"
              }
            ]
          },
          {
            id: "unspecifiedm__6a7z.criterion2",
            text_de: "Die Symptome verursachen in klinisch bedeutsamer Weise Leiden oder Beeinträchtigungen in sozialen, beruflichen oder anderen wichtigen Funktionsbereichen.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "functioning"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A7Z"
              }
            ]
          }
        ]
      },
      {
        id: "unspecifiedm__6a7z.exclusion",
        label_de: "Ausschluss spezifischerer Störungen und organischer/substanzbedingter Ursachen",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "unspecifiedm__6a7z.excl_specific_mood",
            text_de: "Die Symptomatik ist nicht besser durch eine spezifische affektive Störung (z. B. depressive Störung, bipolare Störung, Zyklothymie) erklärbar.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "exclusion_specific_mood_disorders"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A7Z"
              }
            ]
          },
          {
            id: "unspecifiedm__6a7z.excl_substance_organic",
            text_de: "Die affektive Symptomatik ist nicht auf die direkte Wirkung einer psychotropen Substanz (z. B. Alkohol, Medikamente, Drogen) oder eine organische psychische Störung (z. B. aufgrund einer endokrinen Erkrankung) zurückzuführen.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "substance_related_features"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A7Z"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6A7Z"
  },
  "unspecified_nonorganic_psychosis": {
    groups: [
      {
        id: "unspecifiedn__6a2z.inclusion",
        label_de: "Kernsymptome einer psychotischen Störung ohne spezifische Zuordnung",
        logic: "all_of",
        groupType: "inclusion",
        criteria: [
          {
            id: "unspecifiedn__6a2z.psychotic_symptoms",
            text_de: "Es liegen eindeutig psychotische Symptome wie Wahn, Halluzinationen, desorganisiertes Denken oder stark desorganisiertes oder katatones Verhalten vor.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "positive_symptoms"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Z"
              }
            ]
          },
          {
            id: "unspecifiedn__6a2z.unspecific",
            text_de: "Die Symptomatik kann keiner spezifischen primären psychotischen Störung (z.B. Schizophrenie, schizoaffektive Störung, wahnhafte Störung) zugeordnet werden, da für die Diagnose notwendige Informationen fehlen oder widersprüchlich sind.",
            mappingHints: [
              {
                kind: "checklist",
                ref: "clinical_review"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Z"
              }
            ]
          }
        ]
      },
      {
        id: "unspecifiedn__6a2z.exclusions",
        label_de: "Ausschluss anderer Ursachen",
        logic: "none_of",
        groupType: "exclusion",
        criteria: [
          {
            id: "unspecifiedn__6a2z.exclude_organic_substance",
            text_de: "Die psychotischen Symptome sind nicht auf die direkte physiologische Wirkung einer Substanz (z.B. Droge, Medikament) oder auf eine organische psychische Störung zurückzuführen.",
            mappingHints: [
              {
                kind: "isdm_domain",
                ref: "substance_related_features"
              }
            ],
            allowClinicianAttest: true,
            citation: [
              {
                classification: "icd11",
                code: "6A2Z"
              }
            ]
          }
        ]
      }
    ],
    sourceRef: "operationalisiert nach ICD-11 6A2Z"
  }
}
