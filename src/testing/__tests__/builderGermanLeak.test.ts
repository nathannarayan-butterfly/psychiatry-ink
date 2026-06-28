import { describe, expect, it } from 'vitest'
import { buildDemoPatientFixture } from '../../demo/buildDemoFixture'
import { computeMedicationInsights, simplifyClassLabel } from '../../utils/medication/medicationInsights'
import { buildPatientSafety } from '../../utils/overview/patientSafety'
import { getParameterMonitoringRows } from '../../utils/overview/medicationMonitoring'
import { buildLaborOverview } from '../../utils/overview/labOverview'
import type { MedicationEntry } from '../../types/medicationPlan'
import { formatHits, walkStringFields } from '../germanLeak'

/**
 * Guardrail C — locale-correct clinical builders.
 *
 * The systemic root cause (see germanLeak.ts) is German-first builders/reference
 * data rendered without selecting by `language`. These tests run the real demo
 * builders that feed the English Medikation "Brief Info" / overview Safety / labs
 * widgets with `language: 'en'` and assert the produced display strings are
 * German-free — and re-run with `language: 'de'` to prove we didn't regress the
 * German experience.
 */

const ACTIVE = new Set(['active', 'reduced', 'increased'])

function demoMedications(locale: 'en' | 'de'): MedicationEntry[] {
  const fixture = buildDemoPatientFixture(locale)
  const plans = fixture.workspace.medicationPlanState?.plans ?? []
  const plan = plans.find((p) => p.isCurrent) ?? plans[0]
  return plan?.medications ?? []
}

function demoFixture(locale: 'en' | 'de') {
  return buildDemoPatientFixture(locale)
}

