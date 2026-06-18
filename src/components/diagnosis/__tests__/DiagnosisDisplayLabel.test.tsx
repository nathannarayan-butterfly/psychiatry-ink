import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DiagnosisDisplayLabel } from '../DiagnosisDisplayLabel'

/**
 * `renderToStaticMarkup` renders the component WITHOUT running effects — so the
 * async WHO/API fetch in `useDiagnosisDisplayTitle` never fires. This is exactly
 * the "API down / DB unseeded" scenario: the component must still synchronously
 * render a real, human-readable title from bundled data, not a bare code.
 */
describe('DiagnosisDisplayLabel — synchronous-first rendering (no API/DB)', () => {
  it('renders the bundled WHO-style title for a known code', () => {
    const html = renderToStaticMarkup(
      <DiagnosisDisplayLabel code="F20.0" version="icd10" />,
    )
    expect(html).toContain('Paranoide Schizophrenie')
    expect(html).not.toMatch(/>\s*F20\.0\s*</)
  })

  it('renders a non-empty title beyond the bare code for F12.2', () => {
    const html = renderToStaticMarkup(
      <DiagnosisDisplayLabel code="F12.2" version="icd10" />,
    )
    expect(html).toContain('Cannabinoide')
  })

  it('honours a clinician override above the bundled title', () => {
    const html = renderToStaticMarkup(
      <DiagnosisDisplayLabel
        code="F20.0"
        version="icd10"
        overridden
        enteredLabel="Eigene Formulierung"
      />,
    )
    expect(html).toContain('Eigene Formulierung')
    expect(html).not.toContain('Paranoide Schizophrenie')
  })

  it('falls back to the bare code only for a truly unknown code', () => {
    const html = renderToStaticMarkup(
      <DiagnosisDisplayLabel code="Z99.9" version="icd10" />,
    )
    expect(html).toContain('Z99.9')
  })
})
