/**
 * Encrypted per-case storage for template-generated documents (contains patient field values).
 */

import type { GeneratedDocument, GeneratedDocumentStatus } from '../types/documentTemplate'
import { decryptJsonPayload, encryptJsonPayload, type EncryptedVaultBlob } from './cryptoVault'
import { CRYPTO_VAULT_STORE, openCryptoVaultDb } from './cryptoVaultDb'

const VAULT_STORE = CRYPTO_VAULT_STORE

function vaultKey(caseId: string): string {
  return `generated-docs:${caseId}`
}

async function idbGet<T>(store: string, key: string): Promise<T | null> {
  const db = await openCryptoVaultDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onerror = () => reject(req.error ?? new Error('idb get failed'))
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null)
  })
}

async function idbSet(store: string, key: string, value: unknown): Promise<void> {
  const db = await openCryptoVaultDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('idb set failed'))
  })
}

export const GENERATED_DOCS_CHANGED_EVENT = 'psychiatry-ink:generated-docs:changed'

function notifyChanged(caseId: string): void {
  try {
    window.dispatchEvent(
      new CustomEvent(GENERATED_DOCS_CHANGED_EVENT, { detail: { caseId } }),
    )
  } catch {
    // ignore
  }
}

async function loadBlob(caseId: string): Promise<EncryptedVaultBlob | null> {
  return idbGet<EncryptedVaultBlob>(VAULT_STORE, vaultKey(caseId))
}

async function saveDocs(caseId: string, docs: GeneratedDocument[]): Promise<void> {
  const blob = await encryptJsonPayload(docs)
  await idbSet(VAULT_STORE, vaultKey(caseId), blob)
  notifyChanged(caseId)
}

export async function loadGeneratedDocuments(caseId: string): Promise<GeneratedDocument[]> {
  const blob = await loadBlob(caseId)
  if (!blob) return []
  try {
    const docs = await decryptJsonPayload<GeneratedDocument[]>(blob)
    return Array.isArray(docs) ? docs.filter((d) => d.status !== 'archived') : []
  } catch {
    return []
  }
}

export async function loadAllGeneratedDocuments(caseId: string): Promise<GeneratedDocument[]> {
  const blob = await loadBlob(caseId)
  if (!blob) return []
  try {
    const docs = await decryptJsonPayload<GeneratedDocument[]>(blob)
    return Array.isArray(docs) ? docs : []
  } catch {
    return []
  }
}

export async function getGeneratedDocument(
  caseId: string,
  id: string,
): Promise<GeneratedDocument | null> {
  const docs = await loadAllGeneratedDocuments(caseId)
  return docs.find((d) => d.id === id) ?? null
}

export async function saveGeneratedDocument(
  caseId: string,
  doc: GeneratedDocument,
): Promise<GeneratedDocument> {
  const docs = await loadAllGeneratedDocuments(caseId)
  const idx = docs.findIndex((d) => d.id === doc.id)
  const next = [...docs]
  if (idx >= 0) next[idx] = doc
  else next.unshift(doc)
  await saveDocs(caseId, next)
  return doc
}

export async function updateGeneratedDocument(
  caseId: string,
  id: string,
  patch: Partial<Omit<GeneratedDocument, 'id' | 'caseId'>>,
): Promise<GeneratedDocument | null> {
  const docs = await loadAllGeneratedDocuments(caseId)
  const idx = docs.findIndex((d) => d.id === id)
  if (idx < 0) return null
  const updated: GeneratedDocument = {
    ...docs[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  const next = [...docs]
  next[idx] = updated
  await saveDocs(caseId, next)
  return updated
}

export async function setGeneratedDocumentStatus(
  caseId: string,
  id: string,
  status: GeneratedDocumentStatus,
): Promise<GeneratedDocument | null> {
  return updateGeneratedDocument(caseId, id, { status })
}

export async function duplicateGeneratedDocument(
  caseId: string,
  id: string,
): Promise<GeneratedDocument | null> {
  const source = await getGeneratedDocument(caseId, id)
  if (!source) return null
  const now = new Date().toISOString()
  const copy: GeneratedDocument = {
    ...source,
    id: crypto.randomUUID(),
    title: `${source.title} (Kopie)`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  }
  return saveGeneratedDocument(caseId, copy)
}

export async function countDocsUsingTemplate(_templateId: string): Promise<number> {
  // Scan all case vaults is expensive; templates store uses local count via event.
  // For delete guard, caller passes caseIds from registry.
  return 0
}

export async function countDocsUsingTemplateInCases(
  templateId: string,
  caseIds: string[],
): Promise<number> {
  let count = 0
  for (const caseId of caseIds) {
    const docs = await loadAllGeneratedDocuments(caseId)
    count += docs.filter((d) => d.templateId === templateId).length
  }
  return count
}
