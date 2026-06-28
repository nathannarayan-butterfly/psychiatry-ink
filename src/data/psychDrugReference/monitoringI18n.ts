/**
 * English translations for the German-authored psychopharmacology monitoring
 * reference data (`monitoringRules[].parameter` / `.frequency` / `.warningThreshold`).
 *
 * ROOT CAUSE this module addresses
 * --------------------------------
 * The drug reference DB (`drugs/*.json`) is authored German-first. Many fields
 * carry both a `*De` and `*En` variant (kurzinfo, side effects, notes), but the
 * monitoring-rule `parameter`, `frequency` and `warningThreshold` fields are
 * single, German-only strings. The medication "Brief Info" / intelligence card
 * rendered those raw strings regardless of UI language, so German leaked into the
 * English UI.
 *
 * Rather than duplicate every field across 5 large JSON files (and re-translate on
 * every edit), localisation happens at the render layer through these maps, keyed
 * by the EXACT German source string. `localizeMonitoringRule` resolves the right
 * label for the active language.
 *
 * GUARDRAIL: `monitoringI18n.test` iterates EVERY monitoring rule of EVERY drug in
 * the reference DB and asserts the English-localised output is German-free. If a
 * future drug introduces a new German `parameter`/`frequency`/`warningThreshold`
 * value that is missing from these maps, the English lookup falls back to the
 * German source and the guardrail FAILS — forcing the translation to be added.
 * This is what makes the fix permanent instead of one-off.
 */

