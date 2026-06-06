import type { DictationPhase } from '../types/dictation'
import { GenerationProgress } from './GenerationProgress'
import { RecordingReview } from './RecordingReview'
import { RecordingWaveform } from './RecordingWaveform'
import { TranscriptionProgress } from './TranscriptionProgress'

interface WorkspaceEditorOverlayProps {
  dictationPhase: DictationPhase
  durationMs: number
  playbackMs: number
  isPlayingBack: boolean
  isGenerating: boolean
}

export function WorkspaceEditorOverlay({
  dictationPhase,
  durationMs,
  playbackMs,
  isPlayingBack,
  isGenerating,
}: WorkspaceEditorOverlayProps) {
  const showDictationOverlay =
    dictationPhase === 'recording' ||
    dictationPhase === 'paused' ||
    dictationPhase === 'review' ||
    dictationPhase === 'transcribing'

  if (!showDictationOverlay && !isGenerating) return null

  return (
    <div className="workspace-editor-overlay glass-overlay pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
      {isGenerating ? (
        <GenerationProgress />
      ) : dictationPhase === 'transcribing' ? (
        <TranscriptionProgress />
      ) : dictationPhase === 'review' ||
        (dictationPhase === 'paused' && isPlayingBack) ? (
        <RecordingReview
          durationMs={durationMs}
          playbackMs={playbackMs}
          isPlayingBack={isPlayingBack}
          paused={dictationPhase === 'paused'}
        />
      ) : dictationPhase === 'recording' || dictationPhase === 'paused' ? (
        <RecordingWaveform paused={dictationPhase === 'paused'} />
      ) : null}
    </div>
  )
}
