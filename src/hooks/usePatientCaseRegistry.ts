import { useCallback } from 'react'
import { useTranslation } from '../context/TranslationContext'
import { NOTION_PAGES } from '../components/notion/notionPages'
import type { PrivacyTier } from '../data/privacyRegions'
import { useCaseRegistry } from './useCaseRegistry'

interface UsePatientCaseRegistryOptions {
  tier: PrivacyTier
  countryCode: string
  caseFileCloudSync: boolean
}

/**
 * Shared wiring for the patient case registry used by the dashboard preview and
 * the dedicated "Meine Patienten" / "Archivierte Patienten" pages. Centralises the
 * `documentTypeLabel` + `fallbackTitle` resolvers so every patient surface renders
 * identical titles/summaries from one data source.
 */
export function usePatientCaseRegistry({
  tier,
  countryCode,
  caseFileCloudSync,
}: UsePatientCaseRegistryOptions) {
  const { t } = useTranslation()

  const documentTypeLabel = useCallback(
    (typeId: string | undefined) => {
      if (!typeId) return ''
      const page = NOTION_PAGES.find((item) => item.documentTypeId === typeId)
      return page ? t(page.labelKey) : typeId
    },
    [t],
  )

  const fallbackTitle = useCallback(
    (shortId: string) => t('dashboardCaseFallback').replace('{id}', shortId),
    [t],
  )

  const registry = useCaseRegistry({
    tier,
    countryCode,
    caseFileCloudSync,
    documentTypeLabel,
    fallbackTitle,
  })

  return { registry, documentTypeLabel, fallbackTitle }
}
