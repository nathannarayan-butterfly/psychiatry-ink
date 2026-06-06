import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { translateUi, type UiTranslationKey } from '../data/uiTranslations'
import type { UiLanguage } from '../types/settings'

interface TranslationContextValue {
  language: UiLanguage
  t: (key: UiTranslationKey) => string
}

const TranslationContext = createContext<TranslationContextValue | null>(null)

interface TranslationProviderProps {
  language: UiLanguage
  children: ReactNode
}

export function TranslationProvider({ language, children }: TranslationProviderProps) {
  const value = useMemo(
    () => ({
      language,
      t: (key: UiTranslationKey) => translateUi(language, key),
    }),
    [language],
  )

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  if (!context) {
    throw new Error('useTranslation must be used within TranslationProvider')
  }
  return context
}
