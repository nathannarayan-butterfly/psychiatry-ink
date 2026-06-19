import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { TranslationProvider } from '../../../context/TranslationContext'
import { GermanDateInput } from '../GermanDateInput'

describe('GermanDateInput', () => {
  it('renders DD.MM.YYYY display and German placeholder for ISO value', () => {
    const html = renderToStaticMarkup(
      <TranslationProvider language="de">
        <GermanDateInput isoValue="1990-02-01" onIsoChange={vi.fn()} aria-label="Geburtsdatum" />
      </TranslationProvider>,
    )
    expect(html).toContain('placeholder="TT.MM.JJJJ"')
    expect(html).toContain('value="01.02.1990"')
    expect(html).not.toContain('type="date"')
  })

  it('renders English placeholder when UI language is English', () => {
    const html = renderToStaticMarkup(
      <TranslationProvider language="en">
        <GermanDateInput isoValue="1985-06-15" onIsoChange={vi.fn()} aria-label="Date of birth" />
      </TranslationProvider>,
    )
    expect(html).toContain('placeholder="DD.MM.YYYY"')
    expect(html).toContain('value="15.06.1985"')
  })
})
