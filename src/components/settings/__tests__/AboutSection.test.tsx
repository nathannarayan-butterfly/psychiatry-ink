import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { TranslationProvider } from '../../../context/TranslationContext'
import type { UiLanguage } from '../../../types/settings'
import { AboutSection } from '../PlaceholderSection'

const PACKAGE_VERSION = (
  JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
    version: string
  }
).version

let activeRoot: Root | null = null
let activeContainer: HTMLDivElement | null = null

afterEach(() => {
  if (activeRoot) act(() => activeRoot!.unmount())
  activeContainer?.remove()
  activeRoot = null
  activeContainer = null
})

function render(language: UiLanguage): HTMLDivElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      createElement(TranslationProvider, {
        language,
        englishVariant: 'uk',
        children: createElement(AboutSection),
      }),
    )
  })
  activeRoot = root
  activeContainer = container
  return container
}

function hrefs(container: HTMLDivElement): string[] {
  return Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '')
}

describe('AboutSection', () => {
  it('renders the real app version from package.json', () => {
    const container = render('en')
    expect(container.textContent).toContain(`v${PACKAGE_VERSION}`)
  })

  it('exposes a support path: contact form + canonical support mailto', () => {
    const links = hrefs(render('en'))
    expect(links).toContain('/contact?category=support')
    expect(links).toContain('mailto:hello@psychiatry.ink')
  })

  it('links every legal/trust document with English routes', () => {
    const links = hrefs(render('en'))
    for (const path of [
      '/privacy',
      '/security',
      '/terms',
      '/legal',
      '/cookies',
      '/dpa',
      '/subprocessors',
      '/security-overview',
    ]) {
      expect(links).toContain(path)
    }
  })

  it('uses localized German routes when language is de', () => {
    const links = hrefs(render('de'))
    expect(links).toContain('/kontakt?category=support')
    for (const path of [
      '/datenschutz',
      '/agb',
      '/impressum',
      '/cookie-richtlinie',
      '/auftragsverarbeitung',
      '/unterauftragsverarbeiter',
      '/sicherheitsuebersicht',
    ]) {
      expect(links).toContain(path)
    }
  })

  it('opens external pages in a new tab without leaking the opener', () => {
    const anchors = Array.from(render('en').querySelectorAll('a')).filter(
      (a) => !(a.getAttribute('href') ?? '').startsWith('mailto:'),
    )
    expect(anchors.length).toBeGreaterThan(0)
    for (const anchor of anchors) {
      expect(anchor.getAttribute('target')).toBe('_blank')
      expect(anchor.getAttribute('rel')).toContain('noopener')
    }
  })

  it('never leaks German copy into the English UI', () => {
    const text = render('en').textContent ?? ''
    for (const german of [
      'Anwendung',
      'Unternehmen',
      'Anbieter',
      'Datenschutz & Sicherheit',
      'Support & Kontakt',
      'Rechtliches',
      'Datenstandort',
      'Kontaktformular öffnen',
      'Vereinigtes Königreich',
    ]) {
      expect(text).not.toContain(german)
    }
  })

  it('never leaks English-only copy into the German UI', () => {
    const text = render('de').textContent ?? ''
    for (const english of [
      'Privacy & security',
      'Support & contact',
      'Data residency',
      'Open contact form',
      'United Kingdom',
    ]) {
      expect(text).not.toContain(english)
    }
  })
})
