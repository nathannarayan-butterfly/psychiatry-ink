import { Mic } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import type { DictationPhase } from '../../types/dictation'
import { DictationControls } from '../DictationControls'

interface NotionDictationStripProps {
  dictationPhase: DictationPhase
  durationMs: number
  isPlayingBack: boolean
  dictationError?: string | null
  onPauseDictation: () => void
  onResumeDictation: () => void
  onStopRecording: () => void
  onTogglePlayback: () => void
  onDiscardRecording: () => void
  onTranscribe: () => void
}

export function NotionDictationStrip({
  dictationPhase,
  durationMs,
  isPlayingBack,
  dictationError,
  onPauseDictation,
  onResumeDictation,
  onStopRecording,
  onTogglePlayback,
  onDiscardRecording,
  onTranscribe,
}: NotionDictationStripProps) {
  const { t } = useTranslation()

  return (
    <div className="notion-dictation-strip" role="region" aria-label={t('dictate')}>
      <div className="notion-dictation-strip__controls">
        <Mic
          className="notion-dictation-strip__mic-icon h-4 w-4 shrink-0"
          strokeWidth={1.5}
          aria-hidden
        />
        <DictationControls
          phase={dictationPhase}
          durationMs={durationMs}
          isPlayingBack={isPlayingBack}
          dictationError={dictationError}
          onPause={onPauseDictation}
          onResume={onResumeDictation}
          onStop={onStopRecording}
          onTogglePlayback={onTogglePlayback}
          onDiscard={onDiscardRecording}
          onTranscribe={onTranscribe}
        />
      </div>
    </div>
  )
}
