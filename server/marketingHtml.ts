import { resolveDomainConfig } from '../src/config/domainConfig'

/**
 * The single static `index.html` is served for every marketing/app domain, so by
 * default the first paint (and any non-JS crawler) sees whatever `lang`, `<title>`
 * and meta were baked into the template. This module rewrites those per request
 * Host so `psychiatry.ink` is served as English and `psychiatrie.ink` as German
 * from the very first byte — the client (`useMarketingSeo` / `loadBootstrapUiLanguage`)
 * then keeps the same values, avoiding a German-then-English flash.
 *
 * Locale + SEO come from the shared `resolveDomainConfig`, so there is a single
 * source of truth for the domain→locale mapping (no parallel server-side map).
 */

/** BCP-47 `lang` attribute for the served HTML shell. */
const HTML_LANG_BY_LOCALE: Record<string, string> = {
  de: 'de',
  en: 'en-GB',
  fr: 'fr',
  es: 'es',
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Return `template` with its `<html lang>`, `<title>` and marketing meta tags
 * rewritten for the locale of `hostname`. Pure string transform — never mutates
 * the input — so the cached template can be reused across requests.
 */
export function injectMarketingMeta(template: string, hostname: string): string {
  const config = resolveDomainConfig(hostname)
  const { seo } = config
  const langAttr = HTML_LANG_BY_LOCALE[config.defaultLocale] ?? config.defaultLocale

  let html = template

  if (/<html\b[^>]*\blang="/i.test(html)) {
    html = html.replace(/(<html\b[^>]*\blang=")[^"]*(")/i, `$1${langAttr}$2`)
  } else {
    html = html.replace(/<html\b/i, `<html lang="${langAttr}"`)
  }

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlText(seo.title)}</title>`)

  const metaTags = [
    `<meta name="description" content="${escapeHtmlAttribute(seo.description)}" />`,
    `<meta property="og:title" content="${escapeHtmlAttribute(seo.ogTitle)}" />`,
    `<meta property="og:description" content="${escapeHtmlAttribute(seo.ogDescription)}" />`,
    `<meta property="og:site_name" content="${escapeHtmlAttribute(seo.ogSiteName)}" />`,
  ].join('\n    ')

  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `    ${metaTags}\n  </head>`)
  }

  return html
}
