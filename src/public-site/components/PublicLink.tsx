import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'

export interface PublicNavContext {
  /** SPA navigation handler; when absent, links behave as plain anchors (no-JS). */
  onNavigate?: (path: string) => void
}

interface PublicLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>,
    PublicNavContext {
  href: string
  children: ReactNode
}

/**
 * Progressive-enhancement link for the public site. It always renders a real
 * `<a href>` so prerendered pages work with JavaScript disabled (crawler/no-JS).
 * When an `onNavigate` handler is supplied (the SPA case) clicks are intercepted
 * for client-side routing; otherwise the browser performs a normal navigation
 * that the server answers with the prerendered HTML for that route.
 */
export function PublicLink({ href, onNavigate, children, ...rest }: PublicLinkProps) {
  const isInternal = href.startsWith('/')

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    rest.onClick?.(event)
    if (!onNavigate || !isInternal) return
    // Respect new-tab / modifier clicks.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    event.preventDefault()
    onNavigate(href)
  }

  return (
    <a href={href} {...rest} onClick={handleClick}>
      {children}
    </a>
  )
}
