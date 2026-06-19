import { describe, expect, it } from 'vitest'
import { extractPatientIdentity } from '../patientIdentity'

describe('extractPatientIdentity', () => {
  it('extracts a labelled name and date of birth', () => {
    const identity = extractPatientIdentity('Name: Max Mustermann\nGeburtsdatum: 01.02.1990\nDiagnose: …')
    expect(identity).not.toBeNull()
    expect(identity?.vorname).toBe('Max')
    expect(identity?.nachname).toBe('Mustermann')
    expect(identity?.geburtsdatum).toBe('1990-02-01')
    expect(identity?.confidence).toBe('high')
  })

  it('handles "Nachname, Vorname" order', () => {
    const identity = extractPatientIdentity('Patient: Mustermann, Max\ngeb. 3.4.1978')
    expect(identity?.vorname).toBe('Max')
    expect(identity?.nachname).toBe('Mustermann')
    expect(identity?.geburtsdatum).toBe('1978-04-03')
  })

  it('extracts identity from JSON-style keys', () => {
    const identity = extractPatientIdentity(
      '{"vorname":"Anna","nachname":"Beispiel","geburtsdatum":"1985-06-15"}',
    )
    expect(identity?.vorname).toBe('Anna')
    expect(identity?.nachname).toBe('Beispiel')
    expect(identity?.geburtsdatum).toBe('1985-06-15')
  })

  it('returns null when no identity signal is present', () => {
    expect(extractPatientIdentity('Rein klinischer Verlauf ohne Personenangaben.')).toBeNull()
  })

  it('keeps the raw DOB when it is not parseable to ISO', () => {
    const identity = extractPatientIdentity('Name: Eva Test\ngeb. 31.13.1990')
    expect(identity?.geburtsdatumRaw).toBe('31.13.1990')
    expect(identity?.geburtsdatum).toBeUndefined()
  })
})
