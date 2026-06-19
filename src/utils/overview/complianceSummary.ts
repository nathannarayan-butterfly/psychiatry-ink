import type { MedicationEntry } from '../../types/medicationPlan'
import type { ComplementaryTherapy } from '../../types/complementaryTherapy'
import type { PsychotherapyPlan } from '../../types/psychotherapy'
import type { SozialtherapieTarget } from '../../types/sozialtherapie'
import type { WeitereTherapie } from '../../types/weitereTherapie'
import type { UiLanguage } from '../../types/settings'
import { loadNotionDocumentSnapshot } from '../notionDocumentActions'
import {
  collectOrderedTherapies,
  isRefusalNote,
  scanTextForEvents,
  type OrderedTherapy,
} from '../therapyAdherence'
import { loadVerlaufFeed, type VerlaufFeedEntry } from '../verlaufFeed'

export const COMPLIANCE_WINDOW_DAYS = 14

export type ComplianceDayStatus = 'participated' | 'refused' | 'excused' | 'unknown'

export interface ComplianceDayCell {
  /** Calendar day in local time (`YYYY-MM-DD`). */
  dateIso: string
  /** Day-of-month label shown above the cell. */
  dayLabel: string
  /** Short weekday label (`Mo`, `Di`, …). */
  weekdayLabel: string
  status: ComplianceDayStatus
  /** True when the status was manually set by a clinician (override of derived). */
  overridden?: boolean
}

export interface ComplianceTimeline {
  days: ComplianceDayCell[]
  /** Null when no participations or refusals were documented in the window. */
  percent: number | null
  documentedDays: number
  windowDays: number
}

/**
 * One scored row in the compliance widget — a single medication or a single
 * therapy, each with its own 14-day grid + percentage.
 */
export interface ComplianceItemTimeline {
  /** Stable key (medication id / therapy key). */
  key: string
  /** Primary name shown on the row (substance / therapy label). */
  label: string
  /** Optional secondary line (dose schedule, therapy kind). */
  sublabel: string | null
  timeline: ComplianceTimeline
}

export interface ComplianceSummaryData {
  medicationItems: ComplianceItemTimeline[]
  therapyItems: ComplianceItemTimeline[]
  hasActiveMedication: boolean
  hasOrderedTherapies: boolean
  windowDays: number
  /** Average of all scored per-item percents (meds + therapies); null when none scored. */
  overallPercent: number | null
}

const WEEKDAY_SHORT_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const

const STATUS_PRIORITY: Record<ComplianceDayStatus, number> = {
  refused: 3,
  excused: 2,
  participated: 1,
  unknown: 0,
}

const ACTIVE_MEDICATION_STATUSES: MedicationEntry['status'][] = ['active', 'reduced', 'increased']

const MEDICATION_REFUSAL =
  /\b(?:medikament(?:en)?(?:einnahme)?|einnahme|tabletten?)\s+(?:verweigert(?:e)?|abgelehnt|nicht\s+eingenommen)\b|\b(?:verweigert(?:e)?|abgelehnt)\s+(?:die\s+)?(?:medikament(?:e)?|einnahme|tabletten?)\b|\bmedikamentenverweigerung\b/i

const MEDICATION_PARTICIPATION =
  /\b(?:einnahme|medikation|medikament(?:e)?)\s+(?:regelmäßig|zuverlässig|eingenommen)\b|\b(?:regelmäßig|zuverlässig)\s+eingenommen\b|\büberwachte\s+medikamenteneinnahme\b|\beingenommen\s+wie\s+verordnet\b|\bmedikation\s+fixiert\b/i

const THERAPY_GENERIC_PARTICIPATION =
  /\b(?:teilgenommen|besucht|durchgeführt|wahrgenommen)\b|\bpassive\s+teilnahme\b|\btherapie\s+(?:durchgeführt|wahrgenommen)\b/i

const THERAPY_GENERIC_REFUSAL =
  /\b(?:therapie|gruppe|sporttherapie|einzeltherapie|gruppentherapie)\s+(?:verweigert(?:e)?|abgelehnt)\b|\bverweigert(?:e)?\s+(?:therapie|gruppe|sporttherapie)\b|\b(?:therapie|gruppe)\s+nicht\s+teilgenommen\b/i

