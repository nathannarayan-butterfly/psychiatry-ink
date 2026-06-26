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
  readonly VITE_SYSTEM_ADMIN_USER_IDS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
