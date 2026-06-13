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
  atcCode: 'N05AD01',
  tags: ['FGA', 'D2-Antagonist', 'Depot', 'Delir'],
  status: 'active',
  authorEditor: 'Seed',
  createdAt: NOW,
  updatedAt: NOW,
  sections: createDefaultSections({
    kurzprofil:
      'Hochpotentes FGA der ersten Generation. Starke D2-Blockade. Breites Indikationsspektrum inkl. akuter Psychose, Manie, Delir, Übelkeit. Depot-Form verfügbar.',
    wirkmechanismus:
      'Postsynaptischer D2-Antagonist (limbisch und striatal). Hohe EPS-Rate durch striatale D2-Blockade.',
    rezeptorprofil: 'D2 ++++, D1 ++, Alpha1 ++, M1 +, H1 +',
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
  }),
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
  atcCode: 'N05AX08',
  tags: ['SGA', 'D2', '5-HT2A', 'Depot'],
  status: 'active',
  authorEditor: 'Seed',
  createdAt: NOW,
  updatedAt: NOW,
  receptorProfileVersion: 2,
  affinityScale: 'relative_log_ki_percent',
  lastReceptorProfileUpdatedAt: NOW,
  sections: createDefaultSections({
    kurzprofil:
      'Atypisches Antipsychotikum mit starker D2- und 5-HT2A-Affinität. Dosisabhängig EPS und Prolaktinanstieg.',
    wirkmechanismus:
      'Hochaffiner D2- und 5-HT2A-Antagonist; zusätzliche α1-/α2-/H1-Blockade.',
  }),
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
  atcCode: 'N05AH03',
  tags: ['SGA', 'metabolisch', 'sedierend'],
  status: 'active',
  authorEditor: 'Seed',
  createdAt: NOW,
  updatedAt: NOW,
  receptorProfileVersion: 2,
  affinityScale: 'relative_log_ki_percent',
  lastReceptorProfileUpdatedAt: NOW,
  sections: createDefaultSections({
    kurzprofil:
      'Breit wirksames atypisches Antipsychotikum mit ausgeprägter H1-/M1-/5-HT2A-Affinität — sedierend und metabolisch relevant.',
    wirkmechanismus:
      'Multirezeptor-Antagonist (5-HT2A, D2, H1, M1, α1, 5-HT2C).',
  }),
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
  atcCode: 'N05AX12',
  tags: ['SGA', 'D2-Partialagonist', 'metabolisch günstig'],
  status: 'active',
  authorEditor: 'Seed',
  createdAt: NOW,
  updatedAt: NOW,
  receptorProfileVersion: 2,
  affinityScale: 'relative_log_ki_percent',
  lastReceptorProfileUpdatedAt: NOW,
  sections: createDefaultSections({
    kurzprofil:
      'Dopamin-D2-Partialagonist ("dopaminerger Stabilisator") mit 5-HT1A-Partialagonismus und 5-HT2A-Antagonismus.',
    wirkmechanismus:
      'D2- und 5-HT1A-Partialagonist, 5-HT2A-Antagonist — funktionelle Aktivität abhängig vom dopaminergen Tonus.',
  }),
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
  atcCode: 'N06AB06',
  tags: ['SSRI', 'SERT'],
  status: 'active',
  authorEditor: 'Seed',
  createdAt: NOW,
  updatedAt: NOW,
  receptorProfileVersion: 2,
  affinityScale: 'relative_log_ki_percent',
  lastReceptorProfileUpdatedAt: NOW,
  sections: createDefaultSections({
    kurzprofil:
      'SSRI mit dominanter Serotonin-Transporter-Hemmung; klinisch geringe, aber messbare DAT-Affinität.',
    wirkmechanismus:
      'Potente SERT-Hemmung; schwächere NET-/DAT-Affinität ohne wesentliche Rezeptorblockade.',
  }),
  receptorAffinityProfile: [
    { target: 'SERT', affinityPercent: 91, rawKiNm: 0.29, pKi: 9.5, action: 'reuptake_inhibitor', evidenceQuality: 'high', clinicalRelevance: 'high', isEstimated: false, sourceNote: 'primärer Wirkmechanismus' },
    { target: 'DAT', affinityPercent: 41, rawKiNm: 315, action: 'reuptake_inhibitor', evidenceQuality: 'moderate', clinicalRelevance: 'low', isEstimated: false, sourceNote: 'schwache Affinität, klinische Relevanz unklar' },
    { target: 'NET', affinityPercent: 22, rawKiNm: 1700, action: 'reuptake_inhibitor', evidenceQuality: 'low', clinicalRelevance: 'low', isEstimated: false },
    { target: 'α1', affinityPercent: 30, action: 'antagonist', evidenceQuality: 'estimated', clinicalRelevance: 'low', isEstimated: true, sourceNote: 'geringe Affinität' },
  ],
}

export const KB_DRUG_SEED_DATA: KnowledgeBaseDrug[] = [
  HALOPERIDOL_SEED,
  RISPERIDONE_SEED,
  OLANZAPINE_SEED,
  ARIPIPRAZOLE_SEED,
  SERTRALINE_SEED,
]
