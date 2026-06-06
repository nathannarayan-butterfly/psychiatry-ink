export type NotionPageId =
  | 'aufnahme'
  | 'verlauf'
  | 'psychopath'
  | 'therapie-verlauf'
  | 'medikation'
  | 'therapieplanung'
  | 'labor'
  | 'visualisation'
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
  { id: 'timeline', labelKey: 'notionPageTimeline', kind: 'lab' },
]

export function isToolPage(pageId: NotionPageId): boolean {
  return pageId === 'labor' || pageId === 'visualisation' || pageId === 'timeline'
}

/** @deprecated Use isToolPage */
export function isLabPage(pageId: NotionPageId): boolean {
  return isToolPage(pageId)
}

export function resolveNotionPageFromDocumentType(documentTypeId: string): NotionPageId {
  const match = NOTION_PAGES.find(
    (page) => page.kind === 'document' && page.documentTypeId === documentTypeId,
  )
  return match?.id ?? 'aufnahme'
}
