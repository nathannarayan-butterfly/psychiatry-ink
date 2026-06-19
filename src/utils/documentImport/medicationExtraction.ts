/**
 * Medication line parsing and extraction from clinical narrative sections.
 *
 * Conservative heuristics for German clinical documents: structured Medikation
 * lists, inline mentions in Verlauf, and medication-change sentences. Low-confidence
 * hits are surfaced for clinician review before persistence.
 */
import type {
  ClinicalImportCandidate,
  ImportClarification,
  ImportSourceLocation,
} from '../../schemas/documentImport/envelope'
import { makeCandidate } from './candidateFactory'

export interface ParsedMedicationLine {
  substance: string
  strength?: string
  doseText?: string
  displayBrandName?: string
  formulation?: string
  route?: string
  frequency?: string
  isPrn?: boolean
  isDepot?: boolean
  depotInterval?: string
  /** Parser confidence for depot classification specifically. */
  depotConfidence?: 'high' | 'medium' | 'low'
  /** Verbatim change snippet when parsed from a narrative adjustment sentence. */
  changeContext?: string
  /** Inferred status from change verbs (e.g. discontinued, increased). */
  status?: string
}

export type MedicationScanMode = 'structured' | 'narrative'

const DOSE_RE = /\b(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?){1,3})\b/
const STRENGTH_RE = /\b(\d+(?:[.,]\d+)?)\s*(mg|µg|mcg|g|ml|mmol|ie|i\.e\.)\b/i

const DEPOT_KEYWORD_RE = /\b(depot|langzeitinjektion|langzeit\s*injektion|retard)\b/i
const IM_ROUTE_RE = /\bi\.?\s*m\.?\b/i
const INTERVAL_RE =
  /\b(?:alle?\s+)?(\d+)\s*(tage?|wochen?|monate?)\b|\b(?:monatlich|monthly|viertelj[aä]hrlich)\b/i

const ROUTE_PATTERNS: { route: string; re: RegExp }[] = [
  { route: 'im', re: /\bi\.?\s*m\.?\b/i },
  { route: 'iv', re: /\bi\.?\s*v\.?\b/i },
  { route: 'sc', re: /\bs\.?\s*c\.?\b|\bsubkutan\b/i },
  { route: 'po', re: /\bp\.?\s*o\.?\b|\bper\s+os\b/i },
]

const FORMULATION_PATTERNS: { formulation: string; re: RegExp }[] = [
  { formulation: 'tablet', re: /\b(?:tbl\.?|tablette[n]?|tab\.?)\b/i },
  { formulation: 'drops', re: /\btropfen\b/i },
  { formulation: 'solution', re: /\b(?:lösung|loesung|solution)\b/i },
  { formulation: 'capsule', re: /\b(?:kapsel[n]?|kps\.?)\b/i },
  { formulation: 'patch', re: /\b(?:pflaster|patch)\b/i },
  { formulation: 'injection', re: /\b(?:injektion|inj\.?)\b/i },
]

const PRN_RE = /\b(?:bedarfsweise|bei\s+bedarf|prn|nach\s+bedarf|b\.?\s*b\.?)\b/i
const FREQUENCY_PATTERNS: { frequency: string; re: RegExp }[] = [
  { frequency: 'täglich', re: /\b(?:tgl\.?|täglich|daily)\b/i },
  { frequency: 'morgens', re: /\bmorgens\b/i },
  { frequency: 'mittags', re: /\bmittags\b/i },
  { frequency: 'abends', re: /\babends\b/i },
  { frequency: 'nachts', re: /\bnachts\b/i },
  { frequency: 'wöchentlich', re: /\b(?:wöchentlich|woechentlich|1\s*x\s*pro\s*woche)\b/i },
]

const MED_CHANGE_STATUS_PATTERNS: { status: string; re: RegExp }[] = [
  { status: 'discontinued', re: /\b(?:gestoppt|abgesetzt|beendet|eingestellt|discontinued)\b/i },
  { status: 'increased', re: /\b(?:erhöht|erhoeht|gesteigert|aufgestockt|increased)\b/i },
  { status: 'reduced', re: /\b(?:reduziert|gesenkt|vermindert|reduced)\b/i },
  { status: 'paused', re: /\b(?:pausiert|ausgesetzt|paused)\b/i },
]

