import type {
  AnforderungCatalogItem,
  AnforderungCategory,
  AnforderungUrgency,
} from '../types/anforderung'

function lab(
  id: string,
  groupKey: string,
  label_de: string,
  label_en: string,
  opts?: {
    defaultUrgency?: AnforderungUrgency
    requiresAcceptance?: boolean
  },
): AnforderungCatalogItem {
  return {
    id,
    category: 'labor',
    groupKey,
    label_de,
    label_en,
    label_fr: label_en,
    label_es: label_en,
    defaultUrgency: opts?.defaultUrgency ?? 'routine',
    requiresAcceptance: opts?.requiresAcceptance ?? false,
    resultLink: 'labor',
  }
}

function befunde(
  id: string,
  groupKey: string,
  label_de: string,
  label_en: string,
  opts?: {
    defaultUrgency?: AnforderungUrgency
    requiresAcceptance?: boolean
    resultLink?: AnforderungCatalogItem['resultLink']
  },
): AnforderungCatalogItem {
  return {
    id,
    category: 'befunde',
    groupKey,
    label_de,
    label_en,
    label_fr: label_en,
    label_es: label_en,
    defaultUrgency: opts?.defaultUrgency ?? 'routine',
    requiresAcceptance: opts?.requiresAcceptance ?? false,
    resultLink: opts?.resultLink,
  }
}

function therapie(
  id: string,
  groupKey: string,
  label_de: string,
  label_en: string,
  opts?: {
    defaultUrgency?: AnforderungUrgency
    requiresAcceptance?: boolean
  },
): AnforderungCatalogItem {
  return {
    id,
    category: 'therapien',
    groupKey,
    label_de,
    label_en,
    label_fr: label_en,
    label_es: label_en,
    defaultUrgency: opts?.defaultUrgency ?? 'routine',
    requiresAcceptance: opts?.requiresAcceptance ?? true,
  }
}

function sonstiges(
  id: string,
  groupKey: string,
  label_de: string,
  label_en: string,
  opts?: {
    defaultUrgency?: AnforderungUrgency
    requiresAcceptance?: boolean
  },
): AnforderungCatalogItem {
  return {
    id,
    category: 'sonstiges',
    groupKey,
    label_de,
    label_en,
    label_fr: label_en,
    label_es: label_en,
    defaultUrgency: opts?.defaultUrgency ?? 'routine',
    requiresAcceptance: opts?.requiresAcceptance ?? true,
  }
}

