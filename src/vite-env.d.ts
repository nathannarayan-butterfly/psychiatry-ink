/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL — from .env / .env.local (.env.local wins). */
  readonly VITE_SUPABASE_URL?: string
  /** Browser anon key (eyJ…) or publishable key (sb_publishable_…) — never service_role. */
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_API_BASE_URL?: string
  /**
   * Client-side Knowledge Base admin allowlist (comma/space-separated user ids or
   * emails). UX hint only — surfaces the KB review console. Authoritative
   * enforcement is server-side via `KB_ADMIN_USER_IDS`.
   */
  readonly VITE_KB_ADMIN_USER_IDS?: string
  /** @deprecated Legacy alias for `VITE_KB_ADMIN_USER_IDS`; still read as a fallback. */
  readonly VITE_SYSTEM_ADMIN_USER_IDS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * Build-time constant injected by the `psyink-version-stamp` Vite plugin
 * (see `vite.config.ts`). It is replaced via Vite `define` with the same build
 * id written to the static `/version.json`, so the running bundle can compare
 * its own build id against the deployed one.
 */
declare const __APP_BUILD_ID__: string
