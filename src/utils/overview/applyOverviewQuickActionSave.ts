import type { UiLanguage } from '../../types/settings'
import type { GuidedEntryAnswer, GuidedEntrySchema } from '../../types/guidedEntry'
import { appendVerlaufEntry } from '../verlaufFeed'
import { loadNotionDocumentSnapshot, saveNotionDocumentSnapshot } from '../notionDocumentActions'
import { savePsychopathFindingEdit } from './psychopathFindingOps'
import { notifyOverviewClinicalRefresh } from './overviewClinicalRefresh'
import { appendGuidedEntryRecord, buildGuidedEntryProvenance } from '../guidedEntry/provenance'

export interface ApplyOverviewQuickActionParams {
  caseId: string
  schema: GuidedEntrySchema
  text: string
  answers: GuidedEntryAnswer[]
  instanceId: string
  userId?: string
  language: UiLanguage
}

function mergeWorkspaceSection(
  caseId: string,
  documentTypeId: string,
  sectionId: string,
  newContent: string,
): void {
  const existing = loadNotionDocumentSnapshot(documentTypeId, caseId)
  const prior = existing?.sectionContents[sectionId]?.trim() ?? ''
  const merged = prior ? `${prior}\n\n---\n\n${newContent}` : newContent
  saveNotionDocumentSnapshot(
    {
      documentTypeId,
      pageHeading: existing?.pageHeading ?? '',
      sectionContents: {
        ...(existing?.sectionContents ?? {}),
        [sectionId]: merged,
      },
      savedAt: new Date().toISOString(),
    },
    caseId,
  )
}

function syncPsychopathWorkspaceDocument(caseId: string, text: string): void {
  const existing = loadNotionDocumentSnapshot('psychopath', caseId)
  saveNotionDocumentSnapshot(
    {
      documentTypeId: 'psychopath',
      pageHeading: existing?.pageHeading ?? '',
      sectionContents: {
        ...(existing?.sectionContents ?? {}),
        free: text,
      },
      savedAt: new Date().toISOString(),
    },
    caseId,
  )
}

/** Persist guided quick-action output in-place — no workspace navigation. */
export function applyOverviewQuickActionSave(params: ApplyOverviewQuickActionParams): void {
  const { caseId, schema, text, answers, instanceId, userId, language: _language } = params
  const trimmed = text.trim()
  if (!trimmed) return

  const provenance = buildGuidedEntryProvenance({
    instanceId,
    itemType: schema.itemType,
    mode: 'guided',
    userId,
    answers,
    reviewStatus: 'reviewed',
  })

  const output = schema.output

  if (output.kind === 'verlauf-feed') {
    const entry = appendVerlaufEntry(caseId, {
      date: new Date().toISOString(),
      content: trimmed,
      pageType: output.verlaufPageType ?? 'verlauf',
      source: 'manual',
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
    return
  }

  if (output.kind === 'psychopath-overview') {
    const examDate =
      typeof answers.find((a) => a.fieldId === 'examDate')?.value === 'string'
        ? String(answers.find((a) => a.fieldId === 'examDate')!.value)
        : new Date().toISOString().slice(0, 10)

    savePsychopathFindingEdit({
      caseId,
      text: trimmed,
      clinicalDate: examDate,
    })
    syncPsychopathWorkspaceDocument(caseId, trimmed)
    appendGuidedEntryRecord(caseId, {
      caseId,
      itemType: schema.itemType,
      provenance,
      structuredAnswers: answers,
      generatedText: trimmed,
      targetEntityId: 'psychopath',
    })
    notifyOverviewClinicalRefresh(caseId)
    return
  }

  if (output.kind === 'workspace-section' && output.documentTypeId && output.sectionId) {
    mergeWorkspaceSection(caseId, output.documentTypeId, output.sectionId, trimmed)
    appendGuidedEntryRecord(caseId, {
      caseId,
      itemType: schema.itemType,
      provenance,
      structuredAnswers: answers,
      generatedText: trimmed,
      targetEntityId: `${output.documentTypeId}:${output.sectionId}`,
    })
    notifyOverviewClinicalRefresh(caseId)
  }
}
