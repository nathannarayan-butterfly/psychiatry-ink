/**
 * Butterfly criteria i18n layer — types.
 *
 * The German source dataset (`*_de` fields in {@link ../schema}) is the single
 * source of truth and is NEVER edited for localization. This layer carries the
 * en/fr/es translations as a separate, typed map keyed by the EXACT ids present
 * in `DISORDER_CRITERIA` (disorder id → fields; group id → label; criterion id →
 * text). Missing keys fall back to the German source at resolve time, but the
 * coverage test (`i18n/__tests__/coverage.test.ts`) enforces that en/fr/es are
 * complete for every disorder, group, criterion and differential — so the
 * fallback is a safety net, not a license to leave entries untranslated.
 *
 * Only display strings live here. Ids, codes, ICD/DSM citations, crosswalk keys,
 * sourceRef, operationalRule logic and mappingHints stay in the source data
 * because they are language-neutral.
 */

/** Localized strings for a single disorder, keyed by the source ids. */
export interface DisorderTranslation {
  /** Localized display name (mirrors `Disorder.name_de`). */
  name: string
  /**
   * Localized differential considerations, index-aligned with the source
   * `differentials_de` array (same length, same order).
   */
  differentials: string[]
  /** Localized group labels, keyed by `CriterionGroup.id`. */
  groups: Record<string, string>
  /** Localized criterion texts, keyed by `Criterion.id`. */
  criteria: Record<string, string>
}

/** Full translation map for one language: disorder id → its translations. */
export type DisorderTranslationMap = Record<string, DisorderTranslation>
