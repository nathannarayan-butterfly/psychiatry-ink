import { describe, expect, it } from 'vitest'
import { createDemoClinicalData, EMPTY_CLINICAL_DATA } from '../clinicalData'
import { bindingToText, evaluateCondition, institutionValue, patientDataValue } from '../bindingEval'
import type { ConditionalBlock } from '../../../types/clinicalTemplate'

const demo = createDemoClinicalData('de')

describe('bindingToText', () => {
  it('renders diagnoses with codes', () => {
    const text = bindingToText('diagnoses.current', demo)
    expect(text).toContain('F33.2')
    expect(text).toContain('F41.1')
  })

  it('marks PRN medication', () => {
    const text = bindingToText('medication.current', demo)
    expect(text).toContain('Sertralin')
    expect(text).toContain('b.B.')
  })

  it('aggregates all domains for "all"', () => {
    const text = bindingToText('all', demo)
    expect(text).toContain('Diagnosen:')
    expect(text).toContain('Medikation:')
    expect(text).toContain('Risiko:')
  })

  it('returns empty string for empty data', () => {
    expect(bindingToText('diagnoses.current', EMPTY_CLINICAL_DATA)).toBe('')
  })
})

describe('placeholder value resolvers', () => {
  it('resolves patient fields', () => {
    expect(patientDataValue('name', demo)).toBe('Muster, Maria')
    expect(patientDataValue('age', demo)).toBe('39 J.')
  })

  it('resolves institution + system fields', () => {
    expect(institutionValue('clinician.name', demo)).toContain('Beispiel')
    expect(institutionValue('system.date', demo)).toBe(demo.system.date)
  })
})

describe('evaluateCondition', () => {
  const make = (condition: ConditionalBlock['condition']): ConditionalBlock => ({
    id: 'c1',
    type: 'conditional',
    condition,
    children: [],
  })

  it('exists is true when binding has data', () => {
    expect(evaluateCondition(make({ source: 'medication.current', operator: 'exists' }), demo)).toBe(true)
  })

  it('not_exists is true on empty data', () => {
    expect(evaluateCondition(make({ source: 'risk.current', operator: 'not_exists' }), EMPTY_CLINICAL_DATA)).toBe(true)
  })

  it('contains matches substring case-insensitively', () => {
    expect(evaluateCondition(make({ source: 'diagnoses.current', operator: 'contains', value: 'f33' }), demo)).toBe(true)
    expect(evaluateCondition(make({ source: 'diagnoses.current', operator: 'contains', value: 'xyz' }), demo)).toBe(false)
  })

  it('manual source reads the block value', () => {
    const block = make({ source: 'manual', operator: 'exists' })
    expect(evaluateCondition(block, demo, { [block.id]: 'yes' })).toBe(true)
    expect(evaluateCondition(block, demo, {})).toBe(false)
  })
})
