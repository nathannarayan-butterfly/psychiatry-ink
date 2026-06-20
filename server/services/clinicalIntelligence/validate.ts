/**
 * Clinical Intelligence — server-side strict validation + salvage.
 *
 * Each layer call returns a JSON object. We salvage as many valid items as
 * possible (so a single malformed entry never tanks the whole run) and
 * quarantine the rest with a human-readable reason. The final shape is then
 * re-validated against the strict zod schema before it leaves the route.
 */

import { z } from 'zod'
import {
  CLINICAL_INTELLIGENCE_DIMENSION_IDS,
  CLINICAL_INTELLIGENCE_MECHANISM_IDS,
  DimensionalFindingSchema,
  DimensionalIntegrationResultSchema,
  MechanismHypothesisSchema,
  MechanismInferenceResultSchema,
  ExploratoryNoteSchema,
  type CompactEvidencePayload,
  type DimensionalIntegrationResult,
  type MechanismInferenceResult,
  type QuarantineEntry,
} from '../../../src/types/clinicalIntelligence'

const DIMENSION_ID_SET = new Set<string>(CLINICAL_INTELLIGENCE_DIMENSION_IDS)
const MECHANISM_ID_SET = new Set<string>(CLINICAL_INTELLIGENCE_MECHANISM_IDS)

/**
 * Length caps must match the strict zod schemas in
 * `src/types/clinicalIntelligence.ts`. We clip *before* the schema sees the
 * value so a single absurd LLM output (e.g. `dimensionId` being a sentence)
 * can never fail the outer envelope validation.
 */
const MAX_RAW_ID = 120
const MAX_QUARANTINE_REASON = 400

export interface ValidationOutcome<TResult> {
  result: TResult
  issues: string[]
}

function clipRawId(value: string): string {
  return value.length > MAX_RAW_ID ? `${value.slice(0, MAX_RAW_ID - 1)}…` : value
}

function clipReason(value: string): string {
  return value.length > MAX_QUARANTINE_REASON
    ? `${value.slice(0, MAX_QUARANTINE_REASON - 1)}…`
    : value
}

/**
 * Coerce common confidence variants into the strict tri-state enum used by
 * the schema (`low | moderate | high`). LLMs frequently emit `medium`, `mid`,
 * `med`, German `mittel`, etc. We treat anything unrecognised as `low` so a
 * weak signal does not get promoted by accident.
 */
function normalizeConfidence(value: unknown): 'low' | 'moderate' | 'high' {
  if (typeof value !== 'string') return 'low'
  const normalized = value.trim().toLowerCase()
  if (
    normalized === 'moderate' ||
    normalized === 'medium' ||
    normalized === 'mid' ||
    normalized === 'med' ||
    normalized === 'mittel' ||
    normalized === 'm'
  ) {
    return 'moderate'
  }
  if (
    normalized === 'high' ||
    normalized === 'h' ||
    normalized === 'strong' ||
    normalized === 'hoch'
  ) {
    return 'high'
  }
  if (
    normalized === 'low' ||
    normalized === 'l' ||
    normalized === 'weak' ||
    normalized === 'niedrig' ||
    normalized === 'gering'
  ) {
    return 'low'
  }
  return 'low'
}

/**
 * Coerce severity to the strict 0–4 integer scale. Accepts numbers and
 * numeric strings (e.g. `"3"`); also tolerates very common verbal scales
 * such as "none/mild/moderate/severe/extreme" so a misaligned LLM does not
 * silently downgrade everything to 0.
 */
function coerceSeverity(value: unknown): 0 | 1 | 2 | 3 | 4 {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clampSeverity(value)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return 0
    const numeric = Number(trimmed)
    if (Number.isFinite(numeric)) return clampSeverity(numeric)
    const lower = trimmed.toLowerCase()
    if (lower === 'none' || lower === 'absent' || lower === 'keine') return 0
    if (lower === 'mild' || lower === 'leicht') return 1
    if (lower === 'moderate' || lower === 'medium' || lower === 'mittel') return 2
    if (lower === 'severe' || lower === 'schwer' || lower === 'ausgeprägt') return 3
    if (lower === 'extreme' || lower === 'crisis' || lower === 'krise') return 4
  }
  return 0
}

