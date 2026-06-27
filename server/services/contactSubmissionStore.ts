import { createHash } from 'node:crypto'
import type { Request } from 'express'
import { getSupabaseAdmin } from './supabaseAdmin'
import type { ContactCategory } from '../../src/public-site/contactContent'

export type { ContactCategory }

const IP_HASH_SALT = process.env.CONTACT_IP_HASH_SALT?.trim() ?? 'psychiatry-ink-contact'

export function hashClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  let ip: string | undefined
  if (typeof forwarded === 'string' && forwarded.trim()) {
    ip = forwarded.split(',')[0]?.trim()
  } else if (Array.isArray(forwarded) && forwarded[0]) {
    ip = forwarded[0].split(',')[0]?.trim()
  } else {
    ip = req.socket?.remoteAddress
  }
  const raw = ip ?? 'unknown'
  return createHash('sha256').update(`${IP_HASH_SALT}:${raw}`).digest('hex')
}

export async function recordContactSubmissionMeta(params: {
  ipHash: string
  category: ContactCategory
  locale?: string | null
  /** Whether the outbound email was delivered successfully. */
  success: boolean
}): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('public_contact_submissions')
    .insert({
      ip_hash: params.ipHash,
      category: params.category,
      locale: params.locale ?? null,
      success: params.success,
    })

  if (error) {
    console.error('[contact] failed to record submission metadata:', error.message)
  }
}
