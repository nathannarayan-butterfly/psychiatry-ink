import type {
  ConsultationAccessType,
  ConsultationRole,
} from '../../src/types/consultation'

export function accessTypeToRole(accessType: ConsultationAccessType): ConsultationRole {
  if (accessType === 'internal_consultant') return 'internal_consultant'
  if (accessType === 'one_time_external') return 'one_time_external_consultant'
  return 'external_consultant'
}

export function canClinicianManage(role: ConsultationRole): boolean {
  return role === 'clinician'
}

export function canConsultantWriteReport(role: ConsultationRole): boolean {
  return (
    role === 'internal_consultant' ||
    role === 'external_consultant' ||
    role === 'one_time_external_consultant'
  )
}

export function assertParticipantRole(
  role: ConsultationRole | undefined,
  allowed: ConsultationRole[],
): void {
  if (!role || !allowed.includes(role)) {
    throw new Error('Insufficient permissions')
  }
}
