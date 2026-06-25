import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {
  describeKeyForLog,
  describeUrlForLog,
  isPlaceholderKey,
  isPlaceholderUrl,
} from './shared/supabaseEnv'

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

export default defineConfig({
  plugins: [supabaseEnvCheck(), react(), tailwindcss()],
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
