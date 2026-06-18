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
 */

import type { IcdTitleVersion } from '../../shared/icdTitle'
import { DIAGNOSIS_CATALOG } from './diagnosisCatalog'
import { DISORDER_CRITERIA } from './diagnosisCriteria/index'

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

let cached: BundledIndex | null = null

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

function buildIndex(): BundledIndex {
  const exact = new Map<string, string>()
  const stem = new Map<string, string>()

  // 1. Criteria pack first (coarser / comprehensive). Catalog overwrites the
  //    exact entries below so precise sub-code wording wins on collisions.
  for (const disorder of DISORDER_CRITERIA) {
    const cs = disorder.codingSystems
    setExact(exact, 'icd10', cs.icd10?.code, cs.icd10?.label_de)
    setExact(exact, 'icd11', cs.icd11?.code, cs.icd11?.label_de)
    setExact(exact, 'dsm', cs.dsm5tr?.code, cs.dsm5tr?.label_de)

    // Coarse stem fallback from the disorder's display name (e.g. F20 →
    // "Schizophrenie"), so an unlisted sub-code still resolves to a sensible
    // title instead of a bare code.
    setStem(stem, 'icd10', disorder.code, disorder.name_de)
    setStem(stem, 'icd10', disorder.crosswalkKey, disorder.name_de)
    if (cs.icd10?.code) setStem(stem, 'icd10', cs.icd10.code, disorder.name_de)
    if (cs.icd11?.code) setStem(stem, 'icd11', cs.icd11.code, disorder.name_de)
  }

  // 2. Curated catalog wins on exact-code collisions (most specific wording).
  for (const entry of DIAGNOSIS_CATALOG) {
    setExact(exact, 'icd10', entry.icd10.code, entry.icd10.label)
    setExact(exact, 'icd11', entry.icd11.code, entry.icd11.label)
    setExact(exact, 'dsm', entry.dsm.code, entry.dsm.label)
  }

  return { exact, stem }
}

function getIndex(): BundledIndex {
  if (!cached) cached = buildIndex()
  return cached
}

/**
 * Resolve a full, human-readable diagnosis title from bundled in-app data only.
 * Returns `null` for truly unknown codes (the caller then falls back to the
 * bare code). Pure & synchronous — never touches the network or database.
 */
export function bundledDiagnosisTitle(
  code: string,
  version: IcdTitleVersion,
): string | null {
  const trimmed = code.trim()
  if (!trimmed) return null

  const { exact, stem } = getIndex()

  const direct = exact.get(indexKey(version, trimmed))
  if (direct) return direct

  // Coarse stem fallback for ICD sub-codes not explicitly listed.
  if (version === 'icd10' || version === 'icd11') {
    const coarse = stem.get(indexKey(version, codeStem(trimmed)))
    if (coarse) return coarse
  }

  return null
}

/** Test/diagnostics helper — number of exact + stem bundled entries. */
export function bundledDiagnosisTitleCoverage(): {
  exact: number
  stem: number
} {
  const { exact, stem } = getIndex()
  return { exact: exact.size, stem: stem.size }
}
