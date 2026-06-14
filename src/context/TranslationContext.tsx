import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { translateUi, type UiTranslationKey } from '../data/uiTranslations'
import { registerClinicalLanguageResolver } from '../services/clinicalApiFetch'
import type { EnglishVariant, UiLanguage } from '../types/settings'

interface TranslationContextValue {
  language: UiLanguage
  englishVariant: EnglishVariant
  t: (key: UiTranslationKey) => string
}

const TranslationContext = createContext<TranslationContextValue | null>(null)

interface TranslationProviderProps {
  language: UiLanguage
  englishVariant?: EnglishVariant
  children: ReactNode
}

export function TranslationProvider({
  language,
  englishVariant = 'uk',
  children,
}: TranslationProviderProps) {
  const value = useMemo(
    () => ({
      language,
      englishVariant,
      t: (key: UiTranslationKey) => translateUi(language, key, englishVariant),
    }),
    [language, englishVariant],
  )

  useEffect(() => {
    registerClinicalLanguageResolver(() => language)
  }, [language])

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider')
  }
  return context
}
