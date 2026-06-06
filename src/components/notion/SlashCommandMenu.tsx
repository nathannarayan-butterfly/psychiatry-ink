import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { AiToolKey } from '../../data/aiTools'

export type SlashCommandId =
  | 'heading'
  | 'anamneseSection'
  | 'verlaufEntry'
  | 'psychopathSection'
  | 'addLabValue'
  | 'insertVisualisation'
  | 'aiStructure'
  | 'aiArztbrief'

interface SlashCommandMenuProps {
  filter: string
  position: { top: number; left: number }
  onSelect: (command: SlashCommandId) => void
  onClose: () => void
}

const COMMANDS: {
  id: SlashCommandId
  labelKey:
    | 'notionSlashHeading'
    | 'notionSlashAnamnese'
    | 'notionSlashVerlauf'
    | 'notionSlashPsychopath'
    | 'notionSlashLab'
    | 'notionSlashVisualisation'
    | 'notionSlashAiStructure'
    | 'notionSlashAiArztbrief'
  group: 'insert' | 'ai'
}[] = [
  { id: 'heading', labelKey: 'notionSlashHeading', group: 'insert' },
  { id: 'anamneseSection', labelKey: 'notionSlashAnamnese', group: 'insert' },
  { id: 'verlaufEntry', labelKey: 'notionSlashVerlauf', group: 'insert' },
  { id: 'psychopathSection', labelKey: 'notionSlashPsychopath', group: 'insert' },
  { id: 'addLabValue', labelKey: 'notionSlashLab', group: 'insert' },
  { id: 'insertVisualisation', labelKey: 'notionSlashVisualisation', group: 'insert' },
  { id: 'aiStructure', labelKey: 'notionSlashAiStructure', group: 'ai' },
  { id: 'aiArztbrief', labelKey: 'notionSlashAiArztbrief', group: 'ai' },
]

export function slashCommandToAiTool(command: SlashCommandId): AiToolKey | null {
  if (command === 'aiStructure') return 'structure'
  if (command === 'aiArztbrief') return 'formalize'
  return null
}

export function SlashCommandMenu({
  filter,
  position,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const { t } = useTranslation()
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase()
    if (!query) return COMMANDS
    return COMMANDS.filter((command) => t(command.labelKey).toLowerCase().includes(query))
  }, [filter, t])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (filtered.length === 0) return null

  const insertCommands = filtered.filter((command) => command.group === 'insert')
  const aiCommands = filtered.filter((command) => command.group === 'ai')

  return (
    <>
      <button
        type="button"
        className="notion-slash-menu__backdrop"
        aria-label={t('notionCloseMenu')}
        onClick={onClose}
      />
      <div
        ref={listRef}
        className="notion-slash-menu"
        style={{ top: position.top, left: position.left }}
        role="listbox"
        aria-label={t('notionSlashMenu')}
      >
        {insertCommands.length > 0 ? (
          <div className="notion-slash-menu__group">
            <p className="notion-slash-menu__heading">{t('notionSlashGroupInsert')}</p>
            {insertCommands.map((command) => (
              <button
                key={command.id}
                type="button"
                className="notion-slash-menu__item"
                role="option"
                onClick={() => onSelect(command.id)}
              >
                {t(command.labelKey)}
              </button>
            ))}
          </div>
        ) : null}
        {aiCommands.length > 0 ? (
          <div className="notion-slash-menu__group">
            <p className="notion-slash-menu__heading">{t('notionSlashGroupAi')}</p>
            {aiCommands.map((command) => (
              <button
                key={command.id}
                type="button"
                className="notion-slash-menu__item notion-slash-menu__item--ai"
                role="option"
                onClick={() => onSelect(command.id)}
              >
                {t(command.labelKey)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}
