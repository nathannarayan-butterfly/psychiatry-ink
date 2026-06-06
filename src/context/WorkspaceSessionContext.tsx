import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useDocumentationTodayTotal } from '../hooks/useDocumentationTodayTotal'
import {
  useWorkspaceSessionTimer,
  type WorkspaceSessionTimerState,
} from '../hooks/useWorkspaceSessionTimer'

type WorkspaceSessionContextValue = WorkspaceSessionTimerState & {
  bumpActivity: () => void
  todayTotalSeconds: number
  todayTotalLabel: string
  setShouldCountTodayTotal: (shouldCount: boolean) => void
}

const WorkspaceSessionContext = createContext<WorkspaceSessionContextValue | null>(null)

export function WorkspaceSessionProvider({ children }: { children: ReactNode }) {
  const timer = useWorkspaceSessionTimer()
  const todayTotal = useDocumentationTodayTotal()

  const value = useMemo<WorkspaceSessionContextValue>(
    () => ({
      bumpActivity: timer.bumpActivity,
      clockTime: timer.clockTime,
      workTimeLabel: timer.workTimeLabel,
      status: timer.status,
      activeWorkMs: timer.activeWorkMs,
      isOverBreakThreshold: timer.isOverBreakThreshold,
      breakGeneration: timer.breakGeneration,
      todayTotalSeconds: todayTotal.todayTotalSeconds,
      todayTotalLabel: todayTotal.todayTotalLabel,
      setShouldCountTodayTotal: todayTotal.setShouldCountTodayTotal,
    }),
    [
      timer.bumpActivity,
      timer.clockTime,
      timer.workTimeLabel,
      timer.status,
      timer.activeWorkMs,
      timer.isOverBreakThreshold,
      timer.breakGeneration,
      todayTotal.todayTotalSeconds,
      todayTotal.todayTotalLabel,
      todayTotal.setShouldCountTodayTotal,
    ],
  )

  return (
    <WorkspaceSessionContext.Provider value={value}>{children}</WorkspaceSessionContext.Provider>
  )
}

export function useWorkspaceSession() {
  const context = useContext(WorkspaceSessionContext)
  if (!context) {
    throw new Error('useWorkspaceSession must be used within WorkspaceSessionProvider')
  }
  return context
}
