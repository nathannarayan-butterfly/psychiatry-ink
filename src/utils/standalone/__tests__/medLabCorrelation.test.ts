/**
 * Deterministic medication ⇄ lab correlation engine (patient-less tool). Pure,
 * ad-hoc-input only — these tests assert the clinically established correlations
 * surface on free-text drug names + entered lab values, with no patient-case I/O.
 */
import { describe, expect, it } from 'vitest'
import {
  computeMedLabCorrelation,
  type AdHocLabValues,
  type MedLabFindingCode,
} from '../medLabCorrelation'

function codes(labs: AdHocLabValues, names: string[]): MedLabFindingCode[] {
  return computeMedLabCorrelation([], names, labs).findings.map((f) => f.code)
}

describe('computeMedLabCorrelation', () => {
  it('flags torsades risk for a QT-prolonging drug with hypokalaemia', () => {
    const result = computeMedLabCorrelation([], ['Citalopram'], { potassium: 3.1 })
    const qt = result.findings.find((f) => f.code === 'qtTorsades')
    expect(qt).toBeDefined()
    expect(qt!.level).toBe('high')
    expect(qt!.drugs).toContain('Citalopram')
    expect(qt!.values.some((v) => v.includes('K⁺'))).toBe(true)
  })

  it('flags torsades risk when measured QTc is severely prolonged', () => {
    expect(codes({ qtc: 510 }, ['Haloperidol'])).toContain('qtTorsades')
  })

  it('returns QT monitoring context for two QT drugs with in-range electrolytes', () => {
    const result = computeMedLabCorrelation([], ['Quetiapin', 'Escitalopram'], { potassium: 4.2 })
    const qt = result.findings.find((f) => f.code === 'qtProlonged')
    expect(qt).toBeDefined()
    expect(qt!.level).toBe('info')
  })

  it('flags lithium toxicity above range and renal caution', () => {
    const result = computeMedLabCorrelation([], ['Lithium'], { lithiumLevel: 1.5, egfr: 45 })
    const found = result.findings.map((f) => f.code)
    expect(found).toContain('lithiumToxic')
    expect(found).toContain('lithiumRenal')
  })

  it('flags subtherapeutic lithium below range', () => {
    expect(codes({ lithiumLevel: 0.3 }, ['Lithium'])).toContain('lithiumSubtherapeutic')
  })

  it('flags clozapine neutropenia as high severity', () => {
    const result = computeMedLabCorrelation([], ['Clozapin'], { neutrophils: 1.2 })
    const clz = result.findings.find((f) => f.code === 'clozapineAgranulocytosis')
    expect(clz).toBeDefined()
    expect(clz!.level).toBe('high')
  })

  it('flags carbamazepine hyponatraemia and SSRI hyponatraemia', () => {
    expect(codes({ sodium: 128 }, ['Carbamazepin'])).toContain('carbamazepineHyponatremia')
    expect(codes({ sodium: 129 }, ['Sertralin'])).toContain('ssriHyponatremia')
  })

  it('flags valproate level out of range and a generic monitor reminder', () => {
    expect(codes({ valproateLevel: 130 }, ['Valproat'])).toContain('valproateToxic')
    expect(codes({ valproateLevel: 30 }, ['Valproat'])).toContain('valproateSubtherapeutic')
    // No level entered → generic monitoring reminder.
    expect(codes({}, ['Valproinsäure'])).toContain('valproateMonitor')
  })

  it('produces no findings when nothing correlates', () => {
    const result = computeMedLabCorrelation([], ['Mirtazapin'], { potassium: 4.0, sodium: 140 })
    expect(result.findings).toEqual([])
  })

  it('is a pure function (no medications array means no reference monitoring)', () => {
    const result = computeMedLabCorrelation([], ['Lithium'], { lithiumLevel: 0.7 })
    expect(result.hasDrugReference).toBe(false)
    expect(result.monitoring).toEqual([])
  })
})
