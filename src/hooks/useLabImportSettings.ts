import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_LAB_IMPORT_SETTINGS,
  LAB_IMPORT_METHOD_IDS,
  type LabImportMethod,
  type LabImportSettings,
} from '../types/labImportSettings'
import { safeSetItem } from '../utils/safeStorage'

const STORAGE_KEY = 'psychiatry-ink-lab-import'

function isLabImportMethod(value: unknown): value is LabImportMethod {
  return typeof value === 'string' && LAB_IMPORT_METHOD_IDS.includes(value as LabImportMethod)
}

function loadLabImportSettings(): LabImportSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LabImportSettings>
      return {
        defaultImportMethod: isLabImportMethod(parsed.defaultImportMethod)
          ? parsed.defaultImportMethod
          : DEFAULT_LAB_IMPORT_SETTINGS.defaultImportMethod,
        autoMapLoinc: parsed.autoMapLoinc ?? DEFAULT_LAB_IMPORT_SETTINGS.autoMapLoinc,
        showMedLabCorrelationHints:
          parsed.showMedLabCorrelationHints ?? DEFAULT_LAB_IMPORT_SETTINGS.showMedLabCorrelationHints,
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_LAB_IMPORT_SETTINGS
}

export function useLabImportSettings() {
  const [settings, setSettings] = useState<LabImportSettings>(loadLabImportSettings)

  useEffect(() => {
    safeSetItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const setDefaultImportMethod = useCallback((defaultImportMethod: LabImportMethod) => {
    setSettings((current) => ({ ...current, defaultImportMethod }))
  }, [])

  const setAutoMapLoinc = useCallback((autoMapLoinc: boolean) => {
    setSettings((current) => ({ ...current, autoMapLoinc }))
  }, [])

  const setShowMedLabCorrelationHints = useCallback((showMedLabCorrelationHints: boolean) => {
    setSettings((current) => ({ ...current, showMedLabCorrelationHints }))
  }, [])

  return {
    defaultImportMethod: settings.defaultImportMethod,
    autoMapLoinc: settings.autoMapLoinc,
    showMedLabCorrelationHints: settings.showMedLabCorrelationHints,
    setDefaultImportMethod,
    setAutoMapLoinc,
    setShowMedLabCorrelationHints,
  }
}
