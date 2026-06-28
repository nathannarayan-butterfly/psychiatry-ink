import { describe, expect, it } from 'vitest'
import { uiTranslations, translateUi, type UiTranslationKey } from '../../data/uiTranslations'
import { componentTranslations } from '../../data/componentTranslations'
import { settingsWorkspaceUiTranslations } from '../../data/settingsWorkspaceUiTranslations'
import { medicationUiTranslations, DEMO_INTELLIGENCE } from '../../data/medicationUiTranslations'
import { homepageContentEn } from '../../data/homepage/content.en'
import { getAiCreditsHinweiseContent } from '../../data/aiCreditsHinweise'
import {
  collectLocaleMapEnglish,
  formatHits,
  scanEnglishValues,
  walkStringFields,
} from '../germanLeak'

/**
 * Guardrail B — every English (`en`) value in a translation table must be
 * German-free. This catches the "copied the German string into the EN slot and
 * never translated it" class of bug (the "Gründlich" leak).
 */

// Translation tables shaped as nested `{ de, en, fr, es }` locale maps.
const LOCALE_MAP_TABLES: Array<{ name: string; table: unknown }> = [
  { name: 'uiTranslations', table: uiTranslations },
  { name: 'componentTranslations', table: componentTranslations },
  { name: 'settingsWorkspaceUiTranslations', table: settingsWorkspaceUiTranslations },
  { name: 'medicationUiTranslations', table: medicationUiTranslations },
  { name: 'DEMO_INTELLIGENCE', table: DEMO_INTELLIGENCE },
]

describe('Guardrail B — i18n English values are German-free', () => {
  for (const { name, table } of LOCALE_MAP_TABLES) {
    it(`${name}: every en value is German-free`, () => {
      const english = collectLocaleMapEnglish(table).map((e) => ({
        path: `${name}.${e.path}`,
        value: e.value,
      }))
      const hits = scanEnglishValues(english)
      expect(hits, `German leak in ${name} en values:\n${formatHits(hits)}`).toEqual([])
    })
  }

  it('uiTranslations: English variant overrides (uk/us) are German-free', () => {
    const hits = (Object.keys(uiTranslations) as UiTranslationKey[]).flatMap((key) =>
      (['uk', 'us'] as const).flatMap((variant) => {
        const value = translateUi('en', key, variant)
        return value ? [{ path: `${key} [${variant}]`, value }] : []
      }),
    )
    const offenders = scanEnglishValues(hits)
    expect(offenders, `German leak in EN variant overrides:\n${formatHits(offenders)}`).toEqual([])
  })

  it('homepage English content is German-free', () => {
    const hits = walkStringFields(homepageContentEn)
    expect(hits, `German leak in homepage EN content:\n${formatHits(hits)}`).toEqual([])
  })

  it('AI credits English content is German-free', () => {
    const hits = walkStringFields(getAiCreditsHinweiseContent('en'))
    expect(hits, `German leak in AI credits EN content:\n${formatHits(hits)}`).toEqual([])
  })
})
