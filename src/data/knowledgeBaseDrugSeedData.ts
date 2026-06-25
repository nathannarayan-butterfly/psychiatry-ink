import { createDefaultSections, type KnowledgeBaseDrug } from '../types/knowledgeBase'

const NOW = '2026-06-10T19:16:00.000Z'

/**
 * LEGACY seed (v1, 1–5 score model). Intentionally retained without a v2
 * profile so the backward-compatible "Legacy receptor profile" rendering and
 * single-medication upgrade path can be exercised.
 */
export const HALOPERIDOL_SEED: KnowledgeBaseDrug = {
  id: 'seed-haloperidol-001',
  genericName: 'Haloperidol',
  genericNameEn: 'Haloperidol',
  brandNames: ['Haldol®'],
  drugClass: 'Hochpotentes typisches Antipsychotikum',
  drugClassEn: 'High-potency typical antipsychotic',
  category: 'Antipsychotika',
  categoryEn: 'Antipsychotics',
  psychClass: 'antipsychotic_typical',
  atcCode: 'N05AD01',
  tags: ['FGA', 'D2-Antagonist', 'Depot', 'Delir'],
  tagsEn: ['FGA', 'D2 antagonist', 'LAI', 'Delirium'],
  status: 'active',
  authorEditor: 'Seed',
  createdAt: NOW,
  updatedAt: NOW,
  sections: createDefaultSections(
    {
      kurzprofil:
        'Hochpotentes FGA der ersten Generation. Starke D2-Blockade. Breites Indikationsspektrum inkl. akuter Psychose, Manie, Delir, Übelkeit. Depot-Form verfügbar.',
      wirkmechanismus:
        'Postsynaptischer D2-Antagonist (limbisch und striatal). Hohe EPS-Rate durch striatale D2-Blockade.',
      rezeptorprofil: 'D2 ++++, D1 ++, Alpha1 ++, M1 +, H1 +',
      pharmakokinetik:
        'Orale Bioverfügbarkeit 60–70 %; Tmax 2–6 h. Halbwertszeit oral ca. 21 h (Spanne 12–36 h), i.m. ca. 18 h, Decanoat-Depot scheinbare HWZ 3 Wochen. Steady State nach ~4–5 Tagen (oral). Plasmaproteinbindung ~92 %. TDM: therapeutischer Bereich 1–10 ng/ml (Erhaltung), bei Hochdosistherapie ggf. bis 20 ng/ml.',
      indikationen:
        'Schizophrenie, akute Manie, Delir, therapierefraktäre Übelkeit, Tourette',
      dosierung:
        'Oral 2–20 mg/d. Akut i.v./i.m. 5–10 mg. Depot (Decanoat): 50–200 mg alle 4 Wochen.',
      nebenwirkungen:
        'EPS (Frühdyskinesien, Parkinsonoid, Akathisie, Spätdyskinesie), QTc-Verlängerung, Hyperprolaktinämie, malignes neuroleptisches Syndrom (selten)',
      kontraindikationen:
        'Ausgeprägte ZNS-Depression, bekannte QTc-Verlängerung, gleichzeitige QTc-verlängernde Medikamente',
      wechselwirkungen:
        'QTc-Verlängerung mit Antiarrhythmika, trizyklischen AD, Lithium. CYP3A4 und CYP2D6.',
      kontrollen:
        'EKG (QTc), Prolaktin, EPS-Monitoring (AIMS), bei Depot: klinische Untersuchung',
      besonderheiten:
        'Bei Delir bevorzugt niedrig dosiert. In der Gerontopsychiatrie Vorsicht. Gute Steuerbarkeit durch kurze HWZ der oralen Form.',
      merksaetze:
        '"Kein Anticholinergikum zur EPS-Prophylaxe routinemäßig."\n"Depot erst nach stabiler oraler Einstellung."',
    },
    {
      pharmakokinetik: {
        pk: {
          halfLifeHours: 21,
          halfLifeNote: 'Spanne 12–36 h (oral); Depot-Decanoat scheinbare HWZ ~3 Wochen',
          halfLifeNoteEn: 'Range 12–36 h (oral); decanoate depot apparent half-life ~3 weeks',
          tmaxHours: 4,
          timeToSteadyStateDays: 5,
          bioavailabilityPercent: 65,
          proteinBindingPercent: 92,
          tdm: {
            lowNgMl: 1,
            highNgMl: 10,
            unit: 'ng/ml',
            note: 'Erhaltungstherapie; AGNP-Konsensus',
            noteEn: 'Maintenance therapy; AGNP consensus',
          },
          isEstimated: true,
          sourceNote: 'Fachinformation / AGNP-Konsensus 2022',
          sourceNoteEn: 'SmPC / AGNP consensus 2022',
        },
      },
    },
    {
      kurzprofil:
        'High-potency first-generation antipsychotic. Strong D2 blockade. Broad indication spectrum including acute psychosis, mania, delirium and nausea. Depot formulation available.',
      wirkmechanismus:
        'Post-synaptic D2 antagonist (limbic and striatal). High rate of extrapyramidal side-effects through striatal D2 blockade.',
      rezeptorprofil: 'D2 ++++, D1 ++, α1 ++, M1 +, H1 +',
      pharmakokinetik:
        'Oral bioavailability 60–70 %; tmax 2–6 h. Oral half-life ~21 h (range 12–36 h), IM ~18 h, decanoate depot apparent half-life ~3 weeks. Steady state in ~4–5 days (oral). Plasma protein binding ~92 %. TDM: therapeutic range 1–10 ng/mL (maintenance); up to 20 ng/mL may be considered under high-dose therapy.',
      indikationen:
        'Schizophrenia, acute mania, delirium, refractory nausea, Tourette syndrome.',
      dosierung:
        'Oral 2–20 mg/day. Acute IV/IM 5–10 mg. Depot (decanoate): 50–200 mg every 4 weeks.',
      nebenwirkungen:
        'Extrapyramidal symptoms (acute dystonia, parkinsonism, akathisia, tardive dyskinesia), QTc prolongation, hyperprolactinaemia, neuroleptic malignant syndrome (rare).',
      kontraindikationen:
        'Significant CNS depression, known QTc prolongation, concurrent QTc-prolonging medications.',
      wechselwirkungen:
        'QTc prolongation with antiarrhythmics, tricyclic antidepressants, lithium. CYP3A4 and CYP2D6 substrate.',
      kontrollen:
        'ECG (QTc), prolactin, EPS monitoring (AIMS), and on depot: clinical review.',
      besonderheiten:
        'For delirium prefer low doses. Caution in geriatric psychiatry. Good steerability due to the short half-life of the oral form.',
      merksaetze:
        '"Routine anticholinergic for EPS prophylaxis is not recommended."\n"Start the depot only after a stable oral regimen has been established."',
    },
  ),
  receptorProfile: {
    D2: 5,
    D3: 3,
    alpha1: 2,
    H1: 1,
    '5-HT2A': 1,
    '5-HT1A': 0,
    '5-HT2C': 0,
    M1: 0,
    alpha2: 0,
    SERT: 0,
    NET: 0,
    DAT: 0,
  },
  receptorProfileDetails: {
    D2: {
      score: 5,
      action: 'antagonist',
      clinicalMeaning: 'Starke striatale D2-Blockade — hohe EPS- und Prolaktin-Last.',
      clinicalMeaningEn: 'Strong striatal D2 blockade — high EPS and prolactin burden.',
      confidence: 'curated',
    },
    D3: {
      score: 3,
      action: 'antagonist',
      confidence: 'estimated',
    },
    alpha1: {
      score: 2,
      action: 'antagonist',
      clinicalMeaning: 'Leichte Orthostase-Neigung, v. a. parenteral.',
      clinicalMeaningEn: 'Mild orthostatic tendency, especially with parenteral use.',
      confidence: 'curated',
    },
    H1: {
      score: 1,
      action: 'antagonist',
      clinicalMeaning: 'Nur geringe Sedierung.',
      clinicalMeaningEn: 'Only mild sedation.',
      confidence: 'curated',
    },
    '5-HT2A': {
      score: 1,
      action: 'antagonist',
      confidence: 'estimated',
    },
  },
}

