/**
 * Therapy adherence — derives per-therapy compliance from ordered therapies and
 * Verlauf feed text (refusals / participation mentions).
 *
 * Formula (last 30 days):
 *   adherence% = round(participations / (participations + refusals) × 100)
 *   If no documented events in the window → 100% (assumed compliant).
 *   Structured session logs (psychotherapy, complementary) count as participations.
 */

import type { UiLanguage } from '../types/settings'
import type { ComplementaryTherapy } from '../types/complementaryTherapy'
import { isPlanEmpty, type PsychotherapyPlan } from '../types/psychotherapy'
import { derivePsychotherapySummary } from './psychotherapy/derive'
import type { SozialtherapieTarget } from '../types/sozialtherapie'
import type { WeitereTherapie } from '../types/weitereTherapie'
import { translateSozialtherapieArea } from '../data/sozialtherapieUiTranslations'
import { translateWeitereTherapieType } from '../data/weitereTherapieUiTranslations'
import { loadVerlaufFeed, type VerlaufFeedEntry } from './verlaufFeed'

export const ADHERENCE_WINDOW_DAYS = 30

export interface OrderedTherapy {
  key: string
  label: string
  /** Lower-case tokens used to match free-text Verlauf mentions. */
  aliases: string[]
}

export interface TherapyAdherenceRow {
  therapy: OrderedTherapy
  percent: number
  participations: number
  refusals: number
  reasons: string[]
}

export interface TherapyAdherenceSummary {
  rows: TherapyAdherenceRow[]
  hasOrderedTherapies: boolean
  fullyCompliant: boolean
  windowDays: number
}

export interface TherapyAdherenceInputs {
  psychotherapyPlan: PsychotherapyPlan | null
  complementaryTherapies: ComplementaryTherapy[]
  weitereEntries: WeitereTherapie[]
  sozialTargets: SozialtherapieTarget[]
  verlaufEntries: VerlaufFeedEntry[]
  language: UiLanguage
  windowDays?: number
  now?: Date
}

