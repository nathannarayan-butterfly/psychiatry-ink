/**
 * Heading-based clinical text segmentation, shared by the DOCX and TXT adapters.
 *
 * German clinical letters and notes are organised under headings such as
 * "Anamnese", "Diagnosen", "Medikation", "Labor", "Therapie und Verlauf". This
 * module:
 *   1. Splits flat text into `{ heading, body }` sections.
 *   2. Maps each heading to a target clinical module (+ optional anamnese section id).
 *   3. Turns each section body into one or more reviewable candidates.
 *
 * Everything here is pure and deterministic — no network, no AI.
 */
import type {
  CandidateModule,
  ClinicalImportCandidate,
  ImportClarification,
  ImportSourceLocation,
} from '../../schemas/documentImport/envelope'
import { makeCandidate } from './candidateFactory'
import {
  parseMedicationLine as parseMedicationLineFromExtraction,
  parsedMedicationToCandidate,
  type ParsedMedicationLine,
} from './medicationExtraction'
import { normalizeVerlaufText } from './normalizeVerlaufText'
import {
  extractVisiteFromEntryText,
  parseVisiteMitHeading,
} from './visiteParsing'
import {
  findGermanDateInText,
  isDateOnlyLine,
  splitDatedEntries,
  type DateLocationHint,
  type DatedEntry,
} from './dateAssociation'

/** German clarification messages emitted at parse time (localized fallbacks). */
const DATE_UNCERTAIN_CLARIFICATION: ImportClarification = {
  field: 'date',
  code: 'date_uncertain',
  message: 'Kein Datum für diesen Verlaufseintrag gefunden – bitte ergänzen.',
}
const DATE_UNPARSED_CLARIFICATION = (raw: string): ImportClarification => ({
  field: 'date',
  code: 'date_unparsed',
  message: `Datum „${raw}" konnte nicht eindeutig gelesen werden – bitte prüfen.`,
})

/** Map a dated entry to its date value + optional clarification. */
function entryDate(entry: DatedEntry): { date?: string; clarifications: ImportClarification[] } {
  if (entry.iso) return { date: entry.iso, clarifications: [] }
  if (entry.raw) return { date: undefined, clarifications: [DATE_UNPARSED_CLARIFICATION(entry.raw)] }
  return { date: undefined, clarifications: [DATE_UNCERTAIN_CLARIFICATION] }
}

export interface TextSection {
  heading: string
  body: string
  /** 1-based line number of the heading in the source text. */
  lineNumber: number
}

interface HeadingMapping {
  module: CandidateModule
  /** Aufnahme section id when the heading maps to a specific anamnese section. */
  sectionId?: string
  /** Complementary therapy type id when module is `complementaryTherapy`. */
  therapyTypeId?: string
}

/** A per-user heading override: normalized alias → target module/section. */
export interface HeadingAlias {
  /** Raw heading label as the user labelled it (normalized internally). */
  alias: string
  module: CandidateModule
  sectionId?: string
}

/**
 * Normalised heading → target module. Keys are lowercased, umlaut-folded and
 * punctuation-stripped (see `normalizeHeading`). The dictionary is intentionally
 * broad: it covers the German headings named in the spec, their common spelling
 * variants and synonyms, the standard aufnahme section labels, AND English
 * equivalents so English-language letters / PDF exports sectionize too.
 *
 * Keep this organised by target module so it stays maintainable as more clinic
 * formats are observed. Heading *families* (anything ending in "-anamnese", any
 * "...verlauf...", etc.) are additionally caught by `classifyHeading`'s fuzzy
 * fallback, so this map only needs the canonical labels + notable exceptions.
 */
