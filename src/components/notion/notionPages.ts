export type NotionPageId =
  | 'aufnahme'
  | 'verlauf'
  | 'psychopath'
  | 'therapie-verlauf'
  | 'medikation'
  | 'therapieplanung'
  | 'labor'
  | 'visualisation'
  | 'befundung'
  | 'arztbrief'
  | 'discharge-summary'
  | 'timeline'

export type NotionPageKind = 'document' | 'lab'

export interface NotionPageConfig {
  id: NotionPageId
  labelKey:
    | 'notionPageAufnahme'
    | 'notionPageVerlauf'
    | 'notionPagePsychopath'
    | 'notionPageTherapieVerlauf'
    | 'notionPageMedikation'
    | 'notionPageTherapieplanung'
    | 'notionPageLabor'
    | 'notionPageVisualisation'
    | 'notionPageBefundung'
    | 'notionPageArztbrief'
    | 'notionPageDischargeSummary'
    | 'notionPageTimeline'
  kind: NotionPageKind
  documentTypeId?: string
}

export const NOTION_PAGES: NotionPageConfig[] = [
  { id: 'aufnahme', labelKey: 'notionPageAufnahme', kind: 'document', documentTypeId: 'aufnahme' },
  { id: 'verlauf', labelKey: 'notionPageVerlauf', kind: 'document', documentTypeId: 'verlauf' },
  {
    id: 'psychopath',
    labelKey: 'notionPagePsychopath',
    kind: 'document',
    documentTypeId: 'psychopath',
  },
  {
    id: 'therapie-verlauf',
    labelKey: 'notionPageTherapieVerlauf',
    kind: 'document',
    documentTypeId: 'therapie-verlauf',
  },
  {
    id: 'medikation',
    labelKey: 'notionPageMedikation',
    kind: 'document',
    documentTypeId: 'medikation',
  },
  {
    id: 'therapieplanung',
    labelKey: 'notionPageTherapieplanung',
    kind: 'document',
    documentTypeId: 'therapieplanung',
  },
  { id: 'labor', labelKey: 'notionPageLabor', kind: 'lab' },
  { id: 'visualisation', labelKey: 'notionPageVisualisation', kind: 'lab' },
  { id: 'befundung', labelKey: 'notionPageBefundung', kind: 'lab' },
  { id: 'arztbrief', labelKey: 'notionPageArztbrief', kind: 'lab' },
  { id: 'discharge-summary', labelKey: 'notionPageDischargeSummary', kind: 'lab' },
  { id: 'timeline', labelKey: 'notionPageTimeline', kind: 'lab' },
]

/**
 * Document types whose saves are appended to the Verlauf feed as manual entries.
 * Shared between the Workspace save flow (NotionApp) and the Verlauf feed
 * "Neuer Eintrag" composer so both offer the same entry-type options and stay
 * consistent going forward.
 */
export const VERLAUF_DOCUMENT_TYPES = ['verlauf', 'therapie-verlauf'] as const

export type VerlaufDocumentType = (typeof VERLAUF_DOCUMENT_TYPES)[number]

export interface VerlaufEntryTypeOption {
  id: VerlaufDocumentType
  labelKey: NotionPageConfig['labelKey']
  /**
   * Mirrors the Workspace save flow: therapist attribution is attached only for
   * the Arztbrief / Therapie-Verlauf type, not for plain Verlaufsdokumentation.
   */
  attachAttribution: boolean
}

/** Entry-type options offered by the Verlauf feed composer, in display order. */
export const VERLAUF_ENTRY_TYPE_OPTIONS: VerlaufEntryTypeOption[] = [
  { id: 'verlauf', labelKey: 'notionPageVerlauf', attachAttribution: false },
  { id: 'therapie-verlauf', labelKey: 'notionPageTherapieVerlauf', attachAttribution: true },
]

/** True when the given document type id is appended to the Verlauf feed. */
export function isVerlaufDocumentType(
  documentTypeId: string,
): documentTypeId is VerlaufDocumentType {
  return (VERLAUF_DOCUMENT_TYPES as readonly string[]).includes(documentTypeId)
}

export function isToolPage(pageId: NotionPageId): boolean {
  return (
    pageId === 'labor' ||
    pageId === 'visualisation' ||
    pageId === 'befundung' ||
    pageId === 'arztbrief' ||
    pageId === 'discharge-summary' ||
    pageId === 'timeline'
  )
}

/** @deprecated Use isToolPage */
export function isLabPage(pageId: NotionPageId): boolean {
  return isToolPage(pageId)
}

export function resolveNotionPageFromDocumentType(documentTypeId: string): NotionPageId {
  if (!documentTypeId.trim()) return 'aufnahme'
  const match = NOTION_PAGES.find(
    (page) => page.kind === 'document' && page.documentTypeId === documentTypeId,
  )
  return match?.id ?? 'aufnahme'
}

/** True when the workspace tab shows an open document or tool view (not the default home). */
export function isWorkspacePageOpen(
  activePage: NotionPageId,
  selectedDocumentType: string,
): boolean {
  return Boolean(selectedDocumentType.trim()) || isToolPage(activePage)
}
