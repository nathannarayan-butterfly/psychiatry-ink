export type KbCategory =
  | 'Pharmakologie'
  | 'Diagnostik'
  | 'Klinik'
  | 'Leitlinien'
  | 'Psychopathologie'
  | 'Sonstiges'

export interface KnowledgeEntrySection {
  id: string
  /** German section heading (canonical). */
  label: string
  /** English section heading for the `en` UI locale. */
  labelEn?: string
  /** German section body (markdown). */
  content: string
  /** English section body for the `en` UI locale. */
  contentEn?: string
  order: number
}

export interface KnowledgeEntry {
  id: string
  collectionId?: string
  title: string
  /**
   * English variant of {@link title} for the `en` UI locale. Falls back to
   * {@link title} when absent (back-compat for older user-created entries).
   */
  titleEn?: string
  category: KbCategory
  /**
   * English variant of {@link category} (display only — the canonical German
   * category enum keeps driving filter chips and badge colors).
   */
  categoryEn?: string
  content: string
  /**
   * English variant of {@link content} for the `en` UI locale. Falls back to
   * {@link content} when absent.
   */
  contentEn?: string
  /**
   * Structured sections for detail view + section-heading translation. When
   * absent, {@link ensureKnowledgeEntrySections} derives sections from
   * {@link content} / {@link contentEn} at load time.
   */
  sections?: KnowledgeEntrySection[]
  tags: string[]
  /**
   * English variants of {@link tags}. Falls back to {@link tags} when absent.
   * NOT necessarily index-aligned with German tags.
   */
  tagsEn?: string[]
  createdAt: string
  /**
   * Provenance of the English (`*En`) fields — `'machine'` for unreviewed
   * DeepSeek machine translation, `'human'` for curated English. Absent ⇒
   * legacy / unknown.
   */
  enContentSource?: 'machine' | 'human'
  /** ISO timestamp of the last machine English-translation pass. */
  enTranslatedAt?: string
  updatedAt?: string
}

