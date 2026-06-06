import { useTranslation } from '../../context/TranslationContext'
import type { DictationPhase } from '../../types/dictation'

interface NotionInputBarProps {
  dictationPhase: DictationPhase
  isDictationActive: boolean
}

export function NotionInputBar({ dictationPhase, isDictationActive }: NotionInputBarProps) {
  const { t } = useTranslation()
  const showDictationHint = isDictationActive || dictationPhase !== 'idle'

  if (!showDictationHint) return null

  return (
    <footer className="notion-input-bar">
      <p className="notion-input-bar__hint">{t('notionDictationHint')}</p>
    </footer>
  )
}
