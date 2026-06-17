import { describe, expect, it } from 'vitest'
import { DISORDER_CRITERIA } from '../../index'
import { getDisorderTranslationMap, getLocalizedDisorder } from '../index'
import type { DisorderTranslationMap } from '../types'

/**
 * Completeness gate for the Butterfly criteria i18n layer.
 *
 * The German source dataset is the single source of truth; en/fr/es MUST cover
 * EVERY disorder name, every differential, every group label and every criterion
 * text present in `DISORDER_CRITERIA`. This enforces the "no sampling, no
 * placeholders" mandate: the DE fallback in the resolver is a safety net, not an
 * excuse to leave entries untranslated. If this test fails, a translation key is
 * missing (or a non-empty/length-aligned constraint is violated) — fill it.
 */
const TARGET_LANGUAGES = ['en', 'fr', 'es'] as const

describe('Butterfly criteria i18n coverage', () => {
  for (const lang of TARGET_LANGUAGES) {
    describe(`${lang} translations`, () => {
      const map = getDisorderTranslationMap(lang) as DisorderTranslationMap

      it('has a translation entry for every disorder id', () => {
        const missing = DISORDER_CRITERIA.filter((d) => !map[d.id]).map((d) => d.id)
        expect(missing, `[${lang}] disorders missing a translation entry: ${missing.join(', ')}`).toEqual([])
      })

      it('translates every disorder name (non-empty)', () => {
        const missing: string[] = []
        for (const disorder of DISORDER_CRITERIA) {
          const name = map[disorder.id]?.name
          if (!name || !name.trim()) missing.push(disorder.id)
        }
        expect(missing, `[${lang}] disorders missing name: ${missing.join(', ')}`).toEqual([])
      })

      it('translates every differential, index-aligned with the source', () => {
        const issues: string[] = []
        for (const disorder of DISORDER_CRITERIA) {
          const translated = map[disorder.id]?.differentials ?? []
          if (translated.length !== disorder.differentials_de.length) {
            issues.push(
              `${disorder.id}: expected ${disorder.differentials_de.length} differentials, got ${translated.length}`,
            )
            continue
          }
          translated.forEach((d, i) => {
            if (!d || !d.trim()) issues.push(`${disorder.id}.differentials[${i}] empty`)
          })
        }
        expect(issues, `[${lang}] differential issues:\n${issues.join('\n')}`).toEqual([])
      })

      it('translates every group label (non-empty)', () => {
        const missing: string[] = []
        for (const disorder of DISORDER_CRITERIA) {
          const groups = map[disorder.id]?.groups ?? {}
          for (const group of disorder.groups) {
            const label = groups[group.id]
            if (!label || !label.trim()) missing.push(`${disorder.id} → ${group.id}`)
          }
        }
        expect(missing, `[${lang}] group labels missing: ${missing.join(', ')}`).toEqual([])
      })

      it('translates every criterion text (non-empty)', () => {
        const missing: string[] = []
        for (const disorder of DISORDER_CRITERIA) {
          const criteria = map[disorder.id]?.criteria ?? {}
          for (const group of disorder.groups) {
            for (const criterion of group.criteria) {
              const text = criteria[criterion.id]
              if (!text || !text.trim()) missing.push(`${disorder.id} → ${criterion.id}`)
            }
          }
        }
        expect(missing, `[${lang}] criterion texts missing: ${missing.join(', ')}`).toEqual([])
      })

      it('resolver returns localized strings (no German leakage) for a localized disorder', () => {
        // Spot-check: after localization, the rendered fields equal the map values.
        for (const disorder of DISORDER_CRITERIA) {
          const localized = getLocalizedDisorder(disorder, lang)
          expect(localized.name_de).toBe(map[disorder.id].name)
          localized.groups.forEach((group) => {
            expect(group.label_de).toBe(map[disorder.id].groups[group.id])
            group.criteria.forEach((criterion) => {
              expect(criterion.text_de).toBe(map[disorder.id].criteria[criterion.id])
            })
          })
        }
      })
    })
  }

  it('German source is returned unchanged by the resolver', () => {
    for (const disorder of DISORDER_CRITERIA) {
      expect(getLocalizedDisorder(disorder, 'de')).toBe(disorder)
    }
  })
})