export const KNOWLEDGE_BASE_SEED: KnowledgeEntry[] = [
  {
  "id": "seed-001",
  "title": "NMS — Malignes Neuroleptisches Syndrom",
  "titleEn": "NMS — Neuroleptic Malignant Syndrome",
  "category": "Pharmakologie",
  "categoryEn": "Pharmacology",
  "content": "Das maligne neuroleptische Syndrom (MNS) ist eine seltene, lebensbedrohliche Reaktion auf Antipsychotika.\n\n**Kernsymptome (FALTER):**\n- Fieber (> 38 °C, oft > 40 °C)\n- Autonome Instabilität (Tachykardie, labiler Blutdruck, Diaphorese)\n- Leukozytose\n- Tremor / Rigor (Bleiröhrenrigidität)\n- Elevated CK (> 1000 U/l, oft deutlich höher)\n- Rigor muscularis\n- (Bewusstseinsveränderung)\n\n**Management:**\n1. Sofortiges Absetzen aller Antipsychotika und Dopaminantagonisten\n2. Intensivmedizinische Überwachung\n3. Kühlung, ausreichend Flüssigkeit (Rhabdomyolyse-Prophylaxe)\n4. Dantrolen 1–2,5 mg/kg i.v. (Muskelrelaxation), ggf. wiederholen\n5. Bromocriptin 2,5–10 mg oral 3×/d (dopaminerge Unterstützung)\n6. Lorazepam bei Agitation\n7. Keine Neueinleitung eines Antipsychotikums für mind. 2 Wochen",
  "contentEn": "Neuroleptic malignant syndrome (NMS) is a rare, life-threatening reaction to antipsychotics.\n\n**Core features (FEVER mnemonic):**\n- Fever (> 38 °C, often > 40 °C)\n- Autonomic instability (tachycardia, labile blood pressure, diaphoresis)\n- Leukocytosis\n- Tremor / rigidity (\"lead-pipe\" rigidity)\n- Elevated CK (> 1000 U/L, often markedly higher)\n- Muscular rigidity\n- (Altered level of consciousness)\n\n**Management:**\n1. Immediately discontinue all antipsychotics and dopamine antagonists\n2. Intensive-care monitoring\n3. Active cooling, generous IV fluids (rhabdomyolysis prophylaxis)\n4. Dantrolene 1–2.5 mg/kg IV (muscle relaxation), repeat if needed\n5. Bromocriptine 2.5–10 mg orally three times daily (dopaminergic support)\n6. Lorazepam for agitation\n7. Do not reintroduce any antipsychotic for at least 2 weeks",
  "tags": [
  "NMS",
  "Notfall",
  "Antipsychotika",
  "Rigidität",
  "CK",
  "Dantrolen"
  ],
  "tagsEn": [
  "NMS",
  "Emergency",
  "Antipsychotics",
  "Rigidity",
  "CK",
  "Dantrolene"
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "sections": [
  {
  "id": "seed-001-section-0",
  "label": "Übersicht",
  "labelEn": "Overview",
  "content": "Das maligne neuroleptische Syndrom (MNS) ist eine seltene, lebensbedrohliche Reaktion auf Antipsychotika.",
  "contentEn": "Neuroleptic malignant syndrome (NMS) is a rare, life-threatening reaction to antipsychotics.",
  "order": 0
  },
  {
  "id": "seed-001-section-1",
  "label": "Kernsymptome (FALTER)",
  "labelEn": "Core features (FEVER mnemonic)",
  "content": "- Fieber (> 38 °C, oft > 40 °C)\n- Autonome Instabilität (Tachykardie, labiler Blutdruck, Diaphorese)\n- Leukozytose\n- Tremor / Rigor (Bleiröhrenrigidität)\n- Elevated CK (> 1000 U/l, oft deutlich höher)\n- Rigor muscularis\n- (Bewusstseinsveränderung)",
  "contentEn": "- Fever (> 38 °C, often > 40 °C)\n- Autonomic instability (tachycardia, labile blood pressure, diaphoresis)\n- Leukocytosis\n- Tremor / rigidity (\"lead-pipe\" rigidity)\n- Elevated CK (> 1000 U/L, often markedly higher)\n- Muscular rigidity\n- (Altered level of consciousness)",
  "order": 1
  },
  {
  "id": "seed-001-section-2",
  "label": "Management",
  "labelEn": "Management",
  "content": "1. Sofortiges Absetzen aller Antipsychotika und Dopaminantagonisten\n2. Intensivmedizinische Überwachung\n3. Kühlung, ausreichend Flüssigkeit (Rhabdomyolyse-Prophylaxe)\n4. Dantrolen 1–2,5 mg/kg i.v. (Muskelrelaxation), ggf. wiederholen\n5. Bromocriptin 2,5–10 mg oral 3×/d (dopaminerge Unterstützung)\n6. Lorazepam bei Agitation\n7. Keine Neueinleitung eines Antipsychotikums für mind. 2 Wochen",
  "contentEn": "1. Immediately discontinue all antipsychotics and dopamine antagonists\n2. Intensive-care monitoring\n3. Active cooling, generous IV fluids (rhabdomyolysis prophylaxis)\n4. Dantrolene 1–2.5 mg/kg IV (muscle relaxation), repeat if needed\n5. Bromocriptine 2.5–10 mg orally three times daily (dopaminergic support)\n6. Lorazepam for agitation\n7. Do not reintroduce any antipsychotic for at least 2 weeks",
  "order": 2
  }
  ]
  },
  {
  "id": "seed-002",
  "title": "Lithium-Monitoring — Zielwerte und Frequenz",
  "titleEn": "Lithium monitoring — target levels and frequency",
  "category": "Pharmakologie",
  "categoryEn": "Pharmacology",
  "content": "**Therapeutischer Bereich:**\n- Akuttherapie (Manie): 0,8–1,2 mmol/l\n- Rezidivprophylaxe (langfristig): 0,6–0,8 mmol/l\n- Messung 12 Stunden nach letzter Einnahme (Talspiegelbestimmung)\n\n**Monitoring-Frequenz:**\n- Einstellung: alle 5–7 Tage bis stabiler Spiegel\n- Stabil: alle 3 Monate (Spiegel, Niere, Schilddrüse)\n- Nierenfunktion (Kreatinin, GFR, Harnstoff), TSH alle 6 Monate\n- Jährlich: EKG (bei Risikopatienten)\n\n**Toxizitätszeichen (ab ~1,5 mmol/l):**\nGrobschlägiger Tremor, Ataxie, Dysarthrie, Somnolenz, Diarrhoe, Erbrechen.\nAb > 2,0 mmol/l: Verwirrtheit, Anfälle, Bewusstlosigkeit → Notfall.\n\n**Interaktionen:**\nACE-Hemmer, Thiazide, NSAIDs → erhöhen Lithiumspiegel deutlich. Engmaschigere Kontrolle bei Änderung der Komedikation.",
  "contentEn": "**Therapeutic range:**\n- Acute treatment (mania): 0.8–1.2 mmol/L\n- Maintenance / relapse prophylaxis: 0.6–0.8 mmol/L\n- Measure 12 hours after the last dose (trough level)\n\n**Monitoring frequency:**\n- Initiation: every 5–7 days until a stable level is reached\n- Stable patient: every 3 months (level, renal function, thyroid)\n- Renal function (creatinine, eGFR, urea), TSH every 6 months\n- Annual ECG (in patients at cardiac risk)\n\n**Toxicity signs (from ~1.5 mmol/L upward):**\nCoarse tremor, ataxia, dysarthria, somnolence, diarrhoea, vomiting.\nAbove 2.0 mmol/L: confusion, seizures, loss of consciousness → emergency.\n\n**Interactions:**\nACE inhibitors, thiazide diuretics, and NSAIDs significantly raise lithium levels. Increase monitoring frequency whenever co-medication is changed.",
  "tags": [
  "Lithium",
  "Stimmungsstabilisator",
  "Monitoring",
  "Toxizität",
  "Spiegel"
  ],
  "tagsEn": [
  "Lithium",
  "Mood stabiliser",
  "Monitoring",
  "Toxicity",
  "Plasma level"
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "sections": [
  {
  "id": "seed-002-section-0",
  "label": "Therapeutischer Bereich",
  "labelEn": "Therapeutic range",
  "content": "- Akuttherapie (Manie): 0,8–1,2 mmol/l\n- Rezidivprophylaxe (langfristig): 0,6–0,8 mmol/l\n- Messung 12 Stunden nach letzter Einnahme (Talspiegelbestimmung)",
  "contentEn": "- Acute treatment (mania): 0.8–1.2 mmol/L\n- Maintenance / relapse prophylaxis: 0.6–0.8 mmol/L\n- Measure 12 hours after the last dose (trough level)",
  "order": 0
  },
  {
  "id": "seed-002-section-1",
  "label": "Monitoring-Frequenz",
  "labelEn": "Monitoring frequency",
  "content": "- Einstellung: alle 5–7 Tage bis stabiler Spiegel\n- Stabil: alle 3 Monate (Spiegel, Niere, Schilddrüse)\n- Nierenfunktion (Kreatinin, GFR, Harnstoff), TSH alle 6 Monate\n- Jährlich: EKG (bei Risikopatienten)",
  "contentEn": "- Initiation: every 5–7 days until a stable level is reached\n- Stable patient: every 3 months (level, renal function, thyroid)\n- Renal function (creatinine, eGFR, urea), TSH every 6 months\n- Annual ECG (in patients at cardiac risk)",
  "order": 1
  },
  {
  "id": "seed-002-section-2",
  "label": "Toxizitätszeichen (ab ~1,5 mmol/l)",
  "labelEn": "Toxicity signs (from ~1.5 mmol/L upward)",
  "content": "Grobschlägiger Tremor, Ataxie, Dysarthrie, Somnolenz, Diarrhoe, Erbrechen.\nAb > 2,0 mmol/l: Verwirrtheit, Anfälle, Bewusstlosigkeit → Notfall.",
  "contentEn": "Coarse tremor, ataxia, dysarthria, somnolence, diarrhoea, vomiting.\nAbove 2.0 mmol/L: confusion, seizures, loss of consciousness → emergency.",
  "order": 2
  },
  {
  "id": "seed-002-section-3",
  "label": "Interaktionen",
  "labelEn": "Interactions",
  "content": "ACE-Hemmer, Thiazide, NSAIDs → erhöhen Lithiumspiegel deutlich. Engmaschigere Kontrolle bei Änderung der Komedikation.",
  "contentEn": "ACE inhibitors, thiazide diuretics, and NSAIDs significantly raise lithium levels. Increase monitoring frequency whenever co-medication is changed.",
  "order": 3
  }
  ]
  },
  {
  "id": "seed-003",
  "title": "Clozapin-Monitoring",
  "titleEn": "Clozapine monitoring",
  "category": "Pharmakologie",
  "categoryEn": "Pharmacology",
  "content": "**Indikation:** Therapieresistente Schizophrenie (Versagen von ≥ 2 Antipsychotika).\n\n**Blutbildkontrolle (Agranulozytoserisiko ~1 %):**\n- Vor Beginn: Leukozyten und Diff-BB\n- Wochen 1–18: wöchentliches Blutbild\n- Ab Woche 18: alle 4 Wochen (bei unauffälligem Verlauf)\n\n**Abbruchkriterien:**\n- Leukozyten < 3.500/µl → engmaschige Kontrollen\n- Leukozyten < 3.000/µl oder Neutrophile < 1.500/µl → sofortiges Absetzen, Hämatologie\n\n**Plasmaspiegel:**\n- Therapeutisch: 350–600 ng/ml (Blut 12 h nach letzter Einnahme)\n- Wirkverstärker: Rauchen ↓ Spiegel (CYP1A2-Induktion) → bei Rauchstopp Dosis anpassen\n\n**Weitere UAW:**\nSedierung, Gewichtszunahme, metabolisches Syndrom, orthostatische Hypotonie, Hypersalivation, Myokarditis (erste 4–8 Wochen → EKG, Troponin), Krampfschwelle ↓.",
  "contentEn": "**Indication:** Treatment-resistant schizophrenia (failure of ≥ 2 antipsychotics).\n\n**Full blood count monitoring (agranulocytosis risk ~1 %):**\n- Before starting: WBC and differential FBC\n- Weeks 1–18: weekly FBC\n- From week 18: every 4 weeks (with unremarkable course)\n\n**Discontinuation criteria:**\n- WBC < 3,500/µL → tighten monitoring\n- WBC < 3,000/µL or neutrophils < 1,500/µL → stop immediately, refer to haematology\n\n**Plasma levels:**\n- Therapeutic: 350–600 ng/mL (trough, 12 h after last dose)\n- Modulators: smoking lowers levels (CYP1A2 induction) → reduce dose at smoking cessation\n\n**Other adverse effects:**\nSedation, weight gain, metabolic syndrome, orthostatic hypotension, hypersalivation, myocarditis (first 4–8 weeks → ECG, troponin), lowered seizure threshold.",
  "tags": [
  "Clozapin",
  "Agranulozytose",
  "Blutbild",
  "Therapieresistenz",
  "Monitoring"
  ],
  "tagsEn": [
  "Clozapine",
  "Agranulocytosis",
  "FBC",
  "Treatment resistance",
  "Monitoring"
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "sections": [
  {
  "id": "seed-003-section-0",
  "label": "Übersicht",
  "labelEn": "Overview",
  "content": "**Indikation:** Therapieresistente Schizophrenie (Versagen von ≥ 2 Antipsychotika).",
  "contentEn": "**Indication:** Treatment-resistant schizophrenia (failure of ≥ 2 antipsychotics).",
  "order": 0
  },
  {
  "id": "seed-003-section-1",
  "label": "Blutbildkontrolle (Agranulozytoserisiko ~1 %)",
  "labelEn": "Full blood count monitoring (agranulocytosis risk ~1 %)",
  "content": "- Vor Beginn: Leukozyten und Diff-BB\n- Wochen 1–18: wöchentliches Blutbild\n- Ab Woche 18: alle 4 Wochen (bei unauffälligem Verlauf)",
  "contentEn": "- Before starting: WBC and differential FBC\n- Weeks 1–18: weekly FBC\n- From week 18: every 4 weeks (with unremarkable course)",
  "order": 1
  },
  {
  "id": "seed-003-section-2",
  "label": "Abbruchkriterien",
  "labelEn": "Discontinuation criteria",
  "content": "- Leukozyten < 3.500/µl → engmaschige Kontrollen\n- Leukozyten < 3.000/µl oder Neutrophile < 1.500/µl → sofortiges Absetzen, Hämatologie",
  "contentEn": "- WBC < 3,500/µL → tighten monitoring\n- WBC < 3,000/µL or neutrophils < 1,500/µL → stop immediately, refer to haematology",
  "order": 2
  },
  {
  "id": "seed-003-section-3",
  "label": "Plasmaspiegel",
  "labelEn": "Plasma levels",
  "content": "- Therapeutisch: 350–600 ng/ml (Blut 12 h nach letzter Einnahme)\n- Wirkverstärker: Rauchen ↓ Spiegel (CYP1A2-Induktion) → bei Rauchstopp Dosis anpassen",
  "contentEn": "- Therapeutic: 350–600 ng/mL (trough, 12 h after last dose)\n- Modulators: smoking lowers levels (CYP1A2 induction) → reduce dose at smoking cessation",
  "order": 3
  },
  {
  "id": "seed-003-section-4",
  "label": "Weitere UAW",
  "labelEn": "Other adverse effects",
  "content": "Sedierung, Gewichtszunahme, metabolisches Syndrom, orthostatische Hypotonie, Hypersalivation, Myokarditis (erste 4–8 Wochen → EKG, Troponin), Krampfschwelle ↓.",
  "contentEn": "Sedation, weight gain, metabolic syndrome, orthostatic hypotension, hypersalivation, myocarditis (first 4–8 weeks → ECG, troponin), lowered seizure threshold.",
  "order": 4
  }
  ]
  },
  {
  "id": "seed-004",
  "title": "PHQ-9 — Auswertung und Interpretation",
  "titleEn": "PHQ-9 — scoring and interpretation",
  "category": "Diagnostik",
  "categoryEn": "Assessment",
  "content": "Der PHQ-9 (Patient Health Questionnaire-9) ist ein validiertes Selbstbeurteilungsinstrument für depressive Störungen.\n\n**Auswertung (0–27 Punkte):**\n| Punkte | Schweregrad |\n|--------|------------|\n| 0–4    | Kein/minimaler Hinweis |\n| 5–9    | Milde Depression |\n| 10–14  | Moderate Depression |\n| 15–19  | Mittelschwere Depression |\n| 20–27  | Schwere Depression |\n\n**Klinischer Cutoff für Major Depression:** ≥ 10 Punkte (Sensitivität ~88 %, Spezifität ~88 %).\n\n**Item 9 (Suizidalität):** Jede Antwort > 0 erfordert direkte klinische Exploration.\n\n**Verlaufsbeurteilung:**\nReduktion um ≥ 5 Punkte gilt als klinisch bedeutsame Verbesserung.\nResponse: ≥ 50 % Reduktion vom Ausgangswert.\nRemission: PHQ-9 ≤ 4.",
  "contentEn": "The PHQ-9 (Patient Health Questionnaire-9) is a validated self-report instrument for depressive disorders.\n\n**Scoring (0–27 points):**\n| Score | Severity |\n|-------|----------|\n| 0–4   | None / minimal |\n| 5–9   | Mild depression |\n| 10–14 | Moderate depression |\n| 15–19 | Moderately severe depression |\n| 20–27 | Severe depression |\n\n**Clinical cut-off for major depression:** ≥ 10 points (sensitivity ~88 %, specificity ~88 %).\n\n**Item 9 (suicidality):** Any score > 0 requires direct clinical exploration.\n\n**Course assessment:**\nA reduction of ≥ 5 points is regarded as a clinically meaningful improvement.\nResponse: ≥ 50 % reduction from baseline.\nRemission: PHQ-9 ≤ 4.",
  "tags": [
  "PHQ-9",
  "Depression",
  "Screening",
  "Selbstbeurteilung",
  "Scoring"
  ],
  "tagsEn": [
  "PHQ-9",
  "Depression",
  "Screening",
  "Self-report",
  "Scoring"
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "sections": [
  {
  "id": "seed-004-section-0",
  "label": "Übersicht",
  "labelEn": "Overview",
  "content": "Der PHQ-9 (Patient Health Questionnaire-9) ist ein validiertes Selbstbeurteilungsinstrument für depressive Störungen.",
  "contentEn": "The PHQ-9 (Patient Health Questionnaire-9) is a validated self-report instrument for depressive disorders.",
  "order": 0
  },
  {
  "id": "seed-004-section-1",
  "label": "Auswertung (0–27 Punkte)",
  "labelEn": "Scoring (0–27 points)",
  "content": "| Punkte | Schweregrad |\n|--------|------------|\n| 0–4    | Kein/minimaler Hinweis |\n| 5–9    | Milde Depression |\n| 10–14  | Moderate Depression |\n| 15–19  | Mittelschwere Depression |\n| 20–27  | Schwere Depression |\n\n**Klinischer Cutoff für Major Depression:** ≥ 10 Punkte (Sensitivität ~88 %, Spezifität ~88 %).\n\n**Item 9 (Suizidalität):** Jede Antwort > 0 erfordert direkte klinische Exploration.",
  "contentEn": "| Score | Severity |\n|-------|----------|\n| 0–4   | None / minimal |\n| 5–9   | Mild depression |\n| 10–14 | Moderate depression |\n| 15–19 | Moderately severe depression |\n| 20–27 | Severe depression |\n\n**Clinical cut-off for major depression:** ≥ 10 points (sensitivity ~88 %, specificity ~88 %).\n\n**Item 9 (suicidality):** Any score > 0 requires direct clinical exploration.",
  "order": 1
  },
  {
  "id": "seed-004-section-2",
  "label": "Verlaufsbeurteilung",
  "labelEn": "Course assessment",
  "content": "Reduktion um ≥ 5 Punkte gilt als klinisch bedeutsame Verbesserung.\nResponse: ≥ 50 % Reduktion vom Ausgangswert.\nRemission: PHQ-9 ≤ 4.",
  "contentEn": "A reduction of ≥ 5 points is regarded as a clinically meaningful improvement.\nResponse: ≥ 50 % reduction from baseline.\nRemission: PHQ-9 ≤ 4.",
  "order": 2
  }
  ]
  },
  {
  "id": "seed-005",
  "title": "ICD-10 F-Klassifikation — Überblick",
  "titleEn": "ICD-10 Chapter F — overview",
  "category": "Diagnostik",
  "categoryEn": "Assessment",
  "content": "**Kapitel V (F00–F99): Psychische und Verhaltensstörungen**\n\n| Bereich | Kategorie |\n|---------|-----------|\n| F00–F09 | Organische psychische Störungen (inkl. Demenz) |\n| F10–F19 | Psychische Störungen durch psychotrope Substanzen |\n| F20–F29 | Schizophrenie, schizotype und wahnhafte Störungen |\n| F30–F39 | Affektive Störungen |\n| F40–F48 | Neurotische, Belastungs- und somatoforme Störungen |\n| F50–F59 | Verhaltensauffälligkeiten mit körperlichen Störungen |\n| F60–F69 | Persönlichkeits- und Verhaltensstörungen |\n| F70–F79 | Intelligenzminderung |\n| F80–F89 | Entwicklungsstörungen |\n| F90–F98 | Verhaltens- und emotionale Störungen (Kindheit/Jugend) |\n| F99      | Nicht näher bezeichnete psychische Störung |\n\n**Wichtige Subkategorien (Bsp.):**\n- F20.0: Paranoide Schizophrenie\n- F31.x: Bipolare affektive Störung\n- F32.x / F33.x: Depressive Episode / Rezidivierende Depression\n- F41.1: Generalisierte Angststörung\n- F43.1: PTBS",
  "contentEn": "**Chapter V (F00–F99): Mental and behavioural disorders**\n\n| Range  | Category |\n|--------|----------|\n| F00–F09 | Organic mental disorders (incl. dementia) |\n| F10–F19 | Mental and behavioural disorders due to psychoactive substance use |\n| F20–F29 | Schizophrenia, schizotypal and delusional disorders |\n| F30–F39 | Mood (affective) disorders |\n| F40–F48 | Neurotic, stress-related and somatoform disorders |\n| F50–F59 | Behavioural syndromes associated with physiological disturbances |\n| F60–F69 | Disorders of adult personality and behaviour |\n| F70–F79 | Intellectual disability |\n| F80–F89 | Disorders of psychological development |\n| F90–F98 | Behavioural and emotional disorders with onset in childhood/adolescence |\n| F99      | Unspecified mental disorder |\n\n**Key subcategories (examples):**\n- F20.0: Paranoid schizophrenia\n- F31.x: Bipolar affective disorder\n- F32.x / F33.x: Depressive episode / Recurrent depressive disorder\n- F41.1: Generalised anxiety disorder\n- F43.1: PTSD",
  "tags": [
  "ICD-10",
  "Klassifikation",
  "Diagnose",
  "Überblick"
  ],
  "tagsEn": [
  "ICD-10",
  "Classification",
  "Diagnosis",
  "Overview"
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "sections": [
  {
  "id": "seed-005-section-0",
  "label": "Kapitel V (F00–F99): Psychische und Verhaltensstörungen",
  "labelEn": "Chapter V (F00–F99): Mental and behavioural disorders",
  "content": "| Bereich | Kategorie |\n|---------|-----------|\n| F00–F09 | Organische psychische Störungen (inkl. Demenz) |\n| F10–F19 | Psychische Störungen durch psychotrope Substanzen |\n| F20–F29 | Schizophrenie, schizotype und wahnhafte Störungen |\n| F30–F39 | Affektive Störungen |\n| F40–F48 | Neurotische, Belastungs- und somatoforme Störungen |\n| F50–F59 | Verhaltensauffälligkeiten mit körperlichen Störungen |\n| F60–F69 | Persönlichkeits- und Verhaltensstörungen |\n| F70–F79 | Intelligenzminderung |\n| F80–F89 | Entwicklungsstörungen |\n| F90–F98 | Verhaltens- und emotionale Störungen (Kindheit/Jugend) |\n| F99      | Nicht näher bezeichnete psychische Störung |",
  "contentEn": "| Range  | Category |\n|--------|----------|\n| F00–F09 | Organic mental disorders (incl. dementia) |\n| F10–F19 | Mental and behavioural disorders due to psychoactive substance use |\n| F20–F29 | Schizophrenia, schizotypal and delusional disorders |\n| F30–F39 | Mood (affective) disorders |\n| F40–F48 | Neurotic, stress-related and somatoform disorders |\n| F50–F59 | Behavioural syndromes associated with physiological disturbances |\n| F60–F69 | Disorders of adult personality and behaviour |\n| F70–F79 | Intellectual disability |\n| F80–F89 | Disorders of psychological development |\n| F90–F98 | Behavioural and emotional disorders with onset in childhood/adolescence |\n| F99      | Unspecified mental disorder |",
  "order": 0
  },
  {
  "id": "seed-005-section-1",
  "label": "Wichtige Subkategorien (Bsp.)",
  "labelEn": "Key subcategories (examples)",
  "content": "- F20.0: Paranoide Schizophrenie\n- F31.x: Bipolare affektive Störung\n- F32.x / F33.x: Depressive Episode / Rezidivierende Depression\n- F41.1: Generalisierte Angststörung\n- F43.1: PTBS",
  "contentEn": "- F20.0: Paranoid schizophrenia\n- F31.x: Bipolar affective disorder\n- F32.x / F33.x: Depressive episode / Recurrent depressive disorder\n- F41.1: Generalised anxiety disorder\n- F43.1: PTSD",
  "order": 1
  }
  ]
  },
  {
  "id": "seed-006",
  "title": "Suizidalität — Strukturierte Risikoeinschätzung",
  "titleEn": "Suicidality — structured risk assessment",
  "category": "Klinik",
  "categoryEn": "Clinical",
  "content": "**Exploration (direkte Ansprache empfohlen):**\n1. Passive Todeswünsche: \"Wünschen Sie sich manchmal, nicht mehr aufzuwachen?\"\n2. Suizidgedanken: \"Haben Sie Gedanken daran, sich das Leben zu nehmen?\"\n3. Intention: \"Haben Sie die Absicht, dies umzusetzen?\"\n4. Plan: \"Haben Sie sich überlegt, wie Sie das tun würden?\"\n5. Vorbereitungshandlungen / Mittel verfügbar?\n\n**Risikoerhöhende Faktoren:**\n- Frühere Suizidversuche (stärkster Prädiktor)\n- Aktuelle schwere Depression, Hoffnungslosigkeit (BHS)\n- Komorbider Substanzmissbrauch\n- Männliches Geschlecht, Alter > 65\n- Soziale Isolation, chronische Schmerzen\n- Zugang zu Mitteln (Waffen, Medikamente)\n\n**Schutzfaktoren:**\nSoziale Einbindung, religiöse Überzeugungen, Kinder im Haushalt, Zukunftspläne, Behandlungsmotivation.\n\n**Sicherheitsplanung (nach Stanley & Brown):**\n1. Frühwarnzeichen identifizieren\n2. Ablenkungsstrategien intern\n3. Soziale Kontakte (ohne Suizid-Thema)\n4. Krisentelefon / Notaufnahme\n5. Mittelreduktion in der häuslichen Umgebung",
  "contentEn": "**Exploration (ask directly):**\n1. Passive death wishes: \"Do you sometimes wish you would not wake up?\"\n2. Suicidal ideation: \"Do you have thoughts of taking your own life?\"\n3. Intent: \"Do you intend to act on these thoughts?\"\n4. Plan: \"Have you thought about how you would do it?\"\n5. Preparatory acts / access to means?\n\n**Risk-increasing factors:**\n- Previous suicide attempts (strongest predictor)\n- Current severe depression, hopelessness (Beck Hopelessness Scale)\n- Comorbid substance misuse\n- Male sex, age > 65\n- Social isolation, chronic pain\n- Access to means (firearms, medication)\n\n**Protective factors:**\nSocial connectedness, religious beliefs, children in the household, future plans, treatment engagement.\n\n**Safety planning (Stanley & Brown):**\n1. Identify warning signs\n2. Internal coping / distraction strategies\n3. Social contacts (without discussing suicide)\n4. Crisis hotline / emergency department\n5. Means restriction at home",
  "tags": [
  "Suizidalität",
  "Risikoeinschätzung",
  "Sicherheitsplan",
  "Krisenintervention"
  ],
  "tagsEn": [
  "Suicidality",
  "Risk assessment",
  "Safety plan",
  "Crisis intervention"
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "sections": [
  {
  "id": "seed-006-section-0",
  "label": "Exploration (direkte Ansprache empfohlen)",
  "labelEn": "Exploration (ask directly)",
  "content": "1. Passive Todeswünsche: \"Wünschen Sie sich manchmal, nicht mehr aufzuwachen?\"\n2. Suizidgedanken: \"Haben Sie Gedanken daran, sich das Leben zu nehmen?\"\n3. Intention: \"Haben Sie die Absicht, dies umzusetzen?\"\n4. Plan: \"Haben Sie sich überlegt, wie Sie das tun würden?\"\n5. Vorbereitungshandlungen / Mittel verfügbar?",
  "contentEn": "1. Passive death wishes: \"Do you sometimes wish you would not wake up?\"\n2. Suicidal ideation: \"Do you have thoughts of taking your own life?\"\n3. Intent: \"Do you intend to act on these thoughts?\"\n4. Plan: \"Have you thought about how you would do it?\"\n5. Preparatory acts / access to means?",
  "order": 0
  },
  {
  "id": "seed-006-section-1",
  "label": "Risikoerhöhende Faktoren",
  "labelEn": "Risk-increasing factors",
  "content": "- Frühere Suizidversuche (stärkster Prädiktor)\n- Aktuelle schwere Depression, Hoffnungslosigkeit (BHS)\n- Komorbider Substanzmissbrauch\n- Männliches Geschlecht, Alter > 65\n- Soziale Isolation, chronische Schmerzen\n- Zugang zu Mitteln (Waffen, Medikamente)",
  "contentEn": "- Previous suicide attempts (strongest predictor)\n- Current severe depression, hopelessness (Beck Hopelessness Scale)\n- Comorbid substance misuse\n- Male sex, age > 65\n- Social isolation, chronic pain\n- Access to means (firearms, medication)",
  "order": 1
  },
  {
  "id": "seed-006-section-2",
  "label": "Schutzfaktoren",
  "labelEn": "Protective factors",
  "content": "Soziale Einbindung, religiöse Überzeugungen, Kinder im Haushalt, Zukunftspläne, Behandlungsmotivation.",
  "contentEn": "Social connectedness, religious beliefs, children in the household, future plans, treatment engagement.",
  "order": 2
  },
  {
  "id": "seed-006-section-3",
  "label": "Sicherheitsplanung (nach Stanley & Brown)",
  "labelEn": "Safety planning (Stanley & Brown)",
  "content": "1. Frühwarnzeichen identifizieren\n2. Ablenkungsstrategien intern\n3. Soziale Kontakte (ohne Suizid-Thema)\n4. Krisentelefon / Notaufnahme\n5. Mittelreduktion in der häuslichen Umgebung",
  "contentEn": "1. Identify warning signs\n2. Internal coping / distraction strategies\n3. Social contacts (without discussing suicide)\n4. Crisis hotline / emergency department\n5. Means restriction at home",
  "order": 3
  }
  ]
  },
  {
  "id": "seed-007",
  "title": "PANSS — Kurzanleitung",
  "titleEn": "PANSS — quick guide",
  "category": "Diagnostik",
  "categoryEn": "Assessment",
  "content": "Die Positive and Negative Syndrome Scale (PANSS) erfasst die Psychopathologie bei Schizophrenie mit 30 Items.\n\n**Skalen:**\n- P (Positive Skala): 7 Items (Wahnideen, konzeptionelle Desorganisation, Halluzinationen, Erregung, Grandiosität, Verfolgungsideen, Feindseligkeit)\n- N (Negative Skala): 7 Items (Affektverflachung, emotionale Rückzug, schlechter Rapport, passiv-apatischer sozialer Rückzug, abstrakte Denkstörung, Spontaneität, stereotype Denkweise)\n- G (Allgemeine Psychopathologie): 16 Items\n\n**Bewertung:** 1 (fehlend) bis 7 (extrem) pro Item.\n- Gesamtscore: 30–210\n- Mild: 58–75 | Moderat: 75–95 | Schwer: > 95\n\n**Klinisch bedeutsame Verbesserung:** Reduktion ≥ 20 % des PANSS-Gesamtscores.\n\n**Dauer:** ~45 min (erfordert klinisches Interview und Beobachtung).",
  "contentEn": "The Positive and Negative Syndrome Scale (PANSS) measures psychopathology in schizophrenia using 30 items.\n\n**Subscales:**\n- P (Positive scale): 7 items (delusions, conceptual disorganisation, hallucinations, excitement, grandiosity, suspiciousness/persecution, hostility)\n- N (Negative scale): 7 items (blunted affect, emotional withdrawal, poor rapport, passive/apathetic social withdrawal, difficulty in abstract thinking, lack of spontaneity, stereotyped thinking)\n- G (General psychopathology): 16 items\n\n**Rating:** 1 (absent) to 7 (extreme) per item.\n- Total score: 30–210\n- Mild: 58–75 | Moderate: 75–95 | Severe: > 95\n\n**Clinically meaningful improvement:** ≥ 20 % reduction in PANSS total score.\n\n**Duration:** ~45 min (requires clinical interview and observation).",
  "tags": [
  "PANSS",
  "Schizophrenie",
  "Psychose",
  "Rating-Skala",
  "Positiv",
  "Negativ"
  ],
  "tagsEn": [
  "PANSS",
  "Schizophrenia",
  "Psychosis",
  "Rating scale",
  "Positive",
  "Negative"
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "sections": [
  {
  "id": "seed-007-section-0",
  "label": "Übersicht",
  "labelEn": "Overview",
  "content": "Die Positive and Negative Syndrome Scale (PANSS) erfasst die Psychopathologie bei Schizophrenie mit 30 Items.",
  "contentEn": "The Positive and Negative Syndrome Scale (PANSS) measures psychopathology in schizophrenia using 30 items.",
  "order": 0
  },
  {
  "id": "seed-007-section-1",
  "label": "Skalen",
  "labelEn": "Subscales",
  "content": "- P (Positive Skala): 7 Items (Wahnideen, konzeptionelle Desorganisation, Halluzinationen, Erregung, Grandiosität, Verfolgungsideen, Feindseligkeit)\n- N (Negative Skala): 7 Items (Affektverflachung, emotionale Rückzug, schlechter Rapport, passiv-apatischer sozialer Rückzug, abstrakte Denkstörung, Spontaneität, stereotype Denkweise)\n- G (Allgemeine Psychopathologie): 16 Items\n\n**Bewertung:** 1 (fehlend) bis 7 (extrem) pro Item.\n- Gesamtscore: 30–210\n- Mild: 58–75 | Moderat: 75–95 | Schwer: > 95\n\n**Klinisch bedeutsame Verbesserung:** Reduktion ≥ 20 % des PANSS-Gesamtscores.\n\n**Dauer:** ~45 min (erfordert klinisches Interview und Beobachtung).",
  "contentEn": "- P (Positive scale): 7 items (delusions, conceptual disorganisation, hallucinations, excitement, grandiosity, suspiciousness/persecution, hostility)\n- N (Negative scale): 7 items (blunted affect, emotional withdrawal, poor rapport, passive/apathetic social withdrawal, difficulty in abstract thinking, lack of spontaneity, stereotyped thinking)\n- G (General psychopathology): 16 items\n\n**Rating:** 1 (absent) to 7 (extreme) per item.\n- Total score: 30–210\n- Mild: 58–75 | Moderate: 75–95 | Severe: > 95\n\n**Clinically meaningful improvement:** ≥ 20 % reduction in PANSS total score.\n\n**Duration:** ~45 min (requires clinical interview and observation).",
  "order": 1
  }
  ]
  },
  {
  "id": "seed-008",
  "title": "Wichtigste Interaktionen in der Psychiatrie",
  "titleEn": "Key drug interactions in psychiatry",
  "category": "Pharmakologie",
  "categoryEn": "Pharmacology",
  "content": "**CYP450-vermittelte Interaktionen:**\n\n| Hemmer (↑ Spiegel) | Induktoren (↓ Spiegel) |\n|---------------------|------------------------|\n| Fluvoxamin (CYP1A2, 2C19, 3A4) | Carbamazepin |\n| Fluoxetin / Paroxetin (CYP2D6) | Rifampicin |\n| Valproat (CYP2C9) | Johanniskraut |\n| Ketoconazol | Rauchen (CYP1A2) |\n\n**Klinisch relevante Kombinationen:**\n- **Lithium + NSAIDs/Thiazide/ACE-Hemmer** → Li-Spiegel ↑ (Toxizität)\n- **SSRI + Tramadol/Triptane/Linezolid** → Serotoninsyndrom\n- **Clozapin + Benzodiazepine i.v.** → Kreislaufkollaps, Atemdepression\n- **Haloperidol + QT-verlängernde Mittel** → Torsades de pointes\n- **Valproat + Lamotrigin** → Lamotrigin-Spiegel verdoppelt (Dosis halbieren)\n- **MAO-Hemmer + Tyramin-reiche Nahrung** → hypertensive Krise\n- **Carbamazepin + OCP** → kontrazeptive Wirkung ↓\n\n**QT-Verlängerung (Monitoring EKG):**\nHaloperidol, Ziprasidon, Sertindol, Citalopram (> 40 mg), Clomipramin.",
  "contentEn": "**CYP450-mediated interactions:**\n\n| Inhibitors (↑ levels) | Inducers (↓ levels) |\n|------------------------|----------------------|\n| Fluvoxamine (CYP1A2, 2C19, 3A4) | Carbamazepine |\n| Fluoxetine / paroxetine (CYP2D6) | Rifampicin |\n| Valproate (CYP2C9) | St John's wort |\n| Ketoconazole | Smoking (CYP1A2) |\n\n**Clinically relevant combinations:**\n- **Lithium + NSAIDs / thiazides / ACE inhibitors** → ↑ lithium level (toxicity)\n- **SSRI + tramadol / triptans / linezolid** → serotonin syndrome\n- **Clozapine + IV benzodiazepines** → circulatory collapse, respiratory depression\n- **Haloperidol + QT-prolonging agents** → torsades de pointes\n- **Valproate + lamotrigine** → lamotrigine level doubles (halve the dose)\n- **MAO inhibitors + tyramine-rich food** → hypertensive crisis\n- **Carbamazepine + combined oral contraceptive** → reduced contraceptive efficacy\n\n**QT prolongation (ECG monitoring):**\nHaloperidol, ziprasidone, sertindole, citalopram (> 40 mg), clomipramine.",
  "tags": [
  "Interaktionen",
  "CYP450",
  "QT",
  "Serotoninsyndrom",
  "Pharmakologie"
  ],
  "tagsEn": [
  "Interactions",
  "CYP450",
  "QT",
  "Serotonin syndrome",
  "Pharmacology"
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "sections": [
  {
  "id": "seed-008-section-0",
  "label": "CYP450-vermittelte Interaktionen",
  "labelEn": "CYP450-mediated interactions",
  "content": "| Hemmer (↑ Spiegel) | Induktoren (↓ Spiegel) |\n|---------------------|------------------------|\n| Fluvoxamin (CYP1A2, 2C19, 3A4) | Carbamazepin |\n| Fluoxetin / Paroxetin (CYP2D6) | Rifampicin |\n| Valproat (CYP2C9) | Johanniskraut |\n| Ketoconazol | Rauchen (CYP1A2) |",
  "contentEn": "| Inhibitors (↑ levels) | Inducers (↓ levels) |\n|------------------------|----------------------|\n| Fluvoxamine (CYP1A2, 2C19, 3A4) | Carbamazepine |\n| Fluoxetine / paroxetine (CYP2D6) | Rifampicin |\n| Valproate (CYP2C9) | St John's wort |\n| Ketoconazole | Smoking (CYP1A2) |",
  "order": 0
  },
  {
  "id": "seed-008-section-1",
  "label": "Klinisch relevante Kombinationen",
  "labelEn": "Clinically relevant combinations",
  "content": "- **Lithium + NSAIDs/Thiazide/ACE-Hemmer** → Li-Spiegel ↑ (Toxizität)\n- **SSRI + Tramadol/Triptane/Linezolid** → Serotoninsyndrom\n- **Clozapin + Benzodiazepine i.v.** → Kreislaufkollaps, Atemdepression\n- **Haloperidol + QT-verlängernde Mittel** → Torsades de pointes\n- **Valproat + Lamotrigin** → Lamotrigin-Spiegel verdoppelt (Dosis halbieren)\n- **MAO-Hemmer + Tyramin-reiche Nahrung** → hypertensive Krise\n- **Carbamazepin + OCP** → kontrazeptive Wirkung ↓",
  "contentEn": "- **Lithium + NSAIDs / thiazides / ACE inhibitors** → ↑ lithium level (toxicity)\n- **SSRI + tramadol / triptans / linezolid** → serotonin syndrome\n- **Clozapine + IV benzodiazepines** → circulatory collapse, respiratory depression\n- **Haloperidol + QT-prolonging agents** → torsades de pointes\n- **Valproate + lamotrigine** → lamotrigine level doubles (halve the dose)\n- **MAO inhibitors + tyramine-rich food** → hypertensive crisis\n- **Carbamazepine + combined oral contraceptive** → reduced contraceptive efficacy",
  "order": 1
  },
  {
  "id": "seed-008-section-2",
  "label": "QT-Verlängerung (Monitoring EKG)",
  "labelEn": "QT prolongation (ECG monitoring)",
  "content": "Haloperidol, Ziprasidon, Sertindol, Citalopram (> 40 mg), Clomipramin.",
  "contentEn": "Haloperidol, ziprasidone, sertindole, citalopram (> 40 mg), clomipramine.",
  "order": 2
  }
  ]
  },
  {
  "id": "seed-009",
  "title": "S3-Leitlinie Schizophrenie — Kernaussagen",
  "titleEn": "Schizophrenia clinical guideline — key recommendations",
  "category": "Leitlinien",
  "categoryEn": "Guidelines",
  "content": "**DGPPN S3-Leitlinie Schizophrenie (2019, Update 2024)**\n\n**Akutbehandlung:**\n- Antipsychotikum der 2. Generation bevorzugen (außer bei spezifischen Indikationen)\n- Monotherapie anstreben; Dosisäquivalente nach Gardos/Davis verwenden\n- Hochdosierung nicht wirksamer als Standarddosen (keine Evidenz > 1000 mg CPZ-Äq./d)\n- Benzodiazepine kurzfristig bei Agitation (keine Dauermedikation)\n\n**Langzeittherapie:**\n- Nach Erstepisode: Antipsychotikum mind. 1–2 Jahre nach Remission\n- Nach Mehrfachepisoden: mind. 5 Jahre, bei häufigen Rückfällen langfristig\n- Depot-Präparate bei Adhärenzproblemen (Evidenzgrad A)\n- Clozapin bei therapieresistenter Schizophrenie (≥ 2 Versuche gescheitert)\n\n**Psychosoziale Interventionen (Evidenz A/B):**\n- Kognitive Verhaltenstherapie (KVT) für Psychosen\n- Familieninterventionen\n- Training sozialer Kompetenzen\n- Supported Employment (IPS-Modell)",
  "contentEn": "**DGPPN S3 guideline on schizophrenia (2019, 2024 update)**\n\n**Acute treatment:**\n- Prefer a second-generation antipsychotic (unless a specific indication suggests otherwise)\n- Aim for monotherapy; use Gardos / Davis dose equivalents\n- High doses are not more effective than standard doses (no evidence above 1000 mg CPZ-equivalent/day)\n- Benzodiazepines short-term for agitation only (no maintenance use)\n\n**Maintenance therapy:**\n- After a first episode: continue the antipsychotic for at least 1–2 years after remission\n- After multiple episodes: at least 5 years; long-term when relapses are frequent\n- Long-acting injectables when adherence is a concern (evidence grade A)\n- Clozapine for treatment-resistant schizophrenia (≥ 2 failed adequate trials)\n\n**Psychosocial interventions (evidence A/B):**\n- Cognitive behavioural therapy (CBT) for psychosis\n- Family interventions\n- Social skills training\n- Supported employment (IPS model)",
  "tags": [
  "Leitlinie",
  "Schizophrenie",
  "DGPPN",
  "S3",
  "Antipsychotika"
  ],
  "tagsEn": [
  "Guideline",
  "Schizophrenia",
  "DGPPN",
  "S3",
  "Antipsychotics"
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "sections": [
  {
  "id": "seed-009-section-0",
  "label": "DGPPN S3-Leitlinie Schizophrenie (2019, Update 2024)",
  "labelEn": "DGPPN S3 guideline on schizophrenia (2019, 2024 update)",
  "content": "",
  "order": 0
  },
  {
  "id": "seed-009-section-1",
  "label": "Akutbehandlung",
  "labelEn": "Acute treatment",
  "content": "- Antipsychotikum der 2. Generation bevorzugen (außer bei spezifischen Indikationen)\n- Monotherapie anstreben; Dosisäquivalente nach Gardos/Davis verwenden\n- Hochdosierung nicht wirksamer als Standarddosen (keine Evidenz > 1000 mg CPZ-Äq./d)\n- Benzodiazepine kurzfristig bei Agitation (keine Dauermedikation)",
  "contentEn": "- Prefer a second-generation antipsychotic (unless a specific indication suggests otherwise)\n- Aim for monotherapy; use Gardos / Davis dose equivalents\n- High doses are not more effective than standard doses (no evidence above 1000 mg CPZ-equivalent/day)\n- Benzodiazepines short-term for agitation only (no maintenance use)",
  "order": 1
  },
  {
  "id": "seed-009-section-2",
  "label": "Langzeittherapie",
  "labelEn": "Maintenance therapy",
  "content": "- Nach Erstepisode: Antipsychotikum mind. 1–2 Jahre nach Remission\n- Nach Mehrfachepisoden: mind. 5 Jahre, bei häufigen Rückfällen langfristig\n- Depot-Präparate bei Adhärenzproblemen (Evidenzgrad A)\n- Clozapin bei therapieresistenter Schizophrenie (≥ 2 Versuche gescheitert)",
  "contentEn": "- After a first episode: continue the antipsychotic for at least 1–2 years after remission\n- After multiple episodes: at least 5 years; long-term when relapses are frequent\n- Long-acting injectables when adherence is a concern (evidence grade A)\n- Clozapine for treatment-resistant schizophrenia (≥ 2 failed adequate trials)",
  "order": 2
  },
  {
  "id": "seed-009-section-3",
  "label": "Psychosoziale Interventionen (Evidenz A/B)",
  "labelEn": "Psychosocial interventions (evidence A/B)",
  "content": "- Kognitive Verhaltenstherapie (KVT) für Psychosen\n- Familieninterventionen\n- Training sozialer Kompetenzen\n- Supported Employment (IPS-Modell)",
  "contentEn": "- Cognitive behavioural therapy (CBT) for psychosis\n- Family interventions\n- Social skills training\n- Supported employment (IPS model)",
  "order": 3
  }
  ]
  },
  {
  "id": "seed-010",
  "title": "Psychopathologischer Befund — Kerndimensionen",
  "titleEn": "Mental status examination — core dimensions",
  "category": "Psychopathologie",
  "categoryEn": "Psychopathology",
  "content": "**AMDP-orientierter psychopathologischer Befund:**\n\n**Bewusstsein:** Vigilanz, Orientierung (Zeit, Ort, Person, Situation)\n\n**Aufmerksamkeit / Konzentration:** Ablenkbarkeit, Ausdauer\n\n**Gedächtnis:** Kurz- und Langzeitgedächtnis, Konfabulation\n\n**Formale Denkstörungen:**\n- Verlangsamung, Hemmung, Gedankenabreißen\n- Umständlichkeit, Weitschweifigkeit, Vorbeireden\n- Inkohärenz, Zerfahrenheit, Neologismen\n\n**Inhaltliche Denkstörungen:**\n- Wahn (Verfolgung, Beziehung, Grandiosität, Nihilismus)\n- Überwertige Ideen, Zwangsgedanken\n\n**Wahrnehmung:** Illusionen, Halluzinationen (akustisch, visuell, taktil, zönästhetisch)\n\n**Ich-Störungen:** Derealisation, Depersonalisation, Gedankeneingebung, -entzug, -ausbreitung, Fremdbeeinflussungserleben\n\n**Affekt:** Grundstimmung, Schwingungsfähigkeit, Inadäquanz, Ambivalenz, Angst\n\n**Antrieb / Psychomotorik:** Antriebsminderung, Agitation, Stupor, Manierismen, Stereotypien\n\n**Suizidalität / Fremdgefährdung:** Immer explizit explorieren",
  "contentEn": "**AMDP-oriented mental status examination:**\n\n**Consciousness:** Vigilance, orientation (time, place, person, situation)\n\n**Attention / concentration:** Distractibility, persistence\n\n**Memory:** Short- and long-term memory, confabulation\n\n**Formal thought disorders:**\n- Slowed thinking, thought blocking, thought derailment\n- Circumstantiality, tangentiality, talking past the point\n- Incoherence, looseness of association, neologisms\n\n**Content thought disorders:**\n- Delusions (persecutory, referential, grandiose, nihilistic)\n- Overvalued ideas, obsessions\n\n**Perception:** Illusions, hallucinations (auditory, visual, tactile, cenesthetic)\n\n**Ego disturbances:** Derealisation, depersonalisation, thought insertion / withdrawal / broadcasting, experiences of external control\n\n**Affect:** Baseline mood, mood reactivity, inappropriate affect, ambivalence, anxiety\n\n**Drive / psychomotor activity:** Reduced drive, agitation, stupor, mannerisms, stereotypies\n\n**Suicidality / risk to others:** Always explicitly explored",
  "tags": [
  "AMDP",
  "Psychopathologie",
  "Befund",
  "Denkstörungen",
  "Halluzinationen"
  ],
  "tagsEn": [
  "AMDP",
  "Psychopathology",
  "Mental status",
  "Thought disorders",
  "Hallucinations"
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "sections": [
  {
  "id": "seed-010-section-0",
  "label": "AMDP-orientierter psychopathologischer Befund",
  "labelEn": "AMDP-oriented mental status examination",
  "content": "**Bewusstsein:** Vigilanz, Orientierung (Zeit, Ort, Person, Situation)\n\n**Aufmerksamkeit / Konzentration:** Ablenkbarkeit, Ausdauer\n\n**Gedächtnis:** Kurz- und Langzeitgedächtnis, Konfabulation",
  "contentEn": "**Consciousness:** Vigilance, orientation (time, place, person, situation)\n\n**Attention / concentration:** Distractibility, persistence\n\n**Memory:** Short- and long-term memory, confabulation",
  "order": 0
  },
  {
  "id": "seed-010-section-1",
  "label": "Formale Denkstörungen",
  "labelEn": "Formal thought disorders",
  "content": "- Verlangsamung, Hemmung, Gedankenabreißen\n- Umständlichkeit, Weitschweifigkeit, Vorbeireden\n- Inkohärenz, Zerfahrenheit, Neologismen",
  "contentEn": "- Slowed thinking, thought blocking, thought derailment\n- Circumstantiality, tangentiality, talking past the point\n- Incoherence, looseness of association, neologisms",
  "order": 1
  },
  {
  "id": "seed-010-section-2",
  "label": "Inhaltliche Denkstörungen",
  "labelEn": "Content thought disorders",
  "content": "- Wahn (Verfolgung, Beziehung, Grandiosität, Nihilismus)\n- Überwertige Ideen, Zwangsgedanken\n\n**Wahrnehmung:** Illusionen, Halluzinationen (akustisch, visuell, taktil, zönästhetisch)\n\n**Ich-Störungen:** Derealisation, Depersonalisation, Gedankeneingebung, -entzug, -ausbreitung, Fremdbeeinflussungserleben\n\n**Affekt:** Grundstimmung, Schwingungsfähigkeit, Inadäquanz, Ambivalenz, Angst\n\n**Antrieb / Psychomotorik:** Antriebsminderung, Agitation, Stupor, Manierismen, Stereotypien\n\n**Suizidalität / Fremdgefährdung:** Immer explizit explorieren",
  "contentEn": "- Delusions (persecutory, referential, grandiose, nihilistic)\n- Overvalued ideas, obsessions\n\n**Perception:** Illusions, hallucinations (auditory, visual, tactile, cenesthetic)\n\n**Ego disturbances:** Derealisation, depersonalisation, thought insertion / withdrawal / broadcasting, experiences of external control\n\n**Affect:** Baseline mood, mood reactivity, inappropriate affect, ambivalence, anxiety\n\n**Drive / psychomotor activity:** Reduced drive, agitation, stupor, mannerisms, stereotypies\n\n**Suicidality / risk to others:** Always explicitly explored",
  "order": 2
  }
  ]
  }

]
