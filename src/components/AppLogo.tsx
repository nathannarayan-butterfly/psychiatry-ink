import type { MouseEvent } from 'react'
import { useTranslation } from '../context/TranslationContext'
import { hasLogoInkMark, logoInkSrc } from '../data/brandLogo'
import { logoStemByLanguage, logoTextByLanguage } from '../data/languages'

interface AppLogoProps {
  onClick?: () => void
}

export function AppLogo({ onClick }: AppLogoProps) {
  const { language, t } = useTranslation()
  const stem = logoStemByLanguage[language]
  const className = 'topbar-logo flex min-w-0 items-center gap-2'

  const content =
    hasLogoInkMark && logoInkSrc ? (
      <>
        <span className="topbar-logo__stem truncate font-semibold tracking-tight text-ink">
          {stem}
        </span>
        <img
          src={logoInkSrc}
          alt=""
          aria-hidden
          className="topbar-logo__mark shrink-0 object-contain"
          decoding="async"
        />
        <span className="topbar-logo__beta" aria-label="Beta">BETA</span>
      </>
    ) : (
      <span className="truncate text-lg font-semibold tracking-tight text-ink sm:text-xl">
        {logoTextByLanguage[language]}
        <span className="topbar-logo__beta" aria-label="Beta">BETA</span>
      </span>
    )

  if (!onClick) {
    return <div className={className}>{content}</div>
  }

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    onClick()
  }

  return (
    <a
      href="/dashboard"
      className={`${className} topbar-logo--link`}
      onClick={handleClick}
      aria-label={t('dashboardNavLink')}
    >
      {content}
    </a>
  )
}
