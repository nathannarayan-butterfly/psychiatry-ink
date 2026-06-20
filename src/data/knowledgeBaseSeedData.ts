export type KbCategory =
  | 'Pharmakologie'
  | 'Diagnostik'
  | 'Klinik'
  | 'Leitlinien'
  | 'Psychopathologie'
  | 'Sonstiges'

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
  tags: string[]
  /**
   * English variants of {@link tags}. Falls back to {@link tags} when absent.
   * NOT necessarily index-aligned with German tags.
   */
  tagsEn?: string[]
  createdAt: string
}

export const KNOWLEDGE_BASE_SEED: KnowledgeEntry[] = [
  {
    id: 'seed-001',
    title: 'NMS — Malignes Neuroleptisches Syndrom',
    titleEn: 'NMS — Neuroleptic Malignant Syndrome',
    category: 'Pharmakologie',
    categoryEn: 'Pharmacology',
    content: `Das maligne neuroleptische Syndrom (MNS) ist eine seltene, lebensbedrohliche Reaktion auf Antipsychotika.

**Kernsymptome (FALTER):**
- Fieber (> 38 °C, oft > 40 °C)
- Autonome Instabilität (Tachykardie, labiler Blutdruck, Diaphorese)
- Leukozytose
- Tremor / Rigor (Bleiröhrenrigidität)
- Elevated CK (> 1000 U/l, oft deutlich höher)
- Rigor muscularis
- (Bewusstseinsveränderung)

**Management:**
1. Sofortiges Absetzen aller Antipsychotika und Dopaminantagonisten
2. Intensivmedizinische Überwachung
3. Kühlung, ausreichend Flüssigkeit (Rhabdomyolyse-Prophylaxe)
4. Dantrolen 1–2,5 mg/kg i.v. (Muskelrelaxation), ggf. wiederholen
5. Bromocriptin 2,5–10 mg oral 3×/d (dopaminerge Unterstützung)
6. Lorazepam bei Agitation
7. Keine Neueinleitung eines Antipsychotikums für mind. 2 Wochen`,
    contentEn: `Neuroleptic malignant syndrome (NMS) is a rare, life-threatening reaction to antipsychotics.

**Core features (FEVER mnemonic):**
- Fever (> 38 °C, often > 40 °C)
- Autonomic instability (tachycardia, labile blood pressure, diaphoresis)
- Leukocytosis
- Tremor / rigidity ("lead-pipe" rigidity)
- Elevated CK (> 1000 U/L, often markedly higher)
- Muscular rigidity
- (Altered level of consciousness)

**Management:**
1. Immediately discontinue all antipsychotics and dopamine antagonists
2. Intensive-care monitoring
3. Active cooling, generous IV fluids (rhabdomyolysis prophylaxis)
4. Dantrolene 1–2.5 mg/kg IV (muscle relaxation), repeat if needed
5. Bromocriptine 2.5–10 mg orally three times daily (dopaminergic support)
6. Lorazepam for agitation
7. Do not reintroduce any antipsychotic for at least 2 weeks`,
    tags: ['NMS', 'Notfall', 'Antipsychotika', 'Rigidität', 'CK', 'Dantrolen'],
    tagsEn: ['NMS', 'Emergency', 'Antipsychotics', 'Rigidity', 'CK', 'Dantrolene'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-002',
    title: 'Lithium-Monitoring — Zielwerte und Frequenz',
    titleEn: 'Lithium monitoring — target levels and frequency',
    category: 'Pharmakologie',
    categoryEn: 'Pharmacology',
    content: `**Therapeutischer Bereich:**
- Akuttherapie (Manie): 0,8–1,2 mmol/l
- Rezidivprophylaxe (langfristig): 0,6–0,8 mmol/l
- Messung 12 Stunden nach letzter Einnahme (Talspiegelbestimmung)

**Monitoring-Frequenz:**
- Einstellung: alle 5–7 Tage bis stabiler Spiegel
- Stabil: alle 3 Monate (Spiegel, Niere, Schilddrüse)
- Nierenfunktion (Kreatinin, GFR, Harnstoff), TSH alle 6 Monate
- Jährlich: EKG (bei Risikopatienten)

**Toxizitätszeichen (ab ~1,5 mmol/l):**
Grobschlägiger Tremor, Ataxie, Dysarthrie, Somnolenz, Diarrhoe, Erbrechen.
Ab > 2,0 mmol/l: Verwirrtheit, Anfälle, Bewusstlosigkeit → Notfall.

**Interaktionen:**
ACE-Hemmer, Thiazide, NSAIDs → erhöhen Lithiumspiegel deutlich. Engmaschigere Kontrolle bei Änderung der Komedikation.`,
    contentEn: `**Therapeutic range:**
- Acute treatment (mania): 0.8–1.2 mmol/L
- Maintenance / relapse prophylaxis: 0.6–0.8 mmol/L
- Measure 12 hours after the last dose (trough level)

**Monitoring frequency:**
- Initiation: every 5–7 days until a stable level is reached
- Stable patient: every 3 months (level, renal function, thyroid)
- Renal function (creatinine, eGFR, urea), TSH every 6 months
- Annual ECG (in patients at cardiac risk)

**Toxicity signs (from ~1.5 mmol/L upward):**
Coarse tremor, ataxia, dysarthria, somnolence, diarrhoea, vomiting.
Above 2.0 mmol/L: confusion, seizures, loss of consciousness → emergency.

**Interactions:**
ACE inhibitors, thiazide diuretics, and NSAIDs significantly raise lithium levels. Increase monitoring frequency whenever co-medication is changed.`,
    tags: ['Lithium', 'Stimmungsstabilisator', 'Monitoring', 'Toxizität', 'Spiegel'],
    tagsEn: ['Lithium', 'Mood stabiliser', 'Monitoring', 'Toxicity', 'Plasma level'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-003',
    title: 'Clozapin-Monitoring',
    titleEn: 'Clozapine monitoring',
    category: 'Pharmakologie',
    categoryEn: 'Pharmacology',
    content: `**Indikation:** Therapieresistente Schizophrenie (Versagen von ≥ 2 Antipsychotika).

**Blutbildkontrolle (Agranulozytoserisiko ~1 %):**
- Vor Beginn: Leukozyten und Diff-BB
- Wochen 1–18: wöchentliches Blutbild
- Ab Woche 18: alle 4 Wochen (bei unauffälligem Verlauf)

**Abbruchkriterien:**
- Leukozyten < 3.500/µl → engmaschige Kontrollen
- Leukozyten < 3.000/µl oder Neutrophile < 1.500/µl → sofortiges Absetzen, Hämatologie

**Plasmaspiegel:**
- Therapeutisch: 350–600 ng/ml (Blut 12 h nach letzter Einnahme)
- Wirkverstärker: Rauchen ↓ Spiegel (CYP1A2-Induktion) → bei Rauchstopp Dosis anpassen

**Weitere UAW:**
Sedierung, Gewichtszunahme, metabolisches Syndrom, orthostatische Hypotonie, Hypersalivation, Myokarditis (erste 4–8 Wochen → EKG, Troponin), Krampfschwelle ↓.`,
    contentEn: `**Indication:** Treatment-resistant schizophrenia (failure of ≥ 2 antipsychotics).

**Full blood count monitoring (agranulocytosis risk ~1 %):**
- Before starting: WBC and differential FBC
- Weeks 1–18: weekly FBC
- From week 18: every 4 weeks (with unremarkable course)

**Discontinuation criteria:**
- WBC < 3,500/µL → tighten monitoring
- WBC < 3,000/µL or neutrophils < 1,500/µL → stop immediately, refer to haematology

**Plasma levels:**
- Therapeutic: 350–600 ng/mL (trough, 12 h after last dose)
- Modulators: smoking lowers levels (CYP1A2 induction) → reduce dose at smoking cessation

**Other adverse effects:**
Sedation, weight gain, metabolic syndrome, orthostatic hypotension, hypersalivation, myocarditis (first 4–8 weeks → ECG, troponin), lowered seizure threshold.`,
    tags: ['Clozapin', 'Agranulozytose', 'Blutbild', 'Therapieresistenz', 'Monitoring'],
    tagsEn: ['Clozapine', 'Agranulocytosis', 'FBC', 'Treatment resistance', 'Monitoring'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-004',
    title: 'PHQ-9 — Auswertung und Interpretation',
    titleEn: 'PHQ-9 — scoring and interpretation',
    category: 'Diagnostik',
    categoryEn: 'Assessment',
    content: `Der PHQ-9 (Patient Health Questionnaire-9) ist ein validiertes Selbstbeurteilungsinstrument für depressive Störungen.

**Auswertung (0–27 Punkte):**
| Punkte | Schweregrad |
|--------|------------|
| 0–4    | Kein/minimaler Hinweis |
| 5–9    | Milde Depression |
| 10–14  | Moderate Depression |
| 15–19  | Mittelschwere Depression |
| 20–27  | Schwere Depression |

**Klinischer Cutoff für Major Depression:** ≥ 10 Punkte (Sensitivität ~88 %, Spezifität ~88 %).

**Item 9 (Suizidalität):** Jede Antwort > 0 erfordert direkte klinische Exploration.

**Verlaufsbeurteilung:**
Reduktion um ≥ 5 Punkte gilt als klinisch bedeutsame Verbesserung.
Response: ≥ 50 % Reduktion vom Ausgangswert.
Remission: PHQ-9 ≤ 4.`,
    contentEn: `The PHQ-9 (Patient Health Questionnaire-9) is a validated self-report instrument for depressive disorders.

**Scoring (0–27 points):**
| Score | Severity |
|-------|----------|
| 0–4   | None / minimal |
| 5–9   | Mild depression |
| 10–14 | Moderate depression |
| 15–19 | Moderately severe depression |
| 20–27 | Severe depression |

**Clinical cut-off for major depression:** ≥ 10 points (sensitivity ~88 %, specificity ~88 %).

**Item 9 (suicidality):** Any score > 0 requires direct clinical exploration.

**Course assessment:**
A reduction of ≥ 5 points is regarded as a clinically meaningful improvement.
Response: ≥ 50 % reduction from baseline.
Remission: PHQ-9 ≤ 4.`,
    tags: ['PHQ-9', 'Depression', 'Screening', 'Selbstbeurteilung', 'Scoring'],
    tagsEn: ['PHQ-9', 'Depression', 'Screening', 'Self-report', 'Scoring'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-005',
    title: 'ICD-10 F-Klassifikation — Überblick',
    titleEn: 'ICD-10 Chapter F — overview',
    category: 'Diagnostik',
    categoryEn: 'Assessment',
    content: `**Kapitel V (F00–F99): Psychische und Verhaltensstörungen**

| Bereich | Kategorie |
|---------|-----------|
| F00–F09 | Organische psychische Störungen (inkl. Demenz) |
| F10–F19 | Psychische Störungen durch psychotrope Substanzen |
| F20–F29 | Schizophrenie, schizotype und wahnhafte Störungen |
| F30–F39 | Affektive Störungen |
| F40–F48 | Neurotische, Belastungs- und somatoforme Störungen |
| F50–F59 | Verhaltensauffälligkeiten mit körperlichen Störungen |
| F60–F69 | Persönlichkeits- und Verhaltensstörungen |
| F70–F79 | Intelligenzminderung |
| F80–F89 | Entwicklungsstörungen |
| F90–F98 | Verhaltens- und emotionale Störungen (Kindheit/Jugend) |
| F99      | Nicht näher bezeichnete psychische Störung |

**Wichtige Subkategorien (Bsp.):**
- F20.0: Paranoide Schizophrenie
- F31.x: Bipolare affektive Störung
- F32.x / F33.x: Depressive Episode / Rezidivierende Depression
- F41.1: Generalisierte Angststörung
- F43.1: PTBS`,
    contentEn: `**Chapter V (F00–F99): Mental and behavioural disorders**

| Range  | Category |
|--------|----------|
| F00–F09 | Organic mental disorders (incl. dementia) |
| F10–F19 | Mental and behavioural disorders due to psychoactive substance use |
| F20–F29 | Schizophrenia, schizotypal and delusional disorders |
| F30–F39 | Mood (affective) disorders |
| F40–F48 | Neurotic, stress-related and somatoform disorders |
| F50–F59 | Behavioural syndromes associated with physiological disturbances |
| F60–F69 | Disorders of adult personality and behaviour |
| F70–F79 | Intellectual disability |
| F80–F89 | Disorders of psychological development |
| F90–F98 | Behavioural and emotional disorders with onset in childhood/adolescence |
| F99      | Unspecified mental disorder |

**Key subcategories (examples):**
- F20.0: Paranoid schizophrenia
- F31.x: Bipolar affective disorder
- F32.x / F33.x: Depressive episode / Recurrent depressive disorder
- F41.1: Generalised anxiety disorder
- F43.1: PTSD`,
    tags: ['ICD-10', 'Klassifikation', 'Diagnose', 'Überblick'],
    tagsEn: ['ICD-10', 'Classification', 'Diagnosis', 'Overview'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-006',
    title: 'Suizidalität — Strukturierte Risikoeinschätzung',
    titleEn: 'Suicidality — structured risk assessment',
    category: 'Klinik',
    categoryEn: 'Clinical',
    content: `**Exploration (direkte Ansprache empfohlen):**
1. Passive Todeswünsche: "Wünschen Sie sich manchmal, nicht mehr aufzuwachen?"
2. Suizidgedanken: "Haben Sie Gedanken daran, sich das Leben zu nehmen?"
3. Intention: "Haben Sie die Absicht, dies umzusetzen?"
4. Plan: "Haben Sie sich überlegt, wie Sie das tun würden?"
5. Vorbereitungshandlungen / Mittel verfügbar?

**Risikoerhöhende Faktoren:**
- Frühere Suizidversuche (stärkster Prädiktor)
- Aktuelle schwere Depression, Hoffnungslosigkeit (BHS)
- Komorbider Substanzmissbrauch
- Männliches Geschlecht, Alter > 65
- Soziale Isolation, chronische Schmerzen
- Zugang zu Mitteln (Waffen, Medikamente)

**Schutzfaktoren:**
Soziale Einbindung, religiöse Überzeugungen, Kinder im Haushalt, Zukunftspläne, Behandlungsmotivation.

**Sicherheitsplanung (nach Stanley & Brown):**
1. Frühwarnzeichen identifizieren
2. Ablenkungsstrategien intern
3. Soziale Kontakte (ohne Suizid-Thema)
4. Krisentelefon / Notaufnahme
5. Mittelreduktion in der häuslichen Umgebung`,
    contentEn: `**Exploration (ask directly):**
1. Passive death wishes: "Do you sometimes wish you would not wake up?"
2. Suicidal ideation: "Do you have thoughts of taking your own life?"
3. Intent: "Do you intend to act on these thoughts?"
4. Plan: "Have you thought about how you would do it?"
5. Preparatory acts / access to means?

**Risk-increasing factors:**
- Previous suicide attempts (strongest predictor)
- Current severe depression, hopelessness (Beck Hopelessness Scale)
- Comorbid substance misuse
- Male sex, age > 65
- Social isolation, chronic pain
- Access to means (firearms, medication)

**Protective factors:**
Social connectedness, religious beliefs, children in the household, future plans, treatment engagement.

**Safety planning (Stanley & Brown):**
1. Identify warning signs
2. Internal coping / distraction strategies
3. Social contacts (without discussing suicide)
4. Crisis hotline / emergency department
5. Means restriction at home`,
    tags: ['Suizidalität', 'Risikoeinschätzung', 'Sicherheitsplan', 'Krisenintervention'],
    tagsEn: ['Suicidality', 'Risk assessment', 'Safety plan', 'Crisis intervention'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-007',
    title: 'PANSS — Kurzanleitung',
    titleEn: 'PANSS — quick guide',
    category: 'Diagnostik',
    categoryEn: 'Assessment',
    content: `Die Positive and Negative Syndrome Scale (PANSS) erfasst die Psychopathologie bei Schizophrenie mit 30 Items.

**Skalen:**
- P (Positive Skala): 7 Items (Wahnideen, konzeptionelle Desorganisation, Halluzinationen, Erregung, Grandiosität, Verfolgungsideen, Feindseligkeit)
- N (Negative Skala): 7 Items (Affektverflachung, emotionale Rückzug, schlechter Rapport, passiv-apatischer sozialer Rückzug, abstrakte Denkstörung, Spontaneität, stereotype Denkweise)
- G (Allgemeine Psychopathologie): 16 Items

**Bewertung:** 1 (fehlend) bis 7 (extrem) pro Item.
- Gesamtscore: 30–210
- Mild: 58–75 | Moderat: 75–95 | Schwer: > 95

**Klinisch bedeutsame Verbesserung:** Reduktion ≥ 20 % des PANSS-Gesamtscores.

**Dauer:** ~45 min (erfordert klinisches Interview und Beobachtung).`,
    contentEn: `The Positive and Negative Syndrome Scale (PANSS) measures psychopathology in schizophrenia using 30 items.

**Subscales:**
- P (Positive scale): 7 items (delusions, conceptual disorganisation, hallucinations, excitement, grandiosity, suspiciousness/persecution, hostility)
- N (Negative scale): 7 items (blunted affect, emotional withdrawal, poor rapport, passive/apathetic social withdrawal, difficulty in abstract thinking, lack of spontaneity, stereotyped thinking)
- G (General psychopathology): 16 items

**Rating:** 1 (absent) to 7 (extreme) per item.
- Total score: 30–210
- Mild: 58–75 | Moderate: 75–95 | Severe: > 95

**Clinically meaningful improvement:** ≥ 20 % reduction in PANSS total score.

**Duration:** ~45 min (requires clinical interview and observation).`,
    tags: ['PANSS', 'Schizophrenie', 'Psychose', 'Rating-Skala', 'Positiv', 'Negativ'],
    tagsEn: ['PANSS', 'Schizophrenia', 'Psychosis', 'Rating scale', 'Positive', 'Negative'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-008',
    title: 'Wichtigste Interaktionen in der Psychiatrie',
    titleEn: 'Key drug interactions in psychiatry',
    category: 'Pharmakologie',
    categoryEn: 'Pharmacology',
    content: `**CYP450-vermittelte Interaktionen:**

| Hemmer (↑ Spiegel) | Induktoren (↓ Spiegel) |
|---------------------|------------------------|
| Fluvoxamin (CYP1A2, 2C19, 3A4) | Carbamazepin |
| Fluoxetin / Paroxetin (CYP2D6) | Rifampicin |
| Valproat (CYP2C9) | Johanniskraut |
| Ketoconazol | Rauchen (CYP1A2) |

**Klinisch relevante Kombinationen:**
- **Lithium + NSAIDs/Thiazide/ACE-Hemmer** → Li-Spiegel ↑ (Toxizität)
- **SSRI + Tramadol/Triptane/Linezolid** → Serotoninsyndrom
- **Clozapin + Benzodiazepine i.v.** → Kreislaufkollaps, Atemdepression
- **Haloperidol + QT-verlängernde Mittel** → Torsades de pointes
- **Valproat + Lamotrigin** → Lamotrigin-Spiegel verdoppelt (Dosis halbieren)
- **MAO-Hemmer + Tyramin-reiche Nahrung** → hypertensive Krise
- **Carbamazepin + OCP** → kontrazeptive Wirkung ↓

**QT-Verlängerung (Monitoring EKG):**
Haloperidol, Ziprasidon, Sertindol, Citalopram (> 40 mg), Clomipramin.`,
    contentEn: `**CYP450-mediated interactions:**

| Inhibitors (↑ levels) | Inducers (↓ levels) |
|------------------------|----------------------|
| Fluvoxamine (CYP1A2, 2C19, 3A4) | Carbamazepine |
| Fluoxetine / paroxetine (CYP2D6) | Rifampicin |
| Valproate (CYP2C9) | St John's wort |
| Ketoconazole | Smoking (CYP1A2) |

**Clinically relevant combinations:**
- **Lithium + NSAIDs / thiazides / ACE inhibitors** → ↑ lithium level (toxicity)
- **SSRI + tramadol / triptans / linezolid** → serotonin syndrome
- **Clozapine + IV benzodiazepines** → circulatory collapse, respiratory depression
- **Haloperidol + QT-prolonging agents** → torsades de pointes
- **Valproate + lamotrigine** → lamotrigine level doubles (halve the dose)
- **MAO inhibitors + tyramine-rich food** → hypertensive crisis
- **Carbamazepine + combined oral contraceptive** → reduced contraceptive efficacy

**QT prolongation (ECG monitoring):**
Haloperidol, ziprasidone, sertindole, citalopram (> 40 mg), clomipramine.`,
    tags: ['Interaktionen', 'CYP450', 'QT', 'Serotoninsyndrom', 'Pharmakologie'],
    tagsEn: ['Interactions', 'CYP450', 'QT', 'Serotonin syndrome', 'Pharmacology'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-009',
    title: 'S3-Leitlinie Schizophrenie — Kernaussagen',
    titleEn: 'Schizophrenia clinical guideline — key recommendations',
    category: 'Leitlinien',
    categoryEn: 'Guidelines',
    content: `**DGPPN S3-Leitlinie Schizophrenie (2019, Update 2024)**

**Akutbehandlung:**
- Antipsychotikum der 2. Generation bevorzugen (außer bei spezifischen Indikationen)
- Monotherapie anstreben; Dosisäquivalente nach Gardos/Davis verwenden
- Hochdosierung nicht wirksamer als Standarddosen (keine Evidenz > 1000 mg CPZ-Äq./d)
- Benzodiazepine kurzfristig bei Agitation (keine Dauermedikation)

**Langzeittherapie:**
- Nach Erstepisode: Antipsychotikum mind. 1–2 Jahre nach Remission
- Nach Mehrfachepisoden: mind. 5 Jahre, bei häufigen Rückfällen langfristig
- Depot-Präparate bei Adhärenzproblemen (Evidenzgrad A)
- Clozapin bei therapieresistenter Schizophrenie (≥ 2 Versuche gescheitert)

**Psychosoziale Interventionen (Evidenz A/B):**
- Kognitive Verhaltenstherapie (KVT) für Psychosen
- Familieninterventionen
- Training sozialer Kompetenzen
- Supported Employment (IPS-Modell)`,
    contentEn: `**DGPPN S3 guideline on schizophrenia (2019, 2024 update)**

**Acute treatment:**
- Prefer a second-generation antipsychotic (unless a specific indication suggests otherwise)
- Aim for monotherapy; use Gardos / Davis dose equivalents
- High doses are not more effective than standard doses (no evidence above 1000 mg CPZ-equivalent/day)
- Benzodiazepines short-term for agitation only (no maintenance use)

**Maintenance therapy:**
- After a first episode: continue the antipsychotic for at least 1–2 years after remission
- After multiple episodes: at least 5 years; long-term when relapses are frequent
- Long-acting injectables when adherence is a concern (evidence grade A)
- Clozapine for treatment-resistant schizophrenia (≥ 2 failed adequate trials)

**Psychosocial interventions (evidence A/B):**
- Cognitive behavioural therapy (CBT) for psychosis
- Family interventions
- Social skills training
- Supported employment (IPS model)`,
    tags: ['Leitlinie', 'Schizophrenie', 'DGPPN', 'S3', 'Antipsychotika'],
    tagsEn: ['Guideline', 'Schizophrenia', 'DGPPN', 'S3', 'Antipsychotics'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-010',
    title: 'Psychopathologischer Befund — Kerndimensionen',
    titleEn: 'Mental status examination — core dimensions',
    category: 'Psychopathologie',
    categoryEn: 'Psychopathology',
    content: `**AMDP-orientierter psychopathologischer Befund:**

**Bewusstsein:** Vigilanz, Orientierung (Zeit, Ort, Person, Situation)

**Aufmerksamkeit / Konzentration:** Ablenkbarkeit, Ausdauer

**Gedächtnis:** Kurz- und Langzeitgedächtnis, Konfabulation

**Formale Denkstörungen:**
- Verlangsamung, Hemmung, Gedankenabreißen
- Umständlichkeit, Weitschweifigkeit, Vorbeireden
- Inkohärenz, Zerfahrenheit, Neologismen

**Inhaltliche Denkstörungen:**
- Wahn (Verfolgung, Beziehung, Grandiosität, Nihilismus)
- Überwertige Ideen, Zwangsgedanken

**Wahrnehmung:** Illusionen, Halluzinationen (akustisch, visuell, taktil, zönästhetisch)

**Ich-Störungen:** Derealisation, Depersonalisation, Gedankeneingebung, -entzug, -ausbreitung, Fremdbeeinflussungserleben

**Affekt:** Grundstimmung, Schwingungsfähigkeit, Inadäquanz, Ambivalenz, Angst

**Antrieb / Psychomotorik:** Antriebsminderung, Agitation, Stupor, Manierismen, Stereotypien

**Suizidalität / Fremdgefährdung:** Immer explizit explorieren`,
    contentEn: `**AMDP-oriented mental status examination:**

**Consciousness:** Vigilance, orientation (time, place, person, situation)

**Attention / concentration:** Distractibility, persistence

**Memory:** Short- and long-term memory, confabulation

**Formal thought disorders:**
- Slowed thinking, thought blocking, thought derailment
- Circumstantiality, tangentiality, talking past the point
- Incoherence, looseness of association, neologisms

**Content thought disorders:**
- Delusions (persecutory, referential, grandiose, nihilistic)
- Overvalued ideas, obsessions

**Perception:** Illusions, hallucinations (auditory, visual, tactile, cenesthetic)

**Ego disturbances:** Derealisation, depersonalisation, thought insertion / withdrawal / broadcasting, experiences of external control

**Affect:** Baseline mood, mood reactivity, inappropriate affect, ambivalence, anxiety

**Drive / psychomotor activity:** Reduced drive, agitation, stupor, mannerisms, stereotypies

**Suicidality / risk to others:** Always explicitly explored`,
    tags: ['AMDP', 'Psychopathologie', 'Befund', 'Denkstörungen', 'Halluzinationen'],
    tagsEn: ['AMDP', 'Psychopathology', 'Mental status', 'Thought disorders', 'Hallucinations'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]
