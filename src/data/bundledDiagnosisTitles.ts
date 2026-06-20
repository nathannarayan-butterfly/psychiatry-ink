/**
 * Bundled, fully-synchronous diagnosis title index.
 *
 * This is the in-app source of truth for human-readable diagnosis titles when
 * NO network and NO database are available. It is the deterministic step 3 of
 * the shared resolution chain (see `utils/diagnosisDisplayRequests`):
 *
 *   1. clinician override text          (overridden === true)
 *   2. WHO/API title                    (async progressive enhancement)
 *   3. ⟵ THIS MODULE — bundled sync title from in-repo data
 *   4. code-only                        (truly unknown codes)
 *
 * The index merges two in-repo datasets, both shipped with the app bundle:
 *   - `DIAGNOSIS_CATALOG` — curated ICD-10 ↔ ICD-11 ↔ DSM crosswalk with the
 *     precise sub-code labels (e.g. F20.0 → "Paranoide Schizophrenie").
 *   - `DISORDER_CRITERIA` — the comprehensive Butterfly criteria pack; every
 *     authored disorder contributes its `codingSystems.*.label_de` plus a
 *     coarse stem fallback from its display `name_de`.
 *
 * Catalog entries win on exact-code collisions (they carry the most specific
 * sub-code wording). Lookups are case-insensitive and whitespace-tolerant.
 *
 * Localization: a parallel English (and EN-by-default future-language) index
 * is built lazily on first access. The catalog supplies its `label_en` per
 * coding system; the criteria pack pulls the localized disorder display name
 * from the i18n registry (`diagnosisCriteria/i18n`) so we never have to
 * duplicate translations alongside the German source.
 */

import type { IcdTitleVersion } from '../../shared/icdTitle'
import type { UiLanguage } from '../types/settings'
import { DIAGNOSIS_CATALOG, pickCatalogLabel } from './diagnosisCatalog'
import { DISORDER_CRITERIA } from './diagnosisCriteria/index'
import { getDisorderTranslationMap } from './diagnosisCriteria/i18n'

function normCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

function indexKey(version: IcdTitleVersion, code: string): string {
  return `${version}:${normCode(code)}`
}

/** ICD stem = the part before the dot (e.g. "F20.1" → "F20"). */
function codeStem(code: string): string {
  const norm = normCode(code)
  return norm.split('.')[0] ?? norm
}

/** Placeholder DSM codes in the criteria pack carry no real DSM code. */
function isRealCode(code: string | undefined): code is string {
  const c = (code ?? '').trim()
  return Boolean(c) && c.toLowerCase() !== 'crosswalk'
}

interface BundledIndex {
  /** Exact `version:CODE` → full title. */
  exact: Map<string, string>
  /** Coarse `version:STEM` → disorder display name, for unlisted sub-codes. */
  stem: Map<string, string>
}

const cache = new Map<UiLanguage, BundledIndex>()

function setExact(
  map: Map<string, string>,
  version: IcdTitleVersion,
  code: string | undefined,
  label: string | undefined,
): void {
  if (!isRealCode(code)) return
  const title = label?.trim()
  if (!title) return
  map.set(indexKey(version, code), title)
}

function setStem(
  map: Map<string, string>,
  version: IcdTitleVersion,
  code: string | undefined,
  label: string | undefined,
): void {
  if (!isRealCode(code)) return
  const title = label?.trim()
  if (!title) return
  // First writer wins for a stem — disorders are registered most-specific-first
  // would be wrong, so we deliberately do NOT overwrite an existing stem entry
  // with a narrower sub-code's wording.
  const key = indexKey(version, codeStem(code))
  if (!map.has(key)) map.set(key, title)
}

