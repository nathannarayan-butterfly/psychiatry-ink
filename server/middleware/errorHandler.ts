import type { NextFunction, Request, Response } from 'express'
import { GatewayTimeoutError } from '../utils/httpTimeout'

/** 404 handler for unmatched /api routes (must be registered before SPA fallback). */
export function apiNotFound(req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found', requestId: req.requestId })
}

interface HttpishError {
  status?: number
  statusCode?: number
  message?: unknown
}

function resolveStatus(err: unknown): number {
  if (err instanceof GatewayTimeoutError) return 504
  const candidate = err as HttpishError
  const status = candidate?.status ?? candidate?.statusCode
  if (typeof status === 'number' && status >= 400 && status <= 599) return status
  // CORS rejections from the cors middleware arrive as generic Errors.
  if (err instanceof Error && /not allowed by cors/i.test(err.message)) return 403
  return 500
}

/**
 * Global Express error handler. Returns a sanitized JSON body with the request
 * id — never a stack trace or raw internal message in production. Full error
 * detail is logged server-side, keyed by request id.
 *
 * Must be registered LAST, after all routers, with the 4-arg signature so Express
 * recognizes it as an error handler.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = resolveStatus(err)
  const requestId = req.requestId

  // Log full detail server-side only.
  console.error(`[error] ${req.method} ${req.originalUrl} → ${status} (req ${requestId})`, err)

  if (res.headersSent) {
    // Delegate to Express' default handler to close the broken connection.
    _next(err)
    return
  }

  const isServerError = status >= 500
  const safeMessage =
    status === 504
      ? 'Upstream request timed out'
      : isServerError
        ? 'Internal server error'
        : err instanceof Error && typeof err.message === 'string'
          ? err.message
          : 'Request failed'

  res.status(status).json({ error: safeMessage, requestId })
}
