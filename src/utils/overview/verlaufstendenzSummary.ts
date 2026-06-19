import type { ClinicalImprintRecord } from '../../types/clinicalImprint'
import type { SymptomTrajectoryPoint } from '../../components/notion/overview/types'
import { getSymptomTrajectory } from './symptomTrajectory'

export interface VerlaufstendenzSummary {
  /** True when heuristic trajectory data exists (≥2 course points). */
  hasHeuristic: boolean
  /** Shown when formal criteria are not yet wired. */
  stubMessage: string
  courseLabel: string | null
  trajectory: SymptomTrajectoryPoint[]
}

const COURSE_LABEL: Record<string, string> = {
  new: 'neu',
  improved: 'verbessert',
  worsened: 'verschlechtert',
  stable: 'stabil',
  fluctuating: 'fluktuierend',
  resolved: 'remittiert',
  unclear: 'unklar',
}

/**
 * Verlaufstendenz overview — criteria-based assessment is not yet available;
 * falls back to documented course-direction history from psychopathology imprints.
 */
export function buildVerlaufstendenzSummary(imprints: ClinicalImprintRecord[]): VerlaufstendenzSummary {
  const trajectory = getSymptomTrajectory(imprints)
  const latest = [...imprints]
    .filter((i) => i.clinicalDomain === 'psychopathology' && i.courseDirection)
    .sort((a, b) => (b.sourceDate ?? '').localeCompare(a.sourceDate ?? ''))[0]

  const courseLabel = latest?.courseDirection
    ? COURSE_LABEL[latest.courseDirection] ?? latest.courseDirection
    : null

  return {
    hasHeuristic: trajectory.length >= 2,
    stubMessage:
      'Formale Verlaufstendenz-Kriterien sind noch nicht hinterlegt. Orientierung an dokumentierten Verlaufsrichtungen.',
    courseLabel,
    trajectory,
  }
}
