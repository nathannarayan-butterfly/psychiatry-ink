import { useEffect, useRef } from 'react'

export interface DemoScreenshotModalProps {
  imageSrc: string
  alt: string
  title: string
  closeAriaLabel: string
  onClose: () => void
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** Lightbox for homepage demo screenshots — mirrors GraphEnlargeModal behavior. */
export function DemoScreenshotModal({
  imageSrc,
  alt,
  title,
  closeAriaLabel,
  onClose,
}: DemoScreenshotModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousActive = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const modal = modalRef.current
      if (!modal) return

      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)

      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previousActive?.focus()
    }
  }, [onClose])

  return (
    <div
      className="hp-demo-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="hp-demo-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="hp-demo-modal__header">
          <h3 className="hp-demo-modal__title">{title}</h3>
          <button
            ref={closeRef}
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
