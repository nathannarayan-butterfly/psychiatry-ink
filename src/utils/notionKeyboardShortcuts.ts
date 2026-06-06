import type { UiLanguage } from '../types/settings'

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform)
}

/**
 * Workspace command menu (slash commands). Uses Ctrl/Cmd+K like Notion/GitHub.
 * Conflicts with browser "focus address bar" (Firefox Ctrl+K, Chrome Ctrl+K) —
 * preventDefault is attempted but may not win in all browsers when focus is outside the editor.
 */
export function isCommandMenuShortcut(event: KeyboardEvent): boolean {
  const mod = event.metaKey || event.ctrlKey
  return mod && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'k'
}

/** Workspace AI / structured-input panel toggle. No common browser binding. */
export function isAiFeaturesShortcut(event: KeyboardEvent): boolean {
  const mod = event.metaKey || event.ctrlKey
  return mod && event.shiftKey && !event.altKey && event.key.toLowerCase() === 'k'
}

/**
 * Empty-page "start typing" shortcut. Uses Alt/Option modifier so Ctrl/Cmd+T (new tab)
 * remains a browser action.
 */
export function isEmptyPageTypeShortcut(event: KeyboardEvent): boolean {
  const mod = event.metaKey || event.ctrlKey
  return mod && event.altKey && !event.shiftKey && event.key.toLowerCase() === 't'
}

/**
 * Empty-page "start dictation" shortcut. Uses Alt/Option modifier so Ctrl/Cmd+D (bookmark)
 * remains a browser action.
 */
export function isEmptyPageDictateShortcut(event: KeyboardEvent): boolean {
  const mod = event.metaKey || event.ctrlKey
  return mod && event.altKey && !event.shiftKey && event.key.toLowerCase() === 'd'
}

/** Native clipboard shortcuts — must not be intercepted by app-level handlers. */
export function isNativeClipboardShortcut(event: KeyboardEvent): boolean {
  const mod = event.metaKey || event.ctrlKey
  if (!mod || event.altKey) return false
  const key = event.key.toLowerCase()
  return key === 'c' || key === 'x' || key === 'v' || key === 'a'
}

export function getNotionShortcutLabels(language: UiLanguage): {
  command: string
  ai: string
} {
  const isMac = isMacPlatform()

  if (language === 'de') {
    return isMac
      ? { command: '⌘K', ai: '⌘⇧K' }
      : { command: 'Strg+K', ai: 'Strg+Umschalt+K' }
  }

  return isMac
    ? { command: '⌘K', ai: '⌘⇧K' }
    : { command: 'Ctrl+K', ai: 'Ctrl+Shift+K' }
}

export function getEmptyPageShortcutLabels(language: UiLanguage): {
  type: string
  paste: string
  dictate: string
} {
  const isMac = isMacPlatform()

  if (language === 'de') {
    return isMac
      ? { type: '⌘⌥T', paste: '⌘V', dictate: '⌘⌥D' }
      : { type: 'Strg+Alt+T', paste: 'Strg+V', dictate: 'Strg+Alt+D' }
  }

  return isMac
    ? { type: '⌘⌥T', paste: '⌘V', dictate: '⌘⌥D' }
    : { type: 'Ctrl+Alt+T', paste: 'Ctrl+V', dictate: 'Ctrl+Alt+D' }
}
