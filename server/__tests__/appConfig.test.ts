import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { registerAppConfigRoute } from '../serveClient'
import {
  buildAppConfigScript,
  resolvePublicSupabaseConfig,
} from '../../shared/appConfig'

describe('resolvePublicSupabaseConfig', () => {
  it('reads server-side SUPABASE_URL / SUPABASE_ANON_KEY', () => {
    const r = resolvePublicSupabaseConfig({
      SUPABASE_URL: 'https://dxngbuinxutzirowbjgb.supabase.co',
      SUPABASE_ANON_KEY: 'sb_publishable_abc123',
    })
    expect(r.supabaseUrl).toBe('https://dxngbuinxutzirowbjgb.supabase.co')
    expect(r.supabaseAnonKey).toBe('sb_publishable_abc123')
    expect(r.warnings).toHaveLength(0)
  })

  it('prefers VITE_* names over the server-side names', () => {
    const r = resolvePublicSupabaseConfig({
      VITE_SUPABASE_URL: 'https://vite.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_vite',
      SUPABASE_URL: 'https://server.supabase.co',
      SUPABASE_ANON_KEY: 'sb_publishable_server',
    })
    expect(r.supabaseUrl).toBe('https://vite.supabase.co')
    expect(r.supabaseAnonKey).toBe('sb_publishable_vite')
  })

  it('accepts the publishable alias for the key', () => {
    const r = resolvePublicSupabaseConfig({
      SUPABASE_URL: 'https://x.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_alias',
    })
    expect(r.supabaseAnonKey).toBe('sb_publishable_alias')
  })

  it('NEVER exposes a sb_secret_ key — drops it and warns', () => {
    const r = resolvePublicSupabaseConfig({
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_ANON_KEY: 'sb_secret_GfTZoBdDJsDm7Vp1jledrg',
    })
    expect(r.supabaseAnonKey).toBe('')
    expect(r.warnings.join(' ')).toMatch(/secret/i)
  })

  it('NEVER exposes a service_role JWT — drops it and warns', () => {
    // JWT with payload {"role":"service_role"} (header.payload.signature, unsigned ok for classify).
    const header = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')
    const payload = Buffer.from('{"role":"service_role"}').toString('base64url')
    const serviceRoleJwt = `${header}.${payload}.sig`
    const r = resolvePublicSupabaseConfig({
      SUPABASE_URL: 'https://x.supabase.co',
      SUPABASE_ANON_KEY: serviceRoleJwt,
    })
    expect(r.supabaseAnonKey).toBe('')
    expect(r.warnings.join(' ')).toMatch(/service_role/i)
  })

  it('warns (and degrades to empty) when config is missing entirely', () => {
    const r = resolvePublicSupabaseConfig({})
    expect(r.supabaseUrl).toBe('')
    expect(r.supabaseAnonKey).toBe('')
    expect(r.warnings.join(' ')).toMatch(/incomplete/i)
  })
})

describe('buildAppConfigScript', () => {
  it('sets window.__APP_CONFIG__ with the public values', () => {
    const js = buildAppConfigScript({
      supabaseUrl: 'https://x.supabase.co',
      supabaseAnonKey: 'sb_publishable_abc',
    })
    expect(js).toContain('window.__APP_CONFIG__ =')
    expect(js).toContain('https://x.supabase.co')
    expect(js).toContain('sb_publishable_abc')
    // Must be valid, evaluatable JS.
    const win: { __APP_CONFIG__?: { supabaseUrl?: string; supabaseAnonKey?: string } } = {}
    new Function('window', js)(win)
    expect(win.__APP_CONFIG__?.supabaseUrl).toBe('https://x.supabase.co')
    expect(win.__APP_CONFIG__?.supabaseAnonKey).toBe('sb_publishable_abc')
  })

  it('escapes characters that could break out of a script context', () => {
    const js = buildAppConfigScript({
      supabaseUrl: 'https://x.supabase.co/</script><script>alert(1)',
      supabaseAnonKey: '',
    })
    expect(js).not.toContain('</script>')
    expect(js).toContain('\\u003c')
  })
})

describe('GET /app-config.js (route)', () => {
  let server: Server
  let baseUrl: string
  const saved = { ...process.env }

  beforeAll(() => {
    const app = express()
    registerAppConfigRoute(app)
    server = app.listen(0)
    const { port } = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${port}`
  })

  afterAll(() => {
    server.close()
  })

  afterEach(() => {
    process.env = { ...saved }
  })

  it('serves JS with no-cache headers, the URL, and window.__APP_CONFIG__', async () => {
    process.env.SUPABASE_URL = 'https://dxngbuinxutzirowbjgb.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'sb_publishable_jl_kcau9'
    delete process.env.VITE_SUPABASE_URL
    delete process.env.VITE_SUPABASE_ANON_KEY
    delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY

    const res = await fetch(`${baseUrl}/app-config.js`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/javascript/)
    expect(res.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate')

    const body = await res.text()
    expect(body).toContain('window.__APP_CONFIG__')
    expect(body).toContain('https://dxngbuinxutzirowbjgb.supabase.co')
    expect(body).toContain('sb_publishable_jl_kcau9')
  })

  it('does NOT leak any secret env var into the served body', async () => {
    process.env.SUPABASE_URL = 'https://dxngbuinxutzirowbjgb.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'sb_publishable_jl_kcau9'
    // Secrets that must never appear in the public config script.
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_super_secret_value'
    process.env.OPENAI_API_KEY = 'sk-proj-leak-me-not'
    process.env.STRIPE_SECRET_KEY = 'sk_test_stripe_secret_leak'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_leak'

    const res = await fetch(`${baseUrl}/app-config.js`)
    const body = await res.text()

    expect(body).not.toContain('sb_secret_super_secret_value')
    expect(body).not.toContain('sk-proj-leak-me-not')
    expect(body).not.toContain('sk_test_stripe_secret_leak')
    expect(body).not.toContain('whsec_leak')
    expect(body).not.toContain('SERVICE_ROLE')
  })

  it('degrades to empty config (not an error) when env is missing', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
    delete process.env.VITE_SUPABASE_URL
    delete process.env.VITE_SUPABASE_ANON_KEY
    delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY

    const res = await fetch(`${baseUrl}/app-config.js`)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain('window.__APP_CONFIG__')
    expect(body).toContain('"supabaseUrl":""')
    expect(body).toContain('"supabaseAnonKey":""')
  })

  it('refuses to serve a secret key even if mistakenly set as the anon key', async () => {
    process.env.SUPABASE_URL = 'https://dxngbuinxutzirowbjgb.supabase.co'
    process.env.SUPABASE_ANON_KEY = 'sb_secret_misconfigured_in_anon_slot'
    delete process.env.VITE_SUPABASE_ANON_KEY
    delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY

    const res = await fetch(`${baseUrl}/app-config.js`)
    const body = await res.text()
    expect(body).not.toContain('sb_secret_misconfigured_in_anon_slot')
    expect(body).toContain('"supabaseAnonKey":""')
  })
})
