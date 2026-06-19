/**
 * Hydration of the encrypted-at-rest PHI localStorage durability caches.
 *
 * Several therapy-plan feature stores keep a synchronous in-memory cache backed by an
 * encrypted localStorage durability copy (ciphertext via the device vault crypto). Because
 * decryption is asynchronous, their synchronous merge logic relies on a decrypted "shadow"
 * that must be populated BEFORE the workspace vault applies its snapshot — otherwise the
 * newer-wins reconciliation in each store's `apply*` cannot see locally-persisted edits
 * that were not yet flushed into the vault.
 *
 * `hydrateLocalClinicalCaches` is awaited at the top of the workspace-vault load so the
 * ordering guarantee holds, and it also performs the one-time legacy plaintext → ciphertext
 * migration for each cache. It never rejects: each store's hydration is best-effort.
 */

import { hydrateComplementaryTherapiesFromEncryptedLocal } from './complementaryTherapy/storage'
import { hydrateDiagnosenFromEncryptedLocal } from './diagnosenArchive'
import { hydrateMedicationPlanFromEncryptedLocal } from './medication/storage'
import { hydrateNotionDocumentsFromEncryptedLocal } from './notionDocumentActions'
import { hydratePsychotherapyPlanFromEncryptedLocal } from './psychotherapy/storage'
import { hydratePsychopathFindingFromEncryptedLocal } from './overview/psychopathFindingStorage'
import { hydrateSozialtherapieFromEncryptedLocal } from './sozialtherapie/storage'
import { hydrateWeitereTherapieFromEncryptedLocal } from './weitereTherapie/storage'
import { hydrateAnforderungenFromEncryptedLocal } from './anforderungen/storage'

export async function hydrateLocalClinicalCaches(caseId: string): Promise<void> {
  await Promise.allSettled([
    hydrateMedicationPlanFromEncryptedLocal(caseId),
    hydratePsychotherapyPlanFromEncryptedLocal(caseId),
    hydratePsychopathFindingFromEncryptedLocal(caseId),
    hydrateComplementaryTherapiesFromEncryptedLocal(caseId),
    hydrateWeitereTherapieFromEncryptedLocal(caseId),
    hydrateAnforderungenFromEncryptedLocal(caseId),
    hydrateSozialtherapieFromEncryptedLocal(caseId),
    hydrateNotionDocumentsFromEncryptedLocal(caseId),
    hydrateDiagnosenFromEncryptedLocal(caseId),
  ])
}
