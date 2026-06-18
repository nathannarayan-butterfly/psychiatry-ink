/**
 * Butterfly criteria — version (ICD-10 ↔ ICD-11) resolver.
 *
 * The Diagnosen widget lets the clinician pick a coding system per case
 * (`'icd10' | 'icd11' | 'dsm'`, see `utils/diagnosenCodingSystem`). Butterfly
 * authors a single ICD-10-structured criteria tree per disorder, plus an OPTIONAL
 * distinct ICD-11 tree (`Disorder.icd11`). This module maps the clinician's
 * coding-system choice to the criteria tree the deterministic evaluator should
 * use, falling back to the ICD-10 tree whenever an ICD-11 set is not authored.
 *
 * COMPOSITION ORDER (important):
 *   resolveDisorderForCodingSystem(disorder, version)   // pick the version's tree
 *     → getLocalizedDisorder(resolved, language)          // then localize strings
 *
 * The version resolver runs FIRST. Because every ICD-11 group/criterion id is
 * globally unique and distinct from the ICD-10 ids, the language resolver finds
 * the right translations in the same flat i18n maps without any change. The
 * disorder `name_de` and `differentials_de` are shared across versions, so their
 * translations stay valid in both modes.
 */

import type { CodingSystem } from '../../utils/diagnosenArchive'
import type { Disorder } from './schema'

/** The two coding systems Butterfly authors criteria for. */
export type ButterflyIcdVersion = 'icd10' | 'icd11'

/**
 * Map a Diagnosen coding-system choice to a Butterfly criteria version.
 *
 * `'dsm'` maps to `'icd10'`: Butterfly intentionally encodes NO DSM criterion
 * text (DSM is kept as a code/label crosswalk only), so DSM mode reuses the
 * ICD-10-structured operationalization. Documented here, not silently dropped.
 */
export function toButterflyIcdVersion(system: CodingSystem): ButterflyIcdVersion {
  return system === 'icd11' ? 'icd11' : 'icd10'
}

/** True when a distinct ICD-11 criteria tree is authored for this disorder. */
export function hasDistinctIcd11(disorder: Disorder): boolean {
  return Boolean(disorder.icd11 && disorder.icd11.groups.length > 0)
}

/**
 * Return the {@link Disorder} view for a chosen ICD version.
 *
 *  - `'icd10'` (or any disorder lacking an ICD-11 set) → the source disorder,
 *    returned UNCHANGED (referential identity preserved, so ICD-10/DE behaviour
 *    is byte-identical).
 *  - `'icd11'` with an authored `disorder.icd11` → a shallow copy whose
 *    `groups` are the ICD-11 tree, `classification` is `'icd11'`, `code` is the
 *    ICD-11 code (for display/advice), and `sourceRef` is the ICD-11 citation
 *    (falling back to the disorder's `sourceRef`). `name_de` and
 *    `differentials_de` are intentionally shared across versions.
 */
export function resolveDisorderForCodingSystem(
  disorder: Disorder,
  version: ButterflyIcdVersion,
): Disorder {
  if (version !== 'icd11' || !hasDistinctIcd11(disorder)) return disorder
  const icd11 = disorder.icd11!
  return {
    ...disorder,
    classification: 'icd11',
    code: disorder.codingSystems.icd11?.code ?? disorder.code,
    sourceRef: icd11.sourceRef ?? disorder.sourceRef,
    groups: icd11.groups,
  }
}
