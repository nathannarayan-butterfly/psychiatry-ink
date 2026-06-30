/**
 * KB MedicationEducationTemplate storage — separate from patient documents.
 */

import type {
  MedicationEducationLanguage,
  MedicationEducationTemplate,
} from '../../types/medicationEducation'
import { decryptJsonPayload, encryptJsonPayload, type EncryptedVaultBlob } from '../cryptoVault'

import { CRYPTO_VAULT_STORE, openCryptoVaultDb } from '../cryptoVaultDb'

const VAULT_STORE = CRYPTO_VAULT_STORE
const KB_TEMPLATES_KEY = 'medication-education-kb-templates'

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

export const MEDICATION_EDUCATION_KB_CHANGED_EVENT = 'psychiatry-ink:medication-education-kb:changed'

function notifyChanged(): void {
  try {
    window.dispatchEvent(new CustomEvent(MEDICATION_EDUCATION_KB_CHANGED_EVENT))
  } catch {
    // ignore
  }
}

function templateKey(medicationId: string, language: MedicationEducationLanguage): string {
  return `${medicationId}:${language}`
}

async function loadAll(): Promise<MedicationEducationTemplate[]> {
  const blob = await idbGet<EncryptedVaultBlob>(KB_TEMPLATES_KEY)
  if (!blob) return []
  try {
    const items = await decryptJsonPayload<MedicationEducationTemplate[]>(blob)
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

async function saveAll(items: MedicationEducationTemplate[]): Promise<void> {
  const blob = await encryptJsonPayload(items)
  await idbSet(KB_TEMPLATES_KEY, blob)
  notifyChanged()
}

export async function loadMedicationEducationKbTemplates(): Promise<MedicationEducationTemplate[]> {
  return loadAll()
}

export async function getMedicationEducationKbTemplate(
  medicationId: string,
  language: MedicationEducationLanguage,
): Promise<MedicationEducationTemplate | null> {
  const items = await loadAll()
  const key = templateKey(medicationId, language)
  return items.find((t) => templateKey(t.medicationId, t.language) === key) ?? null
}

export async function saveMedicationEducationKbTemplate(
  template: MedicationEducationTemplate,
): Promise<MedicationEducationTemplate> {
  const items = await loadAll()
  const key = templateKey(template.medicationId, template.language)
  const idx = items.findIndex((t) => templateKey(t.medicationId, t.language) === key)
  const next = [...items]
  if (idx >= 0) next[idx] = template
  else next.push(template)
  await saveAll(next)
  return template
}

export async function deleteMedicationEducationKbTemplate(
  medicationId: string,
  language: MedicationEducationLanguage,
): Promise<void> {
  const items = await loadAll()
  const key = templateKey(medicationId, language)
  await saveAll(items.filter((t) => templateKey(t.medicationId, t.language) !== key))
}

export function createEmptyKbTemplate(params: {
  medicationId: string
  substanceName: string
  brandNames?: string[]
  language?: MedicationEducationLanguage
}): MedicationEducationTemplate {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    medicationId: params.medicationId,
    substanceName: params.substanceName,
    brandNames: params.brandNames ?? [],
    language: params.language ?? 'de',
    region: 'DE',
    version: 1,
    approvalStatus: 'draft',
    sourceRefs: [],
    shortPatientSummary: '',
    mechanismSimple: '',
    whyPrescribed: '',
    whenEffect: '',
    howToTake: '',
    commonSideEffects: '',
    seriousWarnings: '',
    monitoringRequirements: '',
    interactions: '',
    dailyLife: '',
    pregnancyLactation: '',
    ifSideEffects: '',
    missedDose: '',
    drivingWork: '',
    fullLeafletText: '',
    createdAt: now,
    updatedAt: now,
  }
}