const NARRATIVE_MED_INLINE_RE = /(?:aktuelle\s+)?medikation\s*:?\s*([^.\n]+)/gi
const NARRATIVE_BEGIN_RE = /\b(?:beginn|start)\s+(?:mit\s+)?([^.\n]+)/gi

const INLINE_MEDIKATION_LABEL_RE = /^(?:aktuelle\s+)?medikation\b\s*:?\s*(.*)$/i
const REJECTED_LINE_PREFIX_RE =
  /^(?:procedere|proc\.?|anliegen|visite|herr|frau|patient|pat\.?|verlauf|befund|plan|diagnose|diagnosen|therapie)\b/i

const NARRATIVE_MAX_LINE_LEN = 140
const NARRATIVE_CHANGE_MAX_LEN = 90

/** Common German tokens that precede dose-like patterns in flattened narrative. */
const SUBSTANCE_BLOCKLIST = new Set([
  'herr',
  'frau',
  'patient',
  'pat',
  'im',
  'bei',
  'geht',
  'sieht',
  'braucht',
  'wirkt',
  'wird',
  'viel',
  'bisschen',
  'aufgrund',
  'hygiene',
  'anliegen',
  'procedere',
  'proc',
  'verlauf',
  'visite',
  'morgens',
  'abends',
  'mittags',
  'heute',
  'gestern',
  'danach',
  'dabei',
  'weiter',
  'keine',
  'kein',
  'oder',
  'und',
  'mit',
  'ohne',
  'sehr',
  'gut',
  'schlecht',
  'erhöhung',
  'reduktion',
  'reduzierung',
  'steigerung',
])

/** Psych suffix stems and depot brands commonly seen in German letters. */
const DRUG_SUFFIX_RE =
  /(?:in|ol|id|am|pin|pram|zepam|zepin|done|tript|axin|azin|azep|xetin|prid|peron|perid|idon|apin|apin|prazol|tidin|tidine|oxin|afil|vastatin|mycin|cillin)$/i

const KNOWN_PSYCH_STEMS = new Set([
  'mirtazapin',
  'risperidon',
  'olanzapin',
  'quetiapin',
  'clozapin',
  'haloperidol',
  'aripiprazol',
  'paliperidon',
  'sertralin',
  'citalopram',
  'escitalopram',
  'fluoxetin',
  'paroxetin',
  'venlafaxin',
  'duloxetin',
  'lorazepam',
  'diazepam',
  'melperon',
  'promethazin',
  'levomepromazin',
  'lithium',
  'valproat',
  'carbamazepin',
  'lamotrigin',
  'gabapentin',
  'pregabalin',
  'methylphenidat',
  'atomoxetin',
  'bupropion',
  'trazodon',
  'amitriptylin',
  'trimipramin',
  'maprotilin',
  'zopiclon',
  'zolpidem',
  'promethazin',
])

const KNOWN_BRAND_TOKENS = new Set([
  'okedi',
  'xeplion',
  'invega',
  'abilify',
  'maintena',
  'risperdal',
  'zyprexa',
  'seroquel',
  'clopixol',
  'haldol',
  'zypadhera',
])

function normalizeSubstanceKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '')
}

function firstToken(value: string): string {
  return value.trim().split(/\s+/)[0] ?? ''
}

function isBlocklistedSubstance(substance: string): boolean {
  const token = normalizeToken(firstToken(substance))
  return !token || SUBSTANCE_BLOCKLIST.has(token)
}

function tokenLooksLikeDrug(token: string): boolean {
  const norm = normalizeToken(token)
  if (norm.length < 4) return false
  if (SUBSTANCE_BLOCKLIST.has(norm)) return false
  if (KNOWN_PSYCH_STEMS.has(norm)) return true
  if (KNOWN_BRAND_TOKENS.has(norm)) return true
  for (const stem of KNOWN_PSYCH_STEMS) {
    if (norm.startsWith(stem) || norm.includes(stem)) return true
  }
  for (const brand of KNOWN_BRAND_TOKENS) {
    if (norm.includes(brand)) return true
  }
  if (DRUG_SUFFIX_RE.test(norm)) return true
  return /^[A-ZÄÖÜ]/.test(token) && norm.length >= 5 && DRUG_SUFFIX_RE.test(norm)
}

