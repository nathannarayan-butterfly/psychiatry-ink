import { describe, expect, it } from 'vitest'
import { deidentifyText, redactPatientName } from '../deidentify'

describe('deidentifyText', () => {
  it('masks patient name tokens', () => {
    const { text, redactions } = deidentifyText('Nikolaos Demo war ruhig.', { patientNames: ['Nikolaos Demo'] })
    expect(text).not.toContain('Nikolaos')
    expect(text).not.toContain('Demo')
    expect(text).toContain('[NAME]')
    expect(redactions.name).toBeGreaterThanOrEqual(2)
  })

  it('masks emails, phones, dates and long ids', () => {
    const input = 'Kontakt a@b.de, Tel +49 170 1234567, geb. 01.02.1990, Fall 1234567.'
    const { text } = deidentifyText(input)
    expect(text).toContain('[EMAIL]')
    expect(text).toContain('[CONTACT]')
    expect(text).toContain('[DATE]')
    expect(text).toContain('[ID]')
    expect(text).not.toContain('a@b.de')
  })

  it('leaves clinical content intact', () => {
    const { text } = deidentifyText('Sertralin 50 mg morgens.')
    expect(text).toContain('Sertralin')
    expect(text).toContain('mg')
  })

  it('keeps standalone clinical dates but masks DOB dates (#13)', () => {
    const input = 'Aufnahme am 12.03.2024, Kontroll-EKG 2024-04-01. geb. 01.02.1990.'
    const { text, redactions } = deidentifyText(input)
    // Standalone clinical dates are preserved verbatim …
    expect(text).toContain('12.03.2024')
    expect(text).toContain('2024-04-01')
    // … while a date in an explicit date-of-birth context is masked.
    expect(text).toContain('[DATE]')
    expect(text).not.toContain('01.02.1990')
    expect(redactions.date).toBe(1)
  })

  it('does not redact a bare date as a phone/id number (#13)', () => {
    const { text } = deidentifyText('Befund vom 05.06.2025 unauffällig.')
    expect(text).toContain('05.06.2025')
    expect(text).not.toContain('[CONTACT]')
    expect(text).not.toContain('[ID]')
    expect(text).not.toContain('[DATE]')
  })
})

describe('redactPatientName', () => {
  it('replaces only the patient name with a neutral token', () => {
    const input = 'Max Mustermann berichtet über Schlafstörungen. Mustermann wirkt müde.'
    const { text, redactions } = redactPatientName(input, {
      vorname: 'Max',
      nachname: 'Mustermann',
    })
    expect(text).not.toContain('Max Mustermann')
    expect(text).not.toContain('Mustermann')
    expect(text).toContain('[Patient]')
    expect(text).toContain('berichtet über Schlafstörungen')
    expect(redactions).toBeGreaterThanOrEqual(2)
  })

  it('preserves a doctor who shares the patient surname', () => {
    const input =
      'Patient Max Mustermann vorgestellt bei Dr. Mustermann. Dr. med. Mustermann empfiehlt Sertralin.'
    const { text, preservedDoctorMatches } = redactPatientName(input, {
      vorname: 'Max',
      nachname: 'Mustermann',
    })
    // Doctor occurrences stay intact …
    expect(text).toContain('Dr. Mustermann')
    expect(text).toContain('Dr. med. Mustermann')
    // … while the patient occurrence is redacted.
    expect(text).toContain('Patient [Patient]')
    expect(preservedDoctorMatches).toBeGreaterThanOrEqual(2)
  })

  it('does nothing when no patient name is known', () => {
    const input = 'Patient berichtet über Angst.'
    const { text, redactions } = redactPatientName(input, {})
    expect(text).toBe(input)
    expect(redactions).toBe(0)
  })
})