const HEADING_MAP: Record<string, HeadingMapping> = {
  // --- Anamnese family (German) ---
  anamnese: { module: 'anamnese' },
  aufnahme: { module: 'anamnese', sectionId: 'aufnahmeanlass' },
  aufnahmebefund: { module: 'anamnese' },
  'aufnahme befund': { module: 'anamnese' },
  aufnahmeanlass: { module: 'anamnese', sectionId: 'aufnahmeanlass' },
  'aktuelle anamnese': { module: 'anamnese', sectionId: 'aktuelle-krankheitsanamnese' },
  'aktuelle beschwerden': { module: 'anamnese', sectionId: 'aktuelle-beschwerden' },
  'psychiatrische anamnese': { module: 'anamnese', sectionId: 'psychiatrische-vorgeschichte' },
  'korperlich vegetative anamnese': { module: 'anamnese', sectionId: 'somatische-anamnese' },
  vorerkrankungen: { module: 'anamnese', sectionId: 'somatische-anamnese' },
  'neurologischer befund': { module: 'anamnese', sectionId: 'somatischer-befund' },
  'medikamenten bei der aufnahme': { module: 'medication' },
  'vorlaufige behandlungsdiagnose': { module: 'diagnosis' },
  procedere: { module: 'therapy' },
  eigenanamnese: { module: 'anamnese', sectionId: 'eigenanamnese' },
  'aktuelle krankheitsanamnese': { module: 'anamnese', sectionId: 'aktuelle-krankheitsanamnese' },
  'jetzige anamnese': { module: 'anamnese', sectionId: 'aktuelle-krankheitsanamnese' },
  'psychiatrische vorgeschichte': { module: 'anamnese', sectionId: 'psychiatrische-vorgeschichte' },
  'somatische anamnese': { module: 'anamnese', sectionId: 'somatische-anamnese' },
  'vegetative anamnese': { module: 'anamnese', sectionId: 'somatische-anamnese' },
  suchtanamnese: { module: 'anamnese', sectionId: 'suchtanamnese' },
  suchtmittelanamnese: { module: 'anamnese', sectionId: 'suchtanamnese' },
  medikamentenanamnese: { module: 'anamnese', sectionId: 'medikamentenanamnese' },
  familienanamnese: { module: 'anamnese', sectionId: 'familienanamnese' },
  fremdanamnese: { module: 'anamnese', sectionId: 'fremdanamnese' },
  'biografische anamnese': { module: 'anamnese', sectionId: 'biografische-anamnese' },
  biografie: { module: 'anamnese', sectionId: 'biografische-anamnese' },
  biographie: { module: 'anamnese', sectionId: 'biografische-anamnese' },
  sozialanamnese: { module: 'anamnese', sectionId: 'sozialanamnese' },
  'soziale anamnese': { module: 'anamnese', sectionId: 'sozialanamnese' },
  'schul und berufsanamnese': { module: 'anamnese', sectionId: 'schul-und-berufsanamnese' },
  'forensische anamnese': { module: 'anamnese', sectionId: 'forensische-anamnese' },
  traumaanamnese: { module: 'anamnese', sectionId: 'traumaanamnese' },
  'psychopathologischer befund': { module: 'anamnese', sectionId: 'psychopathologischer-befund' },
  'psychopathalogischer befund': { module: 'anamnese', sectionId: 'psychopathologischer-befund' },
  'psychischer befund': { module: 'anamnese', sectionId: 'psychopathologischer-befund' },
  'somatischer befund': { module: 'anamnese', sectionId: 'somatischer-befund' },
  vorgeschichte: { module: 'anamnese' },
  jetzige_anamnese: { module: 'anamnese' },
  // --- Anamnese family (English) ---
  history: { module: 'anamnese' },
  anamnesis: { module: 'anamnese' },
  'history of present illness': { module: 'anamnese', sectionId: 'aktuelle-krankheitsanamnese' },
  'presenting complaint': { module: 'anamnese', sectionId: 'aktuelle-beschwerden' },
  'chief complaint': { module: 'anamnese', sectionId: 'aktuelle-beschwerden' },
  'past psychiatric history': { module: 'anamnese', sectionId: 'psychiatrische-vorgeschichte' },
  'psychiatric history': { module: 'anamnese', sectionId: 'psychiatrische-vorgeschichte' },
  'past medical history': { module: 'anamnese', sectionId: 'somatische-anamnese' },
  'medical history': { module: 'anamnese', sectionId: 'somatische-anamnese' },
  'family history': { module: 'anamnese', sectionId: 'familienanamnese' },
  'social history': { module: 'anamnese', sectionId: 'sozialanamnese' },
  'substance use history': { module: 'anamnese', sectionId: 'suchtanamnese' },
  'collateral history': { module: 'anamnese', sectionId: 'fremdanamnese' },
  'mental status examination': { module: 'anamnese', sectionId: 'psychopathologischer-befund' },
  'mental state examination': { module: 'anamnese', sectionId: 'psychopathologischer-befund' },
  'mental status': { module: 'anamnese', sectionId: 'psychopathologischer-befund' },

  // --- Diagnoses ---
  diagnosen: { module: 'diagnosis' },
  diagnose: { module: 'diagnosis' },
  diagnosis: { module: 'diagnosis' },
  diagnoses: { module: 'diagnosis' },
  'diagnostische einschatzung': { module: 'diagnosis' },
  icd: { module: 'diagnosis' },
  'icd 10': { module: 'diagnosis' },
  'icd 11': { module: 'diagnosis' },

  // --- Medication ---
  medikation: { module: 'medication' },
  medikamente: { module: 'medication' },
  'aktuelle medikation': { module: 'medication' },
  medication: { module: 'medication' },
  medications: { module: 'medication' },
  'current medication': { module: 'medication' },
  'medication list': { module: 'medication' },
  pharmakotherapie: { module: 'medication' },

  // --- Laboratory ---
  labor: { module: 'lab' },
  laborwerte: { module: 'lab' },
  laborbefunde: { module: 'lab' },
  laboratory: { module: 'lab' },
  'laboratory results': { module: 'lab' },
  'lab results': { module: 'lab' },
  labs: { module: 'lab' },

  // --- Investigations / findings ---
  befunde: { module: 'investigation' },
  untersuchungsbefunde: { module: 'investigation' },
  apparative_diagnostik: { module: 'investigation' },
  'apparative diagnostik': { module: 'investigation' },
  ekg: { module: 'investigation' },
  eeg: { module: 'investigation' },
  bildgebung: { module: 'investigation' },
  imaging: { module: 'investigation' },
  investigations: { module: 'investigation' },
  findings: { module: 'investigation' },

  // --- Therapy / course ---
  'therapie und verlauf': { module: 'therapy' },
  therapie: { module: 'therapy' },
  therapieverlauf: { module: 'therapy' },
  behandlungsverlauf: { module: 'therapy' },
  therapieplanung: { module: 'therapy' },
  behandlungsplan: { module: 'therapy' },
  treatment: { module: 'therapy' },
  'treatment plan': { module: 'therapy' },
  verlauf: { module: 'verlauf' },
  verlaufsdokumentation: { module: 'verlauf' },
  'verlauf dokumentation': { module: 'verlauf' },
  'verlauf documentation': { module: 'verlauf' },
  'clinical course': { module: 'verlauf' },
  course: { module: 'verlauf' },
  dokumentation: { module: 'verlauf' },
  fortschritt: { module: 'verlauf' },
  tagesverlauf: { module: 'verlauf' },
  progress: { module: 'verlauf' },
  'progress notes': { module: 'verlauf' },
  'progress note': { module: 'verlauf' },

  // --- Complementary therapy progress notes (specialty Verlauf, not ward course) ---
  ergotherapieverlauf: { module: 'complementaryTherapy', therapyTypeId: 'ergotherapie' },
  'ergotherapie verlauf': { module: 'complementaryTherapy', therapyTypeId: 'ergotherapie' },
  sporttherapieverlauf: { module: 'complementaryTherapy', therapyTypeId: 'sporttherapie' },
  'sporttherapie verlauf': { module: 'complementaryTherapy', therapyTypeId: 'sporttherapie' },
  musiktherapieverlauf: { module: 'complementaryTherapy', therapyTypeId: 'musiktherapie' },
  'musiktherapie verlauf': { module: 'complementaryTherapy', therapyTypeId: 'musiktherapie' },
  kunsttherapieverlauf: { module: 'complementaryTherapy', therapyTypeId: 'kunsttherapie' },
  'kunsttherapie verlauf': { module: 'complementaryTherapy', therapyTypeId: 'kunsttherapie' },
  arbeitstherapieverlauf: { module: 'complementaryTherapy', therapyTypeId: 'arbeitstherapie' },
  'arbeitstherapie verlauf': { module: 'complementaryTherapy', therapyTypeId: 'arbeitstherapie' },
  physiotherapieverlauf: { module: 'complementaryTherapy', therapyTypeId: 'physiotherapie' },
  'physiotherapie verlauf': { module: 'complementaryTherapy', therapyTypeId: 'physiotherapie' },

  // --- Risk / safety ---
  risiko: { module: 'risk' },
  risikobewertung: { module: 'risk' },
  'risk assessment': { module: 'risk' },
  suizidalitat: { module: 'risk' },
  'suicide risk': { module: 'risk' },
  'suizid und selbstgefahrdungsanamnese': { module: 'risk', sectionId: 'suizid-und-selbstgefaehrdungsanamnese' },
  fremdgefahrdungsanamnese: { module: 'risk', sectionId: 'fremdgefaehrdungsanamnese' },
  selbstgefahrdung: { module: 'risk' },
  fremdgefahrdung: { module: 'risk' },
}

