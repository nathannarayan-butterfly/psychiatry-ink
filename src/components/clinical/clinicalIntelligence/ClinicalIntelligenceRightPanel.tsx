import { useMemo } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import type { UseClinicalIntelligenceResult } from '../../../hooks/useClinicalIntelligence'
import { ClinicalIntelligenceDiscussPanel } from './ClinicalIntelligenceDiscussPanel'

interface ClinicalIntelligenceRightPanelProps {
  ci: UseClinicalIntelligenceResult
  discussOpen: boolean
  onCloseDiscuss: () => void
  savedAt: string | null
  savedDocumentId?: string | null
  onOpenSavedDocument?: () => void
}

export function ClinicalIntelligenceRightPanel({
  ci,
  discussOpen,
  onCloseDiscuss,
  savedAt,
  savedDocumentId,
  onOpenSavedDocument,
}: ClinicalIntelligenceRightPanelProps) {
  const { t, language } = useTranslation()

  const savedLabel = useMemo(() => {
    if (!savedAt) return null
    try {
      return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : language, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(savedAt))
    } catch {
      return savedAt
    }
  }, [language, savedAt])

  return (
    <aside className="ci-right-rail" aria-label={t('ciRightRailTitle')}>
      <div className="ci-right-rail__head">
        <h3 className="ci-right-rail__title">{t('ciRightRailTitle')}</h3>
      </div>

      {savedLabel ? (
        <p className="ci-right-rail__saved-meta">
          {t('ciRightRailSavedAt')}: {savedLabel}
        </p>
      ) : null}

      {savedDocumentId && onOpenSavedDocument ? (
        <button
          type="button"
          className="ci-right-rail__open-doc"
          onClick={onOpenSavedDocument}
        >
          {t('ciOpenSavedDocument')}
        </button>
      ) : null}

      {discussOpen ? (
        <ClinicalIntelligenceDiscussPanel
          ci={ci}
          open={discussOpen}
          placement="rail"
          onClose={onCloseDiscuss}
        />
      ) : null}
    </aside>
  )
}
