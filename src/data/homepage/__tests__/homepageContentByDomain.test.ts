import { describe, expect, it } from 'vitest'
import { resolveLocaleFromHost } from '../../../config/domainConfig'
import { getHomepageContent } from '../index'

/**
 * Guards the bug where psychiatry.ink and psychiatrie.ink both rendered the German
 * marketing CONTENT. The visible hero copy is selected by `getHomepageContent(locale)`
 * and the public locale must come from the request domain (single source of truth:
 * `resolveLocaleFromHost`), not a persisted UI-language pin.
 */
describe('homepage content resolved by domain', () => {
  it('serves English hero content on psychiatry.ink', () => {
    const content = getHomepageContent(resolveLocaleFromHost('psychiatry.ink'))
    expect(content.hero.headline).toContain('intelligent workspace')
    expect(content.hero.headline).toContain('whole psychiatric case')
    expect(content.hero.subtitle.startsWith('Structured documentation')).toBe(true)
  })

  it('serves German hero content on psychiatrie.ink', () => {
    const content = getHomepageContent(resolveLocaleFromHost('psychiatrie.ink'))
    expect(content.hero.headline).toContain('intelligenter Arbeitsbereich')
    expect(content.hero.headline).toContain('gesamten psychiatrischen Fall')
    expect(content.hero.subtitle.startsWith('Strukturierte Dokumentation')).toBe(true)
  })

  it('serves French and Spanish content on their domains', () => {
    expect(getHomepageContent(resolveLocaleFromHost('fr.psychiatrie.ink')).hero.headline).toContain(
      "l'espace de travail intelligent",
    )
    expect(getHomepageContent(resolveLocaleFromHost('psiquiatria.ink')).hero.headline).toContain(
      'el espacio de trabajo inteligente',
    )
  })

  it('psychiatry.ink and psychiatrie.ink never resolve to the same content', () => {
    const en = getHomepageContent(resolveLocaleFromHost('psychiatry.ink'))
    const de = getHomepageContent(resolveLocaleFromHost('psychiatrie.ink'))
    expect(en.hero.headline).not.toBe(de.hero.headline)
  })

  it('uses English AI mode labels on psychiatry.ink (no German "Gründlich" leak)', () => {
    const en = getHomepageContent(resolveLocaleFromHost('psychiatry.ink'))
    const serialized = JSON.stringify(en)
    expect(serialized).not.toMatch(/Gründlich|gründlich/)
    expect(en.tiers.singleUse.features.join(' ')).toContain('Thorough')
  })

  it('keeps the "intelligent workspace" framing with a resolvable ink-underline accent', () => {
    const en = getHomepageContent('en')
    const de = getHomepageContent('de')
    // Tagline restored in both locales.
    expect(en.hero.headline).toContain('intelligent workspace')
    expect(de.hero.headline).toContain('intelligenter Arbeitsbereich')
    // The ink-underline only renders when the accent is a verbatim substring.
    expect(en.hero.headlineAccent).toBeTruthy()
    expect(de.hero.headlineAccent).toBeTruthy()
    expect(en.hero.headline).toContain(en.hero.headlineAccent as string)
    expect(de.hero.headline).toContain(de.hero.headlineAccent as string)
  })
})

describe('German marketing copy is grammatically correct German', () => {
  const de = getHomepageContent('de')

  it('uses grammatically correct German hero copy', () => {
    expect(de.hero.headline).toContain(
      'Ein intelligenter Arbeitsbereich für den gesamten psychiatrischen Fall',
    )
    // The English-leftover / wrong-agreement forms must never appear.
    expect(de.hero.headline).not.toContain('ein intelligente ')
    expect(de.hero.headline).not.toMatch(/\bInk is\b/)
  })

  it('has no English copular "is" leaking into German hero copy', () => {
    expect(de.hero.subtitle).not.toMatch(/\bis\b/)
    expect(de.hero.subtitle).toContain('vereint in einem sicheren Arbeitsbereich')
  })

  it('keeps GBP pricing with German decimal commas', () => {
    expect(de.tiers.singleUse.billing.monthly.price).toBe('£24,99')
    expect(de.tiers.singleUse.billing.yearly.price).toBe('£239,90')
  })
})
