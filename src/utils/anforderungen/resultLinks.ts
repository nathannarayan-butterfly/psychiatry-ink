import type { Anforderung, AnforderungResultLink } from '../../types/anforderung'
import { getAnforderungCatalogItem } from '../../data/anforderungenCatalog'
import { loadBefunde } from '../laborArchive'
import { loadDiagnostikBefunde } from '../befundArchive'
import { hasFreeTextBefund } from '../freeTextBefundArchive'
import type { BefundType } from '../../types/befund'
import type { DiagnosticsSectionId } from '../../data/diagnosticsSections'

export type AnforderungResultState = 'none' | 'pending' | 'documented'

export function resolveResultLink(catalogId: string): AnforderungResultLink | undefined {
  return getAnforderungCatalogItem(catalogId)?.resultLink
}

function hasLaborResult(caseId: string): boolean {
  return loadBefunde(caseId).length > 0
}

function hasBefundType(caseId: string, type: BefundType): boolean {
  return loadDiagnostikBefunde(caseId).some((r) => r.type === type)
}

/** Whether a linked diagnostic result has been documented for this order. */
export function resolveAnforderungResultState(
  caseId: string,
  order: Anforderung,
): AnforderungResultState {
  const link = resolveResultLink(order.catalogId)
  if (!link) return 'none'
  if (order.status !== 'accepted' && order.status !== 'pending') return 'none'

  switch (link) {
    case 'labor':
      return hasLaborResult(caseId) ? 'documented' : 'pending'
    case 'ecg':
      return hasBefundType(caseId, 'ecg') ? 'documented' : 'pending'
    case 'eeg':
      // EEG can be documented either via the structured Befundung workspace or
      // the free-text EEG section in the Diagnostik module.
      return hasBefundType(caseId, 'eeg') || hasFreeTextBefund(caseId, 'eeg')
        ? 'documented'
        : 'pending'
    case 'cct':
      return hasFreeTextBefund(caseId, 'cct') ? 'documented' : 'pending'
    case 'mrt':
      return hasFreeTextBefund(caseId, 'mrt') ? 'documented' : 'pending'
    case 'roentgen':
      return hasBefundType(caseId, 'roentgen') ? 'documented' : 'pending'
    default:
      return 'none'
  }
}

/** Diagnostik section that documents a given result link. */
export function diagnosticsTabForResultLink(
  link: AnforderungResultLink,
): DiagnosticsSectionId {
  switch (link) {
    case 'labor':
      return 'labor'
    case 'ecg':
      return 'ekg'
    case 'eeg':
      return 'eeg'
    case 'cct':
    case 'mrt':
    case 'roentgen':
      return 'imaging'
    default:
      return 'labor'
  }
}

export function befundTypeForResultLink(link: AnforderungResultLink): BefundType | null {
  if (link === 'ecg') return 'ecg'
  if (link === 'eeg') return 'eeg'
  if (link === 'roentgen') return 'roentgen'
  return null
}
