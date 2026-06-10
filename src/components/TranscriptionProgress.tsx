import { useTranslation } from '../context/TranslationContext'

export function TranscriptionProgress() {
  const { t } = useTranslation()

  return (
    <div
      className="transcription-progress flex flex-col items-center gap-2"
      role="status"
      aria-label={t('transcriptionInProgress')}
    >
      <div className="transcription-progress__ring relative h-9 w-9 sm:h-10 sm:w-10">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64" aria-hidden>
          <circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke="var(--border-soft)"
            strokeWidth="3"
          />
          <circle
            className="transcription-progress__arc"
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="163.36"
            strokeDashoffset="122.52"
          />
        </svg>
      </div>
      <p className="text-[12px] font-medium text-secondary sm:text-xs">{t('transcribing')}</p>
    </div>
  )
}