function isDrugLikeSubstance(substance: string): boolean {
  const tokens = substance.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return false
  if (!tokenLooksLikeDrug(tokens[0])) return false
  if (tokens.length >= 2 && /^[A-ZÄÖÜ]/.test(tokens[1])) {
    return tokenLooksLikeDrug(tokens[0]) || KNOWN_BRAND_TOKENS.has(normalizeToken(tokens[1]))
  }
  return true
}

function isRejectedLinePrefix(line: string): boolean {
  return REJECTED_LINE_PREFIX_RE.test(line.trim())
}

/** Insert whitespace between glued substance tokens and numeric dose/strength segments. */
export function preprocessMedicationLine(line: string): string {
  return line
    .replace(/([A-Za-zÄÖÜäöü]{3,})(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+){1,3})\b/g, '$1 $2')
    .replace(
      /([A-Za-zÄÖÜäöü]{3,})(\d+(?:[.,]\d+)?)\s*(mg|µg|mcg|g|ml|mmol|ie|i\.e\.)\b/gi,
      '$1 $2 $3',
    )
}

function hasGluedSubstanceDose(line: string): boolean {
  return /[A-Za-zÄÖÜäöü]\d+(?:-\d+){1,3}\b/.test(line) || /[A-Za-zÄÖÜäöü]\d+(?:[.,]\d+)?\s*mg\b/i.test(line)
}

function substanceEndsBeforeNumbers(line: string, index: number): boolean {
  if (index <= 0) return false
  const charBefore = line[index - 1]
  return /[\s:,\-–(]/.test(charBefore)
}

function isValidStrengthMatch(line: string, match: RegExpExecArray | null): match is RegExpExecArray {
  if (!match || match.index === undefined || match.index <= 0) return false
  return /\s/.test(line[match.index - 1])
}

function isValidDoseMatch(line: string, match: RegExpExecArray | null): match is RegExpExecArray {
  if (!match || match.index === undefined) return false
  if (match.index === 0) return true
  const charBefore = line[match.index - 1]
  return !/[A-Za-zÄÖÜäöü]/.test(charBefore)
}

function findValidStrengthMatch(line: string): RegExpExecArray | null {
  const re = new RegExp(STRENGTH_RE.source, 'gi')
  let match: RegExpExecArray | null
  while ((match = re.exec(line)) !== null) {
    if (isValidStrengthMatch(line, match)) return match
  }
  return null
}

function findValidDoseMatch(line: string): RegExpExecArray | null {
  const re = new RegExp(DOSE_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(line)) !== null) {
    if (isValidDoseMatch(line, match)) return match
  }
  return null
}

function stripNarrativeMedicationPrefix(raw: string): string {
  const inlineLabel = INLINE_MEDIKATION_LABEL_RE.exec(raw.trim())
  if (inlineLabel?.[1]?.trim()) return inlineLabel[1].trim()

  const beginnMatch = /\b(?:beginn|start)\s+mit\s+(.+?)\.?\s*$/i.exec(raw.trim())
  if (beginnMatch?.[1]?.trim()) return beginnMatch[1].trim()

  return raw.trim()
}

function splitBrandFromSubstance(raw: string): { substance: string; displayBrandName?: string } {
  const tokens = raw.trim().split(/\s+/).filter(Boolean)
  if (tokens.length <= 1) return { substance: raw.trim() }
  if (tokens.length >= 2 && /^[A-ZÄÖÜ]/.test(tokens[1])) {
    return {
      substance: `${tokens[0]} ${tokens[1]}`.trim(),
      displayBrandName: tokens[1],
    }
  }
  return { substance: tokens[0] }
}

function extractDepotInterval(text: string): string | undefined {
  const intervalMatch = INTERVAL_RE.exec(text)
  if (!intervalMatch) return undefined
  const raw = intervalMatch[0].trim()
  if (/^alle?\s/i.test(raw)) return raw
  if (/monatlich|monthly/i.test(raw)) return 'monatlich'
  if (/viertelj/i.test(raw)) return raw
  const unit = intervalMatch[2]?.toLowerCase() ?? 'tage'
  const count = intervalMatch[1] ?? '1'
  return `alle ${count} ${unit}`
}

