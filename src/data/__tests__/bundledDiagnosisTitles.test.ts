import { describe, expect, it } from 'vitest'
import {
  bundledDiagnosisTitle,
  bundledDiagnosisTitleCoverage,
} from '../bundledDiagnosisTitles'
import { DIAGNOSIS_CATALOG } from '../diagnosisCatalog'
import { DISORDER_CRITERIA } from '../diagnosisCriteria/index'

/**
 * These tests run with NO API and NO database. They lock in the guarantee that a
 * diagnosis always resolves to a real, human-readable title synchronously from
 * bundled in-app data — the architectural fix for the recurring "diagnosis label
 * is gone" regression.
 */
describe('bundledDiagnosisTitle — pure synchronous resolution', () => {
  it.each([
    ['F20.0', 'icd10'],
    ['F12.2', 'icd10'],
    ['F10.2', 'icd10'],
  ] as const)('resolves %s to a non-empty, non-code title with no API/DB', (code, version) => {
    const title = bundledDiagnosisTitle(code, version)
    expect(title).toBeTruthy()
    expect(title).not.toBe(code)
    expect((title ?? '').length).toBeGreaterThan(code.length)
  })

  it('returns the precise curated sub-code wording for F20.0', () => {
    expect(bundledDiagnosisTitle('F20.0', 'icd10')).toBe('Paranoide Schizophrenie')
  })

  it('is case- and whitespace-insensitive', () => {
    expect(bundledDiagnosisTitle('  f20.0 ', 'icd10')).toBe('Paranoide Schizophrenie')
  })

  it('falls back to a coarse stem title for an unlisted sub-code', () => {
    // F20.81 is not individually catalogued; the F20 stem still yields a title.
    const title = bundledDiagnosisTitle('F20.81', 'icd10')
    expect(title).toBeTruthy()
    expect(title).not.toBe('F20.81')
  })

  it('returns null only for a truly unknown code', () => {
    expect(bundledDiagnosisTitle('Z99.9', 'icd10')).toBeNull()
    expect(bundledDiagnosisTitle('', 'icd10')).toBeNull()
  })

  it('covers every demo-fixture ICD-10 diagnosis code synchronously', () => {
    // Demo patient fixture codes (see src/demo/buildDemoFixture.ts).
    const demoCodes = ['F20.0', 'F12.2', 'F15.2']
    for (const code of demoCodes) {
      const title = bundledDiagnosisTitle(code, 'icd10')
      expect(title, `demo code ${code} must resolve synchronously`).toBeTruthy()
      expect(title).not.toBe(code)
    }
  })

  it('covers every criteria-pack ICD-10 coding code synchronously', () => {
    const missing: string[] = []
    for (const disorder of DISORDER_CRITERIA) {
      const code = disorder.codingSystems.icd10?.code
      if (!code) continue
      if (!bundledDiagnosisTitle(code, 'icd10')) missing.push(`${disorder.id}:${code}`)
    }
    expect(missing, `criteria codes without a sync title: ${missing.join(', ')}`).toEqual([])
  })

  it('exposes meaningful coverage counts', () => {
    const coverage = bundledDiagnosisTitleCoverage()
    // Sanity floor: the curated catalog alone contributes dozens of entries and
    // the criteria pack adds many more across icd10/icd11/dsm.
    expect(coverage.exact).toBeGreaterThanOrEqual(DIAGNOSIS_CATALOG.length)
    expect(coverage.exact).toBeGreaterThan(50)
    expect(coverage.stem).toBeGreaterThan(0)
  })
})
