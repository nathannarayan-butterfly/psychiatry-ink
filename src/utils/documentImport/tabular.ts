/**
 * Tabular (CSV/XLSX) → candidates engine.
 *
 * Both the CSV and XLSX adapters parse their file into a `TabularTable`, then use
 * `autoDetectMapping` + `tabularToCandidates` to produce an initial set of
 * candidates. The Import Review screen keeps the table + mapping in memory so the
 * clinician can adjust the column mapping and recompute candidates before saving.
 */
import type {
  CandidateModule,
  ClinicalImportCandidate,
  ImportClarification,
  ImportNotice,
} from '../../schemas/documentImport/envelope'
import { makeCandidate } from './candidateFactory'
import { parseGermanDate } from './dateAssociation'
import { notice } from './parsers/adapterResult'

export interface TabularTable {
  headers: string[]
  rows: string[][]
  sheetName?: string
}

/** Target fields a column can be mapped to, per module. */
export const TABULAR_FIELDS = [
  // diagnosis
  'label',
  'icd10Code',
  // medication
  'substance',
  'strength',
  'doseText',
  'indication',
  'status',
  // lab
  'name',
  'value',
  'unit',
  'refText',
  'date',
  'panelLabel',
  // generic text
  'title',
  'text',
] as const

export type TabularField = (typeof TABULAR_FIELDS)[number]

export interface ColumnMapping {
  module: CandidateModule
  /** field → column index into `headers`/`rows[*]`. */
  columns: Partial<Record<TabularField, number>>
}

const HEADER_SYNONYMS: Record<string, { module: CandidateModule; field: TabularField }> = {
  // diagnosis
  icd10: { module: 'diagnosis', field: 'icd10Code' },
  'icd-10': { module: 'diagnosis', field: 'icd10Code' },
  icd: { module: 'diagnosis', field: 'icd10Code' },
  code: { module: 'diagnosis', field: 'icd10Code' },
  diagnose: { module: 'diagnosis', field: 'label' },
  diagnosis: { module: 'diagnosis', field: 'label' },
  bezeichnung: { module: 'diagnosis', field: 'label' },
  // medication
  substance: { module: 'medication', field: 'substance' },
  wirkstoff: { module: 'medication', field: 'substance' },
  medikament: { module: 'medication', field: 'substance' },
  medication: { module: 'medication', field: 'substance' },
  drug: { module: 'medication', field: 'substance' },
  strength: { module: 'medication', field: 'strength' },
  staerke: { module: 'medication', field: 'strength' },
  dosis: { module: 'medication', field: 'strength' },
  dose: { module: 'medication', field: 'doseText' },
  dosierung: { module: 'medication', field: 'doseText' },
  einnahme: { module: 'medication', field: 'doseText' },
  schedule: { module: 'medication', field: 'doseText' },
  indikation: { module: 'medication', field: 'indication' },
  indication: { module: 'medication', field: 'indication' },
  status: { module: 'medication', field: 'status' },
  // lab
  parameter: { module: 'lab', field: 'name' },
  analyt: { module: 'lab', field: 'name' },
  analyte: { module: 'lab', field: 'name' },
  wert: { module: 'lab', field: 'value' },
  value: { module: 'lab', field: 'value' },
  result: { module: 'lab', field: 'value' },
  einheit: { module: 'lab', field: 'unit' },
  unit: { module: 'lab', field: 'unit' },
  referenz: { module: 'lab', field: 'refText' },
  reference: { module: 'lab', field: 'refText' },
  normwert: { module: 'lab', field: 'refText' },
  datum: { module: 'lab', field: 'date' },
  date: { module: 'lab', field: 'date' },
  // verlauf / clinical course (date in a separate column from the note text)
  verlauf: { module: 'verlauf', field: 'text' },
  verlaufsdokumentation: { module: 'verlauf', field: 'text' },
  verlaufdocumentation: { module: 'verlauf', field: 'text' },
  verlaufseintrag: { module: 'verlauf', field: 'text' },
  eintrag: { module: 'verlauf', field: 'text' },
  dokumentation: { module: 'verlauf', field: 'text' },
  fortschritt: { module: 'verlauf', field: 'text' },
  tagesverlauf: { module: 'verlauf', field: 'text' },
  clinicalcourse: { module: 'verlauf', field: 'text' },
  course: { module: 'verlauf', field: 'text' },
  notiz: { module: 'verlauf', field: 'text' },
  note: { module: 'verlauf', field: 'text' },
  verlaufsnotiz: { module: 'verlauf', field: 'text' },
  beobachtung: { module: 'verlauf', field: 'text' },
}

