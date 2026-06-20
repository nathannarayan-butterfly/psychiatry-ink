import { ShieldAlert } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'

/** AI-generated clinical hypothesis disclaimer — required on every CI card. */
export function CiHypothesisBanner({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  return (
    <p
      className={[
        'ci-hypothesis-banner',
        compact ? 'ci-hypothesis-banner--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="note"
    >
      <ShieldAlert className="ci-hypothesis-banner__icon" aria-hidden strokeWidth={2} />
      <span>{t('ciDisclaimer')}</span>
    </p>
  )
}
