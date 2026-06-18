import { describe, expect, it } from 'vitest'
import {
  buildDiagnosisTitleRequest,
  resolveDiagnosisLabelSync,
  resolveDisplayCriteriaLabel,
} from '../diagnosisDisplayRequests'

const FULL_F12_2 =
  'Psychische und Verhaltensstörungen durch Cannabinoide : Abhängigkeitssyndrom'

describe('resolveDisplayCriteriaLabel', () => {
  it('prefers bundled catalog crosswalk over criteria-pack shorthand', () => {
    expect(
      resolveDisplayCriteriaLabel('F12.2', 'icd10', 'Psychische und Verhaltensstörung durch Cannabinoide: Abhängigkeitssyndrom'),
    ).toBe(FULL_F12_2)
  })
})

describe('buildDiagnosisTitleRequest', () => {
  it('does not pass stored label unless overridden', () => {
    const request = buildDiagnosisTitleRequest({
      key: 'dx-1',
      coding: { code: 'F12.2', label: 'Cannabisabhängigkeit', overridden: false },
      version: 'icd10',
    })
    expect(request.enteredLabel).toBeNull()
    expect(request.overridden).toBe(false)
    expect(request.criteriaLabel).toBe(FULL_F12_2)
  })

  it('passes clinician label when overridden', () => {
    const request = buildDiagnosisTitleRequest({
      key: 'dx-1',
      coding: { code: 'F12.2', label: 'Eigene Formulierung', overridden: true },
      version: 'icd10',
    })
    expect(request.enteredLabel).toBe('Eigene Formulierung')
    expect(request.overridden).toBe(true)
  })
})

describe('resolveDiagnosisLabelSync', () => {
  it('ignores stale stored labels when not overridden', () => {
    expect(
      resolveDiagnosisLabelSync(
        { code: 'F12.2', label: 'Cannabisabhängigkeit', overridden: false },
        'icd10',
      ),
    ).toBe(FULL_F12_2)
  })
})