/** Lowercase, strip umlauts/punctuation, collapse whitespace for heading lookup. */
export function normalizeHeading(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[#*_>:]+/g, ' ')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[.,;/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** How confidently a heading was recognised: an exact dictionary/alias hit, or a fuzzy word-family match. */
type HeadingMatchType = 'exact' | 'fuzzy'

interface HeadingClassification {
  mapping: HeadingMapping
  match: HeadingMatchType
}

/** Build a normalized alias → mapping lookup from per-user profile aliases. */
function buildAliasMap(aliases: HeadingAlias[] | undefined): Map<string, HeadingMapping> {
  const map = new Map<string, HeadingMapping>()
  if (!aliases) return map
  for (const alias of aliases) {
    const key = normalizeHeading(alias.alias)
    if (key) map.set(key, { module: alias.module, sectionId: alias.sectionId })
  }
  return map
}

/** Prefix before "verlauf" in a heading → complementary therapy type id. */
const THERAPY_VERLAUF_PREFIXES: Record<string, string> = {
  ergotherapie: 'ergotherapie',
  sporttherapie: 'sporttherapie',
  sport: 'sporttherapie',
  musiktherapie: 'musiktherapie',
  musik: 'musiktherapie',
  kunsttherapie: 'kunsttherapie',
  kunst: 'kunsttherapie',
  arbeitstherapie: 'arbeitstherapie',
  arbeit: 'arbeitstherapie',
  physiotherapie: 'physiotherapie',
}

const EXCLUDED_THERAPY_VERLAUF_PREFIXES = new Set(['therapie', 'behandlung', 'behandlungs', 'psych'])

function matchComplementaryTherapyVerlauf(stripped: string): HeadingMapping | null {
  const m = stripped.match(/^([a-z]+)(?:\s+)?verlauf\b/)
  if (!m) return null
  const prefix = m[1]
  if (EXCLUDED_THERAPY_VERLAUF_PREFIXES.has(prefix)) return null
  const therapyTypeId = THERAPY_VERLAUF_PREFIXES[prefix]
  if (!therapyTypeId) return null
  return { module: 'complementaryTherapy', therapyTypeId }
}

/** Fuzzy word-family fallback. Returns null when no clinical family is recognised. */
function fuzzyHeading(stripped: string): HeadingMapping | null {
  if (/^aufnahmeanlass\b/.test(stripped)) return { module: 'anamnese', sectionId: 'aufnahmeanlass' }
  if (/^(aufnahme|aufnahmebefund|aufnahme befund)\b/.test(stripped)) return { module: 'anamnese' }
  if (/\bvisite\b/.test(stripped)) return { module: 'verlauf' }
  if (/\bprocedere\b/.test(stripped)) return { module: 'therapy' }
  const complementaryVerlauf = matchComplementaryTherapyVerlauf(stripped)
  if (complementaryVerlauf) return complementaryVerlauf
  if (/\bvorerkrankung/.test(stripped)) return { module: 'anamnese', sectionId: 'somatische-anamnese' }
  if (/\bneurologisch/.test(stripped) && /\bbefund\b/.test(stripped)) {
    return { module: 'anamnese', sectionId: 'somatischer-befund' }
  }
  if (/\bsporttherapie\b/.test(stripped)) return { module: 'verlauf' }
  if (/\bsuchtmittelanamnese\b/.test(stripped)) return { module: 'anamnese', sectionId: 'suchtanamnese' }
  if (/\bfremdanamnese\b/.test(stripped)) return { module: 'anamnese', sectionId: 'fremdanamnese' }
  if (/\b[a-z]*anamnese\b/.test(stripped)) return { module: 'anamnese' }
  if (/\b(psychopathologischer|psychopathalogischer|psychischer)\s+befund\b/.test(stripped)) {
    return { module: 'anamnese', sectionId: 'psychopathologischer-befund' }
  }
  if (/\bsomatischer\s+befund\b/.test(stripped)) return { module: 'anamnese', sectionId: 'somatischer-befund' }
  if (/\b([a-z]*verlauf[a-z]*|clinical course|course|dokumentation|documentation|fortschritt|tagesverlauf|progress notes?)\b/.test(stripped)) {
    return { module: 'verlauf' }
  }
  if (/\b([a-z]*therap[a-z]*|treatment)\b/.test(stripped)) return { module: 'therapy' }
  if (/\b(diagnos[a-z]*|icd)\b/.test(stripped)) return { module: 'diagnosis' }
  if (/\b(medikation|medikament[a-z]*|medication[s]?|pharmaco[a-z]*|pharmako[a-z]*)\b/.test(stripped)) {
    return { module: 'medication' }
  }
  if (/\b(labor[a-z]*|laborator[a-z]*|labs?)\b/.test(stripped)) return { module: 'lab' }
  if (/\b(suizid[a-z]*|risiko[a-z]*|risk|suicid[a-z]*)\b/.test(stripped)) return { module: 'risk' }
  if (/^(history|anamnesis)\b/.test(stripped)) return { module: 'anamnese' }
  return null
}

/**
 * Classify a heading line into a target module, recording whether the match was
 * exact (dictionary / user alias) or fuzzy (word family). Profile aliases are
 * consulted first so a user can override / extend the base dictionary.
 */
function classifyHeading(
  raw: string,
  aliasMap?: Map<string, HeadingMapping>,
): HeadingClassification | null {
  const norm = normalizeHeading(raw)
  const stripped = norm.replace(/^\d+\s*[).-]?\s*/, '')

  if (aliasMap) {
    if (aliasMap.has(norm)) return { mapping: aliasMap.get(norm)!, match: 'exact' }
    if (aliasMap.has(stripped)) return { mapping: aliasMap.get(stripped)!, match: 'exact' }
  }

  if (HEADING_MAP[norm]) return { mapping: HEADING_MAP[norm], match: 'exact' }
  // Allow "Anamnese:" style or "1. Anamnese" prefixes by trying the trailing token group.
  if (HEADING_MAP[stripped]) return { mapping: HEADING_MAP[stripped], match: 'exact' }

  // A heading may carry an embedded date ("Clinical Course 14.03.2024").
  const date = findGermanDateInText(raw)
  if (date) {
    const withoutDate = normalizeHeading(raw.replace(date.raw, ' '))
    const withoutDateStripped = withoutDate.replace(/^\d+\s*[).-]?\s*/, '')
    if (aliasMap?.has(withoutDateStripped)) {
      return { mapping: aliasMap.get(withoutDateStripped)!, match: 'exact' }
    }
    if (HEADING_MAP[withoutDateStripped]) {
      return { mapping: HEADING_MAP[withoutDateStripped], match: 'exact' }
    }
  }

  const fuzzy = fuzzyHeading(stripped)
  if (fuzzy) return { mapping: fuzzy, match: 'fuzzy' }
  return null
}

