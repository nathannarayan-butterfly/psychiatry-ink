/**
 * Bounded outbound HTTP helpers.
 *
 * Every server-initiated call to an external provider (LLM, transcription, WHO
 * ICD, Stripe, Supabase admin) must be bounded in time so a hung upstream can
 * never pin a request handler indefinitely. `fetchWithTimeout` wraps the global
 * `fetch` with an `AbortSignal.timeout`, and `withRetry` adds exactly one bounded
 * retry for *idempotent* calls (read-only / safely repeatable JSON requests).
 *
 * On timeout a {@link GatewayTimeoutError} is thrown; the global Express error
 * handler maps it to HTTP 504.
 */

/** Default per-call timeout for outbound provider requests. */
export const DEFAULT_OUTBOUND_TIMEOUT_MS = Number(
  process.env.OUTBOUND_HTTP_TIMEOUT_MS ?? 45_000,
)

/** Thrown when an outbound call exceeds its time budget. Maps to HTTP 504. */
export class GatewayTimeoutError extends Error {
  readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'GatewayTimeoutError'
    this.cause = cause
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  )
}

export interface TimeoutFetchOptions extends RequestInit {
  /** Time budget in milliseconds before the request is aborted. */
  timeoutMs?: number
  /** Human label used in the timeout error message. */
  label?: string
}

/**
 * `fetch` with a hard timeout. Combines any caller-supplied `signal` with an
 * `AbortSignal.timeout`, so both an external cancel and the deadline abort the
 * request. Throws {@link GatewayTimeoutError} on deadline.
 */
export async function fetchWithTimeout(
  url: string,
  options: TimeoutFetchOptions = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_OUTBOUND_TIMEOUT_MS, label, signal, ...init } = options
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

  try {
    return await fetch(url, { ...init, signal: combined })
  } catch (error) {
    if (timeoutSignal.aborted || isAbortError(error)) {
      throw new GatewayTimeoutError(
        `${label ?? 'Outbound request'} timed out after ${timeoutMs}ms`,
        error,
      )
    }
    throw error
  }
}

/**
 * Run `fn` and retry it ONCE on a transient failure (timeout, network error, or
 * a 5xx-style retryable error the caller opts into). Use ONLY for idempotent
 * operations. Non-retryable errors propagate immediately.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; shouldRetry?: (error: unknown) => boolean; delayMs?: number } = {},
): Promise<T> {
  const retries = options.retries ?? 1
  const shouldRetry =
    options.shouldRetry ??
    ((error: unknown) => error instanceof GatewayTimeoutError || isAbortError(error))
  const delayMs = options.delayMs ?? 300

  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === retries || !shouldRetry(error)) break
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  throw lastError
}
