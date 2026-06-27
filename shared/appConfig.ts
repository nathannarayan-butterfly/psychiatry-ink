/**
 * Runtime public app config (browser bootstrap).
 *
 * WHY this exists: Vite INLINES `VITE_*` vars at BUILD time. If a build/deploy
 * doesn't pass the `VITE_SUPABASE_*` build args, the shipped client bundle boots
 * with an unconfigured Supabase client ("Supabase ist nicht konfiguriert"). To
 * make the deploy pipeline robust, the server emits the PUBLIC config at RUNTIME
 * as `/app-config.js` (read from the Cloud Run runtime env), and the client reads
 * `window.__APP_CONFIG__` first, falling back to the build-time `VITE_*` values.
 *
 * ONLY public values belong here: the Supabase project URL and the anon /
 * publishable key. Secret keys (`sb_secret_…`, service_role JWT) MUST NEVER be
 * exposed — `resolvePublicSupabaseConfig` actively refuses to emit them.
 *
 * Shared between `server/serveClient.ts` (prod route) and `vite.config.ts`
 * (dev middleware) so there is a single source of truth for the bootstrap shape.
 */
import { classifySupabaseKey } from './supabaseEnv'

export interface PublicAppConfig {
  supabaseUrl: string
  supabaseAnonKey: string
}

export interface ResolvedAppConfig extends PublicAppConfig {
  /** Non-fatal problems the caller should log server-side (never sent to the browser). */
  warnings: string[]
}

/**
 * Resolve the PUBLIC Supabase config from a process-env-like object.
 *
 * Precedence mirrors the rest of the codebase: the `VITE_*` names win (so a
 * service that still sets them keeps working), then the server-side
 * `SUPABASE_*` names. The key accepts the publishable alias too.
 *
 * Hard safety guard: if the resolved key classifies as a SECRET (`sb_secret_…`)
 * or a service_role JWT, it is dropped (emitted as an empty string) and a
 * warning is recorded — a secret must never reach the browser.
 */
export function resolvePublicSupabaseConfig(
  env: Record<string, string | undefined>,
): ResolvedAppConfig {
  const warnings: string[] = []

  const supabaseUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').trim()

  const rawKey = (
    env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim()

  let supabaseAnonKey = rawKey
  const kind = classifySupabaseKey(rawKey)
  if (kind === 'secret' || kind === 'jwt_service_role') {
    warnings.push(
      `Refusing to expose a ${kind} Supabase key via /app-config.js — only the public anon/publishable key may be sent to the browser. ` +
        'Set SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY to the anon (eyJ…) or publishable (sb_publishable_…) key.',
    )
    supabaseAnonKey = ''
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    warnings.push(
      'Public Supabase config is incomplete server-side (supabaseUrl/anonKey empty); the client will degrade to its ' +
        '"Supabase ist nicht konfiguriert" error until SUPABASE_URL + SUPABASE_ANON_KEY (or the VITE_* equivalents) are set on the service.',
    )
  }

  return { supabaseUrl, supabaseAnonKey, warnings }
}

/**
 * Serialise the public config as a tiny classic script that sets
 * `window.__APP_CONFIG__`. Values are JSON-encoded with `<`/`>` and the JS line
 * separators escaped so the body is injection-safe regardless of context.
 *
 * Served as an EXTERNAL same-origin file (`/app-config.js`), so it satisfies a
 * strict `script-src 'self'` CSP with no nonce/`unsafe-inline` required.
 */
export function buildAppConfigScript(config: PublicAppConfig): string {
  const json = JSON.stringify({
    supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey,
  })
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
  return `window.__APP_CONFIG__ = ${json};\n`
}
