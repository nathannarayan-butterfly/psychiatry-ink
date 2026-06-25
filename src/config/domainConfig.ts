import { homepageContentDe } from '../data/homepage/content.de'
import { homepageContentEn } from '../data/homepage/content.en'
import { homepageContentEs } from '../data/homepage/content.es'
import { homepageContentFr } from '../data/homepage/content.fr'
import type { HomepageContent } from '../data/homepage/types'
import type { UiLanguage } from '../types/settings'

/** Key into `src/data/homepage/content.*.ts` modules. */
export type HomepageContentVariant = UiLanguage

export interface DomainSeoConfig {
  title: string
  description: string
  ogTitle: string
  ogDescription: string
  ogSiteName: string
}

export interface DomainConfig {
  domain: string
  /** Marketing landing vs authenticated app shell (no marketing locale override). */
  siteKind: 'marketing' | 'app'
  defaultLocale: UiLanguage
  homepageVariant: HomepageContentVariant
  pricingCopyVariant: HomepageContentVariant
  /** UI languages served on public marketing pages for this hostname. */
  marketingLocales: readonly UiLanguage[]
  seo: DomainSeoConfig
}

function seoFromHomepage(content: HomepageContent, siteName?: string): DomainSeoConfig {
  const title = content.meta.title
  const description = content.hero.subtitle
  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogSiteName: siteName ?? title,
  }
}

function marketingConfig(
  domain: string,
  locale: UiLanguage,
  content: HomepageContent,
  marketingLocales: readonly UiLanguage[],
  siteName?: string,
): DomainConfig {
  return {
    domain,
    siteKind: 'marketing',
    defaultLocale: locale,
    homepageVariant: locale,
    pricingCopyVariant: locale,
    marketingLocales,
    seo: seoFromHomepage(content, siteName),
  }
}

const PSYCHIATRY_INK = marketingConfig(
  'psychiatry.ink',
  'en',
  homepageContentEn,
  ['en'],
  'Psychiatry.Ink',
)

const PSYCHIATRIE_INK = marketingConfig(
  'psychiatrie.ink',
  'de',
  homepageContentDe,
  ['de', 'fr'],
  'Psychiatrie.Ink',
)

const PSYCHIATRIE_INK_FR = marketingConfig(
  'fr.psychiatrie.ink',
  'fr',
  homepageContentFr,
  ['de', 'fr'],
  'Psychiatrie.Ink',
)

const PSIQUIATRIA_INK = marketingConfig(
  'psiquiatria.ink',
  'es',
  homepageContentEs,
  ['es'],
  'Psiquiatria.Ink',
)

/** Authenticated app shell — same backend; locale comes from user settings after login. */
const APP_PSYCHIATRY_INK: DomainConfig = {
  domain: 'app.psychiatry.ink',
  siteKind: 'app',
  defaultLocale: 'de',
  homepageVariant: 'en',
  pricingCopyVariant: 'en',
  marketingLocales: [],
  seo: seoFromHomepage(homepageContentEn, 'Psychiatry.Ink'),
}

/** localhost / unknown hosts fall back to English marketing (psychiatry.ink). */
export const DOMAIN_CONFIG_FALLBACK: DomainConfig = PSYCHIATRY_INK

export const DOMAIN_CONFIG: readonly DomainConfig[] = [
  PSYCHIATRY_INK,
  PSYCHIATRIE_INK,
  PSYCHIATRIE_INK_FR,
  PSIQUIATRIA_INK,
  APP_PSYCHIATRY_INK,
] as const

const DOMAIN_CONFIG_BY_HOST: Readonly<Record<string, DomainConfig>> = Object.fromEntries(
  DOMAIN_CONFIG.map((config) => [config.domain, config]),
)

export function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    // Drop an explicit port (e.g. `psychiatry.ink:8080`, `localhost:5173`). A Host
    // header can carry a port; `window.location.hostname` never does — strip either way.
    .replace(/:\d+$/, '')
    .replace(/^www\./, '')
}

/**
 * Resolve marketing/app configuration from a request hostname.
 *
 * psychiatrie.ink serves DE by default; `fr.psychiatrie.ink` serves FR marketing.
 * localhost and unknown hosts → English psychiatry.ink behavior.
 */
export function resolveDomainConfig(hostname: string): DomainConfig {
  const normalized = normalizeHostname(hostname)

  if (normalized === 'localhost' || normalized === '127.0.0.1' || normalized.endsWith('.localhost')) {
    return DOMAIN_CONFIG_FALLBACK
  }

  const direct = DOMAIN_CONFIG_BY_HOST[normalized]
  if (direct) return direct

  return DOMAIN_CONFIG_FALLBACK
}

/**
 * Resolve the marketing/app UI locale for a request hostname.
 *
 * Exact-hostname match (after stripping `www.` and any port) — never a loose
 * substring test, so `psychiatry.ink` → `en` and `psychiatrie.ink` → `de` can
 * never be confused for one another. Unknown hosts / localhost fall back to the
 * English `psychiatry.ink` default.
 */
export function resolveLocaleFromHost(hostname: string): UiLanguage {
  return resolveDomainConfig(hostname).defaultLocale
}

export function isMarketingDomain(hostname: string): boolean {
  return resolveDomainConfig(hostname).siteKind === 'marketing'
}

export function isAppShellDomain(hostname: string): boolean {
  return resolveDomainConfig(hostname).siteKind === 'app'
}