function lookupHeading(raw: string, aliasMap?: Map<string, HeadingMapping>): HeadingMapping | null {
  return classifyHeading(raw, aliasMap)?.mapping ?? null
}

/** True when a line is a content label inside an ongoing Verlauf block, not a new section. */
function isNestedContentInVerlauf(line: string, parentModule: CandidateModule | null): boolean {
  if (parentModule !== 'verlauf') return false

  const trimmed = line.trim()
  const norm = normalizeHeading(trimmed).replace(/^\d+\s*[).-]?\s*/, '')

  if (
    /^(procedere|sporttherapie|diagnose|diagnosen|therapie|medikation|medikamente|befund|plan|beurteilung|risiko|somatik)\b/.test(
      norm,
    )
  ) {
    return true
  }

  const classification = classifyHeading(trimmed)
  if (classification) {
    if (
      classification.mapping.module === 'therapy' ||
      classification.mapping.module === 'diagnosis' ||
      classification.mapping.module === 'medication'
    ) {
      return true
    }
    if (/\b(visite|tagesbericht|ward round)\b/.test(norm)) return true
  }

  if (trimmed.endsWith(':') && trimmed.split(/\s+/).length <= 4) {
    if (/^(procedere|sporttherapie|diagnose|diagnosen|therapie|medikation|befund|plan)\b/.test(norm)) {
      return true
    }
  }

  return false
}

