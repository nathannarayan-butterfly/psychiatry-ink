import { Check, Copy } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useCopyWithFeedback } from '../../hooks/useCopyWithFeedback'

interface CopyButtonProps {
  /** Text to copy. A function is evaluated lazily on click (e.g. heavy joins). */
  text: string | (() => string)
  /** Tooltip / accessible label while idle. Defaults to "Text kopieren". */
  label?: string
  /** Tooltip / accessible label after copying. Defaults to "Text kopiert". */
  copiedLabel?: string
  /** Render the label text beside the icon (otherwise icon-only). */
  showLabel?: boolean
  /** Add the hairline-framed `--bordered` variant. */
  bordered?: boolean
  /** Extra classes appended after the base `icon-action-btn`. */
  className?: string
  /** Disable the button. */
  disabled?: boolean
  /** Called after a successful copy. */
  onCopied?: () => void
}

/**
 * Unified copy-to-clipboard button. Gives consistent feedback everywhere:
 * the icon flips to a check + success tint and the tooltip/label switches to
 * "Text kopiert" for a moment, while a visually-hidden live region announces
 * the same to assistive tech. Backed by {@link useCopyWithFeedback}.
 */
export function CopyButton({
  text,
  label,
  copiedLabel,
  showLabel = false,
  bordered = false,
  className,
  disabled = false,
  onCopied,
}: CopyButtonProps) {
  const { t } = useTranslation()
  const { copied, copy } = useCopyWithFeedback()

  const idleLabel = label ?? t('copyButtonCopy')
  const doneLabel = copiedLabel ?? t('copyButtonCopied')
  const currentLabel = copied ? doneLabel : idleLabel

  const handleClick = async () => {
    const value = typeof text === 'function' ? text() : text
    const ok = await copy(value)
    if (ok) onCopied?.()
  }

  const classes = [
    'icon-action-btn',
    'copy-button',
    bordered ? 'icon-action-btn--bordered' : '',
    copied ? 'icon-action-btn--success' : '',
    showLabel ? 'copy-button--with-label' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={classes}
      onClick={() => void handleClick()}
      title={currentLabel}
      aria-label={currentLabel}
      data-copied={copied ? 'true' : 'false'}
      disabled={disabled}
    >
      {copied ? <Check strokeWidth={1.75} aria-hidden /> : <Copy strokeWidth={1.75} aria-hidden />}
      {showLabel ? <span className="copy-button__label">{currentLabel}</span> : null}
      <span className="copy-button__live" aria-live="polite">
        {copied ? doneLabel : ''}
      </span>
    </button>
  )
}
