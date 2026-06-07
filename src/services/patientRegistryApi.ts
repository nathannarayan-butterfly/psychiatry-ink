import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import type { LocalCaseMeta, LocalGeschlecht } from '../hooks/useCaseRegistry'

export interface ApiPatientRecord {
  caseId: string
  localName?: string
  localVorname?: string
  localNachname?: string
  localGeburtsdatum?: string
  localGeschlecht?: LocalGeschlecht
  localAge?: string
  pageHeading?: string
  lastDocumentType?: string
  lastOpened: string
  createdAt: string
}

function toLocalCaseMeta(row: ApiPatientRecord): LocalCaseMeta {
  return {
    caseId: row.caseId,
    localName: row.localName,
    localVorname: row.localVorname,
    localNachname: row.localNachname,
    localGeburtsdatum: row.localGeburtsdatum,
    localGeschlecht: row.localGeschlecht,
    localAge: row.localAge,
    pageHeading: row.pageHeading,
    lastDocumentType: row.lastDocumentType,
    lastOpened: row.lastOpened,
    createdAt: row.createdAt,
  }
}

export async function fetchPatientsFromApi(): Promise<LocalCaseMeta[]> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}/api/patients`, { headers })
  if (!response.ok) {
    throw new Error(`Failed to load patients (${response.status})`)
  }
  const data = (await response.json()) as { patients?: ApiPatientRecord[] }
  return (data.patients ?? []).map(toLocalCaseMeta)
}

export async function upsertPatientOnApi(meta: LocalCaseMeta): Promise<LocalCaseMeta> {
  const headers = {
    ...(await getAuthHeaders()),
    'Content-Type': 'application/json',
  }
  const response = await fetch(`${API_BASE}/api/patients/${encodeURIComponent(meta.caseId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      localName: meta.localName ?? null,
      localVorname: meta.localVorname ?? null,
      localNachname: meta.localNachname ?? null,
      localGeburtsdatum: meta.localGeburtsdatum ?? null,
      localGeschlecht: meta.localGeschlecht ?? null,
      localAge: meta.localAge ?? null,
      pageHeading: meta.pageHeading ?? null,
      lastDocumentType: meta.lastDocumentType ?? null,
      lastOpened: meta.lastOpened,
      createdAt: meta.createdAt,
    }),
  })
  if (!response.ok) {
    throw new Error(`Failed to save patient (${response.status})`)
  }
  const data = (await response.json()) as { patient?: ApiPatientRecord }
  return data.patient ? toLocalCaseMeta(data.patient) : meta
}

export async function createPatientOnApi(meta: LocalCaseMeta): Promise<LocalCaseMeta> {
  const headers = {
    ...(await getAuthHeaders()),
    'Content-Type': 'application/json',
  }
  const response = await fetch(`${API_BASE}/api/patients`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      caseId: meta.caseId,
      localName: meta.localName ?? null,
      localVorname: meta.localVorname ?? null,
      localNachname: meta.localNachname ?? null,
      localGeburtsdatum: meta.localGeburtsdatum ?? null,
      localGeschlecht: meta.localGeschlecht ?? null,
      localAge: meta.localAge ?? null,
      pageHeading: meta.pageHeading ?? null,
      lastDocumentType: meta.lastDocumentType ?? null,
      lastOpened: meta.lastOpened,
      createdAt: meta.createdAt,
    }),
  })
  if (!response.ok) {
    throw new Error(`Failed to create patient (${response.status})`)
  }
  const data = (await response.json()) as { patient?: ApiPatientRecord }
  return data.patient ? toLocalCaseMeta(data.patient) : meta
}
