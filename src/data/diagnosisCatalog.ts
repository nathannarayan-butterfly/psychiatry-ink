/** Curated psychiatric diagnosis catalog with ICD-10 → ICD-11 / DSM-5 crosswalk. */

export interface DiagnosisCatalogEntry {
  icd10: { code: string; label: string }
  icd11: { code: string; label: string }
  dsm: { code: string; label: string }
}

export const DIAGNOSIS_CATALOG: DiagnosisCatalogEntry[] = [
  {
    icd10: { code: 'F20.0', label: 'Paranoide Schizophrenie' },
    icd11: { code: '6A20.0', label: 'Schizophrenie, paranoider Typ' },
    dsm: { code: '295.90', label: 'Schizophrenie, paranoider Typ' },
  },
  {
    icd10: { code: 'F20.1', label: 'Hebephrene Schizophrenie' },
    icd11: { code: '6A20.1', label: 'Schizophrenie, desorganisierter Typ' },
    dsm: { code: '295.10', label: 'Schizophrenie, desorganisierter Typ' },
  },
  {
    icd10: { code: 'F20.2', label: 'Katatone Schizophrenie' },
    icd11: { code: '6A20.2', label: 'Schizophrenie, katatoner Typ' },
    dsm: { code: '295.20', label: 'Schizophrenie, katatoner Typ' },
  },
  {
    icd10: { code: 'F20.3', label: 'Undifferenzierte Schizophrenie' },
    icd11: { code: '6A20.3', label: 'Schizophrenie, undifferenzierter Typ' },
    dsm: { code: '295.90', label: 'Schizophrenie, undifferenzierter Typ' },
  },
  {
    icd10: { code: 'F20.5', label: 'Schizophrenes Residuum' },
    icd11: { code: '6A20.5', label: 'Schizophrenie, Residualzustand' },
    dsm: { code: '295.60', label: 'Schizophrenie, Residualzustand' },
  },
  {
    icd10: { code: 'F25.0', label: 'Schizoaffektive Störung, manische Form' },
    icd11: { code: '6A21.0', label: 'Schizoaffektive Störung, manischer Typ' },
    dsm: { code: '295.70', label: 'Schizoaffektive Störung, bipolare Typ' },
  },
  {
    icd10: { code: 'F25.1', label: 'Schizoaffektive Störung, depressive Form' },
    icd11: { code: '6A21.1', label: 'Schizoaffektive Störung, depressiver Typ' },
    dsm: { code: '295.70', label: 'Schizoaffektive Störung, depressive Typ' },
  },
  {
    icd10: { code: 'F31.0', label: 'Bipolare affektive Störung, gegenwärtig manisch' },
    icd11: { code: '6A60.0', label: 'Bipolare Störung I, manische Episode' },
    dsm: { code: '296.41', label: 'Bipolare I-Störung, manische Episode' },
  },
  {
    icd10: { code: 'F31.1', label: 'Bipolare affektive Störung, gegenwärtig manisch mit psychotischen Symptomen' },
    icd11: { code: '6A60.1', label: 'Bipolare Störung I, manische Episode mit psychotischen Symptomen' },
    dsm: { code: '296.44', label: 'Bipolare I-Störung, manische Episode, schwer' },
  },
  {
    icd10: { code: 'F31.3', label: 'Bipolare affektive Störung, gegenwärtig leichte oder mittelgradige depressive Episode' },
    icd11: { code: '6A60.3', label: 'Bipolare Störung I, depressive Episode' },
    dsm: { code: '296.52', label: 'Bipolare I-Störung, depressive Episode' },
  },
  {
    icd10: { code: 'F31.5', label: 'Bipolare affektive Störung, gegenwärtig schwere depressive Episode' },
    icd11: { code: '6A60.5', label: 'Bipolare Störung I, schwere depressive Episode' },
    dsm: { code: '296.53', label: 'Bipolare I-Störung, schwere depressive Episode' },
  },
  {
    icd10: { code: 'F31.9', label: 'Bipolare affektive Störung, nicht näher bezeichnet' },
    icd11: { code: '6A60', label: 'Bipolare Störung I' },
    dsm: { code: '296.80', label: 'Bipolare I-Störung' },
  },
  {
    icd10: { code: 'F32.0', label: 'Leichte depressive Episode' },
    icd11: { code: '6A70.0', label: 'Depressive Episode, leicht' },
    dsm: { code: '296.21', label: 'Depressive Störung, einzelne Episode, leicht' },
  },
  {
    icd10: { code: 'F32.1', label: 'Mittelgradige depressive Episode' },
    icd11: { code: '6A70.1', label: 'Depressive Episode, mittelgradig' },
    dsm: { code: '296.22', label: 'Depressive Störung, einzelne Episode, mittelgradig' },
  },
  {
    icd10: { code: 'F32.2', label: 'Schwere depressive Episode ohne psychotische Symptome' },
    icd11: { code: '6A70.2', label: 'Depressive Episode, schwer' },
    dsm: { code: '296.23', label: 'Depressive Störung, einzelne Episode, schwer' },
  },
  {
    icd10: { code: 'F32.3', label: 'Schwere depressive Episode mit psychotischen Symptomen' },
    icd11: { code: '6A70.3', label: 'Depressive Episode mit psychotischen Symptomen' },
    dsm: { code: '296.24', label: 'Depressive Störung mit psychotischen Merkmalen' },
  },
  {
    icd10: { code: 'F33.0', label: 'Rezidivierende depressive Störung, gegenwärtig leichte Episode' },
    icd11: { code: '6A71.0', label: 'Rezidivierende depressive Störung, leichte Episode' },
    dsm: { code: '296.31', label: 'Rezidivierende depressive Störung, leicht' },
  },
  {
    icd10: { code: 'F33.1', label: 'Rezidivierende depressive Störung, gegenwärtig mittelgradige Episode' },
    icd11: { code: '6A71.1', label: 'Rezidivierende depressive Störung, mittelgradige Episode' },
    dsm: { code: '296.32', label: 'Rezidivierende depressive Störung, mittelgradig' },
  },
  {
    icd10: { code: 'F33.2', label: 'Rezidivierende depressive Störung, gegenwärtig schwere Episode' },
    icd11: { code: '6A71.2', label: 'Rezidivierende depressive Störung, schwere Episode' },
    dsm: { code: '296.33', label: 'Rezidivierende depressive Störung, schwer' },
  },
  {
    icd10: { code: 'F34.0', label: 'Zyklothymie' },
    icd11: { code: '6A62', label: 'Zyklothymie' },
    dsm: { code: '301.13', label: 'Zyklothymische Störung' },
  },
  {
    icd10: { code: 'F40.0', label: 'Agrophobie' },
    icd11: { code: '6B02', label: 'Agrophobie' },
    dsm: { code: '300.22', label: 'Agrophobie' },
  },
  {
    icd10: { code: 'F40.1', label: 'Soziale Phobien' },
    icd11: { code: '6B04', label: 'Soziale Angststörung' },
    dsm: { code: '300.23', label: 'Soziale Angststörung' },
  },
  {
    icd10: { code: 'F41.0', label: 'Panikstörung' },
    icd11: { code: '6B01', label: 'Panikstörung' },
    dsm: { code: '300.01', label: 'Panikstörung' },
  },
  {
    icd10: { code: 'F41.1', label: 'Generalisierte Angststörung' },
    icd11: { code: '6B00', label: 'Generalisierte Angststörung' },
    dsm: { code: '300.02', label: 'Generalisierte Angststörung' },
  },
  {
    icd10: { code: 'F42.0', label: 'Zwanghaftes Denken und Grübeln' },
    icd11: { code: '6B20', label: 'Zwangsstörung' },
    dsm: { code: '300.3', label: 'Zwangsstörung' },
  },
  {
    icd10: { code: 'F43.0', label: 'Akute Belastungsreaktion' },
    icd11: { code: '6B40', label: 'Akute Belastungsreaktion' },
    dsm: { code: '308.3', label: 'Akute Belastungsstörung' },
  },
  {
    icd10: { code: 'F43.1', label: 'Posttraumatische Belastungsstörung' },
    icd11: { code: '6B41', label: 'Posttraumatische Belastungsstörung' },
    dsm: { code: '309.81', label: 'Posttraumatische Belastungsstörung' },
  },
  {
    icd10: { code: 'F43.2', label: 'Anpassungsstörungen' },
    icd11: { code: '6B43', label: 'Anpassungsstörung' },
    dsm: { code: '309.0', label: 'Anpassungsstörung' },
  },
  {
    icd10: { code: 'F44.0', label: 'Dissoziative Amnesie' },
    icd11: { code: '6B64', label: 'Dissoziative Amnesie' },
    dsm: { code: '300.12', label: 'Dissoziative Amnesie' },
  },
  {
    icd10: { code: 'F45.0', label: 'Somatisierungsstörung' },
    icd11: { code: '6C20', label: 'Körperliche Belastungsstörung' },
    dsm: { code: '300.82', label: 'Körperliche Belastungsstörung' },
  },
  {
    icd10: { code: 'F50.0', label: 'Anorexia nervosa' },
    icd11: { code: '6B80', label: 'Anorexia nervosa' },
    dsm: { code: '307.1', label: 'Anorexia nervosa' },
  },
  {
    icd10: { code: 'F50.2', label: 'Bulimia nervosa' },
    icd11: { code: '6B81', label: 'Bulimia nervosa' },
    dsm: { code: '307.51', label: 'Bulimia nervosa' },
  },
  {
    icd10: { code: 'F60.0', label: 'Emotional instabile Persönlichkeitsstörung' },
    icd11: { code: '6D10.0', label: 'Borderline-Persönlichkeitsstörung' },
    dsm: { code: '301.83', label: 'Borderline-Persönlichkeitsstörung' },
  },
  {
    icd10: { code: 'F60.1', label: 'Dissoziale Persönlichkeitsstörung' },
    icd11: { code: '6D10.1', label: 'Dissoziale Persönlichkeitsstörung' },
    dsm: { code: '301.7', label: 'Antisoziale Persönlichkeitsstörung' },
  },
  {
    icd10: { code: 'F60.3', label: 'Emotional instabile Persönlichkeitsstörung, Borderline-Typ' },
    icd11: { code: '6D10.3', label: 'Borderline-Persönlichkeitsstörung' },
    dsm: { code: '301.83', label: 'Borderline-Persönlichkeitsstörung' },
  },
  {
    icd10: { code: 'F10.2', label: 'Psychische und Verhaltensstörungen durch Alkohol : Abhängigkeitssyndrom' },
    icd11: { code: '6C40.2', label: 'Alkoholabhängigkeit' },
    dsm: { code: '303.90', label: 'Alkoholgebrauchsstörung, schwer' },
  },
  {
    icd10: { code: 'F11.2', label: 'Psychische und Verhaltensstörungen durch Opioide : Abhängigkeitssyndrom' },
    icd11: { code: '6C43.2', label: 'Opioidabhängigkeit' },
    dsm: { code: '304.00', label: 'Opioidgebrauchsstörung, schwer' },
  },
  {
    icd10: { code: 'F12.2', label: 'Psychische und Verhaltensstörungen durch Cannabinoide : Abhängigkeitssyndrom' },
    icd11: { code: '6C41.2', label: 'Cannabisabhängigkeit' },
    dsm: { code: '304.30', label: 'Cannabisgebrauchsstörung, schwer' },
  },
  {
    icd10: { code: 'F15.2', label: 'Psychische und Verhaltensstörungen durch andere Stimulanzien, einschließlich Koffein : Abhängigkeitssyndrom' },
    icd11: { code: '6C45.2', label: 'Störungen durch Amphetamin oder ähnlich wirkende Substanzen, Abhängigkeitssyndrom' },
    dsm: { code: '304.40', label: 'Stimulanziengebrauchsstörung, schwer' },
  },
  {
    icd10: { code: 'F17.2', label: 'Psychische und Verhaltensstörungen durch Tabak : Abhängigkeitssyndrom' },
    icd11: { code: '6C4A.2', label: 'Tabakabhängigkeit' },
    dsm: { code: '305.1', label: 'Tabakgebrauchsstörung, schwer' },
  },
  {
    icd10: { code: 'F19.2', label: 'Psychische und Verhaltensstörungen durch multiplen Substanzgebrauch und Verwendung anderer psychotroper Substanzen : Abhängigkeitssyndrom' },
    icd11: { code: '6C4E.2', label: 'Abhängigkeit von multiplen Substanzen' },
    dsm: { code: '304.90', label: 'Substanzgebrauchsstörung, schwer' },
  },
  {
    icd10: { code: 'F90.0', label: 'Aufmerksamkeitsdefizit-/Hyperaktivitätsstörung' },
    icd11: { code: '6A05', label: 'ADHS' },
    dsm: { code: '314.01', label: 'ADHS, kombinierte Präsentation' },
  },
  {
    icd10: { code: 'F84.0', label: 'Frühkindlicher Autismus' },
    icd11: { code: '6A02.0', label: 'Autismus-Spektrum-Störung' },
    dsm: { code: '299.00', label: 'Autismus-Spektrum-Störung' },
  },
  {
    icd10: { code: 'F05.0', label: 'Delir ohne Demenz' },
    icd11: { code: '6D70', label: 'Delir' },
    dsm: { code: '293.0', label: 'Delir' },
  },
  {
    icd10: { code: 'F06.2', label: 'Organische halluzinatorische Störung' },
    icd11: { code: '6E60', label: 'Psychotische Störung durch somatische Erkrankung' },
    dsm: { code: '293.82', label: 'Psychotische Störung durch somatische Erkrankung' },
  },
]

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase()
}

