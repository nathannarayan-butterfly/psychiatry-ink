import type { GuidedEntryAnswer } from '../../types/guidedEntry'
import { appendGuidedEntryRecord, buildGuidedEntryProvenance } from '../guidedEntry/provenance'
import { appendVerlaufEntry, type VerlaufFeedEntry } from '../verlaufFeed'
import { notifyOverviewClinicalRefresh } from '../overview/overviewClinicalRefresh'

export interface SaveVitalsEntryParams {
  caseId: string
  text: string
  answers: GuidedEntryAnswer[]
  instanceId: string
  userId?: string
}

/** Persist a focused vital-signs entry as a normal Verlauf feed entry (Item 5). */
export function saveVitalsEntry(params: SaveVitalsEntryParams): VerlaufFeedEntry {
  const { caseId, text, answers, instanceId, userId } = params
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('Vitals text must not be empty')
  }

  const examAnswer = answers.find((answer) => answer.fieldId === 'examDate')
  const examDate =
    typeof examAnswer?.value === 'string' && examAnswer.value.trim()
      ? examAnswer.value.trim()
      : new Date().toISOString().slice(0, 10)

  const provenance = buildGuidedEntryProvenance({
    instanceId,
    itemType: 'vitalwerte-quick',
    mode: 'guided',
    userId,
    answers,
    reviewStatus: 'reviewed',
  })

  const entry = appendVerlaufEntry(caseId, {
    date: new Date(`${examDate}T12:00:00`).toISOString(),
    content: trimmed,
    pageType: 'verlauf',
    source: 'manual',
  })

  appendGuidedEntryRecord(caseId, {
    caseId,
    itemType: 'vitalwerte-quick',
    provenance,
    structuredAnswers: answers,
    generatedText: trimmed,
    targetEntityId: entry.id,
  })

  notifyOverviewClinicalRefresh(caseId)

  return entry
}
