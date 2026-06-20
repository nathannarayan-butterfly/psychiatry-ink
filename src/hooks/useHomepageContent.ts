import { useMemo } from 'react'
import { getAiCreditsHinweiseContent } from '../data/aiCreditsHinweise'
import { getHomepageContent } from '../data/homepage'
import { useTranslation } from '../context/TranslationContext'

export function useHomepageContent() {
  const { language } = useTranslation()
  return useMemo(() => getHomepageContent(language), [language])
}

export function useAiCreditsHinweiseContent() {
  const { language } = useTranslation()
  return useMemo(() => getAiCreditsHinweiseContent(language), [language])
}
