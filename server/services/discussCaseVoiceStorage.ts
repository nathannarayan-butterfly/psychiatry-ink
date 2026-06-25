import { randomUUID } from 'node:crypto'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'

export const DC_VOICE_BUCKET = 'dc-voice-messages'
export const DC_VOICE_MAX_BYTES = 10 * 1024 * 1024
export const DC_VOICE_MAX_DURATION_MS = 5 * 60 * 1000

const ALLOWED_MIME_TYPES = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
])

export interface DiscussVoiceAttachmentMeta {
  storagePath: string
  mimeType: string
  durationMs: number
  sizeBytes: number
  /** ISO8601 — auto-purged after DISCUSS_CASE_VOICE_RETENTION_DAYS (default 90). */
  expiresAt: string
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('mpeg')) return 'mp3'
  return 'webm'
}

export function normalizeVoiceMimeType(mimeType: string): string {
  const trimmed = mimeType.trim().toLowerCase()
  if (ALLOWED_MIME_TYPES.has(trimmed)) return trimmed
  if (trimmed.startsWith('audio/webm')) return 'audio/webm'
  throw new Error('Unsupported audio format')
}

export function voiceStoragePath(discussionId: string, messageId: string, mimeType: string): string {
  return `${discussionId}/${messageId}.${extensionForMime(mimeType)}`
}

export async function uploadDiscussVoiceMessage(input: {
  discussionId: string
  messageId: string
  buffer: Buffer
  mimeType: string
}): Promise<DiscussVoiceAttachmentMeta> {
  if (input.buffer.byteLength === 0) throw new Error('Empty audio')
  if (input.buffer.byteLength > DC_VOICE_MAX_BYTES) {
    throw new Error('Voice message too large')
  }

  const mimeType = normalizeVoiceMimeType(input.mimeType)
  const storagePath = voiceStoragePath(input.discussionId, input.messageId, mimeType)
  const supabase = getKbSupabaseAdmin()

  const { error } = await supabase.storage.from(DC_VOICE_BUCKET).upload(storagePath, input.buffer, {
    contentType: mimeType,
    upsert: false,
  })
  if (error) throw error

  return {
    storagePath,
    mimeType,
    durationMs: 0,
    sizeBytes: input.buffer.byteLength,
    expiresAt: '',
  }
}

export async function downloadDiscussVoiceMessage(
  storagePath: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const supabase = getKbSupabaseAdmin()
  const { data, error } = await supabase.storage.from(DC_VOICE_BUCKET).download(storagePath)
  if (error || !data) throw error ?? new Error('Voice attachment not found')

  const arrayBuffer = await data.arrayBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: data.type || 'audio/webm',
  }
}

export async function deleteDiscussVoiceMessage(storagePath: string): Promise<void> {
  const supabase = getKbSupabaseAdmin()
  const { error } = await supabase.storage.from(DC_VOICE_BUCKET).remove([storagePath])
  if (error) throw error
}

export function newVoiceMessageId(): string {
  return randomUUID()
}
