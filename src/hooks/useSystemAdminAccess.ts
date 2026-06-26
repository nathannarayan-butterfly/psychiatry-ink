import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useKnowledgeBaseUserId } from './useKnowledgeBaseUserId'
import { isKbAdminUser } from '../utils/kbAdminAccess'

/** Whether the current browser user may access the KB review console (Knowledge Base admin). */
export function useSystemAdminAccess(): boolean {
  const { user } = useAuth()
  const fallbackUserId = useKnowledgeBaseUserId()

  return useMemo(() => {
    const appMetadata = user?.app_metadata as Record<string, unknown> | undefined
    return isKbAdminUser({
      userId: user?.id ?? fallbackUserId,
      userEmail: user?.email,
      appMetadataSystemAdmin: appMetadata?.system_admin === true,
    })
  }, [user?.id, user?.email, user?.app_metadata, fallbackUserId])
}
