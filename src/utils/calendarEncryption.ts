/**
 * Org calendar E2EE (Small Praxis).
 *
 * One AES-GCM key per organisation, wrapped per member via RSA-OAEP
 * (device key pair — same pattern as org case vault).
 */

import {
  decryptJson,
  encryptJson,
  exportKeyToBase64Url,
  generatePackageKey,
  importKeyFromBase64Url,
  isEncryptedEnvelope,
  type EncryptedEnvelope,
} from './e2ee'
import { ensureKeyMaterial } from './cryptoVault'
import { ensureOrgVaultPublicKeyRegistered } from './orgCaseVault'
import type {
  CalendarItem,
  CalendarItemWire,
  CalendarSensitivePayload,
  CreateCalendarItemInput,
  UpdateCalendarItemInput,
} from '../types/calendar'
import {
  fetchCalendarEncryptionKey,
  fetchCalendarEncryptionKeyStatus,
  fetchMemberPublicKeysForCalendar,
  initCalendarEncryptionKey,
  uploadCalendarEncryptionKeyForMember,
} from '../services/calendarEncryptionApi'

const calendarKeyCache = new Map<string, CryptoKey>()

function cacheKey(organisationId: string): string {
  return organisationId
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function importRsaPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, [
    'encrypt',
    'wrapKey',
  ])
}

async function importRsaPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, [
    'decrypt',
    'unwrapKey',
  ])
}

async function wrapCalendarKeyForPublicKey(
  calendarKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<string> {
  const wrapped = await crypto.subtle.wrapKey('raw', calendarKey, publicKey, { name: 'RSA-OAEP' })
  return bufferToBase64(wrapped)
}

async function unwrapCalendarKey(wrappedKeyBase64: string, privateKey: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    'raw',
    base64ToBuffer(wrappedKeyBase64),
    privateKey,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}

export function calendarKeyStorageId(organisationId: string): string {
  return `cal:e2ee:${organisationId}`
}

export function clearOrgCalendarKeyCache(organisationId?: string): void {
  if (organisationId) {
    calendarKeyCache.delete(cacheKey(organisationId))
    return
  }
  calendarKeyCache.clear()
}

export function getCachedOrgCalendarKey(organisationId: string): CryptoKey | null {
  return calendarKeyCache.get(cacheKey(organisationId)) ?? null
}

export async function encryptCalendarPayload(
  key: CryptoKey,
  payload: CalendarSensitivePayload,
): Promise<EncryptedEnvelope> {
  return encryptJson(key, payload)
}

export async function decryptCalendarPayload(
  key: CryptoKey,
  envelope: EncryptedEnvelope,
): Promise<CalendarSensitivePayload> {
  return decryptJson<CalendarSensitivePayload>(key, envelope)
}

function parseEnvelope(raw: string | null | undefined): EncryptedEnvelope | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return isEncryptedEnvelope(parsed) ? parsed : null
  } catch {
    return null
  }
}

function legacySensitiveFromWire(wire: CalendarItemWire): CalendarSensitivePayload | null {
  if (!wire.title?.trim() && !wire.notes && !wire.reason && !wire.patientId && !wire.caseId) {
    return null
  }
  return {
    title: wire.title?.trim() || 'Termin',
    notes: wire.notes,
    reason: wire.reason,
    patientId: wire.patientId,
    caseId: wire.caseId,
  }
}

export function mergeWireCalendarItem(
  wire: CalendarItemWire,
  sensitive: CalendarSensitivePayload,
): CalendarItem {
  return {
    id: wire.id,
    type: wire.type,
    title: sensitive.title,
    patientId: sensitive.patientId,
    caseId: sensitive.caseId,
    startTime: wire.startTime,
    endTime: wire.endTime,
    status: wire.status,
    priority: wire.priority,
    assignedUserId: wire.assignedUserId,
    location: wire.location,
    notes: sensitive.notes,
    reason: sensitive.reason,
    createdBy: wire.createdBy,
    createdAt: wire.createdAt,
    updatedAt: wire.updatedAt,
    auditMetadata: wire.auditMetadata,
  }
}

export async function decryptWireCalendarItem(
  key: CryptoKey,
  wire: CalendarItemWire,
): Promise<CalendarItem> {
  const envelope = parseEnvelope(wire.encryptedPayload)
  if (envelope) {
    try {
      const sensitive = await decryptCalendarPayload(key, envelope)
      return mergeWireCalendarItem(wire, sensitive)
    } catch (error) {
      throw new OrgCalendarKeySetupError(formatCalendarCryptoError(error, 'decrypt'))
    }
  }
  const legacy = legacySensitiveFromWire(wire)
  if (legacy) return mergeWireCalendarItem(wire, legacy)
  return mergeWireCalendarItem(wire, { title: 'Termin' })
}

