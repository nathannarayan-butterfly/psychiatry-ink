import { useCallback, useEffect, useState } from 'react'
import { safeSetItem } from '../utils/safeStorage'

const STORAGE_KEY = 'psychiatry-ink-dashboard'

export interface DashboardSettings {
  /** When true, new cases show workflow page picker before opening documentation. */
  openCaseDirectToWorkflow: boolean
}

const DEFAULT_SETTINGS: DashboardSettings = {
  openCaseDirectToWorkflow: true,
}

function loadDashboardSettings(): DashboardSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DashboardSettings>
      return {
        openCaseDirectToWorkflow:
          parsed.openCaseDirectToWorkflow ?? DEFAULT_SETTINGS.openCaseDirectToWorkflow,
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS
}

export function useDashboardSettings() {
  const [settings, setSettings] = useState<DashboardSettings>(loadDashboardSettings)

  useEffect(() => {
    safeSetItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const setOpenCaseDirectToWorkflow = useCallback((openCaseDirectToWorkflow: boolean) => {
    setSettings((current) => ({ ...current, openCaseDirectToWorkflow }))
  }, [])

  return {
    openCaseDirectToWorkflow: settings.openCaseDirectToWorkflow,
    setOpenCaseDirectToWorkflow,
  }
}