function classifyDepot(text: string): Pick<ParsedMedicationLine, 'isDepot' | 'depotInterval' | 'depotConfidence' | 'formulation'> {
  const lower = text.toLowerCase()
  const hasKeyword = DEPOT_KEYWORD_RE.test(lower)
  const hasIm = IM_ROUTE_RE.test(lower)
  const interval = extractDepotInterval(text)
  const hasInterval = Boolean(interval)

  if (hasKeyword || (hasIm && hasInterval) || (hasIm && DEPOT_KEYWORD_RE.test(lower))) {
    return {
      isDepot: true,
      depotInterval: interval ?? (hasKeyword ? undefined : interval),
      depotConfidence: 'high',
      formulation: 'depot',
    }
  }

  if (hasInterval && (hasIm || /\binjektion\b/i.test(lower))) {
    return {
      isDepot: true,
      depotInterval: interval,
      depotConfidence: 'medium',
      formulation: 'depot',
    }
  }

  if (hasInterval && /\b(?:okedi|xeplion|invega|abilify|maintena|risperdal\s*consta)\b/i.test(lower)) {
    return {
      isDepot: true,
      depotInterval: interval,
      depotConfidence: 'medium',
      formulation: 'depot',
    }
  }

  if (hasKeyword && !hasInterval) {
    return { isDepot: true, depotConfidence: 'medium', formulation: 'depot' }
  }

  return {}
}

function extractRoute(text: string): string | undefined {
  for (const { route, re } of ROUTE_PATTERNS) {
    if (re.test(text)) return route
  }
  return undefined
}

function extractFormulation(text: string, depotFormulation?: string): string | undefined {
  if (depotFormulation) return depotFormulation
  for (const { formulation, re } of FORMULATION_PATTERNS) {
    if (re.test(text)) return formulation
  }
  return undefined
}

function extractFrequency(text: string): { frequency?: string; isPrn?: boolean } {
  if (PRN_RE.test(text)) return { frequency: 'bedarfsweise', isPrn: true }
  for (const { frequency, re } of FREQUENCY_PATTERNS) {
    if (re.test(text)) return { frequency }
  }
  return {}
}

function extractChangeStatus(text: string): { status?: string; changeContext?: string } {
  for (const { status, re } of MED_CHANGE_STATUS_PATTERNS) {
    if (re.test(text)) return { status, changeContext: text.trim() }
  }
  return {}
}

function hasStrongMedicationSignal(parsed: ParsedMedicationLine): boolean {
  return Boolean(
    parsed.strength ||
      parsed.doseText ||
      parsed.isDepot ||
      parsed.formulation ||
      parsed.route ||
      parsed.isPrn,
  )
}

function hasMedicationSignal(parsed: ParsedMedicationLine): boolean {
  if (hasStrongMedicationSignal(parsed)) return true
  if (parsed.changeContext && parsed.status) return true
  return Boolean(parsed.frequency && parsed.strength)
}

function extractSubstance(
  trimmed: string,
  strengthMatch: RegExpExecArray | null,
  doseMatch: RegExpExecArray | null,
): string {
  if (strengthMatch?.index !== undefined && strengthMatch.index > 0 && substanceEndsBeforeNumbers(trimmed, strengthMatch.index)) {
    return trimmed
      .slice(0, strengthMatch.index)
      .replace(/\bauf\s*$/i, '')
      .replace(/\s+(i\.?\s*m\.?|s\.?\s*c\.?|p\.?\s*o\.?)\.?\s*$/i, '')
      .trim()
  }

  if (doseMatch?.index !== undefined && doseMatch.index > 0 && substanceEndsBeforeNumbers(trimmed, doseMatch.index)) {
    return trimmed
      .slice(0, doseMatch.index)
      .replace(/\s+(i\.?\s*m\.?|s\.?\s*c\.?|p\.?\s*o\.?)\.?\s*$/i, '')
      .trim()
  }

  const firstNum = trimmed.search(/(?:^|\s)\d/)
  if (firstNum > 0 && substanceEndsBeforeNumbers(trimmed, firstNum)) {
    return trimmed
      .slice(0, firstNum)
      .replace(/\s+(i\.?\s*m\.?|s\.?\s*c\.?|p\.?\s*o\.?)\.?\s*$/i, '')
      .trim()
  }

  const tokens = trimmed.split(/\s+/).slice(0, 2).join(' ')
  return tokens.replace(/\s+(i\.?\s*m\.?|s\.?\s*c\.?|p\.?\s*o\.?)\.?\s*$/i, '').trim()
}

