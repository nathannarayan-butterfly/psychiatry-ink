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

  // Architectural guarantee: a sensible, non-code title resolves SYNCHRONOUSLY
  // from bundled data with NO API and NO DB, with NO caller-supplied hint.
  it.each(['F12.2', 'F20.0', 'F10.2'])(
    'returns a non-empty, non-code title for %s with no API/DB and no hint',
    (code) => {
      const label = resolveDiagnosisLabelSync({ code, label: '', overridden: false }, 'icd10')
      expect(label).toBeTruthy()
      expect(label).not.toBe(code)
      expect(label.length).toBeGreaterThan(code.length)
    },
  )

  it('honours clinician override above the bundled title', () => {
    expect(
      resolveDiagnosisLabelSync(
        { code: 'F20.0', label: 'Eigene Formulierung', overridden: true },
        'icd10',
      ),
    ).toBe('Eigene Formulierung')
  })

  it('falls back to the bare code only for a truly unknown code', () => {
    expect(
      resolveDiagnosisLabelSync({ code: 'Z99.9', label: '', overridden: false }, 'icd10'),
    ).toBe('Z99.9')
  })
})

describe('resolveDisplayCriteriaLabel — bundled criteria coverage', () => {
  it('resolves a criteria-pack code with no curated catalog entry', () => {
    // F70 (leichte Intelligenzminderung) lives in the criteria pack, not the
    // curated DIAGNOSIS_CATALOG — it must still resolve synchronously.
    const label = resolveDisplayCriteriaLabel('F70', 'icd10')
    expect(label).toBeTruthy()
    expect(label).not.toBe('F70')
  })
})
