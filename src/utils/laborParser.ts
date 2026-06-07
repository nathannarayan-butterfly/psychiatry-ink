import type { LaborCategory, LaborValue } from './laborArchive'

// ---------------------------------------------------------------------------
// Category mapping
// ---------------------------------------------------------------------------

interface CategoryDef {
  id: string
  label: string
  keywords: string[]
}

const CATEGORY_DEFS: CategoryDef[] = [
  {
    id: 'blutbild',
    label: 'Blutbild',
    keywords: [
      'hämoglobin', 'haemoglobin', 'hb', 'hämatokrit', 'haematokrit', 'hkt',
      'erythrozyten', 'leukozyten', 'thrombozyten', 'mcv', 'mch', 'mchc', 'retikulozyten',
    ],
  },
  {
    id: 'nierenwerte',
    label: 'Nierenwerte',
    keywords: ['kreatinin', 'harnstoff', 'harnsäure', 'harnsaeure', 'egfr', 'gfr', 'cystatin'],
  },
  {
    id: 'leberwerte',
    label: 'Leberwerte',
    keywords: ['got', 'ast', 'gpt', 'alt', 'ggt', 'ap', 'bilirubin', 'albumin', 'ldh', 'che'],
  },
  {
    id: 'elektrolyte',
    label: 'Elektrolyte',
    keywords: ['natrium', 'na', 'kalium', 'k', 'kalzium', 'ca', 'magnesium', 'mg', 'phosphat', 'chlorid'],
  },
  {
    id: 'medikamentenspiegel',
    label: 'Medikamentenspiegel',
    keywords: [
      'lithium', 'valproat', 'carbamazepin', 'clozapin', 'olanzapin', 'quetiapin',
      'aripiprazol', 'haloperidol', 'risperidon', 'lamotrigin', 'sertralin',
      'citalopram', 'escitalopram',
    ],
  },
  {
    id: 'schilddruese',
    label: 'Schilddrüse',
    keywords: ['tsh', 'ft3', 'ft4', 't3', 't4', 'anti-tpo', 'anti-tg'],
  },
  {
    id: 'stoffwechsel',
    label: 'Stoffwechsel',
    keywords: ['glukose', 'hba1c', 'insulin', 'cholesterin', 'ldl', 'hdl', 'triglyzeride'],
  },
  {
    id: 'gerinnung',
    label: 'Gerinnung',
    keywords: ['quick', 'inr', 'ptt', 'fibrinogen', 'd-dimer', 'ddimer'],
  },
  {
    id: 'entzuendung',
    label: 'Entzündung',
    keywords: ['crp', 'bsg', 'pct', 'ferritin', 'il-6', 'il6'],
  },
]

function normalizeNum(str: string): number {
  return parseFloat(str.replace(',', '.'))
}

function classifyParameter(name: string): CategoryDef | null {
  const lower = name.toLowerCase().trim()
  for (const cat of CATEGORY_DEFS) {
    for (const kw of cat.keywords) {
      if (lower === kw || lower.startsWith(kw + ' ') || lower.endsWith(' ' + kw) || lower.includes(kw)) {
        return cat
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Line parser
// ---------------------------------------------------------------------------

/**
 * Tries to extract a lab value from a single text line.
 * Handles patterns like:
 *   Hämoglobin  12.5  g/dL  [13.5-17.5]
 *   TSH: 2.34 mU/L (0.27-4.20)
 *   Glukose   5.8 mmol/L   Ref: 3.9-6.1
 */
function parseLine(line: string): LaborValue | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return null

  // Regex: name [: whitespace] value unit [ref range]
  // name: letters, spaces, hyphens, slashes, German chars
  // value: digits with . or ,
  // unit: alphanumeric, %, µ, /, optional subunit
  // ref: optional, in brackets/parens or after "Ref:"
  const lineRe =
    /^([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9\s\-\/\.]*?)\s*[:\s]\s*([\d]+[,\.][\d]+|[\d]+)\s+([a-zA-Z\/%µΩ][a-zA-Z0-9\/%µ·Ω]*(?:\/[a-zA-Z0-9]+)?)\s*(?:(?:Ref\s*:\s*|[\[\(])?\s*([\d]+[,\.][\d]+|[\d]+)\s*[-–]\s*([\d]+[,\.][\d]+|[\d]+)\s*[\]\)]?)?/i

  const m = trimmed.match(lineRe)
  if (!m) return null

  const rawName = m[1].trim()
  if (!rawName || rawName.length < 2) return null
  // Filter out lines that are purely numbers or look like dates
  if (/^\d+$/.test(rawName)) return null

  const rawValue = m[2]
  const unit = m[3].trim()
  const rawRefMin = m[4]
  const rawRefMax = m[5]

  const numericValue = normalizeNum(rawValue)
  if (Number.isNaN(numericValue)) return null

  let refMin: number | undefined
  let refMax: number | undefined
  let refText: string | undefined

  if (rawRefMin !== undefined && rawRefMax !== undefined) {
    refMin = normalizeNum(rawRefMin)
    refMax = normalizeNum(rawRefMax)
    refText = `${rawRefMin.replace(',', '.')}-${rawRefMax.replace(',', '.')}`
    if (Number.isNaN(refMin) || Number.isNaN(refMax)) {
      refMin = undefined
      refMax = undefined
      refText = undefined
    }
  }

  const isAbnormal =
    refMin !== undefined && refMax !== undefined
      ? numericValue < refMin || numericValue > refMax
      : undefined

  return {
    name: rawName,
    value: rawValue,
    numericValue,
    unit,
    refMin,
    refMax,
    refText,
    isAbnormal,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseLabText(rawText: string): LaborCategory[] {
  const lines = rawText.split(/\r?\n/)
  const categoryMap = new Map<string, LaborCategory>()
  const sonstigesId = 'sonstiges'

  for (const line of lines) {
    const val = parseLine(line)
    if (!val) continue

    const catDef = classifyParameter(val.name)
    const catId = catDef?.id ?? sonstigesId
    const catLabel = catDef?.label ?? 'Sonstiges'

    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, { id: catId, label: catLabel, values: [] })
    }
    categoryMap.get(catId)!.values.push(val)
  }

  return Array.from(categoryMap.values()).filter((c) => c.values.length > 0)
}
