import { describe, expect, it } from 'vitest'
import { DISORDER_CRITERIA } from '../index'
import { formatCriterionCitation, type CriterionSource } from '../schema'

const ICD10_CODE = /^F\d{2}(\.\d+)?$/
const ICD11_CODE = /^[0-9][A-Z0-9]{2,3}(\.[A-Z0-9]+)?$/

describe('criterion source citations', () => {
  it('every authored criterion carries at least one structured source citation', () => {
    for (const disorder of DISORDER_CRITERIA) {
      for (const group of disorder.groups) {
        for (const criterion of group.criteria) {
          expect(
            criterion.citation,
            `${disorder.id} → ${criterion.id} is missing a source citation`,
          ).toBeDefined()
          expect(criterion.citation!.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('every citation names a known classification and a well-formed code', () => {
    for (const disorder of DISORDER_CRITERIA) {
      for (const group of disorder.groups) {
        for (const criterion of group.criteria) {
          for (const source of criterion.citation ?? []) {
            expect(['icd10', 'icd11']).toContain(source.classification)
            expect(source.code.length).toBeGreaterThan(0)
            if (source.classification === 'icd10') {
              expect(source.code, `${criterion.id}: ${source.code}`).toMatch(ICD10_CODE)
            } else {
              expect(source.code, `${criterion.id}: ${source.code}`).toMatch(ICD11_CODE)
            }
          }
        }
      }
    }
  })

  it('citations stay anchored to a code within their disorder family', () => {
    const alcohol = DISORDER_CRITERIA.find((d) => d.id === 'alcohol_dependence')!
    const craving = alcohol.groups[0].criteria.find((c) => c.id === 'f10_2.craving')!
    expect(craving.citation).toEqual([{ classification: 'icd10', code: 'F10.2', ref: 'a' }])
  })
})

describe('formatCriterionCitation', () => {
  it('renders a single ICD-10 citation with its criterion identifier', () => {
    const citation: CriterionSource[] = [{ classification: 'icd10', code: 'F32', ref: 'B1' }]
    expect(formatCriterionCitation(citation)).toBe('ICD-10 F32 (B1)')
  })

  it('renders a code without a ref and joins multiple sources', () => {
    const citation: CriterionSource[] = [
      { classification: 'icd10', code: 'F10.2', ref: 'a' },
      { classification: 'icd11', code: '6C40.2' },
    ]
    expect(formatCriterionCitation(citation)).toBe('ICD-10 F10.2 (a) · ICD-11 6C40.2')
  })

  it('returns an empty string when there is no citation', () => {
    expect(formatCriterionCitation(undefined)).toBe('')
    expect(formatCriterionCitation([])).toBe('')
  })
})
