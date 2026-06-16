import type { UiLanguage } from '../../types/settings'
import type {
  DeterministicFailureSignals,
  FailureAnalysis,
  FailureCause,
  FailureCauseHypothesis,
} from '../../types/priorTherapies'

/**
 * Pure (no DOM / no React / no network) synthesis of a "mögliche Ursache"
 * hypothesis for a failed prior therapy, from deterministic signals. Shared by:
 *  - the client (instant, offline result shown before the LLM resolves), and
 *  - the server route's mock fallback (no API key → deterministic synthesis).
 *
 * It never fabricates: a cause is only emitted when its signal is present, and
 * when nothing is documented it explicitly returns `insufficient_data`. The LLM
 * pass (when a key is configured) may add softer hypotheses such as
 * `receptor_mismatch`, which is intentionally NOT asserted deterministically.
 *
 * The taxonomy is kept stable and source-agnostic so this folds cleanly into the
 * future unified Clinical Metadata Extraction Agent (CMEA).
 */

export const VALID_FAILURE_CAUSES: FailureCause[] = [
  'subtherapeutic_level',
  'cyp_induction_smoking',
  'receptor_mismatch',
  'adherence',
  'inadequate_dose_duration',
  'insufficient_data',
  'other',
]

/**
 * Substances whose plasma levels are materially lowered by smoking (CYP1A2
 * induction). Clozapine and olanzapine are the classic, strongly-affected
 * agents; duloxetine and agomelatine are CYP1A2 substrates too.
 */
const CYP1A2_SMOKING_SENSITIVE = [
  'clozapin',
  'clozapine',
  'olanzapin',
  'olanzapine',
  'duloxetin',
  'duloxetine',
  'agomelatin',
  'agomelatine',
  'asenapin',
  'asenapine',
]

export function isCyp1a2SmokingSensitive(substance: string): boolean {
  const s = substance.trim().toLowerCase()
  return CYP1A2_SMOKING_SENSITIVE.some((drug) => s.includes(drug))
}

const CAUSE_LABELS_DE: Record<FailureCause, string> = {
  subtherapeutic_level: 'Subtherapeutischer Spiegel',
  cyp_induction_smoking: 'CYP-Induktion / Rauchen',
  receptor_mismatch: 'Pharmakodynamischer Mismatch',
  adherence: 'Adhärenz',
  inadequate_dose_duration: 'Dosis-/Therapiedauer-Adäquanz',
  insufficient_data: 'Keine ausreichenden Daten',
  other: 'Sonstiges',
}

const CAUSE_LABELS_EN: Record<FailureCause, string> = {
  subtherapeutic_level: 'Subtherapeutic level',
  cyp_induction_smoking: 'CYP induction / smoking',
  receptor_mismatch: 'Pharmacodynamic mismatch',
  adherence: 'Adherence',
  inadequate_dose_duration: 'Dose / trial duration',
  insufficient_data: 'Insufficient data',
  other: 'Other',
}

const CAUSE_SHORT_DE: Record<FailureCause, string> = {
  subtherapeutic_level: 'subtherap. Spiegel',
  cyp_induction_smoking: 'Rauchen/CYP1A2',
  receptor_mismatch: 'Rezeptor-Mismatch',
  adherence: 'Adhärenz',
  inadequate_dose_duration: 'Dosis/Dauer',
  insufficient_data: 'keine Daten',
  other: 'sonstiges',
}

const CAUSE_SHORT_EN: Record<FailureCause, string> = {
  subtherapeutic_level: 'subtherap. level',
  cyp_induction_smoking: 'smoking/CYP1A2',
  receptor_mismatch: 'receptor mismatch',
  adherence: 'adherence',
  inadequate_dose_duration: 'dose/duration',
  insufficient_data: 'no data',
  other: 'other',
}

export function failureCauseLabel(cause: FailureCause, language: UiLanguage): string {
  return (language === 'de' ? CAUSE_LABELS_DE : CAUSE_LABELS_EN)[cause]
}

export function failureCauseShortLabel(cause: FailureCause, language: UiLanguage): string {
  return (language === 'de' ? CAUSE_SHORT_DE : CAUSE_SHORT_EN)[cause]
}

