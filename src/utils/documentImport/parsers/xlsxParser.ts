/**
 * XLSX adapter — parses the first non-empty sheet into a `TabularTable`,
 * auto-detects a column mapping, and produces candidates. Returns the table +
 * mapping (and all sheet names) so the review screen can offer column re-mapping.
 *
 * Only the first data-bearing sheet is mapped to candidates by default; the full
 * sheet list is surfaced as source metadata.
 *
 * Uses ExcelJS instead of SheetJS/xlsx: xlsx@0.18.5 (the last npm release) ships
 * known prototype-pollution + ReDoS advisories with no patched npm version, so
 * the spreadsheet parser was migrated to the actively-maintained `exceljs`.
 */
import ExcelJS from 'exceljs'
import {
  autoDetectMapping,
  tabularToCandidates,
  type AutoDetectOptions,
  type TabularTable,
} from '../tabular'
import { readArrayBuffer } from '../fileIo'
import { notice } from './adapterResult'
import type { TabularAdapterResult } from './csvParser'

/**
 * Hard cap on workbook size to bound parser memory/CPU (defense-in-depth against
 * decompression-bomb style inputs). Workbooks above this are rejected.
 */
const MAX_XLSX_BYTES = 20 * 1024 * 1024 // 20 MB

/** Coerce any ExcelJS cell value into a trimmed display string. */
function cellToString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (Array.isArray(obj.richText)) {
      return obj.richText.map((part) => String((part as { text?: unknown }).text ?? '')).join('').trim()
    }
    if ('result' in obj) return cellToString(obj.result)
    if ('text' in obj) return String(obj.text ?? '').trim()
    if ('hyperlink' in obj) return String(obj.hyperlink ?? '').trim()
    if ('formula' in obj) return ''
    if ('error' in obj) return ''
  }
  return String(value).trim()
}

function worksheetToMatrix(worksheet: ExcelJS.Worksheet): string[][] {
  const rowCount = worksheet.rowCount
  const colCount = worksheet.columnCount
  const matrix: string[][] = []
  for (let r = 1; r <= rowCount; r += 1) {
    const row = worksheet.getRow(r)
    const cells: string[] = []
    for (let c = 1; c <= colCount; c += 1) {
      cells.push(cellToString(row.getCell(c).value))
    }
    matrix.push(cells)
  }
  return matrix
}

export async function parseXlsxBuffer(
  buffer: ArrayBuffer,
  options: AutoDetectOptions = {},
): Promise<TabularAdapterResult> {
  const emptyTable: TabularTable = { headers: [], rows: [] }

  if (buffer.byteLength > MAX_XLSX_BYTES) {
    return {
      candidates: [],
      notices: [
        notice(
          'error',
          'xlsx_too_large',
          `XLSX-Datei ist zu groß (max. ${Math.round(MAX_XLSX_BYTES / (1024 * 1024))} MB).`,
        ),
      ],
      parsingMode: 'structured',
      table: emptyTable,
      mapping: { module: 'document', columns: {} },
    }
  }

  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(buffer)
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

  const sheetNames = workbook.worksheets.map((ws) => ws.name)
  let table: TabularTable | null = null
  for (const worksheet of workbook.worksheets) {
    const matrix = worksheetToMatrix(worksheet)
    const dataRows = matrix.filter((row) => row.some((c) => c.trim().length > 0))
    if (dataRows.length >= 2) {
      table = { headers: dataRows[0], rows: dataRows.slice(1), sheetName: worksheet.name }
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

  const mapping = autoDetectMapping(table.headers, options)
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

export async function parseXlsxFile(
  file: File,
  options: AutoDetectOptions = {},
): Promise<TabularAdapterResult> {
  return parseXlsxBuffer(await readArrayBuffer(file), options)
}