function shouldStartNewSection(
  line: string,
  parentModule: CandidateModule | null,
  aliasMap?: Map<string, HeadingMapping>,
): boolean {
  if (!isHeadingLine(line, aliasMap)) return false
  if (isNestedContentInVerlauf(line, parentModule)) return false
  return true
}

function sectionHeadingModule(raw: string, aliasMap?: Map<string, HeadingMapping>): CandidateModule | null {
  return lookupHeading(raw, aliasMap)?.module ?? null
}

/**
 * True when a line is likely a heading (known clinical heading or short
 * colon/markdown label).
 *
 * Two guards keep this robust across clinic formats:
 *  - Exact dictionary/alias hits tolerate fairly long lines (mammoth can flatten
 *    a whole table cell onto one paragraph) but must not end like a sentence.
 *  - Fuzzy word-family hits must be SHORT and heading-shaped, so a narrative
 *    single-column sentence that merely contains "Anamnese"/"Verlauf" is not
 *    mistaken for a section heading.
 */
function isHeadingLine(line: string, aliasMap?: Map<string, HeadingMapping>): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  const words = trimmed.split(/\s+/)
  const classification = classifyHeading(trimmed, aliasMap)
  if (classification) {
    if (/[.!?]$/.test(trimmed)) return false
    if (classification.match === 'fuzzy') {
      return words.length <= 8 && trimmed.length <= 80
    }
    return trimmed.length <= 240 && words.length <= 32
  }
  if (trimmed.startsWith('#')) return true
  if (trimmed.endsWith(':') && words.length <= 6 && trimmed.length <= 60) return true
  return false
}

