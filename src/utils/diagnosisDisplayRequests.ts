import type { IcdTitleVersion } from '../../shared/icdTitle'
import { lookupCatalogLabel } from '../data/diagnosisCatalog'
import { bundledDiagnosisTitle } from '../data/bundledDiagnosisTitles'
import type { DiagnosisTitleRequest } from '../hooks/useDiagnosisDisplayTitles'
import type { CodingSystem, CodingValue, DiagnoseEntry } from './diagnosenArchive'
import { getActiveCoding } from './diagnosenArchive'
import { resolveDiagnosisDisplayTitle } from './diagnosisDisplayTitle'

export function codingSystemToTitleVersion(system: CodingSystem): IcdTitleVersion {
  return system
}

/**
 * Resolve the synchronous bundled display title for a diagnosis code — step 3 of
 * the shared resolution chain. Consults the in-app data in priority order:
 *   1. Curated catalog (precise sub-code wording, e.g. F20.0).
 *   2. Bundled criteria-pack index + coarse stem fallback (every authored code).
 *   3. A caller-supplied criteria label (contextual hint), when given.
 * Returns `null` only for truly unknown codes. NEVER touches network or DB.
 */
export function resolveDisplayCriteriaLabel(
  code: string,
  version: IcdTitleVersion,
  disorderCriteriaLabel?: string | null,
): string | null {
  const catalog = lookupCatalogLabel(code, version)
  if (catalog) return catalog
  const bundled = bundledDiagnosisTitle(code, version)
  if (bundled) return bundled
  const disorder = disorderCriteriaLabel?.trim()
  return disorder || null
}

export function buildDiagnosisTitleRequest(params: {
  key: string
  coding: Pick<CodingValue, 'code' | 'label' | 'overridden'>
  version: IcdTitleVersion
  disorderCriteriaLabel?: string | null
}): DiagnosisTitleRequest {
  const code = params.coding.code.trim()
  return {
    key: params.key,
    code,
    version: params.version,
    criteriaLabel: resolveDisplayCriteriaLabel(code, params.version, params.disorderCriteriaLabel),
    enteredLabel: params.coding.overridden ? params.coding.label : null,
    overridden: params.coding.overridden,
  }
}

export function buildDiagnosisTitleRequestFromEntry(
  entry: DiagnoseEntry,
  system: CodingSystem,
  disorderCriteriaLabel?: string | null,
): DiagnosisTitleRequest {
  return buildDiagnosisTitleRequest({
    key: entry.id,
    coding: getActiveCoding(entry, system),
    version: codingSystemToTitleVersion(system),
    disorderCriteriaLabel,
  })
}

/** Sync resolver for print/templates — catalog crosswalk + clinician override only. */
export function resolveDiagnosisLabelSync(
  coding: Pick<CodingValue, 'code' | 'label' | 'overridden'>,
  version: IcdTitleVersion = 'icd10',
  disorderCriteriaLabel?: string | null,
): string {
  return resolveDiagnosisDisplayTitle({
    criteriaLabel: resolveDisplayCriteriaLabel(coding.code, version, disorderCriteriaLabel),
    enteredLabel: coding.overridden ? coding.label : null,
    code: coding.code,
    overridden: coding.overridden,
  })
}
