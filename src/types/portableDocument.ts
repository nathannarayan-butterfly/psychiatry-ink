import type { TimelineSnapshot } from './timeline'

export type PortableDocumentKind = 'timeline' | 'lab'

export interface PortableDocumentPayload {
  version: 1
  kind: PortableDocumentKind
  timeline?: TimelineSnapshot
  fileName?: string
}

export const PORTABLE_PDF_ATTACHMENT = 'psychiatry-ink-data.json'
