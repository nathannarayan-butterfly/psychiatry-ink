import { useCallback, useSyncExternalStore } from 'react'
import {
  getAppearanceSettingsSnapshot,
  setAppearanceSettings,
  subscribeAppearanceSettings,
} from '../utils/devicePreferences'
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

export function useAppearanceSettings() {
  const settings = useSyncExternalStore(
    subscribeAppearanceSettings,
    getAppearanceSettingsSnapshot,
    getAppearanceSettingsSnapshot,
  )

  const update = useCallback((patch: Partial<AppearanceSettings>) => {
    setAppearanceSettings((current) => ({ ...current, ...patch }))
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
  const setPageType = useCallback((_pageType: PageType) => {}, [])
  const setPaperColor = useCallback((_paperColor: PaperColor) => {}, [])

  const resetAppearance = useCallback(() => {
    setAppearanceSettings(defaultAppearanceSettings)
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
