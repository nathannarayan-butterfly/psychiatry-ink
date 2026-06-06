export type DictationPhase =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'review'
  | 'transcribing'

export interface DictationState {
  phase: DictationPhase
  durationMs: number
  playbackMs: number
  isPlayingBack: boolean
}
