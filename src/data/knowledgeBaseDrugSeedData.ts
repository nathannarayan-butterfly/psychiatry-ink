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
  brandNames: ['Haldol®'],
  drugClass: 'Hochpotentes typisches Antipsychotikum',
  category: 'Antipsychotika',
  psychClass: 'antipsychotic_typical',
  atcCode: 'N05AD01',
  tags: ['FGA', 'D2-Antagonist', 'Depot', 'Delir'],
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
          tmaxHours: 4,
          timeToSteadyStateDays: 5,
          bioavailabilityPercent: 65,
          proteinBindingPercent: 92,
          tdm: { lowNgMl: 1, highNgMl: 10, unit: 'ng/ml', note: 'Erhaltungstherapie; AGNP-Konsensus' },
          isEstimated: true,
          sourceNote: 'Fachinformation / AGNP-Konsensus 2022',
        },
      },
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
      confidence: 'curated',
    },
    H1: {
      score: 1,
      action: 'antagonist',
      clinicalMeaning: 'Nur geringe Sedierung.',
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
  brandNames: ['Risperdal®'],
  drugClass: 'Atypisches Antipsychotikum (SGA)',
  category: 'Antipsychotika',
  psychClass: 'antipsychotic_atypical',
  atcCode: 'N05AX08',
  tags: ['SGA', 'D2', '5-HT2A', 'Depot'],
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
          tmaxHours: 1,
          timeToSteadyStateDays: 5,
          bioavailabilityPercent: 70,
          proteinBindingPercent: 90,
          tdm: { lowNgMl: 20, highNgMl: 60, unit: 'ng/ml', note: 'Summe Risperidon + 9-OH' },
          isEstimated: false,
          sourceNote: 'Fachinformation / AGNP-Konsensus',
        },
      },
      dosierung: {
        titration: {
          unit: 'mg',
          steps: [
            { startDay: 0, label: 'Start', doseMg: 2 },
            { startDay: 3, doseMg: 4 },
            { startDay: 7, label: 'Zieldosis', doseMg: 6 },
          ],
          targetDoseMg: 6,
          maxDoseMg: 16,
          isEstimated: false,
        },
      },
      nebenwirkungen: {
        sideEffects: [
          { effect: 'Hyperprolaktinämie', system: 'endokrin', frequency: 'veryCommon', severity: 'moderate' },
          { effect: 'EPS / Akathisie', system: 'EPS', frequency: 'common', severity: 'moderate' },
          { effect: 'Gewichtszunahme', system: 'metabolisch', frequency: 'common', severity: 'moderate' },
          { effect: 'Orthostase', system: 'kardiovaskulär', frequency: 'common', severity: 'mild' },
          { effect: 'QTc-Verlängerung', system: 'kardial', frequency: 'rare', severity: 'dangerous' },
          { effect: 'Malignes neuroleptisches Syndrom', system: 'neurologisch', frequency: 'rare', severity: 'dangerous' },
        ],
      },
      wechselwirkungen: {
        cyp: {
          enzymes: [
            { enzyme: 'CYP2D6', role: 'substrate', strength: 'major' },
            { enzyme: 'CYP3A4', role: 'substrate', strength: 'minor' },
          ],
          interactions: [
            { withDrugOrClass: 'CYP2D6-Inhibitoren (Paroxetin, Fluoxetin)', severity: 'moderate', effect: '↑ Risperidon-Spiegel' },
            { withDrugOrClass: 'QTc-verlängernde Substanzen', severity: 'major', effect: 'additive QTc-Verlängerung' },
          ],
          qtcRisk: 'moderate',
          isEstimated: false,
        },
      },
      umstellung: {
        depotOptions: [
          {
            name: 'Risperidon-Depot',
            brandName: 'Risperdal Consta®',
            injectionIntervalDays: 14,
            loadingRegimen: [],
            oralOverlapDays: 21,
            doseEquivalence: 'oral 3 mg/d ≈ 37,5–50 mg / 2 Wochen',
            timeToSteadyStateWeeks: 6,
            firstMaintenanceDay: 0,
            isEstimated: false,
            sourceNote: 'Fachinformation Risperdal Consta',
          },
        ],
      },
    },
  ),
  receptorAffinityProfile: [
    { target: '5-HT2A', affinityPercent: 86, rawKiNm: 0.5, pKi: 9.3, action: 'antagonist', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false, sourceNote: 'PDSP Ki database' },
    { target: 'D2', affinityPercent: 70, rawKiNm: 3, pKi: 8.5, action: 'antagonist', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false, sourceNote: 'PDSP Ki database' },
    { target: 'α1', affinityPercent: 74, rawKiNm: 2, action: 'antagonist', evidenceQuality: 'moderate', clinicalRelevance: 'moderate', isEstimated: false },
    { target: 'α2', affinityPercent: 62, rawKiNm: 8, action: 'antagonist', evidenceQuality: 'moderate', clinicalRelevance: 'low', isEstimated: false },
    { target: 'H1', affinityPercent: 54, rawKiNm: 20, action: 'antagonist', evidenceQuality: 'moderate', clinicalRelevance: 'moderate', isEstimated: false },
    { target: '5-HT2C', affinityPercent: 50, action: 'antagonist', evidenceQuality: 'estimated', clinicalRelevance: 'low', isEstimated: true },
    { target: 'M1', affinityPercent: null, action: 'unknown', evidenceQuality: 'low', clinicalRelevance: 'low', isEstimated: true, sourceNote: 'negligible muscarinic affinity' },
  ],
}

