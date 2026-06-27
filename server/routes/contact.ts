import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { CONTACT } from '../../src/public-site/legalContent'
import { CONTACT_CATEGORY_ENUM, type ContactCategory } from '../../src/public-site/contactContent'
import { isContactEmailConfigured, sendContactEmail } from '../services/contactEmail'
import { hashClientIp, recordContactSubmissionMeta } from '../services/contactSubmissionStore'

export const contactRouter = Router()

/** Server-enforced ceiling on the free-text message body. */
const MAX_MESSAGE_LENGTH = 5000

/** Full descriptive labels used in the plaintext email body. */
const CATEGORY_LABELS: Record<ContactCategory, string> = {
  general: 'Allgemeine Anfrage / General inquiry',
  support: 'Support',
  billing: 'Abrechnung / Billing',
  privacy: 'Datenschutz / Privacy',
  technical: 'Technisches Problem / Technical issue',
}

/** Short labels used inside the email subject line. */
const SUBJECT_CATEGORY_LABELS: Record<ContactCategory, string> = {
  general: 'Allgemein',
  support: 'Support',
  billing: 'Abrechnung',
  privacy: 'Datenschutz',
  technical: 'Technik',
}

const contactBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  subject: z.string().trim().min(1).max(300),
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  organisation: z.string().trim().max(300).optional(),
  category: z.enum(CONTACT_CATEGORY_ENUM).optional(),
  privacyConsent: z.literal(true),
  locale: z.enum(['en', 'de']).optional(),
  /** Honeypot — must be empty for legitimate submissions. */
  website: z.string().max(0).optional(),
})

function resolveRecipient(category: ContactCategory): string {
  if (category === 'privacy') {
    return process.env.PRIVACY_TO?.trim() || CONTACT.privacyEmail
  }
  return process.env.CONTACT_TO?.trim() || CONTACT.generalEmail
}

function buildSubject(category: ContactCategory, subject: string): string {
  return `[Psychiatrie.Ink Kontakt] ${SUBJECT_CATEGORY_LABELS[category]}: ${subject}`
}

function buildEmailText(params: {
  name: string
  email: string
  subject: string
  message: string
  organisation?: string
  category: ContactCategory
  locale?: string
}): string {
  const lines = [
    'New contact form submission',
    '===========================',
    `Name: ${params.name}`,
    `Email: ${params.email}`,
  ]
  if (params.organisation) lines.push(`Organisation: ${params.organisation}`)
  lines.push(`Category: ${CATEGORY_LABELS[params.category]}`)
  if (params.locale) lines.push(`Locale: ${params.locale}`)
  lines.push('', `Subject: ${params.subject}`, '', params.message)
  return lines.join('\n')
}

contactRouter.post('/', async (req: Request, res: Response) => {
  const parsed = contactBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid form data', details: parsed.error.flatten().fieldErrors })
    return
  }

  const body = parsed.data

  // Honeypot: a filled `website` field signals a bot. Reject silently as a 400.
  if (body.website && body.website.length > 0) {
    res.status(400).json({ error: 'Invalid form data' })
    return
  }

  if (!isContactEmailConfigured()) {
    console.warn('[contact] SMTP relay is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing)')
    res.status(503).json({ error: 'Contact form is temporarily unavailable. Please email us directly.' })
    return
  }

  const category = body.category ?? 'general'
  const ipHash = hashClientIp(req)

  try {
    await sendContactEmail({
      to: resolveRecipient(category),
      replyTo: body.email,
      subject: buildSubject(category, body.subject),
      text: buildEmailText({
        name: body.name,
        email: body.email,
        subject: body.subject,
        message: body.message,
        organisation: body.organisation,
        category,
        locale: body.locale,
      }),
    })

    // Metadata only — no PII or message body is ever persisted or logged.
    await recordContactSubmissionMeta({ ipHash, category, locale: body.locale, success: true })

    res.json({ ok: true })
  } catch (error) {
    console.error('[contact] submission failed:', error instanceof Error ? error.message : 'unknown error')
    await recordContactSubmissionMeta({ ipHash, category, locale: body.locale, success: false })
    res.status(500).json({ error: 'Failed to send message. Please try again or email us directly.' })
  }
})
