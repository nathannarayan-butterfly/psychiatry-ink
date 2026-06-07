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
      'erythrozyten', 'leukozyten', 'thrombozyten', 'mcv', 'mch', 'mchc',
      'retikulozyten', 'plättchenvolumen', 'erythrozytenverteilungsbreite',
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
    keywords: ['got', 'ast', 'gpt', 'alt', 'alat', 'ggt', 'gamma-gt', 'ap', 'bilirubin', 'albumin', 'ldh', 'che', 'ck'],
  },
  {
    id: 'elektrolyte',
    label: 'Elektrolyte',
    keywords: ['natrium', 'kalium', 'kalzium', 'magnesium', 'phosphat', 'chlorid'],
  },
  {
    id: 'medikamentenspiegel',
    label: 'Medikamentenspiegel',
    keywords: [
      'lithium', 'valproat', 'carbamazepin', 'clozapin', 'olanzapin', 'desmethylolanzapin',
      'quetiapin', 'aripiprazol', 'haloperidol', 'risperidon', 'lamotrigin', 'sertralin',
      'citalopram', 'escitalopram', 'benperidol', 'amisulprid', 'ziprasidon',
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
    keywords: ['glukose', 'hba1c', 'insulin', 'cholesterin', 'ldl', 'hdl', 'triglyzeride', 'vitamin d', 'vitamin'],
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
      if (lower === kw || lower.startsWith(kw) || lower.includes(kw)) {
        return cat
      }
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Unicode normalisation
// ---------------------------------------------------------------------------

const SUP_MAP: Record<string, string> = {
  '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4',
  '⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9',
}

function normalizeText(s: string): string {
  return s
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => SUP_MAP[c] ?? c)
    .replace(/–/g, '-')
    .replace(/[↑↓↗↘]/g, ' ')
    .replace(/\s+[HL]\s+/g, ' ')
}

// ---------------------------------------------------------------------------
// Shared LaborValue builder
// ---------------------------------------------------------------------------

function buildValue(
  name: string,
  rawValue: string,
  unit: string,
  refMin?: number,
  refMax?: number,
  refText?: string,
): LaborValue {
  const numericValue = parseFloat(rawValue.replace(/^[<>]/, '').replace(',', '.'))
  const isAbnormal =
    refMin !== undefined && refMax !== undefined && !Number.isNaN(numericValue)
      ? numericValue < refMin || numericValue > refMax
      : undefined
  return {
    name,
    value: rawValue,
    numericValue: Number.isNaN(numericValue) ? undefined : numericValue,
    unit,
    refMin,
    refMax,
    refText,
    isAbnormal,
  }
}

// ---------------------------------------------------------------------------
// Inline token parser  (comma-separated format)
// ---------------------------------------------------------------------------
// Handles: "Leukozyten 6,15 x10³/µl (3,5–9,8)"
//          "ALAT (GPT) 23 U/l (10–50)"
//          "eGFR (MDRD-Kurz) 108 ml/min/1,73 m² (>60)"
//          "TSH-basal <0,01 mIU/l (0,20–4,25) (erniedrigt)"
// ---------------------------------------------------------------------------

function parseInlineToken(raw: string): LaborValue | null {
  const t = normalizeText(raw.trim())
  const words = t.split(/\s+/)
  if (words.length < 2) return null

  // Find the first standalone numeric value (possibly prefixed with < or >)
  // Skip words that are inside parentheses (name qualifiers)
  let valueIdx = -1
  let depth = 0
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (w.includes('(')) depth++
    if (w.includes(')')) { depth = Math.max(0, depth - 1); continue }
    if (depth > 0 || i === 0) continue

    const stripped = w.replace(/^[<>]/, '').replace(',', '.')
    if (/^\d+\.?\d*$/.test(stripped)) {
      // Ensure the previous word isn't a unit fragment (e.g. "min/" in "ml/min/1,73")
      const prev = words[i - 1] ?? ''
      if (prev.endsWith('/')) continue
      // Ensure it's not a fraction-like unit piece (e.g. "1,73" in "ml/min/1,73 m²")
      if (/^[a-zA-Zµ%x]/.test(prev) === false && /\d/.test(prev)) continue
      valueIdx = i
      break
    }
  }

  if (valueIdx === -1) return null

  const name = words.slice(0, valueIdx).join(' ').trim()
  if (!name || name.length < 2) return null

  const rawValue = words[valueIdx]
  const numericValue = parseFloat(rawValue.replace(/^[<>]/, '').replace(',', '.'))
  if (Number.isNaN(numericValue)) return null

  // Everything after the value
  const afterValue = words.slice(valueIdx + 1).join(' ').trim()

  // Extract all parenthetical contents
  const parenContents: string[] = []
  const unitBase = afterValue.replace(/\(([^)]*)\)/g, (_, c: string) => {
    parenContents.push(c.trim())
    return ''
  }).trim()

  // Find the reference range: last parenthetical that looks numeric
  let refText: string | undefined
  let refMin: number | undefined
  let refMax: number | undefined

  for (let i = parenContents.length - 1; i >= 0; i--) {
    const c = parenContents[i]
    const norm = c.replace(/,/g, '.').replace(/-/g, '-').trim()
    const rangeMatch = norm.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/)
    const singleMatch = norm.match(/^[<>]?\d+\.?\d*$/)
    if (rangeMatch) {
      refMin = parseFloat(rangeMatch[1])
      refMax = parseFloat(rangeMatch[2])
      refText = c
      break
    }
    if (singleMatch) {
      refText = c
      break
    }
  }

  const unit = unitBase.replace(/\s+/g, ' ').trim()

  return buildValue(name, rawValue, unit, refMin, refMax, refText)
}