/** v2 relative-affinity seed: Risperidone (D2 + 5-HT2A dominant). */
export const RISPERIDONE_SEED: KnowledgeBaseDrug = {
  id: 'seed-risperidone-002',
  genericName: 'Risperidon',
  genericNameEn: 'Risperidone',
  brandNames: ['Risperdal®'],
  drugClass: 'Atypisches Antipsychotikum (SGA)',
  drugClassEn: 'Atypical antipsychotic (SGA)',
  category: 'Antipsychotika',
  categoryEn: 'Antipsychotics',
  psychClass: 'antipsychotic_atypical',
  atcCode: 'N05AX08',
  tags: ['SGA', 'D2', '5-HT2A', 'Depot'],
  tagsEn: ['SGA', 'D2', '5-HT2A', 'LAI'],
  status: 'active',
  authorEditor: 'Seed',
  createdAt: NOW,
  updatedAt: NOW,
  receptorProfileVersion: 2,
  affinityScale: 'relative_log_ki_percent',
  dataModelVersion: 2,
  lastReceptorProfileUpdatedAt: NOW,
  sections: createDefaultSections(
    {
      kurzprofil:
        'Atypisches Antipsychotikum mit starker D2- und 5-HT2A-Affinität. Dosisabhängig EPS und Prolaktinanstieg. Depot (Consta) verfügbar.',
      wirkmechanismus:
        'Hochaffiner D2- und 5-HT2A-Antagonist; zusätzliche α1-/α2-/H1-Blockade.',
      rezeptorprofil:
        'Dominanter 5-HT2A- und D2-Antagonismus; relevante α1-Blockade (Orthostase) und H1-Komponente (Sedierung).',
      indikationen: 'Schizophrenie, bipolare Manie, Aggression bei Demenz (Kurzzeit).',
      umstellung:
        'Cross-Taper von oralem Antipsychotikum möglich. Depot Risperdal Consta benötigt 3 Wochen orales Overlap, da die Mikrosphären erst ab Woche 3 freisetzen.',
      qtc: 'Moderates QTc-Risiko; bei Kombination mit anderen QTc-verlängernden Substanzen EKG-Kontrolle.',
    },
    {
      pharmakokinetik: {
        pk: {
          halfLifeHours: 3,
          halfLifeNote: 'aktiver Metabolit 9-OH-Risperidon (Paliperidon) ~24 h',
          halfLifeNoteEn: 'Active metabolite 9-OH-risperidone (paliperidone) ~24 h',
          tmaxHours: 1,
          timeToSteadyStateDays: 5,
          bioavailabilityPercent: 70,
          proteinBindingPercent: 90,
          tdm: {
            lowNgMl: 20,
            highNgMl: 60,
            unit: 'ng/ml',
            note: 'Summe Risperidon + 9-OH',
            noteEn: 'Sum of risperidone + 9-OH-risperidone',
          },
          isEstimated: false,
          sourceNote: 'Fachinformation / AGNP-Konsensus',
          sourceNoteEn: 'SmPC / AGNP consensus',
        },
      },
      dosierung: {
        titration: {
          unit: 'mg',
          unitEn: 'mg',
          steps: [
            { startDay: 0, label: 'Start', labelEn: 'Start', doseMg: 2 },
            { startDay: 3, doseMg: 4 },
            { startDay: 7, label: 'Zieldosis', labelEn: 'Target dose', doseMg: 6 },
          ],
          targetDoseMg: 6,
          maxDoseMg: 16,
          isEstimated: false,
        },
      },
      nebenwirkungen: {
        sideEffects: [
          { effect: 'Hyperprolaktinämie', effectEn: 'Hyperprolactinaemia', system: 'endokrin', systemEn: 'endocrine', frequency: 'veryCommon', severity: 'moderate' },
          { effect: 'EPS / Akathisie', effectEn: 'EPS / akathisia', system: 'EPS', systemEn: 'EPS', frequency: 'common', severity: 'moderate' },
          { effect: 'Gewichtszunahme', effectEn: 'Weight gain', system: 'metabolisch', systemEn: 'metabolic', frequency: 'common', severity: 'moderate' },
          { effect: 'Orthostase', effectEn: 'Orthostatic hypotension', system: 'kardiovaskulär', systemEn: 'cardiovascular', frequency: 'common', severity: 'mild' },
          { effect: 'QTc-Verlängerung', effectEn: 'QTc prolongation', system: 'kardial', systemEn: 'cardiac', frequency: 'rare', severity: 'dangerous' },
          { effect: 'Malignes neuroleptisches Syndrom', effectEn: 'Neuroleptic malignant syndrome', system: 'neurologisch', systemEn: 'neurological', frequency: 'rare', severity: 'dangerous' },
        ],
      },
      wechselwirkungen: {
        cyp: {
          enzymes: [
            { enzyme: 'CYP2D6', role: 'substrate', strength: 'major', strengthEn: 'major' },
            { enzyme: 'CYP3A4', role: 'substrate', strength: 'minor', strengthEn: 'minor' },
          ],
          interactions: [
            { withDrugOrClass: 'CYP2D6-Inhibitoren (Paroxetin, Fluoxetin)', withDrugOrClassEn: 'CYP2D6 inhibitors (paroxetine, fluoxetine)', severity: 'moderate', effect: '↑ Risperidon-Spiegel', effectEn: '↑ risperidone levels' },
            { withDrugOrClass: 'QTc-verlängernde Substanzen', withDrugOrClassEn: 'QTc-prolonging agents', severity: 'major', effect: 'additive QTc-Verlängerung', effectEn: 'additive QTc prolongation' },
          ],
          qtcRisk: 'moderate',
          isEstimated: false,
        },
      },
      umstellung: {
        depotOptions: [
          {
            name: 'Risperidon-Depot',
            nameEn: 'Risperidone long-acting injection',
            brandName: 'Risperdal Consta®',
            injectionIntervalDays: 14,
            loadingRegimen: [],
            oralOverlapDays: 21,
            doseEquivalence: 'oral 3 mg/d ≈ 37,5–50 mg / 2 Wochen',
            doseEquivalenceEn: 'oral 3 mg/day ≈ 37.5–50 mg every 2 weeks',
            timeToSteadyStateWeeks: 6,
            firstMaintenanceDay: 0,
            isEstimated: false,
            sourceNote: 'Fachinformation Risperdal Consta',
            sourceNoteEn: 'Risperdal Consta SmPC',
          },
        ],
      },
    },
    {
      kurzprofil:
        'Atypical antipsychotic with high D2 and 5-HT2A affinity. Dose-dependent EPS and prolactin elevation. Depot formulation (Consta) available.',
      wirkmechanismus:
        'High-affinity D2 and 5-HT2A antagonist; additional α1, α2 and H1 blockade.',
      rezeptorprofil:
        'Dominant 5-HT2A and D2 antagonism; clinically relevant α1 blockade (orthostasis) and an H1 component (sedation).',
      indikationen: 'Schizophrenia, bipolar mania, short-term treatment of aggression in dementia.',
      umstellung:
        'Cross-taper from an oral antipsychotic is feasible. Risperdal Consta depot requires 3 weeks of oral overlap because the microspheres only begin to release drug from week 3 onwards.',
      qtc: 'Moderate QTc risk; obtain an ECG when combined with other QTc-prolonging agents.',
    },
  ),
  receptorAffinityProfile: [
    { target: '5-HT2A', affinityPercent: 86, rawKiNm: 0.5, pKi: 9.3, action: 'antagonist', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false, sourceNote: 'PDSP Ki database', sourceNoteEn: 'PDSP Ki database' },
    { target: 'D2', affinityPercent: 70, rawKiNm: 3, pKi: 8.5, action: 'antagonist', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false, sourceNote: 'PDSP Ki database', sourceNoteEn: 'PDSP Ki database' },
    { target: 'α1', affinityPercent: 74, rawKiNm: 2, action: 'antagonist', evidenceQuality: 'moderate', clinicalRelevance: 'moderate', isEstimated: false },
    { target: 'α2', affinityPercent: 62, rawKiNm: 8, action: 'antagonist', evidenceQuality: 'moderate', clinicalRelevance: 'low', isEstimated: false },
    { target: 'H1', affinityPercent: 54, rawKiNm: 20, action: 'antagonist', evidenceQuality: 'moderate', clinicalRelevance: 'moderate', isEstimated: false },
    { target: '5-HT2C', affinityPercent: 50, action: 'antagonist', evidenceQuality: 'estimated', clinicalRelevance: 'low', isEstimated: true },
    { target: 'M1', affinityPercent: null, action: 'unknown', evidenceQuality: 'low', clinicalRelevance: 'low', isEstimated: true, sourceNote: 'negligible muscarinic affinity', sourceNoteEn: 'Negligible muscarinic affinity' },
  ],
}

