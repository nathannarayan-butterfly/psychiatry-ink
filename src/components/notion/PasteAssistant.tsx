import { useTranslation } from '../../context/TranslationContext'
import type { AiToolKey } from '../../data/aiTools'
import type { NotionPageId } from './notionPages'

export type PasteActionId =
  | AiToolKey
  | 'applyAnamnese'
  | 'applyVerlauf'
  | 'applyPsychopath'

interface PasteAssistantProps {
  position: { top: number; left: number }
  pastedText: string
  onAction: (action: PasteActionId, text: string) => void
  onDismiss: () => void
}

const ACTIONS: { id: PasteActionId; labelKey: 'structure' | 'notionPasteAnamnese' | 'notionPasteVerlauf' | 'notionPastePsychopath' | 'notionPasteClean' | 'summarize' }[] = [
  { id: 'structure', labelKey: 'structure' },
  { id: 'applyAnamnese', labelKey: 'notionPasteAnamnese' },
  { id: 'applyVerlauf', labelKey: 'notionPasteVerlauf' },
  { id: 'applyPsychopath', labelKey: 'notionPastePsychopath' },
  { id: 'proofread', labelKey: 'notionPasteClean' },
  { id: 'summarize', labelKey: 'summarize' },
]

export function PasteAssistant({
  position,
  pastedText,
  onAction,
  onDismiss,
}: PasteAssistantProps) {
  const { t } = useTranslation()
  const preview =
    pastedText.length > 80 ? `${pastedText.slice(0, 80).trim()}…` : pastedText.trim()

  return (
    <>
      <button
        type="button"
        className="notion-paste-assistant__backdrop"
        aria-label={t('notionCloseMenu')}
        onClick={onDismiss}
      />
      <div
        className="notion-paste-assistant"
        style={{ top: position.top, left: position.left }}
        role="dialog"
        aria-label={t('notionPasteAssistant')}
      >
        <p className="notion-paste-assistant__preview">{preview}</p>
        <div className="notion-paste-assistant__actions">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              className="notion-paste-assistant__btn"
              onClick={() => onAction(action.id, pastedText)}
            >
              {t(action.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export function pasteActionTargetPage(action: PasteActionId): NotionPageId | null {
  if (action === 'applyAnamnese') return 'aufnahme'
  if (action === 'applyVerlauf') return 'verlauf'
  if (action === 'applyPsychopath') return 'psychopath'
  return null
}