const PARAMETER_EN: Record<string, string> = {
  'Abhängigkeit / Ausschleichplan': 'Dependence / taper plan',
  'Abhängigkeitspotenzial / Therapiedauer': 'Dependence potential / treatment duration',
  'Abhängigkeitsrisiko / Missbrauchsanamnese': 'Dependence risk / abuse history',
  'Abhängigkeitsrisiko und interdosale Symptome': 'Dependence risk and interdose symptoms',
  'Absetzplanung': 'Discontinuation planning',
  'Abstinenz / Alkoholkonsum': 'Abstinence / alcohol use',
  'Akathisie (BARS)': 'Akathisia (BARS)',
  'Akathisie-Beurteilung (BARS)': 'Akathisia assessment (BARS)',
  'Ammoniak (NH₃)': 'Ammonia (NH₃)',
  'Anfallsanamnese': 'Seizure history',
  'Anfallsanamnese / Krampfrisikoabschätzung': 'Seizure history / seizure risk assessment',
  'Anticholinerge Gesamtlast': 'Total anticholinergic burden',
  'Anticholinerge Gesamtlast (Anticholinergic Burden Score)':
    'Total anticholinergic burden (Anticholinergic Burden Score)',
  'Anticholinerge Verträglichkeit bei Älteren': 'Anticholinergic tolerability in the elderly',
  'Antikonvulsive Wirksamkeit / Toleranzentwicklung':
    'Anticonvulsant efficacy / tolerance development',
  'Anwendungsdauer': 'Duration of use',
  'Anwendungsdauer / Toleranz': 'Duration of use / tolerance',
  'Atemdepression / Sedierungsgrad': 'Respiratory depression / sedation level',
  'Atemdepression bei Notfalleinsatz': 'Respiratory depression in emergency use',
  'Atemfrequenz, Bewusstsein (bei i.v.-Gabe)':
    'Respiratory rate, consciousness (with IV administration)',
  'Atemfunktion': 'Respiratory function',
  'Atemfunktion (bei parenteraler Anwendung)': 'Respiratory function (with parenteral use)',
  'Atemwege': 'Airways',
  'Augenuntersuchung (Spaltlampe)': 'Eye examination (slit lamp)',
  'Ausschleichen': 'Tapering',
  'BTM-Rezeptpflicht / Verschreibungsregulierung (Deutschland)':
    'Controlled-substance prescription requirement / prescribing regulation (Germany)',
  'BTM-Verschreibungspflicht (Deutschland)':
    'Controlled-substance prescription requirement (Germany)',
  'Bewusstsein / neurologischer Status nach Injektion':
    'Consciousness / neurological status after injection',
  'Bikarbonat / Blutgasanalyse': 'Bicarbonate / blood gas analysis',
  'Blutbild (BB)': 'Complete blood count (CBC)',
  'Blutbild (CBC)': 'Complete blood count (CBC)',
  'Blutbild (CBC) inkl. Differenzialblutbild': 'Complete blood count (CBC) incl. differential',
  'Blutbild (Differentialblutbild)': 'Complete blood count (differential)',
  'Blutbild (Leukozyten, ANC = absolute Neutrophilenzahl)':
    'Complete blood count (leukocytes, ANC = absolute neutrophil count)',
  'Blutbild mit Differenzialblutbild (CBC)': 'Complete blood count with differential (CBC)',
  'Blutdruck': 'Blood pressure',
  'Blutdruck & Herzfrequenz': 'Blood pressure & heart rate',
  'Blutdruck (Orthostase-Test)': 'Blood pressure (orthostatic test)',
  'Blutdruck (liegend / stehend)': 'Blood pressure (supine / standing)',
  'Blutdruck (orthostatisch)': 'Blood pressure (orthostatic)',
  'Blutdruck / Herzfrequenz': 'Blood pressure / heart rate',
  'Blutdruck und Herzfrequenz': 'Blood pressure and heart rate',
  'Blutgasanalyse / Bikarbonat': 'Blood gas analysis / bicarbonate',
  'Blutungsanzeichen / INR': 'Signs of bleeding / INR',
  'CIWA-Ar-Score (Alkoholentzug)': 'CIWA-Ar score (alcohol withdrawal)',
  'COWS-Score vor Erstgabe': 'COWS score before first dose',
  'CYP2D6-Phänotyp': 'CYP2D6 phenotype',
  'Calciumspiegel': 'Calcium level',
  'Carbamazepin-Serumspiegel': 'Carbamazepine serum level',
  'Clozapin-Plasmaspiegel': 'Clozapine plasma level',
  'Clozapin-Spiegel': 'Clozapine level',
  'Dissoziationsgrad (CADSS-Skala)': 'Degree of dissociation (CADSS scale)',
  'Dosisanpassung bei Frauen und Älteren': 'Dose adjustment in women and the elderly',
  'EKG': 'ECG',
  'EKG (PR-Intervall)': 'ECG (PR interval)',
  'EKG (QTc und QRS-Breite)': 'ECG (QTc and QRS width)',
  'EKG (QTc)': 'ECG (QTc)',
  'EKG (QTc) – Pflichtprogramm': 'ECG (QTc) – mandatory',
  'EKG (QTc), Blutdruck': 'ECG (QTc), blood pressure',
  'EKG (QTc-Intervall)': 'ECG (QTc interval)',
  'EKG / QTc': 'ECG / QTc',
  'EKG / QTc-Intervall': 'ECG / QTc interval',
  'EKG / QTc-Zeit': 'ECG / QTc interval',
  'EPS (AIMS, SAS, BARS)': 'EPS (AIMS, SAS, BARS)',
  'EPS, Prolaktin, metabolisches Screening': 'EPS, prolactin, metabolic screening',
  'EPS-Beurteilung': 'EPS assessment',
  'EPS-Beurteilung (AIMS, BARS, SAS)': 'EPS assessment (AIMS, BARS, SAS)',
  'EPS-Skalen': 'EPS scales',
  'EPS-Skalen (AIMS, BARS, SAS)': 'EPS scales (AIMS, BARS, SAS)',
  'EPS-Skalen (AIMS, SAS, BARS)': 'EPS scales (AIMS, SAS, BARS)',
  'EPS-Symptome': 'EPS symptoms',
  'Einnahmetechnik (sublingual – Patientenaufklärung)':
    'Administration technique (sublingual – patient education)',
  'Einnahmezeit (chronobiotische Wirkung)': 'Time of administration (chronobiotic effect)',
  'Einsatzindikation': 'Indication for use',
  'Elektrolyte (K+, Mg2+)': 'Electrolytes (K+, Mg2+)',
  'Elektrolyte (Kalium, Magnesium)': 'Electrolytes (potassium, magnesium)',
  'Entzugszeichen / COWS-Score vor Erstgabe': 'Withdrawal signs / COWS score before first dose',
  'GI-Anamnese': 'GI history',
  'Gerinnungsparameter (Quick, PTT, Fibrinogen)':
    'Coagulation parameters (PT/Quick, PTT, fibrinogen)',
  'Gewicht': 'Weight',
  'Gewicht / BMI': 'Weight / BMI',
  'Gewicht / BMI / Taillenumfang': 'Weight / BMI / waist circumference',
  'Gewicht / BMI, Taillenumfang': 'Weight / BMI, waist circumference',
  'Gewicht / metabolisches Screening': 'Weight / metabolic screening',
  'Gewicht / Ödeme': 'Weight / edema',
  'HLA-B*1502-Genotypisierung': 'HLA-B*1502 genotyping',
  'Herzfrequenz': 'Heart rate',
  'Herzfrequenz & Blutdruck': 'Heart rate & blood pressure',
  'Herzfrequenz & Kognition': 'Heart rate & cognition',
  'Herzfrequenz / EKG': 'Heart rate / ECG',
  'Hormonstatus bei Langzeitanwendung': 'Hormone status with long-term use',
  'Impulskontrolle / Verhalten': 'Impulse control / behavior',
  'Impulskontrolle / Verhaltensmonitoring': 'Impulse control / behavioral monitoring',
  'Indikationsstellung und Therapiedauer': 'Indication and treatment duration',
  'Injektion — Verabreichungsweg': 'Injection — route of administration',
  'Injektionsstelle': 'Injection site',
  'Klinische Hautinspektion / Rash-Screening': 'Clinical skin inspection / rash screening',
  'Klinische Überprüfung der Indikation': 'Clinical review of the indication',
  'Kognition': 'Cognition',
  'Kognition (ältere Patienten)': 'Cognition (elderly patients)',
  'Kognition / Amnesie-Aufklärung': 'Cognition / amnesia counseling',
  'Kognitive Funktion': 'Cognitive function',
  'Kognitive Funktion / MMSE / MoCA': 'Cognitive function / MMSE / MoCA',
  'Kontraindikationen bei Älteren': 'Contraindications in the elderly',
  'Krampfanfall-Anamnese': 'Seizure history',
  'Krampfanfall-Risiko': 'Seizure risk',
  'Körpergewicht': 'Body weight',
  'Körpergewicht / BMI': 'Body weight / BMI',
  'Körpergrösse & Gewicht': 'Height & weight',
  'Körpergrösse & Gewicht (Kinder/Jugendliche)': 'Height & weight (children/adolescents)',
  'Ladeinjektionsstrategie (Initiierung)': 'Loading-injection strategy (initiation)',
  'Lamotrigin-Serumspiegel': 'Lamotrigine serum level',
  'Leberenzyme (AST, ALT, GGT, AP, Bilirubin)': 'Liver enzymes (AST, ALT, GGT, ALP, bilirubin)',
  'Leberenzyme (AST, ALT, GGT, Bilirubin)': 'Liver enzymes (AST, ALT, GGT, bilirubin)',
  'Leberenzyme (GOT, GPT, GGT, AP)': 'Liver enzymes (AST/GOT, ALT/GPT, GGT, ALP)',
  'Leberwerte': 'Liver function tests',
  'Leberwerte (ALT, AST)': 'Liver function tests (ALT, AST)',
  'Leberwerte (ALT, AST, Bilirubin)': 'Liver function tests (ALT, AST, bilirubin)',
  'Leberwerte (ALT, AST, GGT)': 'Liver function tests (ALT, AST, GGT)',
  'Lipidstatus': 'Lipid panel',
  'Lipidstatus (Nüchterntriglyzeride, LDL, HDL)': 'Lipid panel (fasting triglycerides, LDL, HDL)',
  'Lithium-Serumspiegel': 'Lithium serum level',
  'Lithiumserumspiegel': 'Lithium serum level',
  'MHD-Serumspiegel (aktiver Metabolit, Licarbazepine)':
    'MHD serum level (active metabolite, licarbazepine)',
  'Medikamentenspiegel bei TCA-Komedikation': 'Drug levels with TCA co-medication',
  'Metabolisches Basisscreening (Gewicht, Blutdruck, Nüchternglukose, Lipide)':
    'Baseline metabolic screening (weight, blood pressure, fasting glucose, lipids)',
  'Metabolisches Screening': 'Metabolic screening',
  'Metabolisches Screening (Gewicht, Glukose, Lipide)':
    'Metabolic screening (weight, glucose, lipids)',
  'Metabolisches Screening + EPS + Prolaktin': 'Metabolic screening + EPS + prolactin',
  'Missbrauch / Diversion': 'Abuse / diversion',
  'Missbrauchspotenzial / Suchtanamnese': 'Abuse potential / addiction history',
  'Missbrauchsrisiko / Suchtanamnese': 'Abuse risk / addiction history',
  'Motivationsassessment': 'Motivation assessment',
  'Nahrungseinnahme (Compliance-Aufklärung)': 'Food intake (adherence counseling)',
  'Narkolepsie-ähnliche Symptome': 'Narcolepsy-like symptoms',
  'Nierenfunktion': 'Renal function',
  'Nierenfunktion (Kreatinin, GFR)': 'Renal function (creatinine, GFR)',
  'Nierenfunktion (eGFR / Kreatinin)': 'Renal function (eGFR / creatinine)',
  'Nierenfunktion (eGFR)': 'Renal function (eGFR)',
  'Nierenfunktion (eGFR, Kreatinin)': 'Renal function (eGFR, creatinine)',
  'Nierenfunktion / Serumkreatinin': 'Renal function / serum creatinine',
  'Nüchternglukose / HbA1c': 'Fasting glucose / HbA1c',
  'OCD-Symptome (Y-BOCS)': 'OCD symptoms (Y-BOCS)',
  'Opioidfreiheit vor Therapiebeginn': 'Opioid-free status before treatment start',
  'Orale Überbrückungstherapie (erste 3 Wochen)': 'Oral bridging therapy (first 3 weeks)',
  'Orales Überbrücken (erste 2 Wochen)': 'Oral bridging (first 2 weeks)',
  'PANSS Negativsymptomatik': 'PANSS negative symptoms',
  'Parasomnien / komplexe Schlafverhaltensweisen': 'Parasomnias / complex sleep behaviors',
  'Pflasterapplikation': 'Patch application',
  'Post-Injektions-Überwachung (PDSS-Prävention) – PFLICHT':
    'Post-injection monitoring (PDSS prevention) – MANDATORY',
  'Prolaktin': 'Prolactin',
  'Psychiatrische Beurteilung': 'Psychiatric assessment',
  'Psychiatrische Beurteilung (Suizidalität, Psychose)':
    'Psychiatric assessment (suicidality, psychosis)',
  'Psychiatrische Nebenwirkungen': 'Psychiatric adverse effects',
  'Psychiatrische Symptome': 'Psychiatric symptoms',
  'Psychiatrische Symptome / Suizidalität': 'Psychiatric symptoms / suicidality',
  'Psychiatrische Symptome / Verhalten': 'Psychiatric symptoms / behavior',
  'QTc': 'QTc',
  'QTc (EKG)': 'QTc (ECG)',
  'QTc-Zeit (EKG)': 'QTc interval (ECG)',
  'Rauchstopp-Datum und Craving': 'Quit date and craving',
  'Residualsedierung / Sturzrisiko': 'Residual sedation / fall risk',
  'Schilddrüsenfunktion (TSH)': 'Thyroid function (TSH)',
  'Schlafqualität und Abhängigkeit': 'Sleep quality and dependence',
  'Sedierungsgrad / Atemfrequenz (bei Acuphase)':
    'Sedation level / respiratory rate (with Acuphase)',
  'Sedierungsgrad / Sturz- und Fahrtauglichkeit': 'Sedation level / fall and driving fitness',
  'Sedierungslevel': 'Sedation level',
  'Serum-Natrium': 'Serum sodium',
  'Serumkalzium': 'Serum calcium',
  'Serumnatrium': 'Serum sodium',
  'Stimmung / Suizidalität (bei MDD-Augmentation)': 'Mood / suicidality (with MDD augmentation)',
  'Stuhlgang / Obstipations-Assessment': 'Bowel movements / constipation assessment',
  'Suizidalität (Antikonvulsiva-Klassenwarnung)': 'Suicidality (anticonvulsant class warning)',
  'Suizidalität (Kinder/Jugendliche)': 'Suicidality (children/adolescents)',
  'TDM (Clomipramin + Desmethylclomipramin)': 'TDM (clomipramine + desmethylclomipramine)',
  'TDM (Nortriptylin-Spiegel)': 'TDM (nortriptyline level)',
  'TSH': 'TSH',
  'TSH, Kreatinin, eGFR, Elektrolyte, Kalzium': 'TSH, creatinine, eGFR, electrolytes, calcium',
  'Therapeutisches Drug Monitoring (TDM)': 'Therapeutic drug monitoring (TDM)',
  'Therapiedauer': 'Treatment duration',
  'Therapiedauer / Abhängigkeit': 'Treatment duration / dependence',
  'Therapiedauer / Ausschleichplan': 'Treatment duration / taper plan',
  'Transaminasen': 'Transaminases',
  'Transaminasen (GOT, GPT)': 'Transaminases (AST/GOT, ALT/GPT)',
  'Trinkmengen-Protokoll': 'Fluid intake log',
  'Troponin I/T + CRP + EKG': 'Troponin I/T + CRP + ECG',
  'Urindrogenscreening': 'Urine drug screening',
  'Valproat-Serumspiegel': 'Valproate serum level',
  'Verfügbarkeit / Zulassungsstatus DACH': 'Availability / approval status (DACH)',
  'Vorherige BZD-Therapie': 'Prior benzodiazepine therapy',
  'Wirklatenz / Erwartungsmanagement': 'Onset latency / expectation management',
  'Zeichen von Abhängigkeit / Missbrauch': 'Signs of dependence / abuse',
  'Zulassung / OTC-Status': 'Approval / OTC status',
  'Zulassungsstatus DACH': 'Approval status (DACH)',
  'eGFR / Kreatinin': 'eGFR / creatinine',
  'Überprüfung BtMVV-Compliance': 'Review of controlled-substance (BtMVV) compliance',
}

