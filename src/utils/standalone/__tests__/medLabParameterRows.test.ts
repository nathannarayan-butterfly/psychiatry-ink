import { describe, expect, it } from 'vitest'
import {
  buildLabValuesFromParameterRows,
  resolveLabParameterName,
} from '../../standalone/medLabCorrelation'

describe('medLab parameter rows', () => {
  it('resolves common parameter aliases', () => {
    expect(resolveLabParameterName('Kalium')).toBe('potassium')
    expect(resolveLabParameterName('QTc')).toBe('qtc')
    expect(resolveLabParameterName('Lithium-Spiegel')).toBe('lithiumLevel')
  })

  it('builds lab values from dynamic rows', () => {
    const values = buildLabValuesFromParameterRows([
      { parameter: 'K+', value: '3,1' },
      { parameter: 'QTc', value: '495' },
    ])
    expect(values.potassium).toBe(3.1)
    expect(values.qtc).toBe(495)
  })

  it('ignores unmapped parameters without throwing', () => {
    const values = buildLabValuesFromParameterRows([
      { parameter: 'CRP', value: '12' },
      { parameter: 'Na', value: '128' },
    ])
    expect(values.sodium).toBe(128)
    expect(values.potassium).toBeUndefined()
  })
})
