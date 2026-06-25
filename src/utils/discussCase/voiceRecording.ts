import {
  isVoiceCaptureSupported,
  startVoiceRecording,
  type VoiceRecording,
} from '../inlineAiEdit/voiceCapture'

export const DISCUSS_VOICE_MAX_DURATION_MS = 5 * 60 * 1000

export { isVoiceCaptureSupported, startVoiceRecording, type VoiceRecording }

export function formatVoiceDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