export async function decryptWireCalendarItems(
  key: CryptoKey,
  items: CalendarItemWire[],
): Promise<CalendarItem[]> {
  return Promise.all(items.map((item) => decryptWireCalendarItem(key, item)))
}

export function splitCalendarInput(input: CreateCalendarItemInput): {
  sensitive: CalendarSensitivePayload
  skeleton: Omit<CreateCalendarItemInput, 'title' | 'notes' | 'reason' | 'patientId' | 'caseId'>
  caseIdForAcl?: string
} {
  const { title, notes, reason, patientId, caseId, ...skeleton } = input
  return {
    sensitive: {
      title: title.trim(),
      notes,
      reason,
      patientId,
      caseId,
    },
    skeleton,
    caseIdForAcl: caseId,
  }
}

export function splitCalendarUpdate(input: UpdateCalendarItemInput): {
  sensitivePatch: Partial<CalendarSensitivePayload>
  skeletonPatch: Omit<
    UpdateCalendarItemInput,
    'title' | 'notes' | 'reason' | 'patientId' | 'caseId'
  >
  caseIdForAcl?: string | null
  touchesSensitive: boolean
} {
  const sensitivePatch: Partial<CalendarSensitivePayload> = {}
  let touchesSensitive = false

  if (input.title !== undefined) {
    sensitivePatch.title = input.title.trim()
    touchesSensitive = true
  }
  if (input.notes !== undefined) {
    sensitivePatch.notes = input.notes ?? undefined
    touchesSensitive = true
  }
  if (input.reason !== undefined) {
    sensitivePatch.reason = input.reason ?? undefined
    touchesSensitive = true
  }
  if (input.patientId !== undefined) {
    sensitivePatch.patientId = input.patientId ?? undefined
    touchesSensitive = true
  }
  if (input.caseId !== undefined) {
    sensitivePatch.caseId = input.caseId ?? undefined
    touchesSensitive = true
  }

  const { title: _t, notes: _n, reason: _r, patientId: _p, caseId, ...skeletonPatch } = input

  return {
    sensitivePatch,
    skeletonPatch,
    caseIdForAcl: input.caseId,
    touchesSensitive,
  }
}

async function loadCalendarKeyFromServer(
  organisationId: string,
  currentUserId?: string,
): Promise<CryptoKey> {
  const cached = calendarKeyCache.get(cacheKey(organisationId))
  if (cached) return cached

  try {
    const { wrappedKey } = await fetchCalendarEncryptionKey(organisationId)
    const material = await ensureKeyMaterial()
    const privateKey = await importRsaPrivateKey(material.privateKeyJwk)
    const calendarKey = await unwrapCalendarKey(wrappedKey, privateKey)
    calendarKeyCache.set(cacheKey(organisationId), calendarKey)
    return calendarKey
  } catch (error) {
    const localBackup = await tryLoadCalendarKeyFromLocalBackup(organisationId)
    if (localBackup) {
      if (currentUserId) {
        try {
          await reuploadWrappedCalendarKeyForCurrentDevice(
            organisationId,
            currentUserId,
            localBackup,
          )
        } catch {
          /* non-fatal — local key still unlocks this session */
        }
      }
      return localBackup
    }

    throw new OrgCalendarKeySetupError(formatCalendarCryptoError(error, 'unwrap'))
  }
}

async function wrapKeyForAllMembers(
  organisationId: string,
  calendarKey: CryptoKey,
  currentUserId: string,
): Promise<void> {
  const material = await ensureKeyMaterial()
  const selfPublic = await importRsaPublicKey(material.publicKeyJwk)
  const selfWrapped = await wrapCalendarKeyForPublicKey(calendarKey, selfPublic)
  await initCalendarEncryptionKey(organisationId, selfWrapped)

  const { members } = await fetchMemberPublicKeysForCalendar(organisationId)
  for (const member of members) {
    if (member.userId === currentUserId) continue
    try {
      const memberPublic = await importRsaPublicKey(member.publicKeyJwk)
      const wrapped = await wrapCalendarKeyForPublicKey(calendarKey, memberPublic)
      await uploadCalendarEncryptionKeyForMember(organisationId, member.userId, wrapped)
    } catch {
      // skip members with invalid keys
    }
  }
}

export class OrgCalendarKeySetupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrgCalendarKeySetupError'
  }
}

const CRYPTO_OPERATION_ERROR_MARKERS = [
  'operation-specific reason',
  'The operation failed',
  'OperationError',
] as const

