import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import express, { type Express } from 'express'
import { injectMarketingMeta } from './marketingHtml'
import { resolveDomainConfig } from '../src/config/domainConfig'

/**
 * Serve the built Vite client (`dist/`) from the same Express service with SPA
 * history fallback, so same-origin `/api/*` works in the default single-service
 * topology. For a split deploy (frontend hosted separately, `VITE_API_BASE_URL`
 * pointing here), there is simply no `dist/` to serve and this is a no-op.
 *
 * Public marketing/legal routes are PRERENDERED to static HTML at build time
 * (`scripts/prerender-public.ts`, one file per domain+route under
 * `dist/prerendered/<host>/`). This middleware serves those files for matching
 * (host, path) pairs so crawlers and no-JS visitors get meaningful HTML, while
 * the authenticated app keeps its existing client-only SPA fallback unchanged.
 *
 * Must be registered AFTER all `/api` routers, and never throws when `dist/` (or
 * the prerendered output) is absent — Cloud Run must still boot and serve
 * `/api/health` without a client build present.
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
  } else if (filePath.endsWith(`${path.sep}version.json`)) {
    // The deploy-detection manifest: long-lived tabs poll this to notice new
    // deploys. It MUST never be cached or the prompt would lag behind the deploy.
    res.setHeader('Cache-Control', NO_CACHE)
  } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    res.setHeader('Cache-Control', IMMUTABLE)
  }
}

function normalizeReqPath(reqPath: string): string {
  const trimmed = reqPath.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

export function configureClientServing(app: Express, distDir: string): boolean {
  const indexHtml = path.join(distDir, 'index.html')
  if (!existsSync(indexHtml)) return false

  // Read the built shell once at boot. It only changes between deploys, and a
  // deploy restarts the process, so an in-memory copy never goes stale. We must
  // hold the template (not the per-host output) because the served HTML varies by
  // request Host (psychiatry.ink → English shell, psychiatrie.ink → German shell).
  const indexTemplate = readFileSync(indexHtml, 'utf8')

  // Optional prerendered public site. Built by `npm run prerender:public` (part of
  // `npm run build`). Absent in dev / split deploys → we silently fall back to the
  // SPA shell, so the authenticated app is never affected.
  const prerenderDir = path.join(distDir, 'prerendered')
  const manifestPath = path.join(prerenderDir, 'manifest.json')
  let prerenderManifest: Record<string, string> = {}
  if (existsSync(manifestPath)) {
    try {
      prerenderManifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, string>
    } catch (error) {
      console.warn('[client] failed to parse prerender manifest; serving SPA shell only', error)
    }
  }
  const prerenderCache = new Map<string, string | null>()
  function readPrerenderedFile(relFile: string): string | null {
    if (prerenderCache.has(relFile)) return prerenderCache.get(relFile) ?? null
    const abs = path.join(prerenderDir, relFile)
    const value = existsSync(abs) ? readFileSync(abs, 'utf8') : null
    prerenderCache.set(relFile, value)
    return value
  }

  // Content-hashed assets are immutable; everything else (incl. index.html) is
  // revalidated so deploys propagate to clients immediately.
  app.use(
    express.static(distDir, {
      index: false,
      setHeaders: setStaticCacheHeaders,
    }),
  )

  // SPA history fallback + prerendered public-site serving. Any non-API GET/HEAD
  // that did not match a static asset is handled here. `req.hostname` honours
  // X-Forwarded-Host under `trust proxy`, so it is the real public domain behind
  // the Cloud Run load balancer.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api/')) return next()

    // The served response differs per Host for the same URL; never let an
    // intermediary serve one domain's locale/brand to another.
    res.setHeader('Cache-Control', NO_CACHE)
    res.setHeader('Vary', 'X-Forwarded-Host, Host')

    // Map the request host to a known site (localhost/unknown → English default).
    const hostKey = resolveDomainConfig(req.hostname).domain
    const reqPath = normalizeReqPath(req.path)

    // version.json is normally served as a real static file by express.static
    // above (with no-cache headers). Reaching the SPA fallback means the build
    // did not emit it (dev / split deploy / missing build) — return a JSON 404
    // rather than the index.html shell, so a polling client parses JSON (or a
    // clean error) instead of HTML. (Mirrors the /sw.js shadowing pitfall.)
    if (reqPath === '/version.json') {
      res.status(404).type('application/json').send('{"error":"version.json not found"}')
      return
    }

    // Host-aware SEO assets emitted by the prerender step.
    if (reqPath === '/sitemap.xml' || reqPath === '/robots.txt') {
      const asset = readPrerenderedFile(path.posix.join(hostKey, reqPath.slice(1)))
      if (asset !== null) {
        res.type(reqPath.endsWith('.xml') ? 'application/xml' : 'text/plain').send(asset)
        return
      }
    }

    // Prerendered public marketing/legal page for this (host, path).
    const relFile = prerenderManifest[`${hostKey}::${reqPath}`]
    if (relFile) {
      const html = readPrerenderedFile(relFile)
      if (html !== null) {
        res.type('html').send(html)
        return
      }
    }

    // Fallback: client-only SPA shell with per-host <html lang>/<title>/meta
    // rewritten so the first paint matches the domain locale. This is the path
    // the authenticated app always takes — unchanged behavior.
    res.type('html').send(injectMarketingMeta(indexTemplate, req.hostname))
  })

  return true
}
