import { describe, expect, it } from 'vitest'
import { DISORDER_CRITERIA } from '../index'

/**
 * Registry-integrity guards for the full Butterfly criteria pack (the 5 originally
 * authored disorders + the comprehensive ICD-10 F0–F9 block modules). Disorder ids
 * and criterion ids are required to be globally unique across the whole registry.
 */
describe('DISORDER_CRITERIA registry integrity', () => {
  it('has no duplicate disorder ids', () => {
    const seen = new Map<string, number>()
    for (const disorder of DISORDER_CRITERIA) {
      seen.set(disorder.id, (seen.get(disorder.id) ?? 0) + 1)
    }
    const duplicates = [...seen.entries()].filter(([, count]) => count > 1).map(([id]) => id)
    expect(duplicates, `duplicate disorder ids: ${duplicates.join(', ')}`).toEqual([])
  })

  it('no criterion id is shared across disorders (ICD-10 + ICD-11 trees)', () => {
    // Walk both the default (ICD-10) tree AND the optional distinct ICD-11 tree.
    // A criterion id may legitimately appear in more than one GROUP of the SAME
    // disorder — ICD-11 commonly requires "≥1 from a core gate AND ≥N in total",
    // so the same criterion objects are reused across an `any_of` gate group and
    // an `at_least_n_of` count group. The invariant that must hold is that a
    // criterion id is never shared across DIFFERENT disorders (which would let
    // evidence for one disorder bleed into another). So we de-duplicate the owner
    // per disorder and only flag genuine cross-disorder collisions.
    const owners = new Map<string, Set<string>>()
    for (const disorder of DISORDER_CRITERIA) {
      for (const group of [...disorder.groups, ...(disorder.icd11?.groups ?? [])]) {
        for (const criterion of group.criteria) {
          const seenIn = owners.get(criterion.id) ?? new Set<string>()
          seenIn.add(disorder.id)
          owners.set(criterion.id, seenIn)
        }
      }
    }
    const collisions = [...owners.entries()]
      .filter(([, ds]) => ds.size > 1)
      .map(([id, ds]) => `${id} in [${[...ds].join(', ')}]`)
    expect(collisions, `criterion ids shared across disorders:\n${collisions.join('\n')}`).toEqual([])
  })

  it('every disorder carries the full required header and non-empty groups/differentials', () => {
    for (const disorder of DISORDER_CRITERIA) {
      expect(disorder.id, 'id').toBeTruthy()
      expect(disorder.classification, `${disorder.id}.classification`).toBeTruthy()
      expect(disorder.code, `${disorder.id}.code`).toBeTruthy()
      expect(disorder.name_de, `${disorder.id}.name_de`).toBeTruthy()
      expect(disorder.crosswalkKey, `${disorder.id}.crosswalkKey`).toBeTruthy()
      expect(disorder.sourceRef, `${disorder.id}.sourceRef`).toBeTruthy()
      expect(typeof disorder.version, `${disorder.id}.version`).toBe('number')
      expect(disorder.status, `${disorder.id}.status`).toBe('draft')
      expect(
        Object.keys(disorder.codingSystems).length,
        `${disorder.id}.codingSystems`,
      ).toBeGreaterThan(0)
      expect(disorder.differentials_de.length, `${disorder.id}.differentials_de`).toBeGreaterThan(0)
      expect(disorder.groups.length, `${disorder.id}.groups`).toBeGreaterThan(0)
      // Where a distinct ICD-11 tree is authored it must be non-empty too (no
      // empty placeholder trees that would silently resolve to nothing).
      if (disorder.icd11) {
        expect(disorder.icd11.groups.length, `${disorder.id}.icd11.groups`).toBeGreaterThan(0)
      }
      for (const group of [...disorder.groups, ...(disorder.icd11?.groups ?? [])]) {
        expect(group.criteria.length, `${disorder.id} → ${group.id} criteria`).toBeGreaterThan(0)
        for (const criterion of group.criteria) {
          expect(criterion.text_de.trim(), `${disorder.id} → ${criterion.id} text_de`).not.toBe('')
        }
      }
    }
  })
})
