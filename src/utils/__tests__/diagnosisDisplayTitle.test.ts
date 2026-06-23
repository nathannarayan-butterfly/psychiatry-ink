import { describe, expect, it } from 'vitest'
import { resolveDiagnosisDisplayTitle } from '../diagnosisDisplayTitle'

const FULL_F12_2 =
  'Psychische und Verhaltensstörungen durch Cannabinoide : Abhängigkeitssyndrom'

describe('resolveDiagnosisDisplayTitle', () => {
  it('prefers WHO/API title when present for icd11', () => {
    expect(
      resolveDiagnosisDisplayTitle({
        apiTitle: 'Schizophrenia, first episode',
        criteriaLabel: 'Schizophrenie',
        enteredLabel: 'Cannabisabhängigkeit',
        code: '6A20',
        version: 'icd11',
      }),
    ).toBe('Schizophrenia, first episode')
  })

  it('prefers bundled ICD-10-GM criteria over WHO international API', () => {
    expect(
      resolveDiagnosisDisplayTitle({
        apiTitle: 'Mental and behavioural disorders due to use of alcohol',
        criteriaLabel: 'Alkoholabhängigkeit',
        code: 'F10',
        version: 'icd10',
      }),
    ).toBe('Alkoholabhängigkeit')
  })

  it('uses WHO/API for icd10 when no bundled label exists', () => {
    expect(
      resolveDiagnosisDisplayTitle({
        apiTitle: 'Rare disorder title',
        criteriaLabel: null,
        code: 'F99.9',
        version: 'icd10',
      }),
    ).toBe('Rare disorder title')
  })

  it('falls back to criteria crosswalk label when API title missing', () => {
    expect(
      resolveDiagnosisDisplayTitle({
        apiTitle: '',
        criteriaLabel: FULL_F12_2,
        enteredLabel: 'freitext',
        code: 'F12.2',
        version: 'icd10',
      }),
    ).toBe(FULL_F12_2)
  })

  it('ignores stored label when not overridden', () => {
    expect(
      resolveDiagnosisDisplayTitle({
        criteriaLabel: null,
        enteredLabel: 'Eigene Beschreibung',
        code: 'F12.2',
        overridden: false,
      }),
    ).toBe('F12.2')
  })

  it('uses clinician-entered label when overridden and materially custom', () => {
    expect(
      resolveDiagnosisDisplayTitle({
        enteredLabel: 'Eigene Beschreibung',
        code: 'F12.2',
        overridden: true,
      }),
    ).toBe('Eigene Beschreibung')
  })

  it('prefers official title over stale shorthand stored as override', () => {
    expect(
      resolveDiagnosisDisplayTitle({
        criteriaLabel: FULL_F12_2,
        enteredLabel: 'Cannabisabhängigkeit',
        code: 'F12.2',
        overridden: true,
        version: 'icd10',
      }),
    ).toBe(FULL_F12_2)
  })

  it('falls back to code only as last resort', () => {
    expect(
      resolveDiagnosisDisplayTitle({
        code: 'F12.2',
      }),
    ).toBe('F12.2')
  })
})
