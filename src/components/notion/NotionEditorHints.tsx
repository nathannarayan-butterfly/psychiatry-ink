import { useTranslation } from '../../context/TranslationContext'
import { getNotionShortcutLabels, getWorkspaceContextMenuLabel } from '../../utils/notionKeyboardShortcuts'

interface NotionEditorHintsProps {
  showStructuredFeatures: boolean
}

export function NotionEditorHints({ showStructuredFeatures }: NotionEditorHintsProps) {
  const { t, language } = useTranslation()
  const shortcuts = getNotionShortcutLabels(language)
  const contextMenu = getWorkspaceContextMenuLabel(language)

  const hint = showStructuredFeatures
    ? t('notionEditorShortcutHintStructured')
        .replace('{command}', shortcuts.command)
        .replace('{contextMenu}', contextMenu)
        .replace('{ai}', shortcuts.ai)
    : t('notionEditorShortcutHint')
        .replace('{command}', shortcuts.command)
        .replace('{contextMenu}', contextMenu)
        .replace('{ai}', shortcuts.ai)

  return (
    <p className="notion-paper__editor-hint" aria-live="polite">
      {hint}
    </p>
  )
}
