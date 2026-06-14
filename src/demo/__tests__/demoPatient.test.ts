import { describe, expect, it, beforeEach, vi } from 'vitest'
import { buildDemoPatientFixture } from '../buildDemoFixture'
import { validateDemoFixture } from '../validateDemoFixture'
import { DEMO_CASE_ID, DEMO_PATIENT_ID, DEMO_SEED_VERSION } from '../constants'
import { isDemoCase, isDemoCaseReadOnly } from '../demoReadOnly'

describe('demo fixture', () => {
  it('has required markers and patient identity', () => {
    const fixture = buildDemoPatientFixture()
    expect(fixture.isDemoPatient).toBe(true)
    expect(fixture.demoSeedVersion).toBe(DEMO_SEED_VERSION)
    expect(fixture.demoPatientId).toBe(DEMO_PATIENT_ID)
    expect(fixture.demoCaseId).toBe(DEMO_CASE_ID)
    expect(fixture.patient.nachname).toBe('Demo')
  })

  it('validates successfully', () => {
    const fixture = buildDemoPatientFixture()
    const result = validateDemoFixture(fixture)
    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('includes major module data counts', () => {
    const fixture = buildDemoPatientFixture()
    expect(Object.keys(fixture.workspace.documents).length).toBeGreaterThanOrEqual(6)
    expect(fixture.verlaufFeed.length).toBeGreaterThanOrEqual(12)
    expect(fixture.workspace.diagnoses.length).toBe(3)
    expect(fixture.workspace.diagnoses.some((d) => d.icd10.code.startsWith('F25'))).toBe(false)
    expect(fixture.workspace.medicationPlanState?.plans[0]?.medications.length).toBeGreaterThanOrEqual(2)
    expect(fixture.befundRecords.length).toBeGreaterThanOrEqual(1)
    expect(fixture.laborBefunde.length).toBeGreaterThanOrEqual(2)
    expect(fixture.aiTherapyDemo?.combinationCheck.findings.length).toBeGreaterThanOrEqual(2)
    expect(fixture.aiTherapyDemo?.labMedCorrelation.findings.length).toBeGreaterThanOrEqual(2)
    expect(fixture.aiTherapyDemo?.prepAiCheck.entries.length).toBeGreaterThanOrEqual(1)
  })

  it('rejects fixture with wrong patient id', () => {
    const fixture = buildDemoPatientFixture()
    const bad = { ...fixture, demoPatientId: 'REAL-123' as typeof fixture.demoPatientId }
    const result = validateDemoFixture(bad)
    expect(result.ok).toBe(false)
  })

  it('rejects fixture with email-like PHI', () => {
    const fixture = buildDemoPatientFixture()
    const bad = structuredClone(fixture)
    bad.verlaufFeed[0] = {
      ...bad.verlaufFeed[0],
      content: 'Contact test@example.com for follow-up',
    }
    const result = validateDemoFixture(bad)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.code === 'phi_email')).toBe(true)
  })
})

describe('demo read-only helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      key: vi.fn(),
      length: 0,
    })
  })

  it('detects demo case id', () => {
    expect(isDemoCase(DEMO_CASE_ID)).toBe(true)
    expect(isDemoCase('other-uuid')).toBe(false)
  })

  it('marks demo case as read-only for non-publishers', () => {
    expect(isDemoCaseReadOnly(DEMO_CASE_ID)).toBe(true)
    expect(isDemoCaseReadOnly(DEMO_CASE_ID, 'other@example.com')).toBe(true)
    expect(isDemoCaseReadOnly('other-uuid')).toBe(false)
  })

  it('allows publisher to edit demo case', () => {
    expect(isDemoCaseReadOnly(DEMO_CASE_ID, 'nathan.narayan@butterflyproject.eu')).toBe(false)
  })
})
