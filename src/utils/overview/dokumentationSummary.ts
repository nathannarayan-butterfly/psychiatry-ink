import type { UiTranslationKey } from '../../data/uiTranslations'
import { getCategoryLabelKey } from '../../data/dokumenteCategories'
import type { DokumentEntry } from '../dokumenteArchive'
import { loadDokumente } from '../dokumenteArchive'
import { formatDateDe } from './dateLabels'

export interface DokumentationEntryItem {
  id: string
  title: string
  categoryKey: UiTranslationKey
  dateLabel: string
  isDraft: boolean
}

export interface DokumentationSummaryData {
  draftCount: number
  recent: DokumentationEntryItem[]
  totalCount: number
}

function mapEntry(entry: DokumentEntry): DokumentationEntryItem {
  return {
    id: entry.id,
    title: entry.title.trim() || entry.pageType,
    categoryKey: getCategoryLabelKey(entry.category),
    dateLabel: formatDateDe(entry.date) ?? entry.date,
    isDraft: entry.source === 'draft',
  }
}

/** Recent formal documents and draft count for the Übersicht Dokumentation widget. */
export function buildDokumentationSummary(caseId: string, limit = 4): DokumentationSummaryData {
  const entries = loadDokumente(caseId)
  const drafts = entries.filter((e) => e.source === 'draft')
  const saved = entries.filter((e) => e.source !== 'draft')
  const recent = [...drafts, ...saved].slice(0, limit).map(mapEntry)
  return {
    draftCount: drafts.length,
    recent,
    totalCount: entries.length,
  }
}
