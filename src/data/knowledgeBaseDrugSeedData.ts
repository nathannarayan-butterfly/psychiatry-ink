import { createDefaultSections, type KnowledgeBaseDrug } from '../types/knowledgeBase'

const NOW = '2026-06-10T19:16:00.000Z'

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

export const KB_DRUG_SEED_DATA: KnowledgeBaseDrug[] = [HALOPERIDOL_SEED]