/** v2 relative-affinity seed: Olanzapine (broad 5-HT2A / H1 / M1). */
export const OLANZAPINE_SEED: KnowledgeBaseDrug = {
  id: 'seed-olanzapine-003',
  genericName: 'Olanzapin',
  brandNames: ['Zyprexa®'],
  drugClass: 'Atypisches Antipsychotikum (SGA)',
  category: 'Antipsychotika',
  psychClass: 'antipsychotic_atypical',
  atcCode: 'N05AH03',
  tags: ['SGA', 'metabolisch', 'sedierend'],
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
        },
      },
      dosierung: {
        titration: {
          unit: 'mg',
          steps: [
            { startDay: 0, label: 'Start', doseMg: 5 },
            { startDay: 3, doseMg: 10 },
            { startDay: 7, label: 'Zieldosis', doseMg: 15 },
          ],
          targetDoseMg: 15,
          maxDoseMg: 20,
          isEstimated: false,
        },
      },
      nebenwirkungen: {
        sideEffects: [
          { effect: 'Gewichtszunahme', system: 'metabolisch', frequency: 'veryCommon', severity: 'severe' },
          { effect: 'Sedierung', system: 'ZNS', frequency: 'veryCommon', severity: 'moderate' },
          { effect: 'Dyslipidämie / Diabetesrisiko', system: 'metabolisch', frequency: 'common', severity: 'severe' },
          { effect: 'Mundtrockenheit (anticholinerg)', system: 'anticholinerg', frequency: 'common', severity: 'mild' },
          { effect: 'Transaminasenanstieg', system: 'hepatisch', frequency: 'uncommon', severity: 'moderate' },
          { effect: 'Post-Injektions-Syndrom (Depot)', system: 'kardiovaskulär', frequency: 'rare', severity: 'dangerous' },
        ],
      },
      umstellung: {
        depotOptions: [
          {
            name: 'Olanzapinpamoat',
            brandName: 'Zypadhera®',
            injectionIntervalDays: 28,
            loadingRegimen: [{ day: 0, doseLabel: '405 mg', route: 'gluteal' }],
            oralOverlapDays: 0,
            doseEquivalence: 'oral 10 mg/d ≈ 300 mg / 4 Wochen (nach Aufsättigung)',
            timeToSteadyStateWeeks: 12,
            firstMaintenanceDay: 28,
            postInjectionMonitoring:
              '3 Stunden klinische Überwachung nach jeder Injektion (Post-Injektions-Delir-/Sedierungs-Syndrom)',
            isEstimated: false,
            sourceNote: 'Fachinformation Zypadhera',
          },
        ],
      },
    },
  ),
  receptorAffinityProfile: [
    { target: '5-HT2A', affinityPercent: 68, rawKiNm: 4, action: 'antagonist', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false, sourceNote: 'PDSP Ki database' },
    { target: 'H1', affinityPercent: 63, rawKiNm: 7, action: 'antagonist', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false, sourceNote: 'Sedierung / Gewichtszunahme' },
    { target: 'M1', affinityPercent: 52, rawKiNm: 26, action: 'antagonist', evidenceQuality: 'moderate', clinicalRelevance: 'moderate', isEstimated: false, sourceNote: 'anticholinerge Last' },
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
  brandNames: ['Abilify®'],
  drugClass: 'Atypisches Antipsychotikum (Partialagonist)',
  category: 'Antipsychotika',
  psychClass: 'antipsychotic_atypical',
  atcCode: 'N05AX12',
  tags: ['SGA', 'D2-Partialagonist', 'metabolisch günstig'],
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
          tmaxHours: 4,
          timeToSteadyStateDays: 14,
          bioavailabilityPercent: 87,
          proteinBindingPercent: 99,
          tdm: { lowNgMl: 100, highNgMl: 350, unit: 'ng/ml' },
          isEstimated: false,
          sourceNote: 'Fachinformation / AGNP-Konsensus',
        },
      },
      dosierung: {
        titration: {
          unit: 'mg',
          steps: [
            { startDay: 0, label: 'Start', doseMg: 10 },
            { startDay: 14, label: 'Zieldosis', doseMg: 15 },
          ],
          targetDoseMg: 15,
          maxDoseMg: 30,
          isEstimated: false,
        },
      },
      nebenwirkungen: {
        sideEffects: [
          { effect: 'Akathisie', system: 'EPS', frequency: 'common', severity: 'moderate' },
          { effect: 'Unruhe / Insomnie', system: 'ZNS', frequency: 'common', severity: 'mild' },
          { effect: 'Übelkeit', system: 'gastrointestinal', frequency: 'common', severity: 'mild' },
          { effect: 'Impulskontrollstörungen', system: 'psychiatrisch', frequency: 'uncommon', severity: 'moderate' },
        ],
      },
      umstellung: {
        depotOptions: [
          {
            name: 'Aripiprazol-Depot',
            brandName: 'Abilify Maintena®',
            injectionIntervalDays: 28,
            loadingRegimen: [],
            oralOverlapDays: 14,
            doseEquivalence: 'oral 15 mg/d ≈ 400 mg / 4 Wochen',
            timeToSteadyStateWeeks: 16,
            firstMaintenanceDay: 0,
            postInjectionMonitoring: 'erste Injektion + 14 Tage orales Aripiprazol fortführen',
            isEstimated: false,
            sourceNote: 'Fachinformation Abilify Maintena',
          },
          {
            name: 'Aripiprazol Lauroxil — Initiation',
            brandName: 'Aristada Initio®',
            injectionIntervalDays: 56,
            loadingRegimen: [
              { day: 0, doseLabel: '675 mg (Initio)', route: 'deltoid/gluteal' },
              { day: 0, doseLabel: '+ 30 mg p.o. einmalig', route: 'oral' },
            ],
            oralOverlapDays: 0,
            doseEquivalence: 'Initio + Einzeldosis p.o. → kein 14-Tage-Overlap nötig',
            firstMaintenanceDay: 0,
            isEstimated: true,
            sourceNote: 'illustrativ — Aristada Initio Strategie (US-Zulassung)',
          },
        ],
      },
    },
  ),
  receptorAffinityProfile: [
    { target: 'D2', affinityPercent: 89, rawKiNm: 0.34, pKi: 9.5, action: 'partial_agonist', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false, sourceNote: 'partieller Agonismus, hoher intrinsischer Wert' },
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
  brandNames: ['Zoloft®'],
  drugClass: 'Selektiver Serotonin-Wiederaufnahmehemmer (SSRI)',
  category: 'Antidepressiva',
  psychClass: 'antidepressant_ssri',
  atcCode: 'N06AB06',
  tags: ['SSRI', 'SERT'],
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
        },
      },
      dosierung: {
        titration: {
          unit: 'mg',
          steps: [
            { startDay: 0, label: 'Start', doseMg: 25 },
            { startDay: 7, doseMg: 50 },
            { startDay: 21, label: 'Zieldosis', doseMg: 100 },
          ],
          targetDoseMg: 100,
          maxDoseMg: 200,
          isEstimated: false,
        },
      },
      nebenwirkungen: {
        sideEffects: [
          { effect: 'Übelkeit / Diarrhö', system: 'gastrointestinal', frequency: 'veryCommon', severity: 'mild' },
          { effect: 'Sexuelle Funktionsstörung', system: 'sexuell', frequency: 'common', severity: 'moderate' },
          { effect: 'Insomnie / Unruhe', system: 'ZNS', frequency: 'common', severity: 'mild' },
          { effect: 'Hyponatriämie (SIADH)', system: 'endokrin', frequency: 'rare', severity: 'severe' },
          { effect: 'Serotonin-Syndrom', system: 'neurologisch', frequency: 'rare', severity: 'dangerous' },
        ],
      },
      absetzen: {
        titration: {
          unit: 'mg',
          steps: [
            { startDay: 0, label: 'Ausgangsdosis', doseMg: 100 },
            { startDay: 14, doseMg: 50 },
            { startDay: 28, doseMg: 25 },
            { startDay: 42, label: 'Absetzen', doseMg: null },
          ],
          isEstimated: true,
        },
      },
      wechselwirkungen: {
        cyp: {
          enzymes: [
            { enzyme: 'CYP2D6', role: 'inhibitor', strength: 'schwach–mäßig' },
            { enzyme: 'CYP2C19', role: 'inhibitor', strength: 'schwach' },
            { enzyme: 'CYP3A4', role: 'substrate', strength: 'minor' },
          ],
          interactions: [
            { withDrugOrClass: 'MAO-Hemmer', severity: 'major', effect: 'Serotonin-Syndrom — kontraindiziert' },
            { withDrugOrClass: 'Antikoagulanzien / NSAR', severity: 'moderate', effect: '↑ Blutungsrisiko' },
          ],
          qtcRisk: 'low',
          isEstimated: false,
        },
      },
    },
  ),
  receptorAffinityProfile: [
    { target: 'SERT', affinityPercent: 91, rawKiNm: 0.29, pKi: 9.5, action: 'reuptake_inhibitor', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false, sourceNote: 'primärer Wirkmechanismus' },
    { target: 'DAT', affinityPercent: 41, rawKiNm: 315, action: 'reuptake_inhibitor', evidenceQuality: 'moderate', clinicalRelevance: 'low', isEstimated: false, sourceNote: 'schwache Affinität, klinische Relevanz unklar' },
    { target: 'NET', affinityPercent: 22, rawKiNm: 1700, action: 'reuptake_inhibitor', evidenceQuality: 'low', clinicalRelevance: 'low', isEstimated: false },
    { target: 'α1', affinityPercent: 30, action: 'antagonist', evidenceQuality: 'estimated', clinicalRelevance: 'low', isEstimated: true, sourceNote: 'geringe Affinität' },
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
  brandNames: ['Xeplion®', 'Trevicta®'],
  drugClass: 'Atypisches Antipsychotikum (Depot/LAI)',
  category: 'Depotpräparate',
  psychClass: 'antipsychotic_atypical',
  atcCode: 'N05AX13',
  tags: ['SGA', 'Depot', 'LAI', 'D2', '5-HT2A'],
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
          tmaxHours: 312,
          timeToSteadyStateDays: 180,
          proteinBindingPercent: 74,
          tdm: { lowNgMl: 20, highNgMl: 60, unit: 'ng/ml', note: 'als Paliperidon' },
          isEstimated: false,
          sourceNote: 'Fachinformation Xeplion',
        },
      },
      nebenwirkungen: {
        sideEffects: [
          { effect: 'Reaktion an Injektionsstelle', system: 'lokal', frequency: 'common', severity: 'mild' },
          { effect: 'Hyperprolaktinämie', system: 'endokrin', frequency: 'veryCommon', severity: 'moderate' },
          { effect: 'Gewichtszunahme', system: 'metabolisch', frequency: 'common', severity: 'moderate' },
          { effect: 'EPS / Akathisie', system: 'EPS', frequency: 'common', severity: 'moderate' },
          { effect: 'QTc-Verlängerung', system: 'kardial', frequency: 'rare', severity: 'dangerous' },
        ],
      },
      umstellung: {
        depotOptions: [
          {
            name: 'Paliperidonpalmitat 1-monatlich',
            brandName: 'Xeplion®',
            injectionIntervalDays: 28,
            loadingRegimen: [
              { day: 1, doseLabel: '150 mg eq.', route: 'deltoid' },
              { day: 8, doseLabel: '100 mg eq.', route: 'deltoid' },
            ],
            oralOverlapDays: 0,
            doseEquivalence: 'orales Paliperidon 6 mg/d ≈ 75–100 mg eq. / 4 Wochen',
            timeToSteadyStateWeeks: 26,
            firstMaintenanceDay: 35,
            flexWindowDays: 7,
            postInjectionMonitoring: 'Loading-Dosen in den Deltoideus; Erhaltung deltoid oder gluteal',
            isEstimated: false,
            sourceNote: 'Fachinformation Xeplion',
          },
          {
            name: 'Paliperidonpalmitat 3-monatlich',
            brandName: 'Trevicta®',
            injectionIntervalDays: 91,
            loadingRegimen: [],
            oralOverlapDays: 0,
            doseEquivalence: 'erst nach ≥4 Monaten stabiler 1-monatlicher Therapie umstellen',
            firstMaintenanceDay: 0,
            flexWindowDays: 14,
            isEstimated: false,
            sourceNote: 'Fachinformation Trevicta',
          },
        ],
      },
    },
  ),
  receptorAffinityProfile: [
    { target: 'D2', affinityPercent: 72, rawKiNm: 2.8, action: 'antagonist', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false, sourceNote: 'als Paliperidon' },
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