function isShortMedicationChangeSentence(line: string, parsed: ParsedMedicationLine): boolean {
  if (!parsed.changeContext || !parsed.status) return false
  if (line.length > NARRATIVE_CHANGE_MAX_LEN) return false
  return Boolean(parsed.strength || parsed.doseText || parsed.isDepot)
}

function qualifiesStructuredMedicationLine(line: string, parsed: ParsedMedicationLine): boolean {
  if (isRejectedLinePrefix(line)) return false
  if (isBlocklistedSubstance(parsed.substance)) return false
  if (!isDrugLikeSubstance(parsed.substance)) return false
  if (hasGluedSubstanceDose(line)) return false
  return hasMedicationSignal(parsed)
}

function qualifiesNarrativeMedicationLine(
  line: string,
  parsed: ParsedMedicationLine,
  rawLine: string,
): boolean {
  if (!qualifiesStructuredMedicationLine(line, parsed)) return false
  if (INLINE_MEDIKATION_LABEL_RE.test(rawLine.trim())) return true
  if (line.length > NARRATIVE_MAX_LINE_LEN && !/\bmedikation\s*:/i.test(rawLine)) return false

  const inlineLabel = INLINE_MEDIKATION_LABEL_RE.exec(line.trim())
  if (inlineLabel?.[1]?.trim()) return true
  if (/\b(?:beginn|start)\s+mit\b/i.test(rawLine) && rawLine.length <= NARRATIVE_MAX_LINE_LEN) return true
  if (isShortMedicationChangeSentence(rawLine, parsed)) return true

  if (parsed.strength && (parsed.doseText || parsed.isDepot || parsed.route)) {
    return rawLine.length <= NARRATIVE_MAX_LINE_LEN
  }

  if (parsed.strength && parsed.isPrn) return rawLine.length <= NARRATIVE_MAX_LINE_LEN

  if (parsed.changeContext && parsed.status && !parsed.strength && rawLine.length <= NARRATIVE_CHANGE_MAX_LEN) {
    return isDrugLikeSubstance(parsed.substance)
  }

  return false
}

function lineQualifies(
  line: string,
  parsed: ParsedMedicationLine,
  mode: MedicationScanMode,
  rawLine: string,
): boolean {
  return mode === 'structured'
    ? qualifiesStructuredMedicationLine(line, parsed)
    : qualifiesNarrativeMedicationLine(line, parsed, rawLine)
}

/** Parse one medication line (list item or inline mention). */
export function parseMedicationLine(
  line: string,
  options: { mode?: MedicationScanMode } = {},
): ParsedMedicationLine | null {
  const mode = options.mode ?? 'structured'
  const rawTrimmed = line.replace(/^[-*•\d.)\s]+/, '').trim()
  if (!rawTrimmed) return null

  const workingRaw = stripNarrativeMedicationPrefix(rawTrimmed)
  const trimmed = preprocessMedicationLine(workingRaw)
  if (!trimmed) return null
  if (hasGluedSubstanceDose(workingRaw) && trimmed === workingRaw) return null

  const strengthMatch = findValidStrengthMatch(trimmed)
  const doseMatch = findValidDoseMatch(trimmed)

  const rawSubstance = extractSubstance(trimmed, strengthMatch, doseMatch) || trimmed
  const { substance, displayBrandName } = splitBrandFromSubstance(rawSubstance)
  if (!substance || substance.length < 2) return null

  const depot = classifyDepot(trimmed)
  const route = extractRoute(trimmed)
  const formulation = extractFormulation(trimmed, depot.formulation)
  const { frequency, isPrn } = extractFrequency(trimmed)
  const change = extractChangeStatus(trimmed)

  const parsed: ParsedMedicationLine = {
    substance,
    displayBrandName,
    strength: strengthMatch ? `${strengthMatch[1]} ${strengthMatch[2]}` : undefined,
    doseText: doseMatch ? doseMatch[1].replace(/\s/g, '') : undefined,
    formulation,
    route,
    frequency,
    isPrn,
    ...depot,
    ...change,
  }

  if (!hasMedicationSignal(parsed)) return null
  if (!lineQualifies(trimmed, parsed, mode, rawTrimmed)) return null
  return parsed
}