// ---------------------------------------------------------------------------
// Line parser (tabular / one-value-per-line format)
// ---------------------------------------------------------------------------

function parseLine(line: string): LaborValue | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return null

  const clean = normalizeText(trimmed).replace(/\t/g, '  ')

  // Accepts digit-starting units (10^9/L, x10^3 etc.)
  const lineRe =
    /^([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9\s\-\/\.]*?)\s*[:\s]\s*([<>]?[\d]+[,\.][\d]+|[<>]?[\d]+)\s+([a-zA-Z0-9x\/%µΩ\^][a-zA-Z0-9x\/%µ·Ω\^\-]*(?:\/[a-zA-Z0-9\^]+)?)\s*(?:(?:Ref(?:erenz(?:bereich)?)?\s*:\s*|[\[\(])?\s*([\d]+[,\.][\d]+|[\d]+)\s*[-]\s*([\d]+[,\.][\d]+|[\d]+)\s*[\]\)]?)?/i

  const m = clean.match(lineRe)
  if (!m) return null

  const rawName = m[1].trim()
  if (!rawName || rawName.length < 2 || /^\d+$/.test(rawName)) return null

  const refMin = m[4] !== undefined ? normalizeNum(m[4]) : undefined
  const refMax = m[5] !== undefined ? normalizeNum(m[5]) : undefined
  const refText =
    refMin !== undefined && refMax !== undefined && !Number.isNaN(refMin) && !Number.isNaN(refMax)
      ? `${m[4].replace(',', '.')}-${m[5].replace(',', '.')}`
      : undefined

  return buildValue(rawName, m[2], m[3].trim(), refText ? refMin : undefined, refText ? refMax : undefined, refText)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function addToMap(map: Map<string, LaborCategory>, val: LaborValue) {
  const catDef = classifyParameter(val.name)
  const catId = catDef?.id ?? 'sonstiges'
  const catLabel = catDef?.label ?? 'Sonstiges'
  if (!map.has(catId)) map.set(catId, { id: catId, label: catLabel, values: [] })
  map.get(catId)!.values.push(val)
}

export function parseLabText(rawText: string): LaborCategory[] {
  const normalized = normalizeText(rawText)
  const categoryMap = new Map<string, LaborCategory>()

  // Strategy 1: try inline comma-separated format
  // Split on ", " followed by an uppercase letter (start of next parameter name)
  const inlineTokens = normalized.split(/,\s+(?=[A-ZÄÖÜ])/)
  if (inlineTokens.length > 2) {
    for (const token of inlineTokens) {
      // Each token may start with "Labor vom DD.MM.YYYY" header — skip
      if (/^Labor\s+vom/i.test(token.trim())) continue
      const val = parseInlineToken(token)
      if (val) addToMap(categoryMap, val)
    }
  }

  // Strategy 2: line-by-line (tabular format)
  if (categoryMap.size === 0) {
    for (const line of normalized.split(/\r?\n/)) {
      const val = parseLine(line)
      if (val) addToMap(categoryMap, val)
    }
  }

  return Array.from(categoryMap.values()).filter((c) => c.values.length > 0)
}