/** v2 relative-affinity seed: Olanzapine (broad 5-HT2A / H1 / M1). */
export const OLANZAPINE_SEED: KnowledgeBaseDrug = {
  id: 'seed-olanzapine-003',
  genericName: 'Olanzapin',
  genericNameEn: 'Olanzapine',
  brandNames: ['Zyprexa®'],
  drugClass: 'Atypisches Antipsychotikum (SGA)',
  drugClassEn: 'Atypical antipsychotic (SGA)',
  category: 'Antipsychotika',
  categoryEn: 'Antipsychotics',
  psychClass: 'antipsychotic_atypical',
  atcCode: 'N05AH03',
  tags: ['SGA', 'metabolisch', 'sedierend'],
  tagsEn: ['SGA', 'Metabolic', 'Sedating'],
  status: 'active',
  authorEditor: 'Seed',
  createdAt: NOW,
  updatedAt: NOW,
  receptorProfileVersion: 2,
  affinityScale: 'relative_log_ki_percent',
  dataModelVersion: 2,
  lastReceptorProfileUpdatedAt: NOW,
  sections: createDefaultSections(
    {
      kurzprofil:
        'Breit wirksames atypisches Antipsychotikum mit ausgeprägter H1-/M1-/5-HT2A-Affinität — sedierend und metabolisch relevant.',
      wirkmechanismus: 'Multirezeptor-Antagonist (5-HT2A, D2, H1, M1, α1, 5-HT2C).',
      rezeptorprofil:
        'Breites Bindungsprofil mit hoher H1- (Sedierung/Gewicht), M1- (anticholinerg) und 5-HT2A-Affinität.',
      indikationen: 'Schizophrenie, bipolare Störung (Manie + Erhaltung).',
      qtc: 'Niedriges QTc-Risiko in therapeutischer Dosierung.',
    },
    {
      pharmakokinetik: {
        pk: {
          halfLifeHours: 33,
          tmaxHours: 5,
          timeToSteadyStateDays: 7,
          bioavailabilityPercent: 60,
          proteinBindingPercent: 93,
          tdm: { lowNgMl: 20, highNgMl: 80, unit: 'ng/ml' },
          isEstimated: false,
          sourceNote: 'Fachinformation / AGNP-Konsensus',
          sourceNoteEn: 'SmPC / AGNP consensus',
        },
      },
      dosierung: {
        titration: {
          unit: 'mg',
          unitEn: 'mg',
          steps: [
            { startDay: 0, label: 'Start', labelEn: 'Start', doseMg: 5 },
            { startDay: 3, doseMg: 10 },
            { startDay: 7, label: 'Zieldosis', labelEn: 'Target dose', doseMg: 15 },
          ],
          targetDoseMg: 15,
          maxDoseMg: 20,
          isEstimated: false,
        },
      },
      nebenwirkungen: {
        sideEffects: [
          { effect: 'Gewichtszunahme', effectEn: 'Weight gain', system: 'metabolisch', systemEn: 'metabolic', frequency: 'veryCommon', severity: 'severe' },
          { effect: 'Sedierung', effectEn: 'Sedation', system: 'ZNS', systemEn: 'CNS', frequency: 'veryCommon', severity: 'moderate' },
          { effect: 'Dyslipidämie / Diabetesrisiko', effectEn: 'Dyslipidaemia / diabetes risk', system: 'metabolisch', systemEn: 'metabolic', frequency: 'common', severity: 'severe' },
          { effect: 'Mundtrockenheit (anticholinerg)', effectEn: 'Dry mouth (anticholinergic)', system: 'anticholinerg', systemEn: 'anticholinergic', frequency: 'common', severity: 'mild' },
          { effect: 'Transaminasenanstieg', effectEn: 'Raised transaminases', system: 'hepatisch', systemEn: 'hepatic', frequency: 'uncommon', severity: 'moderate' },
          { effect: 'Post-Injektions-Syndrom (Depot)', effectEn: 'Post-injection syndrome (depot)', system: 'kardiovaskulär', systemEn: 'cardiovascular', frequency: 'rare', severity: 'dangerous' },
        ],
      },
      umstellung: {
        depotOptions: [
          {
            name: 'Olanzapinpamoat',
            nameEn: 'Olanzapine pamoate',
            brandName: 'Zypadhera®',
            injectionIntervalDays: 28,
            loadingRegimen: [{ day: 0, doseLabel: '405 mg', doseLabelEn: '405 mg', route: 'gluteal', routeEn: 'gluteal' }],
            oralOverlapDays: 0,
            doseEquivalence: 'oral 10 mg/d ≈ 300 mg / 4 Wochen (nach Aufsättigung)',
            doseEquivalenceEn: 'oral 10 mg/day ≈ 300 mg every 4 weeks (after loading)',
            timeToSteadyStateWeeks: 12,
            firstMaintenanceDay: 28,
            postInjectionMonitoring:
              '3 Stunden klinische Überwachung nach jeder Injektion (Post-Injektions-Delir-/Sedierungs-Syndrom)',
            postInjectionMonitoringEn:
              '3 hours of clinical observation after each injection (post-injection delirium/sedation syndrome)',
            isEstimated: false,
            sourceNote: 'Fachinformation Zypadhera',
            sourceNoteEn: 'Zypadhera SmPC',
          },
        ],
      },
    },
    {
      kurzprofil:
        'Broadly acting atypical antipsychotic with pronounced H1, M1 and 5-HT2A affinity — sedating and metabolically significant.',
      wirkmechanismus: 'Multireceptor antagonist (5-HT2A, D2, H1, M1, α1, 5-HT2C).',
      rezeptorprofil:
        'Broad binding profile with high H1 (sedation, weight gain), M1 (anticholinergic) and 5-HT2A affinity.',
      indikationen: 'Schizophrenia and bipolar disorder (mania and maintenance).',
      qtc: 'Low QTc risk at therapeutic doses.',
    },
  ),
  receptorAffinityProfile: [
    { target: '5-HT2A', affinityPercent: 68, rawKiNm: 4, action: 'antagonist', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false, sourceNote: 'PDSP Ki database', sourceNoteEn: 'PDSP Ki database' },
    { target: 'H1', affinityPercent: 63, rawKiNm: 7, action: 'antagonist', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false, sourceNote: 'Sedierung / Gewichtszunahme', sourceNoteEn: 'Sedation / weight gain' },
    { target: 'M1', affinityPercent: 52, rawKiNm: 26, action: 'antagonist', evidenceQuality: 'moderate', clinicalRelevance: 'moderate', isEstimated: false, sourceNote: 'anticholinerge Last', sourceNoteEn: 'Anticholinergic burden' },
    { target: '5-HT2C', affinityPercent: 53, rawKiNm: 23, action: 'antagonist', evidenceQuality: 'moderate', clinicalRelevance: 'moderate', isEstimated: false },
    { target: 'D2', affinityPercent: 54, rawKiNm: 20, action: 'antagonist', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false },
    { target: 'α1', affinityPercent: 54, rawKiNm: 19, action: 'antagonist', evidenceQuality: 'moderate', clinicalRelevance: 'low', isEstimated: false },
    { target: 'D1', affinityPercent: 48, rawKiNm: 31, action: 'antagonist', evidenceQuality: 'low', clinicalRelevance: 'low', isEstimated: false },
  ],
}

