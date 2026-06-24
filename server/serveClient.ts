import { existsSync } from 'node:fs'
import path from 'node:path'
import express, { type Express } from 'express'

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
export function configureClientServing(app: Express, distDir: string): boolean {
  const indexHtml = path.join(distDir, 'index.html')
  if (!existsSync(indexHtml)) return false

  // Hashed asset filenames are safe to cache aggressively; index.html is not.
  app.use(
    express.static(distDir, {
      index: false,
      maxAge: '1h',
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache')
        }
      },
    }),
  )

  // SPA history fallback: any non-API GET/HEAD that did not match a static asset
  // returns index.html so client-side routing can take over.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(indexHtml)
  })

  return true
}
