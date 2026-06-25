import type { UiLanguage } from '../../types/settings'
import type {
  GuidedEntryAnswer,
  GuidedEntryFieldValues,
  GuidedEntryItemType,
  GuidedEntryMode,
  GuidedEntrySchema,
} from '../../types/guidedEntry'
import type { BefundRecord } from '../../types/befund'
import { getBefundSchema } from '../../data/befundSchemas'
import { appendVerlaufEntry } from '../verlaufFeed'
import { createBefundRecord, upsertDiagnostikBefund } from '../befundArchive'
import { syncBefundDokument } from '../befundDokumente'
import { appendGuidedEntryRecord, buildGuidedEntryProvenance } from './provenance'
import {
  getGuidedEntrySchema,
  resolveGuidedItemTypeFromWorkspace as resolveItemType,
} from '../../data/guidedEntry/schemas'

export interface ApplyGuidedOutputParams {
  caseId: string
  schema: GuidedEntrySchema
  text: string
  answers: GuidedEntryAnswer[]
  instanceId: string
  mode: GuidedEntryMode
  userId?: string
  language: UiLanguage
}

export interface ApplyGuidedOutputResult {
  targetEntityId?: string
  navigate?: {
    pageId: string
    variantId?: string
    sectionId?: string
  }
  /** Content to inject into workspace editor after navigation. */
  workspaceContent?: string
  workspaceSectionContents?: Record<string, string>
}

function mapAnswersToBefundFields(
  schema: GuidedEntrySchema,
  values: GuidedEntryFieldValues,
): Record<string, string | string[] | boolean> {
  const out: Record<string, string | string[] | boolean> = {}
  for (const field of schema.fields) {
    const v = values[field.id]
    if (v === undefined) continue
    out[field.id] = v
  }
  return out
}

function valuesFromAnswers(answers: GuidedEntryAnswer[]): GuidedEntryFieldValues {
  const values: GuidedEntryFieldValues = {}
  for (const a of answers) values[a.fieldId] = a.value
  return values
}

export function applyGuidedOutput(params: ApplyGuidedOutputParams): ApplyGuidedOutputResult {
  const { caseId, schema, text, answers, instanceId, mode, userId, language } = params
  const values = valuesFromAnswers(answers)
  const output = schema.output

  const provenance = buildGuidedEntryProvenance({
    instanceId,
    itemType: schema.itemType,
    mode,
    userId,
    answers,
    reviewStatus: 'reviewed',
  })

  if (output.kind === 'verlauf-feed') {
    const entry = appendVerlaufEntry(caseId, {
      date: new Date().toISOString(),
      content: text,
      pageType: output.verlaufPageType ?? 'verlauf',
      source: 'manual',
    })
    appendGuidedEntryRecord(caseId, {
      caseId,
      itemType: schema.itemType,
      provenance,
      structuredAnswers: answers,
      generatedText: text,
      targetEntityId: entry.id,
    })
    return { targetEntityId: entry.id }
  }

  if (output.kind === 'befund-record' && output.befundType) {
    const befundSchema = getBefundSchema(output.befundType, language)
    const fieldValues = mapAnswersToBefundFields(schema, values)
    fieldValues.narrative = text
    const record: BefundRecord = {
      ...createBefundRecord(caseId, output.befundType, befundSchema.version, fieldValues, 'draft'),
      examDate: String(values.examDate ?? new Date().toISOString().slice(0, 10)),
    }
    upsertDiagnostikBefund(caseId, record)
    syncBefundDokument(record, language)
    appendGuidedEntryRecord(caseId, {
      caseId,
      itemType: schema.itemType,
      provenance,
      structuredAnswers: answers,
      generatedText: text,
      targetEntityId: record.id,
    })
    return { targetEntityId: record.id }
  }

  if (output.kind === 'workspace-section') {
    appendGuidedEntryRecord(caseId, {
      caseId,
      itemType: schema.itemType,
      provenance,
      structuredAnswers: answers,
      generatedText: text,
      targetEntityId: `${output.documentTypeId}:${output.sectionId}`,
    })
    return {
      navigate: {
        pageId: output.documentTypeId ?? 'verlauf',
        variantId: output.variantId,
        sectionId: output.sectionId,
      },
      workspaceSectionContents: output.sectionId ? { [output.sectionId]: text } : undefined,
      workspaceContent: text,
    }
  }

  // workspace-document (default)
  appendGuidedEntryRecord(caseId, {
    caseId,
    itemType: schema.itemType,
    provenance,
    structuredAnswers: answers,
    generatedText: text,
    targetEntityId: output.documentTypeId,
  })

  return {
    navigate: {
      pageId: output.documentTypeId ?? 'verlauf',
      variantId: output.variantId,
    },
    workspaceContent: text,
  }
}

export { resolveGuidedItemTypeFromWorkspace } from '../../data/guidedEntry/schemas'

export function isGuidedEntryAvailable(itemType: GuidedEntryItemType): boolean {
  try {
    getGuidedEntrySchema(itemType)
    return true
  } catch {
    return false
  }
}

export function resolveGuidedItemTypeForWorkspace(
  pageId: string,
  variantId?: string,
  sectionId?: string,
): GuidedEntryItemType | null {
  return resolveItemType(pageId, variantId, sectionId)
}
