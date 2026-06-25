import type { Server } from 'node:http'

/**
 * Last-resort process guards. Without these, an unhandled promise rejection or a
 * throw outside the request lifecycle would crash (or silently destabilize) the
 * Node process. We log full detail; an uncaught exception leaves the process in
 * an undefined state, so we exit and let the orchestrator restart a clean one.
 */
export function installProcessGuards(): void {
  process.on('unhandledRejection', (reason) => {
    console.error('[fatal] unhandledRejection:', reason)
  })
  process.on('uncaughtException', (error) => {
    console.error('[fatal] uncaughtException:', error)
    // Best practice: do not keep serving from a corrupted state.
    process.exit(1)
  })
}

/**
 * Drain in-flight requests on SIGTERM/SIGINT, then exit. The Supabase data layer
 * is a stateless HTTPS client (no long-lived pool to drain), so there is nothing
 * to disconnect; a hard timeout forces exit if connections refuse to close
 * (e.g. long-lived sockets).
 */
export function installGracefulShutdown(server: Server): void {
  let shuttingDown = false

  const shutdown = (signal: string): void => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`[api] ${signal} received — shutting down gracefully`)

    const force = setTimeout(() => {
      console.error('[api] graceful shutdown timed out — forcing exit')
      process.exit(1)
    }, Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 10_000))
    force.unref()

    server.close((err) => {
      if (err) console.error('[api] error while closing server:', err)
      clearTimeout(force)
      process.exit(err ? 1 : 0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}
