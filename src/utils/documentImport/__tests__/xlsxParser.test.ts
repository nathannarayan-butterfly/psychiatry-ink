// @vitest-environment node
//
// ExcelJS round-trips workbook buffers via Node Buffer / ArrayBuffer semantics
// that jsdom's hybrid environment mangles. The parser itself is environment
// agnostic (real browsers use ExcelJS's browser bundle and behave like Node for
// this code path), so this suite runs in the node environment.
import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { parseXlsxBuffer } from '../parsers/xlsxParser'

async function workbookBuffer(sheetName: string, rows: string[][]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(sheetName)
  ws.addRows(rows)
  const buffer = await wb.xlsx.writeBuffer()
  // ExcelJS returns a Node Buffer here; normalize to a standalone ArrayBuffer.
  const view = buffer as unknown as Uint8Array
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer
}

describe('parseXlsxBuffer', () => {
  it('parses the first data sheet and auto-detects a lab panel', async () => {
    const buf = await workbookBuffer('Labor', [
      ['Parameter', 'Wert', 'Einheit'],
      ['Natrium', '140', 'mmol/l'],
      ['Kalium', '4.1', 'mmol/l'],
    ])
    const result = await parseXlsxBuffer(buf)
    expect(result.mapping.module).toBe('lab')
    expect(result.candidates).toHaveLength(1)
    const lab = result.candidates[0]
    if (lab.module === 'lab') {
      expect(lab.data.values).toHaveLength(2)
      expect(lab.data.values[0].name).toBe('Natrium')
    }
    expect(result.sourceExtra?.sheetNames).toEqual(['Labor'])
    expect(result.candidates[0].sourceLocation.sheet).toBe('Labor')
  })

  it('detects medication columns', async () => {
    const buf = await workbookBuffer('Meds', [
      ['Medikament', 'Dosis'],
      ['Sertralin', '50 mg'],
    ])
    const result = await parseXlsxBuffer(buf)
    expect(result.mapping.module).toBe('medication')
    expect(result.candidates).toHaveLength(1)
  })

  it('warns when the workbook has no data table', async () => {
    const buf = await workbookBuffer('Empty', [['only-header']])
    const result = await parseXlsxBuffer(buf)
    expect(result.notices.some((n) => n.code === 'xlsx_no_data')).toBe(true)
  })
})
