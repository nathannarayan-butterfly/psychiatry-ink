import type { LaborCategory, LaborValue } from './laborArchive'

// ---------------------------------------------------------------------------
// Parse result type
// ---------------------------------------------------------------------------

export interface ParsedLabResult {
  title: string | null    // e.g. "Labor vom 05.06.2026"
  date: Date | null       // parsed JS Date if a date was found
  categories: LaborCategory[]
}

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
    keywords: ['got', 'ast', 'gpt', 'alat', 'ggt', 'gamma-gt', 'bilirubin', 'albumin', 'ldh', 'che', 'alkalische phosphatase'],
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
      // Antipsychotics
      'benperidol', 'haloperidol', 'flupentixol', 'fluphenazin', 'zuclopenthixol',
      'perphenazin', 'promethazin', 'clozapin',
      'olanzapin', 'desmethylolanzapin',
      'quetiapin', 'norquetiapin',
      'risperidon', '9-oh-risperidon', 'paliperidon',
      'aripiprazol', 'dehydroaripiprazol',
      'ziprasidon', 'amisulprid', 'sulpirid', 'sertindol',
      // Mood stabilisers
      'lithium', 'valproat', 'valproinsäure',
      'carbamazepin', 'carbamazepinepoxid',
      'lamotrigin', 'oxcarbazepin', 'eslicarbazep',
      'topiramat', 'levetiracetam', 'pregabalin', 'gabapentin',
      'phenobarbital', 'phenytoin',
      // Antidepressants
      'sertralin', 'desmethylsertralin',
      'citalopram', 'escitalopram',
      'fluoxetin', 'norfluoxetin',
      'paroxetin', 'fluvoxamin',
      'venlafaxin', 'o-desmethylvenlafaxin',
      'duloxetin', 'mirtazapin',
      'amitriptylin', 'nortriptylin',
      'imipramin', 'desipramin',
      'clomipramin', 'desmethylclomipramin',
      'trimipramin', 'opipramol',
      'bupropion', 'hydroxybupropion',
      'tranylcypromin', 'moclobemid',
      // Benzodiazepines / Z-drugs (level monitoring)
      'diazepam', 'nordazepam', 'clonazepam', 'lorazepam', 'alprazolam',
      'zolpidem', 'zopiclon',
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
  {
    id: 'muskelenzyme',
    label: 'Muskelenzyme',
    keywords: ['ck gesamt', 'ck-mb', 'ck-mm', 'troponin', 'myoglobin', 'ldh'],
  },
]

function normalizeNum(str: string): number {
  return parseFloat(str.replace(',', '.'))
}

