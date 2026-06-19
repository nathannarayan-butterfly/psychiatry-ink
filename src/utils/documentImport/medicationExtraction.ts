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

const PRN_RE = /\b(?:bedarfsweise|bei\s+bedarf|prn|nach\s+bedarf)\b/i
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

function normalizeSubstanceKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
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

function hasMedicationSignal(parsed: ParsedMedicationLine): boolean {
  return Boolean(
    parsed.strength ||
      parsed.doseText ||
      parsed.isDepot ||
      parsed.formulation ||
      parsed.route ||
      parsed.frequency ||
      parsed.isPrn ||
      parsed.changeContext,
  )
}

function extractSubstance(trimmed: string, strengthMatch: RegExpExecArray | null): string {
  if (strengthMatch?.index !== undefined && strengthMatch.index > 0) {
    return trimmed
      .slice(0, strengthMatch.index)
      .replace(/\bauf\s*$/i, '')
      .replace(/\s+(i\.?\s*m\.?|s\.?\s*c\.?|p\.?\s*o\.?)\.?\s*$/i, '')
      .trim()
  }

  const firstNum = trimmed.search(/\d/)
  let rawSubstance =
    firstNum > 0 ? trimmed.slice(0, firstNum).trim() : trimmed.split(/\s+/).slice(0, 2).join(' ')
  return rawSubstance.replace(/\s+(i\.?\s*m\.?|s\.?\s*c\.?|p\.?\s*o\.?)\.?\s*$/i, '').trim()
}

/** Parse one medication line (list item or inline mention). */
export function parseMedicationLine(line: string): ParsedMedicationLine | null {
  const trimmed = line.replace(/^[-*•\d.)\s]+/, '').trim()
  if (!trimmed) return null

  const strengthMatch = STRENGTH_RE.exec(trimmed)
  const doseMatch = DOSE_RE.exec(trimmed)

  const rawSubstance = extractSubstance(trimmed, strengthMatch) || trimmed
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

  return hasMedicationSignal(parsed) ? parsed : null
}

function splitMedicationListLine(line: string): string[] {
  const trimmed = line.trim()
  if (!trimmed) return []

  if (trimmed.includes(';')) {
    const parts = trimmed.split(';').map((part) => part.trim()).filter(Boolean)
    if (parts.length > 1 && parts.every((part) => parseMedicationLine(part))) return parts
  }

  const commaParts = trimmed.split(/,\s*(?=[A-ZÄÖÜ])/).map((part) => part.trim()).filter(Boolean)
  if (commaParts.length > 1 && commaParts.every((part) => parseMedicationLine(part))) {
    return commaParts
  }

  const undParts = trimmed.split(/\s+und\s+/i).map((part) => part.trim()).filter(Boolean)
  if (undParts.length > 1 && undParts.every((part) => parseMedicationLine(part))) {
    return undParts
  }

  return [trimmed]
}

const INLINE_MEDIKATION_LABEL_RE = /^(?:aktuelle\s+)?medikation\b\s*:?\s*(.*)$/i

function linesFromText(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean)
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

function collectCandidateLinesFromText(text: string): string[] {
  const out: string[] = []

  for (const line of linesFromText(text)) {
    const inline = INLINE_MEDIKATION_LABEL_RE.exec(line)
    if (inline?.[1]?.trim()) {
      out.push(...splitMedicationListLine(inline[1].trim()))
      continue
    }
    if (INLINE_MEDIKATION_LABEL_RE.test(line)) continue
    // Inline narrative patterns are handled by the regex passes below.
    if (/\b(?:beginn|start)\s+mit\b/i.test(line) || /\bmedikation\s*:/i.test(line)) continue
    out.push(...splitMedicationListLine(line))
  }

  for (const re of [NARRATIVE_MED_INLINE_RE, NARRATIVE_BEGIN_RE]) {
    re.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) !== null) {
      const snippet = match[1]?.trim()
      if (snippet) out.push(...splitMedicationListLine(snippet))
    }
  }

  return out
}

function extractFromTextBlock(
  text: string,
  location: ImportSourceLocation,
  existing: Set<string>,
  startDate?: string,
): ClinicalImportCandidate[] {
  const out: ClinicalImportCandidate[] = []

  for (const candidateLine of collectCandidateLinesFromText(text)) {
    const parsed = parseMedicationLine(candidateLine)
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

    const text =
      candidate.module === 'anamnese'
        ? candidate.data.text
        : candidate.module === 'therapy'
          ? `${candidate.data.title}\n${candidate.data.text}`
          : candidate.module === 'verlauf'
            ? candidate.data.text
            : ''
    if (!text) continue

    const location: ImportSourceLocation = {
      ...candidate.sourceLocation,
      section: candidate.sourceLocation.section
        ? `${candidate.sourceLocation.section} → Medikation`
        : 'Medikation',
    }

    const startDate =
      candidate.module === 'verlauf' && candidate.data.date ? candidate.data.date : undefined

    derived.push(...extractFromTextBlock(text, location, existing, startDate))
  }

  return derived.length > 0 ? [...candidates, ...derived] : candidates
}
