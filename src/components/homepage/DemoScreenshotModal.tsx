import { useEffect } from 'react'

export interface DemoScreenshotModalProps {
  imageSrc: string
  alt: string
  title: string
  closeAriaLabel: string
  onClose: () => void
}

/** Lightbox for homepage demo screenshots — mirrors GraphEnlargeModal behavior. */
export function DemoScreenshotModal({
  imageSrc,
  alt,
  title,
  closeAriaLabel,
  onClose,
}: DemoScreenshotModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="hp-demo-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="hp-demo-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="hp-demo-modal__header">
          <h3 className="hp-demo-modal__title">{title}</h3>
          <button
            type="button"
            className="hp-demo-modal__close"
            onClick={onClose}
            aria-label={closeAriaLabel}
          >
            ×
          </button>
        </div>
        <div className="hp-demo-modal__body">
          <img className="hp-demo-modal__image" src={imageSrc} alt={alt} />
        </div>
      </div>
    </div>
  )
}
