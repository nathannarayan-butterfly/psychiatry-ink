import { Sparkles } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { AiToolKey } from '../../data/aiTools'
import { getInlineAiEditShortcutLabel } from '../../utils/notionKeyboardShortcuts'

export type SelectionActionId =
  | AiToolKey
  | 'convertVerlauf'
  | 'convertPpb'
  | 'convertArztbrief'

interface FloatingSelectionToolbarProps {
  position: { top: number; left: number }
  onAction: (action: SelectionActionId) => void
  onClose: () => void
  /** When provided, renders the voice-driven "Ask AI to edit selection" trigger. */
  onAiEdit?: () => void
}

const PRIMARY_ACTIONS: { id: SelectionActionId; labelKey: 'summarize' | 'structure' | 'shorten' | 'formalize' }[] = [
  { id: 'summarize', labelKey: 'summarize' },
  { id: 'structure', labelKey: 'structure' },
  { id: 'shorten', labelKey: 'shorten' },
  { id: 'formalize', labelKey: 'formalize' },
]

const CONVERT_ACTIONS: { id: SelectionActionId; labelKey: 'notionConvertVerlauf' | 'notionConvertPpb' | 'notionConvertArztbrief' }[] = [
  { id: 'convertVerlauf', labelKey: 'notionConvertVerlauf' },
  { id: 'convertPpb', labelKey: 'notionConvertPpb' },
  { id: 'convertArztbrief', labelKey: 'notionConvertArztbrief' },
]

export function FloatingSelectionToolbar({
  position,
  onAction,
  onClose,
  onAiEdit,
}: FloatingSelectionToolbarProps) {
  const { t, language } = useTranslation()

  return (
    <>
      <button
        type="button"
        className="notion-selection-toolbar__backdrop"
        aria-label={t('notionCloseMenu')}
        onClick={onClose}
      />
      <div
        className="notion-selection-toolbar"
        style={{ top: position.top, left: position.left }}
        role="toolbar"
        aria-label={t('notionSelectionToolbar')}
      >
        {onAiEdit ? (
          <>
            <button
              type="button"
              className="notion-selection-toolbar__btn notion-selection-toolbar__btn--ai-edit"
              onClick={onAiEdit}
              title={`${t('inlineAiEditAria')} (${getInlineAiEditShortcutLabel(language)})`}
              aria-label={`${t('inlineAiEditAria')} (${getInlineAiEditShortcutLabel(language)})`}
            >
              <Sparkles className="notion-selection-toolbar__icon" strokeWidth={1.75} aria-hidden />
              <span>{t('inlineAiEditTitle')}</span>
            </button>
            <span className="notion-selection-toolbar__divider" aria-hidden />
          </>
        ) : null}
        {PRIMARY_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="notion-selection-toolbar__btn"
            onClick={() => onAction(action.id)}
          >
            {t(action.labelKey)}
          </button>
        ))}
        <span className="notion-selection-toolbar__divider" aria-hidden />
        {CONVERT_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="notion-selection-toolbar__btn notion-selection-toolbar__btn--secondary"
            onClick={() => onAction(action.id)}
          >
            {t(action.labelKey)}
          </button>
        ))}
      </div>
    </>
  )
}
