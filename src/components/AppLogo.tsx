import type { MouseEvent } from 'react'
import { useTranslation } from '../context/TranslationContext'
import { hasLogoInkMark, logoInkRawSvg, logoInkSrc } from '../data/brandLogo'
import { logoStemByLanguage, logoTextByLanguage } from '../data/languages'

interface AppLogoProps {
  onClick?: () => void
  /** White text/mark for dark backgrounds (e.g. overview sidebar prototype). */
  variant?: 'default' | 'light'
}

/**
 * For the dark-sidebar (light) variant we inline the SVG so its two groups
 * (#black-artwork / #white-details) can be recolored independently via CSS,
 * giving a two-tone white-silhouette + dark-engraving look instead of a flat
 * inverted blob. The class is injected so existing `.topbar-logo__mark` sizing
 * rules keep applying to the <svg> element itself.
 */
const lightMarkSvg =
  logoInkRawSvg
    ?.replace(/<\?xml[^>]*\?>\s*/, '')
    .replace(
      /<svg\b/,
      '<svg class="topbar-logo__mark topbar-logo__mark--inline shrink-0"',
    ) ?? null

export function AppLogo({ onClick, variant = 'default' }: AppLogoProps) {
  const { language, t } = useTranslation()
  const stem = logoStemByLanguage[language]
  const className = [
    'topbar-logo flex min-w-0 items-center gap-2',
    variant === 'light' ? 'topbar-logo--light' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const markEl =
    variant === 'light' && lightMarkSvg ? (
      <span
        className="topbar-logo__mark-host"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: lightMarkSvg }}
      />
    ) : (
      <img
        src={logoInkSrc ?? undefined}
        alt=""
        aria-hidden
        className="topbar-logo__mark shrink-0 object-contain"
        decoding="async"
      />
    )

  const content =
    hasLogoInkMark && logoInkSrc ? (
      <div className="topbar-logo__lockup">
        <div className="topbar-logo__row">
          <span className="topbar-logo__stem truncate font-semibold tracking-tight text-ink">
            {stem}
          </span>
          {markEl}
        </div>
        <span className="topbar-logo__beta" aria-label="Beta">BETA</span>
      </div>
    ) : (
      <div className="topbar-logo__lockup">
        <span className="truncate text-lg font-semibold tracking-tight text-ink sm:text-xl">
          {logoTextByLanguage[language]}
        </span>
        <span className="topbar-logo__beta" aria-label="Beta">BETA</span>
      </div>
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
