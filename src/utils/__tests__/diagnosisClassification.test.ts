// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { DiagnoseEntry } from '../diagnosenArchive'
import { normalizeDiagnoseEntries } from '../diagnosenArchive'
import {
  applyClinicianCategoryChange,
  inferDefaultCategoryForNewEntry,
  mergeDiagnosisClassificationFromExternal,
  normalizeDiagnosisClassification,
  resolveClinicalCategory,
  resolveConfirmationStatus,
  sortDiagnosesForDisplay,
  syncLegacyClassificationFields,
} from '../diagnosisClassification'

function makeEntry(partial: Partial<DiagnoseEntry> & Pick<DiagnoseEntry, 'id'>): DiagnoseEntry {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    icd10: { code: 'F20.0', label: 'Test', overridden: false },
    icd11: { code: '', label: '', overridden: false },
    dsm: { code: '', label: '', overridden: false },
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

describe('diagnosisClassification', () => {
  it('maps legacy role/status to unified category', () => {
    expect(
      resolveClinicalCategory(
        makeEntry({ id: '1', diagnosisRole: 'comorbidity', diagnosisStatus: 'confirmed' }),
      ),
    ).toBe('comorbidity')
    expect(
      resolveClinicalCategory(
        makeEntry({ id: '2', diagnosisStatus: 'differential' }),
      ),
    ).toBe('differential')
  })

  it('defaults legacy entries: first primary, rest secondary', () => {
    const entries = normalizeDiagnoseEntries([
      {
        id: 'a',
        icd10: { code: 'F20.0', label: 'A', overridden: false },
        icd11: { code: '', label: '', overridden: false },
        dsm: { code: '', label: '', overridden: false },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'b',
        icd10: { code: 'F12.2', label: 'B', overridden: false },
        icd11: { code: '', label: '', overridden: false },
        dsm: { code: '', label: '', overridden: false },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ])

    expect(entries[0]?.clinicalCategory).toBe('primary')
    expect(entries[1]?.clinicalCategory).toBe('secondary')
  })

  it('assigns secondary when primary already exists', () => {
    const existing = [
      makeEntry({ id: '1', clinicalCategory: 'primary', confirmationStatus: 'confirmed' }),
    ]
    expect(inferDefaultCategoryForNewEntry(existing)).toBe('secondary')
  })

  it('sorts primary before muted historical entries', () => {
    const primary = syncLegacyClassificationFields(makeEntry({ id: 'p' }), 'primary', 'confirmed')
    const historical = syncLegacyClassificationFields(makeEntry({ id: 'h' }), 'historical', 'anamnesis_only')
    const sorted = sortDiagnosesForDisplay([historical, primary])
    expect(sorted[0]?.id).toBe('p')
  })

  it('locks classification after clinician edit', () => {
    const entry = applyClinicianCategoryChange(makeEntry({ id: '1' }), 'differential')
    expect(entry.statusClinicianSetAt).toBeTruthy()
    expect(entry.clinicalCategory).toBe('differential')
    expect(entry.diagnosisStatus).toBe('differential')
  })

  it('AI merge does not overwrite clinician-set status', () => {
    const locked = applyClinicianCategoryChange(makeEntry({ id: '1' }), 'primary')
    const merged = mergeDiagnosisClassificationFromExternal(locked, {
      clinicalCategory: 'secondary',
      confirmationStatus: 'under_review',
    })
    expect(merged.clinicalCategory).toBe('primary')
    expect(merged.confirmationStatus).toBe('confirmed')
  })

  it('AI merge updates unlocked entries', () => {
    const entry = normalizeDiagnosisClassification(makeEntry({ id: '1' }), 0, [])
    const merged = mergeDiagnosisClassificationFromExternal(entry, {
      clinicalCategory: 'suspected',
      confirmationStatus: 'under_review',
    })
    expect(merged.clinicalCategory).toBe('suspected')
    expect(resolveConfirmationStatus(merged)).toBe('under_review')
  })

  it('derives confirmation from legacy suspected status', () => {
    expect(
      resolveConfirmationStatus(makeEntry({ id: '1', diagnosisStatus: 'suspected' })),
    ).toBe('under_review')
    expect(
      resolveConfirmationStatus(makeEntry({ id: '2', diagnosisStatus: 'historical' })),
    ).toBe('anamnesis_only')
  })
})
