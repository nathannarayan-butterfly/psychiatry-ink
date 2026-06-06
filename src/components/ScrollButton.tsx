import type { ButtonHTMLAttributes } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from '../context/TranslationContext'

interface ScrollButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  direction: 'left' | 'right'
}

export function ScrollButton({ direction, className = '', ...props }: ScrollButtonProps) {
  const { t } = useTranslation()
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      aria-label={direction === 'left' ? t('scrollBack') : t('scrollForward')}
      className={`glass-surface glass-interactive flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border-2 border-border/60 text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${className}`}
      {...props}
    >
      <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
    </button>
  )
}
