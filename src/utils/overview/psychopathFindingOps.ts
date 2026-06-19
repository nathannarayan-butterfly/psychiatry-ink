import type { CourseDirection } from '../../types/clinicalImprint'
import type {
  PsychopathFindingEntry,
  PsychopathFindingSource,
  PsychopathFindingState,
} from '../../types/psychopathFinding'
import type { SymptomSnapshotData } from '../../components/notion/overview/types'
import { upsertClinicalImprint, imprintKeyFor } from '../clinicalImprint/storage'
import { extractClinicalImprint } from '../clinicalImprint/extract'
import {
  resolveDocumentPsychopathologyText,
} from './psychopathSnapshot'
import { buildAmdpOverviewGridWithMeta, sanitizePsychopathDomainAssessments } from './psychopathologyDomains'
import { isPsychopathAiStructuredStale } from './psychopathAiExtract'
import { getSymptomTrajectory } from './symptomTrajectory'
import { formatDateDe } from './dateLabels'
import { loadClinicalImprintIndex } from '../clinicalImprint'
import type { ClinicalImprintRecord } from '../../types/clinicalImprint'
import type { UiLanguage } from '../../types/settings'
import { translateUi } from '../../data/uiTranslations'
import {
  loadPsychopathFindingState,
  savePsychopathFindingState,
} from './psychopathFindingStorage'

const SOURCE_LABEL: Record<PsychopathFindingSource, string> = {
  overview: 'Übersicht',
  aufnahme: 'Aufnahme',
  import: 'Import',
  'psychopath-page': 'Psychopathologie',
  verlauf: 'Verlauf',
  manual: 'Manuell',
}

const COURSE_LABEL: Record<CourseDirection, string> = {
  new: 'neu',
  improved: 'verbessert',
  worsened: 'verschlechtert',
  stable: 'stabil',
  fluctuating: 'fluktuierend',
  resolved: 'remittiert',
  unclear: 'unklar',
}

