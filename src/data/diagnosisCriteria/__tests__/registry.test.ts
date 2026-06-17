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

  it('has no duplicate criterion ids across the whole registry', () => {
    const owners = new Map<string, string[]>()
    for (const disorder of DISORDER_CRITERIA) {
      for (const group of disorder.groups) {
        for (const criterion of group.criteria) {
          owners.set(criterion.id, [...(owners.get(criterion.id) ?? []), disorder.id])
        }
      }
    }
    const collisions = [...owners.entries()]
      .filter(([, ds]) => ds.length > 1)
      .map(([id, ds]) => `${id} in [${ds.join(', ')}]`)
    expect(collisions, `duplicate criterion ids:\n${collisions.join('\n')}`).toEqual([])
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
      for (const group of disorder.groups) {
        expect(group.criteria.length, `${disorder.id} → ${group.id} criteria`).toBeGreaterThan(0)
        for (const criterion of group.criteria) {
          expect(criterion.text_de.trim(), `${disorder.id} → ${criterion.id} text_de`).not.toBe('')
        }
      }
    }
  })
})
