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
import { splitDatedEntries, type DatedEntry } from './dateAssociation'

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
}

/**
 * Normalised heading → target module. Keys are lowercased and stripped of
 * punctuation. Covers the headings named in the spec plus common German
 * synonyms and the standard aufnahme section labels.
 */
const HEADING_MAP: Record<string, HeadingMapping> = {
  // Anamnese family
  anamnese: { module: 'anamnese' },
  aufnahme: { module: 'anamnese', sectionId: 'aufnahmeanlass' },
  aufnahmeanlass: { module: 'anamnese', sectionId: 'aufnahmeanlass' },
  'aktuelle beschwerden': { module: 'anamnese', sectionId: 'aktuelle-beschwerden' },
  eigenanamnese: { module: 'anamnese', sectionId: 'eigenanamnese' },
  'aktuelle krankheitsanamnese': { module: 'anamnese', sectionId: 'aktuelle-krankheitsanamnese' },
  'psychiatrische vorgeschichte': { module: 'anamnese', sectionId: 'psychiatrische-vorgeschichte' },
  'somatische anamnese': { module: 'anamnese', sectionId: 'somatische-anamnese' },
  suchtanamnese: { module: 'anamnese', sectionId: 'suchtanamnese' },
  medikamentenanamnese: { module: 'anamnese', sectionId: 'medikamentenanamnese' },
  familienanamnese: { module: 'anamnese', sectionId: 'familienanamnese' },
  'biografische anamnese': { module: 'anamnese', sectionId: 'biografische-anamnese' },
  sozialanamnese: { module: 'anamnese', sectionId: 'sozialanamnese' },
  'schul und berufsanamnese': { module: 'anamnese', sectionId: 'schul-und-berufsanamnese' },
  'forensische anamnese': { module: 'anamnese', sectionId: 'forensische-anamnese' },
  traumaanamnese: { module: 'anamnese', sectionId: 'traumaanamnese' },
  'psychopathologischer befund': { module: 'anamnese', sectionId: 'psychopathologischer-befund' },
  'somatischer befund': { module: 'anamnese', sectionId: 'somatischer-befund' },
  vorgeschichte: { module: 'anamnese' },
  jetzige_anamnese: { module: 'anamnese' },

  // Diagnoses
  diagnosen: { module: 'diagnosis' },
  diagnose: { module: 'diagnosis' },
  diagnosis: { module: 'diagnosis' },
  diagnoses: { module: 'diagnosis' },
  'diagnostische einschatzung': { module: 'diagnosis' },

  // Medication
  medikation: { module: 'medication' },
  medikamente: { module: 'medication' },
  'aktuelle medikation': { module: 'medication' },
  medication: { module: 'medication' },
  pharmakotherapie: { module: 'medication' },

  // Laboratory
  labor: { module: 'lab' },
  laborwerte: { module: 'lab' },
  laborbefunde: { module: 'lab' },
  laboratory: { module: 'lab' },
  labs: { module: 'lab' },

  // Investigations / findings
  befunde: { module: 'investigation' },
  untersuchungsbefunde: { module: 'investigation' },
  apparative_diagnostik: { module: 'investigation' },
  ekg: { module: 'investigation' },
  eeg: { module: 'investigation' },
  bildgebung: { module: 'investigation' },

  // Therapy / course
  'therapie und verlauf': { module: 'therapy' },
  therapie: { module: 'therapy' },
  therapieverlauf: { module: 'therapy' },
  behandlungsverlauf: { module: 'therapy' },
  verlauf: { module: 'verlauf' },
  therapieplanung: { module: 'therapy' },
  behandlungsplan: { module: 'therapy' },

  // Risk / safety
  risiko: { module: 'risk' },
  risikobewertung: { module: 'risk' },
  'suizidalitat': { module: 'risk' },
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

function lookupHeading(raw: string): HeadingMapping | null {
  const norm = normalizeHeading(raw)
  if (HEADING_MAP[norm]) return HEADING_MAP[norm]
  // Allow "Anamnese:" style or "1. Anamnese" prefixes by trying the trailing token group.
  const stripped = norm.replace(/^\d+\s*[).-]?\s*/, '')
  return HEADING_MAP[stripped] ?? null
}

/** True when a line is likely a heading (known clinical heading or short colon/markdown label). */
function isHeadingLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  if (lookupHeading(trimmed)) return true
  if (trimmed.startsWith('#')) return true
  const words = trimmed.split(/\s+/)
  if (trimmed.endsWith(':') && words.length <= 6 && trimmed.length <= 60) return true
  return false
}

