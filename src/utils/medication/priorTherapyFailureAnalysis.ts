import type { MedicationEntry } from '../../types/medicationPlan'
import type {
  DeterministicFailureSignals,
  PriorTherapyItem,
  SubtherapeuticLevelSignal,
} from '../../types/priorTherapies'
import { getDrugsForSubstance } from '../../data/psychDrugReference'
import { RECEPTOR_AXES, affinityScore } from './referenceReceptorProfile'
import { isCyp1a2SmokingSensitive } from './failureAnalysisSynthesis'
import { normalizeSubstanceKey } from './priorTherapies'
import { enrichFailureSignalsWithFact } from './priorTherapyFacts'

/**
 * Computes the DETERMINISTIC signals that feed the prior-therapy failure
 * analysis ("mögliche Ursache"). Everything here is derived from structured data
 * the app already holds — serum levels, smoking status, the medication entry's
 * adherence/dose/duration, and the static receptor profile. No network, no
 * fabrication: a signal is only set when the underlying data supports it.
 */

/** Minimal structural view of a Spiegelwert series (see SpiegelwerteSection). */
export interface SpiegelSeriesLike {
  name: string
  points: { value: number; date: string; refMin?: number; refMax?: number }[]
  unit: string
  refMin?: number
  refMax?: number
}

export interface FailureAnalysisContext {
  spiegelSeries: SpiegelSeriesLike[]
  /** Smoking status from the Anamnese (null = undocumented). */
  smoking: boolean | null
  entriesBySubstance: Map<string, MedicationEntry>
  /** CMEA trial facts by normalized substance — fills signal gaps (Phase 3). */
  trialFactsBySubstance?: Map<string, import('../../types/clinicalMetadata').MedicationTrialFact>
}

/**
 * Whether a prior therapy counts as an EFFICACY failure worth analysing.
 * No-response and partial-response always qualify; a `discontinued` entry only
 * qualifies when its reason reads as inefficacy. Intolerance / side-effect stops
 * are excluded — their cause (the adverse effect) is already the documented why.
 */
const INEFFICACY_REASON = /kein.{0,20}ansprech|nicht angesprochen|wirkungslos|keine besserung|unwirksam|ineffektiv|non.?respon|fehlende wirkung|keine wirkung/i

export function isInefficacyFailure(item: PriorTherapyItem): boolean {
  if (item.event === 'no_response' || item.event === 'partial_response') return true
  if (item.event === 'discontinued') {
    const haystack = `${item.reason ?? ''} ${item.evidenceQuote ?? ''}`
    return INEFFICACY_REASON.test(haystack)
  }
  return false
}

/** Find the serum-level series whose parameter name matches the substance. */
function findSeriesForSubstance(
  substance: string,
  series: SpiegelSeriesLike[],
): SpiegelSeriesLike | null {
  const key = substance.trim().toLowerCase()
  if (key.length < 3) return null
  return (
    series.find((s) => {
      const name = s.name.trim().toLowerCase()
      return name.includes(key) || key.includes(name)
    }) ?? null
  )
}

export function detectSubtherapeuticLevel(
  substance: string,
  series: SpiegelSeriesLike[],
): { measured: boolean; subtherapeutic: SubtherapeuticLevelSignal | null } {
  const match = findSeriesForSubstance(substance, series)
  if (!match || match.points.length === 0) return { measured: false, subtherapeutic: null }

  const latest = match.points[match.points.length - 1]!
  const refMin = latest.refMin ?? match.refMin
  const refMax = latest.refMax ?? match.refMax

  if (refMin === undefined || latest.value >= refMin) {
    return { measured: true, subtherapeutic: null }
  }

  return {
    measured: true,
    subtherapeutic: {
      parameter: match.name,
      value: latest.value,
      unit: match.unit,
      refMin,
      refMax,
      date: latest.date,
    },
  }
}

const SMOKING_NEGATIVE =
  /nichtraucher|raucht nicht|kein(?:e[rn]?)?\s+(?:nikotin|zigaretten|tabak)|nikotinkarenz|nikotinfrei|ex-?raucher/i
const SMOKING_POSITIVE =
  /\braucher\b|\braucht\b|nikotinabusus|nikotinkonsum|tabakabusus|tabakkonsum|zigaretten|\d+\s*(?:py\b|pack[\s-]?years|packungsjahre)/i

