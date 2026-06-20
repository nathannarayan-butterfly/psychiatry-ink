import type { DemoStrings } from '../types'

const ADMISSION = '2026-06-02'

export const demoStringsEn: DemoStrings = {
  verlaufSectionLabel: 'Progress note',

  aufnahme: {
    aufnahmeanlass:
      'Elective inpatient admission via emergency department after acute psychotic decompensation with paranoid content, sleep deprivation, and increasing substance use. Referred by GP after telephone consultation; no acute risk to others, but limited illness insight.',
    'aktuelle-beschwerden':
      'For approximately 10–14 days: increasing inner restlessness, sleep deficit (<3 h/night), mistrust of neighbours ("being watched"), repeated calls to police without substantiated grounds. Mood fluctuating between irritable and anxious. Appetite reduced.',
    eigenanamnese: 'Ms Demo reports a reliable self-history. No known somatic comorbidity of relevance. No known drug allergies.',
    'aktuelle-krankheitsanamnese':
      'First psychotic episode at age 22 after cannabis misuse, then brief inpatient care. Since then several outpatient phases with irregular medication adherence. Current relapse in context of sleep deprivation, amphetamine use ("speed" at weekend), and occupational stress.',
    'psychiatrische-vorgeschichte':
      'Several pre-admission contacts; last outpatient visit 8 months ago for depressive symptoms. Prior labels: paranoid schizophrenia (F20.0), episodic major depression (uncertain). No suicide attempts. No prolonged involuntary commitment.',
    'somatische-anamnese': 'No relevant internal medicine history. Occasional headaches with sleep loss. No known medication allergies.',
    suchtanamnese:
      'Cannabis since adolescence, currently ~1–2 joints/day. Episodic amphetamine use ("speed"), most recently before admission at the weekend. Alcohol occasional, not daily. Nicotine ~15 cigarettes/day. No known IV drug use.',
    medikamentenanamnese:
      'Before admission: irregular risperidone 2 mg at night (compliance uncertain), occasional lorazepam for agitation. No regular intake in the 2 weeks before admission.',
    familienanamnese: 'Father with treated depression (diagnosis uncertain). No known family history of psychosis. Mother well.',
    'biografische-anamnese': 'Raised in urban setting; secondary school qualification; IT apprenticeship. Several longer partnerships; currently single.',
    sozialanamnese:
      'Lives alone in rented flat (synthetic demo address). Unemployed for 3 months after dismissal. Financial strain; no imminent homelessness. Social contact reduced.',
    'schul-und-berufsanamnese': 'Worked in IT until dismissal for absences. No current employment.',
    'forensische-anamnese': 'No relevant forensic history. No pending criminal proceedings.',
    traumaanamnese: 'No clear trauma reported. Adolescent stressors poorly defined.',
    'suizid-und-selbstgefaehrdungsanamnese':
      'Passive death wishes occasionally ("sometimes peace would be good") but no concrete plans, intent, or preparation. No prior suicide attempt. Protective factors: ambivalent tie to sister; therapeutic alliance slowly forming. BRMS screen: low acute risk; safety plan discussed.',
    fremdgefaehrdungsanamnese: 'No indicators of acute risk to others. No weapons. Occasional loud behaviour; neighbour complaints.',
    'psychopathologischer-befund':
      'Awake, oriented ×4. Contact effortful, suspicious. Affect labile, partly irritable. Thought form mildly circumstantial; content delusional-paranoid (persecutory and surveillance ideas without full insight). No clear hallucinations at examination. Drive reduced. Sleep disturbed. Illness insight low.',
    'somatischer-befund': 'Vital signs stable. Heart and lungs unremarkable. Brief neurological exam without focal deficit.',
    'diagnostische-einschaetzung':
      'Working diagnosis: acute psychotic episode in context of schizophreniform disorder (F20.0); differential: schizoaffective disorder and substance-induced psychosis (F12.2/F15.2). Diagnostic uncertainty — continue observation.',
    'therapieplanung-behandlungsplan':
      'Antipsychotic stabilisation, sleep regulation, substance-motivation work. Psychoeducation and progress documentation. Discharge planning after stabilisation and housing/work clarification.',
  },

  verlaufFeed: [
    { date: `${ADMISSION}T08:30:00.000Z`, content: 'Admission to ward. Patient suspicious, minimal sleep. Risperidone 2 mg fixed; lorazepam PRN prescribed.' },
    { date: `${ADMISSION}T14:00:00.000Z`, content: 'Afternoon increasing agitation; lorazepam 1 mg once. Contact remains tense.' },
    { date: '2026-06-03T09:00:00.000Z', content: 'Night sleep 4 h. Paranoid themes still present but less agitated.' },
    { date: '2026-06-03T16:30:00.000Z', content: 'Psychoeducation group attended; passive participation.' },
    { date: '2026-06-05T10:30:00.000Z', content: 'Admission labs (05 Jun) — prolactin markedly elevated on risperidone 3 mg; routine panel otherwise unremarkable.' },
    { date: '2026-06-05T09:30:00.000Z', content: 'Risperidone increased to 3 mg for persistent positive symptoms.' },
    { date: '2026-06-06T11:00:00.000Z', content: 'Individual session: patient reports reduced "surveillance" experiences; sleep 5–6 h.' },
    { date: '2026-06-07T09:00:00.000Z', content: 'Ward behaviour calmer. Motivation for discharge planning still low.' },
    { date: '2026-06-08T10:30:00.000Z', content: 'ECG unremarkable. Meeting with social services re housing and employment.' },
    { date: '2026-06-09T09:00:00.000Z', content: 'Switch to aripiprazole 10 mg started (risperidone tapered) due to prolactin rise and amotivation.' },
    { date: '2026-06-10T14:00:00.000Z', content: 'Exercise therapy attended twice. Mood somewhat improved.' },
    { date: '2026-06-11T09:30:00.000Z', content: 'No acute suicidality. Illness insight slowly increasing. Safety plan updated.' },
    { date: '2026-06-11T16:00:00.000Z', content: 'Resting EEG (11 Jun): mild diffuse slowing; no epileptiform discharges.' },
    { date: '2026-06-12T10:00:00.000Z', content: 'AIMS check: mild akathisia, no dyskinesia. SAS 1/1/0.' },
    { date: '2026-06-20T11:00:00.000Z', content: 'Follow-up labs (20 Jun) — prolactin normalised after switch to aripiprazole; aripiprazole level in therapeutic range. Triglycerides and HbA1c borderline — continue metabolic monitoring.' },
    { date: '2026-06-13T11:00:00.000Z', content: 'Neurology consult requested (demo example) — no urgent action required.' },
    { date: '2026-06-14T09:00:00.000Z', content: 'Discharge planning: outpatient follow-up, housing confirmation pending, medication stabilised on aripiprazole 10 mg + lorazepam PRN.' },
  ],

  labGraphNotes: { prolactin0: 'Elevated on risperidone', prolactin1: 'Normalised after switch', triglycerides1: 'Mildly elevated', hba1c1: 'Borderline', aripiprazole0: 'Not yet therapeutic (pre-switch)', aripiprazole1: 'Therapeutic range' },
  laborBefundLabels: { admission: 'Admission — risperidone 3 mg', followup: 'Follow-up — aripiprazole 10 mg', anthro: 'Anthropometrics — trend', glucose: 'Fasting glucose — interim check' },
  laborBefundHeaderPrefix: 'Lab report', labGraphTitle: 'Lab trends', timelineTitle: 'Illness course',
  medMarkerNotes: { increased: 'Dose increase', started: 'Switch' },

  labGraphParams: [
    { parameter: 'Leukocytes', v1: 7.2, v2: 6.9, refLow: 4.0, refHigh: 10.0, unit: 'G/l' },
    { parameter: 'Haemoglobin', v1: 14.1, v2: 14.3, refLow: 13.5, refHigh: 17.5, unit: 'g/dl' },
    { parameter: 'AST', v1: 24, v2: 22, refLow: 0, refHigh: 35, unit: 'U/l' },
    { parameter: 'ALT', v1: 31, v2: 29, refLow: 0, refHigh: 45, unit: 'U/l' },
    { parameter: 'GGT', v1: 38, v2: 36, refLow: 0, refHigh: 55, unit: 'U/l' },
    { parameter: 'Creatinine', v1: 0.88, v2: 0.86, refLow: 0.7, refHigh: 1.2, unit: 'mg/dl' },
    { parameter: 'Sodium', v1: 141, v2: 142, refLow: 136, refHigh: 145, unit: 'mmol/l' },
    { parameter: 'Potassium', v1: 4.2, v2: 4.0, refLow: 3.5, refHigh: 5.1, unit: 'mmol/l' },
    { parameter: 'HbA1c', v1: 5.4, v2: 5.7, refLow: 4.0, refHigh: 6.0, unit: '%' },
    { parameter: 'Total cholesterol', v1: 188, v2: 192, refLow: 0, refHigh: 200, unit: 'mg/dl' },
    { parameter: 'Triglycerides', v1: 158, v2: 178, refLow: 0, refHigh: 150, unit: 'mg/dl' },
    { parameter: 'Prolactin', v1: 48, v2: 12, refLow: 4, refHigh: 15, unit: 'ng/ml' },
    { parameter: 'Aripiprazole', v1: 0, v2: 218, refLow: 150, refHigh: 300, unit: 'ng/ml' },
  ],

  laborCategories: {
    befund1: [
      { id: 'blutbild', label: 'Full blood count', params: [{ name: 'Haemoglobin' }, { name: 'Leukocytes' }, { name: 'Platelets' }] },
      { id: 'leberwerte', label: 'Liver function', params: [{ name: 'AST' }, { name: 'ALT' }, { name: 'GGT' }, { name: 'Total bilirubin' }] },
      { id: 'nierenwerte', label: 'Renal function', params: [{ name: 'Creatinine' }, { name: 'eGFR (CKD-EPI)' }, { name: 'Urea' }] },
      { id: 'elektrolyte', label: 'Electrolytes', params: [{ name: 'Sodium' }, { name: 'Potassium' }, { name: 'Chloride' }] },
      { id: 'entzuendung', label: 'Inflammation', params: [{ name: 'CRP' }] },
      { id: 'stoffwechsel', label: 'Metabolism / lipids', params: [{ name: 'Fasting glucose' }, { name: 'HbA1c' }, { name: 'Total cholesterol' }, { name: 'LDL cholesterol' }, { name: 'HDL cholesterol' }, { name: 'Triglycerides' }] },
      { id: 'hormone', label: 'Hormones', params: [{ name: 'Prolactin' }] },
      { id: 'muskelenzyme', label: 'Muscle enzymes', params: [{ name: 'Total CK' }] },
    ],
    befund2: [
      { id: 'blutbild', label: 'Full blood count', params: [{ name: 'Haemoglobin' }, { name: 'Leukocytes' }, { name: 'Platelets' }] },
      { id: 'leberwerte', label: 'Liver function', params: [{ name: 'AST' }, { name: 'ALT' }, { name: 'GGT' }, { name: 'Total bilirubin' }] },
      { id: 'nierenwerte', label: 'Renal function', params: [{ name: 'Creatinine' }, { name: 'eGFR (CKD-EPI)' }, { name: 'Urea' }] },
      { id: 'elektrolyte', label: 'Electrolytes', params: [{ name: 'Sodium' }, { name: 'Potassium' }, { name: 'Chloride' }] },
      { id: 'entzuendung', label: 'Inflammation', params: [{ name: 'CRP' }] },
      { id: 'stoffwechsel', label: 'Metabolism / lipids', params: [{ name: 'Fasting glucose' }, { name: 'HbA1c' }, { name: 'Total cholesterol' }, { name: 'LDL cholesterol' }, { name: 'HDL cholesterol' }, { name: 'Triglycerides' }] },
      { id: 'hormone', label: 'Hormones', params: [{ name: 'Prolactin' }] },
      { id: 'medikamentenspiegel', label: 'Drug levels', params: [{ name: 'Aripiprazole (trough)' }] },
    ],
    anthro: [{ id: 'anthropometrie', label: 'Anthropometrics', params: [{ name: 'BMI' }, { name: 'Weight' }, { name: 'Height' }] }],
    glucose: [{ id: 'stoffwechsel', label: 'Metabolism', params: [{ name: 'Fasting glucose' }] }],
  },

  diagnoses: [
    { icd10Label: 'Paranoid schizophrenia', icd11Label: 'Schizophrenia, first episode', dsmLabel: 'Schizophrenia, paranoid type' },
    { icd10Label: 'Mental and behavioural disorders due to cannabinoids: dependence syndrome', icd11Label: 'Cannabis dependence', dsmLabel: 'Cannabis use disorder, severe' },
    { icd10Label: 'Mental and behavioural disorders due to other stimulants: dependence syndrome', icd11Label: 'Disorders due to amphetamine-type substances, dependence', dsmLabel: 'Stimulant use disorder, severe' },
  ],

  medication: {
    aripiprazole: { substance: 'Aripiprazole', indication: 'Antipsychotic stabilisation', reasonForChange: 'Switch from risperidone due to hyperprolactinaemia', sideEffects: ['mild akathisia'], adherenceNote: 'Morning dosing, currently regular', doseLine: 'Aripiprazole 10-0-0-0 mg', historyStartNote: 'Started after risperidone taper', historySnapshotReason: 'Switch' },
    risperidone: { substance: 'Risperidone', indication: 'Acute psychosis', reasonForChange: 'Tapered in favour of aripiprazole', sideEffects: ['prolactin elevation', 'amotivation'], adherenceNote: '', doseLine: 'Risperidone 0-0-3-0 mg (tapered off)', historyStartNote: '', historySnapshotReason: '' },
    lorazepam: { substance: 'Lorazepam', indication: 'Acute agitation / restlessness', reasonForChange: '', sideEffects: [], adherenceNote: 'Rarely requested, last used 3 days ago', doseLine: 'Lorazepam 1 mg as needed (max. 2 mg/24 h)', historyStartNote: '', historySnapshotReason: '' },
    sideEffectReport: { symptom: 'Akathisia', severity: 'mild', temporalRelation: 'Days after switch', actionTaken: 'Observation, dose adjustment if needed', outcome: 'stable', note: 'AIMS/SAS documented — no dyskinesia' },
    labCorrelationNotes: 'Prolactin elevated on risperidone; decline expected after switch.', doseScheduleUnit: 'tab.',
  },

  clinicalImprints: {
    symptomsA: ['Paranoia', 'Sleep disturbance'], symptomsB: ['Restlessness'], severityHigh: 'marked', severityMid: 'moderate',
    affect: 'labile', drive: 'reduced', thoughtForm: 'mildly circumstantial', thoughtContent: 'delusional-paranoid', cognition: 'oriented',
    sleep: 'disturbed', cooperation: 'limited', insight: 'low', riskSelf: 'passive', riskOthers: 'no', aggression: 'no', suicidality: 'no',
    functioning: 'impaired', socialInteraction: 'reduced', hygieneSelfCare: 'adequate', medicationResponse: 'partial', sideEffects: 'mild akathisia',
    adherence: 'improved', differentialDiagnosisHints: ['F12.2', 'substance-induced psychosis'], uncertainty: 'Diagnosis remains uncertain',
  },

  workspace: {
    admissionHeadingPrefix: 'Admission —',
    pageHeadings: { aufnahme: 'Admission — Anna Demo', verlauf: 'Progress documentation', psychopath: 'Psychopathological findings', 'therapie-verlauf': 'Treatment course', medikation: 'Medication', therapieplanung: 'Treatment planning' },
    verlaufSections: {
      psychopathologie: 'Fluctuating mood, paranoid-mistrustful baseline, recently calmer.', stationsverhalten: 'Partially engaged in conversations, attended exercise therapy.',
      risiko: 'No acute suicidality or risk to others.', 'compliance-krankheitseinsicht': 'Currently regular intake, insight slowly increasing.',
      'medikation-vertraeglichkeit': 'Switch to aripiprazole, mild akathisia.', 'besondere-ereignisse': 'None.', somatik: 'Labs unremarkable except prolactin.', 'beurteilung-plan': 'Plan outpatient continuation.',
    },
    psychopathFree: 'Awake and fully oriented. Affect labile. Thought content paranoid. No hallucinatory experiences at time of examination.',
    therapieVerlaufBody: 'Stabilisation on antipsychotic, psychoeducation group, exercise therapy.',
    medikationBody: 'See medication plan — aripiprazole 10 mg, lorazepam PRN.', therapieplanungBody: 'Stabilisation, substance work, discharge preparation with social services.',
  },

  timelineEntries: [
    { id: 'demo-tl-1', heading: 'First episode', subheading: 'Age 22', priority: 'high', dateKind: 'age', dateValue: '22', sortKey: 1991, displayDate: '22 y', visible: true },
    { id: 'demo-tl-2', heading: 'Decompensation', subheading: 'Current', priority: 'critical', dateKind: 'ddmmyy', dateValue: '02.06.26', sortKey: 20260602, displayDate: '02 Jun 2026', visible: true },
    { id: 'demo-tl-3', heading: 'Stabilisation', subheading: 'Inpatient', priority: 'medium', dateKind: 'ddmmyy', dateValue: '10.06.26', sortKey: 20260610, displayDate: '10 Jun 2026', visible: true },
  ],

  psychotherapy: {
    therapist: 'Dr. Muster (Demo)', frequency: '1×/week', indication: 'Psychosis, low illness insight', shortTermGoal: 'Promote illness insight', mediumTermGoal: 'Relapse prevention for substance use', methodNotes: 'Individual setting', reviewProgress: 'slowly improving',
    sessions: [
      { topic: 'Psychoeducation on psychosis', intervention: 'Psychoeducation', patientReaction: 'suspicious, participating', riskAspects: 'no acute suicidality', nextFocus: 'Compliance', generatedParagraph: 'Psychoeducational individual session — patient initially suspicious.' },
      { topic: 'Discharge planning', intervention: 'Motivational interviewing', patientReaction: 'cooperative', riskAspects: 'housing security open', nextFocus: 'Outpatient linkage', generatedParagraph: 'Session on discharge planning — motivation present.' },
    ],
  },

  complementaryTherapies: [
    { name: 'Exercise therapy', frequency: '2×/week', mainGoal: 'Drive and sleep regulation', participationStatus: 'regular attendance', sessionNote: 'Attendance 45 min' },
    { name: 'Psychoeducation', frequency: '1×/week', mainGoal: 'Illness model and medication', participationStatus: 'passive' },
  ],

  weitereTherapie: [{ type: 'Sleep hygiene training', indication: 'Sleep disturbance', responsible: 'Nursing', notes: 'Structured daily routine, reduced screen time.' }],

  sozialtherapie: [
    { goal: 'Housing security until discharge', currentMeasure: 'Social services contacted landlord', responsibleRole: 'Social services' },
    { goal: 'Reintegration into IT sector', currentMeasure: 'Employment agency appointment scheduled', responsibleRole: 'Social services' },
  ],

  dokumente: { anamneseTitle: 'History — admission', anamneseContent: 'Complete admission history (demo).', verlaufTitle: 'Progress summary', medplanTitle: 'Medication plan', medplanContent: 'Aripiprazole 10 mg 1-0-0; Lorazepam 1 mg PRN', arztbriefTitle: 'Discharge letter (draft)', arztbriefContent: 'Discharge letter — demo draft with course and medication.', labDocTitlePrefix: 'Lab from' },
  generatedDocuments: { title: 'Discharge plan Anna Demo', dischargePlan: 'Outpatient follow-up, medication aripiprazole 10 mg', renderedText: 'Discharge plan for Anna Demo — demo document.' },
  calendar: { visitTitle: 'Ward round — Anna Demo', medReview: 'Medication review', psychoGroup: 'Psychoeducation group', dischargeMeeting: 'Discharge meeting with social services' },

  modulePlaceholders: {
    consultation: { title: 'Neurology consult (demo)', question: 'Clarification of headaches on antipsychotic therapy', specialty: 'Neurology', status: 'draft' },
    discussCase: { title: 'Team case discussion (demo)', purpose: 'Discharge planning and risk review', status: 'active' },
  },

  isdmDomainNotes: {
    appearance_behavior: 'Suspicious baseline posture, reduced facial expression', speech_language: 'Brief answers, occasionally hesitant', consciousness_orientation: 'Awake, oriented ×4',
    attention_concentration: 'Attention easily distracted', memory_cognition: 'Short-term memory reduced when agitated', mood_affect: 'Affect labile between anxious and irritable',
    drive_psychomotor_activity: 'Drive reduced with inner restlessness', formal_thought_disorder: 'Mildly circumstantial, occasionally tangential', thought_content: 'Paranoid interpretations of everyday events',
    delusions_overvalued_ideas: 'Persecutory and surveillance beliefs without full insight', perception_hallucinations: 'Auditory hallucinations in history; not clear at exam',
    self_experience_ego_disturbance: 'No clear passivity experiences at exam', anxiety_panic_phobic_symptoms: 'Situational anxiety in public spaces',
    somatic_preoccupation: 'Occasional somatic complaints under stress', sleep_appetite_vegetative: 'Sleep deficit, reduced appetite', substance_related_features: 'Daily cannabis, episodic amphetamine use',
    personality_interpersonal_style: 'Social withdrawal, mistrustful', insight_judgment: 'Low illness insight; judgment impaired', risk_self: 'Passive death wishes without concrete plan',
    risk_others: 'No indicators of risk to others', functional_impairment: 'Occupational and social function markedly impaired',
  },

  clinicalQuestionNotes: [
    { criterionId: 'f20.delusions', note: 'Patient reports neighbours watching her via cameras for weeks; police contacts without substantiated evidence.' },
    { criterionId: 'f20.duration_one_month', note: 'Paranoid symptoms and sleep deficit for ~5 weeks, worsening over the last 14 days.' },
    { criterionId: 'f20.exclude_organic_substance', note: 'Cannabis and amphetamine use documented, but timeline and symptom pattern extend beyond intoxication alone.' },
    { criterionId: '6a20.persistent_delusions', note: 'Persistent persecutory ideas despite lack of external confirmation; partial insight in interview.' },
  ],

  anforderungen: [
    { catalogId: 'lab-metabolisches-basis', label: 'Metabolic baseline panel', note: 'Admission labs incl. electrolytes, renal function, glucose', createdByDisplayName: 'Dr Demo (Consultant)', reviewedByDisplayName: 'Laboratory' },
    { catalogId: 'lab-prolaktin', label: 'Prolactin', note: 'On risperidone — follow-up after switch', createdByDisplayName: 'Dr Demo (Consultant)' },
    { catalogId: 'lab-aripiprazol', label: 'Aripiprazole level', note: 'Trough level after switch — confirm therapeutic range', createdByDisplayName: 'Dr Demo (Consultant)' },
    { catalogId: 'lab-hba1c', label: 'HbA1c', note: 'Metabolic monitoring on antipsychotics', createdByDisplayName: 'Dr Demo (Registrar)' },
    { catalogId: 'befund-ekg', label: 'ECG (12-lead resting)', note: 'Before antipsychotic therapy and with QT-relevant agents', createdByDisplayName: 'Dr Demo (Consultant)' },
    { catalogId: 'befund-eeg-ruhe', label: 'EEG (resting)', note: 'Work-up for psychotic symptoms and headaches', createdByDisplayName: 'Dr Demo (Consultant)' },
    { catalogId: 'therapie-sport', label: 'Exercise therapy', note: 'Drive and sleep regulation — 2×/week', createdByDisplayName: 'Therapy lead (demo)' },
    { catalogId: 'therapie-sozialdienst', label: 'Social services / case management', note: 'Discharge preparation, landlord contact', createdByDisplayName: 'Nursing (demo)' },
  ],

  eegConclusionFree: 'Mild diffuse slowing without epileptiform discharges. No evidence of focal structural pathology.',

  aiTherapy: {
    combinationCheck: {
      aripiprazoleLorazepamKb: { mainRisk: 'Additive sedation and reduced alertness', mechanism: 'Both agents have central depressant effects; benzodiazepines amplify sedating antipsychotic effects.', monitoring: 'Sedation, dizziness, fall risk; monitor respiration with high benzodiazepine doses.', clinicalManagement: 'Use lorazepam PRN at lowest effective dose; counsel on impaired driving.' },
      aripiprazoleLorazepamAi: { mainRisk: 'Increased sedation and cognitive slowing', mechanism: 'Partial D2 agonism plus GABA-A modulation — clinically relevant with concurrent use.', monitoring: 'Daytime functioning, fall log, document PRN frequency', clinicalManagement: 'Maintain PRN schedule; consider alternative anxiolysis if repeated need.', rationale: 'Plausible with concurrent antipsychotic and anxiolytic medication.' },
      aripiprazoleCannabisKb: { mainRisk: 'Possible exacerbation of psychotic symptoms with continued use', mechanism: 'Cannabinoids may counteract antipsychotic effect', monitoring: 'Psychopathology, substance use pattern', clinicalManagement: 'Substance motivation and abstinence as treatment goal' },
    },
    labMedCorrelation: {
      risperidoneProlactinKb: { labParameterLabel: 'Prolactin', zusammenhang: 'Markedly elevated prolactin on risperidone — typical D2 antagonism, hyperprolactinaemia as reason for switch.', mechanism: 'Risperidone blocks tuberoinfundibular D2 receptors → prolactin rise', recommendation: 'Switch to aripiprazole already completed; repeat prolactin in 2–4 weeks.', monitoring: 'Prolactin, clinical symptoms if applicable (galactorrhoea, libido loss)' },
      aripiprazoleCholesterolAi: { labParameterLabel: 'Total cholesterol', zusammenhang: 'Cholesterol in upper normal range — metabolic monitoring recommended with longer antipsychotic therapy.', recommendation: 'Lipid profile at follow-up, lifestyle counselling', monitoring: 'Cholesterol, triglycerides, HbA1c annually' },
      aripiprazoleProlactinAi: { labParameterLabel: 'Prolactin', zusammenhang: 'Prolactin declining on aripiprazole vs admission value — expected after switch from risperidone.', recommendation: 'Further check in 2 weeks; document clinical symptoms', monitoring: 'Prolactin trend' },
    },
    prepAiCheck: { aripiprazoleDisclaimer: 'AI-assisted market overview — verify availability and pack sizes before prescribing.', aripiprazoleAvailabilityStandard: 'Standard product in Germany', aripiprazoleAvailabilityGeneric: 'Generic available', lorazepamDisclaimer: 'AI-assisted market overview — verify controlled-drug rules and availability before prescribing.', lorazepamAvailabilityBtm: 'Controlled substance — documentation required', lorazepamAvailabilityGeneric: 'Generic', formTablets: 'Tablets' },
  },
}
