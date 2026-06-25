import { caseStorageKey } from './caseContext'

const IDB_NAME = 'psychiatry-ink-crypto'
const VAULT_STORE = 'vault'

async function idbDelete(store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)
    request.onerror = () => reject(request.error ?? new Error('idb open failed'))
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('idb delete failed'))
    }
  })
}

const CASE_SCOPED_PREFIXES = [
  'psychiatry-ink:notion-document',
  'psychiatry-ink:notion-page-heading',
  'psychiatry-ink:notion-page-date',
  'psychiatry-ink:notion-page-time',
  'psychiatry-ink:verlaufFeed',
  'psychiatry-ink:verlaufAnnotations',
  'psychiatry-ink:diagnostikBefunde',
  'psychiatry-ink:dokumenteArchive',
  'psychiatry-ink:sozialtherapie',
  'psychiatry-ink:timelines',
  'psychiatry-ink:active-timeline',
  'psychiatry-ink:lab-graphs',
  'psychiatry-ink:active-lab-graph',
  'psychiatry-ink:clinical-imprint',
  'psychiatry-ink:isdm',
  'psychiatry-ink:medication-plan',
  'psychiatry-ink:psychotherapy-plan',
  'psychiatry-ink:complementary-therapies',
  'psychiatry-ink:weitere-therapie',
  'diagnosen',
  'psychiatry-ink:combination-findings',
  'psychiatry-ink:lab-med-correlations',
  'psychiatry-ink:prep-ai-cache',
]

const CASE_EXACT_KEYS = ['psychiatry-ink:clinical-intelligence:case']

function removeLocalStorageKeysForCase(caseId: string): void {
  const suffix = `::${caseId}`
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key) continue
    if (key.endsWith(suffix)) keysToRemove.push(key)
    for (const prefix of CASE_SCOPED_PREFIXES) {
      if (key === caseStorageKey(prefix, caseId)) keysToRemove.push(key)
    }
    for (const prefix of CASE_EXACT_KEYS) {
      if (key === `${prefix}:${caseId}`) keysToRemove.push(key)
    }
  }
  for (const key of new Set(keysToRemove)) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }
}

async function removeIndexedDbKeysForCase(caseId: string): Promise<void> {
  try {
    await idbDelete(VAULT_STORE, `workspace:${caseId}`)
    await idbDelete(VAULT_STORE, `patient:${caseId}`)
    await idbDelete(VAULT_STORE, `generated-docs:${caseId}`)
  } catch {
    // ignore — not in browser or idb unavailable
  }
}

/** Remove all local case-scoped storage (localStorage + IndexedDB vault) for a case id. */
export async function clearCaseStorage(caseId: string): Promise<void> {
  removeLocalStorageKeysForCase(caseId)
  await removeIndexedDbKeysForCase(caseId)
}
