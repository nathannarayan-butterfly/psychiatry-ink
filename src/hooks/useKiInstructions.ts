import { useCallback, useEffect, useState } from 'react'
import {
  defaultKiInstructionsSettings,
  KI_INSTRUCTION_PRESET_TEXT,
  type KiDocumentTypeId,
  type KiInstructionPresetId,
  type KiInstructionsSettings,
} from '../types/kiInstructions'
import { safeSetItem } from '../utils/safeStorage'

const STORAGE_KEY = 'psychiatry-ink:ki-instructions'

function loadSettings(): KiInstructionsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultKiInstructionsSettings
    const parsed = JSON.parse(raw) as Partial<KiInstructionsSettings>
    return {
      ...defaultKiInstructionsSettings,
      ...parsed,
      documentOverrides: {
        ...defaultKiInstructionsSettings.documentOverrides,
        ...parsed.documentOverrides,
      },
    }
  } catch {
    return defaultKiInstructionsSettings
  }
}

export function useKiInstructions() {
  const [settings, setSettings] = useState<KiInstructionsSettings>(loadSettings)

  useEffect(() => {
    safeSetItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const update = useCallback((patch: Partial<KiInstructionsSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const setDefaultInstruction = useCallback(
    (defaultInstruction: string) => update({ defaultInstruction, preset: 'custom' }),
    [update],
  )

  const applyPreset = useCallback((preset: KiInstructionPresetId) => {
    if (preset === 'none') {
      setSettings((current) => ({ ...current, preset, defaultInstruction: '' }))
      return
    }
    if (preset === 'custom') {
      setSettings((current) => ({ ...current, preset }))
      return
    }
    setSettings((current) => ({
      ...current,
      preset,
      defaultInstruction: KI_INSTRUCTION_PRESET_TEXT[preset],
    }))
  }, [])

  const setDocumentOverride = useCallback((documentTypeId: KiDocumentTypeId, value: string) => {
    setSettings((current) => ({
      ...current,
      documentOverrides: {
        ...current.documentOverrides,
        [documentTypeId]: value,
      },
    }))
  }, [])

  const resetKiInstructions = useCallback(() => {
    setSettings(defaultKiInstructionsSettings)
  }, [])

  return {
    settings,
    setDefaultInstruction,
    applyPreset,
    setDocumentOverride,
    resetKiInstructions,
  }
}