function classifyParameter(name: string): CategoryDef | null {
  const lower = name.toLowerCase().trim()
  for (const cat of CATEGORY_DEFS) {
    for (const kw of cat.keywords) {
      if (lower === kw) return cat
      // Short keywords (≤ 3 chars): whole-word match only — avoids 'ap' matching 'olanzapin'
      if (kw.length <= 3) {
        const re = new RegExp(`(?:^|[\\s\\-\\/\\(])${kw}(?:[\\s\\-\\/\\(\\)]|$)`, 'i')
        if (re.test(lower)) return cat
        continue
      }
      if (lower.startsWith(kw) || lower.includes(kw)) return cat
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
  const numericValue = parseFloat(rawValue.replace(/^[<>≤≥]/, '').replace(',', '.'))
  const isAbnormal =
    !Number.isNaN(numericValue) && (refMin !== undefined || refMax !== undefined)
      ? (refMin !== undefined && numericValue < refMin) ||
        (refMax !== undefined && numericValue > refMax)
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
      const op = c.match(/^([<>≤≥])/)?.[1]
      const num = parseFloat(c.replace(/^[<>≤≥]/, '').replace(',', '.'))
      if (!isNaN(num)) {
        if (op === '<' || op === '≤') refMax = num
        else if (op === '>' || op === '≥') refMin = num
      }
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

  let refMin: number | undefined
  let refMax: number | undefined
  let refText: string | undefined

  if (m[4] !== undefined && m[5] !== undefined) {
    // min-max range
    refMin = normalizeNum(m[4])
    refMax = normalizeNum(m[5])
    refText = `${m[4].replace(',', '.')}-${m[5].replace(',', '.')}`
  }

  // Also look for a one-sided limit after the unit  (e.g. "<190", ">60", "≤190")
  if (refMin === undefined && refMax === undefined) {
    const oneSided = clean.match(/\s([<>≤≥])(\d+[,.]?\d*)/)
    if (oneSided) {
      const op = oneSided[1]
      const num = normalizeNum(oneSided[2])
      if (!isNaN(num)) {
        if (op === '<' || op === '≤') { refMax = num; refText = `${op}${oneSided[2]}` }
        else                          { refMin = num; refText = `${op}${oneSided[2]}` }
      }
    }
  }

  return buildValue(rawName, m[2], m[3].trim(), refMin, refMax, refText)
}

// ---------------------------------------------------------------------------
// Heading / date extraction
// ---------------------------------------------------------------------------

/**
 * Finds a "Labor vom DD.MM.YYYY" style line (or similar headings) and returns
 * the matched heading text + a JS Date.  Returns nulls when nothing found.
 */
function extractHeading(text: string): { title: string | null; date: Date | null } {
  // Patterns like: "Labor vom 05.06.2026", "Befund vom 5.6.26", "Laborbefund 05.06.2026"
  const headingRe = /^[ \t]*((?:labor(?:befund)?|befund|blutbefund|laborwerte|laborergebnis(?:se)?)(?:\s+vom)?\s*[:–\-]?\s*(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4}))/im
  // Also catch bare date lines: "05.06.2026" or "5.6.2026" alone
  const bareDateRe = /^[ \t]*(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})[ \t]*$/m

  let m = text.match(headingRe)
  if (m) {
    const title = m[1].trim()
    const day = parseInt(m[2], 10)
    const month = parseInt(m[3], 10) - 1
    let year = parseInt(m[4], 10)
    if (year < 100) year += 2000
    const date = new Date(year, month, day)
    return { title, date: isNaN(date.getTime()) ? null : date }
  }

  m = text.match(bareDateRe)
  if (m) {
    const day = parseInt(m[1], 10)
    const month = parseInt(m[2], 10) - 1
    let year = parseInt(m[3], 10)
    if (year < 100) year += 2000
    const date = new Date(year, month, day)
    const title = `Labor vom ${String(day).padStart(2,'0')}.${String(month+1).padStart(2,'0')}.${year}`
    return { title, date: isNaN(date.getTime()) ? null : date }
  }

  return { title: null, date: null }
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

export function parseLabText(rawText: string): ParsedLabResult {
  const { title, date } = extractHeading(rawText)
  const normalized = normalizeText(rawText)
  const categoryMap = new Map<string, LaborCategory>()

  // Strategy 1: try inline comma-separated format
  // Split on ", " followed by any letter (upper or lower — covers eGFR, pH, fT4 etc.)
  const inlineTokens = normalized.split(/,\s+(?=[A-Za-zÄÖÜäöüß])/)
  if (inlineTokens.length > 2) {
    for (const token of inlineTokens) {
      // Skip heading lines
      if (/^(?:labor|befund|laborwerte)/i.test(token.trim())) continue
      const val = parseInlineToken(token)
      if (val) addToMap(categoryMap, val)
    }
  }

  // Strategy 2: line-by-line (tabular format)
  if (categoryMap.size === 0) {
    for (const line of normalized.split(/\r?\n/)) {
      // Skip heading lines
      if (/^(?:labor|befund|laborwerte)/i.test(line.trim())) continue
      const val = parseLine(line)
      if (val) addToMap(categoryMap, val)
    }
  }

  return {
    title,
    date,
    categories: Array.from(categoryMap.values()).filter((c) => c.values.length > 0),
  }
}
