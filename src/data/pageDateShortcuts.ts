import type { UiLanguage } from '../types/settings'

export interface PageDateShortcutConfig {
  todayKey: string
  yesterdayKey: string
}

export const pageDateShortcuts: Record<UiLanguage, PageDateShortcutConfig> = {
  de: { todayKey: 'h', yesterdayKey: 'g' },
  en: { todayKey: 't', yesterdayKey: 'y' },
  fr: { todayKey: 'a', yesterdayKey: 'h' },
  es: { todayKey: 'h', yesterdayKey: 'a' },
}

export function matchPageDateShortcut(
  key: string,
  language: UiLanguage,
): 'today' | 'yesterday' | null {
  const normalized = key.toLowerCase()
  const shortcuts = pageDateShortcuts[language]
  if (normalized === shortcuts.todayKey) return 'today'
  if (normalized === shortcuts.yesterdayKey) return 'yesterday'
  return null
}