const FREQUENCY_EN: Record<string, string> = {
  '40 min nach jeder Dosis': '40 min after each dose',
  'Alle 1–3 Monate': 'Every 1–3 months',
  'Alle 1–4 Stunden während Alkoholentzug': 'Every 1–4 hours during alcohol withdrawal',
  'Alle 2–4 Wochen': 'Every 2–4 weeks',
  'Alle 3 Monate': 'Every 3 months',
  'Alle 3 Monate bei Dauertherapie': 'Every 3 months during long-term therapy',
  'Alle 3–6 Monate': 'Every 3–6 months',
  'Alle 3–6 Monate (stabil); nach jeder Dosisänderung nach 5–7 Tagen; nach Beginn von Interaktionsmedikamenten':
    'Every 3–6 months (stable); 5–7 days after each dose change; after starting interacting medications',
  'Alle 4 Wochen': 'Every 4 weeks',
  'Alle 4–8 Wochen': 'Every 4–8 weeks',
  'Alle 4–8 Wochen bei akuter Nutzung; monatlich bei Langzeitanwendung':
    'Every 4–8 weeks with acute use; monthly with long-term use',
  'Alle 6 Monate': 'Every 6 months',
  'Alle 6 Monate (Kinder)': 'Every 6 months (children)',
  'Alle 6 Monate bei Langzeittherapie': 'Every 6 months during long-term therapy',
  'Baseline und bei Bedarf': 'Baseline and as needed',
  'Baseline und bei Risikofaktoren': 'Baseline and when risk factors are present',
  'Baseline und bei klinischem Bedarf': 'Baseline and when clinically indicated',
  'Baseline und regelmäßig': 'Baseline and regularly',
  'Baseline, 3 Monate, dann alle 6 Monate': 'Baseline, 3 months, then every 6 months',
  'Baseline, 3 Monate, dann alle 6–12 Monate': 'Baseline, 3 months, then every 6–12 months',
  'Baseline, 3 Monate, dann jährlich': 'Baseline, 3 months, then annually',
  'Baseline, 3 Monate, jährlich': 'Baseline, 3 months, annually',
  'Baseline, 4 Wochen, 3 Monate, jährlich': 'Baseline, 4 weeks, 3 months, annually',
  'Baseline, 4 Wochen, 8 Wochen, 12 Wochen, dann alle 3 Monate':
    'Baseline, 4 weeks, 8 weeks, 12 weeks, then every 3 months',
  'Baseline, 4 Wochen, 8 Wochen, 12 Wochen, dann alle 3–6 Monate':
    'Baseline, 4 weeks, 8 weeks, 12 weeks, then every 3–6 months',
  'Baseline, 4 Wochen, 8 Wochen, 3 Monate, dann alle 3–6 Monate':
    'Baseline, 4 weeks, 8 weeks, 3 months, then every 3–6 months',
  'Baseline, bei Bedarf': 'Baseline, as needed',
  'Baseline, bei Dosiserhöhung': 'Baseline, on dose increase',
  'Baseline, bei Dosissteigerung': 'Baseline, on dose escalation',
  'Baseline, bei Dosisänderungen': 'Baseline, on dose changes',
  'Baseline, halbjährlich': 'Baseline, every 6 months',
  'Baseline, jährlich': 'Baseline, annually',
  'Baseline, jährlich, bei klinischer Änderung': 'Baseline, annually, on clinical change',
  'Baseline, nach 3 Monaten': 'Baseline, after 3 months',
  'Baseline, nach 3 Monaten, dann alle 6 Monate': 'Baseline, after 3 months, then every 6 months',
  'Baseline, nach 3 Monaten, dann jährlich': 'Baseline, after 3 months, then annually',
  'Baseline; bei hohen Dosen oder Risikofaktoren regelmäßig':
    'Baseline; regularly at high doses or with risk factors',
  'Baseline; bei klinischen Symptomen': 'Baseline; when clinical symptoms occur',
  'Baseline; wöchentlich in den ersten 4 Wochen; bei klinischem Verdacht':
    'Baseline; weekly for the first 4 weeks; on clinical suspicion',
  'Basismessung vor Therapie; bei Fieber, Halsschmerzen oder Infektzeichen sofort':
    'Baseline before therapy; immediately with fever, sore throat or signs of infection',
  'Bei Auftreten von Symptomen (Ikterus, abdominale Beschwerden, dunkler Urin)':
    'If symptoms occur (jaundice, abdominal complaints, dark urine)',
  'Bei Dauertherapie >4 Wochen': 'With continuous therapy >4 weeks',
  'Bei Empfehlung': 'When recommended',
  'Bei Ko-Medikation mit Antikoagulanzien oder NSAR':
    'With co-medication of anticoagulants or NSAIDs',
  'Bei Ko-Medikation mit Clozapin: vor Fluvoxamin-Beginn und nach 1–2 Wochen':
    'With clozapine co-medication: before starting fluvoxamine and after 1–2 weeks',
  'Bei Ko-Medikation mit trizyklischen Antidepressiva':
    'With co-medication of tricyclic antidepressants',
  'Bei Therapiebeginn': 'At treatment start',
  'Bei Therapiebeginn und jeder Folgevisite': 'At treatment start and every follow-up visit',
  'Bei Therapiebeginn und nach 2–4 Wochen bei Risikogruppen':
    'At treatment start and after 2–4 weeks in at-risk groups',
  'Bei Therapiebeginn und nach Dosisanpassung': 'At treatment start and after dose adjustment',
  'Bei Therapiebeginn und regelmäßig': 'At treatment start and regularly',
  'Bei Verdacht auf metabolische Azidose': 'If metabolic acidosis is suspected',
  'Bei höheren Dosen (≥ 225 mg) und QTc-Risikopatienten':
    'At higher doses (≥ 225 mg) and in QTc-risk patients',
  'Bei jedem Kontakt': 'At every contact',
  'Bei jeder Injektion': 'At every injection',
  'Bei jeder Injektionskonsultation': 'At every injection visit',
  'Bei jeder Injektionskonsultation (alle 2 Wochen) bzw. Standardmonitoring':
    'At every injection visit (every 2 weeks) or standard monitoring',
  'Bei jeder Injektionskonsultation (alle 2–4 Wochen)':
    'At every injection visit (every 2–4 weeks)',
  'Bei jeder Injektionskonsultation (alle 4 Wochen)': 'At every injection visit (every 4 weeks)',
  'Bei jeder Injektionskonsultation (monatlich)': 'At every injection visit (monthly)',
  'Bei jeder Injektionskonsultation und regelmäßig':
    'At every injection visit and regularly',
  'Bei jeder Konsultation': 'At every visit',
  'Bei jeder Konsultation zu Therapiebeginn': 'At every visit at the start of therapy',
  'Bei jeder Verlaufskontrolle, besonders zu Beginn':
    'At every follow-up, especially at the start',
  'Bei jeder Verschreibung': 'At every prescription',
  'Bei jeder Visite': 'At every visit',
  'Bei jeder Visite (klinisches Screening)': 'At every visit (clinical screening)',
  'Bei jeder Visite in den ersten 8 Wochen': 'At every visit during the first 8 weeks',
  'Bei jeder parenteralen Gabe': 'With every parenteral administration',
  'Bei kardialen Risikopatienten und Komedikation':
    'In cardiac-risk patients and with co-medication',
  'Bei klinischem Verdacht (Fieber, Infektzeichen)':
    'On clinical suspicion (fever, signs of infection)',
  'Bei klinischem Verdacht auf Enzephalopathie (Verwirrtheit, Lethargie, Asterixis)':
    'On clinical suspicion of encephalopathy (confusion, lethargy, asterixis)',
  'Bei klinischem Verdacht auf metabolische Azidose (Hyperventilation, Lethargie)':
    'On clinical suspicion of metabolic acidosis (hyperventilation, lethargy)',
  'Bei klinischen Symptomen (Amenorrhö, Gynäkomastie, Galaktorrhö)':
    'When clinical symptoms occur (amenorrhea, gynecomastia, galactorrhea)',
  'Bei parenteraler Gabe kontinuierlich': 'Continuously with parenteral administration',
  'Beim Absetzen': 'When discontinuing',
  'Beobachtung in den ersten 3 Stunden': 'Observation during the first 3 hours',
  'Einmalig bei ungewöhnlicher Nebenwirkungslast': 'Once, with unusual adverse-effect burden',
  'Einmalig vor Beginn': 'Once before starting',
  'Einmalig vor Erstgabe': 'Once before the first dose',
  'Einmalig vor Therapiebeginn bei Patienten asiatischer Herkunft':
    'Once before treatment start in patients of Asian descent',
  'Einmalige Aufklärung bei Initiierung': 'One-time counseling at initiation',
  'Engmaschig in den ersten Stunden nach Injektion':
    'Closely during the first hours after injection',
  'Engmaschig während Titration, dann alle 3 Monate':
    'Closely during titration, then every 3 months',
  'Engmaschig während und nach i.v.-Gabe': 'Closely during and after IV administration',
  'Halbjährlich': 'Every 6 months',
  'Initial häufiger, dann halbjährlich': 'More frequently initially, then every 6 months',
  'Insbesondere in der Einstellungsphase': 'Especially during the titration phase',
  'Jährlich': 'Annually',
  'Jährlich und bei klinischem Bedarf': 'Annually and when clinically indicated',
  'Kontinuierlich bei parenteraler Gabe': 'Continuously with parenteral administration',
  'Kontinuierlich während und 1–2 h nach i.v./i.m.-Applikation':
    'Continuously during and 1–2 h after IV/IM administration',
  'Monatlich bei Injektionskonsultation': 'Monthly at the injection visit',
  'Nach 1, 4 und 12 Wochen; dann bei Bedarf': 'After 1, 4 and 12 weeks; then as needed',
  'Nach 2–4 Wochen (Steady-state nach Autoinduktion), dann alle 3–6 Monate':
    'After 2–4 weeks (steady state after autoinduction), then every 3–6 months',
  'Nach 4–6 Wochen (Steady State); bei Dosisänderung; bei Interaktion mit CYP2D6-Inhibitoren':
    'After 4–6 weeks (steady state); on dose change; on interaction with CYP2D6 inhibitors',
  'Nach 4–6 Wochen Steady-State; bei klinischer Non-Response oder Verdacht auf schlechte Compliance':
    'After 4–6 weeks at steady state; on clinical non-response or suspected poor adherence',
  'Nach 4–6 Wochen bei Steady State; bei Dosisänderung; bei Verdacht auf Toxizität':
    'After 4–6 weeks at steady state; on dose change; on suspected toxicity',
  'Nach 4–6 Wochen; bei Dosisänderung': 'After 4–6 weeks; on dose change',
  'Nach 6 Monaten': 'After 6 months',
  'Nach JEDER Injektion: 3 Stunden in medizinischer Einrichtung':
    'After EVERY injection: 3 hours in a medical facility',
  'Obligat; wie Sertindol-Schema': 'Mandatory; as per the sertindole schedule',
  'Optional; bei Dosisänderungen, Interaktionen oder Therapieversagen':
    'Optional; on dose changes, interactions or treatment failure',
  'Optional; bei unzureichendem Ansprechen oder Verdacht auf Toxizität':
    'Optional; on inadequate response or suspected toxicity',
  'Regelmässig': 'Regularly',
  'Regelmässig (je nach BtMVV-Phase)':
    'Regularly (depending on controlled-substance (BtMVV) phase)',
  'Regelmässig (je nach Phase der OGT)':
    'Regularly (depending on the phase of opioid maintenance therapy)',
  'Regelmäßig': 'Regularly',
  'Regelmäßig, besonders bei Augmentationstherapie':
    'Regularly, especially with augmentation therapy',
  'Regelmäßig, insb. zu Therapiebeginn': 'Regularly, especially at treatment start',
  'Risikogruppen: Basismessung und nach 2–4 Wochen':
    'At-risk groups: baseline and after 2–4 weeks',
  'Risikogruppen: vor Beginn und nach 4 Wochen':
    'At-risk groups: before starting and after 4 weeks',
  'Risikogruppen: vor Beginn, nach 2–4 Wochen': 'At-risk groups: before starting, after 2–4 weeks',
  'Risikogruppen: vor Beginn, nach 4 Wochen': 'At-risk groups: before starting, after 4 weeks',
  'Tag 1 und Tag 8 (Deltamuskel)': 'Day 1 and day 8 (deltoid muscle)',
  'Täglich': 'Daily',
  'Täglich bei Titration; bei jeder Dosisanpassung':
    'Daily during titration; with every dose adjustment',
  'Täglich bei Titration; wöchentlich in den ersten Wochen':
    'Daily during titration; weekly in the first weeks',
  'Täglich bei stationärer akuter Anwendung; alle 4 Wochen bei ambulanter Anwendung':
    'Daily with acute inpatient use; every 4 weeks with outpatient use',
  'Vor Absetzen und während Ausschleichen': 'Before discontinuation and during tapering',
  'Vor Beginn': 'Before starting',
  'Vor Beginn (antidepressive Dosen); nach Dosisanpassung':
    'Before starting (antidepressant doses); after dose adjustment',
  'Vor Beginn und bei Medikationsänderungen': 'Before starting and on medication changes',
  'Vor Beginn und regelmässig': 'Before starting and regularly',
  'Vor Beginn, alle 3 Monate': 'Before starting, every 3 months',
  'Vor Beginn, alle 3–6 Monate': 'Before starting, every 3–6 months',
  'Vor Beginn, alle 6 Monate': 'Before starting, every 6 months',
  'Vor Beginn, bei Dosistitration und quartalsweise':
    'Before starting, during dose titration and quarterly',
  'Vor Beginn, bei Herzerkrankung oder Alter >60 J. jährlich':
    'Before starting, annually with heart disease or age >60 years',
  'Vor Beginn, bei Medikationsänderungen': 'Before starting, on medication changes',
  'Vor Beginn, bei Risikofaktoren regelmässig':
    'Before starting, regularly when risk factors are present',
  'Vor Beginn, dann alle 3 Monate (stabil: alle 6 Monate)':
    'Before starting, then every 3 months (if stable: every 6 months)',
  'Vor Beginn, dann alle 6–12 Monate': 'Before starting, then every 6–12 months',
  'Vor Beginn, dann bei klinischem Verdacht': 'Before starting, then on clinical suspicion',
  'Vor Beginn, dann jährlich': 'Before starting, then annually',
  'Vor Beginn, dann jährlich oder bei klinischer Indikation':
    'Before starting, then annually or when clinically indicated',
  'Vor Beginn, nach 1 Monat, dann alle 3–6 Monate':
    'Before starting, after 1 month, then every 3–6 months',
  'Vor Beginn, nach 1–2 Wochen, dann alle 3 Monate':
    'Before starting, after 1–2 weeks, then every 3 months',
  'Vor Beginn, nach 1–3 Monaten, dann halbjährlich':
    'Before starting, after 1–3 months, then every 6 months',
  'Vor Beginn, nach 2 Wochen, dann alle 1–3 Monate':
    'Before starting, after 2 weeks, then every 1–3 months',
  'Vor Beginn, nach 2 Wochen, dann alle 3–6 Monate':
    'Before starting, after 2 weeks, then every 3–6 months',
  'Vor Beginn, nach 2 und 4 Wochen, dann alle 3 Monate':
    'Before starting, after 2 and 4 weeks, then every 3 months',
  'Vor Beginn, nach 3 Monaten, dann alle 6 Monate':
    'Before starting, after 3 months, then every 6 months',
  'Vor Beginn, nach 3 und 6 Monaten, dann alle 6 Monate':
    'Before starting, after 3 and 6 months, then every 6 months',
  'Vor Beginn, nach 4 Wochen': 'Before starting, after 4 weeks',
  'Vor Beginn, nach 4 Wochen, dann alle 3 Monate':
    'Before starting, after 4 weeks, then every 3 months',
  'Vor Beginn, nach 4 Wochen, dann alle 3–6 Monate; bei Symptomen sofort':
    'Before starting, after 4 weeks, then every 3–6 months; immediately if symptoms occur',
  'Vor Beginn, nach 4 Wochen, dann halbjährlich':
    'Before starting, after 4 weeks, then every 6 months',
  'Vor Beginn, nach 4 Wochen, dann quartalsweise':
    'Before starting, after 4 weeks, then quarterly',
  'Vor Beginn, nach 4–6 Wochen, nach 3 Monaten, dann alle 6 Monate':
    'Before starting, after 4–6 weeks, after 3 months, then every 6 months',
  'Vor Beginn, nach 4–8 Wochen, dann alle 6 Monate':
    'Before starting, after 4–8 weeks, then every 6 months',
  'Vor Beginn, nach 6 Monaten, dann jährlich': 'Before starting, after 6 months, then annually',
  'Vor Beginn, präoperativ': 'Before starting, preoperatively',
  'Vor Beginn, regelmäßig während der Titration; bei jedem Arztbesuch':
    'Before starting, regularly during titration; at every physician visit',
  'Vor Beginn; EKG bei Symptomen oder Risikofaktoren':
    'Before starting; ECG with symptoms or risk factors',
  'Vor Beginn; bei Symptomen': 'Before starting; if symptoms occur',
  'Vor Beginn; bei kardialer Vorerkrankung auch unter Therapie':
    'Before starting; also during therapy with pre-existing cardiac disease',
  'Vor Beginn; nach 6 Monaten; dann jährlich': 'Before starting; after 6 months; then annually',
  'Vor Beginn; nach Dosisanpassung': 'Before starting; after dose adjustment',
  'Vor Beginn; nach Dosissteigerung (v. a. bei > 40 mg/Tag); dann alle 3–6 Monate':
    'Before starting; after dose escalation (especially at > 40 mg/day); then every 3–6 months',
  'Vor Empfehlung': 'Before recommending',
  'Vor Erstgabe': 'Before the first dose',
  'Vor Therapiebeginn': 'Before treatment start',
  'Vor Therapiebeginn (v. a. bei Enuresis-Indikation bei Kindern); nach Dosisänderung':
    'Before treatment start (especially for the enuresis indication in children); after dose change',
  'Vor Therapiebeginn und alle 2–4 Wochen': 'Before treatment start and every 2–4 weeks',
  'Vor Therapiebeginn und bei Langzeitanwendung':
    'Before treatment start and with long-term use',
  'Vor Therapiebeginn und halbjährlich': 'Before treatment start and every 6 months',
  'Vor Therapiebeginn und nach Dosiserhöhung': 'Before treatment start and after dose increase',
  'Vor Therapiebeginn, bei Dosiserhöhung, dann regelmäßig (mindestens quartalsweise)':
    'Before treatment start, on dose increase, then regularly (at least quarterly)',
  'Vor Therapiebeginn, bei Dosiserhöhung, quartalsweise':
    'Before treatment start, on dose increase, quarterly',
  'Vor Therapiebeginn, nach 1–2 Wochen, dann alle 3–6 Monate':
    'Before treatment start, after 1–2 weeks, then every 3–6 months',
  'Vor Therapiebeginn, nach 2–4 Wochen, dann alle 3–6 Monate':
    'Before treatment start, after 2–4 weeks, then every 3–6 months',
  'Vor Therapiebeginn, nach 2–4 Wochen, dann bei klinischen Symptomen (Übelkeit, Verwirrtheit, Lethargie)':
    'Before treatment start, after 2–4 weeks, then if clinical symptoms occur (nausea, confusion, lethargy)',
  'Vor Therapiebeginn, nach Dosistitration, alle 3–6 Monate':
    'Before treatment start, after dose titration, every 3–6 months',
  'Vor Therapiebeginn; Verlaufskontrolle bei Dosiserhöhung oder Komedikation mit QTc-verlängernden Substanzen':
    'Before treatment start; follow-up on dose increase or co-medication with QTc-prolonging substances',
  'Vor Therapiebeginn; bei Dosiserhöhung': 'Before treatment start; on dose increase',
  'Vor Therapiebeginn; bei Dosisänderung; mindestens jährlich':
    'Before treatment start; on dose change; at least annually',
  'Vor Therapiebeginn; bei i.v.-Gabe: kontinuierliches Monitoring':
    'Before treatment start; with IV administration: continuous monitoring',
  'Vor Therapiebeginn; nach 2–4 Wochen; dann quartalsweise':
    'Before treatment start; after 2–4 weeks; then quarterly',
  'Vor Therapiebeginn; nach 3 und 6 Monaten': 'Before treatment start; after 3 and 6 months',
  'Vor Therapiebeginn; nach 3 und 6 Monaten; dann jährlich; bei Symptomen sofort':
    'Before treatment start; after 3 and 6 months; then annually; immediately if symptoms occur',
  'Vor Therapiebeginn; nach 3, 6, 12 und 24 Wochen; nach Dosiserhöhung auf 50 mg; danach bei klinischen Symptomen':
    'Before treatment start; after 3, 6, 12 and 24 weeks; after dose increase to 50 mg; thereafter if clinical symptoms occur',
  'Vor Therapiebeginn; nach 4 Wochen; monatlich in den ersten 3 Monaten; bei Infektzeichen sofort':
    'Before treatment start; after 4 weeks; monthly during the first 3 months; immediately with signs of infection',
  'Vor Therapiebeginn; nach Dosisanpassung': 'Before treatment start; after dose adjustment',
  'Vor Therapiebeginn; nach Dosisanpassung; mindestens jährlich':
    'Before treatment start; after dose adjustment; at least annually',
  'Vor Therapiebeginn; nach Dosiserhöhung; bei QTc-relevanter Komedikation':
    'Before treatment start; after dose increase; with QTc-relevant co-medication',
  'Vor Therapiebeginn; nach Dosissteigerungen': 'Before treatment start; after dose escalations',
  'Vor Therapiebeginn; nach Erreichen der Startdosis (12 mg); nach jeder Dosissteigerung; alle 3 Monate; bei Dosisänderungen':
    'Before treatment start; after reaching the starting dose (12 mg); after each dose escalation; every 3 months; on dose changes',
  'Vor Verordnung': 'Before prescribing',
  'Vor jedem Absetzversuch': 'Before every discontinuation attempt',
  'Vor jeder Dosis': 'Before every dose',
  'Vor jeder Dosis, 40 min nach Gabe, 2 h nach Gabe (Entlassungsbeurteilung)':
    'Before every dose, 40 min after administration, 2 h after administration (discharge assessment)',
  'Wie bei anderen Nicht-Stimulanzien': 'As with other non-stimulants',
  'Während der 2-stündigen Beobachtungsphase': 'During the 2-hour observation period',
  'Wöchentlich (erste 6 Wochen), dann monatlich': 'Weekly (first 6 weeks), then monthly',
  'Wöchentlich bei Dosistitration; monatlich in den ersten 6 Monaten; dann alle 3–6 Monate':
    'Weekly during dose titration; monthly for the first 6 months; then every 3–6 months',
  'Wöchentlich bei Therapiebeginn; laufend': 'Weekly at treatment start; ongoing',
  'Wöchentlich für Wochen 1–18; danach alle 4 Wochen':
    'Weekly for weeks 1–18; thereafter every 4 weeks',
  'Wöchentlich in den ersten 12 Wochen': 'Weekly for the first 12 weeks',
  'Wöchentlich in den ersten 4 Wochen': 'Weekly for the first 4 weeks',
  'Wöchentlich in den ersten 4 Wochen, dann alle 2 Wochen bis Woche 12':
    'Weekly for the first 4 weeks, then every 2 weeks until week 12',
  'Wöchentlich in den ersten 4 Wochen; dann alle 2 Wochen':
    'Weekly for the first 4 weeks; then every 2 weeks',
  'Zu Beginn nach 5–7 Tagen, dann alle 3–6 Monate oder bei klinischer Indikation':
    'Initially after 5–7 days, then every 3–6 months or when clinically indicated',
  'Zu Beginn und bei Dosisänderungen': 'At the start and on dose changes',
  'Zu Beginn und bei jeder Verlaufskontrolle': 'At the start and at every follow-up',
  'Zu Beginn und nach erster Injektion': 'At the start and after the first injection',
  'Zu Beginn und regelmäßig': 'At the start and regularly',
  'Zu Beginn wöchentlich bis Steady-state; dann alle 3 Monate (stabil) oder bei klinischen Änderungen':
    'Initially weekly until steady state; then every 3 months (if stable) or on clinical changes',
}

