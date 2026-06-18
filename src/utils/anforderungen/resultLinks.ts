import type { Anforderung, AnforderungResultLink } from '../../types/anforderung'
import { getAnforderungCatalogItem } from '../../data/anforderungenCatalog'
import { loadBefunde } from '../laborArchive'
import { loadDiagnostikBefunde } from '../befundArchive'
import type { BefundType } from '../../types/befund'

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
      return hasBefundType(caseId, 'eeg') ? 'documented' : 'pending'
    default:
      return 'none'
  }
}

export function diagnosticsTabForResultLink(link: AnforderungResultLink): 'labor' | 'befunde' {
  return link === 'labor' ? 'labor' : 'befunde'
}

export function befundTypeForResultLink(link: AnforderungResultLink): BefundType | null {
  if (link === 'ecg') return 'ecg'
  if (link === 'eeg') return 'eeg'
  return null
}
