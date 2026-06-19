/**
 * Encrypted-at-rest blob store for imported binary attachments (PDF / scans).
 *
 * Stored-only documents (PDF/scans) keep their original bytes here, in IndexedDB,
 * rather than in the plaintext Dokumente archive. Bytes are encrypted with the
 * same local RSA-wrapped AES-GCM key used by the patient/workspace vault
 * (`encryptJsonPayload`), so PHI in a scanned letter never lands on disk in the
 * clear.
 *
 * Rejects when IndexedDB / crypto is unavailable (e.g. SSR, tests); callers
 * handle the rejected promise.
 */
import { decryptJsonPayload, encryptJsonPayload, type EncryptedVaultBlob } from '../cryptoVault'
import { readArrayBuffer } from './fileIo'

const DB_NAME = 'psychiatry-ink:imported-files'
const STORE_NAME = 'attachments'
const DB_VERSION = 1

export interface StoredAttachmentRecord {
  storeId: string
  caseId: string
  mimeType: string
  originalFileName: string
  sizeBytes: number
  blob: EncryptedVaultBlob
  createdAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'storeId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
  })
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode)
        const store = transaction.objectStore(STORE_NAME)
        const request = run(store)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
        transaction.oncomplete = () => db.close()
      }),
  )
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

/** Persist a file's bytes (encrypted) and return its store id. */
export async function storeImportedFile(caseId: string, file: File): Promise<string> {
  const storeId = crypto.randomUUID()
  const base64 = arrayBufferToBase64(await readArrayBuffer(file))
  const blob = await encryptJsonPayload({ base64 })
  const record: StoredAttachmentRecord = {
    storeId,
    caseId,
    mimeType: file.type || 'application/octet-stream',
    originalFileName: file.name,
    sizeBytes: file.size,
    blob,
    createdAt: new Date().toISOString(),
  }
  await tx('readwrite', (store) => store.put(record))
  return storeId
}

/** Load a stored attachment as a Blob for preview/download. Returns null if missing. */
export async function loadImportedFile(
  storeId: string,
): Promise<{ blob: Blob; record: StoredAttachmentRecord } | null> {
  const record = await tx<StoredAttachmentRecord | undefined>('readonly', (store) => store.get(storeId))
  if (!record) return null
  const payload = await decryptJsonPayload<{ base64: string }>(record.blob)
  const buffer = base64ToArrayBuffer(payload.base64)
  return { blob: new Blob([buffer], { type: record.mimeType }), record }
}

/** Remove a stored attachment (used to prune un-accepted imports). */
export async function deleteImportedFile(storeId: string): Promise<void> {
  try {
    await tx('readwrite', (store) => store.delete(storeId))
  } catch {
    // best-effort
  }
}
