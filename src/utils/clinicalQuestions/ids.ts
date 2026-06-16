import type { ClinicalQuestionSectionId } from './types'

/**
 * Stable, section-neutral question/answer key: `${sectionId}:${targetId}`.
 * Used both as the rendered question id and as the note-store key, so a target
 * id that repeats across sections never collides.
 */
export function clinicalQuestionId(
  sectionId: ClinicalQuestionSectionId,
  targetId: string,
): string {
  return `${sectionId}:${targetId}`
}