/** v2 relative-affinity seed: Aripiprazole (D2 partial agonist). */
export const ARIPIPRAZOLE_SEED: KnowledgeBaseDrug = {
  id: 'seed-aripiprazole-004',
  genericName: 'Aripiprazol',
  genericNameEn: 'Aripiprazole',
  brandNames: ['Abilify®'],
  drugClass: 'Atypisches Antipsychotikum (Partialagonist)',
  drugClassEn: 'Atypical antipsychotic (partial agonist)',
  category: 'Antipsychotika',
  categoryEn: 'Antipsychotics',
  psychClass: 'antipsychotic_atypical',
  atcCode: 'N05AX12',
  tags: ['SGA', 'D2-Partialagonist', 'metabolisch günstig'],
  tagsEn: ['SGA', 'D2 partial agonist', 'Metabolically favourable'],
  status: 'active',
  authorEditor: 'Seed',
  createdAt: NOW,
  updatedAt: NOW,
  receptorProfileVersion: 2,
  affinityScale: 'relative_log_ki_percent',
  dataModelVersion: 2,
  lastReceptorProfileUpdatedAt: NOW,
  sections: createDefaultSections(
    {
      kurzprofil:
        'Dopamin-D2-Partialagonist ("dopaminerger Stabilisator") mit 5-HT1A-Partialagonismus und 5-HT2A-Antagonismus. Mehrere Depot-Optionen.',
      wirkmechanismus:
        'D2- und 5-HT1A-Partialagonist, 5-HT2A-Antagonist — funktionelle Aktivität abhängig vom dopaminergen Tonus.',
      rezeptorprofil:
        'D2/D3-Partialagonismus als Leitprinzip; metabolisch günstig (geringe H1-/M1-Last).',
      indikationen: 'Schizophrenie, bipolare Manie, Augmentation bei Depression.',
      qtc: 'Niedriges QTc-Risiko.',
      umstellung:
        'Mehrere LAI-Optionen mit unterschiedlichem Overlap: Abilify Maintena benötigt 14 Tage orales Overlap; eine Initiations-Strategie (Aristada Initio + orale Einzeldosis) ermöglicht den Verzicht auf 14-Tage-Overlap.',
    },
    {
      pharmakokinetik: {
        pk: {
          halfLifeHours: 75,
          halfLifeNote: 'aktiver Metabolit Dehydroaripiprazol ~94 h',
          halfLifeNoteEn: 'Active metabolite dehydroaripiprazole ~94 h',
          tmaxHours: 4,
          timeToSteadyStateDays: 14,
          bioavailabilityPercent: 87,
          proteinBindingPercent: 99,
          tdm: { lowNgMl: 100, highNgMl: 350, unit: 'ng/ml' },
          isEstimated: false,
          sourceNote: 'Fachinformation / AGNP-Konsensus',
          sourceNoteEn: 'SmPC / AGNP consensus',
        },
      },
      dosierung: {
        titration: {
          unit: 'mg',
          unitEn: 'mg',
          steps: [
            { startDay: 0, label: 'Start', labelEn: 'Start', doseMg: 10 },
            { startDay: 14, label: 'Zieldosis', labelEn: 'Target dose', doseMg: 15 },
          ],
          targetDoseMg: 15,
          maxDoseMg: 30,
          isEstimated: false,
        },
      },
      nebenwirkungen: {
        sideEffects: [
          { effect: 'Akathisie', effectEn: 'Akathisia', system: 'EPS', systemEn: 'EPS', frequency: 'common', severity: 'moderate' },
          { effect: 'Unruhe / Insomnie', effectEn: 'Restlessness / insomnia', system: 'ZNS', systemEn: 'CNS', frequency: 'common', severity: 'mild' },
          { effect: 'Übelkeit', effectEn: 'Nausea', system: 'gastrointestinal', systemEn: 'gastrointestinal', frequency: 'common', severity: 'mild' },
          { effect: 'Impulskontrollstörungen', effectEn: 'Impulse-control disorders', system: 'psychiatrisch', systemEn: 'psychiatric', frequency: 'uncommon', severity: 'moderate' },
        ],
      },
      umstellung: {
        depotOptions: [
          {
            name: 'Aripiprazol-Depot',
            nameEn: 'Aripiprazole long-acting injection',
            brandName: 'Abilify Maintena®',
            injectionIntervalDays: 28,
            loadingRegimen: [],
            oralOverlapDays: 14,
            doseEquivalence: 'oral 15 mg/d ≈ 400 mg / 4 Wochen',
            doseEquivalenceEn: 'oral 15 mg/day ≈ 400 mg every 4 weeks',
            timeToSteadyStateWeeks: 16,
            firstMaintenanceDay: 0,
            postInjectionMonitoring: 'erste Injektion + 14 Tage orales Aripiprazol fortführen',
            postInjectionMonitoringEn: 'First injection + continue oral aripiprazole for 14 days',
            isEstimated: false,
            sourceNote: 'Fachinformation Abilify Maintena',
            sourceNoteEn: 'Abilify Maintena SmPC',
          },
          {
            name: 'Aripiprazol Lauroxil — Initiation',
            nameEn: 'Aripiprazole lauroxil — initiation',
            brandName: 'Aristada Initio®',
            injectionIntervalDays: 56,
            loadingRegimen: [
              { day: 0, doseLabel: '675 mg (Initio)', doseLabelEn: '675 mg (Initio)', route: 'deltoid/gluteal', routeEn: 'deltoid/gluteal' },
              { day: 0, doseLabel: '+ 30 mg p.o. einmalig', doseLabelEn: '+ 30 mg orally, single dose', route: 'oral', routeEn: 'oral' },
            ],
            oralOverlapDays: 0,
            doseEquivalence: 'Initio + Einzeldosis p.o. → kein 14-Tage-Overlap nötig',
            doseEquivalenceEn: 'Initio + single oral dose → no 14-day oral overlap required',
            firstMaintenanceDay: 0,
            isEstimated: true,
            sourceNote: 'illustrativ — Aristada Initio Strategie (US-Zulassung)',
            sourceNoteEn: 'Illustrative — Aristada Initio strategy (US approval)',
          },
        ],
      },
    },
    {
      kurzprofil:
        'Dopamine D2 partial agonist ("dopamine stabiliser") with 5-HT1A partial agonism and 5-HT2A antagonism. Several depot options available.',
      wirkmechanismus:
        'D2 and 5-HT1A partial agonist, 5-HT2A antagonist — functional activity depends on the prevailing dopaminergic tone.',
      rezeptorprofil:
        'D2/D3 partial agonism as the guiding principle; metabolically favourable (low H1/M1 burden).',
      indikationen: 'Schizophrenia, bipolar mania, adjunctive use in depression.',
      qtc: 'Low QTc risk.',
      umstellung:
        'Several LAI options with different overlap requirements: Abilify Maintena needs 14 days of oral overlap; an initiation strategy (Aristada Initio + a single oral dose) avoids the 14-day overlap.',
    },
  ),
  receptorAffinityProfile: [
    { target: 'D2', affinityPercent: 89, rawKiNm: 0.34, pKi: 9.5, action: 'partial_agonist', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false, sourceNote: 'partieller Agonismus, hoher intrinsischer Wert', sourceNoteEn: 'Partial agonism with high intrinsic activity' },
    { target: '5-HT1A', affinityPercent: 75, rawKiNm: 1.7, action: 'partial_agonist', evidenceQuality: 'high', clinicalRelevance: 'moderate', isEstimated: false },
    { target: '5-HT2A', affinityPercent: 69, rawKiNm: 3.4, action: 'antagonist', evidenceQuality: 'high', clinicalRelevance: 'moderate', isEstimated: false },
    { target: 'D3', affinityPercent: 78, rawKiNm: 0.8, action: 'partial_agonist', evidenceQuality: 'moderate', clinicalRelevance: 'moderate', isEstimated: false },
    { target: 'α1', affinityPercent: 56, rawKiNm: 18, action: 'antagonist', evidenceQuality: 'moderate', clinicalRelevance: 'low', isEstimated: false },
    { target: 'H1', affinityPercent: 54, rawKiNm: 20, action: 'antagonist', evidenceQuality: 'moderate', clinicalRelevance: 'low', isEstimated: false },
  ],
}

