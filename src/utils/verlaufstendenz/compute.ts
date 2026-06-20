import type {
  VerlaufstendenzComputed,
  VerlaufstendenzConfidence,
  VerlaufstendenzDomain,
  VerlaufstendenzDomainResult,
  VerlaufstendenzSourceEntry,
  VerlaufstendenzTrend,
  VerlaufstendenzWindowPreset,
} from '../../types/verlaufstendenz'
import type { ClinicalImprintRecord } from '../../types/clinicalImprint'
import type { SafetyRiskSignal } from '../../components/notion/overview/types'
import type { VerlaufFeedEntry } from '../verlaufFeed'
import { formatDateDe } from '../overview/dateLabels'
import {
  extractComplianceSignal,
  extractImprintSignals,
  extractSafetySignals,
  extractSomaticLabSignal,
  extractVerlaufFeedSignals,
  scoreToDomainDirection,
  type DomainSignal,
} from './signals'
import { buildVerlaufstendenzRationale } from './rationale'

export interface ComputeVerlaufstendenzInput {
  imprints: ClinicalImprintRecord[]
  verlaufEntries: VerlaufFeedEntry[]
  harmSignals: SafetyRiskSignal[]
  complianceOverallPercent: number | null
  abnormalLabCount: number
  admissionDateIso: string | null
  windowPreset: VerlaufstendenzWindowPreset
  customWindowStart?: string
  customWindowEnd?: string
}

export interface WindowBounds {
  startMs: number | null
  endMs: number
  startIso: string | null
  endIso: string | null
}

const ALL_DOMAINS: VerlaufstendenzDomain[] = [
  'safety_risk',
  'core_psychopathology',
  'ward_behavior',
  'sleep_drive_affect',
  'insight_compliance',
  'somatic_side_effects',
  'social_functioning',
]

export function resolveWindowBounds(input: {
  windowPreset: VerlaufstendenzWindowPreset
  admissionDateIso: string | null
  customWindowStart?: string
  customWindowEnd?: string
  now?: Date
}): WindowBounds {
  const now = input.now ?? new Date()
  const endMs = input.customWindowEnd ? new Date(input.customWindowEnd).getTime() : now.getTime()
  let startMs: number | null = null

  switch (input.windowPreset) {
    case '7d':
      startMs = endMs - 7 * 24 * 60 * 60 * 1000
      break
    case '14d':
      startMs = endMs - 14 * 24 * 60 * 60 * 1000
      break
    case 'admission':
      startMs = input.admissionDateIso ? new Date(input.admissionDateIso).getTime() : null
      break
    case 'custom':
      startMs = input.customWindowStart ? new Date(input.customWindowStart).getTime() : null
      break
  }

  return {
    startMs: startMs !== null && Number.isNaN(startMs) ? null : startMs,
    endMs,
    startIso: startMs ? new Date(startMs).toISOString().slice(0, 10) : null,
    endIso: new Date(endMs).toISOString().slice(0, 10),
  }
}

function aggregateDomainSignals(signals: DomainSignal[]): VerlaufstendenzDomainResult[] {
  return ALL_DOMAINS.map((domain) => {
    const domainSignals = signals.filter((s) => s.domain === domain)
    if (domainSignals.length === 0) {
      return { domain, direction: 'nicht_beurteilbar' as const, evidence: [] }
    }

    const scores = domainSignals.map((s) => s.score)
    const hasPositive = scores.some((s) => s > 0)
    const hasNegative = scores.some((s) => s < 0)
    if (hasPositive && hasNegative) {
      return {
        domain,
        direction: 'gemischt' as const,
        evidence: domainSignals.map((s) => s.evidence).slice(0, 4),
      }
    }

    const avg = scores.reduce<number>((sum, s) => sum + s, 0) / scores.length
    return {
      domain,
      direction: scoreToDomainDirection(avg),
      evidence: domainSignals.map((s) => s.evidence).slice(0, 4),
    }
  })
}

function numericFromDirection(
  direction: VerlaufstendenzDomainResult['direction'],
): number | null {
  switch (direction) {
    case 'deutlich_gebessert':
      return 2
    case 'leicht_gebessert':
      return 1
    case 'stabil':
      return 0
    case 'leicht_verschlechtert':
      return -1
    case 'deutlich_verschlechtert':
      return -2
    case 'gemischt':
      return 0
    default:
      return null
  }
}

