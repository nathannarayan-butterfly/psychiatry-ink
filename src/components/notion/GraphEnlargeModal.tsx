import { useEffect, type ReactNode } from 'react'
import { useTranslation } from '../../context/TranslationContext'

interface GraphEnlargeModalProps {
  title: string
  subtitle?: string | null
  refText?: string | null
  onClose: () => void
  children: ReactNode
}

/** Reusable, minimal-theme overlay for enlarging an Overview chart. */
export function GraphEnlargeModal({
  title,
  subtitle,
  refText,
  onClose,
  children,
}: GraphEnlargeModalProps) {
  const { t } = useTranslation()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="overview-chart-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="overview-chart-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="overview-chart-modal__header">
          <div className="overview-chart-modal__heading">
            <h3 className="overview-chart-modal__title">{title}</h3>
            {subtitle ? (
              <span className="overview-chart-modal__subtitle">{subtitle}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="overview-chart-modal__close"
            onClick={onClose}
            title={t('overviewChartClose')}
            aria-label={t('overviewChartClose')}
          >
            ×
          </button>
        </div>

        {refText ? (
          <p className="overview-chart-modal__ref">
            {t('overviewChartReference')}: {refText}
          </p>
        ) : null}

        <div className="overview-chart-modal__body">{children}</div>
      </div>
    </div>
  )
}
