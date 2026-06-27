import type { DemoStrings } from '../types'

const ADMISSION = '2026-06-02'

export const demoStringsEn: DemoStrings = {
  verlaufSectionLabel: 'Progress note',

  aufnahme: {
    aufnahmeanlass:
      'Emergency inpatient admission via psychiatric emergency department after acute psychotic decompensation with paranoid content, alcohol withdrawal symptoms, and progressive sleep deprivation. Referred by GP after telephone consultation; no acute risk to others, but limited illness insight and elevated withdrawal risk.',
    'aktuelle-beschwerden':
      'For approximately 10–14 days: increasing inner restlessness, sleep deficit (<3 h/night), mistrust of neighbours ("being watched"), repeated police contacts without substantiated grounds. Concurrent daily alcohol use (~0.5–1 L wine/day), last consumption 18 h ago. Tremor, sweating, subjective agitation. Mood fluctuating between irritable and anxious. Appetite reduced.',
    eigenanamnese:
      'Mr Demo provides a reliable self-history once rapport is established. No relevant somatic comorbidity known. No known drug allergies.',
    'aktuelle-krankheitsanamnese':
      'First psychotic episode at age 28 in context of alcohol misuse and occupational stress, followed by brief inpatient care. Since then several outpatient phases with irregular medication adherence. Current relapse in context of sleep deprivation, alcohol withdrawal, and occupational stress (dismissal 4 months ago).',
    'psychiatrische-vorgeschichte':
      'Several pre-admission contacts; last outpatient visit 6 months ago for alcohol withdrawal. Prior diagnoses: paranoid schizophrenia (F20.0), alcohol dependence (F10.2). No suicide attempts. No prolonged involuntary commitment.',
    'somatische-anamnese':
      'Occasional epigastric discomfort with alcohol use. Liver enzymes borderline elevated in the past (GGT). No known cirrhosis. No known medication allergies.',
    suchtanamnese:
      'Alcohol since adolescence, currently ~0.5–1 L wine daily, morning consumption for "calming". Several unsuccessful outpatient withdrawal attempts. Withdrawal symptoms with longer abstinence: tremor, sweating, agitation, insomnia. Nicotine ~20 cigarettes/day. No regular illicit drug use in the last 12 months.',
    medikamentenanamnese:
      'Before admission: irregular risperidone 2 mg at night (compliance uncertain), occasional lorazepam for agitation. No regular intake in the 2 weeks before admission. No withdrawal medication.',
    familienanamnese:
      'Father with treated alcohol dependence (diagnosis uncertain). No known family history of psychosis. Mother well.',
    'biografische-anamnese':
      'Urban upbringing; secondary school qualification; retail apprenticeship. Several longer partnerships; currently single, separated from partner 8 months ago.',
    sozialanamnese:
      'Lives alone in rented flat (synthetic demo address, fictional). Unemployed for 4 months after dismissal. Financial strain; rent arrears pending. Social contact reduced; increasing isolation.',
    'schul-und-berufsanamnese':
      'Employment in retail until dismissal for absences and workplace alcohol use. Currently unemployed; employment agency appointment pending.',
    'forensische-anamnese':
      'No relevant forensic history. No pending criminal proceedings. Police contacts related to noise complaints and neighbour disputes.',
    traumaanamnese:
      'No clear trauma reported. Adolescent stressors poorly defined; possible family conflict in context of paternal alcohol use.',
    'suizid-und-selbstgefaehrdungsanamnese':
      'Passive death wishes occasionally ("sometimes peace would be good") but no concrete plans, intent, or preparation. No prior suicide attempt. Protective factors: ambivalent tie to brother; therapeutic alliance slowly forming. BRMS screen: low acute risk; safety plan discussed.',
    fremdgefaehrdungsanamnese:
      'No indicators of acute risk to others. No weapons. Occasional loud behaviour; neighbour complaints.',
    'psychopathologischer-befund':
      'Awake, oriented ×4. Contact effortful, suspicious. Affect labile, partly irritable. Thought form mildly circumstantial; content delusional-paranoid (persecutory and surveillance ideas without full insight). No clear hallucinations at examination. Drive reduced. Sleep disturbed. Illness insight low. Mild hand tremor.',
    'somatischer-befund':
      'Vitals: BP 142/88 mmHg, pulse 96/min, temp. 36.8 °C, SpO₂ 98%. Heart and lungs unremarkable. Abdomen soft, mild epigastric tenderness. Mild tremor. Brief neurological exam without focal deficit.',
    'neurologischer-befund':
      'Alert and oriented ×4. Pupils equal and reactive. No focal neurological deficits. Gait slightly unsteady with tremor, no ataxia. No meningeal signs. Reflexes symmetric.',
    'diagnostische-einschaetzung':
      'Working diagnosis: acute psychotic episode in paranoid schizophrenia (F20.0) with comorbid alcohol dependence (F10.2); differential: alcohol-induced psychosis and schizoaffective disorder. Diagnostic uncertainty — further observation and abstinence required.',
    'therapieplanung-behandlungsplan':
      'Antipsychotic stabilisation, structured alcohol withdrawal management (CIWA-Ar monitoring), benzodiazepine protocol PRN. Substance-motivation work and discharge planning with social services. Psychoeducation and progress documentation.',
  },

  verlaufFeed: [
    {
      date: `${ADMISSION}T08:30:00.000Z`,
      content:
        'Admission to ward. Patient suspicious, minimal sleep, mild tremor. Risperidone 2 mg fixed; lorazepam PRN prescribed. CIWA-Ar baseline 14 — structured withdrawal monitoring started.',
    },
    {
      date: `${ADMISSION}T14:00:00.000Z`,
      content:
        'Afternoon increasing agitation and tremor; CIWA-Ar 18. Lorazepam 1 mg once. Contact remains tense; paranoid themes present.',
    },
    {
      date: '2026-06-03T09:00:00.000Z',
      content:
        'Night sleep 4 h on lorazepam. Paranoid themes still present but less agitated. CIWA-Ar 11 — withdrawal symptoms declining.',
    },
    {
      date: '2026-06-03T16:30:00.000Z',
      content: 'Psychoeducation group attended; passive participation. Alcohol withdrawal and medication discussed.',
    },
    {
      date: '2026-06-04T09:00:00.000Z',
      pageType: 'somatic-befund',
      content: 'Somatic examination — admission (day 2)',
      somaticBefund: {
        examDate: '2026-06-04',
        generalCondition: 'Restless, mildly tremulous, awake',
        vitals: { bloodPressure: '138/86', pulse: '92', temperature: '36.7', spo2: '98', height: '178', weight: '84' },
        heart: { finding: 'normal', note: 'Regular rhythm, no murmurs' },
        lungs: { finding: 'normal' },
        abdomen: { finding: 'pathological', note: 'Mild epigastric tenderness' },
        extremities: { finding: 'pathological', note: 'Fine bilateral tremor' },
        skin: { finding: 'normal' },
        neurology: { finding: 'normal', note: 'No focal deficit' },
        supplement: 'Findings consistent with alcohol withdrawal',
      },
    },
    {
      date: '2026-06-05T09:30:00.000Z',
      content: 'Risperidone increased to 3 mg for persistent positive symptoms. CIWA-Ar 8.',
    },
    {
      date: '2026-06-05T10:30:00.000Z',
      content:
        'Admission labs (05 Jun) — prolactin markedly elevated on risperidone 3 mg; GGT borderline elevated (alcohol history); routine panel otherwise unremarkable.',
    },
    {
      date: '2026-06-06T11:00:00.000Z',
      content:
        'Individual session: patient reports reduced "surveillance" experiences; sleep 5–6 h. Motivational interview on alcohol abstinence — ambivalent but open.',
    },
    {
      date: '2026-06-07T09:00:00.000Z',
      content: 'Ward behaviour calmer. Withdrawal symptoms largely resolved. Motivation for discharge planning still low.',
    },
    {
      date: '2026-06-08T10:30:00.000Z',
      content: 'ECG unremarkable (sinus rhythm, QTc 412 ms). Meeting with social services re housing, rent arrears, and employment.',
    },
    {
      date: '2026-06-09T09:00:00.000Z',
      content:
        'Switch to aripiprazole 10 mg started (risperidone tapered) due to prolactin rise and amotivation. Alcohol abstinence since admission (day 7).',
    },
    {
      date: '2026-06-10T14:00:00.000Z',
      content: 'Exercise therapy attended twice. Mood somewhat improved. Smoking reduction discussed (nicotine 20/day).',
    },
    {
      date: '2026-06-11T09:30:00.000Z',
      content:
        'No acute suicidality. Illness insight slowly increasing. Safety plan updated. Withdrawal prophylaxis: patient declined disulfiram, open to naltrexone discussion outpatient.',
    },
    {
      date: '2026-06-11T16:00:00.000Z',
      content: 'Resting EEG (11 Jun): mild diffuse slowing; no epileptiform discharges.',
    },
    {
      date: '2026-06-12T10:00:00.000Z',
      content: 'AIMS check: mild akathisia, no dyskinesia. SAS 1/1/0. GGT declining on follow-up.',
    },
    {
      date: '2026-06-20T11:00:00.000Z',
      content:
        'Follow-up labs (20 Jun) — prolactin normalised after switch to aripiprazole; aripiprazole level in therapeutic range. Triglycerides and HbA1c borderline — continue metabolic monitoring.',
    },
    {
      date: '2026-06-13T15:00:00.000Z',
      pageType: 'somatic-befund',
      content: 'Somatic examination — follow-up (day 11)',
      somaticBefund: {
        examDate: '2026-06-13',
        generalCondition: 'Calmer, cooperative',
        vitals: { bloodPressure: '128/78', pulse: '76', temperature: '36.6', spo2: '99', weight: '83' },
        heart: { finding: 'normal' },
        lungs: { finding: 'normal' },
        abdomen: { finding: 'normal', note: 'No tenderness' },
        extremities: { finding: 'normal', note: 'Tremor resolved' },
        skin: { finding: 'normal' },
        neurology: { finding: 'normal' },
      },
    },
    {
      date: '2026-06-14T09:00:00.000Z',
      content:
        'Discharge planning: outpatient follow-up (psychiatry + addiction counselling), housing security pending, medication stabilised on aripiprazole 10 mg + lorazepam PRN. Alcohol abstinence 12 days.',
    },
  ],

  verlaufAnnotations: [
    {
      entryIndex: 0,
      anchorText: 'CIWA-Ar baseline 14',
      type: 'comment',
      comment: 'Consultant: continue structured withdrawal monitoring for first 72 h; nursing to document CIWA-Ar q4h.',
      visibility: 'team',
    },
    {
      entryIndex: 1,
      anchorText: 'CIWA-Ar 18',
      type: 'todo',
      todoText: 'Repeat CIWA-Ar at 18:00 and notify medical if score ≥15',
      priority: 'high',
      dueDate: '2026-06-02',
    },
    {
      entryIndex: 5,
      anchorText: 'Risperidone increased to 3 mg',
      type: 'comment',
      comment: 'Discussed prolactin and EPS risk with patient — partial insight, ambivalent about long-term antipsychotic.',
    },
    {
      entryIndex: 6,
      anchorText: 'prolactin markedly elevated',
      type: 'highlight',
    },
    {
      entryIndex: 10,
      anchorText: 'Switch to aripiprazole 10 mg',
      type: 'todo',
      todoText: 'Arrange addiction counselling referral before discharge',
      priority: 'normal',
      dueDate: '2026-06-16',
    },
    {
      entryIndex: 11,
      anchorText: 'Exercise therapy',
      type: 'comment',
      comment: 'OT note: good engagement; consider maintaining referral outpatient.',
      visibility: 'team',
    },
    {
      entryIndex: 14,
      anchorText: 'AIMS check',
      type: 'todo',
      todoText: 'Repeat AIMS at 2-week outpatient follow-up',
      priority: 'normal',
      dueDate: '2026-06-26',
    },
    {
      entryIndex: 17,
      anchorText: 'Discharge planning',
      type: 'comment',
      comment: 'Brother listed as protective contact; social services housing letter pending.',
    },
    {
      entryIndex: 9,
      anchorText: 'social services',
      type: 'todo',
      todoText: 'Confirm landlord payment plan with social services',
      priority: 'high',
      dueDate: '2026-06-12',
      done: true,
    },
  ],

  labGraphNotes: {
    prolactin0: 'Elevated on risperidone',
    prolactin1: 'Normalised after switch',
    triglycerides1: 'Mildly elevated',
    hba1c1: 'Borderline',
    aripiprazole0: 'Not yet therapeutic (pre-switch)',
    aripiprazole1: 'Therapeutic range',
  },
  laborBefundLabels: {
    admission: 'Admission — risperidone 3 mg',
    followup: 'Follow-up — aripiprazole 10 mg',
    anthro: 'Anthropometrics — trend',
    glucose: 'Fasting glucose — interim check',
  },
  laborBefundHeaderPrefix: 'Lab report',
  labGraphTitle: 'Lab trends',
  timelineTitle: 'Illness course',
  medMarkerNotes: { increased: 'Dose increase', started: 'Switch' },

  labGraphParams: [
    { parameter: 'Leukocytes', v1: 7.2, v2: 6.9, refLow: 4.0, refHigh: 10.0, unit: 'G/l' },
    { parameter: 'Haemoglobin', v1: 14.1, v2: 14.3, refLow: 13.5, refHigh: 17.5, unit: 'g/dl' },
    { parameter: 'AST', v1: 28, v2: 22, refLow: 0, refHigh: 35, unit: 'U/l' },
    { parameter: 'ALT', v1: 38, v2: 29, refLow: 0, refHigh: 45, unit: 'U/l' },
    { parameter: 'GGT', v1: 52, v2: 36, refLow: 0, refHigh: 55, unit: 'U/l' },
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
    { icd10Label: 'Paranoid schizophrenia', icd11Label: 'Schizophrenia, paranoid type', dsmLabel: 'Schizophrenia, paranoid type' },
    { icd10Label: 'Mental and behavioural disorders due to use of alcohol: dependence syndrome', icd11Label: 'Alcohol dependence', dsmLabel: 'Alcohol use disorder, severe' },
    { icd10Label: 'Mental and behavioural disorders due to use of tobacco: dependence syndrome', icd11Label: 'Nicotine dependence', dsmLabel: 'Tobacco use disorder, severe' },
  ],

  medication: {
    aripiprazole: {
      substance: 'Aripiprazole',
      indication: 'Antipsychotic stabilisation',
      reasonForChange: 'Switch from risperidone due to hyperprolactinaemia',
      sideEffects: ['mild akathisia'],
      adherenceNote: 'Morning dosing, currently regular',
      doseLine: 'Aripiprazole 10-0-0-0 mg',
      historyStartNote: 'Started after risperidone taper',
      historySnapshotReason: 'Switch',
    },
    risperidone: {
      substance: 'Risperidone',
      indication: 'Acute psychosis',
      reasonForChange: 'Tapered in favour of aripiprazole',
      sideEffects: ['prolactin elevation', 'amotivation'],
      adherenceNote: '',
      doseLine: 'Risperidone 0-0-3-0 mg (tapered off)',
      historyStartNote: '',
      historySnapshotReason: '',
    },
    lorazepam: {
      substance: 'Lorazepam',
      indication: 'Acute agitation / alcohol withdrawal',
      reasonForChange: '',
      sideEffects: [],
      adherenceNote: 'Rarely requested, last used 3 days ago',
      doseLine: 'Lorazepam 1 mg as needed (max. 2 mg/24 h)',
      historyStartNote: '',
      historySnapshotReason: '',
    },
    sideEffectReport: {
      symptom: 'Akathisia',
      severity: 'mild',
      temporalRelation: 'Days after switch to aripiprazole',
      actionTaken: 'Observation, dose adjustment if needed',
      outcome: 'stable',
      note: 'AIMS/SAS documented — no dyskinesia',
    },
    labCorrelationNotes: 'Prolactin elevated on risperidone; decline expected after switch. GGT elevated at admission (alcohol).',
    doseScheduleUnit: 'tab.',
  },

  clinicalImprints: {
    symptomsA: ['Paranoia', 'Sleep disturbance', 'Alcohol withdrawal'],
    symptomsB: ['Restlessness', 'Tremor'],
    severityHigh: 'marked',
    severityMid: 'moderate',
    affect: 'labile',
    drive: 'reduced',
    thoughtForm: 'mildly circumstantial',
    thoughtContent: 'delusional-paranoid',
    cognition: 'oriented',
    sleep: 'disturbed',
    cooperation: 'limited',
    insight: 'low',
    riskSelf: 'passive',
    riskOthers: 'no',
    aggression: 'no',
    suicidality: 'no',
    functioning: 'impaired',
    socialInteraction: 'reduced',
    hygieneSelfCare: 'adequate',
    medicationResponse: 'partial',
    sideEffects: 'mild akathisia',
    adherence: 'improved',
    differentialDiagnosisHints: ['F10.5', 'alcohol-induced psychosis'],
    uncertainty: 'Diagnosis remains uncertain — observe abstinence',
  },

  workspace: {
    admissionHeadingPrefix: 'Admission —',
    pageHeadings: {
      aufnahme: 'Admission — Nikolaos Demo',
      verlauf: 'Progress documentation',
      psychopath: 'Psychopathological findings',
      'therapie-verlauf': 'Treatment course',
      medikation: 'Medication',
      therapieplanung: 'Treatment planning',
    },
    verlaufSections: {
      psychopathologie: 'Fluctuating mood, paranoid-mistrustful baseline, recently calmer. Withdrawal symptoms declining.',
      stationsverhalten: 'Partially engaged in conversations, attended exercise therapy.',
      risiko: 'No acute suicidality or risk to others. Withdrawal risk monitored.',
      'compliance-krankheitseinsicht': 'Currently regular intake, insight slowly increasing. Alcohol abstinence since admission.',
      'medikation-vertraeglichkeit': 'Switch to aripiprazole, mild akathisia.',
      'besondere-ereignisse': 'None.',
      somatik: 'GGT elevated at admission, declining on follow-up. Prolactin normalised after switch.',
      'beurteilung-plan': 'Plan outpatient continuation; link addiction counselling.',
    },
    psychopathFree:
      'Awake and fully oriented. Affect labile. Thought content paranoid. No hallucinatory experiences at time of examination. Mild tremor.',
    therapieVerlaufBody:
      'Stabilisation on antipsychotic, structured alcohol withdrawal management, psychoeducation group, exercise therapy.',
    medikationBody: 'See medication plan — aripiprazole 10 mg, lorazepam PRN.',
    therapieplanungBody: 'Stabilisation, alcohol use work, discharge preparation with social services.',
  },

  timelineEntries: [
    { id: 'demo-tl-1', heading: 'First psychotic episode', subheading: 'Age 28', priority: 'high', dateKind: 'age', dateValue: '28', sortKey: 2013, displayDate: '28 y', visible: true },
    { id: 'demo-tl-2', heading: 'Alcohol dependence diagnosed', subheading: 'Outpatient', priority: 'medium', dateKind: 'age', dateValue: '32', sortKey: 2017, displayDate: '32 y', visible: true },
    { id: 'demo-tl-3', heading: 'Decompensation', subheading: 'Current', priority: 'critical', dateKind: 'ddmmyy', dateValue: '02.06.26', sortKey: 20260602, displayDate: '02 Jun 2026', visible: true },
    { id: 'demo-tl-4', heading: 'Stabilisation', subheading: 'Inpatient', priority: 'medium', dateKind: 'ddmmyy', dateValue: '10.06.26', sortKey: 20260610, displayDate: '10 Jun 2026', visible: true },
  ],

  psychotherapy: {
    therapist: 'Dr. Muster (Demo)',
    frequency: '1×/week',
    indication: 'Psychosis, alcohol dependence, low illness insight',
    shortTermGoal: 'Promote illness insight and stabilise abstinence',
    mediumTermGoal: 'Relapse prevention for alcohol and psychosis',
    methodNotes: 'Individual setting, motivational interviewing',
    reviewProgress: 'slowly improving',
    sessions: [
      {
        topic: 'Psychoeducation on psychosis and addiction',
        intervention: 'Psychoeducation',
        patientReaction: 'suspicious, participating',
        riskAspects: 'no acute suicidality',
        nextFocus: 'Compliance and abstinence',
        generatedParagraph:
          'Psychoeducational individual session — patient initially suspicious, absorbed information on alcohol–psychosis interaction.',
      },
      {
        topic: 'Discharge planning and addiction counselling',
        intervention: 'Motivational interviewing',
        patientReaction: 'cooperative',
        riskAspects: 'housing security open, alcohol relapse risk',
        nextFocus: 'Outpatient addiction service linkage',
        generatedParagraph:
          'Session on discharge planning — motivation for abstinence present, ambivalent about long-term addiction therapy.',
      },
    ],
  },

  complementaryTherapies: [
    { name: 'Exercise therapy', frequency: '2×/week', mainGoal: 'Drive and sleep regulation', participationStatus: 'regular attendance', sessionNote: 'Attendance 45 min' },
    { name: 'Psychoeducation', frequency: '1×/week', mainGoal: 'Illness model, medication, and addiction', participationStatus: 'passive' },
    { name: 'Relaxation training', frequency: '1×/week', mainGoal: 'Reduce withdrawal-related anxiety', participationStatus: 'occasional' },
  ],

  weitereTherapie: [
    { type: 'Sleep hygiene training', indication: 'Sleep disturbance', responsible: 'Nursing', notes: 'Structured daily routine, reduced screen time.' },
    { type: 'Inpatient addiction group', indication: 'Alcohol dependence', responsible: 'Addiction counselling', notes: 'Group session attendance planned.' },
  ],

  sozialtherapie: [
    { goal: 'Housing security until discharge', currentMeasure: 'Social services contacted landlord re rent arrears', responsibleRole: 'Social services' },
    { goal: 'Reintegration into retail sector', currentMeasure: 'Employment agency appointment scheduled', responsibleRole: 'Social services' },
    { goal: 'Outpatient addiction counselling', currentMeasure: 'Referral to addiction service prepared', responsibleRole: 'Psychiatry' },
  ],

  dokumente: {
    anamneseTitle: 'History — admission',
    anamneseContent: 'Complete admission history (demo) — paranoid schizophrenia with alcohol dependence.',
    verlaufTitle: 'Progress summary',
    medplanTitle: 'Medication plan',
    medplanContent: 'Aripiprazole 10 mg 1-0-0; Lorazepam 1 mg PRN',
    arztbriefTitle: 'Discharge letter (draft)',
    arztbriefContent: 'Discharge letter — demo draft with course, medication, and addiction counselling.',
    labDocTitlePrefix: 'Lab from',
  },
  generatedDocuments: {
    title: 'Discharge plan Nikolaos Demo',
    dischargePlan: 'Outpatient follow-up psychiatry + addiction counselling, medication aripiprazole 10 mg',
    renderedText: 'Discharge plan for Nikolaos Demo — demo document.',
  },
  calendar: {
    visitTitle: 'Ward round — Nikolaos Demo',
    medReview: 'Medication review',
    psychoGroup: 'Psychoeducation group',
    dischargeMeeting: 'Discharge meeting with social services',
  },

  modulePlaceholders: {
    consultation: {
      title: 'Internal medicine consult (demo)',
      question: 'Clarification of liver enzymes and alcohol withdrawal management',
      specialty: 'Internal medicine',
      status: 'draft',
    },
    discussCase: {
      title: 'Team case discussion (demo)',
      purpose: 'Discharge planning, addiction counselling, and risk review',
      status: 'active',
    },
  },

  isdmDomainNotes: {
    appearance_behavior: 'Suspicious baseline posture, reduced facial expression, mild tremor',
    speech_language: 'Brief answers, occasionally hesitant',
    consciousness_orientation: 'Awake, oriented ×4',
    attention_concentration: 'Attention easily distracted',
    memory_cognition: 'Short-term memory reduced when agitated',
    mood_affect: 'Affect labile between anxious and irritable',
    drive_psychomotor_activity: 'Drive reduced with inner restlessness',
    formal_thought_disorder: 'Mildly circumstantial, occasionally tangential',
    thought_content: 'Paranoid interpretations of everyday events',
    delusions_overvalued_ideas: 'Persecutory and surveillance beliefs without full insight',
    perception_hallucinations: 'Auditory hallucinations in history; not clear at exam',
    self_experience_ego_disturbance: 'No clear passivity experiences at exam',
    anxiety_panic_phobic_symptoms: 'Situational anxiety in public spaces',
    somatic_preoccupation: 'Occasional somatic complaints under stress and withdrawal',
    sleep_appetite_vegetative: 'Sleep deficit, reduced appetite',
    substance_related_features: 'Daily alcohol until admission, nicotine 20/day, withdrawal symptoms',
    personality_interpersonal_style: 'Social withdrawal, mistrustful',
    insight_judgment: 'Low illness insight; judgment impaired',
    risk_self: 'Passive death wishes without concrete plan',
    risk_others: 'No indicators of risk to others',
    functional_impairment: 'Occupational and social function markedly impaired',
  },

  clinicalQuestionNotes: [
    { criterionId: 'f20.delusions', note: 'Patient reports neighbours watching him via cameras for weeks; police contacts without substantiated evidence.' },
    { criterionId: 'f20.duration_one_month', note: 'Paranoid symptoms and sleep deficit for ~5 weeks, worsening over the last 14 days.' },
    { criterionId: 'f20.exclude_organic_substance', note: 'Alcohol dependence documented; symptom course extends beyond intoxication alone; abstinence since admission without full psychosis remission.' },
    { criterionId: '6a20.persistent_delusions', note: 'Persistent persecutory ideas despite lack of external confirmation; partial insight in interview.' },
  ],

  anforderungen: [
    { catalogId: 'lab-metabolisches-basis', label: 'Metabolic baseline panel', note: 'Admission labs incl. electrolytes, renal function, glucose, liver enzymes', createdByDisplayName: 'Dr Demo (Consultant)', reviewedByDisplayName: 'Laboratory' },
    { catalogId: 'lab-prolaktin', label: 'Prolactin', note: 'On risperidone — follow-up after switch', createdByDisplayName: 'Dr Demo (Consultant)' },
    { catalogId: 'lab-aripiprazol', label: 'Aripiprazole level', note: 'Trough level after switch — confirm therapeutic range', createdByDisplayName: 'Dr Demo (Consultant)' },
    { catalogId: 'lab-hba1c', label: 'HbA1c', note: 'Metabolic monitoring on antipsychotics', createdByDisplayName: 'Dr Demo (Registrar)' },
    { catalogId: 'lab-ggt', label: 'GGT', note: 'Follow-up with alcohol history', createdByDisplayName: 'Dr Demo (Consultant)' },
    { catalogId: 'befund-ekg', label: 'ECG (12-lead resting)', note: 'Before antipsychotic therapy and QT monitoring', createdByDisplayName: 'Dr Demo (Consultant)' },
    { catalogId: 'befund-eeg-ruhe', label: 'EEG (resting)', note: 'Work-up for psychotic symptoms', createdByDisplayName: 'Dr Demo (Consultant)' },
    { catalogId: 'therapie-sport', label: 'Exercise therapy', note: 'Drive and sleep regulation — 2×/week', createdByDisplayName: 'Therapy lead (demo)' },
    { catalogId: 'therapie-sozialdienst', label: 'Social services / case management', note: 'Discharge preparation, landlord contact, addiction referral', createdByDisplayName: 'Nursing (demo)' },
  ],

  eegConclusionFree: 'Mild diffuse slowing without epileptiform discharges. No evidence of focal structural pathology.',

  aiTherapy: {
    combinationCheck: {
      aripiprazoleLorazepamKb: {
        mainRisk: 'Additive sedation and reduced alertness',
        mechanism: 'Both agents have central depressant effects; benzodiazepines amplify sedating antipsychotic effects.',
        monitoring: 'Sedation, dizziness, fall risk; monitor respiration with high benzodiazepine doses',
        clinicalManagement: 'Use lorazepam PRN at lowest effective dose; counsel on impaired driving.',
      },
      aripiprazoleLorazepamAi: {
        mainRisk: 'Increased sedation and cognitive slowing',
        mechanism: 'Partial D2 agonism plus GABA-A modulation — clinically relevant with concurrent use.',
        monitoring: 'Daytime functioning, fall log, document PRN frequency',
        clinicalManagement: 'Maintain PRN schedule; consider alternative anxiolysis if repeated need.',
        rationale: 'Plausible with concurrent antipsychotic and anxiolytic medication.',
      },
      aripiprazoleCannabisKb: {
        mainRisk: 'Alcohol use may counteract antipsychotic effect and mask withdrawal',
        mechanism: 'Alcohol acts on GABAergic system and can destabilise psychosis',
        monitoring: 'Psychopathology, CIWA-Ar, consumption pattern',
        clinicalManagement: 'Substance motivation and abstinence as treatment goal; link addiction counselling',
      },
    },
    labMedCorrelation: {
      risperidoneProlactinKb: {
        labParameterLabel: 'Prolactin',
        zusammenhang: 'Markedly elevated prolactin on risperidone — typical D2 antagonism, hyperprolactinaemia as reason for switch.',
        mechanism: 'Risperidone blocks tuberoinfundibular D2 receptors → prolactin rise',
        recommendation: 'Switch to aripiprazole already completed; repeat prolactin in 2–4 weeks.',
        monitoring: 'Prolactin, clinical symptoms if applicable (galactorrhoea, libido loss)',
      },
      aripiprazoleCholesterolAi: {
        labParameterLabel: 'Total cholesterol',
        zusammenhang: 'Cholesterol in upper normal range — metabolic monitoring recommended with longer antipsychotic therapy.',
        recommendation: 'Lipid profile at follow-up, lifestyle counselling',
        monitoring: 'Cholesterol, triglycerides, HbA1c annually',
      },
      aripiprazoleProlactinAi: {
        labParameterLabel: 'Prolactin',
        zusammenhang: 'Prolactin declining on aripiprazole vs admission value — expected after switch from risperidone.',
        recommendation: 'Further check in 2 weeks; document clinical symptoms',
        monitoring: 'Prolactin trend',
      },
    },
    prepAiCheck: {
      aripiprazoleDisclaimer: 'AI-assisted market overview — verify availability and pack sizes before prescribing.',
      aripiprazoleAvailabilityStandard: 'Standard product available',
      aripiprazoleAvailabilityGeneric: 'Generic available',
      lorazepamDisclaimer: 'AI-assisted market overview — verify controlled-drug rules and availability before prescribing.',
      lorazepamAvailabilityBtm: 'Controlled substance — documentation required',
      lorazepamAvailabilityGeneric: 'Generic',
      formTablets: 'Tablets',
    },
  },
}
