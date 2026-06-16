import type { UiLanguage } from '../types/settings'

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform)
}

/**
 * Workspace navigation menu (documents, tools, templates). Uses Ctrl/Cmd+K.
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

/**
 * Inline AI edit on the current selection ("KI-Bearbeitung"). Uses the Alt/Option
 * modifier to mirror the existing editor shortcuts (Ctrl/Cmd+Alt+T, Ctrl/Cmd+Alt+D)
 * and to stay clear of the Ctrl/Cmd+K command-menu bindings.
 *
 * Why "B" (Bearbeiten): it has no German AltGr special character (AltGr+E=€,
 * AltGr+Q=@ would clash on a German keyboard) and Ctrl/Cmd+Alt+B is not a default
 * browser or OS binding. The handler only acts when a selection is active inside
 * the editor and calls preventDefault, so it cannot hijack typing.
 */
export function isInlineAiEditShortcut(event: KeyboardEvent): boolean {
  const mod = event.metaKey || event.ctrlKey
  return mod && event.altKey && !event.shiftKey && event.key.toLowerCase() === 'b'
}

export function getInlineAiEditShortcutLabel(language: UiLanguage): string {
  const isMac = isMacPlatform()
  void language
  return isMac ? '⌘⌥B' : 'Strg+Alt+B'
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

export function getWorkspaceContextMenuLabel(language: UiLanguage): string {
  if (language === 'de') return 'Rechtsklick'
  if (language === 'fr') return 'clic droit'
  if (language === 'es') return 'clic derecho'
  return 'right-click'
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