export function detectSmoking(text: string): boolean | null {
  if (!text) return null
  if (SMOKING_NEGATIVE.test(text)) return false
  if (SMOKING_POSITIVE.test(text)) return true
  return null
}

const POOR_ADHERENCE =
  /unregelmäßig|nicht eingenommen|nicht genommen|schlechte adhärenz|mangelnde adhärenz|non.?adhär|compliance\s+(?:unsicher|schlecht|fraglich|mangel)|eigenmächtig abgesetzt|nicht zuverlässig|einnahme.{0,12}unsicher|fehlende einnahme/i

export function detectPoorAdherence(text: string): boolean {
  return !!text && POOR_ADHERENCE.test(text)
}

const SUBDOSE_TEXT =
  /unterdosiert|subtherapeut|niedrig dosiert|zu niedrig|nicht aufdosiert|nicht eindosiert/i
const SHORT_DURATION_TEXT = /zu kurz|kurzzeitig|wenige tage|nur \d+\s*tag|abbruch nach \d+\s*tag/i

/** Days between start and the last documented change (i.e. trial length). */
function trialDurationDays(entry: MedicationEntry): number | null {
  const start = Date.parse(entry.startDate || entry.introducedAt)
  const end = Date.parse(entry.lastChangeAt)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
  return Math.round((end - start) / 86_400_000)
}

export function detectDoseDurationInadequacy(
  entry: MedicationEntry | undefined,
  item: PriorTherapyItem,
): { detail: string } | null {
  const haystack = [
    entry?.reasonForChange,
    entry?.freeTextLine,
    item.reason,
    item.evidenceQuote,
  ]
    .filter(Boolean)
    .join(' ')

  if (SUBDOSE_TEXT.test(haystack)) {
    return { detail: 'Dosis laut Dokumentation möglicherweise subtherapeutisch.' }
  }
  if (SHORT_DURATION_TEXT.test(haystack)) {
    return { detail: 'Therapiedauer laut Dokumentation sehr kurz.' }
  }
  if (entry) {
    const days = trialDurationDays(entry)
    if (days !== null && days > 0 && days < 14) {
      return { detail: `Therapiedauer nur ca. ${days} Tage (< 2 Wochen).` }
    }
  }
  return null
}

/** Qualitative summary of the substance's dominant receptor axes for the LLM. */
export function summarizeReceptorProfile(substance: string): string | null {
  const drug = getDrugsForSubstance(substance).find((d) => d.receptorProfile)
  if (!drug?.receptorProfile) return null
  const profile = drug.receptorProfile
  const dominant = RECEPTOR_AXES.filter((axis) => affinityScore(profile[axis.key]) >= 3).map(
    (axis) => axis.labelDe,
  )
  return dominant.length > 0 ? dominant.join(', ') : null
}

export function computeFailureSignals(
  item: PriorTherapyItem,
  ctx: FailureAnalysisContext,
): DeterministicFailureSignals {
  const entry = ctx.entriesBySubstance.get(normalizeSubstanceKey(item.substance))
  const level = detectSubtherapeuticLevel(item.substance, ctx.spiegelSeries)
  const cyp1a2Smoking = ctx.smoking === true && isCyp1a2SmokingSensitive(item.substance)

  const adherenceText = [entry?.adherenceNote, item.reason, item.evidenceQuote]
    .filter(Boolean)
    .join(' ')
  const poorAdherence = detectPoorAdherence(adherenceText)
    ? { note: entry?.adherenceNote?.trim() || item.reason?.trim() || 'unzureichende Adhärenz dokumentiert' }
    : null

  const signals: DeterministicFailureSignals = {
    substance: item.substance,
    subtherapeuticLevel: level.subtherapeutic,
    levelMeasured: level.measured,
    cyp1a2Smoking,
    smoking: ctx.smoking,
    poorAdherence,
    inadequateDoseDuration: detectDoseDurationInadequacy(entry, item),
    receptorProfileSummary: summarizeReceptorProfile(item.substance),
  }

  // Fold in whatever the advisory CMEA trial fact adds (gaps only).
  const fact = ctx.trialFactsBySubstance?.get(normalizeSubstanceKey(item.substance))
  return enrichFailureSignalsWithFact(signals, fact)
}
