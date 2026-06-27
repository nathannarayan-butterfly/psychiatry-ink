import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildContactLimiter, buildContactEmailLimiter } from '../config/security'

interface SentMail {
  from?: string
  to?: string
  replyTo?: string
  subject?: string
  text?: string
}

interface TransportConfig {
  host?: string
  port?: number
  secure?: boolean
  requireTLS?: boolean
  auth?: { user?: string; pass?: string }
}

const { sendMail, sentMail, createTransport, transportConfigs } = vi.hoisted(() => {
  const sentMail: SentMail[] = []
  const sendMail = vi.fn(async (options: SentMail) => {
    sentMail.push(options)
    return { messageId: 'test-message-id' }
  })
  const transportConfigs: TransportConfig[] = []
  const createTransport = vi.fn((config: TransportConfig) => {
    transportConfigs.push(config)
    return { sendMail }
  })
  return { sendMail, sentMail, createTransport, transportConfigs }
})

// Mock the SMTP transport so no real network connection is made; the real
// contactEmail service still runs (from/to/replyTo/subject construction).
vi.mock('nodemailer', () => {
  return { default: { createTransport }, createTransport }
})

const insertedRows: Array<{
  ip_hash: string
  category: string
  locale: string | null
  success: boolean
}> = []

const { getSupabaseAdmin } = vi.hoisted(() => {
  function makeBuilder(table: string) {
    const builder = {
      select() {
        return builder
      },
      eq() {
        return builder
      },
      maybeSingle() {
        return Promise.resolve({ data: null, error: null })
      },
      insert(values: { ip_hash: string; category: string; locale: string | null; success: boolean }) {
        if (table === 'public_contact_submissions') {
          insertedRows.push(values)
        }
        return Promise.resolve({ error: null })
      },
    }
    return builder
  }

  return {
    getSupabaseAdmin: () => ({ from: (table: string) => makeBuilder(table) }),
  }
})

vi.mock('../services/supabaseAdmin', () => ({ getSupabaseAdmin }))

let server: Server
let baseUrl: string

const validBody = {
  name: 'Dr. Test',
  email: 'clinician@example.com',
  subject: 'Trial inquiry',
  message: 'I would like information about team pricing.',
  privacyConsent: true,
  locale: 'en',
  website: '',
}

const RATE_LIMIT = 5

beforeAll(async () => {
  process.env.SMTP_HOST = 'smtp-relay.gmail.com'
  process.env.SMTP_PORT = '587'
  process.env.SMTP_USER = 'noreply@psychiatry.ink'
  process.env.SMTP_PASS = 'test-app-password'
  process.env.CONTACT_FROM = 'Psychiatrie.Ink <noreply@psychiatry.ink>'
  process.env.CONTACT_TO = 'hello@psychiatry.ink'
  process.env.PRIVACY_TO = 'data-protection@psychiatry.ink'
  // Keep the functional-test app effectively unthrottled; the rate-limit tests
  // below build their own apps with an explicit low limit.
  process.env.CONTACT_RATE_LIMIT_MAX = '1000'

  const { contactRouter } = await import('./contact')
  const app = express()
  app.use(express.json({ limit: '1mb' }))
  app.use('/api/contact', buildContactLimiter(), buildContactEmailLimiter(), contactRouter)
  server = app.listen(0)
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  sentMail.length = 0
  insertedRows.length = 0
  sendMail.mockClear()
})

