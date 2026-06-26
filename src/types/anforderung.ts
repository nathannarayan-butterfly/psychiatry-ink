import type { UiLanguage } from './settings'

export const ANFORDERUNG_VERSION = 1

export type AnforderungCategory = 'labor' | 'befunde' | 'therapien' | 'sonstiges'

/** Opens the create-order modal with a category, optional group filter, and pre-selected items. */
export interface AnforderungModalPreset {
  category: AnforderungCategory
  groupKey?: string
  selectedCatalogIds?: string[]
}

export type AnforderungUrgency = 'routine' | 'soon' | 'urgent'

export type AnforderungStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

/** Maps to existing diagnostics modules when a result can be documented. */
export type AnforderungResultLink = 'labor' | 'ecg' | 'eeg' | 'cct' | 'mrt'

export interface AnforderungCatalogItem {
  id: string
  category: AnforderungCategory
  /** UI grouping within category (e.g. labor sub-panel). */
  groupKey: string
  label_de: string
  label_en: string
  label_fr: string
  label_es: string
  defaultUrgency: AnforderungUrgency
  /** When true, org/praxis orders start pending until an acceptor approves. */
  requiresAcceptance: boolean
  resultLink?: AnforderungResultLink
}

export interface Anforderung {
  id: string
  caseId: string
  catalogId: string
  category: AnforderungCategory
  /** Snapshot of the catalog label at order time (language of creator). */
  label: string
  note?: string
  urgency: AnforderungUrgency
  /** Preferred execution date (ISO date YYYY-MM-DD). */
  requestedDate?: string
  status: AnforderungStatus
  createdAt: string
  updatedAt: string
  createdByUserId?: string
  createdByDisplayName?: string
  reviewedAt?: string
  reviewedByUserId?: string
  reviewedByDisplayName?: string
  reviewComment?: string
}

export function catalogItemLabel(item: AnforderungCatalogItem, language: UiLanguage): string {
  switch (language) {
    case 'en':
      return item.label_en
    case 'fr':
      return item.label_fr
    case 'es':
      return item.label_es
    default:
      return item.label_de
  }
}

export function isActiveAnforderung(order: Anforderung): boolean {
  return order.status === 'pending' || order.status === 'accepted'
}

export function countPendingAnforderungen(orders: Anforderung[]): number {
  return orders.filter((o) => o.status === 'pending').length
}