/**
 * Split flat text into sections by heading lines. Text before the first heading
 * is captured under a synthetic empty heading so nothing is lost.
 */
export function sectionizeClinicalText(text: string): TextSection[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const sections: TextSection[] = []
  let current: TextSection | null = null
  let preamble: string[] = []

  lines.forEach((line, index) => {
    if (isHeadingLine(line)) {
      if (current) {
        current.body = current.body.replace(/\s+$/, '')
        sections.push(current)
      } else if (preamble.join('').trim()) {
        sections.push({ heading: '', body: preamble.join('\n').trim(), lineNumber: 1 })
      }
      preamble = []
      current = {
        heading: line.replace(/^#+\s*/, '').replace(/:\s*$/, '').trim(),
        body: '',
        lineNumber: index + 1,
      }
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

const DOSE_RE = /\b(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?){1,3})\b/
const STRENGTH_RE = /\b(\d+(?:[.,]\d+)?)\s*(mg|µg|mcg|g|ml|mmol|ie|i\.e\.)\b/i

export function parseMedicationLine(
  line: string,
): { substance: string; strength?: string; doseText?: string } | null {
  const trimmed = line.replace(/^[-*•\d.)\s]+/, '').trim()
  if (!trimmed) return null
  const strengthMatch = STRENGTH_RE.exec(trimmed)
  const doseMatch = DOSE_RE.exec(trimmed)
  // Substance = text up to the first numeric token.
  const firstNum = trimmed.search(/\d/)
  const substance = (firstNum > 0 ? trimmed.slice(0, firstNum) : trimmed).trim() || trimmed
  return {
    substance,
    strength: strengthMatch ? `${strengthMatch[1]} ${strengthMatch[2]}` : undefined,
    doseText: doseMatch ? doseMatch[1].replace(/\s/g, '') : undefined,
  }
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
  module: 'verlauf' | 'therapy',
  heading: string,
  section: TextSection,
  body: string,
  baseLocation: ImportSourceLocation,
): ClinicalImportCandidate[] {
  const entries = splitDatedEntries(body).filter((e) => e.text.trim().length > 0)
  const hasDates = entries.some((e) => e.raw)

  const build = (
    text: string,
    location: ImportSourceLocation,
    rawText: string,
    date: string | undefined,
    clarifications: ImportClarification[],
  ): ClinicalImportCandidate => {
    const confidence = date ? 'high' : 'medium'
    if (module === 'therapy') {
      return makeCandidate({
        module: 'therapy',
        confidence,
        sourceLocation: location,
        rawText,
        clarifications,
        data: { title: heading || 'Therapie und Verlauf', text, date },
      })
    }
    return makeCandidate({
      module: 'verlauf',
      confidence,
      sourceLocation: location,
      rawText,
      clarifications,
      data: { text, sectionLabel: heading || undefined, date },
    })
  }

  if (!hasDates || entries.length === 0) {
    return [build(body, baseLocation, body, undefined, [])]
  }

  return entries.map((entry) => {
    const { date, clarifications } = entryDate(entry)
    const location: ImportSourceLocation = {
      section: heading || undefined,
      lineNumber: section.lineNumber + entry.lineOffset,
    }
    const rawText = entry.raw ? `${entry.raw} ${entry.text}`.trim() : entry.text
    return build(entry.text, location, rawText, date, clarifications)
  })
}

/**
 * Map one heading section to candidates. Falls back to a single document/anamnese
 * candidate when line-level parsing does not apply.
 */
export function mapSectionToCandidates(section: TextSection): ClinicalImportCandidate[] {
  const heading = section.heading.trim()
  const body = section.body.trim()
  if (!body) return []

  const mapping = heading ? lookupHeading(heading) : null
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
        makeCandidate({
          module: 'medication',
          confidence: mLine.parsed.strength || mLine.parsed.doseText ? 'high' : 'medium',
          sourceLocation: baseLocation,
          rawText: mLine.raw,
          data: {
            substance: mLine.parsed.substance,
            strength: mLine.parsed.strength,
            doseText: mLine.parsed.doseText,
          },
        }),
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
      return buildCourseCandidates('therapy', heading, section, body, baseLocation)
    case 'verlauf':
      return buildCourseCandidates('verlauf', heading, section, body, baseLocation)
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
