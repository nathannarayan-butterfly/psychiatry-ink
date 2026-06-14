import type { TherapyDiscipline } from '../../types/organisation'
import type { UiTranslationKey } from '../uiTranslations'

export const THERAPY_DISCIPLINES: readonly TherapyDiscipline[] = [
  'ergotherapy',
  'sports_therapy',
  'music_therapy',
  'art_therapy',
  'physiotherapy',
  'occupational_therapy',
  'skills_group',
  'group_therapy',
  'custom',
] as const

export const THERAPY_DISCIPLINE_LABEL_KEYS: Record<TherapyDiscipline, UiTranslationKey> = {
  ergotherapy: 'therapyDisciplineErgotherapy',
  sports_therapy: 'therapyDisciplineSportsTherapy',
  music_therapy: 'therapyDisciplineMusicTherapy',
  art_therapy: 'therapyDisciplineArtTherapy',
  physiotherapy: 'therapyDisciplinePhysiotherapy',
  occupational_therapy: 'therapyDisciplineOccupationalTherapy',
  skills_group: 'therapyDisciplineSkillsGroup',
  group_therapy: 'therapyDisciplineGroupTherapy',
  custom: 'therapyDisciplineCustom',
}

export function isTherapyDiscipline(value: string): value is TherapyDiscipline {
  return (THERAPY_DISCIPLINES as readonly string[]).includes(value)
}

export interface TherapyDisciplineInput {
  therapyDiscipline?: TherapyDiscipline | null
  therapyDisciplineCustom?: string | null
}

export function validateTherapyDisciplineForRole(
  role: string,
  input: TherapyDisciplineInput,
): string | null {
  if (role !== 'therapist') return null

  const discipline = input.therapyDiscipline
  if (!discipline || !isTherapyDiscipline(discipline)) {
    return 'therapyDiscipline required when role is therapist'
  }
  if (discipline === 'custom' && !input.therapyDisciplineCustom?.trim()) {
    return 'therapyDisciplineCustom required when discipline is custom'
  }
  return null
}
