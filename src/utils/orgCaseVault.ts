/**
 * Org-scoped case vault E2EE (Small Praxis).
 *
 * Per-case AES-GCM key wrapped per member via RSA-OAEP (device key pair in IndexedDB).
 * Ciphertext snapshots stored in Supabase; server never sees plaintext or raw case keys.
 */

import {
  decryptJson,
  encryptJson,
  generatePackageKey,
  type EncryptedEnvelope,
} from './e2ee'
import {
  ensureKeyMaterial,
  type EncryptedVaultBlob,
} from './cryptoVault'
import {
  decryptWorkspaceBlob,
  clinicalPayloadForEncryption,
  type ClinicalWorkspacePayload,
  WORKSPACE_PAYLOAD_VERSION,
} from './workspaceVault'
import {
  fetchCaseVaultKey,
  fetchCaseVaultSnapshot,
  fetchCaseVaultStatus,
  fetchMemberVaultPublicKey,
  initCaseVault,
  registerOrgVaultPublicKey,
  saveCaseVaultSnapshot,
  uploadCaseVaultKey,
} from '../services/orgCaseVaultApi'

const caseKeyCache = new Map<string, CryptoKey>()

function cacheKey(organisationId: string, caseId: string): string {
  return `${organisationId}:${caseId}`
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

async function wrapCaseKeyForPublicKey(
  caseKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<string> {
  const wrapped = await crypto.subtle.wrapKey('raw', caseKey, publicKey, { name: 'RSA-OAEP' })
  return bufferToBase64(wrapped)
}

async function unwrapCaseKey(wrappedKeyBase64: string, privateKey: CryptoKey): Promise<CryptoKey> {
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

export function clearOrgCaseKeyCache(organisationId?: string, caseId?: string): void {
  if (organisationId && caseId) {
    caseKeyCache.delete(cacheKey(organisationId, caseId))
    return
  }
  caseKeyCache.clear()
}

export function getCachedOrgCaseKey(organisationId: string, caseId: string): CryptoKey | null {
  return caseKeyCache.get(cacheKey(organisationId, caseId)) ?? null
}

export async function ensureOrgVaultPublicKeyRegistered(): Promise<void> {
  const material = await ensureKeyMaterial()
  await registerOrgVaultPublicKey(material.publicKeyJwk)
}

async function loadCaseKeyFromServer(
  organisationId: string,
  caseId: string,
): Promise<CryptoKey> {
  const cached = caseKeyCache.get(cacheKey(organisationId, caseId))
  if (cached) return cached

  const { wrappedKey } = await fetchCaseVaultKey(caseId)
  const material = await ensureKeyMaterial()
  const privateKey = await importRsaPrivateKey(material.privateKeyJwk)
  const caseKey = await unwrapCaseKey(wrappedKey, privateKey)
  caseKeyCache.set(cacheKey(organisationId, caseId), caseKey)
  return caseKey
}

async function generateAndCacheCaseKey(organisationId: string, caseId: string): Promise<CryptoKey> {
  const caseKey = await generatePackageKey()
  caseKeyCache.set(cacheKey(organisationId, caseId), caseKey)
  return caseKey
}

export async function encryptPayloadWithCaseKey(
  caseKey: CryptoKey,
  payload: ClinicalWorkspacePayload,
): Promise<EncryptedEnvelope> {
  return encryptJson(caseKey, clinicalPayloadForEncryption(payload))
}

export async function decryptPayloadWithCaseKey(
  caseKey: CryptoKey,
  envelope: EncryptedEnvelope,
): Promise<ClinicalWorkspacePayload> {
  const raw = await decryptJson<ClinicalWorkspacePayload>(caseKey, envelope)
  return {
    ...raw,
    version: raw.version ?? WORKSPACE_PAYLOAD_VERSION,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    age: raw.age ?? '',
    diagnoses: raw.diagnoses ?? [],
  }
}

export interface OrgVaultBootstrapResult {
  caseKey: CryptoKey
  payload: ClinicalWorkspacePayload | null
  snapshotUpdatedAt: string | null
}

/**
 * Ensure org case vault is initialized and return case key + remote snapshot if any.
 * Migrates legacy local user-key vault to org snapshot on first init.
 */
export async function bootstrapOrgCaseVault(
  organisationId: string,
  caseId: string,
  options?: {
    localLegacyBlob?: EncryptedVaultBlob | null
    localLegacyPayload?: ClinicalWorkspacePayload | null
  },
): Promise<OrgVaultBootstrapResult> {
  await ensureOrgVaultPublicKeyRegistered()

  const status = await fetchCaseVaultStatus(caseId)
  let caseKey: CryptoKey

  if (!status.initialized) {
    caseKey = await generateAndCacheCaseKey(organisationId, caseId)
    const material = await ensureKeyMaterial()
    const publicKey = await importRsaPublicKey(material.publicKeyJwk)
    const wrappedKey = await wrapCaseKeyForPublicKey(caseKey, publicKey)

    let snapshotEnvelope: EncryptedEnvelope | undefined
    if (options?.localLegacyPayload) {
      snapshotEnvelope = await encryptPayloadWithCaseKey(caseKey, options.localLegacyPayload)
    } else if (options?.localLegacyBlob) {
      try {
        const legacyPayload = await decryptWorkspaceBlob(options.localLegacyBlob)
        snapshotEnvelope = await encryptPayloadWithCaseKey(caseKey, legacyPayload)
      } catch {
        // Legacy decrypt failed — init keys only
      }
    }

    await initCaseVault(
      caseId,
      wrappedKey,
      snapshotEnvelope
        ? {
            ciphertext: snapshotEnvelope.ciphertext,
            iv: snapshotEnvelope.iv,
            payloadVersion: WORKSPACE_PAYLOAD_VERSION,
          }
        : undefined,
    )

    if (options?.localLegacyPayload) {
      return {
        caseKey,
        payload: options.localLegacyPayload,
        snapshotUpdatedAt: new Date().toISOString(),
      }
    }
    if (snapshotEnvelope) {
      const legacyPayload = options?.localLegacyBlob
        ? await decryptWorkspaceBlob(options.localLegacyBlob).catch(() => null)
        : null
      return {
        caseKey,
        payload: legacyPayload,
        snapshotUpdatedAt: new Date().toISOString(),
      }
    }

    return { caseKey, payload: null, snapshotUpdatedAt: null }
  }

  if (!status.hasWrappedKey) {
    throw new Error(
      'Fall-Verschlüsselungsschlüssel fehlt. Bitte wenden Sie sich an den Fallinhaber.',
    )
  }

  caseKey = await loadCaseKeyFromServer(organisationId, caseId)

  try {
    const remote = await fetchCaseVaultSnapshot(caseId)
    const payload = await decryptPayloadWithCaseKey(caseKey, {
      enc: 'aes-gcm-256-v1',
      ciphertext: remote.ciphertext,
      iv: remote.iv,
    })
    return { caseKey, payload, snapshotUpdatedAt: remote.updatedAt }
  } catch {
    return { caseKey, payload: null, snapshotUpdatedAt: status.snapshotUpdatedAt }
  }
}

export async function saveOrgCaseVaultPayload(
  organisationId: string,
  caseId: string,
  payload: ClinicalWorkspacePayload,
  caseKey?: CryptoKey,
): Promise<string> {
  const key = caseKey ?? (await loadCaseKeyFromServer(organisationId, caseId))
  const envelope = await encryptPayloadWithCaseKey(key, payload)
  const result = await saveCaseVaultSnapshot(caseId, {
    ciphertext: envelope.ciphertext,
    iv: envelope.iv,
    payloadVersion: payload.version,
  })
  return result.updatedAt
}

export class OrgVaultKeySetupError extends Error {
  constructor(
    message: string,
    readonly code: 'no_case_key' | 'no_member_key' | 'vault_not_initialized' | 'network',
  ) {
    super(message)
    this.name = 'OrgVaultKeySetupError'
  }
}

/** Wrap case key for a newly granted member (owner device must have case open). */
export async function setupVaultKeyForMember(
  organisationId: string,
  caseId: string,
  targetUserId: string,
): Promise<void> {
  const status = await fetchCaseVaultStatus(caseId)
  if (!status.initialized) {
    throw new OrgVaultKeySetupError(
      'Fall-Verschlüsselung ist noch nicht eingerichtet. Bitte öffnen Sie den Fall zuerst auf Ihrem Gerät.',
      'vault_not_initialized',
    )
  }

  let caseKey = getCachedOrgCaseKey(organisationId, caseId)
  if (!caseKey) {
    try {
      caseKey = await loadCaseKeyFromServer(organisationId, caseId)
    } catch {
      throw new OrgVaultKeySetupError(
        'Fall-Verschlüsselung ist auf diesem Gerät nicht verfügbar. Bitte öffnen Sie den Fall zuerst.',
        'no_case_key',
      )
    }
  }

  let memberKey: JsonWebKey
  try {
    const row = await fetchMemberVaultPublicKey(targetUserId, caseId)
    memberKey = row.publicKeyJwk
  } catch {
    throw new OrgVaultKeySetupError(
      'Das Mitglied hat noch keinen Verschlüsselungsschlüssel registriert. Bitte bitten Sie die Person, sich anzumelden und den Fall einmal zu öffnen.',
      'no_member_key',
    )
  }

  const publicKey = await importRsaPublicKey(memberKey)
  const wrappedKey = await wrapCaseKeyForPublicKey(caseKey, publicKey)
  await uploadCaseVaultKey(caseId, targetUserId, wrappedKey)
}