describe('Guardrail C — locale-correct clinical builders', () => {
  it('simplifyClassLabel localizes the controlled class vocabulary', () => {
    expect(simplifyClassLabel('Atypisches Antipsychotikum (SGA)', 'en')).toBe('Antipsychotic (SGA)')
    expect(simplifyClassLabel('Atypisches Antipsychotikum (SGA)', 'de')).toBe('Antipsychotikum (SGA)')
    expect(simplifyClassLabel('Benzodiazepine — anxiolytic', 'en')).toBe('Benzodiazepine')
  })

  it('computeMedicationInsights: English brief-info fields are German-free', () => {
    const insights = computeMedicationInsights(demoMedications('en'), 'en')
    const surface = {
      activeClasses: insights.activeClasses.map((c) => c.label),
      combinationRiskDetails: insights.combinationRisks.map((r) => r.detail ?? ''),
      keySideEffects: insights.keySideEffects.map((s) => s.label),
      targetedReceptors: insights.targetedReceptors.map((r) => r.label),
      crossInteractionNotes: insights.crossInteractions.map((i) => i.note),
    }
    const hits = walkStringFields(surface)
    expect(hits, `German leak in EN medication insights:\n${formatHits(hits)}`).toEqual([])
    // The demo regimen must actually resolve to reference data (guards the test).
    expect(insights.activeClasses.length).toBeGreaterThan(0)
  })

  it('control: German medication insights keep German class labels', () => {
    const en = computeMedicationInsights(demoMedications('en'), 'en')
    const de = computeMedicationInsights(demoMedications('de'), 'de')
    const enLabels = en.activeClasses.map((c) => c.label).sort()
    const deLabels = de.activeClasses.map((c) => c.label).sort()
    // Localization actually happened: the EN and DE class label sets differ.
    expect(enLabels.length).toBeGreaterThan(0)
    expect(deLabels).not.toEqual(enLabels)
    expect(deLabels.join(' ')).toMatch(/Antipsychotikum|Benzodiazepin/)
    expect(enLabels.join(' ')).toMatch(/Antipsychotic|Benzodiazepine/)
  })

  it('getParameterMonitoringRows: English monitoring labels are German-free', () => {
    const fixture = demoFixture('en')
    const rows = getParameterMonitoringRows({
      medications: demoMedications('en'),
      befunde: fixture.laborBefunde,
      language: 'en',
    })
    const hits = walkStringFields(rows.map((r) => ({ label: r.label })))
    expect(hits, `German leak in EN monitoring labels:\n${formatHits(hits)}`).toEqual([])
  })

  it('control: German monitoring labels differ from English (localized)', () => {
    const enFixture = demoFixture('en')
    const deFixture = demoFixture('de')
    const enRows = getParameterMonitoringRows({
      medications: demoMedications('en'),
      befunde: enFixture.laborBefunde,
      language: 'en',
    })
    const deRows = getParameterMonitoringRows({
      medications: demoMedications('de'),
      befunde: deFixture.laborBefunde,
      language: 'de',
    })
    const enLabels = enRows.map((r) => r.label).sort()
    const deLabels = deRows.map((r) => r.label).sort()
    expect(enLabels.length).toBeGreaterThan(0)
    // At least one analyte localizes differently (e.g. Glukose ↔ Glucose).
    expect(deLabels).not.toEqual(enLabels)
  })

  it('buildLaborOverview: English lab + monitoring labels are German-free', () => {
    const fixture = demoFixture('en')
    const meds = demoMedications('en')
    const overview = buildLaborOverview({
      befunde: fixture.laborBefunde,
      medications: meds,
      activeSubstances: meds.filter((m) => ACTIVE.has(m.status)).map((m) => m.substance),
      verlaufEntries: fixture.verlaufFeed,
      language: 'en',
    })
    const surface = {
      abnormal: overview.abnormal.map((i) => i.name),
      watched: overview.watched.map((i) => i.name),
      missingMonitoring: overview.missingMonitoring.map((m) => m.parameter),
      medicationMonitoring: overview.medicationMonitoring.map((m) => m.label),
    }
    const hits = walkStringFields(surface)
    expect(hits, `German leak in EN labor overview:\n${formatHits(hits)}`).toEqual([])
  })

  it('buildPatientSafety: English safety surface is German-free', () => {
    const fixture = demoFixture('en')
    const safety = buildPatientSafety({
      medications: demoMedications('en'),
      language: 'en',
      caseId: fixture.demoCaseId,
      imprints: [],
      befunde: fixture.laborBefunde,
      verlaufEntries: fixture.verlaufFeed,
    })
    const surface = {
      riskSignals: (safety.risk?.signals ?? []).map((s) => s.label),
      alertTitles: safety.alerts.map((a) => a.title),
      monitoring: safety.medicationMonitoring.map((m) => m.label),
    }
    const hits = walkStringFields(surface)
    expect(hits, `German leak in EN patient safety:\n${formatHits(hits)}`).toEqual([])
  })

  it('control: German patient safety monitoring still reads as German', () => {
    const fixture = demoFixture('de')
    const deSafety = buildPatientSafety({
      medications: demoMedications('de'),
      language: 'de',
      caseId: fixture.demoCaseId,
      imprints: [],
      befunde: fixture.laborBefunde,
      verlaufEntries: fixture.verlaufFeed,
    })
    const enSafety = buildPatientSafety({
      medications: demoMedications('en'),
      language: 'en',
      caseId: demoFixture('en').demoCaseId,
      imprints: [],
      befunde: demoFixture('en').laborBefunde,
      verlaufEntries: demoFixture('en').verlaufFeed,
    })
    const deLabels = deSafety.medicationMonitoring.map((m) => m.label).sort()
    const enLabels = enSafety.medicationMonitoring.map((m) => m.label).sort()
    // Localization happened: DE and EN monitoring labels are not identical.
    expect(deLabels).not.toEqual(enLabels)
  })

  it('ISDM demo analysis (en) carries no German in the fixture-bound builder output', () => {
    // The ISDM analysis is serialized into the fixture (covered by Guardrail A),
    // but assert at the builder level too so a regression is caught before regen.
    const fixture = demoFixture('en')
    const analysis = fixture.workspace.isdmAnalysis
    expect(analysis).toBeDefined()
    const hits = walkStringFields(analysis)
    // Identifier-style supportingFindings refs are skipped by the walker; only
    // display copy is asserted.
    expect(hits, `German leak in EN ISDM analysis:\n${formatHits(hits)}`).toEqual([])
  })
})
