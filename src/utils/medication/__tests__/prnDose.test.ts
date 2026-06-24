import { describe, expect, it } from 'vitest'
import {
  formatPrnScheduleGerman,
  parseLegacyPrnDoseText,
  prnMaxSingleExceedsDaily,
} from '../prnDose'

describe('formatPrnScheduleGerman', () => {
  it('formats basis dose with bei Bedarf', () => {
    expect(
      formatPrnScheduleGerman({
        morning: '',
        noon: '',
        evening: '',
        night: '',
        unit: 'mg',
        prnBasisDose: '40',
      }),
    ).toBe('40 mg bei Bedarf')
  })

  it('formats basis with max daily dose', () => {
    expect(
      formatPrnScheduleGerman({
        morning: '',
        noon: '',
        evening: '',
        night: '',
        unit: 'mg',
        prnBasisDose: '40',
        prnMaxDailyDose: '120',
      }),
    ).toBe('40 mg bei Bedarf (max. 120 mg/24 h)')
  })

  it('formats all three PRN limits', () => {
    expect(
      formatPrnScheduleGerman({
        morning: '',
        noon: '',
        evening: '',
        night: '',
        unit: 'mg',
        prnBasisDose: '40',
        prnMaxSingleDose: '80',
        prnMaxDailyDose: '120',
      }),
    ).toBe('40 mg bei Bedarf (max. Einzeldosis 80 mg, max. 120 mg/24 h)')
  })

  it('falls back to legacy morning text when no structured fields', () => {
    expect(
      formatPrnScheduleGerman({
        morning: '1-2 Tbl. bei Bedarf',
        noon: '',
        evening: '',
        night: '',
        unit: 'Stk.',
      }),
    ).toBe('1-2 Tbl. bei Bedarf')
  })
})

describe('parseLegacyPrnDoseText', () => {
  it('parses bis zu max daily pattern', () => {
    expect(parseLegacyPrnDoseText('40 mg bis zu 120 mg/24 h')).toEqual({
      prnBasisDose: '40',
      prnMaxSingleDose: '',
      prnMaxDailyDose: '120',
    })
  })

  it('parses bei Bedarf with max daily in parentheses', () => {
    expect(parseLegacyPrnDoseText('1 mg bei Bedarf (max. 2 mg/24 h)')).toEqual({
      prnBasisDose: '1',
      prnMaxSingleDose: '',
      prnMaxDailyDose: '2',
    })
  })

  it('returns empty for unparseable legacy text', () => {
    expect(parseLegacyPrnDoseText('1-2 Tbl. bei Bedarf')).toEqual({
      prnBasisDose: '',
      prnMaxSingleDose: '',
      prnMaxDailyDose: '',
    })
  })
})

describe('prnMaxSingleExceedsDaily', () => {
  it('detects when max single exceeds max daily', () => {
    expect(
      prnMaxSingleExceedsDaily({
        morning: '',
        noon: '',
        evening: '',
        night: '',
        unit: 'mg',
        prnMaxSingleDose: '150',
        prnMaxDailyDose: '120',
      }),
    ).toBe(true)
  })

  it('allows equal max single and max daily', () => {
    expect(
      prnMaxSingleExceedsDaily({
        morning: '',
        noon: '',
        evening: '',
        night: '',
        unit: 'mg',
        prnMaxSingleDose: '120',
        prnMaxDailyDose: '120',
      }),
    ).toBe(false)
  })
})
