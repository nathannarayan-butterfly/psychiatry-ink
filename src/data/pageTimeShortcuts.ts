import type { UiLanguage } from '../types/settings'

export interface PageTimeShortcutConfig {
  nowKey: string
}

export const pageTimeShortcuts: Record<UiLanguage, PageTimeShortcutConfig> = {
  de: { nowKey: 'j' },
  en: { nowKey: 'n' },
  fr: { nowKey: 'm' },
  es: { nowKey: 'a' },
}

export function matchPageTimeShortcut(key: string, language: UiLanguage): 'now' | null {
  const normalized = key.toLowerCase()
  if (normalized === pageTimeShortcuts[language].nowKey) return 'now'
  return null
}
