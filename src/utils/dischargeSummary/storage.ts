/**
 * Encrypted storage for Discharge Summary drafts (patient-scoped and blank workspace).
 */

import type { DischargeSummaryDraft } from '../../types/dischargeSummary'
import { decryptJsonPayload, encryptJsonPayload, type EncryptedVaultBlob } from '../cryptoVault'
import { CRYPTO_VAULT_STORE, openCryptoVaultDb } from '../cryptoVaultDb'
import { DEFAULT_CASE_ID } from '../caseContext'

const VAULT_STORE = CRYPTO_VAULT_STORE

function vaultKey(scopeId: string): string {
  return `discharge-summary-docs:${scopeId}`
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

export const DISCHARGE_SUMMARY_DOCS_CHANGED_EVENT = 'psychiatry-ink:discharge-summary-docs:changed'

function notifyChanged(scopeId: string): void {
  try {
    window.dispatchEvent(
      new CustomEvent(DISCHARGE_SUMMARY_DOCS_CHANGED_EVENT, { detail: { scopeId } }),
    )
  } catch {
    // ignore
  }
}

export function resolveDischargeSummaryScopeId(caseId?: string, patientScoped = true): string {
  if (!patientScoped || !caseId) return DEFAULT_CASE_ID
  return caseId
}

async function loadBlob(scopeId: string): Promise<EncryptedVaultBlob | null> {
  return idbGet<EncryptedVaultBlob>(vaultKey(scopeId))
}

async function saveAll(scopeId: string, docs: DischargeSummaryDraft[]): Promise<void> {
  const blob = await encryptJsonPayload(docs)
  await idbSet(vaultKey(scopeId), blob)
  notifyChanged(scopeId)
}

export async function loadDischargeSummaryDrafts(scopeId: string): Promise<DischargeSummaryDraft[]> {
  const blob = await loadBlob(scopeId)
  if (!blob) return []
  try {
    const docs = await decryptJsonPayload<DischargeSummaryDraft[]>(blob)
    return Array.isArray(docs) ? docs : []
  } catch {
    return []
  }
}

export async function getDischargeSummaryDraft(
  scopeId: string,
  id: string,
): Promise<DischargeSummaryDraft | null> {
  const docs = await loadDischargeSummaryDrafts(scopeId)
  return docs.find((d) => d.id === id) ?? null
}

export async function saveDischargeSummaryDraft(
  scopeId: string,
  doc: DischargeSummaryDraft,
): Promise<DischargeSummaryDraft> {
  const docs = await loadDischargeSummaryDrafts(scopeId)
  const idx = docs.findIndex((d) => d.id === doc.id)
  const next = [...docs]
  if (idx >= 0) next[idx] = doc
  else next.unshift(doc)
  await saveAll(scopeId, next)
  return doc
}

export async function duplicateDischargeSummaryDraft(
  scopeId: string,
  id: string,
): Promise<DischargeSummaryDraft | null> {
  const source = await getDischargeSummaryDraft(scopeId, id)
  if (!source) return null
  const now = new Date().toISOString()
  const copy: DischargeSummaryDraft = {
    ...structuredClone(source),
    id: crypto.randomUUID(),
    title: `${source.title} (copy)`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  }
  return saveDischargeSummaryDraft(scopeId, copy)
}

export async function deleteDischargeSummaryDraft(scopeId: string, id: string): Promise<void> {
  const docs = await loadDischargeSummaryDrafts(scopeId)
  await saveAll(scopeId, docs.filter((d) => d.id !== id))
}
