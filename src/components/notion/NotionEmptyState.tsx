import { useTranslation } from '../../context/TranslationContext'
import { getEmptyPageShortcutLabels } from '../../utils/notionKeyboardShortcuts'

interface NotionEmptyStateProps {
  disabled?: boolean
  onType: () => void
  onPaste: () => void
  onDictate: () => void
}

export function NotionEmptyState({
  disabled = false,
  onType,
  onPaste,
  onDictate,
}: NotionEmptyStateProps) {
  const { t, language } = useTranslation()
  const shortcuts = getEmptyPageShortcutLabels(language)

  const actions = [
    { id: 'type', label: t('emptyActionType'), shortcut: shortcuts.type, onClick: onType },
    { id: 'paste', label: t('emptyActionPaste'), shortcut: shortcuts.paste, onClick: onPaste },
    { id: 'dictate', label: t('emptyActionDictate'), shortcut: shortcuts.dictate, onClick: onDictate },
  ] as const

  return (
    <div
      className="notion-empty-state"
      role="group"
      aria-label={t('emptyActionGroup')}
    >
      <div className="notion-paper__variant-links notion-empty-state__links">
        {actions.map((action, index) => (
          <span key={action.id} className="notion-paper__variant-links-item">
            {index > 0 ? (
              <span className="notion-paper__variant-links-sep" aria-hidden>
                ·
              </span>
            ) : null}
            <button
              type="button"
              disabled={disabled}
              className="notion-paper__variant-link"
              onMouseDown={(event) => event.preventDefault()}
              onClick={action.onClick}
            >
              {action.label}
              <span className="notion-empty-state__shortcut" aria-hidden>
                {' '}
                {action.shortcut}
              </span>
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
