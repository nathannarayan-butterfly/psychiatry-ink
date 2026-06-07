import { useCallback, useState } from 'react'
import { DEFAULT_CASE_ID } from '../utils/caseContext'

export interface WorkspaceTab {
  id: string
  name: string
  storageId: string
  patientId?: string
  patientName?: string
}

interface TabsState {
  tabs: WorkspaceTab[]
  activeTabId: string
}

const STORAGE_KEY = 'psychiatry-ink:workspace-tabs'
const ACTIVE_KEY = 'psychiatry-ink:workspace-active-tab'

function generateId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function storageIdForTab(tabId: string, index: number): string {
  return index === 0 ? DEFAULT_CASE_ID : `${DEFAULT_CASE_ID}::workspace-tab::${tabId}`
}

function normalizeTabs(tabs: Partial<WorkspaceTab>[]): WorkspaceTab[] {
  return tabs
    .filter((tab): tab is Partial<WorkspaceTab> & { id: string; name: string } => (
      typeof tab.id === 'string' && typeof tab.name === 'string'
    ))
    .map((tab, index) => ({
      ...tab,
      id: tab.id,
      name: tab.name,
      storageId: typeof tab.storageId === 'string' && tab.storageId.trim()
        ? tab.storageId
        : storageIdForTab(tab.id, index),
    }))
}

function loadState(): TabsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const activeRaw = localStorage.getItem(ACTIVE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WorkspaceTab>[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        const tabs = normalizeTabs(parsed)
        if (tabs.length === 0) throw new Error('Invalid workspace tabs')
        const activeTabId =
          activeRaw && tabs.some((t) => t.id === activeRaw)
            ? activeRaw
            : tabs[0].id
        const state = { tabs, activeTabId }
        persist(state)
        return state
      }
    }
  } catch {
    // ignore
  }
  const id = generateId()
  return { tabs: [{ id, name: 'Workspace 1', storageId: DEFAULT_CASE_ID }], activeTabId: id }
}

function persist(state: TabsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tabs))
    localStorage.setItem(ACTIVE_KEY, state.activeTabId)
  } catch {
    // ignore
  }
}

export function useWorkspaceTabs() {
  const [state, setState] = useState<TabsState>(loadState)

  const setActiveTabId = useCallback((id: string) => {
    setState((current) => {
      if (current.activeTabId === id) return current
      const next: TabsState = { ...current, activeTabId: id }
      persist(next)
      return next
    })
  }, [])

  const addTab = useCallback(() => {
    setState((current) => {
      const nextNumber = current.tabs.length + 1
      const id = generateId()
      const newTab: WorkspaceTab = {
        id,
        name: `Workspace ${nextNumber}`,
        storageId: storageIdForTab(id, nextNumber - 1),
      }
      const next: TabsState = {
        tabs: [...current.tabs, newTab],
        activeTabId: id,
      }
      persist(next)
      return next
    })
  }, [])

  const closeTab = useCallback((id: string) => {
    setState((current) => {
      if (current.tabs.length <= 1) return current
      const index = current.tabs.findIndex((t) => t.id === id)
      const tabs = current.tabs.filter((t) => t.id !== id)
      let activeTabId = current.activeTabId
      if (current.activeTabId === id) {
        activeTabId = tabs[Math.min(index, tabs.length - 1)]?.id ?? tabs[0]?.id ?? ''
      }
      const next: TabsState = { tabs, activeTabId }
      persist(next)
      return next
    })
  }, [])

  const updateTabPatient = useCallback((id: string, patientName: string) => {
    setState((current) => {
      const tabs = current.tabs.map((t) =>
        t.id === id ? { ...t, patientName: patientName || undefined } : t,
      )
      const next: TabsState = { ...current, tabs }
      persist(next)
      return next
    })
  }, [])

  return {
    tabs: state.tabs,
    activeTabId: state.activeTabId,
    setActiveTabId,
    addTab,
    closeTab,
    updateTabPatient,
  }
}
