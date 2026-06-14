const PARAMETER_ALIASES: Record<string, string[]> = {
  wbc: ['leukozyten', 'weisse blutkoerperchen', 'weisse blutzellen', 'wbc', 'leukocytes', 'leuk'],
  neutrophils: ['neutrophile', 'neutrophilen', 'granulozyten', 'neutrophils', 'neutro'],
  platelets: ['thrombozyten', 'platelets', 'plt'],
  hemoglobin: ['hämoglobin', 'haemoglobin', 'hemoglobin', 'hb', 'hgb'],
  hematocrit: ['hämatokrit', 'haematokrit', 'hematocrit', 'hkt'],
  crp: ['crp', 'c-reaktives protein', 'c reaktives protein'],
  troponin: ['troponin', 'troponin i', 'troponin t', 'hs-troponin'],
  ck: ['ck', 'kreatinkinase', 'creatine kinase', 'cpk'],
  alt: ['alt', 'gpt', 'alanin aminotransferase', 'alat'],
  ast: ['ast', 'got', 'aspartat aminotransferase', 'asat'],
  ggt: ['ggt', 'gamma gt', 'gamma-gt', 'γ-gt'],
  bilirubin: ['bilirubin', 'gesamtbilirubin', 'direktes bilirubin'],
  lft: ['leberwerte', 'transaminasen', 'cholestase'],
  glucose: ['glucose', 'glukose', 'blutzucker', 'bz'],
  hba1c: ['hba1c', 'hb a1c', 'glykiertes hämoglobin', 'glykiertes haemoglobin'],
  lipids: ['cholesterin', 'ldl', 'hdl', 'triglyceride', 'triglyzeride', 'lipide'],
  prolactin: ['prolaktin', 'prolactin'],
  sodium: ['natrium', 'sodium', 'na'],
  potassium: ['kalium', 'potassium', 'k'],
  chloride: ['chlorid', 'chloride', 'cl'],
  creatinine: ['kreatinin', 'creatinine', 'krea'],
  egfr: ['egfr', 'gfr', 'mdrd', 'ckd-epi'],
  tsh: ['tsh', 'thyreotropin', 'schilddrüse stimulierendes hormon'],
  ammonia: ['ammoniak', 'ammonia', 'nh3'],
  ammonia_level: ['ammoniak', 'ammonia'],
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9äöüß/+.-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeLabParameter(name: string): string {
  const token = normalizeToken(name)
  if (!token) return ''

  for (const [canonical, aliases] of Object.entries(PARAMETER_ALIASES)) {
    if (aliases.some((alias) => token === normalizeToken(alias) || token.includes(normalizeToken(alias)))) {
      return canonical
    }
  }

  return token.replace(/\s+/g, '_').slice(0, 48)
}

export function labParameterLabelDe(parameter: string): string {
  const labels: Record<string, string> = {
    wbc: 'Leukozyten',
    neutrophils: 'Neutrophile',
    platelets: 'Thrombozyten',
    hemoglobin: 'Hämoglobin',
    hematocrit: 'Hämatokrit',
    crp: 'CRP',
    troponin: 'Troponin',
    ck: 'CK (Kreatinkinase)',
    alt: 'ALT (GPT)',
    ast: 'AST (GOT)',
    ggt: 'GGT',
    bilirubin: 'Bilirubin',
    glucose: 'Glukose',
    hba1c: 'HbA1c',
    lipids: 'Lipide',
    prolactin: 'Prolaktin',
    sodium: 'Natrium',
    potassium: 'Kalium',
    chloride: 'Chlorid',
    creatinine: 'Kreatinin',
    egfr: 'eGFR',
    tsh: 'TSH',
    ammonia: 'Ammoniak',
  }
  return labels[parameter] ?? parameter
}
