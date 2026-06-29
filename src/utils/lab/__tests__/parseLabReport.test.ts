import { describe, expect, it } from 'vitest'
import { parseLabReport } from '../parseLabReport'

describe('parseLabReport', () => {
  it('parses parameter, value, unit and reference range per line', () => {
    const values = parseLabReport('Natrium 140 mmol/l (135-145)')
    expect(values).toHaveLength(1)
    expect(values[0]).toMatchObject({
      parameter: 'Natrium',
      value: 140,
      unit: 'mmol/l',
      referenceLow: 135,
      referenceHigh: 145,
    })
  })

  it('handles a colon separator and German decimal comma', () => {
    const values = parseLabReport('CRP: 5,2 mg/l')
    expect(values[0]).toMatchObject({ parameter: 'CRP', value: 5.2, unit: 'mg/l' })
  })

  it('parses a multi-line report and skips non-value lines', () => {
    const report = [
      'Laborbefund 01.02.2024',
      'Hb 13.5 g/dl (12-16)',
      'Leukozyten 7.2 /nl',
      'Kommentar: unauffällig',
    ].join('\n')
    const values = parseLabReport(report)
    const params = values.map((v) => v.parameter)
    expect(params).toContain('Hb')
    expect(params).toContain('Leukozyten')
    expect(params).not.toContain('Kommentar')
  })

  it('dedupes identical parameter/value pairs', () => {
    const values = parseLabReport('Kalium 4.0 mmol/l\nKalium 4.0 mmol/l')
    expect(values).toHaveLength(1)
  })
})
