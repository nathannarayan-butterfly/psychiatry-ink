/**
 * XLSX (SheetJS) adapter — parses the first non-empty sheet into a `TabularTable`,
 * auto-detects a column mapping, and produces candidates. Returns the table +
 * mapping (and all sheet names) so the review screen can offer column re-mapping.
 *
 * Only the first data-bearing sheet is mapped to candidates by default; the full
 * sheet list is surfaced as source metadata.
 */
import * as XLSX from 'xlsx'
import {
  autoDetectMapping,
  tabularToCandidates,
  type TabularTable,
} from '../tabular'
import { readArrayBuffer } from '../fileIo'
import { notice } from './adapterResult'
import type { TabularAdapterResult } from './csvParser'

function sheetToMatrix(sheet: XLSX.WorkSheet): string[][] {
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false,
  })
  return matrix.map((row) => (Array.isArray(row) ? row.map((c) => String(c ?? '').trim()) : []))
}

export function parseXlsxBuffer(buffer: ArrayBuffer): TabularAdapterResult {
  const emptyTable: TabularTable = { headers: [], rows: [] }
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
  } catch (error) {
    return {
      candidates: [],
      notices: [
        notice('error', 'xlsx_invalid', `XLSX konnte nicht gelesen werden: ${error instanceof Error ? error.message : 'Fehler'}`),
      ],
      parsingMode: 'structured',
      table: emptyTable,
      mapping: { module: 'document', columns: {} },
    }
  }

  const sheetNames = workbook.SheetNames
  let table: TabularTable | null = null
  for (const name of sheetNames) {
    const matrix = sheetToMatrix(workbook.Sheets[name])
    const dataRows = matrix.filter((row) => row.some((c) => c.trim().length > 0))
    if (dataRows.length >= 2) {
      table = { headers: dataRows[0], rows: dataRows.slice(1), sheetName: name }
      break
    }
  }

  if (!table) {
    return {
      candidates: [],
      notices: [notice('warning', 'xlsx_no_data', 'Keine Datentabelle in der Arbeitsmappe gefunden.')],
      parsingMode: 'structured',
      sourceExtra: { sheetNames },
      table: emptyTable,
      mapping: { module: 'document', columns: {} },
    }
  }

  const mapping = autoDetectMapping(table.headers)
  const { candidates, notices } = tabularToCandidates(table, mapping)

  return {
    candidates,
    notices,
    parsingMode: 'structured',
    sourceExtra: { sheetNames, columns: table.headers },
    table,
    mapping,
  }
}

export async function parseXlsxFile(file: File): Promise<TabularAdapterResult> {
  return parseXlsxBuffer(await readArrayBuffer(file))
}
