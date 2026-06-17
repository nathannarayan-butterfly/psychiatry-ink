/**
 * Butterfly criteria i18n layer — resolver.
 *
 * `getLocalizedDisorder` returns a copy of an authored {@link Disorder} with its
 * display fields (`name_de`, `differentials_de`, group `label_de`, criterion
 * `text_de`) swapped for the requested UI language, falling back to the German
 * source per field when a translation key is missing. For `de` the source object
 * is returned unchanged, so German behaviour is identical.
 *
 * Field names keep their `_de` suffix on purpose: localizing the Disorder object
 * up front means the deterministic evaluator and every downstream renderer pick
 * up the localized strings without any further change (they already read
 * `*_de`). Ids, codes, citations, crosswalk keys, sourceRef, operationalRule and
 * mappingHints are language-neutral and are preserved verbatim.
 */

import type { UiLanguage } from '../../../types/settings'
import type { Disorder } from '../schema'
import type { DisorderTranslation, DisorderTranslationMap } from './types'
import { en } from './en'
import { fr } from './fr'
import { es } from './es'

export type { DisorderTranslation, DisorderTranslationMap } from './types'

/** Translation registries for the non-source languages. */
const REGISTRY: Partial<Record<UiLanguage, DisorderTranslationMap>> = { en, fr, es }

/** The full translation map for a language, or undefined for the source language. */
export function getDisorderTranslationMap(lang: UiLanguage): DisorderTranslationMap | undefined {
  return REGISTRY[lang]
}

/** Localized differentials, index-aligned with the source, with per-item DE fallback. */
function localizeDifferentials(source: string[], translated: string[] | undefined): string[] {
  if (!translated || translated.length === 0) return source
  return source.map((d, i) => translated[i] ?? d)
}

/**
 * Return `disorder` with its display strings localized to `lang`. German is the
 * source language (returned as-is). Any missing key falls back to the German
 * source string so the result is always complete and safe to render.
 */
export function getLocalizedDisorder(disorder: Disorder, lang: UiLanguage): Disorder {
  if (lang === 'de') return disorder
  const entry: DisorderTranslation | undefined = REGISTRY[lang]?.[disorder.id]
  if (!entry) return disorder
  return {
    ...disorder,
    name_de: entry.name || disorder.name_de,
    differentials_de: localizeDifferentials(disorder.differentials_de, entry.differentials),
    groups: disorder.groups.map((group) => ({
      ...group,
      label_de: entry.groups?.[group.id] ?? group.label_de,
      criteria: group.criteria.map((criterion) => ({
        ...criterion,
        text_de: entry.criteria?.[criterion.id] ?? criterion.text_de,
      })),
    })),
  }
}
