import { useCallback, useEffect, useState } from 'react'
import { languageOptions } from '../data/languages'
import type { EnglishVariant, UiLanguage } from '../types/settings'
import { LANGUAGE_STORAGE_KEY, loadStoredUiLanguage } from '../utils/clinicalLanguage'
import { safeSetItem } from '../utils/safeStorage'

const ENGLISH_VARIANT_KEY = 'psychiatry-ink-english-variant'

function loadEnglishVariant(): EnglishVariant {
  try {
    const raw = localStorage.getItem(ENGLISH_VARIANT_KEY)
    return raw === 'us' ? 'us' : 'uk'
  } catch {
    return 'uk'
  }
}

export function useLanguageSettings() {
  const [language, setLanguage] = useState<UiLanguage>(loadStoredUiLanguage)
  const [englishVariant, setEnglishVariant] = useState<EnglishVariant>(loadEnglishVariant)

  useEffect(() => {
    document.documentElement.lang =
      language === 'en' ? (englishVariant === 'us' ? 'en-US' : 'en-GB') : language
    safeSetItem(LANGUAGE_STORAGE_KEY, language)
  }, [language, englishVariant])

  useEffect(() => {
    safeSetItem(ENGLISH_VARIANT_KEY, englishVariant)
  }, [englishVariant])

  const selectLanguage = useCallback((next: UiLanguage) => {
    setLanguage(next)
  }, [])

  const selectEnglishVariant = useCallback((next: EnglishVariant) => {
    setEnglishVariant(next)
  }, [])

  const currentLabel =
    languageOptions.find((option) => option.value === language)?.label ?? 'Deutsch'

  return {
    language,
    englishVariant,
    currentLabel,
    selectLanguage,
    selectEnglishVariant,
    languageOptions,
  }
}
