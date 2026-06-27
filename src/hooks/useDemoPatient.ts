import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  DEMO_CASE_ID,
  isDemoArchivedForUser,
  isDemoCase,
  isDemoCaseReadOnly,
  isDemoRemovedForUser,
  loadDemoUserState,
} from '../demo'

export function useDemoPatient(caseId: string | undefined) {
  const { user } = useAuth()
  const userId = user?.id ?? 'anonymous'

  return useMemo(() => {
    const isDemo = isDemoCase(caseId)
    const readOnly = isDemoCaseReadOnly(caseId, user?.email)
    const userState = loadDemoUserState(userId)
    const archived = userState.status === 'archived'
    const hiddenFromList = isDemo && archived

    return {
      isDemo,
      readOnly,
      archived,
      hiddenFromList,
      demoCaseId: DEMO_CASE_ID,
      userState,
    }
  }, [caseId, userId, user?.email])
}

export function isDemoCaseVisibleOnDashboard(caseId: string, userId: string): boolean {
  if (!isDemoCase(caseId)) return true
  return !isDemoArchivedForUser(userId)
}

/** Demo removed cases are hidden entirely; archived demo cases appear under Archiv. */
export function isCaseListedOnDashboard(caseId: string, userId: string): boolean {
  if (!isDemoCase(caseId)) return true
  return !isDemoRemovedForUser(userId)
}
