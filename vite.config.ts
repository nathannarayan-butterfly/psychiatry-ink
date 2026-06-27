import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {
  describeKeyForLog,
  describeUrlForLog,
  isPlaceholderKey,
  isPlaceholderUrl,
} from './shared/supabaseEnv'
import { buildAppConfigScript, resolvePublicSupabaseConfig } from './shared/appConfig'

// VITE_SUPABASE_PUBLISHABLE_KEY is accepted as an alias for VITE_SUPABASE_ANON_KEY.
const SUPABASE_ENV_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
] as const

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  const vars: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    vars[key] = value
  }
  return vars
}

function effectiveSource(
  localVal: string | undefined,
  baseVal: string | undefined,
): '.env.local' | '.env' | '(nicht gesetzt)' {
  if (localVal) return '.env.local'
  if (baseVal) return '.env'
  return '(nicht gesetzt)'
}

function supabaseEnvCheck(): Plugin {
  return {
    name: 'supabase-env-check',
    config() {
      const root = process.cwd()
      const envPath = resolve(root, '.env')
      const localPath = resolve(root, '.env.local')
      const hasEnv = existsSync(envPath)
      const hasLocal = existsSync(localPath)
      const env = parseEnvFile(envPath)
      const local = parseEnvFile(localPath)

      const lines: string[] = []
      const conflicts: string[] = []

      for (const key of SUPABASE_ENV_KEYS) {
        const base = env[key]
        const over = local[key]
        if (base && over && base !== over) {
          conflicts.push(key)
        }
      }

      const effectiveUrl = local.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL
      // Accept VITE_SUPABASE_ANON_KEY (canonical) or VITE_SUPABASE_PUBLISHABLE_KEY (alias).
      const effectiveKey =
        local.VITE_SUPABASE_ANON_KEY ??
        local.VITE_SUPABASE_PUBLISHABLE_KEY ??
        env.VITE_SUPABASE_ANON_KEY ??
        env.VITE_SUPABASE_PUBLISHABLE_KEY
      const urlSource = effectiveSource(local.VITE_SUPABASE_URL, env.VITE_SUPABASE_URL)
      const keySource = effectiveSource(
        local.VITE_SUPABASE_ANON_KEY ?? local.VITE_SUPABASE_PUBLISHABLE_KEY,
        env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY,
      )

      lines.push('[supabase-env] Vite lädt .env.local mit Vorrang vor .env (.env.example wird nie gelesen):')
      lines.push(`  Dateien: .env=${hasEnv ? 'ja' : 'nein'}  .env.local=${hasLocal ? 'ja' : 'nein'}`)
      lines.push(`  URL (.env):        ${describeUrlForLog(env.VITE_SUPABASE_URL)}`)
      lines.push(`  URL (.env.local):  ${describeUrlForLog(local.VITE_SUPABASE_URL)}`)
      lines.push(`  Key (.env):        ${describeKeyForLog(env.VITE_SUPABASE_ANON_KEY)}`)
      lines.push(`  Key (.env.local):  ${describeKeyForLog(local.VITE_SUPABASE_ANON_KEY)}`)
      lines.push(`  → Effektiv URL:    ${describeUrlForLog(effectiveUrl)} (Quelle: ${urlSource})`)
      lines.push(`  → Effektiv Key:    ${describeKeyForLog(effectiveKey)} (Quelle: ${keySource})`)

      if (conflicts.length > 0) {
        lines.push(
          `  ⚠ Konflikt bei: ${conflicts.join(', ')} — .env.local gewinnt. Gleiche Werte in beiden Dateien oder nur .env.local pflegen.`,
        )
      }

      if (effectiveUrl && isPlaceholderUrl(effectiveUrl)) {
        lines.push(
          '  ⚠ Effektive URL ist ein Platzhalter — Login schlägt fehl, bis .env.local die echte Projekt-URL enthält.',
        )
      }
      if (effectiveKey && isPlaceholderKey(effectiveKey)) {
        lines.push(
          '  ⚠ Effektiver Key ist ein Platzhalter — VITE_SUPABASE_ANON_KEY in .env.local setzen.',
        )
      }

      console.log(lines.join('\n'))
    },
  }
}

/**
 * Dev-server equivalent of the production `/app-config.js` route. `vite dev`
 * serves index.html itself (Express is not in the loop), so without this the
 * `<script src="/app-config.js">` tag would 404 in dev. Serving it from the
 * loaded `.env(.local)` keeps `window.__APP_CONFIG__` populated locally and
 * exercises the exact same runtime-config path the production client takes.
 */
function appConfigDevPlugin(): Plugin {
  return {
    name: 'psyink-app-config-dev',
    configureServer(server) {
      server.middlewares.use('/app-config.js', (_req, res) => {
        // Prefix '' loads every var (incl. server-only names) — we only read the
        // public ones, and secret keys are dropped by resolvePublicSupabaseConfig.
        const env = loadEnv(server.config.mode, process.cwd(), '')
        const { supabaseUrl, supabaseAnonKey, warnings } = resolvePublicSupabaseConfig(env)
        for (const warning of warnings) {
          server.config.logger.warn(`[app-config] ${warning}`)
        }
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        res.end(buildAppConfigScript({ supabaseUrl, supabaseAnonKey }))
      })
    },
  }
}

/**
 * Compute ONE build id used both as the in-bundle constant and the static
 * `version.json` payload, so the running app's "loaded build id" always matches
 * what a fresh deploy publishes. Prefer the git short sha (stable, ties the
 * served bundle to a commit); fall back to a timestamp when git is unavailable
 * in the build context (e.g. a source tarball deploy).
 */
function resolveBuildId(): string {
  try {
    const sha = execSync('git rev-parse --short=12 HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
    if (sha) return sha
  } catch {
    // git not available in this build context — fall through to a timestamp.
  }
  return `ts-${Date.now().toString(36)}`
}

/**
 * Version stamp: emit the SAME build id two ways that must stay in sync —
 *  (a) `__APP_BUILD_ID__` replaced into the JS bundle via `define` (the app's
 *      "loaded build id"), and
 *  (b) a static `/version.json` ({ "buildId": "…" }) at the served web root that
 *      long-lived tabs poll to detect a newer deploy.
 * One `buildId` is computed per build/dev start and used for both, guaranteeing
 * the embedded constant equals the published JSON for a given deploy.
 */
function versionStampPlugin(): Plugin {
  const buildId = resolveBuildId()
  return {
    name: 'psyink-version-stamp',
    config() {
      return {
        define: {
          __APP_BUILD_ID__: JSON.stringify(buildId),
        },
      }
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: `${JSON.stringify({ buildId })}\n`,
      })
    },
  }
}

export default defineConfig({
  plugins: [supabaseEnvCheck(), appConfigDevPlugin(), versionStampPlugin(), react(), tailwindcss()],
  optimizeDeps: {
    // mammoth is CJS-only and only loaded for DOCX import; pre-bundle at dev
    // startup so the first import does not race on-demand optimization.
    include: ['mammoth'],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    // Allow marketing-domain hosts when testing via /etc/hosts (see .env.example).
    allowedHosts: [
      'localhost',
      'psychiatry.ink',
      'psychiatrie.ink',
      'fr.psychiatrie.ink',
      'psiquiatria.ink',
      'app.psychiatry.ink',
    ],
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
})
