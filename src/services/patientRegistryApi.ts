import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import type { LocalCaseMeta } from '../hooks/useCaseRegistry'

/** Opaque case record from the server — no patient-identifying fields. */
export interface ApiCaseRecord {
  caseId: string
  lastDocumentType?: string
  lastOpened: string
  createdAt: string
}

export function toServerCasePayload(meta: LocalCaseMeta): ApiCaseRecord {
  return {
    caseId: meta.caseId,
    lastDocumentType: meta.lastDocumentType,
    lastOpened: meta.lastOpened,
    createdAt: meta.createdAt,
  }
}

/** Merge server sync fields with locally stored PII (names, DOB, etc.). */
export function mergeServerCaseWithLocal(api: ApiCaseRecord, local?: LocalCaseMeta): LocalCaseMeta {
  return {
    caseId: api.caseId,
    lastOpened: api.lastOpened,
    createdAt: api.createdAt,
    lastDocumentType: api.lastDocumentType ?? local?.lastDocumentType,
    localName: local?.localName,
    localVorname: local?.localVorname,
    localNachname: local?.localNachname,
    localGeburtsdatum: local?.localGeburtsdatum,
    localGeschlecht: local?.localGeschlecht,
    localAge: local?.localAge,
    pageHeading: local?.pageHeading,
    isDemoPatient: local?.isDemoPatient,
    demoSeedVersion: local?.demoSeedVersion,
    demoPatientId: local?.demoPatientId,
  }
}

export async function fetchPatientsFromApi(): Promise<ApiCaseRecord[]> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}/api/patients`, { headers })
  if (!response.ok) {
    throw new Error(`Failed to load patients (${response.status})`)
  }
  const data = (await response.json()) as { patients?: ApiCaseRecord[] }
  return data.patients ?? []
}

export async function upsertPatientOnApi(meta: LocalCaseMeta): Promise<ApiCaseRecord> {
  const payload = toServerCasePayload(meta)
  const headers = {
    ...(await getAuthHeaders()),
    'Content-Type': 'application/json',
  }
  const response = await fetch(`${API_BASE}/api/patients/${encodeURIComponent(meta.caseId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      lastDocumentType: payload.lastDocumentType ?? null,
      lastOpened: payload.lastOpened,
      createdAt: payload.createdAt,
    }),
  })
  if (!response.ok) {
    throw new Error(`Failed to save patient (${response.status})`)
  }
  const data = (await response.json()) as { patient?: ApiCaseRecord }
  return data.patient ?? payload
}

export async function createPatientOnApi(meta: LocalCaseMeta): Promise<ApiCaseRecord> {
  const payload = toServerCasePayload(meta)
  const headers = {
    ...(await getAuthHeaders()),
    'Content-Type': 'application/json',
  }
  const response = await fetch(`${API_BASE}/api/patients`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      caseId: payload.caseId,
      lastDocumentType: payload.lastDocumentType ?? null,
      lastOpened: payload.lastOpened,
      createdAt: payload.createdAt,
    }),
  })
  if (!response.ok) {
    throw new Error(`Failed to create patient (${response.status})`)
  }
  const data = (await response.json()) as { patient?: ApiCaseRecord }
  return data.patient ?? payload
}
