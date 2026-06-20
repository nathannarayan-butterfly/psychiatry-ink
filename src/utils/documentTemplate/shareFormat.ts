import type { DocumentTemplate, TemplateCategory } from '../../types/documentTemplate'
import {
  TEMPLATE_SHARE_FORMAT_VERSION,
  TEMPLATE_SHARE_MAGIC_LINE,
  TemplateSharePayloadSchema,
  type TemplateShareCreator,
  type TemplateSharePayload,
} from '../../schemas/documentTemplate/shareEnvelope'

const BINARY_MAGIC = new Uint8Array([0x50, 0x49, 0x56, 0x31])
const SIGNING_KEY_MATERIAL = 'psychiatry-ink:vorlage-share:v1'
const HMAC_BYTES = 32
const HEADER_BYTES = BINARY_MAGIC.length + 1 + HMAC_BYTES + 4

export type TemplateSharePreview = {
  title: string
  category: TemplateCategory
  language: 'de' | 'en'
  fieldCount: number
  exportedAt: string
  creator?: TemplateShareCreator
  description?: string
}

export type TemplateShareParseError =
  | 'invalid_magic'
  | 'unsupported_version'
  | 'tampered'
  | 'malformed'
  | 'invalid_payload'

export type TemplateShareParseResult =
  | { ok: true; preview: TemplateSharePreview; payload: TemplateSharePayload }
  | { ok: false; error: TemplateShareParseError }

let signingKeyPromise: Promise<CryptoKey> | null = null

function getSigningKey(): Promise<CryptoKey> {
  if (!signingKeyPromise) {
    signingKeyPromise = (async () => {
      const keyBytes = new TextEncoder().encode(SIGNING_KEY_MATERIAL)
      const hash = await crypto.subtle.digest('SHA-256', keyBytes)
      return crypto.subtle.importKey('raw', hash, { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
        'verify',
      ])
    })()
  }
  return signingKeyPromise
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function uint32BE(value: number): Uint8Array {
  const buf = new Uint8Array(4)
  new DataView(buf.buffer).setUint32(0, value, false)
  return buf
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false)
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const binary = atob(normalized + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function buildSharePayload(
  template: DocumentTemplate,
  creator?: TemplateShareCreator,
): TemplateSharePayload {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, createdBy: _createdBy, ...body } =
    template
  return {
    kind: 'document-template',
    formatVersion: TEMPLATE_SHARE_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    creator,
    template: body,
  }
}

function previewFromPayload(payload: TemplateSharePayload): TemplateSharePreview {
  return {
    title: payload.template.title,
    category: payload.template.category,
    language: payload.template.language,
    fieldCount: payload.template.fields.length,
    exportedAt: payload.exportedAt,
    creator: payload.creator,
    description: payload.template.description,
  }
}

export async function encodeTemplateShareFile(
  template: DocumentTemplate,
  creator?: TemplateShareCreator,
): Promise<string> {
  const payload = buildSharePayload(template, creator)
  TemplateSharePayloadSchema.parse(payload)

  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload))
  const key = await getSigningKey()
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, payloadBytes))
  const bundle = concat(
    BINARY_MAGIC,
    new Uint8Array([TEMPLATE_SHARE_FORMAT_VERSION]),
    signature,
    uint32BE(payloadBytes.length),
    payloadBytes,
  )

  return `${TEMPLATE_SHARE_MAGIC_LINE}\n${base64UrlEncode(bundle)}`
}

export async function parseTemplateShareFile(content: string): Promise<TemplateShareParseResult> {
  const trimmed = content.trim()
  const newline = trimmed.indexOf('\n')
  if (newline < 0) return { ok: false, error: 'malformed' }

  const magicLine = trimmed.slice(0, newline).trim()
  const encoded = trimmed.slice(newline + 1).trim()
  if (magicLine !== TEMPLATE_SHARE_MAGIC_LINE || !encoded) {
    return { ok: false, error: 'invalid_magic' }
  }

  let bundle: Uint8Array
  try {
    bundle = base64UrlDecode(encoded)
  } catch {
    return { ok: false, error: 'malformed' }
  }

  if (bundle.length < HEADER_BYTES) return { ok: false, error: 'malformed' }

  for (let i = 0; i < BINARY_MAGIC.length; i += 1) {
    if (bundle[i] !== BINARY_MAGIC[i]) return { ok: false, error: 'invalid_magic' }
  }

  const version = bundle[BINARY_MAGIC.length]
  if (version !== TEMPLATE_SHARE_FORMAT_VERSION) {
    return { ok: false, error: 'unsupported_version' }
  }

  const signature = bundle.slice(BINARY_MAGIC.length + 1, BINARY_MAGIC.length + 1 + HMAC_BYTES)
  const payloadLength = readUint32BE(bundle, BINARY_MAGIC.length + 1 + HMAC_BYTES)
  const payloadStart = HEADER_BYTES
  if (payloadStart + payloadLength !== bundle.length) {
    return { ok: false, error: 'malformed' }
  }

  const payloadBytes = bundle.slice(payloadStart, payloadStart + payloadLength)
  const key = await getSigningKey()
  const valid = await crypto.subtle.verify('HMAC', key, signature, payloadBytes)
  if (!valid) return { ok: false, error: 'tampered' }

  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(payloadBytes))
  } catch {
    return { ok: false, error: 'malformed' }
  }

  const validated = TemplateSharePayloadSchema.safeParse(parsed)
  if (!validated.success) return { ok: false, error: 'invalid_payload' }

  return {
    ok: true,
    preview: previewFromPayload(validated.data),
    payload: validated.data,
  }
}

export function buildTemplateShareFilename(title: string): string {
  const slug =
    title
      .trim()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'vorlage'
  return `${slug}.psychiatry-ink`
}

export function downloadTemplateShareFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/vnd.psychiatry-ink.vorlage' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.psychiatry-ink') ? filename : `${filename}.psychiatry-ink`
  anchor.click()
  URL.revokeObjectURL(url)
}
