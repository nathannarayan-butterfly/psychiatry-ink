import type { DocumentSection } from '../types'
import { caseStorageKey, DEFAULT_CASE_ID, getActiveCaseId } from './caseContext'
import { scheduleDocumentSnapshotImprints } from './clinicalImprint'
import { readOrMigrateEncryptedJson, writeEncryptedJson } from './encryptedLocalStore'
import { getInitialEditorContent } from './workspaceComponents'
import { FONT_SANS } from '../styles/typographyTokens'

const SNAPSHOT_KEY_PREFIX = 'psychiatry-ink:notion-document'

export interface NotionDocumentSnapshot {
  documentTypeId: string
  pageHeading: string
  sectionContents: Record<string, string>
  savedAt: string
}

/**
 * Synchronous decrypted mirror of the encrypted-at-rest localStorage durability copy, keyed
 * by the full storage key. Document section text is the largest PHI exposure, so the on-disk
 * bytes are ciphertext while reads stay synchronous against this shadow. Filled by
 * `hydrateNotionDocumentsFromEncryptedLocal` (vault mount) and by `saveNotionDocumentSnapshot`.
 */
const localShadow = new Map<string, NotionDocumentSnapshot>()

export function notionDocumentSnapshotKey(documentTypeId: string, caseId?: string): string {
  return caseStorageKey(`${SNAPSHOT_KEY_PREFIX}:${documentTypeId}`, caseId)
}

export function saveNotionDocumentSnapshot(
  snapshot: NotionDocumentSnapshot,
  caseId?: string,
): void {
  const storageCaseId = caseId ?? getActiveCaseId()
  const key = notionDocumentSnapshotKey(snapshot.documentTypeId, caseId)
  localShadow.set(key, snapshot)
  // Persist the durability copy encrypted-at-rest (async, best-effort).
  void writeEncryptedJson(key, snapshot)
  scheduleDocumentSnapshotImprints(storageCaseId, snapshot)
}

function legacyDocumentSnapshotKey(documentTypeId: string): string {
  return `psychiatry-ink:notion-document:${documentTypeId}`
}

export function loadNotionDocumentSnapshot(documentTypeId: string, caseId?: string): NotionDocumentSnapshot | null {
  const snapshot = localShadow.get(notionDocumentSnapshotKey(documentTypeId, caseId))
  if (snapshot) return snapshot
  if ((caseId ?? getActiveCaseId()) === DEFAULT_CASE_ID) {
    return localShadow.get(legacyDocumentSnapshotKey(documentTypeId)) ?? null
  }
  return null
}

/** Drop a snapshot from the shadow + ciphertext store (used when the vault has none). */
export function removeNotionDocumentSnapshot(documentTypeId: string, caseId?: string): void {
  const key = notionDocumentSnapshotKey(documentTypeId, caseId)
  localShadow.delete(key)
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/** All localStorage snapshot keys belonging to `caseId` (plus legacy un-scoped keys for default). */
function collectSnapshotKeys(caseId: string): string[] {
  const keys = new Set<string>()
  const scopedSuffix = `::${caseId}`
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(`${SNAPSHOT_KEY_PREFIX}:`)) continue
      if (k.endsWith(scopedSuffix)) {
        keys.add(k)
      } else if (caseId === DEFAULT_CASE_ID && !k.includes('::')) {
        // Legacy snapshot written before case-scoped keys existed.
        keys.add(k)
      }
    }
  } catch {
    // localStorage unavailable — nothing to hydrate.
  }
  return [...keys]
}

/**
 * Decrypt (and, on first run, migrate any legacy plaintext) every persisted document snapshot
 * for `caseId` into the synchronous shadow. Wired into `hydrateLocalClinicalCaches` so it runs
 * before the workspace vault applies its snapshot.
 */
export async function hydrateNotionDocumentsFromEncryptedLocal(caseId?: string): Promise<void> {
  const resolved = caseId ?? getActiveCaseId()
  try {
    for (const key of collectSnapshotKeys(resolved)) {
      const persisted = await readOrMigrateEncryptedJson<NotionDocumentSnapshot>(key)
      if (persisted && !localShadow.has(key)) localShadow.set(key, persisted)
    }
  } catch {
    // Hydration is best-effort; the vault remains the authoritative source.
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
    body { font-family: ${FONT_SANS}; font-size: 12pt; line-height: 1.6; margin: 2cm; color: #111; }
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
