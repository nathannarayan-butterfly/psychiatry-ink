import { describe, expect, it } from 'vitest'
import { canAssignTaskTo, isTaskAssignerRole, roleRank } from '../roleHierarchy'

describe('role hierarchy', () => {
  it('ranks owners highest (lowest number)', () => {
    expect(roleRank('org_owner')).toBe(0)
    expect(roleRank('single_owner')).toBe(0)
    expect(roleRank('clinician')).toBeGreaterThan(roleRank('clinical_lead'))
    expect(roleRank('viewer')).toBeGreaterThan(roleRank('clinician'))
  })

  it('falls back to the lowest authority for unknown/null roles', () => {
    expect(roleRank(null)).toBe(80)
    expect(roleRank(undefined)).toBe(80)
  })

  it('identifies higher-order assigner roles', () => {
    expect(isTaskAssignerRole('org_owner')).toBe(true)
    expect(isTaskAssignerRole('org_admin')).toBe(true)
    expect(isTaskAssignerRole('clinical_lead')).toBe(true)
    expect(isTaskAssignerRole('clinician')).toBe(false)
    expect(isTaskAssignerRole('viewer')).toBe(false)
    expect(isTaskAssignerRole(null)).toBe(false)
  })

  describe('canAssignTaskTo', () => {
    it('owners can assign to anyone below', () => {
      expect(canAssignTaskTo('org_owner', 'clinician')).toBe(true)
      expect(canAssignTaskTo('org_owner', 'assistant')).toBe(true)
      expect(canAssignTaskTo('org_owner', 'org_admin')).toBe(true)
    })

    it('a lead can assign to clinicians and below but not upward', () => {
      expect(canAssignTaskTo('clinical_lead', 'clinician')).toBe(true)
      expect(canAssignTaskTo('clinical_lead', 'assistant')).toBe(true)
      expect(canAssignTaskTo('clinical_lead', 'org_admin')).toBe(false)
      expect(canAssignTaskTo('clinical_lead', 'org_owner')).toBe(false)
    })

    it('non-assigner roles cannot assign at all', () => {
      expect(canAssignTaskTo('clinician', 'clinician')).toBe(false)
      expect(canAssignTaskTo('clinician', 'assistant')).toBe(false)
      expect(canAssignTaskTo('assistant', 'viewer')).toBe(false)
      expect(canAssignTaskTo('viewer', 'viewer')).toBe(false)
    })

    it('peers at the same assigner rank may delegate to one another', () => {
      // org_admin (10) -> org_admin (10): same level counts as "at" their level.
      expect(canAssignTaskTo('org_admin', 'org_admin')).toBe(true)
    })
  })
})
