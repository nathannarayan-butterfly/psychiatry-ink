import { describe, expect, it } from 'vitest'
import type { DiscussPackageContent } from '../../src/types/discussCase'
import { deidentifyPackageContent, deidentifyText } from './discussCaseDeidentify'

/**
 * Priority 2 — server is the de-identification trust boundary.
 *
 * These tests prove the server RE-RUNS redaction on content the client already
 * claims is de-identified (`isDeidentified: true`). A client that lies about, or
 * imperfectly performs, de-identification must not be able to leak identifiers
 * into an LLM prompt.
 */
describe('server-side de-identification ignores the client claim', () => {
  it('redacts identifiers from a package even when isDeidentified=true', () => {
    const clientPackage: DiscussPackageContent = {
      version: 1,
      builtAt: '2024-01-01T00:00:00.000Z',
      caseId: 'case-1',
      patientLabel: 'Max Mustermann',
      isDeidentified: true, // client asserts it is already clean — we must not trust this
      sections: [
        {
          key: 'anamnesis',
          id: 'aufnahme',
          label: 'Aufnahme Max Mustermann',
          content:
            'Max Mustermann, geb. 01.02.1980, Tel 030-1234-5678, Mail max@example.com, Fall AB-12345.',
        },
      ],
    }

    const result = deidentifyPackageContent(clientPackage, 'Max Mustermann', 'Patient')

    const text = result.sections[0]!.content
    expect(text).not.toContain('Max Mustermann')
    expect(text).not.toContain('01.02.1980')
    expect(text).not.toContain('max@example.com')
    expect(text).not.toContain('030-1234-5678')
    expect(text).not.toContain('AB-12345')
    expect(text).toContain('[REDACTED]')
    // Label is scrubbed too, and the output is re-stamped as de-identified.
    expect(result.sections[0]!.label).not.toContain('Max Mustermann')
    expect(result.isDeidentified).toBe(true)
    expect(result.patientLabel).toBe('Patient')
  })

  it('scrubs free-text questions/notes via deidentifyText', () => {
    const out = deidentifyText('Patientin Anna Schmidt, Tel 089-9876543, am 12.03.2024 vorgestellt.', 'Anna Schmidt')
    expect(out).not.toContain('Anna Schmidt')
    expect(out).not.toContain('089-9876543')
    expect(out).toContain('12.03.2024')
    expect(out).toContain('[REDACTED]')
  })

  it('still redacts DOB-context dates', () => {
    const out = deidentifyText('geb. 01.02.1980, Kontrolle geplant.')
    expect(out).not.toContain('01.02.1980')
    expect(out).toContain('geb.')
    expect(out).toContain('[REDACTED]')
  })

  it('is a pure function — does not mutate the source package', () => {
    const source: DiscussPackageContent = {
      version: 1,
      builtAt: '2024-01-01T00:00:00.000Z',
      caseId: 'case-1',
      patientLabel: 'X',
      isDeidentified: false,
      sections: [{ key: 'anamnesis', id: 'a', label: 'L', content: 'Termin 01.01.2020' }],
    }
    deidentifyPackageContent(source)
    expect(source.sections[0]!.content).toBe('Termin 01.01.2020')
  })
})
