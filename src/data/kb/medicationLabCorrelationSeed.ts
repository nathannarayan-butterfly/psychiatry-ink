import type { MedicationLabCorrelationKnowledge } from '../../types/labMedicationCorrelation'
import { buildCorrelationKey } from '../../utils/labMedicationCorrelation/correlationKey'

type SeedRule = Omit<MedicationLabCorrelationKnowledge, 'correlationKey' | 'source'>

function rule(entry: SeedRule): MedicationLabCorrelationKnowledge {
  return {
    ...entry,
    correlationKey: buildCorrelationKey(entry.substanceId, entry.labParameter),
    source: 'knowledge_base',
  }
}

const RAW_RULES: SeedRule[] = [
  // ── Clozapine ────────────────────────────────────────────────────────────
  {
    substanceId: 'clozapin',
    substanceName: 'Clozapin',
    labParameter: 'wbc',
    labParameterLabelDe: 'Leukozyten',
    labParameterLabelEn: 'White blood cells',
    correlationStrength: 'concerning',
    zusammenhang: 'Clozapin-assoziierte Agranulozytose — Leukopenie kann Vorboten sein',
    zusammenhangEn:
      'Clozapine-associated agranulocytosis — leukopenia may be a precursor',
    mechanism: 'Immunologisch vermittelte Knochenmarkssuppression',
    mechanismEn: 'Immune-mediated bone marrow suppression',
    recommendation:
      'Bei Leukopenie sofortige klinische Abklärung; ggf. Absetzen und hämatologische Mitbeurteilung',
    recommendationEn:
      'On leukopenia, urgent clinical review; consider discontinuation and haematology assessment',
    monitoring:
      'Wöchentliche Differentialblutbild-Kontrollen in den ersten 18 Wochen, danach gemäß Schema',
    monitoringEn:
      'Weekly differential blood count for the first 18 weeks, then per protocol',
    kbRuleId: 'cloz-wbc',
  },
  {
    substanceId: 'clozapin',
    substanceName: 'Clozapin',
    labParameter: 'neutrophils',
    labParameterLabelDe: 'Neutrophile',
    labParameterLabelEn: 'Neutrophils',
    correlationStrength: 'concerning',
    zusammenhang: 'Neutropenie unter Clozapin — Agranulozytose-Risiko',
    zusammenhangEn: 'Neutropenia on clozapine — risk of agranulocytosis',
    mechanism: 'Idiosynkratische Immunreaktion',
    mechanismEn: 'Idiosyncratic immune reaction',
    recommendation:
      'Bei Neutrophilen < 1,5 G/l Absetzen und engmaschige Kontrolle; bei < 0,5 G/l Notfall',
    recommendationEn:
      'If neutrophils < 1.5 ×10⁹/L stop clozapine and monitor closely; < 0.5 ×10⁹/L is a haematological emergency',
    monitoring: 'Differentialblutbild nach Clozapin-Monitoring-Protokoll',
    monitoringEn: 'Differential blood count according to the clozapine monitoring protocol',
    kbRuleId: 'cloz-neutro',
  },
  {
    substanceId: 'clozapin',
    substanceName: 'Clozapin',
    labParameter: 'crp',
    labParameterLabelDe: 'CRP',
    labParameterLabelEn: 'CRP',
    correlationStrength: 'plausible',
    zusammenhang:
      'Erhöhtes CRP kann Myokarditis oder Pneumonitis unter Clozapin mitbedenken',
    zusammenhangEn:
      'Raised CRP should prompt consideration of clozapine-induced myocarditis or pneumonitis',
    mechanism: 'Entzündliche kardiale/pulmonale Komplikation',
    mechanismEn: 'Inflammatory cardiac or pulmonary complication',
    recommendation:
      'Bei Fieber, Dyspnoe oder Thoraxschmerz EKG, Troponin, ggf. Echo und internistische Abklärung',
    recommendationEn:
      'In the presence of fever, dyspnoea or chest pain obtain ECG and troponin, consider echocardiography and a medical review',
    monitoring: 'Klinische Zeichen + CRP/Troponin bei Verdacht',
    monitoringEn: 'Clinical signs plus CRP and troponin if myocarditis is suspected',
    kbRuleId: 'cloz-crp',
  },
  {
    substanceId: 'clozapin',
    substanceName: 'Clozapin',
    labParameter: 'troponin',
    labParameterLabelDe: 'Troponin',
    labParameterLabelEn: 'Troponin',
    correlationStrength: 'concerning',
    zusammenhang: 'Troponin-Anstieg unter Clozapin — Myokarditis ausschließen',
    zusammenhangEn: 'Troponin rise on clozapine — exclude myocarditis',
    recommendation:
      'Bei Symptomen sofortige internistische/kardiologische Abklärung; Clozapin-Pause erwägen',
    recommendationEn:
      'If symptomatic, arrange immediate medical or cardiology review and consider pausing clozapine',
    monitoring: 'EKG, Echo, CRP parallel',
    monitoringEn: 'ECG, echocardiography and CRP in parallel',
    kbRuleId: 'cloz-trop',
  },
  {
    substanceId: 'clozapin',
    substanceName: 'Clozapin',
    labParameter: 'ck',
    labParameterLabelDe: 'CK',
    labParameterLabelEn: 'CK (creatine kinase)',
    correlationStrength: 'possible',
    zusammenhang:
      'CK-Erhöhung kann Myokarditis, Rhabdomyolyse oder Konvulsionen unter Clozapin mitbedenken',
    zusammenhangEn:
      'CK elevation should prompt consideration of clozapine-related myocarditis, rhabdomyolysis or seizures',
    recommendation: 'Symptome und weitere kardiale Marker prüfen',
    recommendationEn: 'Review symptoms and additional cardiac markers',
    monitoring: 'Verlaufskontrolle CK bei persistierender Erhöhung',
    monitoringEn: 'Repeat CK monitoring if elevation persists',
    kbRuleId: 'cloz-ck',
  },
  {
    substanceId: 'clozapin',
    substanceName: 'Clozapin',
    labParameter: 'alt',
    labParameterLabelDe: 'ALT',
    labParameterLabelEn: 'ALT',
    correlationStrength: 'possible',
    zusammenhang: 'Transaminasen-Anstieg unter Clozapin möglich',
    zusammenhangEn: 'Transaminase rises can occur on clozapine',
    recommendation:
      'Leberwerte im Verlauf kontrollieren; bei deutlicher Erhöhung Dosisreduktion/Absetzen erwägen',
    recommendationEn:
      'Monitor liver function; with marked rises consider dose reduction or discontinuation',
    monitoring: 'Leberwerte bei Therapiebeginn und bei Symptomen',
    monitoringEn: 'Liver function tests at initiation and when symptomatic',
    kbRuleId: 'cloz-alt',
  },
  {
    substanceId: 'clozapin',
    substanceName: 'Clozapin',
    labParameter: 'glucose',
    labParameterLabelDe: 'Glukose',
    labParameterLabelEn: 'Glucose',
    correlationStrength: 'plausible',
    zusammenhang: 'Clozapin kann metabolische Entgleisung begünstigen',
    zusammenhangEn: 'Clozapine can predispose to metabolic dysregulation',
    recommendation: 'Diabetes-Screening und Lebensstilberatung',
    recommendationEn: 'Diabetes screening and lifestyle counselling',
    monitoring: 'Nüchternglukose/HbA1c im Verlauf',
    monitoringEn: 'Fasting glucose and HbA1c over time',
    kbRuleId: 'cloz-gluc',
  },
  {
    substanceId: 'clozapin',
    substanceName: 'Clozapin',
    labParameter: 'lipids',
    labParameterLabelDe: 'Lipide',
    labParameterLabelEn: 'Lipids',
    correlationStrength: 'plausible',
    zusammenhang: 'Clozapin-assoziierte metabolische Veränderungen möglich',
    zusammenhangEn: 'Clozapine-associated metabolic changes are possible',
    recommendation: 'Lipidprofil kontrollieren, kardiovaskuläre Risikofaktoren adressieren',
    recommendationEn: 'Monitor the lipid profile and address cardiovascular risk factors',
    monitoring: 'Lipidprofil jährlich oder bei Risikofaktoren häufiger',
    monitoringEn: 'Annual lipid profile, or more frequently when risk factors are present',
    kbRuleId: 'cloz-lipid',
  },

  // ── Valproate ────────────────────────────────────────────────────────────
  {
    substanceId: 'valproat',
    substanceName: 'Valproat',
    labParameter: 'platelets',
    labParameterLabelDe: 'Thrombozyten',
    labParameterLabelEn: 'Platelets',
    correlationStrength: 'plausible',
    zusammenhang: 'Valproat kann Thrombozytopenie verursachen',
    zusammenhangEn: 'Valproate can cause thrombocytopenia',
    recommendation:
      'Thrombozyten im Verlauf kontrollieren; bei relevanter Thrombozytopenie Dosisanpassung/Absetzen erwägen',
    recommendationEn:
      'Monitor platelets over time; with clinically relevant thrombocytopenia consider dose adjustment or discontinuation',
    monitoring: 'Blutbild zu Therapiebeginn und alle 6–12 Monate',
    monitoringEn: 'Full blood count at initiation and every 6–12 months',
    kbRuleId: 'valp-plt',
  },
  {
    substanceId: 'valproat',
    substanceName: 'Valproat',
    labParameter: 'alt',
    labParameterLabelDe: 'ALT',
    labParameterLabelEn: 'ALT',
    correlationStrength: 'concerning',
    zusammenhang: 'Hepatotoxizität unter Valproat — Transaminasen-Anstieg',
    zusammenhangEn: 'Valproate-induced hepatotoxicity — rising transaminases',
    recommendation: 'Bei deutlicher Erhöhung Absetzen und hepatologische Abklärung',
    recommendationEn:
      'With marked elevation, stop valproate and arrange hepatology assessment',
    monitoring: 'Leberwerte in den ersten 6 Monaten engmaschiger',
    monitoringEn: 'Closer liver function monitoring during the first 6 months',
    kbRuleId: 'valp-alt',
  },
  {
    substanceId: 'valproat',
    substanceName: 'Valproat',
    labParameter: 'ammonia',
    labParameterLabelDe: 'Ammoniak',
    labParameterLabelEn: 'Ammonia',
    correlationStrength: 'concerning',
    zusammenhang: 'Hyperammonämie unter Valproat — Enzephalopathie-Risiko',
    zusammenhangEn:
      'Valproate-induced hyperammonaemia — risk of encephalopathy',
    recommendation:
      'Bei Ammoniak-Erhöhung mit Enzephalopathie-Zeichen sofortige Abklärung und Therapiepause',
    recommendationEn:
      'With raised ammonia and encephalopathic features, arrange urgent workup and pause therapy',
    monitoring: 'Ammoniak bei Vigilanzminderung, Übelkeit, Verwirrtheit',
    monitoringEn:
      'Check ammonia in the setting of reduced vigilance, nausea or confusion',
    kbRuleId: 'valp-nh3',
  },

  // ── Lithium ──────────────────────────────────────────────────────────────
  {
    substanceId: 'lithium',
    substanceName: 'Lithium',
    labParameter: 'creatinine',
    labParameterLabelDe: 'Kreatinin',
    labParameterLabelEn: 'Creatinine',
    correlationStrength: 'plausible',
    zusammenhang: 'Lithium kann die Nierenfunktion langfristig beeinträchtigen',
    zusammenhangEn: 'Lithium can impair renal function over the long term',
    recommendation:
      'Nierenfunktion beurteilen; Hydratation und Interaktionscheck (NSAID, ACE-Hemmer)',
    recommendationEn:
      'Assess renal function; review hydration and interactions (NSAIDs, ACE inhibitors)',
    monitoring: 'Kreatinin/eGFR alle 3–6 Monate',
    monitoringEn: 'Creatinine and eGFR every 3–6 months',
    kbRuleId: 'li-crea',
  },
  {
    substanceId: 'lithium',
    substanceName: 'Lithium',
    labParameter: 'egfr',
    labParameterLabelDe: 'eGFR',
    labParameterLabelEn: 'eGFR',
    correlationStrength: 'plausible',
    zusammenhang: 'eGFR-Abfall unter Lithium — nephrotoxisches Potenzial',
    zusammenhangEn: 'Falling eGFR on lithium — nephrotoxic potential',
    recommendation:
      'Dosisanpassung und nephrologische Mitbeurteilung bei persistierendem Abfall',
    recommendationEn:
      'Adjust the dose and seek nephrology input if the decline persists',
    monitoring: 'eGFR im Verlauf, Lithium-Spiegel parallel',
    monitoringEn: 'Follow eGFR over time alongside lithium levels',
    kbRuleId: 'li-egfr',
  },
  {
    substanceId: 'lithium',
    substanceName: 'Lithium',
    labParameter: 'tsh',
    labParameterLabelDe: 'TSH',
    labParameterLabelEn: 'TSH',
    correlationStrength: 'plausible',
    zusammenhang: 'Lithium-induzierte Hypothyreose möglich',
    zusammenhangEn: 'Lithium-induced hypothyroidism is possible',
    recommendation:
      'Bei TSH-Erhöhung Schilddrüsenstatus klären; L-Thyroxin erwägen',
    recommendationEn:
      'If TSH is elevated, evaluate thyroid status and consider levothyroxine',
    monitoring: 'TSH alle 6–12 Monate',
    monitoringEn: 'TSH every 6–12 months',
    kbRuleId: 'li-tsh',
  },
  {
    substanceId: 'lithium',
    substanceName: 'Lithium',
    labParameter: 'sodium',
    labParameterLabelDe: 'Natrium',
    labParameterLabelEn: 'Sodium',
    correlationStrength: 'concerning',
    zusammenhang:
      'Hyponatriämie unter Lithium — Toxizitätsrisiko bei Natriumverlust',
    zusammenhangEn:
      'Hyponatraemia on lithium — sodium loss raises the risk of toxicity',
    recommendation:
      'Ursache klären (Dehydratation, Diuretika); Lithium-Spiegel kontrollieren',
    recommendationEn:
      'Investigate the cause (dehydration, diuretics) and check lithium levels',
    monitoring: 'Elektrolyte bei klinischer Verschlechterung',
    monitoringEn: 'Electrolytes whenever the clinical picture deteriorates',
    kbRuleId: 'li-na',
  },
  {
    substanceId: 'lithium',
    substanceName: 'Lithium',
    labParameter: 'potassium',
    labParameterLabelDe: 'Kalium',
    labParameterLabelEn: 'Potassium',
    correlationStrength: 'possible',
    zusammenhang: 'Elektrolytstörungen können Lithium-Toxizität begünstigen',
    zusammenhangEn: 'Electrolyte disturbances can predispose to lithium toxicity',
    recommendation: 'Elektrolyte und Lithium-Spiegel gemeinsam beurteilen',
    recommendationEn: 'Assess electrolytes and lithium level together',
    monitoring: 'Bei Erbrechen/Diarrhö engmaschige Kontrolle',
    monitoringEn: 'Close monitoring during vomiting or diarrhoea',
    kbRuleId: 'li-k',
  },

  // ── Carbamazepine ────────────────────────────────────────────────────────
  {
    substanceId: 'carbamazepin',
    substanceName: 'Carbamazepin',
    labParameter: 'sodium',
    labParameterLabelDe: 'Natrium',
    labParameterLabelEn: 'Sodium',
    correlationStrength: 'concerning',
    zusammenhang: 'SIADH/Hyponatriämie unter Carbamazepin',
    zusammenhangEn: 'SIADH and hyponatraemia on carbamazepine',
    recommendation:
      'Hyponatriämie behandeln; Dosisreduktion oder Therapiewechsel erwägen',
    recommendationEn:
      'Treat the hyponatraemia and consider dose reduction or switching therapy',
    monitoring: 'Natrium zu Therapiebeginn und bei Symptomen',
    monitoringEn: 'Sodium at initiation and whenever symptomatic',
    kbRuleId: 'carb-na',
  },
  {
    substanceId: 'carbamazepin',
    substanceName: 'Carbamazepin',
    labParameter: 'alt',
    labParameterLabelDe: 'ALT',
    labParameterLabelEn: 'ALT',
    correlationStrength: 'plausible',
    zusammenhang: 'Hepatische Enzymanstiege unter Carbamazepin möglich',
    zusammenhangEn: 'Hepatic enzyme rises are possible on carbamazepine',
    recommendation:
      'Leberwerte im Verlauf; bei Ikterus/Leberwertanstieg Absetzen',
    recommendationEn:
      'Monitor liver function; discontinue if jaundice or marked LFT rises occur',
    monitoring: 'Leberwerte alle 6–12 Monate',
    monitoringEn: 'Liver function tests every 6–12 months',
    kbRuleId: 'carb-alt',
  },
  {
    substanceId: 'carbamazepin',
    substanceName: 'Carbamazepin',
    labParameter: 'wbc',
    labParameterLabelDe: 'Leukozyten',
    labParameterLabelEn: 'White blood cells',
    correlationStrength: 'possible',
    zusammenhang: 'Leukopenie unter Carbamazepin beschrieben',
    zusammenhangEn: 'Leukopenia has been reported on carbamazepine',
    recommendation: 'Differentialblutbild im Verlauf',
    recommendationEn: 'Follow with serial differential blood counts',
    monitoring: 'Blutbild bei Infektanfälligkeit',
    monitoringEn: 'Full blood count if susceptibility to infection develops',
    kbRuleId: 'carb-wbc',
  },

  // ── SSRI (Sertraline as representative + class) ─────────────────────────
  {
    substanceId: 'sertralin',
    substanceName: 'Sertralin',
    labParameter: 'sodium',
    labParameterLabelDe: 'Natrium',
    labParameterLabelEn: 'Sodium',
    correlationStrength: 'plausible',
    zusammenhang:
      'SSRI-assoziierte Hyponatriämie (v. a. ältere Patienten, Diuretika)',
    zusammenhangEn:
      'SSRI-associated hyponatraemia (especially in older patients and on diuretics)',
    mechanism: 'SIADH-ähnlicher Mechanismus',
    mechanismEn: 'SIADH-like mechanism',
    recommendation:
      'Natrium korrigieren; Dosisreduktion/Absetzen bei symptomatischer Hyponatriämie erwägen',
    recommendationEn:
      'Correct sodium and consider dose reduction or discontinuation in symptomatic hyponatraemia',
    monitoring:
      'Natrium bei Risikopatienten zu Therapiebeginn und im Verlauf',
    monitoringEn:
      'Sodium at initiation and during follow-up in higher-risk patients',
    kbRuleId: 'ssri-na',
  },
  {
    substanceId: 'class:ssri',
    substanceName: 'SSRI',
    labParameter: 'sodium',
    labParameterLabelDe: 'Natrium',
    labParameterLabelEn: 'Sodium',
    correlationStrength: 'plausible',
    zusammenhang: 'SSRI-assoziierte Hyponatriämie möglich',
    zusammenhangEn: 'SSRI-associated hyponatraemia is possible',
    recommendation: 'Klinische Symptome und Medikamentenanamnese abgleichen',
    recommendationEn: 'Reconcile clinical symptoms with the medication history',
    monitoring: 'Natrium bei Risikokonstellation',
    monitoringEn: 'Sodium when a risk constellation is present',
    kbRuleId: 'class-ssri-na',
  },
  {
    substanceId: 'class:ssri',
    substanceName: 'SSRI',
    labParameter: 'alt',
    labParameterLabelDe: 'ALT',
    labParameterLabelEn: 'ALT',
    correlationStrength: 'possible',
    zusammenhang: 'Seltene hepatische Enzymanstiege unter SSRI',
    zusammenhangEn: 'Rare hepatic enzyme rises on SSRIs',
    recommendation: 'Leberwerte im Verlauf; bei Ikterus Absetzen',
    recommendationEn: 'Monitor liver function and discontinue if jaundice develops',
    monitoring: 'Leberwerte bei Symptomen',
    monitoringEn: 'Liver function tests when symptomatic',
    kbRuleId: 'class-ssri-alt',
  },

  // ── SNRI (Venlafaxine) ──────────────────────────────────────────────────
  {
    substanceId: 'venlafaxin',
    substanceName: 'Venlafaxin',
    labParameter: 'sodium',
    labParameterLabelDe: 'Natrium',
    labParameterLabelEn: 'Sodium',
    correlationStrength: 'plausible',
    zusammenhang: 'SNRI-assoziierte Hyponatriämie möglich',
    zusammenhangEn: 'SNRI-associated hyponatraemia is possible',
    recommendation: 'Natrium und klinischer Status beurteilen',
    recommendationEn: 'Assess sodium together with clinical status',
    monitoring: 'Natrium bei älteren Patienten',
    monitoringEn: 'Check sodium in older patients',
    kbRuleId: 'snri-na',
  },
  {
    substanceId: 'class:snri',
    substanceName: 'SNRI',
    labParameter: 'sodium',
    labParameterLabelDe: 'Natrium',
    labParameterLabelEn: 'Sodium',
    correlationStrength: 'plausible',
    zusammenhang: 'SNRI-assoziierte Hyponatriämie möglich',
    zusammenhangEn: 'SNRI-associated hyponatraemia is possible',
    recommendation: 'Hyponatriämie-Ursachen differentialdiagnostisch prüfen',
    recommendationEn: 'Work through the differential diagnosis of hyponatraemia',
    kbRuleId: 'class-snri-na',
  },
  {
    substanceId: 'class:snri',
    substanceName: 'SNRI',
    labParameter: 'alt',
    labParameterLabelDe: 'ALT',
    labParameterLabelEn: 'ALT',
    correlationStrength: 'possible',
    zusammenhang: 'Hepatische Enzymanstiege unter SNRI selten',
    zusammenhangEn: 'Hepatic enzyme rises are rare on SNRIs',
    recommendation: 'Verlaufskontrolle bei persistierender Erhöhung',
    recommendationEn: 'Repeat testing if the elevation persists',
    kbRuleId: 'class-snri-alt',
  },

  // ── Atypical antipsychotics ─────────────────────────────────────────────
  {
    substanceId: 'olanzapin',
    substanceName: 'Olanzapin',
    labParameter: 'glucose',
    labParameterLabelDe: 'Glukose',
    labParameterLabelEn: 'Glucose',
    correlationStrength: 'plausible',
    zusammenhang: 'Metabolisches Syndrom / Hyperglykämie unter Olanzapin',
    zusammenhangEn: 'Metabolic syndrome and hyperglycaemia on olanzapine',
    recommendation:
      'Lebensstil, Metformin erwägen; antipsychotischer Wechsel bei Persistenz',
    recommendationEn:
      'Lifestyle measures, consider metformin and switch antipsychotic if metabolic effects persist',
    monitoring: 'Glukose/HbA1c im Verlauf',
    monitoringEn: 'Glucose and HbA1c over time',
    kbRuleId: 'olz-gluc',
  },
  {
    substanceId: 'olanzapin',
    substanceName: 'Olanzapin',
    labParameter: 'hba1c',
    labParameterLabelDe: 'HbA1c',
    labParameterLabelEn: 'HbA1c',
    correlationStrength: 'plausible',
    zusammenhang: 'HbA1c-Anstieg unter atypischem Antipsychotikum möglich',
    zusammenhangEn:
      'HbA1c can rise on atypical antipsychotics',
    recommendation: 'Diabetes-Management und metabolisches Monitoring',
    recommendationEn: 'Diabetes management and metabolic monitoring',
    kbRuleId: 'olz-a1c',
  },
  {
    substanceId: 'olanzapin',
    substanceName: 'Olanzapin',
    labParameter: 'lipids',
    labParameterLabelDe: 'Lipide',
    labParameterLabelEn: 'Lipids',
    correlationStrength: 'plausible',
    zusammenhang: 'Dyslipidämie unter Olanzapin',
    zusammenhangEn: 'Dyslipidaemia on olanzapine',
    recommendation: 'Lipidprofil und kardiovaskuläre Prävention',
    recommendationEn: 'Lipid profile review and cardiovascular prevention',
    kbRuleId: 'olz-lipid',
  },
  {
    substanceId: 'risperidon',
    substanceName: 'Risperidon',
    labParameter: 'prolactin',
    labParameterLabelDe: 'Prolaktin',
    labParameterLabelEn: 'Prolactin',
    correlationStrength: 'plausible',
    zusammenhang: 'Hyperprolaktinämie unter Risperidon (D2-Blockade)',
    zusammenhangEn:
      'Hyperprolactinaemia on risperidone (D2 blockade)',
    recommendation:
      'Symptome (Galaktorrhoe, Amenorrhoe, Libidoverlust) erfragen; ggf. Wechsel/Dosisreduktion',
    recommendationEn:
      'Enquire about galactorrhoea, amenorrhoea or loss of libido; consider switching or dose reduction',
    monitoring: 'Prolaktin bei klinischen Symptomen',
    monitoringEn: 'Check prolactin when symptoms emerge',
    kbRuleId: 'ris-prol',
  },
  {
    substanceId: 'class:antipsychotic',
    substanceName: 'Antipsychotikum',
    labParameter: 'prolactin',
    labParameterLabelDe: 'Prolaktin',
    labParameterLabelEn: 'Prolactin',
    correlationStrength: 'plausible',
    zusammenhang: 'Antipsychotika können Prolaktin erhöhen',
    zusammenhangEn: 'Antipsychotics can raise prolactin',
    recommendation: 'Klinische Korrelation — nicht jede Erhöhung ist medikamentös',
    recommendationEn:
      'Correlate clinically — not every elevation is drug-induced',
    kbRuleId: 'ap-prol',
  },
  {
    substanceId: 'class:antipsychotic',
    substanceName: 'Antipsychotikum',
    labParameter: 'glucose',
    labParameterLabelDe: 'Glukose',
    labParameterLabelEn: 'Glucose',
    correlationStrength: 'plausible',
    zusammenhang: 'Metabolische Effekte atypischer Antipsychotika',
    zusammenhangEn: 'Metabolic effects of atypical antipsychotics',
    recommendation: 'Metabolisches Monitoring gemäß Leitlinie',
    recommendationEn: 'Metabolic monitoring as per guideline',
    kbRuleId: 'ap-gluc',
  },
  {
    substanceId: 'class:antipsychotic',
    substanceName: 'Antipsychotikum',
    labParameter: 'hba1c',
    labParameterLabelDe: 'HbA1c',
    labParameterLabelEn: 'HbA1c',
    correlationStrength: 'plausible',
    zusammenhang: 'HbA1c-Veränderung unter Antipsychotika möglich',
    zusammenhangEn: 'HbA1c can shift on antipsychotics',
    recommendation: 'Diabetesrisiko adressieren',
    recommendationEn: 'Address diabetes risk',
    kbRuleId: 'ap-a1c',
  },
  {
    substanceId: 'class:antipsychotic',
    substanceName: 'Antipsychotikum',
    labParameter: 'lipids',
    labParameterLabelDe: 'Lipide',
    labParameterLabelEn: 'Lipids',
    correlationStrength: 'plausible',
    zusammenhang: 'Lipidveränderungen unter Antipsychotika',
    zusammenhangEn: 'Lipid changes on antipsychotics',
    recommendation: 'Lipidprofil kontrollieren',
    recommendationEn: 'Monitor the lipid profile',
    kbRuleId: 'ap-lipid',
  },
  {
    substanceId: 'class:antipsychotic',
    substanceName: 'Antipsychotikum',
    labParameter: 'ck',
    labParameterLabelDe: 'CK',
    labParameterLabelEn: 'CK (creatine kinase)',
    correlationStrength: 'possible',
    zusammenhang:
      'CK-Erhöhung unter Antipsychotika/NMS differentialdiagnostisch',
    zusammenhangEn:
      'CK elevation on antipsychotics — keep neuroleptic malignant syndrome in the differential',
    recommendation: 'Bei Fieber, Rigidity, Vigilanzminderung NMS ausschließen',
    recommendationEn:
      'Exclude NMS in the setting of fever, rigidity or reduced vigilance',
    kbRuleId: 'ap-ck',
  },
  {
    substanceId: 'quetiapin',
    substanceName: 'Quetiapin',
    labParameter: 'glucose',
    labParameterLabelDe: 'Glukose',
    labParameterLabelEn: 'Glucose',
    correlationStrength: 'possible',
    zusammenhang: 'Metabolische Veränderungen unter Quetiapin möglich',
    zusammenhangEn: 'Metabolic changes can occur on quetiapine',
    recommendation: 'Metabolisches Screening',
    recommendationEn: 'Metabolic screening',
    kbRuleId: 'que-gluc',
  },
  {
    substanceId: 'aripiprazol',
    substanceName: 'Aripiprazol',
    labParameter: 'prolactin',
    labParameterLabelDe: 'Prolaktin',
    labParameterLabelEn: 'Prolactin',
    correlationStrength: 'possible',
    zusammenhang:
      'Aripiprazol hat geringeres Prolaktin-Erhöhungspotenzial — Erhöhung eher anderer Ursachen prüfen',
    zusammenhangEn:
      'Aripiprazole has a lower potential to raise prolactin — look for alternative causes of elevation',
    recommendation: 'Differentialdiagnose bei Hyperprolaktinämie',
    recommendationEn: 'Work up the differential diagnosis of hyperprolactinaemia',
    kbRuleId: 'ari-prol',
  },
]

export const MEDICATION_LAB_CORRELATION_SEED: MedicationLabCorrelationKnowledge[] = RAW_RULES.map(rule)

export const MEDICATION_LAB_CORRELATION_SEED_COUNT = MEDICATION_LAB_CORRELATION_SEED.length

// Deferred (not MVP): longitudinal trend clusters, cumulative organ burden scoring, auto-run on all lab events.
