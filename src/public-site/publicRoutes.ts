import type { UiLanguage } from '../types/settings'

/**
 * Public marketing + legal site route registry.
 *
 * One SPA bundle serves every domain, so path → page resolution is
 * locale-agnostic: both `/features` (EN) and `/funktionen` (DE) resolve to the
 * same `features` page. The *content* and *brand* shown are chosen from the
 * request domain (see `resolveDomainConfig`), while canonical/hreflang tags tell
 * crawlers which localized URL is authoritative.
 *
 * The two primary public sites are English `psychiatry.ink` and German
 * `psychiatrie.ink`. FR/ES marketing domains keep rendering at runtime via the
 * SPA but are not prerendered here (EN/DE are the prerendered, SEO-complete
 * sites). Path lookups for non-en/de locales fall back to the English path.
 */

export type PublicPageKey =
  | 'landing'
  | 'features'
  | 'pricing'
  | 'security'
  | 'privacy'
  | 'terms'
  | 'impressum'
  | 'cookies'
  | 'dpa'
  | 'subprocessors'
  | 'securityOverview'
  | 'contact'
  | 'login'

/** Locales with first-class localized routing + prerender. */
export type PublicLocale = 'en' | 'de'

export interface PublicRouteConfig {
  key: PublicPageKey
  /** Localized path per primary locale. EN is the canonical fallback. */
  path: Record<PublicLocale, string>
  /** Show in the primary site navigation. */
  inNav: boolean
  /** Show in the footer legal links. */
  inFooterLegal: boolean
  /** Include in sitemap.xml and emit indexable robots metadata. */
  indexable: boolean
  /**
   * Locales this page is offered in. Pages offered in both en+de cross-link via
   * hreflang. Impressum is a German legal artefact mirrored as an English
   * "Legal notice".
   */
  locales: readonly PublicLocale[]
}

export const PUBLIC_ROUTES: readonly PublicRouteConfig[] = [
  {
    key: 'landing',
    path: { en: '/', de: '/' },
    inNav: false,
    inFooterLegal: false,
    indexable: true,
    locales: ['en', 'de'],
  },
  {
    key: 'features',
    path: { en: '/features', de: '/funktionen' },
    inNav: true,
    inFooterLegal: false,
    indexable: true,
    locales: ['en', 'de'],
  },
  {
    key: 'pricing',
    path: { en: '/pricing', de: '/preise' },
    inNav: true,
    inFooterLegal: false,
    indexable: true,
    locales: ['en', 'de'],
  },
  {
    key: 'security',
    path: { en: '/security', de: '/sicherheit' },
    inNav: true,
    inFooterLegal: false,
    indexable: true,
    locales: ['en', 'de'],
  },
  {
    key: 'privacy',
    path: { en: '/privacy', de: '/datenschutz' },
    inNav: false,
    inFooterLegal: true,
    indexable: true,
    locales: ['en', 'de'],
  },
  {
    key: 'terms',
    path: { en: '/terms', de: '/agb' },
    inNav: false,
    inFooterLegal: true,
    indexable: true,
    locales: ['en', 'de'],
  },
  {
    key: 'impressum',
    // German legal requirement (§ 5 DDG). Mirrored on the English site as a
    // "Legal notice" at /legal so the entity disclosure is reachable there too.
    path: { en: '/legal', de: '/impressum' },
    inNav: false,
    inFooterLegal: true,
    indexable: true,
    locales: ['en', 'de'],
  },
  {
    key: 'cookies',
    path: { en: '/cookies', de: '/cookie-richtlinie' },
    inNav: false,
    inFooterLegal: true,
    indexable: true,
    locales: ['en', 'de'],
  },
  {
    key: 'dpa',
    path: { en: '/dpa', de: '/auftragsverarbeitung' },
    inNav: false,
    inFooterLegal: true,
    indexable: true,
    locales: ['en', 'de'],
  },
  {
    key: 'subprocessors',
    path: { en: '/subprocessors', de: '/unterauftragsverarbeiter' },
    inNav: false,
    inFooterLegal: true,
    indexable: true,
    locales: ['en', 'de'],
  },
  {
    // Detailed security/trust statement (legal cluster). Distinct from the
    // marketing `security` page (/security ↔ /sicherheit), which keeps its slugs.
    key: 'securityOverview',
    path: { en: '/security-overview', de: '/sicherheitsuebersicht' },
    inNav: false,
    inFooterLegal: true,
    indexable: true,
    locales: ['en', 'de'],
  },
  {
    key: 'contact',
    path: { en: '/contact', de: '/kontakt' },
    inNav: false,
    inFooterLegal: true,
    indexable: true,
    locales: ['en', 'de'],
  },
  {
    key: 'login',
    path: { en: '/login', de: '/login' },
    inNav: false,
    inFooterLegal: false,
    indexable: false,
    locales: ['en', 'de'],
  },
] as const

const ROUTE_BY_KEY: Readonly<Record<PublicPageKey, PublicRouteConfig>> = Object.fromEntries(
  PUBLIC_ROUTES.map((route) => [route.key, route]),
) as Record<PublicPageKey, PublicRouteConfig>

/** Narrow any UI language to the nearest first-class public locale (en/de). */
export function toPublicLocale(language: UiLanguage): PublicLocale {
  return language === 'de' ? 'de' : 'en'
}

/** Localized path for a page in the given locale (falls back to the EN path). */
export function localizedPath(key: PublicPageKey, language: UiLanguage): string {
  const route = ROUTE_BY_KEY[key]
  return route.path[toPublicLocale(language)] ?? route.path.en
}

export function getPublicRoute(key: PublicPageKey): PublicRouteConfig {
  return ROUTE_BY_KEY[key]
}

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

/**
 * Resolve a pathname to a public page key, matching the localized path of ANY
 * locale (so `/funktionen` and `/features` both map to `features`). Returns
 * `null` for paths that are not part of the public marketing/legal site.
 */
export function matchPublicPath(pathname: string): PublicPageKey | null {
  const path = normalizePath(pathname)
  for (const route of PUBLIC_ROUTES) {
    if (route.key === 'landing') continue // '/' handled explicitly by the caller
    if (route.path.en === path || route.path.de === path) {
      return route.key
    }
  }
  return null
}

/** Page keys that should be prerendered + listed in the sitemap for a locale. */
export function indexableRoutesForLocale(locale: PublicLocale): PublicRouteConfig[] {
  return PUBLIC_ROUTES.filter(
    (route) => route.indexable && route.locales.includes(locale),
  )
}

/** All prerenderable page keys for a locale (indexable pages + login shell). */
export function prerenderRoutesForLocale(locale: PublicLocale): PublicRouteConfig[] {
  return PUBLIC_ROUTES.filter((route) => route.locales.includes(locale))
}
