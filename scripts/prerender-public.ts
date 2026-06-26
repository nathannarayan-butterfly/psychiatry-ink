/**
 * Prerender the public marketing + legal site to static HTML.
 *
 * WHY a small post-build script (not full SSR): the authenticated clinical app
 * must keep shipping as a client-only SPA that requires JavaScript. Only the
 * PUBLIC routes need meaningful no-JS HTML. The `src/public-site/*` module is
 * intentionally pure (no asset/CSS/`import.meta.glob` imports, no window access),
 * so it renders to static markup with `react-dom/server` directly under `tsx`
 * — no second Vite SSR bundle required.
 *
 * The same `<PublicPage>` component renders here AND in the SPA, so the
 * prerendered HTML matches what the client mounts. When the bundle loads,
 * `createRoot(...).render(<App/>)` re-renders `#root`, taking over interactivity.
 *
 * Output: per-domain static HTML under `dist/prerendered/<host>/<slug>.html`,
 * a `manifest.json` the server uses to map (host, path) → file, plus per-domain
 * `sitemap.xml` and `robots.txt`. The two prerendered sites are English
 * `psychiatry.ink` and German `psychiatrie.ink`.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { PublicPage } from '../src/public-site/PublicPage'
import {
  localizedPath,
  prerenderRoutesForLocale,
  indexableRoutesForLocale,
  type PublicLocale,
} from '../src/public-site/publicRoutes'
import { getPublicPageMeta, PUBLIC_ORIGINS } from '../src/public-site/publicSeo'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '..', 'dist')
const indexHtmlPath = path.join(distDir, 'index.html')
const outRoot = path.join(distDir, 'prerendered')

/** Domain hostnames for the two prerendered public sites. */
const SITES: Array<{ host: string; locale: PublicLocale }> = [
  { host: 'psychiatry.ink', locale: 'en' },
  { host: 'psychiatrie.ink', locale: 'de' },
]

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function slugForPath(routePath: string): string {
  if (routePath === '/') return 'index'
  return routePath.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\//g, '__')
}

interface BuiltPage {
  host: string
  routePath: string
  file: string
}

function buildHeadMeta(pageKey: ReturnType<typeof prerenderRoutesForLocale>[number]['key'], host: string): string {
  const meta = getPublicPageMeta(pageKey, host)
  const lines: string[] = []
  lines.push(`<meta name="description" content="${escapeAttr(meta.description)}" />`)
  lines.push(`<meta name="robots" content="${escapeAttr(meta.robots)}" />`)
  lines.push(`<link rel="canonical" href="${escapeAttr(meta.canonicalUrl)}" />`)
  for (const alt of meta.alternates) {
    lines.push(
      `<link rel="alternate" hreflang="${escapeAttr(alt.hreflang)}" href="${escapeAttr(alt.href)}" />`,
    )
  }
  lines.push(`<meta property="og:type" content="website" />`)
  lines.push(`<meta property="og:site_name" content="${escapeAttr(meta.ogSiteName)}" />`)
  lines.push(`<meta property="og:locale" content="${escapeAttr(meta.ogLocale)}" />`)
  lines.push(`<meta property="og:title" content="${escapeAttr(meta.ogTitle)}" />`)
  lines.push(`<meta property="og:description" content="${escapeAttr(meta.ogDescription)}" />`)
  lines.push(`<meta property="og:url" content="${escapeAttr(meta.canonicalUrl)}" />`)
  lines.push(`<meta name="twitter:card" content="summary_large_image" />`)
  lines.push(`<meta name="twitter:title" content="${escapeAttr(meta.ogTitle)}" />`)
  lines.push(`<meta name="twitter:description" content="${escapeAttr(meta.ogDescription)}" />`)
  return lines.join('\n    ')
}

const HTML_LANG_BY_LOCALE: Record<PublicLocale, string> = { en: 'en-GB', de: 'de-DE' }

