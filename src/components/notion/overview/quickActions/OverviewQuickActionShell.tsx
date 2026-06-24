import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../../../../context/TranslationContext'

interface OverviewQuickActionShellProps {
  open: boolean
  title: string
  description?: string
  ariaLabel?: string
  footer?: ReactNode
  onClose: () => void
  children: ReactNode
}

export function OverviewQuickActionShell({
  open,
  title,
  description,
  ariaLabel,
  footer,
  onClose,
  children,
}: OverviewQuickActionShellProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="ov-quick-overlay" role="presentation" onClick={onClose}>
      <div
        className="ov-quick-modal"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ov-quick-modal__header">
          <div className="ov-quick-modal__heading">
            <h2 className="ov-quick-modal__title">{title}</h2>
            {description ? <p className="ov-quick-modal__desc">{description}</p> : null}
          </div>
          <button
            type="button"
            className="ov-quick-modal__close"
            onClick={onClose}
            aria-label={t('guidedEntryCancel')}
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        <div className="ov-quick-modal__body">{children}</div>

        {footer ? <footer className="ov-quick-modal__footer">{footer}</footer> : null}
      </div>
    </div>
  )
}