/** Date-column synonyms that apply to whichever module is detected (not just lab). */
const DATE_HEADER_SYNONYMS = new Set(['datum', 'date', 'tag', 'day'])

function normHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9-]/g, '')
    .trim()
}

/** A per-user column-header alias: extends the base header synonym table. */
export interface TabularColumnAlias {
  header: string
  module: CandidateModule
  field: TabularField
}

export interface AutoDetectOptions {
  /** Per-user column aliases applied ABOVE the base header synonyms. */
  columnAliases?: TabularColumnAlias[]
}

/** Auto-detect the most likely module + per-field column mapping from headers. */
export function autoDetectMapping(headers: string[], options: AutoDetectOptions = {}): ColumnMapping {
  const moduleVotes = new Map<CandidateModule, number>()
  const fieldHits: { index: number; module: CandidateModule; field: TabularField }[] = []

  const aliasMap = new Map<string, { module: CandidateModule; field: TabularField }>()
  for (const alias of options.columnAliases ?? []) {
    const key = normHeader(alias.header)
    if (key) aliasMap.set(key, { module: alias.module, field: alias.field })
  }

  headers.forEach((header, index) => {
    const key = normHeader(header)
    // User aliases win over the base synonym table.
    const hit = aliasMap.get(key) ?? HEADER_SYNONYMS[key]
    if (!hit) return
    fieldHits.push({ index, ...hit })
    moduleVotes.set(hit.module, (moduleVotes.get(hit.module) ?? 0) + 1)
  })

  let bestModule: CandidateModule = 'document'
  let bestVotes = 0
  for (const [module, votes] of moduleVotes) {
    if (votes > bestVotes) {
      bestModule = module
      bestVotes = votes
    }
  }

  // A dedicated course/note column is a strong signal: prefer verlauf even when a
  // generic date column also voted for lab.
  if (fieldHits.some((h) => h.module === 'verlauf')) bestModule = 'verlauf'

  const columns: Partial<Record<TabularField, number>> = {}
  for (const hit of fieldHits) {
    if (hit.module === bestModule && columns[hit.field] === undefined) {
      columns[hit.field] = hit.index
    }
  }

  // Bind a date column to the detected module even if its synonym voted for lab.
  if (columns.date === undefined) {
    const dateIndex = headers.findIndex((h) => DATE_HEADER_SYNONYMS.has(normHeader(h)))
    if (dateIndex >= 0) columns.date = dateIndex
  }

  return { module: bestModule, columns }
}