function levelRangeText(signal: NonNullable<DeterministicFailureSignals['subtherapeuticLevel']>): string {
  const range =
    signal.refMin !== undefined && signal.refMax !== undefined
      ? `${signal.refMin}–${signal.refMax}`
      : signal.refMin !== undefined
        ? `≥ ${signal.refMin}`
        : signal.refMax !== undefined
          ? `≤ ${signal.refMax}`
          : '—'
  return `${signal.value} ${signal.unit} (Ref ${range}${signal.unit ? ` ${signal.unit}` : ''})`
}

/**
 * Deterministically synthesise the likely causes from structured signals.
 * Returns `insufficient_data` when no signal is documented.
 */
export function buildFailureAnalysisFromSignals(
  signals: DeterministicFailureSignals,
): FailureAnalysis {
  const causes: FailureCauseHypothesis[] = []

  if (signals.subtherapeuticLevel) {
    const lvl = signals.subtherapeuticLevel
    causes.push({
      cause: 'subtherapeutic_level',
      explanation_de: `Dokumentierter Spiegel von ${lvl.parameter} liegt unterhalb des therapeutischen Referenzbereichs — subtherapeutisch.`,
      evidence: levelRangeText(lvl),
      confidence: 0.85,
    })
  }

  if (signals.cyp1a2Smoking) {
    causes.push({
      cause: 'cyp_induction_smoking',
      explanation_de: `${signals.substance} wird über CYP1A2 metabolisiert; Rauchen induziert CYP1A2 und kann den Wirkstoffspiegel senken.`,
      evidence: signals.smoking ? 'Raucherstatus dokumentiert' : undefined,
      // Stronger when a low level corroborates the induction mechanism.
      confidence: signals.subtherapeuticLevel ? 0.8 : 0.6,
    })
  }

  if (signals.poorAdherence) {
    causes.push({
      cause: 'adherence',
      explanation_de: 'Hinweise auf unzureichende Adhärenz — eine wirksame Exposition war ggf. nicht gegeben.',
      evidence: signals.poorAdherence.note || undefined,
      confidence: 0.6,
    })
  }

  if (signals.inadequateDoseDuration) {
    causes.push({
      cause: 'inadequate_dose_duration',
      explanation_de: 'Dosis oder Therapiedauer möglicherweise nicht adäquat für eine belastbare Wirksamkeitsbeurteilung.',
      evidence: signals.inadequateDoseDuration.detail || undefined,
      confidence: 0.55,
    })
  }

  if (causes.length === 0) {
    causes.push({
      cause: 'insufficient_data',
      explanation_de: 'Keine ausreichenden Daten, um die Ursache zu beurteilen.',
      confidence: 0.2,
    })
  }

  causes.sort((a, b) => b.confidence - a.confidence)
  return { likelyCauses: causes }
}

/** Validate + clamp one raw LLM cause; null when the cause is unusable. */
export function sanitizeFailureCause(raw: unknown): FailureCauseHypothesis | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const cause = String(r.cause ?? '').trim() as FailureCause
  if (!VALID_FAILURE_CAUSES.includes(cause)) return null
  const explanation = typeof r.explanation_de === 'string' ? r.explanation_de.trim().slice(0, 400) : ''
  if (!explanation) return null
  const evidenceRaw = r.evidence ?? r.evidenceQuote
  const evidence = typeof evidenceRaw === 'string' && evidenceRaw.trim() ? evidenceRaw.trim().slice(0, 300) : undefined
  let confidence = typeof r.confidence === 'number' ? r.confidence : Number(r.confidence)
  if (!Number.isFinite(confidence)) confidence = 0.5
  confidence = Math.max(0, Math.min(1, confidence))
  return { cause, explanation_de: explanation, evidence, confidence }
}

export function sanitizeFailureCauses(raw: unknown): FailureCauseHypothesis[] {
  const list = Array.isArray(raw) ? raw : []
  const out: FailureCauseHypothesis[] = []
  const seen = new Set<FailureCause>()
  for (const item of list) {
    const cause = sanitizeFailureCause(item)
    if (!cause || seen.has(cause.cause)) continue
    seen.add(cause.cause)
    out.push(cause)
  }
  return out.slice(0, 6)
}
