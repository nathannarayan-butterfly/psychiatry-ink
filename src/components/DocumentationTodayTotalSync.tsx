import { useEffect } from 'react'
import { useWorkspaceSession } from '../context/WorkspaceSessionContext'

interface DocumentationTodayTotalSyncProps {
  /** True when the user is on a documentation page (not lab/timeline tools). */
  isDocumentationPage: boolean
}

export function DocumentationTodayTotalSync({ isDocumentationPage }: DocumentationTodayTotalSyncProps) {
  const { status, setShouldCountTodayTotal } = useWorkspaceSession()

  useEffect(() => {
    setShouldCountTodayTotal(isDocumentationPage && status === 'active')
  }, [isDocumentationPage, setShouldCountTodayTotal, status])

  return null
}