/** v2 relative-affinity seed: Sertraline (SERT-dominant SSRI). */
export const SERTRALINE_SEED: KnowledgeBaseDrug = {
  id: 'seed-sertraline-005',
  genericName: 'Sertralin',
  genericNameEn: 'Sertraline',
  brandNames: ['Zoloft®'],
  drugClass: 'Selektiver Serotonin-Wiederaufnahmehemmer (SSRI)',
  drugClassEn: 'Selective serotonin reuptake inhibitor (SSRI)',
  category: 'Antidepressiva',
  categoryEn: 'Antidepressants',
  psychClass: 'antidepressant_ssri',
  atcCode: 'N06AB06',
  tags: ['SSRI', 'SERT'],
  tagsEn: ['SSRI', 'SERT'],
  status: 'active',
  authorEditor: 'Seed',
  createdAt: NOW,
  updatedAt: NOW,
  receptorProfileVersion: 2,
  affinityScale: 'relative_log_ki_percent',
  dataModelVersion: 2,
  lastReceptorProfileUpdatedAt: NOW,
  sections: createDefaultSections(
    {
      kurzprofil:
        'SSRI mit dominanter Serotonin-Transporter-Hemmung; klinisch geringe, aber messbare DAT-Affinität.',
      wirkmechanismus:
        'Potente SERT-Hemmung; schwächere NET-/DAT-Affinität ohne wesentliche Rezeptorblockade.',
      rezeptorprofil: 'SERT-dominant; klinisch keine relevante Rezeptorblockade.',
      indikationen: 'Depression, Angststörungen, Zwangsstörung, PTBS, PMDS.',
      qtc: 'Geringes QTc-Risiko; höhere Dosen können QTc gering verlängern.',
      absetzen:
        'Ausschleichen über Wochen empfohlen; abrupt → Absetzsyndrom (Schwindel, "brain zaps", Reizbarkeit). HWZ moderat, daher mildere Absetzphänomene als bei Paroxetin.',
    },
    {
      pharmakokinetik: {
        pk: {
          halfLifeHours: 26,
          tmaxHours: 6,
          timeToSteadyStateDays: 7,
          bioavailabilityPercent: 44,
          proteinBindingPercent: 98,
          tdm: { lowNgMl: 10, highNgMl: 150, unit: 'ng/ml' },
          isEstimated: false,
          sourceNote: 'Fachinformation / AGNP-Konsensus',
          sourceNoteEn: 'SmPC / AGNP consensus',
        },
      },
      dosierung: {
        titration: {
          unit: 'mg',
          unitEn: 'mg',
          steps: [
            { startDay: 0, label: 'Start', labelEn: 'Start', doseMg: 25 },
            { startDay: 7, doseMg: 50 },
            { startDay: 21, label: 'Zieldosis', labelEn: 'Target dose', doseMg: 100 },
          ],
          targetDoseMg: 100,
          maxDoseMg: 200,
          isEstimated: false,
        },
      },
      nebenwirkungen: {
        sideEffects: [
          { effect: 'Übelkeit / Diarrhö', effectEn: 'Nausea / diarrhoea', system: 'gastrointestinal', systemEn: 'gastrointestinal', frequency: 'veryCommon', severity: 'mild' },
          { effect: 'Sexuelle Funktionsstörung', effectEn: 'Sexual dysfunction', system: 'sexuell', systemEn: 'sexual', frequency: 'common', severity: 'moderate' },
          { effect: 'Insomnie / Unruhe', effectEn: 'Insomnia / restlessness', system: 'ZNS', systemEn: 'CNS', frequency: 'common', severity: 'mild' },
          { effect: 'Hyponatriämie (SIADH)', effectEn: 'Hyponatraemia (SIADH)', system: 'endokrin', systemEn: 'endocrine', frequency: 'rare', severity: 'severe' },
          { effect: 'Serotonin-Syndrom', effectEn: 'Serotonin syndrome', system: 'neurologisch', systemEn: 'neurological', frequency: 'rare', severity: 'dangerous' },
        ],
      },
      absetzen: {
        titration: {
          unit: 'mg',
          unitEn: 'mg',
          steps: [
            { startDay: 0, label: 'Ausgangsdosis', labelEn: 'Starting dose', doseMg: 100 },
            { startDay: 14, doseMg: 50 },
            { startDay: 28, doseMg: 25 },
            { startDay: 42, label: 'Absetzen', labelEn: 'Stop', doseMg: null },
          ],
          isEstimated: true,
        },
      },
      wechselwirkungen: {
        cyp: {
          enzymes: [
            { enzyme: 'CYP2D6', role: 'inhibitor', strength: 'schwach–mäßig', strengthEn: 'weak to moderate' },
            { enzyme: 'CYP2C19', role: 'inhibitor', strength: 'schwach', strengthEn: 'weak' },
            { enzyme: 'CYP3A4', role: 'substrate', strength: 'minor', strengthEn: 'minor' },
          ],
          interactions: [
            { withDrugOrClass: 'MAO-Hemmer', withDrugOrClassEn: 'MAO inhibitors', severity: 'major', effect: 'Serotonin-Syndrom — kontraindiziert', effectEn: 'Serotonin syndrome — contraindicated' },
            { withDrugOrClass: 'Antikoagulanzien / NSAR', withDrugOrClassEn: 'Anticoagulants / NSAIDs', severity: 'moderate', effect: '↑ Blutungsrisiko', effectEn: '↑ bleeding risk' },
          ],
          qtcRisk: 'low',
          isEstimated: false,
        },
      },
    },
    {
      kurzprofil:
        'SSRI with dominant serotonin-transporter inhibition; clinically minor but measurable DAT affinity.',
      wirkmechanismus:
        'Potent SERT inhibition with weaker NET/DAT affinity and no clinically meaningful receptor blockade.',
      rezeptorprofil: 'SERT-dominant; no clinically relevant receptor blockade.',
      indikationen: 'Depression, anxiety disorders, OCD, PTSD, premenstrual dysphoric disorder.',
      qtc: 'Low QTc risk; higher doses may produce minor QTc prolongation.',
      absetzen:
        'Taper over several weeks is recommended; abrupt cessation can cause a discontinuation syndrome (dizziness, "brain zaps", irritability). The moderate half-life makes withdrawal phenomena milder than with paroxetine.',
    },
  ),
  receptorAffinityProfile: [
    { target: 'SERT', affinityPercent: 91, rawKiNm: 0.29, pKi: 9.5, action: 'reuptake_inhibitor', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false, sourceNote: 'primärer Wirkmechanismus', sourceNoteEn: 'Primary mechanism of action' },
    { target: 'DAT', affinityPercent: 41, rawKiNm: 315, action: 'reuptake_inhibitor', evidenceQuality: 'moderate', clinicalRelevance: 'low', isEstimated: false, sourceNote: 'schwache Affinität, klinische Relevanz unklar', sourceNoteEn: 'Weak affinity; clinical relevance unclear' },
    { target: 'NET', affinityPercent: 22, rawKiNm: 1700, action: 'reuptake_inhibitor', evidenceQuality: 'low', clinicalRelevance: 'low', isEstimated: false },
    { target: 'α1', affinityPercent: 30, action: 'antagonist', evidenceQuality: 'estimated', clinicalRelevance: 'low', isEstimated: true, sourceNote: 'geringe Affinität', sourceNoteEn: 'Minimal affinity' },
  ],
}

