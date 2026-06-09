import { useCallback, useEffect, useState } from 'react'
import { defaultLanguage, languageOptions } from '../data/languages'
import type { UiLanguage } from '../types/settings'
import { safeSetItem } from '../utils/safeStorage'

const STORAGE_KEY = 'psychiatry-ink-language'

function loadLanguage(): UiLanguage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultLanguage
    const match = languageOptions.find((option) => option.value === raw)
    return match ? match.value : defaultLanguage
  } catch {
    return defaultLanguage
  }
}

export function useLanguageSettings() {
  const [language, setLanguage] = useState<UiLanguage>(loadLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    safeSetItem(STORAGE_KEY, language)
  }, [language])

  const selectLanguage = useCallback((next: UiLanguage) => {
    setLanguage(next)
  }, [])

  const currentLabel =
    languageOptions.find((option) => option.value === language)?.label ?? 'Deutsch'

  return {
    language,
    currentLabel,
    selectLanguage,
    languageOptions,
  }
}
