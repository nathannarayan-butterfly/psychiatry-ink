import { describe, expect, it } from 'vitest'
import { getLegalDoc, type LegalDoc, type LegalPageKey } from '../legalContent'
import { getPublicRoute, matchPublicPath, type PublicLocale } from '../publicRoutes'
import { getPublicPageMeta } from '../publicSeo'

/** Legal docs that gained dedicated standalone pages. */
const NEW_LEGAL_KEYS = ['cookies', 'dpa', 'subprocessors', 'securityOverview'] as const

const HOST_BY_LOCALE: Record<PublicLocale, string> = {
  en: 'psychiatry.ink',
  de: 'psychiatrie.ink',
}

/** Collect every human-readable string in a legal doc for placeholder scanning. */
function collectText(doc: LegalDoc): string[] {
  const out: string[] = [doc.title, doc.lead, doc.lastUpdatedLabel]
  for (const section of doc.sections) {
    out.push(section.heading)
    for (const block of section.blocks) {
      if (block.type === 'ul') out.push(...block.items)
      else out.push(block.text)
    }
  }
  return out
}

const PLACEHOLDER_PATTERNS = [/\[insert/i, /\bTODO\b/, /\bplaceholder\b/i, /\bchoose one\b/i, /…add/i]

describe('new standalone legal pages', () => {
  for (const key of NEW_LEGAL_KEYS) {
    it(`resolves EN + DE routes for "${key}"`, () => {
      const route = getPublicRoute(key)
      expect(route.path.en).toMatch(/^\//)
      expect(route.path.de).toMatch(/^\//)
      // EN + DE slugs are distinct and both resolve back to this page key.
      expect(matchPublicPath(route.path.en)).toBe(key)
      expect(matchPublicPath(route.path.de)).toBe(key)
      expect(route.indexable).toBe(true)
      expect(route.inFooterLegal).toBe(true)
      expect(route.locales).toContain('en')
      expect(route.locales).toContain('de')
    })

    for (const locale of ['en', 'de'] as const) {
      it(`has complete ${locale.toUpperCase()} content with no placeholder leaks for "${key}"`, () => {
        const doc = getLegalDoc(key as LegalPageKey, locale)
        expect(doc.title.length).toBeGreaterThan(0)
        expect(doc.lead.length).toBeGreaterThan(0)
        expect(doc.sections.length).toBeGreaterThan(0)
        for (const section of doc.sections) {
          expect(section.heading.length).toBeGreaterThan(0)
          expect(section.blocks.length).toBeGreaterThan(0)
        }
        for (const text of collectText(doc)) {
          for (const pattern of PLACEHOLDER_PATTERNS) {
            expect(pattern.test(text), `placeholder "${pattern}" found in: ${text}`).toBe(false)
          }
        }
      })

      it(`has SEO title + description for "${key}" in ${locale.toUpperCase()}`, () => {
        const meta = getPublicPageMeta(key, HOST_BY_LOCALE[locale])
        expect(meta.title.length).toBeGreaterThan(0)
        expect(meta.description.length).toBeGreaterThan(0)
        expect(meta.robots).toBe('index,follow')
      })
    }
  }

  it('does not collide with the marketing security page', () => {
    expect(matchPublicPath('/security')).toBe('security')
    expect(matchPublicPath('/sicherheit')).toBe('security')
    expect(matchPublicPath('/security-overview')).toBe('securityOverview')
    expect(matchPublicPath('/sicherheitsuebersicht')).toBe('securityOverview')
  })

  it('keeps German content out of English docs and vice versa', () => {
    for (const key of NEW_LEGAL_KEYS) {
      const enText = collectText(getLegalDoc(key as LegalPageKey, 'en')).join('\n')
      const deText = collectText(getLegalDoc(key as LegalPageKey, 'de')).join('\n')
      // German-only terms should not appear in the EN docs.
      expect(/Unterauftragsverarbeiter|Datenschutzerklärung|Sicherheitsübersicht/.test(enText)).toBe(
        false,
      )
      // English structural title words should not appear in the DE docs.
      expect(/\bData Processing Agreement\b|\bSub-processors\b/.test(deText)).toBe(false)
    }
  })
})
