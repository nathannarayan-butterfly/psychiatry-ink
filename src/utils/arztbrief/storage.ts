/**
 * Encrypted storage for Arztbrief drafts (patient-scoped and blank workspace).
 */

import type { ArztbriefDraft } from '../../types/arztbrief'
import { decryptJsonPayload, encryptJsonPayload, type EncryptedVaultBlob } from '../cryptoVault'
import { CRYPTO_VAULT_STORE, openCryptoVaultDb } from '../cryptoVaultDb'
import { DEFAULT_CASE_ID } from '../caseContext'

const VAULT_STORE = CRYPTO_VAULT_STORE

function vaultKey(scopeId: string): string {
  return `arztbrief-docs:${scopeId}`
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openCryptoVaultDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readonly')
    const req = tx.objectStore(VAULT_STORE).get(key)
    req.onerror = () => reject(req.error ?? new Error('idb get failed'))
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null)
  })
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openCryptoVaultDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readwrite')
    tx.objectStore(VAULT_STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('idb set failed'))
  })
}

export const ARZTBRIEF_DOCS_CHANGED_EVENT = 'psychiatry-ink:arztbrief-docs:changed'

function notifyChanged(scopeId: string): void {
  try {
    window.dispatchEvent(
      new CustomEvent(ARZTBRIEF_DOCS_CHANGED_EVENT, { detail: { scopeId } }),
    )
  } catch {
    // ignore
  }
}

export function resolveArztbriefScopeId(caseId?: string, patientScoped = true): string {
  if (!patientScoped || !caseId) return DEFAULT_CASE_ID
  return caseId
}

async function loadBlob(scopeId: string): Promise<EncryptedVaultBlob | null> {
  return idbGet<EncryptedVaultBlob>(vaultKey(scopeId))
}

async function saveAll(scopeId: string, docs: ArztbriefDraft[]): Promise<void> {
  const blob = await encryptJsonPayload(docs)
  await idbSet(vaultKey(scopeId), blob)
  notifyChanged(scopeId)
}

export async function loadArztbriefDrafts(scopeId: string): Promise<ArztbriefDraft[]> {
  const blob = await loadBlob(scopeId)
  if (!blob) return []
  try {
    const docs = await decryptJsonPayload<ArztbriefDraft[]>(blob)
    return Array.isArray(docs) ? docs : []
  } catch {
    return []
  }
}

export async function getArztbriefDraft(scopeId: string, id: string): Promise<ArztbriefDraft | null> {
  const docs = await loadArztbriefDrafts(scopeId)
  return docs.find((d) => d.id === id) ?? null
}

export async function saveArztbriefDraft(scopeId: string, doc: ArztbriefDraft): Promise<ArztbriefDraft> {
  const docs = await loadArztbriefDrafts(scopeId)
  const idx = docs.findIndex((d) => d.id === doc.id)
  const next = [...docs]
  if (idx >= 0) next[idx] = doc
  else next.unshift(doc)
  await saveAll(scopeId, next)
  return doc
}

export async function duplicateArztbriefDraft(
  scopeId: string,
  id: string,
): Promise<ArztbriefDraft | null> {
  const source = await getArztbriefDraft(scopeId, id)
  if (!source) return null
  const now = new Date().toISOString()
  const copy: ArztbriefDraft = {
    ...structuredClone(source),
    id: crypto.randomUUID(),
    title: `${source.title} (Kopie)`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  }
  return saveArztbriefDraft(scopeId, copy)
}

export async function deleteArztbriefDraft(scopeId: string, id: string): Promise<void> {
  const docs = await loadArztbriefDrafts(scopeId)
  await saveAll(scopeId, docs.filter((d) => d.id !== id))
}