async function postContact(body: Record<string, unknown>) {
  return fetch(`${baseUrl}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/contact', () => {
  it('accepts a valid submission and emails CONTACT_TO with reply-to and subject format', async () => {
    const response = await postContact(validBody)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })

    expect(sentMail).toHaveLength(1)
    expect(sentMail[0].to).toBe('hello@psychiatry.ink')
    expect(sentMail[0].from).toBe('Psychiatrie.Ink <noreply@psychiatry.ink>')
    expect(sentMail[0].replyTo).toBe('clinician@example.com')
    expect(sentMail[0].subject).toBe('[Psychiatrie.Ink Kontakt] Allgemein: Trial inquiry')

    expect(insertedRows).toHaveLength(1)
    expect(insertedRows[0].category).toBe('general')
    expect(insertedRows[0].success).toBe(true)

    // Authenticated mode: the transport must be created WITH an auth object
    // built from SMTP_USER/SMTP_PASS, using STARTTLS on 587.
    expect(transportConfigs.length).toBeGreaterThanOrEqual(1)
    const authedConfig = transportConfigs[0]
    expect(authedConfig.host).toBe('smtp-relay.gmail.com')
    expect(authedConfig.port).toBe(587)
    expect(authedConfig.secure).toBe(false)
    expect(authedConfig.requireTLS).toBe(true)
    expect(authedConfig.auth).toEqual({
      user: 'noreply@psychiatry.ink',
      pass: 'test-app-password',
    })
  })

  it('routes the Datenschutz / privacy category to PRIVACY_TO', async () => {
    const response = await postContact({ ...validBody, category: 'privacy', subject: 'DSAR' })
    expect(response.status).toBe(200)
    expect(sentMail[0].to).toBe('data-protection@psychiatry.ink')
    expect(sentMail[0].subject).toBe('[Psychiatrie.Ink Kontakt] Datenschutz: DSAR')
    expect(insertedRows[0].category).toBe('privacy')
    expect(insertedRows[0].success).toBe(true)
  })

  it('rejects missing required fields', async () => {
    const response = await postContact({ email: 'a@b.com', privacyConsent: true })
    expect(response.status).toBe(400)
    expect(sentMail).toHaveLength(0)
  })

  it('rejects submissions without privacy consent', async () => {
    const response = await postContact({ ...validBody, privacyConsent: false })
    expect(response.status).toBe(400)
    expect(sentMail).toHaveLength(0)
  })

  it('rejects the honeypot field when filled', async () => {
    const response = await postContact({ ...validBody, website: 'https://spam.example' })
    expect(response.status).toBe(400)
    expect(sentMail).toHaveLength(0)
  })

  it('rejects messages longer than 5000 characters', async () => {
    const response = await postContact({ ...validBody, message: 'x'.repeat(5001) })
    expect(response.status).toBe(400)
    expect(sentMail).toHaveLength(0)
  })

  it('accepts a message exactly at the 5000-character limit', async () => {
    const response = await postContact({ ...validBody, message: 'x'.repeat(5000) })
    expect(response.status).toBe(200)
    expect(sentMail).toHaveLength(1)
  })

  it('applies IP rate limiting after repeated submissions from one IP', async () => {
    process.env.CONTACT_RATE_LIMIT_MAX = String(RATE_LIMIT)
    const { contactRouter } = await import('./contact')
    const rateApp = express()
    rateApp.use(express.json())
    rateApp.use('/api/contact', buildContactLimiter(), buildContactEmailLimiter(), contactRouter)
    process.env.CONTACT_RATE_LIMIT_MAX = '1000'
    const rateServer = rateApp.listen(0)
    const ratePort = (rateServer.address() as AddressInfo).port
    const rateBase = `http://127.0.0.1:${ratePort}`

    try {
      for (let index = 0; index < RATE_LIMIT; index += 1) {
        // Vary the email so the IP limiter (not the email limiter) is what trips.
        const ok = await fetch(`${rateBase}/api/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...validBody, subject: `Message ${index}`, email: `user${index}@example.com` }),
        })
        expect(ok.status).toBe(200)
      }
      const blocked = await fetch(`${rateBase}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validBody, subject: 'One more', email: 'fresh@example.com' }),
      })
      expect(blocked.status).toBe(429)
    } finally {
      rateServer.close()
    }
  })

  it('applies email rate limiting across different IPs', async () => {
    process.env.CONTACT_RATE_LIMIT_MAX = String(RATE_LIMIT)
    const { contactRouter } = await import('./contact')
    const rateApp = express()
    // Trust exactly one proxy hop so req.ip resolves to the X-Forwarded-For
    // client address (varied below) without tripping the permissive-proxy guard.
    rateApp.set('trust proxy', 1)
    rateApp.use(express.json())
    rateApp.use('/api/contact', buildContactLimiter(), buildContactEmailLimiter(), contactRouter)
    process.env.CONTACT_RATE_LIMIT_MAX = '1000'
    const rateServer = rateApp.listen(0)
    const ratePort = (rateServer.address() as AddressInfo).port
    const rateBase = `http://127.0.0.1:${ratePort}`

    try {
      for (let index = 0; index < RATE_LIMIT; index += 1) {
        // Same email, different client IP each time → only the email limiter trips.
        const ok = await fetch(`${rateBase}/api/contact`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': `203.0.113.${index + 1}`,
          },
          body: JSON.stringify({ ...validBody, subject: `Message ${index}`, email: 'repeat@example.com' }),
        })
        expect(ok.status).toBe(200)
      }
      const blocked = await fetch(`${rateBase}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '203.0.113.250',
        },
        body: JSON.stringify({ ...validBody, subject: 'One more', email: 'repeat@example.com' }),
      })
      expect(blocked.status).toBe(429)
    } finally {
      rateServer.close()
    }
  })
})

describe('POST /api/contact — relay (no-auth) mode', () => {
  let relayServer: Server
  let relayBaseUrl: string
  const savedEnv = {
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_RELAY: process.env.SMTP_RELAY,
    SMTP_AUTH: process.env.SMTP_AUTH,
  }

  beforeAll(async () => {
    // Relay mode: no credentials, authorise by static egress IP. Stale
    // SMTP_USER/SMTP_PASS would normally enable auth, so set both AND the relay
    // flag to prove the flag wins (auth is omitted even when creds are present).
    process.env.SMTP_RELAY = 'true'
    delete process.env.SMTP_AUTH
    process.env.SMTP_USER = 'noreply@psychiatry.ink'
    process.env.SMTP_PASS = 'leftover-should-be-ignored'

    // Fresh module instance so the cached transport is rebuilt under relay env.
    vi.resetModules()
    const { contactRouter } = await import('./contact')
    const app = express()
    app.use(express.json({ limit: '1mb' }))
    app.use('/api/contact', buildContactLimiter(), buildContactEmailLimiter(), contactRouter)
    relayServer = app.listen(0)
    const { port } = relayServer.address() as AddressInfo
    relayBaseUrl = `http://127.0.0.1:${port}`
  })

  afterAll(() => {
    relayServer.close()
    process.env.SMTP_USER = savedEnv.SMTP_USER
    process.env.SMTP_PASS = savedEnv.SMTP_PASS
    if (savedEnv.SMTP_RELAY === undefined) delete process.env.SMTP_RELAY
    else process.env.SMTP_RELAY = savedEnv.SMTP_RELAY
    if (savedEnv.SMTP_AUTH === undefined) delete process.env.SMTP_AUTH
    else process.env.SMTP_AUTH = savedEnv.SMTP_AUTH
    vi.resetModules()
  })

  it('sends without 503 and creates the transport with NO auth object', async () => {
    const before = transportConfigs.length
    const response = await fetch(`${relayBaseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validBody, subject: 'Relay mode' }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(sentMail).toHaveLength(1)
    expect(sentMail[0].to).toBe('hello@psychiatry.ink')

    // A new transport was created for the relay module instance, and it carries
    // NO auth (relay authorises by static egress IP), still over STARTTLS/587.
    expect(transportConfigs.length).toBeGreaterThan(before)
    const relayConfig = transportConfigs[transportConfigs.length - 1]
    expect(relayConfig.host).toBe('smtp-relay.gmail.com')
    expect(relayConfig.port).toBe(587)
    expect(relayConfig.secure).toBe(false)
    expect(relayConfig.requireTLS).toBe(true)
    expect(relayConfig.auth).toBeUndefined()
  })
})