function splitMedicationListLine(line: string, mode: MedicationScanMode): string[] {
  const trimmed = line.trim()
  if (!trimmed) return []

  if (trimmed.includes(';')) {
    const parts = trimmed.split(';').map((part) => part.trim()).filter(Boolean)
    if (parts.length > 1 && parts.every((part) => parseMedicationLine(part, { mode }))) return parts
  }

  const commaParts = trimmed.split(/,\s*(?=[A-ZÄÖÜ])/).map((part) => part.trim()).filter(Boolean)
  if (commaParts.length > 1 && commaParts.every((part) => parseMedicationLine(part, { mode }))) {
    return commaParts
  }

  const undParts = trimmed.split(/\s+und\s+/i).map((part) => part.trim()).filter(Boolean)
  if (undParts.length > 1 && undParts.every((part) => parseMedicationLine(part, { mode }))) {
    return undParts
  }

  return [trimmed]
}

function linesFromText(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean)
}

function isNarrativeMedChangeLine(line: string): boolean {
  const trimmed = preprocessMedicationLine(line.trim())
  if (!trimmed || isRejectedLinePrefix(trimmed)) return false
  if (trimmed.length > NARRATIVE_CHANGE_MAX_LEN) return false
  if (!MED_CHANGE_STATUS_PATTERNS.some(({ re }) => re.test(trimmed))) return false
  const parsed = parseMedicationLine(trimmed, { mode: 'narrative' })
  return parsed !== null
}

function collectCandidateLinesFromText(text: string, mode: MedicationScanMode): string[] {
  const out: string[] = []

  for (const line of linesFromText(text)) {
    const inline = INLINE_MEDIKATION_LABEL_RE.exec(line)
    if (inline?.[1]?.trim()) {
      out.push(...splitMedicationListLine(inline[1].trim(), 'structured'))
      continue
    }
    if (INLINE_MEDIKATION_LABEL_RE.test(line)) continue

    if (mode === 'structured') {
      out.push(...splitMedicationListLine(line, mode))
      continue
    }

    if (/\b(?:beginn|start)\s+mit\b/i.test(line) && line.length <= NARRATIVE_MAX_LINE_LEN) {
      out.push(stripNarrativeMedicationPrefix(line))
      continue
    }

    if (isNarrativeMedChangeLine(line)) {
      out.push(line)
      continue
    }

    if (
      line.length <= NARRATIVE_MAX_LINE_LEN &&
      !isRejectedLinePrefix(line) &&
      parseMedicationLine(line, { mode: 'narrative' })
    ) {
      out.push(line)
    }
  }

  if (mode === 'narrative') {
    for (const re of [NARRATIVE_MED_INLINE_RE, NARRATIVE_BEGIN_RE]) {
      re.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = re.exec(text)) !== null) {
        const snippet = match[1]?.trim()
        if (snippet) out.push(...splitMedicationListLine(snippet, 'structured'))
      }
    }
  }

  return out
}

function medicationConfidence(parsed: ParsedMedicationLine): 'high' | 'medium' | 'low' {
  if (parsed.isDepot && parsed.depotConfidence === 'high') return 'high'
  if (parsed.strength && (parsed.doseText || parsed.route || parsed.formulation || parsed.frequency)) {
    return 'high'
  }
  if (parsed.strength || parsed.doseText) return 'high'
  if (parsed.isDepot) return 'medium'
  if (parsed.formulation || parsed.route || parsed.frequency || parsed.isPrn) return 'medium'
  if (parsed.changeContext) return 'low'
  return 'low'
}

function medicationClarifications(parsed: ParsedMedicationLine): ImportClarification[] | undefined {
  const clarifications: ImportClarification[] = []
  if (parsed.isDepot && parsed.depotConfidence === 'low') {
    clarifications.push({
      field: 'formulation',
      code: 'depot_uncertain',
      message: 'Depot-Medikation unsicher erkannt – bitte Darreichungsform prüfen.',
    })
  }
  if (medicationConfidence(parsed) === 'low') {
    clarifications.push({
      field: 'substance',
      code: 'medication_uncertain',
      message: 'Medikament unsicher erkannt – bitte Substanz und Dosierung prüfen.',
    })
  }
  return clarifications.length > 0 ? clarifications : undefined
}

function buildDoseText(parsed: ParsedMedicationLine): string | undefined {
  if (parsed.isDepot && parsed.depotInterval) return parsed.depotInterval
  const parts = [parsed.doseText, parsed.frequency, parsed.route ? parsed.route : undefined].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : parsed.doseText
}

