import type { DocumentSection } from '../types'
import { caseStorageKey, DEFAULT_CASE_ID, getActiveCaseId } from './caseContext'
import { getInitialEditorContent } from './workspaceComponents'

const SNAPSHOT_KEY_PREFIX = 'psychiatry-ink:notion-document'

export interface NotionDocumentSnapshot {
  documentTypeId: string
  pageHeading: string
  sectionContents: Record<string, string>
  savedAt: string
}

export function notionDocumentSnapshotKey(documentTypeId: string, caseId?: string): string {
  return caseStorageKey(`${SNAPSHOT_KEY_PREFIX}:${documentTypeId}`, caseId)
}

export function saveNotionDocumentSnapshot(
  snapshot: NotionDocumentSnapshot,
  caseId?: string,
): void {
  try {
    localStorage.setItem(
      notionDocumentSnapshotKey(snapshot.documentTypeId, caseId),
      JSON.stringify(snapshot),
    )
  } catch {
    // ignore quota errors
  }
}

function legacyDocumentSnapshotKey(documentTypeId: string): string {
  return `psychiatry-ink:notion-document:${documentTypeId}`
}

export function loadNotionDocumentSnapshot(documentTypeId: string, caseId?: string): NotionDocumentSnapshot | null {
  try {
    let raw = localStorage.getItem(notionDocumentSnapshotKey(documentTypeId, caseId))
    if (!raw && (caseId ?? getActiveCaseId()) === DEFAULT_CASE_ID) {
      raw = localStorage.getItem(legacyDocumentSnapshotKey(documentTypeId))
    }
    if (!raw) return null
    return JSON.parse(raw) as NotionDocumentSnapshot
  } catch {
    return null
  }
}

function getSectionCopyText(
  section: DocumentSection,
  sectionContents: Record<string, string>,
  sectionConfigs?: DocumentSection[],
): string {
  const config = sectionConfigs?.find((item) => item.id === section.id)
  return getInitialEditorContent(
    sectionContents[section.id],
    config?.prefilledText ?? section.prefilledText,
  ).trim()
}

function buildDocumentText(
  sections: DocumentSection[],
  sectionContents: Record<string, string>,
  pageHeading: string,
  sectionConfigs?: DocumentSection[],
): string {
  const blocks: string[] = []
  if (pageHeading.trim()) blocks.push(pageHeading.trim())

  for (const section of sections) {
    const content = getSectionCopyText(section, sectionContents, sectionConfigs)
    if (!content) continue
    blocks.push(`${section.label}\n${content}`)
  }

  return blocks.join('\n\n')
}

export interface NotionDocumentCopyOptions {
  sectionConfigs?: DocumentSection[]
  /** Used when there are no sections (single-field documents) or all sections are empty. */
  fallbackContent?: string
}

/** Clinical document text for clipboard: section labels + content, no page heading. */
export function getNotionDocumentCopyText(
  sections: DocumentSection[],
  sectionContents: Record<string, string>,
  options?: NotionDocumentCopyOptions,
): string {
  const sectionConfigs = options?.sectionConfigs ?? sections
  const blocks: string[] = []

  for (const section of sections) {
    const content = getSectionCopyText(section, sectionContents, sectionConfigs)
    if (!content) continue
    blocks.push(`${section.label}\n${content}`)
  }

  if (blocks.length > 0) return blocks.join('\n\n')
  return options?.fallbackContent?.trim() ?? ''
}

export function getNotionSectionCopyText(
  section: DocumentSection,
  sectionContents: Record<string, string>,
  sectionConfigs?: DocumentSection[],
): string {
  return getSectionCopyText(section, sectionContents, sectionConfigs)
}

function copyTextWithExecCommand(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  return copied
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text.trim()) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return copyTextWithExecCommand(text)
  }
}

export function printNotionDocument(
  title: string,
  sections: DocumentSection[],
  sectionContents: Record<string, string>,
  pageHeading: string,
): void {
  const body = buildDocumentText(sections, sectionContents, pageHeading, sections)
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.6; margin: 2cm; color: #111; }
    h1 { font-size: 18pt; font-weight: 600; margin: 0 0 1.2rem; }
    h2 { font-size: 11pt; font-weight: 600; margin: 1.4rem 0 0.4rem; text-transform: uppercase; letter-spacing: 0.04em; }
    pre { white-space: pre-wrap; font-family: inherit; margin: 0 0 0.8rem; }
  </style>
</head>
<body>
  ${pageHeading.trim() ? `<h1>${escapeHtml(pageHeading.trim())}</h1>` : ''}
  ${sections
    .map((section) => {
      const content = getInitialEditorContent(
        sectionContents[section.id],
        section.prefilledText,
      ).trim()
      if (!content) return ''
      return `<h2>${escapeHtml(section.label)}</h2><pre>${escapeHtml(content)}</pre>`
    })
    .join('')}
  ${!pageHeading.trim() && !body ? `<p>${escapeHtml(title)}</p>` : ''}
</body>
</html>`

  const printWindow = window.open('', '_blank', 'noopener,noreferrer')
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

export function exportNotionDocument(
  fileName: string,
  sections: DocumentSection[],
  sectionContents: Record<string, string>,
  pageHeading: string,
): void {
  const text = buildDocumentText(sections, sectionContents, pageHeading, sections)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`
  anchor.click()
  URL.revokeObjectURL(url)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
