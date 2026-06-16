import { loadVerlaufFeed } from '../verlaufFeed'
import {
  clinicalEventTime,
  collectClinicalFeedEvents,
  translateClinicalEventSource,
} from '../verlauf/clinicalEvents'
import type { UiLanguage } from '../../types/settings'
import { formatDateDe } from './dateLabels'
import type { RecentVerlaufItem } from '../../components/notion/overview/types'

function clamp(text: string, max = 180): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed
}

/**
 * Latest N course entries for the overview, merging manually-typed Verlauf
 * entries with derived clinical events (medication / therapy changes), newest
 * first — mirroring the full Verlauf feed's merge so the at-a-glance excerpt
 * stays consistent with the page it links to.
 */
export function getRecentVerlauf(
  caseId: string,
  language: UiLanguage,
  limit = 4,
): RecentVerlaufItem[] {
  const manual = loadVerlaufFeed(caseId).map((entry) => ({
    id: entry.id,
    ts: clinicalEventTime(entry.date),
    date: entry.date,
    text: clamp(entry.content),
    sourceLabel: entry.pageType === 'therapie-verlauf' ? 'Therapie' : 'Verlauf',
    isManual: true,
  }))

  const derived = collectClinicalFeedEvents(caseId, language).map((event) => ({
    id: event.id,
    ts: clinicalEventTime(event.date),
    date: event.date,
    text: clamp(event.body ? `${event.title}: ${event.body}` : event.title),
    sourceLabel: translateClinicalEventSource(language, event.source),
    isManual: false,
  }))

  return [...manual, ...derived]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit)
    .map(({ id, date, text, sourceLabel, isManual }) => ({
      id,
      dateLabel: formatDateDe(date) ?? date,
      text,
      sourceLabel,
      isManual,
    }))
}