const WARNING_THRESHOLD_EN: Record<string, string> = {
  '< 130 mmol/L → Dosisanpassung; < 125 mmol/L → Absetzen':
    '< 130 mmol/L → dose adjustment; < 125 mmol/L → discontinue',
  '< 130 mmol/L → Handlungsbedarf': '< 130 mmol/L → action required',
  '>1.5 mmol/L Toxizitätsverdacht; >2.0 mmol/L Notfall':
    '>1.5 mmol/L suspected toxicity; >2.0 mmol/L emergency',
  'ALT > 3× ULN → Duloxetin absetzen': 'ALT > 3× ULN → discontinue duloxetine',
  'ALT > 3× ULN: Agomelatin absetzen': 'ALT > 3× ULN: discontinue agomelatine',
  'ALT/AST >3× ULN → engmaschige Kontrolle; >5× ULN → Absetzen erwägen':
    'ALT/AST >3× ULN → close monitoring; >5× ULN → consider discontinuation',
  'AST/ALT >3× ULN persistierend': 'AST/ALT >3× ULN persistently',
  'AV-Blockierung, Sinusknotendysfunktion': 'AV block, sinus node dysfunction',
  'Bikarbonat <17 mmol/L': 'Bicarbonate <17 mmol/L',
  'Clozapin-Spiegel kann auf das 5- bis 10-Fache ansteigen':
    'Clozapine levels may rise 5- to 10-fold',
  'Dosissteigerungswunsch, Beschaffungsverhalten':
    'Requests for dose increases, drug-seeking behavior',
  'Gewichtszunahme >5 kg': 'Weight gain >5 kg',
  'Gewichtszunahme >7% des Ausgangsgewichts: Therapieoptimierung einleiten':
    'Weight gain >7% of baseline weight: initiate therapy optimization',
  'HLA-B*1502 positiv': 'HLA-B*1502 positive',
  'Jedes Exanthem in ersten 8 Wochen als potenziell ernst behandeln':
    'Treat any rash in the first 8 weeks as potentially serious',
  'Kalzium >2,65 mmol/L → Hyperparathyreoidismus ausschließen':
    'Calcium >2.65 mmol/L → rule out hyperparathyroidism',
  'Leukozyten <3.500/µl oder ANC <2.000/µl: Behandlungspause; Leukozyten <3.000/µl oder ANC <1.500/µl: Clozapin sofort absetzen':
    'Leukocytes <3,500/µL or ANC <2,000/µL: treatment interruption; leukocytes <3,000/µL or ANC <1,500/µL: discontinue clozapine immediately',
  'Leukozyten <3000/µl oder Neutrophile <1500/µl':
    'Leukocytes <3,000/µL or neutrophils <1,500/µL',
  'Leukozyten >12.000/µl häufig (benigne); Thrombozytopenie selten':
    'Leukocytes >12,000/µL common (benign); thrombocytopenia rare',
  'NH₃ >80 µmol/L bei Symptomen': 'NH₃ >80 µmol/L with symptoms',
  'Natrium <130 mmol/L symptomatisch': 'Sodium <130 mmol/L symptomatic',
  'Neu aufgetretene Aggressivität, Psychose oder Suizidgedanken':
    'New-onset aggression, psychosis or suicidal thoughts',
  'Nüchternglukose >7,0 mmol/l: diabetologische Abklärung':
    'Fasting glucose >7.0 mmol/L: diabetology workup',
  'PR >200 ms → Vorsicht; AV-Block Grad II/III → Kontraindikation':
    'PR >200 ms → caution; AV block grade II/III → contraindication',
  'Prolaktin >200 mIU/l bei Männern bzw. >500 mIU/l bei Frauen: Überdenken der Therapie':
    'Prolactin >200 mIU/L in men or >500 mIU/L in women: reconsider therapy',
  'QTc > 450 ms (Männer) / > 470 ms (Frauen) → Dosis nicht erhöhen; > 500 ms → Absetzen':
    'QTc > 450 ms (men) / > 470 ms (women) → do not increase dose; > 500 ms → discontinue',
  'QTc > 450 ms (Männer) / > 470 ms (Frauen) → Dosisreduktion; > 500 ms → Absetzen':
    'QTc > 450 ms (men) / > 470 ms (women) → dose reduction; > 500 ms → discontinue',
  'QTc > 450/470 ms → Dosis nicht erhöhen; QRS > 100 ms → starke Vorsicht; > 120 ms → Absetzen erwägen':
    'QTc > 450/470 ms → do not increase dose; QRS > 100 ms → strong caution; > 120 ms → consider discontinuation',
  'QTc >450 ms (Männer) / >470 ms (Frauen): Risiko neu bewerten; >500 ms: Absetzen erwägen':
    'QTc >450 ms (men) / >470 ms (women): reassess risk; >500 ms: consider discontinuation',
  'QTc >500 ms oder QTc >470 ms (Männer) / >490 ms (Frauen) beim Einstellen: Sertindol kontraindiziert/absetzen':
    'QTc >500 ms, or QTc >470 ms (men) / >490 ms (women) during titration: sertindole contraindicated/discontinue',
  'QTc >500 ms oder Verlängerung >60 ms gegenüber Baseline: Ziprasidon absetzen':
    'QTc >500 ms or prolongation >60 ms versus baseline: discontinue ziprasidone',
  'QTc >500 ms oder Verlängerung >60 ms: Amisulprid absetzen':
    'QTc >500 ms or prolongation >60 ms: discontinue amisulpride',
  'QTc >500 ms oder Verlängerung >60 ms: Pimozid reduzieren/absetzen':
    'QTc >500 ms or prolongation >60 ms: reduce/discontinue pimozide',
  'Quick <60%, PTT verlängert': 'PT/Quick <60%, PTT prolonged',
  'SpO₂ <92%, Atemfrequenz <10/min': 'SpO₂ <92%, respiratory rate <10/min',
  'Summe Clomipramin + Desmethylclomipramin: 230–450 ng/mL angestrebt':
    'Sum of clomipramine + desmethylclomipramine: target 230–450 ng/mL',
  'Systolisch > 140 mmHg oder Anstieg > 15 mmHg → Dosisüberprüfung':
    'Systolic > 140 mmHg or increase > 15 mmHg → review dose',
  'TSH >4 mU/L klinisch prüfen; TSH >10 mU/L → L-Thyroxin erwägen':
    'TSH >4 mU/L review clinically; TSH >10 mU/L → consider levothyroxine',
  'Therapeutisch 10–35 µg/ml (MHD)': 'Therapeutic 10–35 µg/mL (MHD)',
  'Therapeutisch ~3–14 µg/ml (psychiatrisch); kein festes Fenster etabliert':
    'Therapeutic ~3–14 µg/mL (psychiatric); no fixed window established',
  'Therapeutischer Bereich: 350–600 ng/ml; >1000 ng/ml: Toxizitätsrisiko':
    'Therapeutic range: 350–600 ng/mL; >1000 ng/mL: risk of toxicity',
  'Therapeutischer Bereich: 70–170 ng/mL': 'Therapeutic range: 70–170 ng/mL',
  'Therapeutischer Bereich: Amitriptylin + Nortriptylin 80–200 ng/mL':
    'Therapeutic range: amitriptyline + nortriptyline 80–200 ng/mL',
  'Thrombozyten <100.000/µl → Dosis reduzieren; <50.000/µl → Absetzen erwägen':
    'Platelets <100,000/µL → reduce dose; <50,000/µL → consider discontinuation',
  'Toxische Zeichen ab >100 µg/ml möglich': 'Signs of toxicity possible from >100 µg/mL',
  'Toxische Zeichen ab >12 µg/ml; >20 µg/ml schwere Toxizität':
    'Signs of toxicity from >12 µg/mL; >20 µg/mL severe toxicity',
  'Triglyzeride >5,6 mmol/l: Pankreatitisrisiko; Umstellung erwägen':
    'Triglycerides >5.6 mmol/L: pancreatitis risk; consider switching',
  'Troponin >2× ULN oder Troponin-Anstieg: Clozapin pausieren; Kardiologie hinzuziehen':
    'Troponin >2× ULN or rising troponin: pause clozapine; involve cardiology',
  'Zielbereich TRD-Augmentation: 0,6–0,8 mmol/L; > 1,5 mmol/L toxisch':
    'Target range for TRD augmentation: 0.6–0.8 mmol/L; > 1.5 mmol/L toxic',
  'eGFR <60 ml/min → Dosisreduktion; eGFR <30 → relative Kontraindikation':
    'eGFR <60 mL/min → dose reduction; eGFR <30 → relative contraindication',
  'eGFR <60 ml/min: Dosisanpassung erforderlich': 'eGFR <60 mL/min: dose adjustment required',
  'eGFR <60: Dosisanpassung erforderlich': 'eGFR <60: dose adjustment required',
  'eGFR <80 ml/min: Dosisanpassung': 'eGFR <80 mL/min: dose adjustment',
}