const EXCUSED =
  /\b(?:entschuldigt|entschuldigung|krankgeschrieben|krankheitsbedingt(?:\s+abwesend)?|wegen\s+krankheit\s+(?:abwesend|nicht\s+teilgenommen)|abwesend\s+wegen\s+krankheit)\b|\b(?:krank(?:heit)?)\s*[,;:—–-]\s*(?:keine\s+teilnahme|nicht\s+teilgenommen|abwesend)\b/i

export function toDateKey(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function mergeComplianceDayStatus(
  current: ComplianceDayStatus,
  next: ComplianceDayStatus,
): ComplianceDayStatus {
  return STATUS_PRIORITY[current] >= STATUS_PRIORITY[next] ? current : next
}

export function buildComplianceDayWindow(now: Date, windowDays: number): ComplianceDayCell[] {
  const days: ComplianceDayCell[] = []
  const anchor = new Date(now)
  anchor.setHours(12, 0, 0, 0)

  for (let offset = windowDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(anchor)
    day.setDate(anchor.getDate() - offset)
    days.push({
      dateIso: toDateKey(day),
      dayLabel: String(day.getDate()),
      weekdayLabel: WEEKDAY_SHORT_DE[day.getDay()] ?? '',
      status: 'unknown',
    })
  }

  return days
}

export function computeCompliancePercent(days: ComplianceDayCell[]): {
  percent: number | null
  documentedDays: number
} {
  let participated = 0
  let refused = 0
  let excused = 0

  for (const day of days) {
    if (day.status === 'participated') participated += 1
    else if (day.status === 'refused') refused += 1
    else if (day.status === 'excused') excused += 1
  }

  const documentedDays = participated + refused + excused
  const scored = participated + refused
  if (scored === 0) {
    return { percent: null, documentedDays }
  }

  return {
    percent: Math.round((participated / scored) * 100),
    documentedDays,
  }
}

function finalizeTimeline(days: ComplianceDayCell[], windowDays: number): ComplianceTimeline {
  const { percent, documentedDays } = computeCompliancePercent(days)
  return { days, percent, documentedDays, windowDays }
}

function classifyMedicationSignal(text: string): ComplianceDayStatus | null {
  if (!text.trim()) return null
  if (MEDICATION_REFUSAL.test(text)) return 'refused'
  if (MEDICATION_PARTICIPATION.test(text)) return 'participated'
  return null
}

function classifyTherapySignal(text: string): ComplianceDayStatus | null {
  if (!text.trim()) return null
  if (THERAPY_GENERIC_REFUSAL.test(text)) return 'refused'
  if (EXCUSED.test(text)) return 'excused'
  if (THERAPY_GENERIC_PARTICIPATION.test(text)) return 'participated'
  return null
}

function applyStatusToDay(
  days: ComplianceDayCell[],
  dateIso: string,
  status: ComplianceDayStatus,
): void {
  const cell = days.find((day) => day.dateIso === dateIso)
  if (!cell) return
  cell.status = mergeComplianceDayStatus(cell.status, status)
}

function isWithinDayWindow(dateIso: string, days: ComplianceDayCell[]): boolean {
  return days.some((day) => day.dateIso === dateIso)
}

/** Normalizes free text for substring alias matching (lower, de-accented). */
export function normalizeComplianceText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface MedicationItem {
  key: string
  label: string
  sublabel: string | null
  /** Normalized name tokens (≥4 chars) used to attribute Verlauf mentions. */
  aliases: string[]
}

function buildMedicationAliases(med: MedicationEntry): string[] {
  const aliases = new Set<string>()
  const candidates = [med.substance, med.displayBrandName].filter(
    (value): value is string => Boolean(value && value.trim()),
  )
  for (const candidate of candidates) {
    const normalized = normalizeComplianceText(candidate)
    if (normalized.length >= 4) aliases.add(normalized)
    for (const part of normalized.split(' ')) {
      if (part.length >= 4) aliases.add(part)
    }
  }
  return [...aliases]
}

/** Active medications mapped to scored rows (one grid per substance). */
export function buildMedicationItems(medications: MedicationEntry[]): MedicationItem[] {
  return medications
    .filter((med) => ACTIVE_MEDICATION_STATUSES.includes(med.status) && !med.deletedAt)
    .map((med) => {
      const brand = med.displayBrandName?.trim()
      const dose = med.doseLineGerman?.trim() || med.strength?.trim() || null
      return {
        key: med.id,
        label: med.substance.trim() || brand || 'Medikament',
        sublabel: dose,
        aliases: buildMedicationAliases(med),
      }
    })
}

function matchMedicationItems(items: MedicationItem[], normalizedText: string): MedicationItem[] {
  return items.filter((item) =>
    item.aliases.some((alias) => alias.length >= 4 && normalizedText.includes(alias)),
  )
}

/**
 * Builds one timeline per active medication.
 *
 * Attribution heuristic (best-effort, free-text Verlauf is imperfect):
 *  1. For each Verlauf entry in the window we classify a medication signal
 *     (refused / excused / participated) from the note text.
 *  2. If a specific medication name (substance or brand alias, ≥4 chars) appears
 *     in that note, the signal is attributed only to the matched medication(s).
 *  3. If a medication signal is present but no specific name is mentioned, it is
 *     applied to ALL active medications for that day (an undifferentiated
 *     "Medikamenteneinnahme verweigert" affects the whole regimen).
 *  4. The Verlauf compliance section and per-medication adherence notes are
 *     undated, so they are applied to every medication on the most recent day.
 */
function buildMedicationItemTimelines(
  caseId: string,
  medications: MedicationEntry[],
  verlaufEntries: VerlaufFeedEntry[],
  now: Date,
): ComplianceItemTimeline[] {
  const items = buildMedicationItems(medications)
  if (items.length === 0) return []

  const windowDays = COMPLIANCE_WINDOW_DAYS
  const dayLists = new Map<string, ComplianceDayCell[]>()
  for (const item of items) {
    dayLists.set(item.key, buildComplianceDayWindow(now, windowDays))
  }

  const reference = dayLists.get(items[0].key) ?? []
  const windowStart = reference[0]?.dateIso
  const windowEnd = reference[reference.length - 1]?.dateIso

  const scopedEntries = verlaufEntries.filter((entry) => {
    if (!windowStart || !windowEnd) return false
    const key = toDateKey(entry.date)
    return key >= windowStart && key <= windowEnd
  })

  for (const entry of scopedEntries) {
    const status = classifyMedicationSignal(entry.content)
    if (!status) continue
    const dateIso = toDateKey(entry.date)
    const normalized = normalizeComplianceText(entry.content)
    const matched = matchMedicationItems(items, normalized)
    const targets = matched.length > 0 ? matched : items
    for (const item of targets) {
      applyStatusToDay(dayLists.get(item.key) ?? [], dateIso, status)
    }
  }

  const undatedTexts: string[] = []
  const complianceSnapshot = loadNotionDocumentSnapshot('verlauf', caseId)
  const complianceText = complianceSnapshot?.sectionContents['compliance-krankheitseinsicht']?.trim()
  if (complianceText) undatedTexts.push(complianceText)

  for (const med of medications) {
    if (!ACTIVE_MEDICATION_STATUSES.includes(med.status) || med.deletedAt) continue
    const note = [med.adherenceNote, med.reasonForChange, med.freeTextLine]
      .filter(Boolean)
      .join(' ')
      .trim()
    if (note) undatedTexts.push(note)
  }

  const lastDayIso = windowEnd
  if (lastDayIso) {
    for (const text of undatedTexts) {
      const status = classifyMedicationSignal(text)
      if (!status) continue
      for (const item of items) {
        applyStatusToDay(dayLists.get(item.key) ?? [], lastDayIso, status)
      }
    }
  }

  return items.map((item) => ({
    key: item.key,
    label: item.label,
    sublabel: item.sublabel,
    timeline: finalizeTimeline(dayLists.get(item.key) ?? [], windowDays),
  }))
}

/**
 * Builds one timeline per ordered therapy.
 *
 * Attribution heuristic:
 *  1. Verlauf mentions are matched to a specific therapy via `scanTextForEvents`
 *     (alias-based) and applied to that therapy's day.
 *  2. A generic therapy signal (e.g. "Gruppe verweigert" with no nameable
 *     therapy) is applied to ALL ordered therapies for that day.
 *  3. Structured session logs (psychotherapy sessions, complementary sessions)
 *     count as participations / refusals on their own therapy row.
 */
function buildTherapyItemTimelines(
  input: {
    psychotherapyPlan: PsychotherapyPlan | null
    complementaryTherapies: ComplementaryTherapy[]
    weitereEntries: WeitereTherapie[]
    sozialTargets: SozialtherapieTarget[]
    language: UiLanguage
    verlaufEntries: VerlaufFeedEntry[]
  },
  now: Date,
): ComplianceItemTimeline[] {
  const therapies: OrderedTherapy[] = collectOrderedTherapies(input)
  if (therapies.length === 0) return []

  const windowDays = COMPLIANCE_WINDOW_DAYS
  const dayLists = new Map<string, ComplianceDayCell[]>()
  const labels = new Map<string, string>()
  for (const therapy of therapies) {
    dayLists.set(therapy.key, buildComplianceDayWindow(now, windowDays))
    labels.set(therapy.key, therapy.label)
  }
  const reference = dayLists.get(therapies[0].key) ?? []

  for (const entry of input.verlaufEntries) {
    const dateIso = toDateKey(entry.date)
    if (!isWithinDayWindow(dateIso, reference)) continue

    const events = scanTextForEvents(entry.content, therapies)
    for (const event of events) {
      applyStatusToDay(
        dayLists.get(event.therapyKey) ?? [],
        dateIso,
        event.kind === 'refusal' ? 'refused' : 'participated',
      )
    }

    if (events.length === 0) {
      const generic = classifyTherapySignal(entry.content)
      if (generic) {
        for (const therapy of therapies) {
          applyStatusToDay(dayLists.get(therapy.key) ?? [], dateIso, generic)
        }
      }
    }
  }

  if (input.psychotherapyPlan && dayLists.has('psychotherapy')) {
    for (const session of input.psychotherapyPlan.sessions ?? []) {
      const dateIso = toDateKey(session.date)
      if (!isWithinDayWindow(dateIso, reference)) continue
      applyStatusToDay(dayLists.get('psychotherapy') ?? [], dateIso, 'participated')
    }
  }

  for (const therapy of input.complementaryTherapies) {
    const key = `complementary:${therapy.id}`
    if (!dayLists.has(key)) continue
    for (const session of therapy.sessions ?? []) {
      const dateIso = toDateKey(session.date)
      if (!isWithinDayWindow(dateIso, reference)) continue
      const note = session.note.trim()
      applyStatusToDay(
        dayLists.get(key) ?? [],
        dateIso,
        note && isRefusalNote(note) ? 'refused' : 'participated',
      )
    }
  }

  return therapies.map((therapy) => ({
    key: therapy.key,
    label: labels.get(therapy.key) ?? therapy.label,
    sublabel: null,
    timeline: finalizeTimeline(dayLists.get(therapy.key) ?? [], windowDays),
  }))
}

function averagePercent(values: Array<number | null>): number | null {
  const scored = values.filter((value): value is number => value != null)
  if (scored.length === 0) return null
  return Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length)
}

