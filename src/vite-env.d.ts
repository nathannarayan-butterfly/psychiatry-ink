/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL — from .env / .env.local (.env.local wins). */
  readonly VITE_SUPABASE_URL?: string
  /** Browser anon key (eyJ…) or publishable key (sb_publishable_…) — never service_role. */
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
