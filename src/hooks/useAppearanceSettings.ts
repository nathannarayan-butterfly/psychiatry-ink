import { useCallback, useEffect, useState } from 'react'
import {
  applyAppearanceSettings,
  migrateFontFamily,
  migratePageType,
  migratePaperColor,
  migratePreferredAccentColor,
} from '../data/appearancePresets'
import {
  defaultAppearanceSettings,
  type AppearanceSettings,
  type BorderWeight,
  type FontFamily,
  type FontSize,
  type LineHeight,
  type PageType,
  type PaperColor,
  type PreferredAccentColor,
  type WorkspaceScale,
} from '../types/settings'

const STORAGE_KEY = 'psychiatry-ink-appearance'

type StoredAppearance = AppearanceSettings & { colorScheme?: string }

function loadSettings(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultAppearanceSettings
    const parsed = { ...defaultAppearanceSettings, ...JSON.parse(raw) } as StoredAppearance
    parsed.preferredAccentColor = migratePreferredAccentColor(
      parsed.preferredAccentColor,
      parsed.colorScheme,
    )
    parsed.fontFamily = migrateFontFamily(parsed.fontFamily)
    parsed.pageType = migratePageType(parsed.pageType)
    parsed.paperColor = migratePaperColor(parsed.paperColor)
    return parsed
  } catch {
    return defaultAppearanceSettings
  }
}

export function useAppearanceSettings() {
  const [settings, setSettings] = useState<AppearanceSettings>(loadSettings)

  useEffect(() => {
    applyAppearanceSettings(settings)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const update = useCallback((patch: Partial<AppearanceSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const setPreferredAccentColor = useCallback(
    (preferredAccentColor: PreferredAccentColor) => update({ preferredAccentColor }),
    [update],
  )
  const setFontFamily = useCallback((fontFamily: FontFamily) => update({ fontFamily }), [update])
  const setFontSize = useCallback((fontSize: FontSize) => update({ fontSize }), [update])
  const setWorkspaceScale = useCallback(
    (workspaceScale: WorkspaceScale) => update({ workspaceScale }),
    [update],
  )
  const setLineHeight = useCallback((lineHeight: LineHeight) => update({ lineHeight }), [update])
  const setBorderWeight = useCallback(
    (borderWeight: BorderWeight) => update({ borderWeight }),
    [update],
  )
  const setShowPanelGraphic = useCallback(
    (showPanelGraphic: boolean) => update({ showPanelGraphic }),
    [update],
  )
  const setPageType = useCallback((pageType: PageType) => update({ pageType }), [update])
  const setPaperColor = useCallback((paperColor: PaperColor) => update({ paperColor }), [update])

  const resetAppearance = useCallback(() => {
    setSettings(defaultAppearanceSettings)
  }, [])

  return {
    settings,
    setPreferredAccentColor,
    setFontFamily,
    setFontSize,
    setWorkspaceScale,
    setLineHeight,
    setBorderWeight,
    setShowPanelGraphic,
    setPageType,
    setPaperColor,
    resetAppearance,
  }
}
