import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import express, { type Express } from 'express'
import { injectMarketingMeta } from './marketingHtml'

/**
 * Serve the built Vite client (`dist/`) from the same Express service with SPA
 * history fallback, so same-origin `/api/*` works in the default single-service
 * topology. For a split deploy (frontend hosted separately, `VITE_API_BASE_URL`
 * pointing here), there is simply no `dist/` to serve and this is a no-op.
 *
 * Must be registered AFTER all `/api` routers, and never throws when `dist/` is
 * absent — Cloud Run must still boot and serve `/api/health` without a client
 * build present.
 *
 * @returns true if a client build was found and is being served.
 */
// index.html must never be cached: it is the entry point that references the
// content-hashed asset filenames. If a browser or intermediary serves a stale
// index.html, users keep loading the old bundle (and never see new deploys)
// even though the hashed assets themselves are fresh.
const NO_CACHE = 'no-cache, no-store, must-revalidate'
// Content-hashed assets (e.g. /assets/index-<hash>.js) are immutable: a new
// build produces new filenames, so these can be cached forever safely.
const IMMUTABLE = 'public, max-age=31536000, immutable'

function setStaticCacheHeaders(res: express.Response, filePath: string): void {
  if (filePath.endsWith('index.html')) {
    res.setHeader('Cache-Control', NO_CACHE)
  } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    res.setHeader('Cache-Control', IMMUTABLE)
  }
}

export function configureClientServing(app: Express, distDir: string): boolean {
  const indexHtml = path.join(distDir, 'index.html')
  if (!existsSync(indexHtml)) return false

  // Read the built shell once at boot. It only changes between deploys, and a
  // deploy restarts the process, so an in-memory copy never goes stale. We must
  // hold the template (not the per-host output) because the served HTML varies by
  // request Host (psychiatry.ink → English shell, psychiatrie.ink → German shell).
  const indexTemplate = readFileSync(indexHtml, 'utf8')

  // Content-hashed assets are immutable; everything else (incl. index.html) is
  // revalidated so deploys propagate to clients immediately.
  app.use(
    express.static(distDir, {
      index: false,
      setHeaders: setStaticCacheHeaders,
    }),
  )

  // SPA history fallback: any non-API GET/HEAD that did not match a static asset
  // returns index.html so client-side routing can take over. This is the path
  // real navigations hit (express.static has index:false). The shell's <html lang>,
  // <title> and marketing meta are rewritten per request Host so the FIRST paint
  // (and non-JS crawlers) already get the right locale — no German-then-English
  // flash. `req.hostname` honours X-Forwarded-Host under `trust proxy`, so it is
  // the real public domain behind the Cloud Run load balancer.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api/')) return next()
    // The served shell differs per Host with the same URL; keep it uncacheable so
    // no intermediary serves one domain's locale to another.
    res.setHeader('Cache-Control', NO_CACHE)
    res.setHeader('Vary', 'X-Forwarded-Host, Host')
    res.type('html').send(injectMarketingMeta(indexTemplate, req.hostname))
  })

  return true
}
