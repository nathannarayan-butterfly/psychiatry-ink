import { describe, expect, it } from 'vitest'
import { resolveDiagnosisDisplayTitle } from '../diagnosisDisplayTitle'

describe('resolveDiagnosisDisplayTitle', () => {
  it('prefers WHO/API title when present', () => {
    expect(
      resolveDiagnosisDisplayTitle({
        apiTitle: 'Psychische und Verhaltensstörungen durch Cannabinoide : Abhängigkeitssyndrom',
        criteriaLabel: 'Psychische Störung durch Cannabinoide',
        enteredLabel: 'Cannabisabhängigkeit',
        code: 'F12.2',
      }),
    ).toBe('Psychische und Verhaltensstörungen durch Cannabinoide : Abhängigkeitssyndrom')
  })

  it('falls back to criteria crosswalk label when API title missing', () => {
    expect(
      resolveDiagnosisDisplayTitle({
        apiTitle: '',
        criteriaLabel: 'Abhängigkeitssyndrom bei Cannabinoiden',
        enteredLabel: 'freitext',
        code: 'F12.2',
      }),
    ).toBe('Abhängigkeitssyndrom bei Cannabinoiden')
  })

  it('falls back to entered freetext when API and criteria labels missing', () => {
    expect(
      resolveDiagnosisDisplayTitle({
        criteriaLabel: null,
        enteredLabel: 'Eigene Beschreibung',
        code: 'F12.2',
      }),
    ).toBe('Eigene Beschreibung')
  })

  it('falls back to code only as last resort', () => {
    expect(
      resolveDiagnosisDisplayTitle({
        code: 'F12.2',
      }),
    ).toBe('F12.2')
  })
})