/** Comprehensive psychiatry-relevant order catalog — licensing-safe original labels. */
export const ANFORDERUNGEN_CATALOG: AnforderungCatalogItem[] = [
  // —— Labor: Basis / Stoffwechsel ——
  lab('lab-metabolisches-basis', 'labor_basis', 'Metabolisches Basislabor', 'Basic metabolic panel'),
  lab('lab-natrium', 'labor_basis', 'Natrium', 'Sodium'),
  lab('lab-kalium', 'labor_basis', 'Kalium', 'Potassium'),
  lab('lab-calcium', 'labor_basis', 'Calcium', 'Calcium'),
  lab('lab-magnesium', 'labor_basis', 'Magnesium', 'Magnesium'),
  lab('lab-phosphat', 'labor_basis', 'Phosphat', 'Phosphate'),
  lab('lab-glucose-nuechtern', 'labor_basis', 'Glucose nüchtern', 'Fasting glucose'),
  lab('lab-hba1c', 'labor_basis', 'HbA1c', 'HbA1c'),
  lab('lab-creatinin-egfr', 'labor_basis', 'Creatinin / eGFR', 'Creatinine / eGFR'),
  lab('lab-harnstoff', 'labor_basis', 'Harnstoff / BUN', 'Urea / BUN'),
  lab('lab-urinsediment', 'labor_basis', 'Urinsediment', 'Urinalysis sediment'),

  // —— Labor: Blutbild ——
  lab('lab-cbc', 'labor_blutbild', 'Großes Blutbild', 'Complete blood count'),
  lab('lab-haemoglobin', 'labor_blutbild', 'Hämoglobin', 'Haemoglobin'),
  lab('lab-leukozyten', 'labor_blutbild', 'Leukozyten', 'White blood cells'),
  lab('lab-thrombozyten', 'labor_blutbild', 'Thrombozyten', 'Platelets'),
  lab('lab-mcv-mch', 'labor_blutbild', 'MCV / MCH / MCHC', 'MCV / MCH / MCHC'),
  lab('lab-retikulozyten', 'labor_blutbild', 'Retikulozyten', 'Reticulocytes'),

  // —— Labor: Leber ——
  lab('lab-leberenzyme', 'labor_leber', 'Leberenzyme (ALT, AST, GGT, AP)', 'Liver enzymes (ALT, AST, GGT, ALP)'),
  lab('lab-bilirubin', 'labor_leber', 'Bilirubin gesamt / direkt', 'Total / direct bilirubin'),
  lab('lab-albumin', 'labor_leber', 'Albumin', 'Albumin'),
  lab('lab-quick-inr', 'labor_leber', 'Quick / INR', 'PT / INR'),

  // —— Labor: Schilddrüse ——
  lab('lab-tsh', 'labor_schilddruese', 'TSH', 'TSH'),
  lab('lab-ft3-ft4', 'labor_schilddruese', 'fT3 / fT4', 'Free T3 / T4'),
  lab('lab-tpo-ak', 'labor_schilddruese', 'TPO-Antikörper', 'TPO antibodies'),

  // —— Labor: Lipide ——
  lab('lab-lipidprofil', 'labor_lipide', 'Lipidprofil (Chol, LDL, HDL, TG)', 'Lipid panel'),
  lab('lab-triglyceride', 'labor_lipide', 'Triglyceride', 'Triglycerides'),

  // —— Labor: Elektrolyte / Nieren ——
  lab('lab-osmolalitaet', 'labor_niere', 'Serumosmolalität', 'Serum osmolality'),
  lab('lab-cystatin-c', 'labor_niere', 'Cystatin C', 'Cystatin C'),

  // —— Labor: Entzündung ——
  lab('lab-crp', 'labor_entzuendung', 'CRP', 'CRP'),
  lab('lab-bsg', 'labor_entzuendung', 'BSG', 'ESR'),
  lab('lab-procalcitonin', 'labor_entzuendung', 'Procalcitonin', 'Procalcitonin', {
    defaultUrgency: 'urgent',
  }),

  // —— Labor: Vitamine / Spurenelemente ——
  lab('lab-vitamin-d', 'labor_vitamine', 'Vitamin D (25-OH)', 'Vitamin D (25-OH)'),
  lab('lab-vitamin-b12', 'labor_vitamine', 'Vitamin B12', 'Vitamin B12'),
  lab('lab-folsaeure', 'labor_vitamine', 'Folsäure', 'Folate'),
  lab('lab-eisen-status', 'labor_vitamine', 'Eisenstatus (Ferritin, Transferrin)', 'Iron studies'),
  lab('lab-zink', 'labor_vitamine', 'Zink', 'Zinc'),
  lab('lab-kupfer', 'labor_vitamine', 'Kupfer / Ceruloplasmin', 'Copper / caeruloplasmin'),

  // —— Labor: Hormone / Endokrin ——
  lab('lab-prolaktin', 'labor_hormone', 'Prolaktin', 'Prolactin'),
  lab('lab-cortisol', 'labor_hormone', 'Cortisol (morgens)', 'Morning cortisol'),
  lab('lab-acth', 'labor_hormone', 'ACTH', 'ACTH'),
  lab('lab-testosteron', 'labor_hormone', 'Testosteron', 'Testosterone'),
  lab('lab-oestradiol', 'labor_hormone', 'Östradiol', 'Oestradiol'),
  lab('lab-lh-fsh', 'labor_hormone', 'LH / FSH', 'LH / FSH'),
  lab('lab-hcg', 'labor_hormone', 'β-hCG', 'β-hCG', { defaultUrgency: 'soon' }),

  // —— Labor: Medikamentenspiegel ——
  lab('lab-lithium', 'labor_spiegel', 'Lithiumspiegel', 'Lithium level', {
    defaultUrgency: 'soon',
  }),
  lab('lab-valproat', 'labor_spiegel', 'Valproatspiegel', 'Valproate level', {
    defaultUrgency: 'soon',
  }),
  lab('lab-carbamazepin', 'labor_spiegel', 'Carbamazepinspiegel', 'Carbamazepin level', {
    defaultUrgency: 'soon',
  }),
  lab('lab-clozapin', 'labor_spiegel', 'Clozapinspiegel (inkl. Norclozapin)', 'Clozapine level', {
    defaultUrgency: 'soon',
  }),
  lab('lab-olanzapin', 'labor_spiegel', 'Olanzapinspiegel', 'Olanzapine level'),
  lab('lab-quetiapin', 'labor_spiegel', 'Quetiapinspiegel', 'Quetiapine level'),
  lab('lab-aripiprazol', 'labor_spiegel', 'Aripiprazolspiegel', 'Aripiprazole level'),
  lab('lab-lamotrigin', 'labor_spiegel', 'Lamotriginspiegel', 'Lamotrigine level'),
  lab('lab-vortioxetin', 'labor_spiegel', 'Vortioxetinspiegel', 'Vortioxetin level'),

  // —— Labor: Toxikologie ——
  lab('lab-urin-drogenscreen', 'labor_tox', 'Urin-Drogenscreening', 'Urine drug screen'),
  lab('lab-alkohol', 'labor_tox', 'Blutalkohol / CDT / GGT', 'Blood alcohol / CDT'),
  lab('lab-paracetamol', 'labor_tox', 'Paracetamolspiegel', 'Paracetamol level', {
    defaultUrgency: 'urgent',
  }),
  lab('lab-salicylat', 'labor_tox', 'Salicylatspiegel', 'Salicylate level', {
    defaultUrgency: 'urgent',
  }),

  // —— Labor: Infektionsserologie ——
  lab('lab-hiv', 'labor_serologie', 'HIV-Serologie', 'HIV serology'),
  lab('lab-hepatitis-panel', 'labor_serologie', 'Hepatitis-Serologie (A/B/C)', 'Hepatitis serology'),
  lab('lab-syphilis', 'labor_serologie', 'Syphilis-Serologie', 'Syphilis serology'),

  // —— Labor: Autoimmun / Spezial ——
  lab('lab-ana', 'labor_autoimmun', 'ANA', 'ANA'),
  lab('lab-anca', 'labor_autoimmun', 'ANCA', 'ANCA'),
  lab('lab-lp', 'labor_spezial', 'Liquor (Zellzahl, Protein, Glucose, Laktat)', 'CSF panel', {
    defaultUrgency: 'soon',
  }),
  lab('lab-ammoniak', 'labor_spezial', 'Ammoniak', 'Ammonia', { defaultUrgency: 'urgent' }),
  lab('lab-ck', 'labor_spezial', 'Creatinkinase (CK)', 'Creatine kinase'),
  lab('lab-ck-mb', 'labor_spezial', 'CK-MB / Troponin', 'CK-MB / troponin', {
    defaultUrgency: 'urgent',
  }),

  // —— Befunde: Kardio ——
  befunde('befund-ekg', 'befunde_kardio', 'EKG (12-Kanal-Ruhe)', '12-lead resting ECG', {
    resultLink: 'ecg',
  }),
  befunde('befund-ekg-langzeit', 'befunde_kardio', 'Langzeit-EKG (24–72 h)', 'Long-term ECG (24–72 h)'),
  befunde('befund-ekg-belastung', 'befunde_kardio', 'Belastungs-EKG', 'Exercise ECG'),
  befunde('befund-echo', 'befunde_kardio', 'Echokardiographie', 'Echocardiography'),

  // —— Befunde: Neurophysiologie ——
  befunde('befund-eeg-ruhe', 'befunde_neurophys', 'EEG (Ruhe)', 'Resting EEG', { resultLink: 'eeg' }),
  befunde('befund-eeg-schlaf', 'befunde_neurophys', 'Schlaf-EEG', 'Sleep EEG', { resultLink: 'eeg' }),
  befunde('befund-eeg-video', 'befunde_neurophys', 'Langzeit-Video-EEG', 'Long-term video EEG', {
    resultLink: 'eeg',
  }),
  befunde('befund-evoziert', 'befunde_neurophys', 'Evozierte Potenziale (SEP/VEP/AEP)', 'Evoked potentials'),
  befunde('befund-emg', 'befunde_neurophys', 'EMG / Nervenleitgeschwindigkeit', 'EMG / nerve conduction'),

  // —— Befunde: Bildgebung ——
  befunde('befund-mrt-schaedel', 'befunde_bildgebung', 'MRT Schädel (nativ)', 'Brain MRI (native)'),
  befunde('befund-mrt-schaedel-km', 'befunde_bildgebung', 'MRT Schädel mit Kontrast', 'Contrast-enhanced brain MRI'),
  befunde('befund-ct-schaedel', 'befunde_bildgebung', 'CT Schädel', 'Head CT'),
  befunde('befund-mrt-gesamt', 'befunde_bildgebung', 'MRT Gesamt (psychiatrisch relevant)', 'Whole-body MRI'),
  befunde('befund-ct-thorax', 'befunde_bildgebung', 'CT Thorax', 'Chest CT'),
  befunde('befund-roentgen-thorax', 'befunde_bildgebung', 'Röntgen Thorax', 'Chest X-ray'),
  befunde('befund-duplex-carotis', 'befunde_bildgebung', 'Duplexsonographie Carotiden', 'Carotid duplex ultrasound'),

  // —— Befunde: Schlaf / Neuropsych ——
  befunde('befund-schlaf-poly', 'befunde_schlaf', 'Polygraphische Schlafdiagnostik', 'Polygraphic sleep study'),
  befunde('befund-schlaf-polysomno', 'befunde_schlaf', 'Polysomnographie', 'Polysomnography'),
  befunde('befund-mslt', 'befunde_schlaf', 'MSLT (Multiple Sleep Latency Test)', 'Multiple sleep latency test'),
  befunde('befund-neuropsych', 'befunde_neuropsych', 'Neuropsychologische Testung', 'Neuropsychological testing'),
  befunde('befund-neuropsych-kurz', 'befunde_neuropsych', 'Kurzscreening Kognition (MoCA/MMSE)', 'Cognitive screening (MoCA/MMSE)'),

  // —— Therapien ——
  therapie('therapie-psychotherapie-vt', 'therapie_psych', 'Psychotherapie — Verhaltenstherapie', 'Psychotherapy — CBT'),
  therapie('therapie-psychotherapie-tp', 'therapie_psych', 'Psychotherapie — Tiefenpsychologisch', 'Psychotherapy — psychodynamic'),
  therapie('therapie-psychotherapie-st', 'therapie_psych', 'Psychotherapie — Systemisch', 'Psychotherapy — systemic'),
  therapie('therapie-psychotherapie-trauma', 'therapie_psych', 'Traumafokussierte Psychotherapie', 'Trauma-focused psychotherapy'),
  therapie('therapie-psychotherapie-ambulant', 'therapie_psych', 'Ambulante Psychotherapie (Überweisung)', 'Outpatient psychotherapy referral'),
  therapie('therapie-ergotherapie', 'therapie_allied', 'Ergotherapie', 'Occupational therapy'),
  therapie('therapie-physiotherapie', 'therapie_allied', 'Physiotherapie', 'Physiotherapy'),
  therapie('therapie-sport', 'therapie_allied', 'Sporttherapie / Bewegungstherapie', 'Exercise / sports therapy'),
  therapie('therapie-musik', 'therapie_allied', 'Musiktherapie', 'Music therapy'),
  therapie('therapie-kunst', 'therapie_allied', 'Kunsttherapie', 'Art therapy'),
  therapie('therapie-sozial', 'therapie_sozial', 'Sozialtherapie', 'Social therapy'),
  therapie('therapie-sozialdienst', 'therapie_sozial', 'Sozialdienst / Case Management', 'Social work / case management'),
  therapie('therapie-angehoerige', 'therapie_sozial', 'Angehörigenarbeit / Psychoedukation', 'Family work / psychoeducation'),
  therapie('therapie-gruppe', 'therapie_gruppe', 'Gruppentherapie (allgemein)', 'Group therapy'),
  therapie('therapie-skillgruppe', 'therapie_gruppe', 'Skills- / DBT-Gruppe', 'Skills / DBT group'),
  therapie('therapie-suchtgruppe', 'therapie_gruppe', 'Suchtgruppe', 'Addiction group therapy'),
  therapie('therapie-med-neubewertung', 'therapie_med', 'Medikamenten-Neubewertung / Umstellung', 'Medication review / adjustment'),
  therapie('therapie-med-titration', 'therapie_med', 'Medikamenten-Titration / Aufdosierung', 'Medication titration'),
  therapie('therapie-med-absetzen', 'therapie_med', 'Medikamenten-Reduktion / Absetzplan', 'Medication taper / discontinuation'),
  therapie('therapie-ti-start', 'therapie_med', 'Therapeutische Medikation — Therapiebeginn', 'Therapeutic medication initiation'),
  therapie('therapie-krisenintervention', 'therapie_krisen', 'Krisenintervention', 'Crisis intervention', {
    defaultUrgency: 'urgent',
  }),
  therapie('therapie-entlassung', 'therapie_krisen', 'Entlassungsmanagement / Nachsorgeplanung', 'Discharge planning / aftercare'),

  // —— Sonstiges ——
  sonstiges('sonst-pflegevisite', 'sonst_pflege', 'Pflegevisite / Pflegebeobachtung', 'Nursing visit / observation'),
  sonstiges('sonst-sturzprotokoll', 'sonst_pflege', 'Sturzprotokoll / Sturzrisiko-Assessment', 'Fall risk assessment'),
  sonstiges('sonst-kollateral', 'sonst_kontakt', 'Kollaterale Anamnese (Angehörige / Bezugsperson)', 'Collateral history contact'),
  sonstiges('sonst-arbeitgeber', 'sonst_kontakt', 'Arbeitgeberkontakt (mit Einwilligung)', 'Employer contact (with consent)'),
  sonstiges('sonst-hausarzt', 'sonst_kontakt', 'Hausarzt / niedergelassener Versorger informieren', 'Inform GP / community provider'),
  sonstiges('sonst-betreuung', 'sonst_recht', 'Betreuungsgericht / gesetzliche Betreuung prüfen', 'Guardianship court review'),
  sonstiges('sonst-unterbringung', 'sonst_recht', 'Unterbringungsprüfung (PsychKG)', 'Involuntary placement review', {
    defaultUrgency: 'urgent',
  }),
  sonstiges('sonst-unterbringung-folge', 'sonst_recht', 'Folgeunterbringung beantragen', 'Extension of involuntary placement'),
  sonstiges('sonst-sicherheit', 'sonst_sicherheit', 'Sicherheitsmaßnahmen evaluieren', 'Evaluate safety measures'),
  sonstiges('sonst-fixierung', 'sonst_sicherheit', 'Fixierung / Zwangsmaßnahme dokumentieren', 'Document restraint / coercive measure'),
  sonstiges('sonst-1-zu-1', 'sonst_sicherheit', '1:1-Beobachtung', '1:1 observation', { defaultUrgency: 'urgent' }),
  sonstiges('sonst-wohnungssuche', 'sonst_wohnen', 'Wohnraum / betreutes Wohnen vermitteln', 'Housing / supported living referral'),
  sonstiges('sonst-tagesklinik', 'sonst_wohnen', 'Tagesklinik / Tagesstätte Platz anfragen', 'Day clinic / day centre placement'),
  sonstiges('sonst-reha', 'sonst_wohnen', 'Rehabilitationsantrag', 'Rehabilitation application'),
  sonstiges('sonst-kostenerstattung', 'sonst_verwaltung', 'Kostenerstattung / Hilfsmittel', 'Cost coverage / assistive devices'),
  sonstiges('sonst-arbeitsunfaehigkeit', 'sonst_verwaltung', 'Arbeitsunfähigkeitsbescheinigung', 'Medical certificate of incapacity'),
  sonstiges('sonst-gutachten', 'sonst_verwaltung', 'Gutachten / Stellungnahme', 'Expert opinion / report'),
]

export const ANFORDERUNG_CATEGORIES: AnforderungCategory[] = [
  'labor',
  'befunde',
  'therapien',
  'sonstiges',
]

const catalogById = new Map(ANFORDERUNGEN_CATALOG.map((item) => [item.id, item]))

export function getAnforderungCatalogItem(id: string): AnforderungCatalogItem | undefined {
  return catalogById.get(id)
}

export function listCatalogByCategory(category: AnforderungCategory): AnforderungCatalogItem[] {
  return ANFORDERUNGEN_CATALOG.filter((item) => item.category === category)
}

export function listCatalogGroups(category: AnforderungCategory): string[] {
  const groups = new Set<string>()
  for (const item of ANFORDERUNGEN_CATALOG) {
    if (item.category === category) groups.add(item.groupKey)
  }
  return [...groups]
}