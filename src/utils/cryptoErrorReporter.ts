/**
 * Structured error reporter for crypto / persistence failures.
 *
 * Production clinical platform: every silent crypto-path failure that does
 * NOT abort the user's save (e.g. a local-cache write fails AFTER the server
 * succeeded) must still leave an auditable trail. There is no Sentry-like
 * SDK wired in yet, so this module:
 *
 *  1. Logs to the browser console with a recognisable `[crypto-error]` tag so
 *     ops can grep production tabs / replay user devices.
 *  2. Buffers the last N entries in-memory so the diagnostic console snippet
 *     and the upcoming Settings → Datenschutz "report crypto issue" surface
 *     can read them without having to scrape `console`.
 *  3. Fans out to any registered listener — when a real telemetry sink is
 *     wired up, only this file needs to learn about it.
 *
 * The reporter NEVER touches PHI: payloads are restricted to the structured
 * `{ scope, code, message }` shape below.
 */

export type CryptoErrorScope =
  | 'workspace-vault-save'
  | 'workspace-vault-load'
  | 'workspace-snapshot-push'
  | 'patient-metadata-save'
  | 'case-registry-write'
  | 'idb-bootstrap'
  | 'identifier-backup'
  | 'passphrase-unlock'
  | 'org-vault-save'
  | 'unknown'

export interface CryptoErrorEntry {
  /** Domain-area where the failure happened — used for grouping. */
  scope: CryptoErrorScope
  /** Machine-readable failure code (e.g. `idb-write-failed`, `http-503`). */
  code: string
  /** Human-readable, PHI-free message. */
  message: string
  /** Optional structured context — PHI MUST NOT appear here. */
  context?: Record<string, string | number | boolean | null | undefined>
  /** ISO timestamp when the entry was recorded. */
  recordedAt: string
}

const MAX_BUFFER = 50
const buffer: CryptoErrorEntry[] = []

type Listener = (entry: CryptoErrorEntry) => void
const listeners = new Set<Listener>()

function safeMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && typeof error.message === 'string') {
    return error.message
  }
  if (typeof error === 'string') return error
  return fallback
}

/** Record a structured crypto-path error (console + in-memory buffer + listeners). */
export function reportCryptoError(input: {
  scope: CryptoErrorScope
  code: string
  message?: string
  error?: unknown
  context?: Record<string, string | number | boolean | null | undefined>
}): CryptoErrorEntry {
  const entry: CryptoErrorEntry = {
    scope: input.scope,
    code: input.code,
    message: input.message ?? safeMessage(input.error, input.code),
    context: input.context,
    recordedAt: new Date().toISOString(),
  }

  buffer.push(entry)
  while (buffer.length > MAX_BUFFER) buffer.shift()

  try {
    console.warn(`[crypto-error] ${entry.scope}: ${entry.code} — ${entry.message}`, entry.context)
  } catch {
    // ignore console failures in headless test environments
  }

  for (const listener of listeners) {
    try {
      listener(entry)
    } catch {
      // listener failures must never poison the reporter
    }
  }

  return entry
}

export function getRecentCryptoErrors(): readonly CryptoErrorEntry[] {
  return buffer.slice()
}

export function clearCryptoErrorBuffer(): void {
  buffer.length = 0
}

export function subscribeToCryptoErrors(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
