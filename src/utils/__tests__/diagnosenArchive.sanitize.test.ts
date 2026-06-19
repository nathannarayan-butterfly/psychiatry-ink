// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { normalizeDiagnoseEntries, sanitizeDiagnoseEntry, type DiagnoseEntry } from '../diagnosenArchive'

describe('sanitizeDiagnoseEntry', () => {
  it('demotes stale shorthand overrides for coded ICD-10 entries', () => {
    const entry: DiagnoseEntry = {
      id: 'dx-1',
      icd10: { code: 'F12.2', label: 'Cannabisabhängigkeit', overridden: true },
      icd11: { code: '', label: '', overridden: false },
      dsm: { code: '', label: '', overridden: false },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    expect(sanitizeDiagnoseEntry(entry).icd10.overridden).toBe(false)
  })

  it('preserves materially custom clinician overrides', () => {
    const entry: DiagnoseEntry = {
      id: 'dx-2',
      icd10: { code: 'F20.0', label: 'Eigene Formulierung', overridden: true },
      icd11: { code: '', label: '', overridden: false },
      dsm: { code: '', label: '', overridden: false },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    expect(sanitizeDiagnoseEntry(entry).icd10.overridden).toBe(true)
  })
})

describe('normalizeEntries — legacy migration', () => {
  it('does not mark coded legacy rows as clinician overrides', () => {
    const [entry] = normalizeDiagnoseEntries([
      {
        id: 'legacy-1',
        icdCode: 'F12.2',
        description: 'Cannabisabhängigkeit',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ])

    expect(entry?.icd10.code).toBe('F12.2')
    expect(entry?.icd10.overridden).toBe(false)
    expect(entry?.icd10.label).toBe('Cannabisabhängigkeit')
  })

  it('keeps free-text-only legacy rows as overrides', () => {
    const [entry] = normalizeDiagnoseEntries([
      {
        id: 'legacy-2',
        description: 'Verdacht auf Psychose NOS',
      },
    ])

    expect(entry?.icd10.code).toBe('')
    expect(entry?.icd10.overridden).toBe(true)
    expect(entry?.icd10.label).toBe('Verdacht auf Psychose NOS')
  })

  it('sanitizes modern entries loaded from vault with stale override flags', () => {
    const [entry] = normalizeDiagnoseEntries([
      {
        id: 'vault-1',
        icd10: { code: 'F12.2', label: 'Cannabisabhängigkeit', overridden: true },
        icd11: { code: '6C41.2', label: 'Cannabisabhängigkeit', overridden: false },
        dsm: { code: '304.30', label: 'Cannabisgebrauchsstörung, schwer', overridden: false },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ])

    expect(entry?.icd10.overridden).toBe(false)
  })
})
