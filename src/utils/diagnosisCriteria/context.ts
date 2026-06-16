/**
 * Butterfly — DisorderEvaluationContext
 *
 * The read-only data substrate the deterministic criteria evaluator works on.
 *
 * Everything here is DERIVED from data the ISDM engine already gathered: the
 * phenomenology domains (built from imprints + psychopathology checklist +
 * medication plan + clinician ISDM input), the course pattern, and any
 * clinician attestations. Nothing is fabricated — a predicate that cannot be
 * resolved from this structured data returns `unknown` and becomes a clinician
 * checkbox rather than a guess.
 *
 * The same context builder feeds both the engine (`buildDiagnosticMappings`)
 * and the Butterfly panel, so the auto-evaluation is identical in both places.
 */

import type {
  CoursePattern,
  CourseDuration,
  IsdmPhenomenologyDomain,
  SymptomFinding,
} from '../../types/isdm'

/** A clinician-attested value for a criterion that could not be auto-derived. */
export type ClinicianAttestationValue = 'met' | 'not_met'

/** Per-criterion attestation map, keyed by globally-unique criterion id. */
export type AttestationMap = Record<string, ClinicianAttestationValue>

export interface DisorderEvaluationContextInput {
  phenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>
  coursePattern: CoursePattern
  attestations?: AttestationMap
}

/**
 * Ordinal scale for the coarse course duration the engine derives, used for
 * timeWindow (minimum-duration) checks. `unclear` → null (treated as unknown).
 */
const DURATION_ORDINAL: Record<CourseDuration, number | null> = {
  days: 1,
  weeks: 2,
  months: 3,
  years: 4,
  lifelong: 5,
  unclear: null,
}

/** Convert a minimum duration in days into the minimum coarse-scale ordinal. */
export function minDurationDaysToOrdinal(minDurationDays: number): number {
  if (minDurationDays < 14) return 1 // days
  if (minDurationDays < 56) return 2 // ~weeks
  if (minDurationDays < 365) return 3 // ~months
  return 4 // years
}

export interface DisorderEvaluationContext {
  readonly phenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>
  readonly coursePattern: CoursePattern
  readonly attestations: AttestationMap

  /** Clinician attestation for a criterion, if one exists. */
  attestationFor(criterionId: string): ClinicianAttestationValue | undefined

  /** First `present` finding in a domain (optionally matching a regex on label/keywords). */
  present(domain: IsdmPhenomenologyDomain, match?: RegExp): SymptomFinding | undefined

  /** First `absent` finding in a domain (optionally matching a regex). Explicit negative. */
  absent(domain: IsdmPhenomenologyDomain, match?: RegExp): SymptomFinding | undefined

  /** True when ANY documented finding (any polarity) exists in the domain. */
  hasAnyFinding(domain: IsdmPhenomenologyDomain): boolean

  /** True when the documented course duration meets a minimum-day threshold. null when unknown. */
  durationMeets(minDurationDays: number): boolean | null

  /**
   * Whether substance use is documented as occasional / controlled / low-risk.
   * Positive evidence AGAINST a substance-dependence pattern.
   */
  readonly substanceControlledUse: boolean
}

function findingMatches(finding: SymptomFinding, match?: RegExp): boolean {
  if (!match) return true
  if (match.test(finding.label)) return true
  return finding.keywords.some((keyword) => match.test(keyword))
}

const CONTROLLED_USE_PATTERN =
  /gelegentlich|kontrolliert|moderat|risikoarm|sozial(?:es|er)?\s+trinken|kein\s+t[äa]glich|nicht\s+t[äa]glich|abstinen|kein\s+regelm[äa]ßig/i

function deriveSubstanceControlledUse(
  phenomenology: Record<IsdmPhenomenologyDomain, SymptomFinding[]>,
): boolean {
  const findings = phenomenology.substance_related_features ?? []
  if (findings.length === 0) return false
  // Controlled use only counts as positive negative-evidence when there is no
  // co-documented dependence feature (craving, withdrawal, tolerance, loss of control).
  const dependenceSignal =
    /verlangen|craving|entzug|withdrawal|toleranz|tolerance|kontrollverlust|abh[äa]ngig|dependen|exzessiv/i
  const anyDependence = findings.some(
    (finding) =>
      finding.polarity === 'present' &&
      (dependenceSignal.test(finding.label) || finding.keywords.some((k) => dependenceSignal.test(k))),
  )
  if (anyDependence) return false
  return findings.some(
    (finding) =>
      CONTROLLED_USE_PATTERN.test(finding.label) ||
      finding.keywords.some((keyword) => CONTROLLED_USE_PATTERN.test(keyword)),
  )
}

export function buildEvaluationContext(
  input: DisorderEvaluationContextInput,
): DisorderEvaluationContext {
  const attestations = input.attestations ?? {}
  const courseOrdinal = DURATION_ORDINAL[input.coursePattern.duration]
  const substanceControlledUse = deriveSubstanceControlledUse(input.phenomenology)

  return {
    phenomenology: input.phenomenology,
    coursePattern: input.coursePattern,
    attestations,
    substanceControlledUse,

    attestationFor(criterionId) {
      return attestations[criterionId]
    },

    present(domain, match) {
      return (input.phenomenology[domain] ?? []).find(
        (finding) => finding.polarity === 'present' && findingMatches(finding, match),
      )
    },

    absent(domain, match) {
      return (input.phenomenology[domain] ?? []).find(
        (finding) => finding.polarity === 'absent' && findingMatches(finding, match),
      )
    },

    hasAnyFinding(domain) {
      return (input.phenomenology[domain] ?? []).length > 0
    },

    durationMeets(minDurationDays) {
      if (courseOrdinal === null) return null
      return courseOrdinal >= minDurationDaysToOrdinal(minDurationDays)
    },
  }
}
