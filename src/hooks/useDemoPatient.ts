import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  demoCaseIdForCurrentUi,
  demoCaseIdForLocale,
  isDemoArchivedForUser,
  isDemoCase,
  isDemoCaseReadOnly,
  isDemoRemovedForUser,
  loadDemoUserState,
  uiLanguageToDemoLocale,
} from '../demo'
import { loadStoredUiLanguage } from '../utils/clinicalLanguage'

export function useDemoPatient(caseId: string | undefined) {
  const { user } = useAuth()
  const userId = user?.id ?? 'anonymous'

  return useMemo(() => {
    const isDemo = isDemoCase(caseId)
    const readOnly = isDemoCaseReadOnly(caseId, user?.email)
    const userState = loadDemoUserState(userId)
    const archived = userState.status === 'archived'
    const hiddenFromList = isDemo && archived
    const activeDemoCaseId = demoCaseIdForCurrentUi()

    return {
      isDemo,
      readOnly,
      archived,
      hiddenFromList,
      demoCaseId: activeDemoCaseId,
      userState,
    }
  }, [caseId, userId, user?.email])
}

function isDemoCaseForCurrentUi(caseId: string): boolean {
  if (!isDemoCase(caseId)) return false
  const locale = uiLanguageToDemoLocale(loadStoredUiLanguage())
  return caseId === demoCaseIdForLocale(locale)
}

export function isDemoCaseVisibleOnDashboard(caseId: string, userId: string): boolean {
  if (!isDemoCase(caseId)) return true
  if (!isDemoCaseForCurrentUi(caseId)) return false
  return !isDemoArchivedForUser(userId)
}

/** Demo removed cases are hidden entirely; archived demo cases appear under Archiv. */
export function isCaseListedOnDashboard(caseId: string, userId: string): boolean {
  if (!isDemoCase(caseId)) return true
  if (!isDemoCaseForCurrentUi(caseId)) return false
  return !isDemoRemovedForUser(userId)
}