export interface LocalizedMonitoringRule {
  parameter: string
  frequency?: string
  warningThreshold?: string
  note: string
}

interface MonitoringRuleLike {
  parameter: string
  frequency?: string
  warningThreshold?: string
  noteDe: string
  noteEn: string
}

/**
 * Resolve a single monitoring-reference string for the active language. For German
 * the source string is returned unchanged. For English the curated translation is
 * used; if (and only if) a value is missing from the map the German source is
 * returned as a visible fallback, which the `monitoringI18n` guardrail flags.
 */
function localizeField(
  value: string | undefined,
  table: Record<string, string>,
  language: string,
): string | undefined {
  if (value == null || value === '') return value
  if (language === 'de') return value
  return table[value] ?? value
}

export function localizeMonitoringParameter(value: string, language: string): string {
  return localizeField(value, PARAMETER_EN, language) ?? value
}

export function localizeMonitoringFrequency(
  value: string | undefined,
  language: string,
): string | undefined {
  return localizeField(value, FREQUENCY_EN, language)
}

export function localizeMonitoringThreshold(
  value: string | undefined,
  language: string,
): string | undefined {
  return localizeField(value, WARNING_THRESHOLD_EN, language)
}

/** Localise a complete monitoring rule (parameter + frequency + threshold + note). */
export function localizeMonitoringRule(
  rule: MonitoringRuleLike,
  language: string,
): LocalizedMonitoringRule {
  return {
    parameter: localizeMonitoringParameter(rule.parameter, language),
    frequency: localizeMonitoringFrequency(rule.frequency, language),
    warningThreshold: localizeMonitoringThreshold(rule.warningThreshold, language),
    note: language === 'de' ? rule.noteDe : rule.noteEn,
  }
}

