import { describe, expect, it } from 'vitest'
import { DISORDER_CRITERIA } from '../index'
import { formatCriterionCitation, type CriterionSource } from '../schema'

const ICD10_CODE = /^F\d{2}(\.\d+)?$/
const ICD11_CODE = /^[0-9][A-Z0-9]{2,3}(\.[A-Z0-9]+)?$/
// ICD-11 distinct criteria trees must be coded in chapter 06 (6xx). The only
// legitimate non-chapter-06 ICD-11 code referenced by this pack is 8A05 (tic
// disorders, reclassified to chapter 08) — and that lives in an ICD-10 fallback
// citation, never inside an `icd11` tree. Asserting 6xx here is the regression
// guard that no F-code (or other off-chapter code) leaks into an ICD-11 tree.
const ICD11_CHAPTER6_CODE = /^6[A-Z0-9]{2,3}(\.[A-Z0-9]+)?$/
const ICD11_ALLOWED_NON_CHAPTER6 = new Set(['8A05'])

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

describe('ICD-11 criteria-tree citations (F-code contamination guard)', () => {
  it('every authored ICD-11 tree criterion carries at least one structured source citation', () => {
    for (const disorder of DISORDER_CRITERIA) {
      for (const group of disorder.icd11?.groups ?? []) {
        for (const criterion of group.criteria) {
          expect(
            criterion.citation,
            `${disorder.id} → icd11 ${criterion.id} is missing a source citation`,
          ).toBeDefined()
          expect(criterion.citation!.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('every ICD-11 tree citation is classification:icd11 with a chapter-06 code (never an F-code)', () => {
    for (const disorder of DISORDER_CRITERIA) {
      for (const group of disorder.icd11?.groups ?? []) {
        for (const criterion of group.criteria) {
          for (const source of criterion.citation ?? []) {
            expect(
              source.classification,
              `${disorder.id} → ${criterion.id}: an ICD-11 tree must only cite classification 'icd11'`,
            ).toBe('icd11')
            const isChapter6OrAllowed =
              ICD11_CHAPTER6_CODE.test(source.code) || ICD11_ALLOWED_NON_CHAPTER6.has(source.code)
            expect(
              isChapter6OrAllowed,
              `${disorder.id} → ${criterion.id}: '${source.code}' is not a chapter-06 ICD-11 code`,
            ).toBe(true)
          }
        }
      }
    }
  })

  it('the resolved ICD-11 disorder view is itself coded as chapter-06 icd11', () => {
    for (const disorder of DISORDER_CRITERIA) {
      if (!disorder.icd11) continue
      const icd11Code = disorder.codingSystems.icd11?.code
      expect(icd11Code, `${disorder.id}.codingSystems.icd11.code`).toBeDefined()
      const isChapter6OrAllowed =
        ICD11_CHAPTER6_CODE.test(icd11Code!) || ICD11_ALLOWED_NON_CHAPTER6.has(icd11Code!)
      expect(
        isChapter6OrAllowed,
        `${disorder.id}: a disorder with a distinct ICD-11 tree must carry a chapter-06 icd11 code, got '${icd11Code}'`,
      ).toBe(true)
    }
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
