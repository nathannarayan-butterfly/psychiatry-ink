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
  category: KbCategory
  content: string
  tags: string[]
  createdAt: string
}

export const KNOWLEDGE_BASE_SEED: KnowledgeEntry[] = [
  {
    id: 'seed-001',
    title: 'NMS — Malignes Neuroleptisches Syndrom',
    category: 'Pharmakologie',
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
    tags: ['NMS', 'Notfall', 'Antipsychotika', 'Rigidität', 'CK', 'Dantrolen'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-002',
    title: 'Lithium-Monitoring — Zielwerte und Frequenz',
    category: 'Pharmakologie',
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
    tags: ['Lithium', 'Stimmungsstabilisator', 'Monitoring', 'Toxizität', 'Spiegel'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-003',
    title: 'Clozapin-Monitoring',
    category: 'Pharmakologie',
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
    tags: ['Clozapin', 'Agranulozytose', 'Blutbild', 'Therapieresistenz', 'Monitoring'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-004',
    title: 'PHQ-9 — Auswertung und Interpretation',
    category: 'Diagnostik',
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
    tags: ['PHQ-9', 'Depression', 'Screening', 'Selbstbeurteilung', 'Scoring'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-005',
    title: 'ICD-10 F-Klassifikation — Überblick',
    category: 'Diagnostik',
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
    tags: ['ICD-10', 'Klassifikation', 'Diagnose', 'Überblick'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-006',
    title: 'Suizidalität — Strukturierte Risikoeinschätzung',
    category: 'Klinik',
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
    tags: ['Suizidalität', 'Risikoeinschätzung', 'Sicherheitsplan', 'Krisenintervention'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-007',
    title: 'PANSS — Kurzanleitung',
    category: 'Diagnostik',
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
    tags: ['PANSS', 'Schizophrenie', 'Psychose', 'Rating-Skala', 'Positiv', 'Negativ'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-008',
    title: 'Wichtigste Interaktionen in der Psychiatrie',
    category: 'Pharmakologie',
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
    tags: ['Interaktionen', 'CYP450', 'QT', 'Serotoninsyndrom', 'Pharmakologie'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-009',
    title: 'S3-Leitlinie Schizophrenie — Kernaussagen',
    category: 'Leitlinien',
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
    tags: ['Leitlinie', 'Schizophrenie', 'DGPPN', 'S3', 'Antipsychotika'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'seed-010',
    title: 'Psychopathologischer Befund — Kerndimensionen',
    category: 'Psychopathologie',
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
    tags: ['AMDP', 'Psychopathologie', 'Befund', 'Denkstörungen', 'Halluzinationen'],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]
