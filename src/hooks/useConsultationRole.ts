import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import type { ConsultationRole } from '../types/consultation'
import { isRestrictedConsultant, resolveConsultationRole } from '../utils/consultationRole'

export function useConsultationRole(): {
  role: ConsultationRole | null
  isExternalConsultant: boolean
  isRestrictedConsultant: boolean
} {
  const { user } = useAuth()

  const role = useMemo(
    () =>
      resolveConsultationRole({
        userId: user?.id,
        userEmail: user?.email,
        appMetadataRole:
          typeof user?.app_metadata?.consultation_role === 'string'
            ? user.app_metadata.consultation_role
            : null,
      }),
    [user?.id, user?.email, user?.app_metadata?.consultation_role],
  )

  return {
    role,
    isExternalConsultant: role === 'external_consultant' || role === 'one_time_external_consultant',
    isRestrictedConsultant: isRestrictedConsultant(role),
  }
}
