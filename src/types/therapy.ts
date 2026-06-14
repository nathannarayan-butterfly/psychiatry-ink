import type { OrganisationRole, TherapyDiscipline } from './organisation'

/** Metadata attached to therapy / Verlauf entries created by allied therapists. */
export interface TherapyEntryAttribution {
  createdByUserId: string
  authorRole: 'therapist'
  therapyDiscipline: TherapyDiscipline
  therapyDisciplineCustom?: string
}

export function buildTherapyAttribution(
  userId: string,
  role: OrganisationRole | null | undefined,
  therapyDiscipline?: TherapyDiscipline | null,
  therapyDisciplineCustom?: string | null,
): TherapyEntryAttribution | undefined {
  if (role !== 'therapist' || !therapyDiscipline) return undefined
  return {
    createdByUserId: userId,
    authorRole: 'therapist',
    therapyDiscipline,
    ...(therapyDiscipline === 'custom' && therapyDisciplineCustom?.trim()
      ? { therapyDisciplineCustom: therapyDisciplineCustom.trim() }
      : {}),
  }
}