function buildIndex(lang: UiLanguage): BundledIndex {
  const exact = new Map<string, string>()
  const stem = new Map<string, string>()

  // For non-source languages, look up the disorder's localized display name in
  // the i18n registry. The German source (`name_de` / `label_de`) is always the
  // safety-net fallback.
  const translations = lang === 'de' ? undefined : getDisorderTranslationMap(lang)

  // 1. Criteria pack first (coarser / comprehensive). Catalog overwrites the
  //    exact entries below so precise sub-code wording wins on collisions.
  for (const disorder of DISORDER_CRITERIA) {
    const cs = disorder.codingSystems
    const localizedName = translations?.[disorder.id]?.name?.trim() || disorder.name_de

    // For criteria-pack codes the per-system `label_de` is typically the
    // disorder display name (which the i18n registry translates per disorder
    // id). Use the localized disorder name for non-source languages and fall
    // back to the German source per code if missing.
    setExact(exact, 'icd10', cs.icd10?.code, lang === 'de' ? cs.icd10?.label_de : localizedName)
    setExact(exact, 'icd11', cs.icd11?.code, lang === 'de' ? cs.icd11?.label_de : localizedName)
    setExact(exact, 'dsm', cs.dsm5tr?.code, lang === 'de' ? cs.dsm5tr?.label_de : localizedName)

    // Coarse stem fallback from the disorder's display name (e.g. F20 →
    // "Schizophrenie"), so an unlisted sub-code still resolves to a sensible
    // title instead of a bare code.
    setStem(stem, 'icd10', disorder.code, localizedName)
    setStem(stem, 'icd10', disorder.crosswalkKey, localizedName)
    if (cs.icd10?.code) setStem(stem, 'icd10', cs.icd10.code, localizedName)
    if (cs.icd11?.code) setStem(stem, 'icd11', cs.icd11.code, localizedName)
  }

  // 2. Curated catalog wins on exact-code collisions (most specific wording).
  for (const entry of DIAGNOSIS_CATALOG) {
    setExact(exact, 'icd10', entry.icd10.code, pickCatalogLabel(entry.icd10, lang))
    setExact(exact, 'icd11', entry.icd11.code, pickCatalogLabel(entry.icd11, lang))
    setExact(exact, 'dsm', entry.dsm.code, pickCatalogLabel(entry.dsm, lang))
  }

  return { exact, stem }
}

function getIndex(lang: UiLanguage): BundledIndex {
  let cached = cache.get(lang)
  if (!cached) {
    cached = buildIndex(lang)
    cache.set(lang, cached)
  }
  return cached
}

/**
 * Resolve a full, human-readable diagnosis title from bundled in-app data only.
 * Returns `null` for truly unknown codes (the caller then falls back to the
 * bare code). Pure & synchronous — never touches the network or database.
 *
 * Pass `lang` to select the localized title; defaults to `'de'` (the source
 * language) for backwards compatibility. When the requested language has no
 * entry for a given code, the resolver falls back to the German source title
 * before giving up — so EN UI never shows a bare code just because we lack a
 * translation for one obscure record.
 */
export function bundledDiagnosisTitle(
  code: string,
  version: IcdTitleVersion,
  lang: UiLanguage = 'de',
): string | null {
  const trimmed = code.trim()
  if (!trimmed) return null

  const primary = lookupInIndex(trimmed, version, getIndex(lang))
  if (primary) return primary

  // Per-code fallback to the German source so a missing translation never
  // demotes the UI back to the bare ICD code.
  if (lang !== 'de') {
    const sourceFallback = lookupInIndex(trimmed, version, getIndex('de'))
    if (sourceFallback) return sourceFallback
  }

  return null
}

function lookupInIndex(
  code: string,
  version: IcdTitleVersion,
  { exact, stem }: BundledIndex,
): string | null {
  const direct = exact.get(indexKey(version, code))
  if (direct) return direct

  // Coarse stem fallback for ICD sub-codes not explicitly listed.
  if (version === 'icd10' || version === 'icd11') {
    const coarse = stem.get(indexKey(version, codeStem(code)))
    if (coarse) return coarse
  }

  return null
}

/** Test/diagnostics helper — number of exact + stem bundled entries. */
export function bundledDiagnosisTitleCoverage(lang: UiLanguage = 'de'): {
  exact: number
  stem: number
} {
  const { exact, stem } = getIndex(lang)
  return { exact: exact.size, stem: stem.size }
}
