import type { UiTranslationKey } from '../data/uiTranslations'

/** Map compact-dictation error codes to localized user-facing messages. */
export function mapDictationError(
  error: string | null,
  t: (key: UiTranslationKey) => string,
): string | null {
  if (!error) return null
  if (error === 'microphone_unavailable' || error === 'microphone_denied') {
    return t('launcherVoiceErrorMic')
  }
  if (error === 'empty_recording') return t('launcherVoiceErrorEmpty')
  if (/credit/i.test(error)) return t('launcherVoiceErrorCredits')
  if (/anmeldung|401|unauthorized|authentication/i.test(error)) {
    return t('launcherVoiceErrorAuth')
  }
  if (/failed to fetch|network|ECONNREFUSED|502|503|504/i.test(error)) {
    return t('launcherVoiceErrorServer')
  }
  return t('launcherVoiceErrorGeneric')
}
