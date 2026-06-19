import { loadDokumente } from '../dokumenteArchive'
import { loadNotionDocumentSnapshot } from '../notionDocumentActions'
import type { PsychopathFindingSource } from '../../types/psychopathFinding'

export const AUFNAHME_PSYCHOPATH_SECTION_ID = 'psychopathologischer-befund'
export const VERLAUF_PSYCHOPATH_SECTION_ID = 'psychopathologie'

function clamp(text: string, max: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized
}

function trimSection(text: string | undefined): string | null {
  const trimmed = text?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : null
}

function snapshotPsychopathSection(
  sectionContents: Record<string, string> | undefined,
  sectionId: string,
): string | null {
  return trimSection(sectionContents?.[sectionId])
}

function textFromPsychopathPage(caseId: string): {
  text: string | null
  savedAt: string | null
  source: PsychopathFindingSource
} {
  const snap = loadNotionDocumentSnapshot('psychopath', caseId)
  if (!snap) return { text: null, savedAt: null, source: 'psychopath-page' }

  const free = trimSection(snap.sectionContents['free'])
  const joined = Object.values(snap.sectionContents)
    .map((value) => trimSection(value))
    .filter(Boolean)
    .join(' ')
  const text = free ?? (joined.length > 0 ? joined : null)
  return { text, savedAt: text ? snap.savedAt ?? null : null, source: 'psychopath-page' }
}

function textFromDocumentSnapshot(
  caseId: string,
  documentTypeId: string,
  source: PsychopathFindingSource,
): { text: string | null; savedAt: string | null; source: PsychopathFindingSource } {
  const snap = loadNotionDocumentSnapshot(documentTypeId, caseId)
  if (!snap) return { text: null, savedAt: null, source }

  const text = snapshotPsychopathSection(snap.sectionContents, AUFNAHME_PSYCHOPATH_SECTION_ID)
  return { text, savedAt: text ? snap.savedAt ?? null : null, source }
}

function textFromVerlaufSnapshot(caseId: string): {
  text: string | null
  savedAt: string | null
  source: PsychopathFindingSource
} {
  const snap = loadNotionDocumentSnapshot('verlauf', caseId)
  if (!snap) return { text: null, savedAt: null, source: 'verlauf' }

  const text = snapshotPsychopathSection(snap.sectionContents, VERLAUF_PSYCHOPATH_SECTION_ID)
  return { text, savedAt: text ? snap.savedAt ?? null : null, source: 'verlauf' }
}

function textFromImportedAufnahme(caseId: string): {
  text: string | null
  savedAt: string | null
  source: PsychopathFindingSource
} {
  const docs = loadDokumente(caseId).filter((entry) => entry.category === 'anamnese' && !entry.deleted)

  for (const entry of docs) {
    const sectionContents = entry.sectionContents ?? {}
    const fromSection = snapshotPsychopathSection(sectionContents, AUFNAHME_PSYCHOPATH_SECTION_ID)
    if (fromSection) return { text: fromSection, savedAt: entry.date, source: 'import' }

    if (entry.pageType === `import-anamnese:${AUFNAHME_PSYCHOPATH_SECTION_ID}`) {
      const fromContent = trimSection(entry.content)
      if (fromContent) return { text: fromContent, savedAt: entry.date, source: 'import' }
    }
  }

  return { text: null, savedAt: null, source: 'import' }
}

/** Resolve psychopathology from workspace documents and imported Anamnese (not overview store). */
export function resolveDocumentPsychopathologyText(caseId: string): {
  text: string | null
  savedAt: string | null
  source: PsychopathFindingSource | null
} {
  const sources = [
    textFromPsychopathPage(caseId),
    textFromDocumentSnapshot(caseId, 'aufnahme', 'aufnahme'),
    textFromDocumentSnapshot(caseId, 'anamnese', 'aufnahme'),
    textFromVerlaufSnapshot(caseId),
    textFromImportedAufnahme(caseId),
  ]

  for (const source of sources) {
    if (source.text) {
      return { text: source.text, savedAt: source.savedAt, source: source.source }
    }
  }

  return { text: null, savedAt: null, source: null }
}

/** Resolve the best available psychopathology narrative for Übersicht widgets. */
export function resolvePsychopathologyText(caseId: string): { text: string | null; savedAt: string | null } {
  const resolved = resolveDocumentPsychopathologyText(caseId)
  return { text: resolved.text, savedAt: resolved.savedAt }
}

/** Clamped psychopathology snapshot for the Übersicht symptom card. */
export function readPsychopathSnapshot(
  caseId: string,
  maxLength = 320,
): { text: string | null; savedAt: string | null } {
  const { text, savedAt } = resolvePsychopathologyText(caseId)
  if (!text) return { text: null, savedAt: null }
  return { text: clamp(text, maxLength), savedAt }
}
