/**
 * Encrypted per-case storage for in-progress guided entry wizard sessions.
 * Mirrors templateInstancesVault pattern for Template Completion reuse.
 */

import type { GuidedEntryInstance } from '../../types/guidedEntry'
import { decryptJsonPayload, encryptJsonPayload, type EncryptedVaultBlob } from '../cryptoVault'

const IDB_NAME = 'psychiatry-ink-crypto'
const IDB_VERSION = 1
const VAULT_STORE = 'vault'

function vaultKey(caseId: string): string {
  return `guided-entry-instances:${caseId}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(VAULT_STORE)) db.createObjectStore(VAULT_STORE)
    }
  })
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readonly')
    const req = tx.objectStore(VAULT_STORE).get(key)
    req.onerror = () => reject(req.error ?? new Error('idb get failed'))
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null)
  })
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readwrite')
    tx.objectStore(VAULT_STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('idb set failed'))
  })
}

export const GUIDED_ENTRY_INSTANCES_CHANGED = 'psychiatry-ink:guided-entry-instances:changed'

function notifyChanged(caseId: string): void {
  try {
    window.dispatchEvent(
      new CustomEvent(GUIDED_ENTRY_INSTANCES_CHANGED, { detail: { caseId } }),
    )
  } catch {
    // ignore
  }
}

async function loadBlob(caseId: string): Promise<EncryptedVaultBlob | null> {
  return idbGet<EncryptedVaultBlob>(vaultKey(caseId))
}

async function saveInstances(caseId: string, instances: GuidedEntryInstance[]): Promise<void> {
  const blob = await encryptJsonPayload(instances)
  await idbSet(vaultKey(caseId), blob)
  notifyChanged(caseId)
}

export async function loadGuidedEntryInstances(caseId: string): Promise<GuidedEntryInstance[]> {
  const blob = await loadBlob(caseId)
  if (!blob) return []
  try {
    const items = await decryptJsonPayload<GuidedEntryInstance[]>(blob)
    return Array.isArray(items) ? items.filter((i) => i.status !== 'abandoned') : []
  } catch {
    return []
  }
}

export async function getGuidedEntryInstance(
  caseId: string,
  id: string,
): Promise<GuidedEntryInstance | null> {
  const items = await loadGuidedEntryInstances(caseId)
  return items.find((i) => i.id === id) ?? null
}

export async function saveGuidedEntryInstance(
  caseId: string,
  instance: GuidedEntryInstance,
): Promise<GuidedEntryInstance> {
  const blob = await loadBlob(caseId)
  let items: GuidedEntryInstance[] = []
  if (blob) {
    try {
      items = (await decryptJsonPayload<GuidedEntryInstance[]>(blob)) ?? []
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

export async function findInProgressGuidedEntry(
  caseId: string,
  itemType: GuidedEntryInstance['itemType'],
): Promise<GuidedEntryInstance | null> {
  const items = await loadGuidedEntryInstances(caseId)
  return items.find((i) => i.itemType === itemType && i.status === 'draft') ?? null
}

export async function abandonGuidedEntryInstance(
  caseId: string,
  id: string,
): Promise<void> {
  const blob = await loadBlob(caseId)
  if (!blob) return
  try {
    const items = (await decryptJsonPayload<GuidedEntryInstance[]>(blob)) ?? []
    const next = items.map((i) =>
      i.id === id ? { ...i, status: 'abandoned' as const, updatedAt: new Date().toISOString() } : i,
    )
    await saveInstances(caseId, next)
  } catch {
    // ignore
  }
}
