import type { UiLanguage } from '../../types/settings'
import {
  inferDokumentCategory,
  upsertDokumentDraft,
  type DokumentEntry,
} from '../dokumenteArchive'
import { mergeAnamneseSectionContents } from './parseSections'

export interface WorkspaceDocumentArchiveInput {
  caseId: string
  documentTypeId: string
  title: string
  sectionContents: Record<string, string>
  editorContent: string
  source: DokumentEntry['source']
  language?: UiLanguage
  /** Id of the existing archived document being edited (update in place, Item 15). */
  existingId?: string
}

export function buildWorkspaceDocumentArchiveContent(input: WorkspaceDocumentArchiveInput): {
  content: string
  sectionContents: Record<string, string>
} | null {
  const category = inferDokumentCategory(input.documentTypeId)
  if (!category) return null

  const structured = Object.fromEntries(
    Object.entries(input.sectionContents).filter(([, value]) => value?.trim()),
  )
  const joinedStructured = Object.values(structured).join('\n\n').trim()
  const fallback = input.editorContent.trim()
  const rawContent = joinedStructured || fallback
  if (!rawContent) return null

  let sectionContents =
    input.documentTypeId === 'aufnahme'
      ? mergeAnamneseSectionContents(structured, rawContent, input.language ?? 'de')
      : structured

  // For Aufnahme: only use section-split result when ≥ 2 distinct sections were
  // found AND they collectively cover ≥ 80 % of the raw content. Otherwise fall
  // back to saving the full text as a single unsplit document so that no content
  // is ever silently discarded or misattributed to the wrong section.
  if (input.documentTypeId === 'aufnahme') {
    const sectionKeys = Object.keys(sectionContents)
    const sectionText = Object.values(sectionContents).join('\n\n').trim()
    const coverage = rawContent.length > 0 ? sectionText.length / rawContent.length : 0
    if (sectionKeys.length < 2 || coverage < 0.8) {
      sectionContents = {}
    }
  }

  const content =
    Object.keys(sectionContents).length > 0
      ? Object.values(sectionContents).join('\n\n').trim()
      : rawContent

  return { content, sectionContents }
}

export function syncWorkspaceDocumentToArchive(
  input: WorkspaceDocumentArchiveInput,
): DokumentEntry | null {
  const built = buildWorkspaceDocumentArchiveContent(input)
  if (!built) return null

  const category = inferDokumentCategory(input.documentTypeId)
  if (!category) return null

  return upsertDokumentDraft(
    input.caseId,
    {
      category,
      title: input.title.trim() || input.documentTypeId,
      content: built.content,
      date: new Date().toISOString(),
      source: input.source,
      pageType: input.documentTypeId,
      sectionContents:
        Object.keys(built.sectionContents).length > 0 ? built.sectionContents : undefined,
    },
    input.existingId,
  )
}