function genId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `psy-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function clamp(text: string, max: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized
}

/** Infer documented course direction from free-text psychopathology. */
export function inferCourseDirection(text: string): CourseDirection | null {
  if (/neu aufgetreten|erstmalig|\bneu\b/i.test(text)) return 'new'
  if (/besser|gebessert|remittiert|rückläufig|verbessert/i.test(text)) return 'improved'
  if (/schlechter|verschlechter|zunehmend|aggraviert/i.test(text)) return 'worsened'
  if (/stabil|unverändert|gleichbleibend/i.test(text)) return 'stable'
  if (/schwankend|fluktuierend|wechselhaft/i.test(text)) return 'fluctuating'
  if (/remission|abgeklungen|verschwunden/i.test(text)) return 'resolved'
  if (/unklar|nicht beurteilbar/i.test(text)) return 'unclear'
  return null
}

function latestPsychopathImprint(imprints: ClinicalImprintRecord[]): ClinicalImprintRecord | null {
  return (
    [...imprints]
      .filter((i) => i.clinicalDomain === 'psychopathology')
      .sort((a, b) => (b.sourceDate ?? '').localeCompare(a.sourceDate ?? ''))[0] ?? null
  )
}

function syncOverviewImprint(
  caseId: string,
  entry: PsychopathFindingEntry,
): void {
  const sourceId = `overview:psychopath:${entry.id}`
  const metadata = extractClinicalImprint({
    caseId,
    sourceType: 'manual_note',
    sourceId,
    text: entry.text,
    sourceDate: entry.date,
    documentTypeId: 'psychopath',
    sectionLabel: 'Psychopathologischer Befund',
    evidenceStrength: 'direct_observation',
  })
  if (!metadata) return

  upsertClinicalImprint(
    {
      ...metadata,
      courseDirection: entry.courseDirection ?? metadata.courseDirection,
      imprintKey: imprintKeyFor('manual_note', sourceId),
    },
    caseId,
  )
}

function createEntry(
  text: string,
  source: PsychopathFindingSource,
  date: string,
  courseDirection: CourseDirection | null,
): PsychopathFindingEntry {
  const trimmed = text.trim()
  const now = new Date().toISOString()
  return {
    id: genId(),
    date,
    text: trimmed,
    source,
    courseDirection: courseDirection ?? inferCourseDirection(trimmed),
    savedAt: now,
  }
}

/** One-time bootstrap: seed overview store from documented sources when empty. */
export function ensurePsychopathFindingBootstrapped(caseId: string): PsychopathFindingState {
  const state = loadPsychopathFindingState(caseId)
  if (state.current?.text?.trim()) return state

  const resolved = resolveDocumentPsychopathologyText(caseId)
  if (!resolved.text) return state

  const entry = createEntry(
    resolved.text,
    resolved.source ?? 'aufnahme',
    resolved.savedAt ?? new Date().toISOString(),
    null,
  )
  const next: PsychopathFindingState = {
    ...state,
    current: entry,
    history: [],
  }
  savePsychopathFindingState(next, caseId)
  syncOverviewImprint(caseId, entry)
  return next
}

/** Seed initial finding + history entry from imported Aufnahmebefund. */
export function seedPsychopathFindingFromImport(
  caseId: string,
  text: string,
  date?: string,
): PsychopathFindingState {
  const trimmed = text.trim()
  if (!trimmed) return loadPsychopathFindingState(caseId)

  const state = loadPsychopathFindingState(caseId)
  const entry = createEntry(trimmed, 'import', date ?? new Date().toISOString(), null)

  if (state.current?.text.trim() === trimmed) return state

  const history = state.current ? [state.current, ...state.history] : state.history
  const next: PsychopathFindingState = {
    ...state,
    current: entry,
    history,
  }
  savePsychopathFindingState(next, caseId)
  syncOverviewImprint(caseId, entry)
  return next
}

export interface SavePsychopathFindingParams {
  caseId: string
  text: string
  courseDirection?: CourseDirection | null
  clinicalDate?: string
}

/** Save an overview edit — archives prior current text and updates Verlaufstendenz imprints. */
export function savePsychopathFindingEdit(params: SavePsychopathFindingParams): PsychopathFindingState {
  const trimmed = params.text.trim()
  if (!trimmed) return loadPsychopathFindingState(params.caseId)

  const state = loadPsychopathFindingState(params.caseId)
  const date = params.clinicalDate ?? new Date().toISOString()
  const courseDirection =
    params.courseDirection === undefined
      ? inferCourseDirection(trimmed)
      : params.courseDirection

  const entry = createEntry(trimmed, 'overview', date, courseDirection)

  let history = state.history
  if (state.current && state.current.text.trim() !== trimmed) {
    history = [state.current, ...history]
  }

  const next: PsychopathFindingState = {
    ...state,
    current: entry,
    history,
  }
  savePsychopathFindingState(next, params.caseId)
  syncOverviewImprint(params.caseId, entry)
  return next
}

/** Resolve display text: overview current first, then documented sources. */
export function resolveOverviewPsychopathologyText(caseId: string): {
  text: string | null
  savedAt: string | null
  source: PsychopathFindingSource | null
} {
  const bootstrapped = ensurePsychopathFindingBootstrapped(caseId)
  if (bootstrapped.current?.text.trim()) {
    return {
      text: bootstrapped.current.text,
      savedAt: bootstrapped.current.date,
      source: bootstrapped.current.source,
    }
  }

  const resolved = resolveDocumentPsychopathologyText(caseId)
  return {
    text: resolved.text,
    savedAt: resolved.savedAt,
    source: resolved.source,
  }
}

/** Build symptom snapshot card data for the Übersicht dashboard. */
export function buildSymptomSnapshotData(
  caseId: string,
  language: UiLanguage = 'de',
): SymptomSnapshotData {
  const state = ensurePsychopathFindingBootstrapped(caseId)
  const { text, savedAt } = resolveOverviewPsychopathologyText(caseId)
  const imprints = loadClinicalImprintIndex(caseId).imprints
  const imprint = latestPsychopathImprint(imprints)

  const aiSnapshot = state.aiStructured
  const aiFresh =
    aiSnapshot &&
    !isPsychopathAiStructuredStale(text, aiSnapshot) &&
    (aiSnapshot.status === 'accepted' || aiSnapshot.status === 'pending')

  const aiFields = aiFresh && aiSnapshot ? aiSnapshot.fields : null
  const aiDomains =
    aiFresh && aiSnapshot?.domains?.length
      ? sanitizePsychopathDomainAssessments(aiSnapshot.domains)
      : null
  let structuredFromAi = false
  let aiConfidence: SymptomSnapshotData['aiConfidence']
  let collapseNarrative = false

  const assessed = Boolean(text?.trim())
  const grid = assessed
    ? buildAmdpOverviewGridWithMeta({
        imprint,
        aiFields,
        domains: aiDomains,
        showAllDomains: false,
      })
    : { cues: [], hasUnremarkableDomains: false }

  let structured = grid.cues

  if (aiFresh && aiSnapshot && structured.length > 0) {
    structuredFromAi = true
    aiConfidence = aiSnapshot.confidence
  }

  collapseNarrative = assessed && Boolean(text?.trim()) && structured.length > 0

  if (assessed && structured.length === 0 && grid.hasUnremarkableDomains) {
    structured = []
  }

  const unremarkableSummary =
    assessed && grid.hasUnremarkableDomains
      ? translateUi(language, 'overviewPsyUnremarkableSummary')
      : null

  const courseLabel =
    (aiFresh && aiSnapshot?.courseDirection
      ? COURSE_LABEL[aiSnapshot.courseDirection]
      : null) ??
    (imprint?.courseDirection ? COURSE_LABEL[imprint.courseDirection] : null)
  const asOf = savedAt ?? imprint?.sourceDate ?? null

  return {
    snapshotText: text ? clamp(text, 320) : null,
    fullText: text,
    assessed,
    structured,
    contextLabel: null,
    courseLabel,
    asOfLabel: asOf ? formatDateDe(asOf) : null,
    trajectory: getSymptomTrajectory(imprints),
    history: state.history.map((entry) => ({
      id: entry.id,
      dateLabel: formatDateDe(entry.date) ?? entry.date,
      text: entry.text,
      sourceLabel: SOURCE_LABEL[entry.source] ?? entry.source,
      courseLabel: entry.courseDirection ? COURSE_LABEL[entry.courseDirection] : null,
    })),
    structuredFromAi,
    aiConfidence,
    collapseNarrative,
    unremarkableSummary,
  }
}

export { SOURCE_LABEL as psychopathFindingSourceLabel }
