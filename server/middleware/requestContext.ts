import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

declare module 'express-serve-static-core' {
  interface Request {
    /** Correlation id for this request, surfaced in error responses + logs. */
    requestId?: string
  }
}

/**
 * Assign a correlation id to every request. Honors an inbound `X-Request-Id`
 * (trusted reverse proxies / load balancers) and echoes it back on the response
 * so clients and logs can be correlated.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.headers['x-request-id']
  const id = typeof inbound === 'string' && inbound.trim() ? inbound.trim().slice(0, 200) : randomUUID()
  req.requestId = id
  res.setHeader('X-Request-Id', id)
  next()
}
