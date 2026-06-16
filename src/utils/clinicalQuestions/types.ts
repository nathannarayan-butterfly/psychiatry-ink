/**
 * Clinical Questions — section-neutral feedback-loop primitives.
 *
 * A "clinical question" is a clinician-answerable prompt that, once answered,
 * RESOLVES a concrete target (today: a still-`unknown` diagnosis criterion;
 * later: a medication or Verlauf data point). The clinician's answer flows back
 * into the deterministic evaluation so the picture sharpens and the answered
 * question drops off the open list.
 *
 * These shapes are deliberately section-neutral (they carry `sectionId` +
 * `targetId`) so a future shared `SuggestedQuestionsPanel` with per-section
 * providers can reuse them without a diagnosis-only assumption.
 */

import type { NotionPageId } from '../../components/notion/notionPages'

/** Which workspace section a question belongs to. Extend as sections adopt the loop. */
export type ClinicalQuestionSectionId = 'diagnosis_criteria' | 'medication' | 'verlauf'

/**
 * The clinician's deterministic resolution of a question:
 * - `present`  → the feature/criterion is documented as present (→ met)
 * - `absent`   → documented as absent (→ not_met)
 * - `unclear`  → still cannot be decided (keeps the target open)
 */
export type ClinicalQuestionResolution = 'present' | 'absent' | 'unclear'

/** A localized, target-bound question rendered to the clinician. */
export interface ClinicalQuestion {
  /** Stable question id, also used as the answer key (e.g. `${disorderId}:${criterionId}`). */
  id: string
  /** Section this question belongs to (forward-looking; `diagnosis_criteria` today). */
  sectionId: ClinicalQuestionSectionId
  /** Identifier of the thing this question resolves (today: a criterion id). */
  targetId: string
  /** Localized question text the clinician asks the patient. */
  question: string
  /** Localized rationale (why this is still open). */
  rationale: string
  /** Visual priority bucket for list styling. */
  priority: 'high' | 'medium' | 'low'
  /** Documentation page to deep-link to, when a finding is best documented elsewhere. */
  deepLinkPageId?: NotionPageId
  /**
   * Whether a Ja/Nein answer can deterministically resolve the target. When
   * false, the answer cannot flip the evaluation on its own (the clinician must
   * document the finding in the linked section instead).
   */
  resolvable: boolean
}

/**
 * A clinician's recorded answer to a clinical question.
 *
 * `note` is PHI-derived free text and therefore persists ONLY in the encrypted
 * workspace vault (never plain localStorage) — see `answerNotes.ts`. The
 * `resolution` itself is non-PHI and is bridged to the section's authoritative
 * store (for diagnosis criteria: the clinician-attestation store).
 */
export interface ClinicalQuestionAnswer {
  questionId: string
  sectionId: ClinicalQuestionSectionId
  targetId: string
  resolution: ClinicalQuestionResolution
  /** Optional short free-text finding (PHI → vault-only). */
  note?: string
  answeredAt: string
}