interface ParsedEvent {
  therapyKey: string
  kind: 'refusal' | 'participation'
  reason?: string
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9äöüß\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = normalizeToken(trimmed)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

function buildAliases(label: string, extra: string[] = []): string[] {
  const tokens = uniqueStrings([label, ...extra])
  const aliases = new Set<string>()
  for (const token of tokens) {
    aliases.add(normalizeToken(token))
    for (const part of token.split(/\s+/)) {
      if (part.length >= 4) aliases.add(normalizeToken(part))
    }
  }
  return [...aliases]
}

function isWithinWindow(dateIso: string, windowDays: number, now: Date): boolean {
  const time = new Date(dateIso).getTime()
  if (Number.isNaN(time)) return true
  const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000
  return time >= cutoff
}

function matchTherapy(therapies: OrderedTherapy[], mention: string): OrderedTherapy | null {
  const norm = normalizeToken(mention)
  if (!norm || norm.length < 3) return null

  let best: { therapy: OrderedTherapy; score: number } | null = null
  for (const therapy of therapies) {
    for (const alias of therapy.aliases) {
      if (alias.length < 3) continue
      if (norm === alias || norm.includes(alias) || alias.includes(norm)) {
        const score = alias.length
        if (!best || score > best.score) best = { therapy, score }
      }
    }
  }
  return best?.therapy ?? null
}

function cleanMention(raw: string): string {
  return raw
    .replace(/^(?:die|der|das|eine?|the)\s+/i, '')
    .replace(/\s+(?:heute|gestern|erneut|wieder|nicht|noch)$/i, '')
    .trim()
}

function extractReason(text: string, startIndex: number): string | undefined {
  const tail = text.slice(startIndex).trim()
  const match = tail.match(
    /^(?:[,;:—–-]|\s+)?(?:\(?\s*)?(?:wegen|grund|reason|motiv|because|due to)\s*:?\s*([^.;,\n]{3,120})/i,
  )
  if (match?.[1]) return match[1].trim().replace(/\)+$/, '').trim()
  const colon = tail.match(/^(?:[,;:—–-]\s*)([^.;,\n]{4,120})/)
  if (colon?.[1] && !/^(heute|gestern|erneut|wieder)$/i.test(colon[1])) {
    return colon[1].trim()
  }
  return undefined
}

const REFUSAL_REGEXES: RegExp[] = [
  /\b([\p{L}][\p{L}\s/-]{2,48}?)\s+verweigert(?:e)?\b/giu,
  /\bverweigert(?:e)?\s+([\p{L}][\p{L}\s/-]{2,48}?)\b/giu,
  /\b([\p{L}][\p{L}\s/-]{2,48}?)\s+(?:nicht\s+teilgenommen|abgelehnt)\b/giu,
  /\b(?:refused|declined)\s+([\p{L}][\p{L}\s/-]{2,48}?)\b/giu,
  /\b([\p{L}][\p{L}\s/-]{2,48}?)\s+(?:refused|declined)\b/giu,
]

const PARTICIPATION_REGEXES: RegExp[] = [
  /\b([\p{L}][\p{L}\s/-]{2,48}?)\s+(?:teilgenommen|besucht|durchgeführt|wahrgenommen)\b/giu,
  /\b(?:teilnahme|participation)\s+(?:an\s+(?:der|die|das)\s+)?([\p{L}][\p{L}\s/-]{2,48}?)\b/giu,
  /\b(?:attended|completed)\s+([\p{L}][\p{L}\s/-]{2,48}?)\b/giu,
]

function scanTextForEvents(
  text: string,
  therapies: OrderedTherapy[],
): ParsedEvent[] {
  const events: ParsedEvent[] = []
  if (!text.trim()) return events

  for (const regex of REFUSAL_REGEXES) {
    const re = new RegExp(regex.source, regex.flags)
    for (const match of text.matchAll(re)) {
      const mention = cleanMention(match[1] ?? '')
      const therapy = matchTherapy(therapies, mention)
      if (!therapy) continue
      const reason = extractReason(text, (match.index ?? 0) + match[0].length)
      events.push({ therapyKey: therapy.key, kind: 'refusal', reason })
    }
  }

  for (const regex of PARTICIPATION_REGEXES) {
    const re = new RegExp(regex.source, regex.flags)
    for (const match of text.matchAll(re)) {
      const mention = cleanMention(match[1] ?? '')
      const therapy = matchTherapy(therapies, mention)
      if (!therapy) continue
      events.push({ therapyKey: therapy.key, kind: 'participation' })
    }
  }

  return events
}

function isRefusalNote(note: string): boolean {
  const lower = note.toLowerCase()
  return (
    /\bverweigert/.test(lower) ||
    /\babgelehnt/.test(lower) ||
    /\bnicht\s+teilgenommen/.test(lower) ||
    /\brefused\b/.test(lower) ||
    /\bdeclined\b/.test(lower)
  )
}

export function collectOrderedTherapies(inputs: {
  psychotherapyPlan: PsychotherapyPlan | null
  complementaryTherapies: ComplementaryTherapy[]
  weitereEntries: WeitereTherapie[]
  sozialTargets: SozialtherapieTarget[]
  language: UiLanguage
}): OrderedTherapy[] {
  const { psychotherapyPlan, complementaryTherapies, weitereEntries, sozialTargets, language } =
    inputs
  const therapies: OrderedTherapy[] = []

  if (psychotherapyPlan && !isPlanEmpty(psychotherapyPlan) && psychotherapyPlan.overview.status !== 'completed') {
    const summary = derivePsychotherapySummary(psychotherapyPlan, language)
    const label =
      summary.method?.trim() ||
      summary.currentStage?.trim() ||
      (language === 'de' ? 'Psychotherapie' : 'Psychotherapy')
    therapies.push({
      key: 'psychotherapy',
      label,
      aliases: buildAliases(label, ['psychotherapie', 'psychotherapy', 'einzeltherapie', 'gruppentherapie']),
    })
  }

  for (const entry of weitereEntries) {
    if (entry.status === 'completed' || entry.status === 'declined' || entry.status === 'contraindicated') {
      continue
    }
    const label = translateWeitereTherapieType(language, entry.type)
    therapies.push({
      key: `weitere:${entry.id}`,
      label,
      aliases: buildAliases(label, [entry.type]),
    })
  }

  for (const therapy of complementaryTherapies) {
    if (therapy.status === 'completed') continue
    const label = therapy.name.trim()
    therapies.push({
      key: `complementary:${therapy.id}`,
      label,
      aliases: buildAliases(label),
    })
  }

  for (const target of sozialTargets) {
    if (target.status === 'resolved' || target.status === 'not-relevant') continue
    const label = translateSozialtherapieArea(language, target.area)
    therapies.push({
      key: `sozial:${target.id}`,
      label,
      aliases: buildAliases(label, [target.area, 'sozialtherapie', 'social therapy']),
    })
  }

  return therapies
}

export function computeTherapyAdherence(inputs: TherapyAdherenceInputs): TherapyAdherenceSummary {
  const windowDays = inputs.windowDays ?? ADHERENCE_WINDOW_DAYS
  const now = inputs.now ?? new Date()
  const therapies = collectOrderedTherapies(inputs)

  if (therapies.length === 0) {
    return { rows: [], hasOrderedTherapies: false, fullyCompliant: false, windowDays }
  }

  const counts = new Map<string, { participations: number; refusals: number; reasons: string[] }>()
  for (const therapy of therapies) {
    counts.set(therapy.key, { participations: 0, refusals: 0, reasons: [] })
  }

  const addEvent = (therapyKey: string, kind: 'refusal' | 'participation', reason?: string) => {
    const bucket = counts.get(therapyKey)
    if (!bucket) return
    if (kind === 'refusal') {
      bucket.refusals += 1
      if (reason?.trim()) bucket.reasons.push(reason.trim())
    } else {
      bucket.participations += 1
    }
  }

  const verlaufEntries = inputs.verlaufEntries.filter((entry) =>
    isWithinWindow(entry.date, windowDays, now),
  )

  for (const entry of verlaufEntries) {
    for (const event of scanTextForEvents(entry.content, therapies)) {
      addEvent(event.therapyKey, event.kind, event.reason)
    }
  }

  if (inputs.psychotherapyPlan && !isPlanEmpty(inputs.psychotherapyPlan)) {
    for (const session of inputs.psychotherapyPlan.sessions ?? []) {
      if (!isWithinWindow(session.date, windowDays, now)) continue
      addEvent('psychotherapy', 'participation')
    }
  }

  for (const therapy of inputs.complementaryTherapies) {
    const key = `complementary:${therapy.id}`
    if (!counts.has(key)) continue
    for (const session of therapy.sessions ?? []) {
      if (!isWithinWindow(session.date, windowDays, now)) continue
      const note = session.note.trim()
      if (!note) {
        addEvent(key, 'participation')
        continue
      }
      if (isRefusalNote(note)) {
        addEvent(key, 'refusal', note)
      } else {
        addEvent(key, 'participation')
      }
    }
  }

  const rows: TherapyAdherenceRow[] = therapies.map((therapy) => {
    const bucket = counts.get(therapy.key) ?? { participations: 0, refusals: 0, reasons: [] }
    const total = bucket.participations + bucket.refusals
    const percent =
      total === 0 ? 100 : Math.round((bucket.participations / total) * 100)
    return {
      therapy,
      percent,
      participations: bucket.participations,
      refusals: bucket.refusals,
      reasons: uniqueStrings(bucket.reasons),
    }
  })

  const fullyCompliant = rows.every((row) => row.percent === 100)

  return {
    rows,
    hasOrderedTherapies: true,
    fullyCompliant,
    windowDays,
  }
}

/** Convenience loader — reads Verlauf feed for the case id. */
export function loadTherapyAdherenceSummary(
  caseId: string,
  inputs: Omit<TherapyAdherenceInputs, 'verlaufEntries'>,
): TherapyAdherenceSummary {
  return computeTherapyAdherence({
    ...inputs,
    verlaufEntries: loadVerlaufFeed(caseId),
  })
}