/**
 * Optional per-user parser-profile overrides applied ABOVE the base parser. The
 * base behaviour is unchanged when no options are supplied.
 */
export interface SectionizeOptions {
  /** Per-user heading aliases that extend / override the base dictionary. */
  headingAliases?: HeadingAlias[]
  /** Bias date association in course sections toward a known layout. */
  dateLocation?: DateLocationHint
}

/**
 * Split flat text into sections by heading lines. Text before the first heading
 * is captured under a synthetic empty heading so nothing is lost.
 */
export function sectionizeClinicalText(text: string, options: SectionizeOptions = {}): TextSection[] {
  const aliasMap = buildAliasMap(options.headingAliases)
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const sections: TextSection[] = []
  let current: TextSection | null = null
  let preamble: string[] = []
  let pendingDateLine: string | null = null
  let parentModule: CandidateModule | null = null

  const nextMeaningfulLineIsHeading = (fromIndex: number): boolean => {
    for (let i = fromIndex + 1; i < lines.length; i += 1) {
      if (!lines[i].trim()) continue
      return shouldStartNewSection(lines[i], parentModule, aliasMap)
    }
    return false
  }

  lines.forEach((line, index) => {
    if (shouldStartNewSection(line, parentModule, aliasMap)) {
      if (current) {
        current.body = current.body.replace(/\s+$/, '')
        sections.push(current)
      } else if (preamble.join('').trim()) {
        sections.push({ heading: '', body: preamble.join('\n').trim(), lineNumber: 1 })
      }
      preamble = []
      const heading = line.replace(/^#+\s*/, '').replace(/:\s*$/, '').trim()
      parentModule = sectionHeadingModule(heading, aliasMap)
      current = {
        heading,
        body: pendingDateLine ?? '',
        lineNumber: index + 1,
      }
      pendingDateLine = null
    } else if (isDateOnlyLine(line) && nextMeaningfulLineIsHeading(index)) {
      pendingDateLine = line.trim()
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line
    } else {
      preamble.push(line)
    }
  })

  if (current) {
    ;(current as TextSection).body = (current as TextSection).body.replace(/\s+$/, '')
    sections.push(current)
  } else if (preamble.join('').trim()) {
    sections.push({ heading: '', body: preamble.join('\n').trim(), lineNumber: 1 })
  }

  return sections.filter((s) => s.body.trim().length > 0 || s.heading.length > 0)
}

// ---------------------------------------------------------------------------
// Line-level parsers for structured-ish content under a heading
// ---------------------------------------------------------------------------

const ICD_RE = /^([A-Z]\d{1,2}(?:\.\d{1,2})?[A-Z]?)\b[\s:.\-–]*(.*)$/

export function parseDiagnosisLine(line: string): { icd10Code?: string; label: string } | null {
  const trimmed = line.replace(/^[-*•\d.)\s]+/, '').trim()
  if (!trimmed) return null
  const m = ICD_RE.exec(trimmed)
  if (m && m[2].trim()) return { icd10Code: m[1], label: m[2].trim() }
  if (m && !m[2].trim()) return { icd10Code: m[1], label: m[1] }
  return { label: trimmed }
}

const LAB_RE = /^([A-Za-zÄÖÜäöü0-9 ()\-/]+?)[\s:]+(-?\d+[.,]?\d*)\s*([A-Za-zµ%/^0-9·]+)?\s*(?:\(([^)]*)\))?$/

export function parseLabLine(
  line: string,
): { name: string; value: string; unit?: string; refText?: string } | null {
  const trimmed = line.replace(/^[-*•\s]+/, '').trim()
  if (!trimmed) return null
  const m = LAB_RE.exec(trimmed)
  if (!m) return null
  const name = m[1].trim()
  if (!name) return null
  return {
    name,
    value: m[2].replace(',', '.'),
    unit: m[3]?.trim() || undefined,
    refText: m[4]?.trim() || undefined,
  }
}