export function isCalendarCryptoOperationError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'OperationError' || error.name === 'InvalidAccessError'
  }
  if (error instanceof Error) {
    if (error.name === 'OperationError' || error.name === 'InvalidAccessError') return true
    const message = error.message
    return CRYPTO_OPERATION_ERROR_MARKERS.some((marker) => message.includes(marker))
  }
  return false
}

export function formatCalendarCryptoError(
  error: unknown,
  phase: 'unwrap' | 'decrypt',
): string {
  if (error instanceof OrgCalendarKeySetupError) return error.message
  if (error instanceof Error && !isCalendarCryptoOperationError(error) && error.message.trim()) {
    return error.message
  }

  if (phase === 'unwrap') {
    return (
      'Kalender-Verschlüsselungsschlüssel konnte auf diesem Gerät nicht entsperrt werden. ' +
      'Mögliche Ursachen: neues Gerät oder zurückgesetzte Geräteschlüssel. ' +
      'Bitte melden Sie sich auf dem ursprünglichen Gerät an oder wenden Sie sich an den Praxisinhaber, ' +
      'damit Ihr Kalender-Schlüssel neu eingerichtet wird.'
    )
  }

  return (
    'Kalender-Einträge konnten nicht entschlüsselt werden. ' +
    'Der Verschlüsselungsschlüssel passt nicht zu den gespeicherten Terminen ' +
    '(z. B. nach Schlüssel-Neuinitialisierung oder beschädigten Daten). ' +
    'Bitte wenden Sie sich an den Praxisinhaber.'
  )
}

async function tryLoadCalendarKeyFromLocalBackup(organisationId: string): Promise<CryptoKey | null> {
  const stored = localStorage.getItem(calendarKeyStorageId(organisationId))
  if (!stored?.trim()) return null

  try {
    const calendarKey = await importKeyFromBase64Url(stored)
    calendarKeyCache.set(cacheKey(organisationId), calendarKey)
    return calendarKey
  } catch {
    return null
  }
}

async function reuploadWrappedCalendarKeyForCurrentDevice(
  organisationId: string,
  userId: string,
  calendarKey: CryptoKey,
): Promise<void> {
  const material = await ensureKeyMaterial()
  const selfPublic = await importRsaPublicKey(material.publicKeyJwk)
  const selfWrapped = await wrapCalendarKeyForPublicKey(calendarKey, selfPublic)
  await uploadCalendarEncryptionKeyForMember(organisationId, userId, selfWrapped)
}

/**
 * Ensure org calendar encryption key is available. Owner initializes on first access.
 */
export async function bootstrapOrgCalendarKey(
  organisationId: string,
  isOwner: boolean,
  currentUserId: string,
): Promise<CryptoKey> {
  await ensureOrgVaultPublicKeyRegistered()

  const status = await fetchCalendarEncryptionKeyStatus(organisationId)

  if (!status.initialized) {
    if (!isOwner) {
      throw new OrgCalendarKeySetupError(
        'Kalender-Verschlüsselung ist noch nicht eingerichtet. Bitte öffnen Sie den Kalender als Praxisinhaber.',
      )
    }

    const calendarKey = await generatePackageKey()
    calendarKeyCache.set(cacheKey(organisationId), calendarKey)

    await wrapKeyForAllMembers(organisationId, calendarKey, currentUserId)

    try {
      localStorage.setItem(calendarKeyStorageId(organisationId), await exportKeyToBase64Url(calendarKey))
    } catch {
      /* non-fatal */
    }

    return calendarKey
  }

  if (!status.hasWrappedKey) {
    if (isOwner) {
      const localBackup = await tryLoadCalendarKeyFromLocalBackup(organisationId)
      if (localBackup) {
        try {
          await reuploadWrappedCalendarKeyForCurrentDevice(
            organisationId,
            currentUserId,
            localBackup,
          )
        } catch (error) {
          throw new OrgCalendarKeySetupError(formatCalendarCryptoError(error, 'unwrap'))
        }
        return localBackup
      }

      throw new OrgCalendarKeySetupError(
        'Kalender-Verschlüsselungsschlüssel fehlt auf diesem Gerät. ' +
          'Bitte öffnen Sie den Kalender auf dem Gerät, auf dem er eingerichtet wurde, ' +
          'oder stellen Sie den Schlüssel aus einem Backup wieder her. ' +
          'Ein neuer Schlüssel würde bestehende Termine unlesbar machen.',
      )
    }
    throw new OrgCalendarKeySetupError(
      'Kalender-Verschlüsselungsschlüssel fehlt. Bitte wenden Sie sich an den Praxisinhaber.',
    )
  }

  return loadCalendarKeyFromServer(organisationId, currentUserId)
}