export function buildComplianceSummary(
  caseId: string,
  input: {
    medications: MedicationEntry[]
    psychotherapyPlan: PsychotherapyPlan | null
    complementaryTherapies: ComplementaryTherapy[]
    weitereEntries: WeitereTherapie[]
    sozialTargets: SozialtherapieTarget[]
    language: UiLanguage
    now?: Date
  },
): ComplianceSummaryData {
  const now = input.now ?? new Date()
  const verlaufEntries = loadVerlaufFeed(caseId)

  const medicationItems = buildMedicationItemTimelines(
    caseId,
    input.medications,
    verlaufEntries,
    now,
  )
  const therapyItems = buildTherapyItemTimelines(
    {
      psychotherapyPlan: input.psychotherapyPlan,
      complementaryTherapies: input.complementaryTherapies,
      weitereEntries: input.weitereEntries,
      sozialTargets: input.sozialTargets,
      language: input.language,
      verlaufEntries,
    },
    now,
  )

  const overallPercent = averagePercent([
    ...medicationItems.map((item) => item.timeline.percent),
    ...therapyItems.map((item) => item.timeline.percent),
  ])

  return {
    medicationItems,
    therapyItems,
    hasActiveMedication: medicationItems.length > 0,
    hasOrderedTherapies: therapyItems.length > 0,
    windowDays: COMPLIANCE_WINDOW_DAYS,
    overallPercent,
  }
}