export function searchDiagnosisCatalog(query: string, limit = 8): DiagnosisCatalogEntry[] {
  const q = normalizeQuery(query)
  if (!q) return []

  return DIAGNOSIS_CATALOG.filter((entry) => {
    const haystack = [
      entry.icd10.code,
      entry.icd10.label,
      entry.icd11.code,
      entry.icd11.label,
      entry.dsm.code,
      entry.dsm.label,
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q) || entry.icd10.code.toLowerCase().startsWith(q)
  }).slice(0, limit)
}

export function lookupByIcd10Code(code: string): DiagnosisCatalogEntry | undefined {
  const normalized = code.trim().toUpperCase()
  return DIAGNOSIS_CATALOG.find((e) => e.icd10.code.toUpperCase() === normalized)
}

/** Bundled crosswalk label for interim display while WHO/API titles resolve. */
export function lookupCatalogLabel(
  code: string,
  system: 'icd10' | 'icd11' | 'dsm',
): string | null {
  const trimmed = code.trim()
  if (!trimmed) return null

  const upper = trimmed.toUpperCase()
  for (const entry of DIAGNOSIS_CATALOG) {
    if (system === 'icd10' && entry.icd10.code.toUpperCase() === upper) {
      return entry.icd10.label
    }
    if (system === 'icd11' && entry.icd11.code.toUpperCase() === upper) {
      return entry.icd11.label
    }
    if (system === 'dsm' && entry.dsm.code.toUpperCase() === upper) {
      return entry.dsm.label
    }
  }
  return null
}