export function parseMedicationLine(line: string): ParsedMedicationLine | null {
  return parseMedicationLineFromExtraction(line)
}

function nonEmptyLines(body: string): { text: string; offset: number }[] {
  const out: { text: string; offset: number }[] = []
  body.split('\n').forEach((line, idx) => {
    if (line.trim().length > 0) out.push({ text: line.trim(), offset: idx })
  })
  return out
}

/**
 * Build clinical-course candidates (verlauf/therapy) from a section body, using
 * left-column / leading-line date association. When the section contains no date
 * markers at all, the whole body is kept as one undated candidate (no false
 * clarification). When some entries carry dates but others do not, the dateless
 * entries are flagged for clinician clarification.
 */
function buildCourseCandidates(
  module: 'verlauf' | 'therapy' | 'complementaryTherapy',
  heading: string,
  section: TextSection,
  body: string,
  baseLocation: ImportSourceLocation,
  dateLocation?: DateLocationHint,
  therapyTypeId?: string,
  sectionSubheading?: string,
): ClinicalImportCandidate[] {
  const visiteSection = heading ? parseVisiteMitHeading(heading) : null
  const sectionLabel = visiteSection?.sectionLabel ?? (heading || undefined)
  const inheritedSubheading = visiteSection?.subheading ?? sectionSubheading

  const entries = splitDatedEntries(body, { dateLocation }).filter((e) => e.text.trim().length > 0)
  const hasDates = entries.some((e) => e.raw)
  const sectionDate = heading ? findGermanDateInText(heading) : null

  const build = (
    text: string,
    location: ImportSourceLocation,
    rawText: string,
    date: string | undefined,
    clarifications: ImportClarification[],
  ): ClinicalImportCandidate => {
    const normalizedText = normalizeVerlaufText(text)
    const visiteEntry = module === 'verlauf' ? extractVisiteFromEntryText(normalizedText) : null
    const entryText = visiteEntry?.text ?? normalizedText
    const entrySectionLabel = visiteEntry?.sectionLabel ?? sectionLabel
    const entrySubheading = visiteEntry?.subheading ?? inheritedSubheading
    const confidence = date ? 'high' : 'medium'
    if (module === 'complementaryTherapy') {
      return makeCandidate({
        module: 'complementaryTherapy',
        confidence,
        sourceLocation: location,
        rawText,
        clarifications,
        data: { therapyTypeId: therapyTypeId ?? 'ergotherapie', text: entryText, date },
      })
    }
    if (module === 'therapy') {
      return makeCandidate({
        module: 'therapy',
        confidence,
        sourceLocation: location,
        rawText,
        clarifications,
        data: { title: heading || 'Therapie und Verlauf', text: entryText, date },
      })
    }
    return makeCandidate({
      module: 'verlauf',
      confidence,
      sourceLocation: location,
      rawText,
      clarifications,
      data: {
        text: entryText,
        sectionLabel: entrySectionLabel || undefined,
        subheading: entrySubheading || undefined,
        date,
      },
    })
  }

  if (!hasDates || entries.length === 0) {
    if (sectionDate) {
      const clarifications = sectionDate.iso ? [] : [DATE_UNPARSED_CLARIFICATION(sectionDate.raw)]
      return [build(body, baseLocation, `${sectionDate.raw} ${body}`.trim(), sectionDate.iso, clarifications)]
    }
    return [build(body, baseLocation, body, undefined, [])]
  }

  return entries.map((entry, index) => {
    const inheritedSectionDate = !entry.raw && index === 0 ? sectionDate : null
    const { date, clarifications } = inheritedSectionDate
      ? {
          date: inheritedSectionDate.iso,
          clarifications: inheritedSectionDate.iso ? [] : [DATE_UNPARSED_CLARIFICATION(inheritedSectionDate.raw)],
        }
      : entryDate(entry)
    const location: ImportSourceLocation = {
      section: heading || undefined,
      lineNumber: section.lineNumber + entry.lineOffset,
    }
    const rawText = entry.raw
      ? `${entry.raw} ${entry.text}`.trim()
      : inheritedSectionDate
        ? `${inheritedSectionDate.raw} ${entry.text}`.trim()
        : entry.text
    return build(entry.text, location, rawText, date, clarifications)
  })
}

/**
 * Map one heading section to candidates. Falls back to a single document/anamnese
 * candidate when line-level parsing does not apply.
 */
