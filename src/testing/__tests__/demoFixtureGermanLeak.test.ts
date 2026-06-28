import { describe, expect, it } from 'vitest'
import enFixture from '../../demo/demoPatient.en.fixture.json'
import deFixture from '../../demo/demoPatient.de.fixture.json'
import { formatHits, walkStringFields } from '../germanLeak'

/**
 * Guardrail A — the English demo fixture must be German-free.
 *
 * The English demo patient (Marcus, DEMO-CASE-EN-0001) is rendered verbatim from
 * `demoPatient.en.fixture.json`. Any German baked into a display string here is
 * directly visible to an English-UI clinician (this is the "Medikation Brief
 * Info shows German" class of bug). We walk every display string field and fail
 * on any German token. Internal IDs / enum slugs are skipped by the walker.
 */
describe('Guardrail A — English demo fixture is German-free', () => {
  it('demoPatient.en.fixture.json contains no German in display fields', () => {
    const hits = walkStringFields(enFixture)
    expect(
      hits,
      `German leaked into the English demo fixture:\n${formatHits(hits)}`,
    ).toEqual([])
  })

  it('control: the German demo fixture still reads as German (not accidentally English)', () => {
    // Cheap reverse check on a few core narrative fields — guards against the DE
    // fixture being clobbered with English. Not exhaustive by design.
    const aufnahme = deFixture.workspace.documents.aufnahme.sectionContents
    expect(aufnahme.aufnahmeanlass).toMatch(/[äöüÄÖÜß]|\b(?:und|mit|keine|Aufnahme|Befund)\b/)
  })
})
