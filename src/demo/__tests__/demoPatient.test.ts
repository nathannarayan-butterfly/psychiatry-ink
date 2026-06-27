import { describe, expect, it, beforeEach, vi } from 'vitest'
import { buildDemoPatientFixture } from '../buildDemoFixture'
import { validateDemoFixture } from '../validateDemoFixture'
import enFixtureJson from '../demoPatient.en.fixture.json'
import deFixtureJson from '../demoPatient.de.fixture.json'
import {
  DEMO_CASE_ID_DE,
  DEMO_CASE_ID_EN,
  DEMO_PATIENT_ID_DE,
  DEMO_PATIENT_ID_EN,
  DEMO_SEED_VERSION,
  demoCaseIdForLocale,
  demoPatientIdForLocale,
} from '../constants'
import { isDemoCase, isDemoCaseReadOnly } from '../demoReadOnly'

describe('demo fixture', () => {
  it('has required markers and distinct locale identities', () => {
    const en = buildDemoPatientFixture('en')
    const de = buildDemoPatientFixture('de')

    expect(en.isDemoPatient).toBe(true)
    expect(en.demoSeedVersion).toBe(DEMO_SEED_VERSION)
    expect(en.demoPatientId).toBe(DEMO_PATIENT_ID_EN)
    expect(en.demoCaseId).toBe(DEMO_CASE_ID_EN)
    expect(en.patient.vorname).toBe('Marcus')

    expect(de.demoPatientId).toBe(DEMO_PATIENT_ID_DE)
    expect(de.demoCaseId).toBe(DEMO_CASE_ID_DE)
    expect(de.patient.vorname).toBe('Thomas')
    expect(en.patient.nachname).toBe('Demo')
  })

  it('validates successfully for all demo locales', () => {
    for (const locale of ['de', 'en'] as const) {
      const fixture = buildDemoPatientFixture(locale)
      const result = validateDemoFixture(fixture)
      expect(result.ok, `${locale}: ${result.errors.map((e) => e.message).join('; ')}`).toBe(true)
    }
  })

  it('validates successfully', () => {
    const fixture = buildDemoPatientFixture('en')
    const result = validateDemoFixture(fixture)
    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('uses locale-specific admission copy', () => {
    const de = buildDemoPatientFixture('de')
    const en = buildDemoPatientFixture('en')
    expect(de.workspace.documents.aufnahme?.sectionContents.aufnahmeanlass).not.toBe(
      en.workspace.documents.aufnahme?.sectionContents.aufnahmeanlass,
    )
    expect(de.workspace.documents.aufnahme?.sectionContents.aufnahmeanlass).toMatch(/stationär|Aufnahme|Notaufnahme/i)
    expect(en.workspace.documents.aufnahme?.sectionContents.aufnahmeanlass).toMatch(/admission|psychiatric|GP/i)
  })

  it('includes major module data counts', () => {
    const fixture = buildDemoPatientFixture('en')
    expect(Object.keys(fixture.workspace.documents).length).toBeGreaterThanOrEqual(6)
    expect(fixture.verlaufFeed.length).toBeGreaterThanOrEqual(12)
    expect((fixture.verlaufAnnotations ?? []).filter((a) => a.type === 'comment').length).toBeGreaterThanOrEqual(2)
    expect((fixture.verlaufAnnotations ?? []).filter((a) => a.type === 'todo').length).toBeGreaterThanOrEqual(2)
    expect(fixture.workspace.diagnoses.length).toBe(3)
    expect(fixture.workspace.diagnoses.some((d) => d.icd10.code.startsWith('F25'))).toBe(false)
    expect(fixture.workspace.medicationPlanState?.plans[0]?.medications.length).toBeGreaterThanOrEqual(2)
    expect(fixture.befundRecords.length).toBeGreaterThanOrEqual(2)
    expect(fixture.laborBefunde.length).toBeGreaterThanOrEqual(2)
    expect(fixture.aiTherapyDemo?.combinationCheck.findings.length).toBeGreaterThanOrEqual(2)
    expect(fixture.aiTherapyDemo?.labMedCorrelation.findings.length).toBeGreaterThanOrEqual(2)
    expect(fixture.aiTherapyDemo?.prepAiCheck.entries.length).toBeGreaterThanOrEqual(1)
    expect(fixture.workspace.isdmInput?.domains).toBeDefined()
    expect(fixture.workspace.isdmAnalysis?.diagnosticMappings.length).toBeGreaterThanOrEqual(1)
    expect(Object.keys(fixture.workspace.butterflyAttestations ?? {}).length).toBeGreaterThanOrEqual(5)
    expect(fixture.workspace.anforderungen?.length).toBeGreaterThanOrEqual(5)
    expect(fixture.clinicalIntelligence?.latestRun?.dimensional.activeDimensions.length).toBeGreaterThanOrEqual(5)
    expect(fixture.patient.vorname).toBe('Marcus')
    expect(fixture.patient.geschlecht).toBe('maennlich')
    expect(fixture.workspace.diagnoses.some((d) => d.icd10.code === 'F20.0')).toBe(true)
    expect(fixture.workspace.diagnoses.some((d) => d.icd10.code === 'F10.2')).toBe(true)
  })

  // Guards the English demo against German leaking into the Clinical Intelligence
  // / Butterfly analysis (criteria text, differentials, exclusions, risk flags,
  // side-effect labels). German umlauts/ß plus distinctive German clinical tokens
  // must never appear in the EN ISDM analysis; the DE fixture is the control that
  // proves the detector actually fires on German.
  const GERMAN_LEAK = /[äöüÄÖÜß]|\b(?:Störung|Konsum|Kriterien|Kriterienprüfung|Wahn|Nebenwirkung|Erhöht(?:es)?|Gefährdung|Entzug(?:ssyndrom)?|Toleranz(?:entwicklung)?|Vernachlässigung|Abhängigkeit|Stimmen|Hinweis(?:e)?|Risikoeinschätzung|Schutzfaktoren|verfügbar)\b/

  it('English demo ISDM analysis contains no German (built + committed JSON)', () => {
    for (const source of [
      JSON.stringify(buildDemoPatientFixture('en').workspace.isdmAnalysis),
      JSON.stringify((enFixtureJson as typeof enFixtureJson).workspace.isdmAnalysis),
    ]) {
      const match = source.match(GERMAN_LEAK)
      expect(match, `German leak in EN ISDM analysis: ${match?.[0]}`).toBeNull()
    }
  })

  it('English demo ISDM analysis surfaces English criteria/differentials/flags', () => {
    const isdm = buildDemoPatientFixture('en').workspace.isdmAnalysis
    const mappings = isdm?.diagnosticMappings ?? []
    const allCriteria = mappings.flatMap((m) => [...m.criteriaMet, ...m.criteriaMissing])
    expect(allCriteria.some((c) => /delusion|withdrawal|craving|tolerance/i.test(c))).toBe(true)
    expect(mappings.flatMap((m) => m.differentials).some((d) => /disorder|psychosis|intoxication/i.test(d))).toBe(true)
    expect(mappings.some((m) => m.label === 'Elevated clinical risk (flag)')).toBe(true)
  })

  it('control: German demo ISDM analysis still contains German criteria', () => {
    const built = JSON.stringify(buildDemoPatientFixture('de').workspace.isdmAnalysis)
    const committed = JSON.stringify((deFixtureJson as typeof deFixtureJson).workspace.isdmAnalysis)
    expect(built).toMatch(GERMAN_LEAK)
    expect(committed).toMatch(GERMAN_LEAK)
  })

  it('rejects fixture with wrong patient id', () => {
    const fixture = buildDemoPatientFixture('en')
    const bad = { ...fixture, demoPatientId: 'REAL-123' as typeof fixture.demoPatientId }
    const result = validateDemoFixture(bad)
    expect(result.ok).toBe(false)
  })

  it('rejects fixture with email-like PHI', () => {
    const fixture = buildDemoPatientFixture('en')
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

  it('detects demo case ids for each locale', () => {
    expect(isDemoCase(DEMO_CASE_ID_EN)).toBe(true)
    expect(isDemoCase(DEMO_CASE_ID_DE)).toBe(true)
    expect(isDemoCase('other-uuid')).toBe(false)
  })

  it('marks demo case as read-only for non-publishers', () => {
    expect(isDemoCaseReadOnly(DEMO_CASE_ID_EN)).toBe(true)
    expect(isDemoCaseReadOnly(DEMO_CASE_ID_EN, 'other@example.com')).toBe(true)
    expect(isDemoCaseReadOnly('other-uuid')).toBe(false)
  })

  it('allows publisher to edit demo case', () => {
    expect(isDemoCaseReadOnly(DEMO_CASE_ID_EN, 'nathan.narayan@butterflyproject.eu')).toBe(false)
  })

  it('maps locale to distinct case ids', () => {
    expect(demoCaseIdForLocale('en')).toBe(DEMO_CASE_ID_EN)
    expect(demoCaseIdForLocale('de')).toBe(DEMO_CASE_ID_DE)
    expect(demoPatientIdForLocale('en')).toBe(DEMO_PATIENT_ID_EN)
    expect(demoPatientIdForLocale('de')).toBe(DEMO_PATIENT_ID_DE)
  })
})
