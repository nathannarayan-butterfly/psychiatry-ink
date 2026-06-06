import { useTranslation } from '../context/TranslationContext'

interface RecordingWaveformProps {
  paused?: boolean
}

export function RecordingWaveform({ paused = false }: RecordingWaveformProps) {
  const { t } = useTranslation()

  return (
    <div
      className="recording-waveform relative flex items-center justify-center gap-1.5"
      role="status"
      aria-label={paused ? t('recordingPaused') : t('recordingActive')}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span
          key={index}
          className={`recording-waveform__bar w-1 rounded-full bg-recording ${
            paused ? 'recording-waveform__bar--paused' : ''
          }`}
          style={{ animationDelay: `${index * 0.12}s` }}
        />
      ))}
      {paused ? (
        <p className="absolute mt-20 text-xs text-muted">{t('paused')}</p>
      ) : null}
    </div>
  )
}
