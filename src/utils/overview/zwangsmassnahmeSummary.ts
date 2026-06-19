import { loadAnforderungen } from '../anforderungen/storage'

export type ZwangsmassnahmeStatus = 'beantragt' | 'genehmigt'

export interface ZwangsmassnahmeSummary {
  status: ZwangsmassnahmeStatus | null
  statusLabel: string | null
  /** True when workflow UI is not yet implemented. */
  placeholder: boolean
}

const ZWANGS_CATALOG_IDS = new Set(['sonst-fixierung'])

/**
 * Surfaces coercive-measure state from active Anforderungen until a dedicated
 * Zwangsmaßnahme workflow exists. Pending → beantragt, accepted → genehmigt.
 */
export function buildZwangsmassnahmeSummary(caseId: string): ZwangsmassnahmeSummary {
  const orders = loadAnforderungen(caseId).filter(
    (o) =>
      ZWANGS_CATALOG_IDS.has(o.catalogId) &&
      (o.status === 'pending' || o.status === 'accepted'),
  )

  if (orders.length === 0) {
    return { status: null, statusLabel: null, placeholder: false }
  }

  const hasApproved = orders.some((o) => o.status === 'accepted')
  const status: ZwangsmassnahmeStatus = hasApproved ? 'genehmigt' : 'beantragt'

  return {
    status,
    statusLabel: status === 'genehmigt' ? 'Genehmigt' : 'Beantragt',
    placeholder: true,
  }
}

export function hasZwangsmassnahmeSignal(summary: ZwangsmassnahmeSummary): boolean {
  return summary.status !== null
}
