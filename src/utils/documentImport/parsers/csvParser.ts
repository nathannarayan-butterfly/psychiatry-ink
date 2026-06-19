/**
 * CSV/TSV adapter — parses delimited text into a `TabularTable`, auto-detects a
 * column mapping, and produces candidates. Returns the table + mapping so the
 * review screen can offer column re-mapping.
 */
// Use the browser ESM build (self-contained, ships its own Buffer shim). The
// default `csv-parse/sync` entry resolves to the Node build, which references the
// Node `Buffer` global at module top-level and throws `ReferenceError: Buffer is
// not defined` the moment it loads in the browser — crashing the whole app to a
// blank page because this parser sits in the eager import graph.
import { parse } from 'csv-parse/browser/esm/sync'
import {
  autoDetectMapping,
  tabularToCandidates,
  type AutoDetectOptions,
  type ColumnMapping,
  type TabularTable,
} from '../tabular'
import { readText } from '../fileIo'
import { buildPreview, notice, type AdapterResult } from './adapterResult'

export interface TabularAdapterResult extends AdapterResult {
  table: TabularTable
  mapping: ColumnMapping
}

function detectDelimiter(sample: string): string {
  const line = sample.split(/\r?\n/)[0] ?? ''
  const counts: Record<string, number> = {
    ',': (line.match(/,/g) ?? []).length,
    ';': (line.match(/;/g) ?? []).length,
    '\t': (line.match(/\t/g) ?? []).length,
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

export function parseCsvText(text: string, options: AutoDetectOptions = {}): TabularAdapterResult {
  const trimmed = text.replace(/^\uFEFF/, '')
  const emptyTable: TabularTable = { headers: [], rows: [] }
  if (!trimmed.trim()) {
    return {
      candidates: [],
      notices: [notice('error', 'csv_empty', 'Die CSV-Datei ist leer.')],
      parsingMode: 'structured',
      table: emptyTable,
      mapping: { module: 'document', columns: {} },
    }
  }

  let records: string[][]
  try {
    records = parse(trimmed, {
      delimiter: detectDelimiter(trimmed),
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      trim: true,
    }) as string[][]
  } catch (error) {
    return {
      candidates: [],
      notices: [
        notice(
          'error',
          'csv_invalid',
          `CSV konnte nicht gelesen werden: ${error instanceof Error ? error.message : 'Fehler'}`,
        ),
      ],
      parsingMode: 'structured',
      table: emptyTable,
      mapping: { module: 'document', columns: {} },
    }
  }

  if (records.length === 0) {
    return {
      candidates: [],
      notices: [notice('warning', 'csv_no_rows', 'Keine Zeilen in der CSV-Datei.')],
      parsingMode: 'structured',
      table: emptyTable,
      mapping: { module: 'document', columns: {} },
    }
  }

  const headers = records[0].map((h) => h.trim())
  const rows = records.slice(1)
  const table: TabularTable = { headers, rows }
  const mapping = autoDetectMapping(headers, options)
  const { candidates, notices } = tabularToCandidates(table, mapping)

  return {
    candidates,
    notices,
    parsingMode: 'structured',
    rawPreview: buildPreview(trimmed),
    sourceExtra: { columns: headers },
    table,
    mapping,
  }
}

export async function parseCsvFile(
  file: File,
  options: AutoDetectOptions = {},
): Promise<TabularAdapterResult> {
  return parseCsvText(await readText(file), options)
}