function renderPageHtml(
  template: string,
  host: string,
  locale: PublicLocale,
  pageKey: ReturnType<typeof prerenderRoutesForLocale>[number]['key'],
): string {
  const meta = getPublicPageMeta(pageKey, host)
  const markup = renderToStaticMarkup(createElement(PublicPage, { pageKey, hostname: host }))

  let html = template

  // 1. <html lang> per domain.
  if (/<html\b[^>]*\blang="/i.test(html)) {
    html = html.replace(/(<html\b[^>]*\blang=")[^"]*(")/i, `$1${HTML_LANG_BY_LOCALE[locale]}$2`)
  } else {
    html = html.replace(/<html\b/i, `<html lang="${HTML_LANG_BY_LOCALE[locale]}"`)
  }

  // 2. <title>.
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeText(meta.title)}</title>`)

  // 3. Inject SEO meta before </head>.
  html = html.replace(/<\/head>/i, `    ${buildHeadMeta(pageKey, host)}\n  </head>`)

  // 4. Remove the SPA "JavaScript is required" <noscript> overlay — these pages
  //    are meaningful without JavaScript, so the overlay must not cover them.
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>/i, '')

  // 5. Inject the prerendered markup into #root. The module script remains, so
  //    the SPA hydrates/replaces it once JavaScript loads.
  html = html.replace(/<div id="root"><\/div>/, `<div id="root">${markup}</div>`)

  // 6. Domain brand consistency: normalize the product wordmark "Psychiatry.Ink"
  //    to the domain brand (Psychiatrie.Ink on DE) anywhere it survives from the
  //    static template — e.g. the legacy-browser fallback. The legal entity name
  //    "Psychiatry Ink Ltd" (no dot) and lowercase URLs/emails are not matched.
  if (meta.brandName !== 'Psychiatry.Ink') {
    html = html.split('Psychiatry.Ink').join(meta.brandName)
  }

  return html
}

function buildSitemap(locale: PublicLocale): string {
  const routes = indexableRoutesForLocale(locale)
  const today = new Date().toISOString().slice(0, 10)
  const urls = routes
    .map((route) => {
      const loc = `${PUBLIC_ORIGINS[locale]}${localizedPath(route.key, locale)}`
      const alternates = route.locales
        .map(
          (alt) =>
            `    <xhtml:link rel="alternate" hreflang="${alt === 'en' ? 'en-GB' : 'de-DE'}" href="${PUBLIC_ORIGINS[alt]}${localizedPath(route.key, alt)}" />`,
        )
        .join('\n')
      const xdefault = route.locales.includes('en')
        ? `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${PUBLIC_ORIGINS.en}${localizedPath(route.key, 'en')}" />`
        : ''
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n${alternates}${xdefault}\n  </url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`
}

function buildRobots(host: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /dashboard',
    'Disallow: /case',
    'Disallow: /workspace',
    'Disallow: /consultant',
    `Sitemap: https://${host}/sitemap.xml`,
    '',
  ].join('\n')
}

function main() {
  if (!existsSync(indexHtmlPath)) {
    console.error(`[prerender] dist/index.html not found at ${indexHtmlPath}. Run "vite build" first.`)
    process.exit(1)
  }
  const template = readFileSync(indexHtmlPath, 'utf8')
  mkdirSync(outRoot, { recursive: true })

  const manifest: Record<string, string> = {}
  const built: BuiltPage[] = []

  for (const site of SITES) {
    const hostDir = path.join(outRoot, site.host)
    mkdirSync(hostDir, { recursive: true })

    for (const route of prerenderRoutesForLocale(site.locale)) {
      const routePath = localizedPath(route.key, site.locale)
      const html = renderPageHtml(template, site.host, site.locale, route.key)
      const slug = slugForPath(routePath)
      const fileName = `${slug}.html`
      writeFileSync(path.join(hostDir, fileName), html, 'utf8')
      const relFile = path.posix.join(site.host, fileName)
      manifest[`${site.host}::${routePath}`] = relFile
      built.push({ host: site.host, routePath, file: relFile })
    }

    // Per-domain SEO assets.
    writeFileSync(path.join(hostDir, 'sitemap.xml'), buildSitemap(site.locale), 'utf8')
    writeFileSync(path.join(hostDir, 'robots.txt'), buildRobots(site.host), 'utf8')
  }

  writeFileSync(path.join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')

  console.log(`[prerender] wrote ${built.length} static HTML pages for ${SITES.length} domains:`)
  for (const page of built) {
    console.log(`  ${page.host}${page.routePath} -> dist/prerendered/${page.file}`)
  }
  console.log('[prerender] wrote per-domain sitemap.xml + robots.txt and manifest.json')
}

main()
