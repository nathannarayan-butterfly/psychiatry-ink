import type { UiLanguage } from '../../types/settings'
import type { GuidedEntryAnswer } from '../../types/guidedEntry'
import { getGuidedEntrySchema } from '../../data/guidedEntry/schemas'
import { appendGuidedEntryRecord, buildGuidedEntryProvenance } from '../guidedEntry/provenance'
import { appendVerlaufEntry, type VerlaufFeedEntry } from '../verlaufFeed'
import { SOMATIC_BEFUND_PAGE_TYPE } from '../../types/somaticBefund'
import { notifyOverviewClinicalRefresh } from '../overview/overviewClinicalRefresh'
import {
  buildSomaticBefundPayload,
  valuesFromGuidedAnswers,
} from './somaticBefund'

export interface SaveSomaticBefundEntryParams {
  caseId: string
  text: string
  answers: GuidedEntryAnswer[]
  instanceId: string
  userId?: string
  language: UiLanguage
}

/** Persist a structured somatic exam as a distinct Verlauf feed entry. */
export function saveSomaticBefundEntry(params: SaveSomaticBefundEntryParams): VerlaufFeedEntry {
  const { caseId, text, answers, instanceId, userId } = params
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('Somatic Befund text must not be empty')
  }

  const schema = getGuidedEntrySchema('somatic-befund-quick')
  const values = valuesFromGuidedAnswers(answers)
  const payload = buildSomaticBefundPayload(values)
  const examDate = payload.examDate || new Date().toISOString().slice(0, 10)

  const provenance = buildGuidedEntryProvenance({
    instanceId,
    itemType: schema.itemType,
    mode: 'guided',
    userId,
    answers,
    reviewStatus: 'reviewed',
  })

  const entry = appendVerlaufEntry(caseId, {
    date: new Date(`${examDate}T12:00:00`).toISOString(),
    content: trimmed,
    pageType: SOMATIC_BEFUND_PAGE_TYPE,
    source: 'manual',
    somaticBefund: payload,
  })

  appendGuidedEntryRecord(caseId, {
    caseId,
    itemType: schema.itemType,
    provenance,
    structuredAnswers: answers,
    generatedText: trimmed,
    targetEntityId: entry.id,
  })

  notifyOverviewClinicalRefresh(caseId)

  return entry
}
