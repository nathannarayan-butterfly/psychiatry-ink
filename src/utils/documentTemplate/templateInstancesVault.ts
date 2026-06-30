/**
 * Encrypted per-case storage for in-progress template wizard sessions.
 */

import type { TemplateInstance } from '../../types/documentTemplate'
import { decryptJsonPayload, encryptJsonPayload, type EncryptedVaultBlob } from '../cryptoVault'
import { CRYPTO_VAULT_STORE, openCryptoVaultDb } from '../cryptoVaultDb'

const VAULT_STORE = CRYPTO_VAULT_STORE

function vaultKey(caseId: string): string {
  return `template-instances:${caseId}`
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

export const TEMPLATE_INSTANCES_CHANGED_EVENT = 'psychiatry-ink:template-instances:changed'

function notifyChanged(caseId: string): void {
  try {
    window.dispatchEvent(
      new CustomEvent(TEMPLATE_INSTANCES_CHANGED_EVENT, { detail: { caseId } }),
    )
  } catch {
    // ignore
  }
}

async function loadBlob(caseId: string): Promise<EncryptedVaultBlob | null> {
  return idbGet<EncryptedVaultBlob>(VAULT_STORE, vaultKey(caseId))
}

async function saveInstances(caseId: string, instances: TemplateInstance[]): Promise<void> {
  const blob = await encryptJsonPayload(instances)
  await idbSet(VAULT_STORE, vaultKey(caseId), blob)
  notifyChanged(caseId)
}

export async function loadTemplateInstances(caseId: string): Promise<TemplateInstance[]> {
  const blob = await loadBlob(caseId)
  if (!blob) return []
  try {
    const items = await decryptJsonPayload<TemplateInstance[]>(blob)
    return Array.isArray(items) ? items.filter((i) => i.status !== 'abandoned') : []
  } catch {
    return []
  }
}

export async function getTemplateInstance(
  caseId: string,
  id: string,
): Promise<TemplateInstance | null> {
  const items = await loadTemplateInstances(caseId)
  return items.find((i) => i.id === id) ?? null
}

export async function saveTemplateInstance(
  caseId: string,
  instance: TemplateInstance,
): Promise<TemplateInstance> {
  const blob = await loadBlob(caseId)
  let items: TemplateInstance[] = []
  if (blob) {
    try {
      items = (await decryptJsonPayload<TemplateInstance[]>(blob)) ?? []
      if (!Array.isArray(items)) items = []
    } catch {
      items = []
    }
  }
  const idx = items.findIndex((i) => i.id === instance.id)
  const next = [...items]
  if (idx >= 0) next[idx] = instance
  else next.unshift(instance)
  await saveInstances(caseId, next)
  return instance
}

export async function findInProgressInstance(
  caseId: string,
  templateId: string,
): Promise<TemplateInstance | null> {
  const items = await loadTemplateInstances(caseId)
  return (
    items.find((i) => i.templateId === templateId && i.status === 'in_progress') ?? null
  )
}