function cell(row: string[], index: number | undefined): string | undefined {
  if (index === undefined) return undefined
  const v = row[index]
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

/**
 * Build candidates from a table using a column mapping. For `lab` the rows are
 * grouped into a single panel candidate; other modules produce one candidate
 * per row. Unknown/`document` rows are serialised as "header: value" text.
 */
export function tabularToCandidates(
  table: TabularTable,
  mapping: ColumnMapping,
): { candidates: ClinicalImportCandidate[]; notices: ImportNotice[] } {
  const notices: ImportNotice[] = []
  const candidates: ClinicalImportCandidate[] = []
  const sheet = table.sheetName

  if (mapping.module === 'lab') {
    const values: { name: string; value: string; unit?: string; refText?: string }[] = []
    table.rows.forEach((row) => {
      const name = cell(row, mapping.columns.name)
      const value = cell(row, mapping.columns.value)
      if (name && value) {
        values.push({
          name,
          value,
          unit: cell(row, mapping.columns.unit),
          refText: cell(row, mapping.columns.refText),
        })
      }
    })
    if (values.length === 0) {
      notices.push(notice('warning', 'tabular_lab_empty', 'Keine Laborwerte (Parameter + Wert) in den Spalten erkannt.'))
    } else {
      const date = table.rows.map((r) => cell(r, mapping.columns.date)).find(Boolean)
      candidates.push(
        makeCandidate({
          module: 'lab',
          confidence: 'high',
          sourceLocation: { sheet },
          data: { date, panelLabel: sheet ?? 'Labor', values },
        }),
      )
    }
    return { candidates, notices }
  }

  table.rows.forEach((row, rowIndex) => {
    if (row.every((c) => !c || !c.trim())) return
    const loc = { sheet, row: rowIndex + 1 }
    switch (mapping.module) {
      case 'verlauf': {
        const text =
          cell(row, mapping.columns.text) ??
          table.headers
            .map((_h, i) => (i !== mapping.columns.date && cell(row, i) ? cell(row, i) : null))
            .filter(Boolean)
            .join(' — ')
        if (!text) return
        const rawDate = cell(row, mapping.columns.date)
        const iso = rawDate ? parseGermanDate(rawDate) : null
        const clarifications: ImportClarification[] = []
        if (!rawDate) {
          clarifications.push({
            field: 'date',
            code: 'date_uncertain',
            message: 'Kein Datum in dieser Zeile gefunden – bitte ergänzen.',
          })
        } else if (!iso) {
          clarifications.push({
            field: 'date',
            code: 'date_unparsed',
            message: `Datum „${rawDate}" konnte nicht eindeutig gelesen werden – bitte prüfen.`,
          })
        }
        candidates.push(
          makeCandidate({
            module: 'verlauf',
            confidence: iso ? 'high' : 'medium',
            sourceLocation: loc,
            rawText: row.join(' | '),
            clarifications,
            data: { text, date: iso ?? undefined, sectionLabel: sheet },
          }),
        )
        break
      }
      case 'diagnosis': {
        const label = cell(row, mapping.columns.label)
        const icd10Code = cell(row, mapping.columns.icd10Code)
        if (!label && !icd10Code) return
        candidates.push(
          makeCandidate({
            module: 'diagnosis',
            confidence: icd10Code ? 'high' : 'medium',
            sourceLocation: loc,
            rawText: row.join(' | '),
            data: { label: label ?? icd10Code ?? '', icd10Code },
          }),
        )
        break
      }
      case 'medication': {
        const substance = cell(row, mapping.columns.substance)
        if (!substance) return
        candidates.push(
          makeCandidate({
            module: 'medication',
            confidence: 'high',
            sourceLocation: loc,
            rawText: row.join(' | '),
            data: {
              substance,
              strength: cell(row, mapping.columns.strength),
              doseText: cell(row, mapping.columns.doseText),
              indication: cell(row, mapping.columns.indication),
              status: cell(row, mapping.columns.status),
            },
          }),
        )
        break
      }
      default: {
        // Generic: serialise the row as labelled text into a document candidate.
        const explicitTitle = cell(row, mapping.columns.title)
        const explicitText = cell(row, mapping.columns.text)
        const text =
          explicitText ??
          table.headers
            .map((h, i) => (cell(row, i) ? `${h}: ${cell(row, i)}` : null))
            .filter(Boolean)
            .join('\n')
        if (!text) return
        candidates.push(
          makeCandidate({
            module: 'document',
            confidence: 'low',
            sourceLocation: loc,
            rawText: row.join(' | '),
            data: { title: explicitTitle ?? `Zeile ${rowIndex + 1}`, text },
          }),
        )
      }
    }
  })

  if (candidates.length === 0 && notices.length === 0) {
    notices.push(notice('warning', 'tabular_no_candidates', 'Keine Datenzeilen erkannt.'))
  }

  return { candidates, notices }
}
