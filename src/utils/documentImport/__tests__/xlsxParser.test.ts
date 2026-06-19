import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseXlsxBuffer } from '../parsers/xlsxParser'

function workbookBuffer(sheetName: string, rows: string[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

describe('parseXlsxBuffer', () => {
  it('parses the first data sheet and auto-detects a lab panel', () => {
    const buf = workbookBuffer('Labor', [
      ['Parameter', 'Wert', 'Einheit'],
      ['Natrium', '140', 'mmol/l'],
      ['Kalium', '4.1', 'mmol/l'],
    ])
    const result = parseXlsxBuffer(buf)
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

  it('detects medication columns', () => {
    const buf = workbookBuffer('Meds', [
      ['Medikament', 'Dosis'],
      ['Sertralin', '50 mg'],
    ])
    const result = parseXlsxBuffer(buf)
    expect(result.mapping.module).toBe('medication')
    expect(result.candidates).toHaveLength(1)
  })

  it('warns when the workbook has no data table', () => {
    const buf = workbookBuffer('Empty', [['only-header']])
    const result = parseXlsxBuffer(buf)
    expect(result.notices.some((n) => n.code === 'xlsx_no_data')).toBe(true)
  })
})