function aggregateOverallTrend(
  domains: VerlaufstendenzDomainResult[],
  safetyAcute: boolean,
): VerlaufstendenzTrend {
  if (safetyAcute) return 'kritisch_handlungsrelevant'

  const scored = domains
    .map((d) => ({ domain: d.domain, value: numericFromDirection(d.direction) }))
    .filter((d): d is { domain: VerlaufstendenzDomain; value: number } => d.value !== null)

  if (scored.length === 0) return 'nicht_beurteilbar'
  if (scored.length === 1 && scored[0].domain !== 'safety_risk') {
    // Single non-safety domain — still assessable but mark via confidence, not trend
  }

  const improved = scored.filter((d) => d.value > 0)
  const worsened = scored.filter((d) => d.value < 0)
  const mixed = domains.some((d) => d.direction === 'gemischt')

  if (mixed || (improved.length > 0 && worsened.length > 0)) return 'schwankend'

  const assessable = scored.length
  if (assessable < 1) return 'nicht_beurteilbar'

  const avg = scored.reduce((sum, d) => sum + d.value, 0) / scored.length
  if (avg >= 1.25) return 'deutlich_gebessert'
  if (avg >= 0.5) return 'leicht_gebessert'
  if (avg <= -1.25) return 'deutlich_verschlechtert'
  if (avg <= -0.5) return 'leicht_verschlechtert'
  if (Math.abs(avg) <= 0.25) return 'stabil'
  return 'nicht_beurteilbar'
}

function computeConfidence(
  domains: VerlaufstendenzDomainResult[],
  verlaufCount: number,
  trend: VerlaufstendenzTrend,
): VerlaufstendenzConfidence {
  if (trend === 'nicht_beurteilbar') return 'insufficient'
  const assessable = domains.filter((d) => d.direction !== 'nicht_beurteilbar').length
  if (assessable >= 4 && verlaufCount >= 2) return 'high'
  if (assessable >= 2) return 'medium'
  if (assessable >= 1) return 'low'
  return 'insufficient'
}

function collectSourceEntries(
  verlaufEntries: VerlaufFeedEntry[],
  startMs: number | null,
  endMs: number,
): VerlaufstendenzSourceEntry[] {
  return verlaufEntries
    .filter((e) => {
      const ts = new Date(e.date).getTime()
      if (Number.isNaN(ts)) return false
      if (startMs !== null && ts < startMs) return false
      return ts <= endMs
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
    .map((e) => ({
      id: e.id,
      dateIso: e.date,
      dateLabel: formatDateDe(e.date) ?? e.date,
      text: e.content.replace(/\s+/g, ' ').trim().slice(0, 220),
      sourceLabel: e.pageType === 'therapie-verlauf' ? 'Therapie-Verlauf' : 'Verlauf',
    }))
}

/** Rule-based Verlaufstendenz from structured case signals. */
export function computeVerlaufstendenz(input: ComputeVerlaufstendenzInput): VerlaufstendenzComputed {
  const bounds = resolveWindowBounds(input)
  const allSignals: DomainSignal[] = [
    ...extractImprintSignals(input.imprints, bounds.startMs, bounds.endMs),
    ...extractVerlaufFeedSignals(input.verlaufEntries, bounds.startMs, bounds.endMs),
    ...extractSafetySignals(input.harmSignals),
  ]

  const compliance = extractComplianceSignal(input.complianceOverallPercent)
  if (compliance) allSignals.push(compliance)

  const somatic = extractSomaticLabSignal(input.abnormalLabCount)
  if (somatic) allSignals.push(somatic)

  const domains = aggregateDomainSignals(allSignals)
  const safetyDomain = domains.find((d) => d.domain === 'safety_risk')
  const safetyAcute =
    safetyDomain?.direction === 'deutlich_verschlechtert' ||
    allSignals.some((s) => s.domain === 'safety_risk' && s.score <= -2)

  const trend = aggregateOverallTrend(domains, safetyAcute)
  const verlaufInWindow = input.verlaufEntries.filter((e) => {
    const ts = new Date(e.date).getTime()
    if (Number.isNaN(ts)) return false
    if (bounds.startMs !== null && ts < bounds.startMs) return false
    return ts <= bounds.endMs
  }).length

  const confidence = computeConfidence(domains, verlaufInWindow, trend)
  const finalTrend = confidence === 'insufficient' ? 'nicht_beurteilbar' : trend

  return {
    trend: finalTrend,
    rationaleSentence: buildVerlaufstendenzRationale(finalTrend, domains),
    confidence,
    domains,
    sourceEntries: collectSourceEntries(input.verlaufEntries, bounds.startMs, bounds.endMs),
    computedAt: new Date().toISOString(),
    windowPreset: input.windowPreset,
    windowStartIso: bounds.startIso,
    windowEndIso: bounds.endIso,
  }
}
