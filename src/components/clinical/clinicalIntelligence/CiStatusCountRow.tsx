import { useTranslation } from '../../../context/TranslationContext'

export interface CiStatusCountRowProps {
  accepted: number
  pending: number
  rejected: number
  className?: string
}

/**
 * Inline review-status counts — horizontal row with semantic color chips.
 */
export function CiStatusCountRow({
  accepted,
  pending,
  rejected,
  className,
}: CiStatusCountRowProps) {
  const { t } = useTranslation()
  const classes = ['ci-status-row', className].filter(Boolean).join(' ')

  return (
    <div className={classes} role="group" aria-label={t('ciReviewStatusCounts')}>
      <span className="ci-status-chip ci-status-chip--accepted">
        <span className="ci-status-chip__label">{t('ciStatusAccepted')}</span>
        <span className="ci-status-chip__value">{accepted}</span>
      </span>
      <span className="ci-status-chip ci-status-chip--pending">
        <span className="ci-status-chip__label">{t('ciStatusPending')}</span>
        <span className="ci-status-chip__value">{pending}</span>
      </span>
      <span className="ci-status-chip ci-status-chip--rejected">
        <span className="ci-status-chip__label">{t('ciStatusRejected')}</span>
        <span className="ci-status-chip__value">{rejected}</span>
      </span>
    </div>
  )
}
