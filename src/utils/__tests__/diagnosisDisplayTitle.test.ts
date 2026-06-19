import { describe, expect, it } from 'vitest'
import { resolveDiagnosisDisplayTitle } from '../diagnosisDisplayTitle'

const FULL_F12_2 =
  'Psychische und Verhaltensstörungen durch Cannabinoide : Abhängigkeitssyndrom'

describe('resolveDiagnosisDisplayTitle', () => {
  it('prefers WHO/API title when present', () => {
    expect(
      resolveDiagnosisDisplayTitle({
        apiTitle: FULL_F12_2,
        criteriaLabel: 'Psychische Störung durch Cannabinoide',
        enteredLabel: 'Cannabisabhängigkeit',
        code: 'F12.2',
      }),
    ).toBe(FULL_F12_2)
  })

  it('falls back to criteria crosswalk label when API title missing', () => {
    expect(
      resolveDiagnosisDisplayTitle({
        apiTitle: '',
        criteriaLabel: FULL_F12_2,
        enteredLabel: 'freitext',
        code: 'F12.2',
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
        apiTitle: FULL_F12_2,
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