export function parsedMedicationToCandidate(
  parsed: ParsedMedicationLine,
  raw: string,
  location: ImportSourceLocation,
  options: { startDate?: string } = {},
): ClinicalImportCandidate {
  return makeCandidate({
    module: 'medication',
    confidence: medicationConfidence(parsed),
    sourceLocation: location,
    rawText: raw,
    clarifications: medicationClarifications(parsed),
    data: {
      substance: parsed.substance,
      strength: parsed.strength,
      doseText: buildDoseText(parsed),
      formulation: parsed.formulation,
      displayBrandName: parsed.displayBrandName,
      route: parsed.route,
      frequency: parsed.frequency,
      isPrn: parsed.isPrn,
      isDepot: parsed.isDepot,
      depotInterval: parsed.depotInterval,
      status: parsed.status,
      changeContext: parsed.changeContext,
      startDate: options.startDate,
    },
  })
}

function existingMedicationSubstances(candidates: ClinicalImportCandidate[]): Set<string> {
  const keys = new Set<string>()
  for (const candidate of candidates) {
    if (candidate.module === 'medication') {
      keys.add(normalizeSubstanceKey(candidate.data.substance))
    }
  }
  return keys
}

function extractFromTextBlock(
  text: string,
  location: ImportSourceLocation,
  existing: Set<string>,
  mode: MedicationScanMode,
  startDate?: string,
): ClinicalImportCandidate[] {
  const out: ClinicalImportCandidate[] = []

  for (const candidateLine of collectCandidateLinesFromText(text, mode)) {
    const parsed = parseMedicationLine(candidateLine, { mode })
    if (!parsed) continue
    const key = normalizeSubstanceKey(parsed.substance)
    if (existing.has(key)) continue

    existing.add(key)
    out.push(parsedMedicationToCandidate(parsed, candidateLine, location, { startDate }))
  }

  return out
}

const NARRATIVE_MEDICATION_SOURCE_MODULES = new Set<ClinicalImportCandidate['module']>([
  'verlauf',
  'therapy',
  'anamnese',
])

function medicationScanBlocks(
  candidate: ClinicalImportCandidate,
): { text: string; mode: MedicationScanMode }[] {
  if (candidate.module === 'anamnese') {
    const sectionContents = candidate.data.sectionContents
    if (sectionContents?.['medikamentenanamnese']?.trim()) {
      return [{ text: sectionContents['medikamentenanamnese'], mode: 'structured' }]
    }
    if (candidate.data.sectionId === 'medikamentenanamnese' && candidate.data.text?.trim()) {
      return [{ text: candidate.data.text, mode: 'structured' }]
    }
    return [{ text: candidate.data.text, mode: 'narrative' }]
  }

  if (candidate.module === 'therapy') {
    return [{ text: `${candidate.data.title}\n${candidate.data.text}`, mode: 'narrative' }]
  }

  if (candidate.module === 'verlauf') {
    return [{ text: candidate.data.text, mode: 'narrative' }]
  }

  return []
}

/**
 * Scan narrative candidates for inline Medikation lines and medication mentions;
 * append structured medication candidates without duplicating dedicated
 * Medikation-section rows.
 */
export function appendMedicationCandidatesFromNarrative(
  candidates: ClinicalImportCandidate[],
): ClinicalImportCandidate[] {
  const existing = existingMedicationSubstances(candidates)
  const derived: ClinicalImportCandidate[] = []

  for (const candidate of candidates) {
    if (!NARRATIVE_MEDICATION_SOURCE_MODULES.has(candidate.module)) continue

    const blocks = medicationScanBlocks(candidate)
    const startDate =
      candidate.module === 'verlauf' && candidate.data.date ? candidate.data.date : undefined

    for (const block of blocks) {
      if (!block.text?.trim()) continue

      const location: ImportSourceLocation = {
        ...candidate.sourceLocation,
        section: candidate.sourceLocation.section
          ? `${candidate.sourceLocation.section} → Medikation`
          : 'Medikation',
      }

      derived.push(...extractFromTextBlock(block.text, location, existing, block.mode, startDate))
    }
  }

  return derived.length > 0 ? [...candidates, ...derived] : candidates
}
