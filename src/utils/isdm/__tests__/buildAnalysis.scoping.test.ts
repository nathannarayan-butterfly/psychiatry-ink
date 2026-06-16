import { describe, expect, it } from 'vitest'
import type { ClinicalImprintIndex } from '../../../types/clinicalImprint'
import type { DiagnoseEntry } from '../../diagnosenArchive'
import { buildIsdmAnalysis, type IsdmBuildInput } from '../buildAnalysis'

function emptyImprints(): ClinicalImprintIndex {
  return { version: 1, updatedAt: new Date().toISOString(), imprints: [] }
}

function makeDiag(icd10Code: string, icd10Label: string, icd11Code = ''): DiagnoseEntry {
  const now = new Date().toISOString()
  return {
    id: `${icd10Code}-${Math.random().toString(36).slice(2, 6)}`,
    icd10: { code: icd10Code, label: icd10Label, overridden: false },
    icd11: { code: icd11Code, label: '', overridden: false },
    dsm: { code: '', label: '', overridden: false },
    createdAt: now,
    updatedAt: now,
  }
}

function baseInput(diagnoses: DiagnoseEntry[]): IsdmBuildInput {
  return {
    caseId: 'test-case',
    imprints: emptyImprints(),
    checklistSelections: {},
    diagnoses,
  }
}

const AUTHORED_DISORDER_LABELS = [
  'Depressive Episode',
  'Generalisierte Angststörung',
  'Panikstörung',
  'Schizophrenie',
]

describe('buildDiagnosticMappings — scoped to entered diagnoses', () => {
  it('verifies only the entered diagnosis and surfaces no other disorders', () => {
    const analysis = buildIsdmAnalysis(baseInput([makeDiag('F10.2', 'Alkoholabhängigkeit')]))
    const mappings = analysis.diagnosticMappings

    // Exactly the entered diagnosis is present (no risk findings in this fixture).
    expect(mappings).toHaveLength(1)
    expect(mappings[0]?.codingSystems.icd10?.code).toBe('F10.2')
    // None of the other authored disorders are surfaced as hypotheses.
    for (const label of AUTHORED_DISORDER_LABELS) {
      expect(mappings.some((m) => m.label === label)).toBe(false)
    }
  })

  it('emits no disorder mappings when no diagnoses are entered', () => {
    const analysis = buildIsdmAnalysis(baseInput([]))
    expect(analysis.diagnosticMappings).toHaveLength(0)
  })

  it('shows a "not available" state for an entered diagnosis without an authored set', () => {
    const analysis = buildIsdmAnalysis(baseInput([makeDiag('F60.3', 'Emotional instabile Persönlichkeitsstörung')]))
    const mappings = analysis.diagnosticMappings

    expect(mappings).toHaveLength(1)
    expect(mappings[0]?.criteriaMet).toEqual([])
    expect(mappings[0]?.criteriaMissing).toContain(
      'Kriterienprüfung für diese Diagnose noch nicht verfügbar',
    )
  })

  it('does not duplicate when two entries map to the same authored disorder', () => {
    const analysis = buildIsdmAnalysis(
      baseInput([makeDiag('F32.1', 'Mittelgradige depressive Episode'), makeDiag('F32.2', 'Schwere depressive Episode')]),
    )
    const depressionMappings = analysis.diagnosticMappings.filter((m) =>
      m.codingSystems.icd10?.code.startsWith('F32'),
    )
    expect(depressionMappings).toHaveLength(1)
  })
})
