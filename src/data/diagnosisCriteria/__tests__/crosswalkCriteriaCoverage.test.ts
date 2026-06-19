import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DISORDER_CRITERIA } from '../index'
import { matchDisorderToCodes } from '../match'

interface CrosswalkEntry {
  icd10?: { code?: string; label?: string }
  icd11?: { code?: string; label?: string }
}

const crosswalk: CrosswalkEntry[] = JSON.parse(
  readFileSync(join(process.cwd(), 'prisma/data/diagnosis-crosswalk.json'), 'utf8'),
)

/**
 * Crosswalk criteria coverage gate.
 *
 * Every ICD-10 F code in `prisma/data/diagnosis-crosswalk.json` must resolve via
 * `matchDisorderToCodes()` to an authored criteria set with complete groups and
 * criteria. This enforces the "no sampling, no placeholders" mandate for the
 * Butterfly F-chapter pack.
 */
describe('crosswalk criteria coverage', () => {
  const fCodes = crosswalk
    .map((entry) => entry.icd10?.code)
    .filter((code): code is string => Boolean(code && /^F/i.test(code)))

  it('resolves every crosswalk F code (349/349)', () => {
    const unmatched: string[] = []
    for (const code of fCodes) {
      const icd11 = crosswalk.find((e) => e.icd10?.code === code)?.icd11?.code
      if (!matchDisorderToCodes(code, icd11)) unmatched.push(code)
    }
    expect(
      unmatched,
      `Crosswalk F codes without authored criteria (${unmatched.length}): ${unmatched.join(', ')}`,
    ).toEqual([])
    expect(fCodes.length).toBe(349)
  })

  it('has unique disorder ids in the registry', () => {
    const ids = DISORDER_CRITERIA.map((d) => d.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(dupes, `Duplicate disorder ids: ${[...new Set(dupes)].join(', ')}`).toEqual([])
  })

  it('every matched disorder has at least one inclusion group with criteria', () => {
    const empty: string[] = []
    for (const disorder of DISORDER_CRITERIA) {
      const hasInclusion = disorder.groups.some(
        (g) => g.groupType === 'inclusion' && g.criteria.length > 0,
      )
      if (!hasInclusion) empty.push(disorder.id)
    }
    expect(empty, `Disorders without inclusion criteria: ${empty.join(', ')}`).toEqual([])
  })

  it('every disorder ships as draft with populated fields', () => {
    for (const disorder of DISORDER_CRITERIA) {
      expect(disorder.status).toBe('draft')
      expect(disorder.name_de.trim()).not.toBe('')
      expect(disorder.sourceRef.trim()).not.toBe('')
      expect(disorder.differentials_de.length).toBeGreaterThan(0)
      expect(disorder.groups.length).toBeGreaterThan(0)
      for (const group of disorder.groups) {
        expect(group.label_de.trim()).not.toBe('')
        expect(group.criteria.length).toBeGreaterThan(0)
        for (const criterion of group.criteria) {
          expect(criterion.text_de.trim()).not.toBe('')
          expect(criterion.mappingHints).toBeDefined()
        }
      }
    }
  })
})
