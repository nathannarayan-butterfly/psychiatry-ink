import type { ClinicalImprintRecord, CourseDirection } from '../../types/clinicalImprint'
import type { SymptomTrajectoryPoint } from '../../components/notion/overview/types'
import { formatShortDateDe } from './dateLabels'

/**
 * Ordinal encoding of the recorded course direction. This is NOT a fabricated
 * psychometric score — it is a faithful, monotone mapping of the course
 * assessments the clinician (or extraction) actually recorded on successive
 * psychopathology imprints, so the resulting line reflects real documented
 * trajectory. Directions that carry no trend signal contribute nothing.
 */
const COURSE_VALUE: Partial<Record<CourseDirection, number>> = {
  worsened: -1,
  new: 0,
  stable: 0,
  fluctuating: 0,
  improved: 1,
  resolved: 2,
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

/**
 * Build a course-tendency trajectory from the psychopathology imprints' recorded
 * `courseDirection`, oldest→newest. Returns an empty array when fewer than two
 * usable points exist (the card then falls back to the structured cues).
 */
export function getSymptomTrajectory(
  imprints: ClinicalImprintRecord[],
  limit = 6,
): SymptomTrajectoryPoint[] {
  const points = imprints
    .filter((i) => i.clinicalDomain === 'psychopathology' && i.courseDirection != null)
    .filter((i) => COURSE_VALUE[i.courseDirection as CourseDirection] !== undefined)
    .sort((a, b) => (a.sourceDate ?? '').localeCompare(b.sourceDate ?? ''))
    .map((i) => {
      const dir = i.courseDirection as CourseDirection
      return {
        dateLabel: formatShortDateDe(i.sourceDate) ?? '',
        value: COURSE_VALUE[dir] as number,
        label: COURSE_LABEL[dir],
      }
    })

  if (points.length < 2) return []
  return points.slice(-limit)
}
