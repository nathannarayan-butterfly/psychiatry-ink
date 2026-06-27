import { useEffect } from 'react'
import { resolveDomainConfig } from '../config/domainConfig'
import { getHomepageContent } from '../data/homepage'
import { toPublicLocale, type PublicPageKey } from './publicRoutes'
import { getPublicPageMeta } from './publicSeo'
import { getLegalDoc } from './legalContent'
import { PublicShell } from './components/PublicShell'
import { LandingPage } from './pages/LandingPage'
import { FeaturesPage } from './pages/FeaturesPage'
import { PricingPage } from './pages/PricingPage'
import { SecurityPage } from './pages/SecurityPage'
import { LegalPage } from './pages/LegalPage'
import { ContactPage } from './pages/ContactPage'
import { LoginPage } from './pages/LoginPage'

function upsertMeta(name: string, content: string, attr: 'name' | 'property') {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLinkCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export interface PublicPageProps {
  pageKey: PublicPageKey
  /** Request hostname — drives brand, locale and content (works at prerender). */
  hostname: string
  /** SPA navigation handler; omitted at prerender so links are plain anchors. */
  onNavigate?: (path: string) => void
}

/**
 * Single entry point that renders any public marketing/legal page for a given
 * hostname. Used identically by the client SPA (interactive) and the prerender
 * script (`renderToStaticMarkup`), so the no-JS HTML and the hydrated SPA stay
 * in sync. Pure: all inputs are props, no `window`/`document` access at render.
 */
export function PublicPage({ pageKey, hostname, onNavigate }: PublicPageProps) {
  const config = resolveDomainConfig(hostname)
  const locale = toPublicLocale(config.defaultLocale)
  const content = getHomepageContent(config.defaultLocale)
  const brandName = config.brandName

  // Runtime SEO for SPA client navigations (e.g. clicking "Pricing"). No-op
  // during prerender (`renderToStaticMarkup` never runs effects) and guarded for
  // non-browser environments, so the prerendered <head> remains the source of
  // truth for crawlers; this only keeps the live SPA tab title/meta in sync.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const meta = getPublicPageMeta(pageKey, hostname)
    document.title = meta.title
    upsertMeta('description', meta.description, 'name')
    upsertMeta('og:title', meta.ogTitle, 'property')
    upsertMeta('og:description', meta.ogDescription, 'property')
    upsertMeta('og:site_name', meta.ogSiteName, 'property')
    upsertLinkCanonical(meta.canonicalUrl)
  }, [pageKey, hostname])

  let body
  switch (pageKey) {
    case 'features':
      body = <FeaturesPage content={content} locale={locale} onNavigate={onNavigate} />
      break
    case 'pricing':
      body = <PricingPage content={content} locale={locale} onNavigate={onNavigate} />
      break
    case 'security':
      body = <SecurityPage content={content} locale={locale} onNavigate={onNavigate} />
      break
    case 'privacy':
      body = <LegalPage doc={getLegalDoc('privacy', locale)} />
      break
    case 'terms':
      body = <LegalPage doc={getLegalDoc('terms', locale)} />
      break
    case 'impressum':
      body = <LegalPage doc={getLegalDoc('impressum', locale)} />
      break
    case 'contact':
      body = <ContactPage locale={locale} onNavigate={onNavigate} />
      break
    case 'login':
      body = <LoginPage locale={locale} brandName={brandName} />
      break
    case 'landing':
    default:
      body = <LandingPage content={content} locale={locale} onNavigate={onNavigate} />
      break
  }

  return (
    <PublicShell
      brandName={brandName}
      locale={locale}
      content={content}
      currentKey={pageKey}
      onNavigate={onNavigate}
    >
      {body}
    </PublicShell>
  )
}