export function mapSectionToCandidates(
  section: TextSection,
  options: SectionizeOptions = {},
): ClinicalImportCandidate[] {
  const heading = section.heading.trim()
  const body = section.body.trim()
  if (!body) return []

  const aliasMap = buildAliasMap(options.headingAliases)
  const mapping = heading ? lookupHeading(heading, aliasMap) : null
  const baseLocation: ImportSourceLocation = {
    section: heading || undefined,
    lineNumber: section.lineNumber,
  }

  // No recognised heading → keep the whole block as a document candidate so the
  // clinician can still file it manually, and flag the uncertain mapping.
  if (!mapping) {
    return [
      makeCandidate({
        module: 'document',
        confidence: 'low',
        sourceLocation: baseLocation,
        rawText: body,
        clarifications: [
          {
            field: 'module',
            code: 'mapping_uncertain',
            message: 'Abschnitt konnte keinem klinischen Modul sicher zugeordnet werden – bitte zuordnen.',
          },
        ],
        data: { title: heading || 'Importierter Abschnitt', text: body },
      }),
    ]
  }

  switch (mapping.module) {
    case 'diagnosis': {
      const diagnoses = nonEmptyLines(body)
        .map((line) => ({ parsed: parseDiagnosisLine(line.text), raw: line.text }))
        .filter((x): x is { parsed: NonNullable<ReturnType<typeof parseDiagnosisLine>>; raw: string } => x.parsed !== null)
      if (diagnoses.length === 0) break
      return diagnoses.map((d) =>
        makeCandidate({
          module: 'diagnosis',
          confidence: d.parsed.icd10Code ? 'high' : 'medium',
          sourceLocation: baseLocation,
          rawText: d.raw,
          data: { label: d.parsed.label, icd10Code: d.parsed.icd10Code },
        }),
      )
    }
    case 'medication': {
      const meds = nonEmptyLines(body)
        .map((line) => ({ parsed: parseMedicationLine(line.text), raw: line.text }))
        .filter((x): x is { parsed: NonNullable<ReturnType<typeof parseMedicationLine>>; raw: string } => x.parsed !== null)
      if (meds.length === 0) break
      return meds.map((mLine) =>
        parsedMedicationToCandidate(mLine.parsed, mLine.raw, baseLocation),
      )
    }
    case 'lab': {
      const values = nonEmptyLines(body)
        .map((line) => parseLabLine(line.text))
        .filter((v): v is NonNullable<typeof v> => v !== null)
      if (values.length > 0) {
        return [
          makeCandidate({
            module: 'lab',
            confidence: 'high',
            sourceLocation: baseLocation,
            rawText: body,
            data: { panelLabel: heading || 'Labor', values },
          }),
        ]
      }
      // Unparseable lab block → keep as investigation text so nothing is dropped.
      return [
        makeCandidate({
          module: 'investigation',
          confidence: 'low',
          sourceLocation: baseLocation,
          rawText: body,
          data: { title: heading || 'Labor', text: body, examType: 'labor' },
        }),
      ]
    }
    case 'investigation':
      return [
        makeCandidate({
          module: 'investigation',
          confidence: 'medium',
          sourceLocation: baseLocation,
          rawText: body,
          data: { title: heading, text: body, examType: normalizeHeading(heading) },
        }),
      ]
    case 'therapy':
      return buildCourseCandidates('therapy', heading, section, body, baseLocation, options.dateLocation)
    case 'complementaryTherapy':
      return buildCourseCandidates(
        'complementaryTherapy',
        heading,
        section,
        body,
        baseLocation,
        options.dateLocation,
        mapping.therapyTypeId,
      )
    case 'verlauf':
      return buildCourseCandidates('verlauf', heading, section, body, baseLocation, options.dateLocation)
    case 'risk':
      return [
        makeCandidate({
          module: 'risk',
          confidence: 'medium',
          sourceLocation: baseLocation,
          rawText: body,
          data: { text: body, category: mapping.sectionId },
        }),
      ]
    case 'anamnese':
    default:
      return [
        makeCandidate({
          module: 'anamnese',
          confidence: 'medium',
          sourceLocation: baseLocation,
          rawText: body,
          data: { sectionId: mapping.sectionId, title: heading || 'Anamnese', text: body },
        }),
      ]
  }

  // Fallthrough for `break`ed structured cases → file as anamnese/document text.
  return [
    makeCandidate({
      module: 'document',
      confidence: 'low',
      sourceLocation: baseLocation,
      rawText: body,
      data: { title: heading || 'Importierter Abschnitt', text: body },
    }),
  ]
}
