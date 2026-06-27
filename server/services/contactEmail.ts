/**
 * Outbound email for the public contact form via Google Workspace SMTP relay
 * (STARTTLS on smtp-relay.gmail.com:587) using nodemailer.
 *
 * All SMTP configuration is read from SERVER env vars only and is never exposed
 * to the browser bundle. Credentials may be injected at runtime from Google
 * Cloud Secret Manager (see .env.example for the gcloud wiring).
 */

import nodemailer, { type Transporter } from 'nodemailer'

export interface ContactEmailPayload {
  to: string
  replyTo: string
  subject: string
  text: string
}

const DEFAULT_SMTP_HOST = 'smtp-relay.gmail.com'
const DEFAULT_SMTP_PORT = 587

function env(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

function resolveSmtpHost(): string {
  return env('SMTP_HOST') ?? DEFAULT_SMTP_HOST
}

function resolveSmtpPort(): number {
  const parsed = Number(env('SMTP_PORT'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SMTP_PORT
}

/**
 * The relay needs at minimum a reachable host. When the workspace relay is
 * configured to authenticate (the common Workspace setup), SMTP_USER/SMTP_PASS
 * must both be present. We treat the form as configured only when we have a
 * host plus a complete credential pair, mirroring the prior "fail with 503 when
 * not configured" behaviour.
 */
export function isContactEmailConfigured(): boolean {
  return Boolean(resolveSmtpHost() && env('SMTP_USER') && env('SMTP_PASS'))
}

export function resolveContactFromAddress(): string {
  return env('CONTACT_FROM') ?? env('SMTP_USER') ?? 'Psychiatrie.Ink <noreply@psychiatry.ink>'
}

let cachedTransport: Transporter | null = null

function getTransport(): Transporter {
  if (cachedTransport) return cachedTransport

  const user = env('SMTP_USER')
  const pass = env('SMTP_PASS')

  cachedTransport = nodemailer.createTransport({
    host: resolveSmtpHost(),
    port: resolveSmtpPort(),
    // STARTTLS: connect plaintext on 587 then upgrade. Never allow an
    // unencrypted fallback for credentialed relay traffic.
    secure: false,
    requireTLS: true,
    auth: user && pass ? { user, pass } : undefined,
  })

  return cachedTransport
}

export async function sendContactEmail(payload: ContactEmailPayload): Promise<void> {
  if (!isContactEmailConfigured()) {
    throw new Error('SMTP relay is not configured')
  }

  await getTransport().sendMail({
    from: resolveContactFromAddress(),
    to: payload.to,
    replyTo: payload.replyTo,
    subject: payload.subject,
    text: payload.text,
  })
}