/**
 * v2 depot/LAI seed: Paliperidonpalmitat 1-monatlich (the 9-OH metabolite of
 * risperidone). Demonstrates the headline switching feature: a two-injection
 * deltoid loading regimen (day 1 + day 8) with NO oral overlap required.
 */
export const PALIPERIDONE_PALMITATE_SEED: KnowledgeBaseDrug = {
  id: 'seed-paliperidone-palmitate-006',
  genericName: 'Paliperidonpalmitat',
  genericNameEn: 'Paliperidone palmitate',
  brandNames: ['Xeplion®', 'Trevicta®'],
  drugClass: 'Atypisches Antipsychotikum (Depot/LAI)',
  drugClassEn: 'Atypical antipsychotic (depot / LAI)',
  category: 'Depotpräparate',
  categoryEn: 'Long-acting injectables',
  psychClass: 'antipsychotic_atypical',
  atcCode: 'N05AX13',
  tags: ['SGA', 'Depot', 'LAI', 'D2', '5-HT2A'],
  tagsEn: ['SGA', 'Depot', 'LAI', 'D2', '5-HT2A'],
  status: 'active',
  authorEditor: 'Seed',
  createdAt: NOW,
  updatedAt: NOW,
  receptorProfileVersion: 2,
  affinityScale: 'relative_log_ki_percent',
  dataModelVersion: 2,
  lastReceptorProfileUpdatedAt: NOW,
  sections: createDefaultSections(
    {
      kurzprofil:
        'Langwirksames Injektabile (LAI) des aktiven Risperidon-Metaboliten Paliperidon. 1-monatliche (Xeplion) und 3-monatliche (Trevicta) Form. Kein orales Overlap nötig.',
      wirkmechanismus:
        'D2- und 5-HT2A-Antagonist (wie Paliperidon/9-OH-Risperidon); zusätzliche α1-/α2-/H1-Blockade.',
      rezeptorprofil: 'D2- und 5-HT2A-dominant; α1-/H1-Komponente. Nahezu identisch zum Risperidon-Profil.',
      indikationen: 'Schizophrenie (Erhaltungstherapie), schizoaffektive Störung.',
      umstellung:
        'Aufsättigung über zwei Deltoid-Injektionen (Tag 1: 150 mg eq., Tag 8: 100 mg eq.) — danach monatliche Erhaltung. KEIN orales Overlap erforderlich, da die Loading-Dosen rasch wirksame Spiegel aufbauen.',
      qtc: 'Moderates QTc-Risiko (klasseneffekt-ähnlich zu Risperidon).',
    },
    {
      pharmakokinetik: {
        pk: {
          halfLifeHours: 600,
          halfLifeNote: 'Depot: scheinbare HWZ 25–49 Tage (Freisetzungs-limitiert)',
          halfLifeNoteEn: 'Depot: apparent half-life 25–49 days (release-limited)',
          tmaxHours: 312,
          timeToSteadyStateDays: 180,
          proteinBindingPercent: 74,
          tdm: {
            lowNgMl: 20,
            highNgMl: 60,
            unit: 'ng/ml',
            note: 'als Paliperidon',
            noteEn: 'measured as paliperidone',
          },
          isEstimated: false,
          sourceNote: 'Fachinformation Xeplion',
          sourceNoteEn: 'Xeplion SmPC',
        },
      },
      nebenwirkungen: {
        sideEffects: [
          { effect: 'Reaktion an Injektionsstelle', effectEn: 'Injection-site reaction', system: 'lokal', systemEn: 'local', frequency: 'common', severity: 'mild' },
          { effect: 'Hyperprolaktinämie', effectEn: 'Hyperprolactinaemia', system: 'endokrin', systemEn: 'endocrine', frequency: 'veryCommon', severity: 'moderate' },
          { effect: 'Gewichtszunahme', effectEn: 'Weight gain', system: 'metabolisch', systemEn: 'metabolic', frequency: 'common', severity: 'moderate' },
          { effect: 'EPS / Akathisie', effectEn: 'EPS / akathisia', system: 'EPS', systemEn: 'EPS', frequency: 'common', severity: 'moderate' },
          { effect: 'QTc-Verlängerung', effectEn: 'QTc prolongation', system: 'kardial', systemEn: 'cardiac', frequency: 'rare', severity: 'dangerous' },
        ],
      },
      umstellung: {
        depotOptions: [
          {
            name: 'Paliperidonpalmitat 1-monatlich',
            nameEn: 'Paliperidone palmitate, 1-monthly',
            brandName: 'Xeplion®',
            injectionIntervalDays: 28,
            loadingRegimen: [
              { day: 1, doseLabel: '150 mg eq.', doseLabelEn: '150 mg eq.', route: 'deltoid', routeEn: 'deltoid' },
              { day: 8, doseLabel: '100 mg eq.', doseLabelEn: '100 mg eq.', route: 'deltoid', routeEn: 'deltoid' },
            ],
            oralOverlapDays: 0,
            doseEquivalence: 'orales Paliperidon 6 mg/d ≈ 75–100 mg eq. / 4 Wochen',
            doseEquivalenceEn: 'oral paliperidone 6 mg/day ≈ 75–100 mg eq. every 4 weeks',
            timeToSteadyStateWeeks: 26,
            firstMaintenanceDay: 35,
            flexWindowDays: 7,
            postInjectionMonitoring: 'Loading-Dosen in den Deltoideus; Erhaltung deltoid oder gluteal',
            postInjectionMonitoringEn: 'Loading doses into the deltoid; maintenance into deltoid or gluteal',
            isEstimated: false,
            sourceNote: 'Fachinformation Xeplion',
            sourceNoteEn: 'Xeplion SmPC',
          },
          {
            name: 'Paliperidonpalmitat 3-monatlich',
            nameEn: 'Paliperidone palmitate, 3-monthly',
            brandName: 'Trevicta®',
            injectionIntervalDays: 91,
            loadingRegimen: [],
            oralOverlapDays: 0,
            doseEquivalence: 'erst nach ≥4 Monaten stabiler 1-monatlicher Therapie umstellen',
            doseEquivalenceEn: 'only switch after ≥ 4 months of stable 1-monthly therapy',
            firstMaintenanceDay: 0,
            flexWindowDays: 14,
            isEstimated: false,
            sourceNote: 'Fachinformation Trevicta',
            sourceNoteEn: 'Trevicta SmPC',
          },
        ],
      },
    },
    {
      kurzprofil:
        'Long-acting injectable (LAI) of paliperidone, the active metabolite of risperidone. 1-monthly (Xeplion) and 3-monthly (Trevicta) presentations. No oral overlap required.',
      wirkmechanismus:
        'D2 and 5-HT2A antagonist (as paliperidone / 9-OH-risperidone); additional α1, α2 and H1 blockade.',
      rezeptorprofil: 'D2 and 5-HT2A dominant; α1 and H1 components. Almost identical to the risperidone profile.',
      indikationen: 'Schizophrenia (maintenance therapy), schizoaffective disorder.',
      umstellung:
        'Loading is delivered via two deltoid injections (day 1: 150 mg eq., day 8: 100 mg eq.), followed by monthly maintenance. No oral overlap is required because the loading doses build therapeutic plasma levels quickly.',
      qtc: 'Moderate QTc risk (class effect similar to risperidone).',
    },
  ),
  receptorAffinityProfile: [
    { target: 'D2', affinityPercent: 72, rawKiNm: 2.8, action: 'antagonist', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false, sourceNote: 'als Paliperidon', sourceNoteEn: 'Measured as paliperidone' },
    { target: '5-HT2A', affinityPercent: 84, rawKiNm: 0.6, action: 'antagonist', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false },
    { target: 'α1', affinityPercent: 70, rawKiNm: 3, action: 'antagonist', evidenceQuality: 'moderate', clinicalRelevance: 'moderate', isEstimated: false },
    { target: 'α2', affinityPercent: 58, rawKiNm: 10, action: 'antagonist', evidenceQuality: 'moderate', clinicalRelevance: 'low', isEstimated: false },
    { target: 'H1', affinityPercent: 52, rawKiNm: 22, action: 'antagonist', evidenceQuality: 'moderate', clinicalRelevance: 'low', isEstimated: false },
  ],
}

export const KB_DRUG_SEED_DATA: KnowledgeBaseDrug[] = [
  HALOPERIDOL_SEED,
  RISPERIDONE_SEED,
  OLANZAPINE_SEED,
  ARIPIPRAZOLE_SEED,
  SERTRALINE_SEED,
  PALIPERIDONE_PALMITATE_SEED,
]
