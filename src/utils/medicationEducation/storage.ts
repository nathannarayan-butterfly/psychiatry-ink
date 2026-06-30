/**
 * Encrypted storage for patient medication education documents.
 */

import type { PatientMedicationEducationDocument } from '../../types/medicationEducation'
import { decryptJsonPayload, encryptJsonPayload, type EncryptedVaultBlob } from '../cryptoVault'
import { CRYPTO_VAULT_STORE, openCryptoVaultDb } from '../cryptoVaultDb'
import { DEFAULT_CASE_ID } from '../caseContext'

const VAULT_STORE = CRYPTO_VAULT_STORE

function vaultKey(scopeId: string): string {
  return `medication-education-docs:${scopeId}`
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

export const MEDICATION_EDUCATION_DOCS_CHANGED_EVENT = 'psychiatry-ink:medication-education-docs:changed'

function notifyChanged(scopeId: string): void {
  try {
    window.dispatchEvent(
      new CustomEvent(MEDICATION_EDUCATION_DOCS_CHANGED_EVENT, { detail: { scopeId } }),
    )
  } catch {
    // ignore
  }
}

export function resolveMedicationEducationScopeId(caseId?: string): string {
  if (!caseId) return DEFAULT_CASE_ID
  return caseId
}

async function loadBlob(scopeId: string): Promise<EncryptedVaultBlob | null> {
  return idbGet<EncryptedVaultBlob>(vaultKey(scopeId))
}

async function saveAll(scopeId: string, docs: PatientMedicationEducationDocument[]): Promise<void> {
  const blob = await encryptJsonPayload(docs)
  await idbSet(vaultKey(scopeId), blob)
  notifyChanged(scopeId)
}

export async function loadMedicationEducationDocuments(
  scopeId: string,
): Promise<PatientMedicationEducationDocument[]> {
  const blob = await loadBlob(scopeId)
  if (!blob) return []
  try {
    const docs = await decryptJsonPayload<PatientMedicationEducationDocument[]>(blob)
    if (!Array.isArray(docs)) return []
    return docs.map((doc) => ({
      ...doc,
      references: doc.references ?? [],
    }))
  } catch {
    return []
  }
}

export async function getMedicationEducationDocument(
  scopeId: string,
  id: string,
): Promise<PatientMedicationEducationDocument | null> {
  const docs = await loadMedicationEducationDocuments(scopeId)
  return docs.find((d) => d.id === id) ?? null
}

export async function saveMedicationEducationDocument(
  scopeId: string,
  doc: PatientMedicationEducationDocument,
): Promise<PatientMedicationEducationDocument> {
  const docs = await loadMedicationEducationDocuments(scopeId)
  const idx = docs.findIndex((d) => d.id === doc.id)
  const next = [...docs]
  if (idx >= 0) next[idx] = doc
  else next.unshift(doc)
  await saveAll(scopeId, next)
  return doc
}

export async function deleteMedicationEducationDocument(scopeId: string, id: string): Promise<void> {
  const docs = await loadMedicationEducationDocuments(scopeId)
  await saveAll(scopeId, docs.filter((d) => d.id !== id))
}

export async function getLatestAcceptedMedicationEducation(
  scopeId: string,
): Promise<PatientMedicationEducationDocument | null> {
  const docs = await loadMedicationEducationDocuments(scopeId)
  return (
    docs
      .filter((d) => d.status === 'accepted')
      .sort((a, b) => (b.acceptedAt ?? b.updatedAt).localeCompare(a.acceptedAt ?? a.updatedAt))[0] ?? null
  )
}
