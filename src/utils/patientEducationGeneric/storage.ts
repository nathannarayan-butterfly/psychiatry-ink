import type { GenericPatientEducationDocument } from '../../types/patientEducationGeneric'

const STORAGE_KEY = 'psychiatry-ink:patientEducationGeneric'
export const PATIENT_EDUCATION_GENERIC_CHANGED_EVENT = 'patient-education-generic:changed'

function emitChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PATIENT_EDUCATION_GENERIC_CHANGED_EVENT))
}

export function loadGenericEducationDocuments(): GenericPatientEducationDocument[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GenericPatientEducationDocument[]
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

export function saveGenericEducationDocument(
  doc: GenericPatientEducationDocument,
): GenericPatientEducationDocument {
  if (typeof window === 'undefined') return doc
  const list = loadGenericEducationDocuments()
  const index = list.findIndex((d) => d.id === doc.id)
  if (index >= 0) {
    list[index] = doc
  } else {
    list.unshift(doc)
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore quota / serialisation errors
  }
  emitChanged()
  return doc
}

export function deleteGenericEducationDocument(id: string): void {
  if (typeof window === 'undefined') return
  const list = loadGenericEducationDocuments().filter((d) => d.id !== id)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
  emitChanged()
}
