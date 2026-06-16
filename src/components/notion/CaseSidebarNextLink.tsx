import { useTranslation } from '../../context/TranslationContext'

interface CaseSidebarNextLinkProps {
  onClick: () => void
  /** Display name of the next patient (for title/aria). */
  nextPatientName?: string
  /** When true, render a greyed, non-clickable control (no next patient). */
  disabled?: boolean
}

/** Advance to the next patient in the Meine Patienten list. */
export function CaseSidebarNextLink({
  onClick,
  nextPatientName,
  disabled = false,
}: CaseSidebarNextLinkProps) {
  const { t } = useTranslation()
  const name = nextPatientName?.trim()
  const label = t('topNavNextPatient')
  const title = disabled
    ? t('topNavNextPatientNone')
    : name
      ? `${label}: ${name}`
      : label

  return (
    <button
      type="button"
      className={[
        'case-sidebar-next-link',
        'case-sidebar-next-link--content',
        disabled ? 'case-sidebar-next-link--disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
      title={title}
      aria-label={title}
    >
      <span>{label}</span>
    </button>
  )
}