function clampSeverity(raw: number): 0 | 1 | 2 | 3 | 4 {
  const rounded = Math.round(raw)
  if (rounded <= 0) return 0
  if (rounded >= 4) return 4
  return rounded as 1 | 2 | 3
}

function trimToLabel(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

function tryExtractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) return null
  // Try a direct parse first; fall back to slicing between the outermost braces.
  try {
    return JSON.parse(trimmed)
  } catch {
    // fall through
  }
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(trimmed.slice(start, end + 1))
  } catch {
    return null
  }
}

function filterKnownEvidenceIds(
  ids: unknown,
  evidenceIds: Set<string>,
): string[] {
  if (!Array.isArray(ids)) return []
  return ids
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    .filter((id) => evidenceIds.has(id))
}

function coerceExploratory(value: unknown): Array<z.infer<typeof ExploratoryNoteSchema>> {
  if (!Array.isArray(value)) return []
  const result: Array<z.infer<typeof ExploratoryNoteSchema>> = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const topic = typeof (raw as { topic?: unknown }).topic === 'string'
      ? ((raw as { topic: string }).topic.trim().slice(0, 160))
      : ''
    const rationale = typeof (raw as { rationale?: unknown }).rationale === 'string'
      ? ((raw as { rationale: string }).rationale.trim().slice(0, 600))
      : ''
    if (!topic || !rationale) continue
    result.push({ topic, rationale })
  }
  return result
}

// ─── Dimensional ───────────────────────────────────────────────────────────

export function parseAndValidateDimensional(
  rawText: string,
  evidence: CompactEvidencePayload,
  options: { rejectedIds: ReadonlyArray<string> },
): ValidationOutcome<DimensionalIntegrationResult> {
  const issues: string[] = []
  const evidenceIds = new Set(evidence.items.map((item) => item.id))
  const seenDimensions = new Set<string>()
  const quarantined: QuarantineEntry[] = []
  const activeDimensions: z.infer<typeof DimensionalFindingSchema>[] = []
  const exploratoryAdded: Array<z.infer<typeof ExploratoryNoteSchema>> = []

  const json = tryExtractJsonObject(rawText)
  if (!json || typeof json !== 'object') {
    issues.push('JSON parse failed; returning empty active set')
    return {
      result: DimensionalIntegrationResultSchema.parse({
        activeDimensions: [],
        exploratoryInsufficientEvidence: [],
        quarantined: [{ kind: 'dimension', rawId: '', reason: 'JSON parse failed' }],
        warning: 'Modellantwort nicht parsebar — keine aktiven Dimensionen.',
      }),
      issues,
    }
  }

  const rawActive = (json as Record<string, unknown>).activeDimensions
  if (Array.isArray(rawActive)) {
    for (const raw of rawActive) {
      if (!raw || typeof raw !== 'object') {
        quarantined.push({ kind: 'dimension', rawId: '', reason: 'not an object' })
        continue
      }
      const r = raw as Record<string, unknown>
      const rawDimensionId = typeof r.dimensionId === 'string' ? r.dimensionId.trim() : ''
      const dimensionId = rawDimensionId
      if (!DIMENSION_ID_SET.has(dimensionId)) {
        quarantined.push({
          kind: 'dimension',
          rawId: clipRawId(rawDimensionId),
          reason: clipReason(
            rawDimensionId
              ? `unknown dimensionId "${rawDimensionId}"`
              : 'missing dimensionId',
          ),
        })
        continue
      }
      if (seenDimensions.has(dimensionId)) {
        quarantined.push({
          kind: 'dimension',
          rawId: clipRawId(dimensionId),
          reason: 'duplicate dimensionId',
        })
        continue
      }
      if (options.rejectedIds.includes(dimensionId)) {
        quarantined.push({
          kind: 'dimension',
          rawId: clipRawId(dimensionId),
          reason: 'previously rejected by clinician',
        })
        continue
      }

      const severity = coerceSeverity(r.severity)
      const confidence = normalizeConfidence(r.confidence)
      const summary = trimToLabel(r.clinicalSummary, 600)
      if (!summary) {
        quarantined.push({
          kind: 'dimension',
          rawId: clipRawId(dimensionId),
          reason: 'missing clinicalSummary',
        })
        continue
      }

      const candidateName = trimToLabel(r.dimensionName, 120) || dimensionId
      const candidate = {
        dimensionId,
        dimensionName: candidateName,
        severity,
        confidence,
        longitudinalPattern:
          typeof r.longitudinalPattern === 'string'
            ? r.longitudinalPattern.slice(0, 400)
            : '',
        supportingEvidenceIds: filterKnownEvidenceIds(r.supportingEvidenceIds, evidenceIds),
        contradictingEvidenceIds: filterKnownEvidenceIds(
          r.contradictingEvidenceIds,
          evidenceIds,
        ),
        clinicalSummary: summary,
        uncertainty: typeof r.uncertainty === 'string' ? r.uncertainty.slice(0, 400) : '',
        missingData: typeof r.missingData === 'string' ? r.missingData.slice(0, 400) : '',
        reviewStatus: 'pending' as const,
        source: 'evidence_based' as const,
      }

      // Hard rule: a dimension without supporting evidence cannot be "active".
      if (candidate.supportingEvidenceIds.length === 0) {
        exploratoryAdded.push({
          topic: candidate.dimensionName,
          rationale: 'Keine ausreichende Evidenz im Befund.',
        })
        issues.push(`dimension ${dimensionId} demoted to exploratory (no evidence)`)
        continue
      }

      const validated = DimensionalFindingSchema.safeParse(candidate)
      if (!validated.success) {
        quarantined.push({
          kind: 'dimension',
          rawId: clipRawId(dimensionId),
          reason: clipReason(
            `schema: ${validated.error.issues[0]?.message ?? 'invalid'}`,
          ),
        })
        continue
      }
      activeDimensions.push(validated.data)
      seenDimensions.add(dimensionId)
    }
  } else {
    issues.push('activeDimensions missing or not an array')
  }

  const exploratoryFromModel = coerceExploratory(
    (json as Record<string, unknown>).exploratoryInsufficientEvidence,
  )

  const result = DimensionalIntegrationResultSchema.safeParse({
    activeDimensions,
    exploratoryInsufficientEvidence: [...exploratoryFromModel, ...exploratoryAdded],
    quarantined,
  })

  if (!result.success) {
    issues.push(`assembled result failed validation: ${result.error.issues[0]?.message ?? 'invalid'}`)
    return {
      result: DimensionalIntegrationResultSchema.parse({
        activeDimensions: [],
        exploratoryInsufficientEvidence: [],
        quarantined: [{ kind: 'dimension', rawId: '', reason: 'assembly failure' }],
        warning: 'Validierungsfehler — keine aktiven Dimensionen.',
      }),
      issues,
    }
  }

  return { result: result.data, issues }
}

