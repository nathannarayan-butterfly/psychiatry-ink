import { ArrowLeft } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'

interface CaseSidebarBackLinkProps {
  onClick: () => void
  active?: boolean
  /** Light content area (accent text on white); default is sidebar header row. */
  variant?: 'sidebar' | 'content'
}

/** Back navigation to the Meine Patienten registry list. */
export function CaseSidebarBackLink({
  onClick,
  active = false,
  variant = 'sidebar',
}: CaseSidebarBackLinkProps) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      className={[
        'case-sidebar-back-link',
        variant === 'content' ? 'case-sidebar-back-link--content' : '',
        active ? 'case-sidebar-back-link--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      aria-pressed={active}
    >
      <ArrowLeft className="case-sidebar-back-link__icon" aria-hidden strokeWidth={2} />
      <span>{t('topNavMeinePatienten')}</span>
    </button>
  )
}
