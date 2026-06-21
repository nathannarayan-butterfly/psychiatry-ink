/**
 * Sync accepted medication education documents to patient Dokumente archive.
 */

import type { PatientMedicationEducationDocument } from '../../types/medicationEducation'
import { syncSourceDokumente } from '../dokumenteArchive'
import { assembleMedicationEducationText, formatAcceptedDocumentTitle } from './export'
import { getMedicationEducationSections } from '../../data/medicationEducationSections'

export function syncAcceptedMedicationEducationToPatientFile(
  doc: PatientMedicationEducationDocument,
): void {
  if (!doc.caseId || doc.status !== 'accepted') return

  const defs = getMedicationEducationSections(doc.scope, { includePregnancy: true })
  const labels: Record<string, string> = {}
  for (const d of defs) {
    labels[d.id] = doc.language === 'en' ? d.labelEn : d.labelDe
  }

  const content = doc.finalText ?? assembleMedicationEducationText(doc, labels)
  const title = formatAcceptedDocumentTitle(doc.acceptedAt ?? doc.updatedAt, doc.language)

  syncSourceDokumente(doc.caseId, [
    {
      category: 'formulare',
      title,
      content,
      date: doc.acceptedAt ?? doc.updatedAt,
      source: 'ai-accepted',
      pageType: 'medikation',
      sourceRefId: doc.id,
      sectionLabel: 'Patientenaufklärung Medikation',
    },
  ])
}