// ─── Mechanism ─────────────────────────────────────────────────────────────

export function parseAndValidateMechanism(
  rawText: string,
  evidence: CompactEvidencePayload,
  options: {
    rejectedIds: ReadonlyArray<string>
    acceptedDimensionIds: ReadonlyArray<string>
  },
): ValidationOutcome<MechanismInferenceResult> {
  const issues: string[] = []
  const evidenceIds = new Set(evidence.items.map((item) => item.id))
  const acceptedDims = new Set(options.acceptedDimensionIds)
  const seen = new Set<string>()
  const quarantined: QuarantineEntry[] = []
  const activeMechanisms: z.infer<typeof MechanismHypothesisSchema>[] = []
  const exploratoryAdded: Array<z.infer<typeof ExploratoryNoteSchema>> = []

  const json = tryExtractJsonObject(rawText)
  if (!json || typeof json !== 'object') {
    issues.push('JSON parse failed; returning empty active set')
    return {
      result: MechanismInferenceResultSchema.parse({
        activeMechanisms: [],
        exploratoryInsufficientEvidence: [],
        quarantined: [{ kind: 'mechanism', rawId: '', reason: 'JSON parse failed' }],
        warning: 'Modellantwort nicht parsebar — keine aktiven Mechanismen.',
      }),
      issues,
    }
  }

  const rawActive = (json as Record<string, unknown>).activeMechanisms
  if (Array.isArray(rawActive)) {
    for (const raw of rawActive) {
      if (!raw || typeof raw !== 'object') {
        quarantined.push({ kind: 'mechanism', rawId: '', reason: 'not an object' })
        continue
      }
      const r = raw as Record<string, unknown>
      const rawMechanismId = typeof r.mechanismId === 'string' ? r.mechanismId.trim() : ''
      const mechanismId = rawMechanismId
      if (!MECHANISM_ID_SET.has(mechanismId)) {
        quarantined.push({
          kind: 'mechanism',
          rawId: clipRawId(rawMechanismId),
          reason: clipReason(
            rawMechanismId
              ? `unknown mechanismId "${rawMechanismId}"`
              : 'missing mechanismId',
          ),
        })
        continue
      }
      if (seen.has(mechanismId)) {
        quarantined.push({
          kind: 'mechanism',
          rawId: clipRawId(mechanismId),
          reason: 'duplicate mechanismId',
        })
        continue
      }
      if (options.rejectedIds.includes(mechanismId)) {
        quarantined.push({
          kind: 'mechanism',
          rawId: clipRawId(mechanismId),
          reason: 'previously rejected by clinician',
        })
        continue
      }

      const confidence = normalizeConfidence(r.confidence)
      const implication = trimToLabel(r.clinicalImplication, 600)
      const treatment = trimToLabel(r.treatmentRelevance, 1_400)
      if (!implication || !treatment) {
        quarantined.push({
          kind: 'mechanism',
          rawId: clipRawId(mechanismId),
          reason: 'missing clinicalImplication or treatmentRelevance',
        })
        continue
      }

      const linkedDimensionsRaw = Array.isArray(r.linkedDimensions) ? r.linkedDimensions : []
      const linkedDimensions = linkedDimensionsRaw
        .filter((d): d is string => typeof d === 'string')
        .filter((d) => DIMENSION_ID_SET.has(d) && acceptedDims.has(d))

      const candidateLabel = trimToLabel(r.label, 160) || mechanismId
      const candidate = {
        mechanismId,
        label: candidateLabel,
        confidence,
        linkedDimensions,
        supportingEvidenceIds: filterKnownEvidenceIds(r.supportingEvidenceIds, evidenceIds),
        contradictingEvidenceIds: filterKnownEvidenceIds(
          r.contradictingEvidenceIds,
          evidenceIds,
        ),
        clinicalImplication: implication,
        treatmentRelevance: treatment,
        uncertainty: typeof r.uncertainty === 'string' ? r.uncertainty.slice(0, 400) : '',
        reviewStatus: 'pending' as const,
        source: 'evidence_based' as const,
      }

      if (
        candidate.supportingEvidenceIds.length === 0 ||
        candidate.linkedDimensions.length === 0
      ) {
        exploratoryAdded.push({
          topic: candidate.label,
          rationale: 'Mechanismus ohne ausreichende Evidenz oder akzeptierte Dimensionen.',
        })
        issues.push(`mechanism ${mechanismId} demoted to exploratory`)
        continue
      }

      const validated = MechanismHypothesisSchema.safeParse(candidate)
      if (!validated.success) {
        quarantined.push({
          kind: 'mechanism',
          rawId: clipRawId(mechanismId),
          reason: clipReason(
            `schema: ${validated.error.issues[0]?.message ?? 'invalid'}`,
          ),
        })
        continue
      }
      activeMechanisms.push(validated.data)
      seen.add(mechanismId)
    }
  } else {
    issues.push('activeMechanisms missing or not an array')
  }

  const exploratoryFromModel = coerceExploratory(
    (json as Record<string, unknown>).exploratoryInsufficientEvidence,
  )

  const result = MechanismInferenceResultSchema.safeParse({
    activeMechanisms,
    exploratoryInsufficientEvidence: [...exploratoryFromModel, ...exploratoryAdded],
    quarantined,
  })

  if (!result.success) {
    issues.push(`assembled result failed validation: ${result.error.issues[0]?.message ?? 'invalid'}`)
    return {
      result: MechanismInferenceResultSchema.parse({
        activeMechanisms: [],
        exploratoryInsufficientEvidence: [],
        quarantined: [{ kind: 'mechanism', rawId: '', reason: 'assembly failure' }],
        warning: 'Validierungsfehler — keine aktiven Mechanismen.',
      }),
      issues,
    }
  }

  return { result: result.data, issues }
}
