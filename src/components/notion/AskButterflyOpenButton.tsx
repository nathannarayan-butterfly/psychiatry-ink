import { useTranslation } from '../../context/TranslationContext'
import { useAskButterfly } from '../../contexts/AskButterflyContext'
import { ButterflyLogo } from '../ButterflyLogo'

interface AskButterflyOpenButtonProps {
  variant?: 'sidebar' | 'topbar' | 'global'
  className?: string
}

/** Opens Ask Butterfly chat — sidebar footer, top bar, or fixed global trigger. */
export function AskButterflyOpenButton({
  variant = 'sidebar',
  className = '',
}: AskButterflyOpenButtonProps) {
  const { t } = useTranslation()
  const { isOpen, open } = useAskButterfly()

  const baseClass =
    variant === 'sidebar'
      ? 'case-sidebar-user-footer__action-btn'
      : variant === 'topbar'
        ? 'ask-butterfly-open-btn ask-butterfly-open-btn--topbar'
        : 'ask-butterfly-open-btn ask-butterfly-open-btn--global'

  return (
    <button
      type="button"
      className={`${baseClass}${isOpen ? ` ${baseClass}--open` : ''}${className ? ` ${className}` : ''}`}
      onClick={open}
      title={t('askButterflyOpen')}
      aria-label={t('askButterflyOpen')}
    >
      <ButterflyLogo variant="grey" size={variant === 'global' ? 24 : 22} />
    </button>
  )
}
