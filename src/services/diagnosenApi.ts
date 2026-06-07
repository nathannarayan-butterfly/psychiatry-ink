import { API_BASE } from './apiClient'
import { getAuthHeaders } from './authHeaders'
import type { DiagnoseEntry } from '../utils/diagnosenArchive'

export async function fetchDiagnosesFromApi(caseId: string): Promise<DiagnoseEntry[]> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}/api/patients/${encodeURIComponent(caseId)}/diagnoses`, {
    headers,
  })
  if (!response.ok) {
    throw new Error(`Failed to load diagnoses (${response.status})`)
  }
  const data = (await response.json()) as { diagnoses?: DiagnoseEntry[] }
  return data.diagnoses ?? []
}

export async function saveDiagnosesToApi(caseId: string, entries: DiagnoseEntry[]): Promise<void> {
  const headers = {
    ...(await getAuthHeaders()),
    'Content-Type': 'application/json',
  }
  const response = await fetch(`${API_BASE}/api/patients/${encodeURIComponent(caseId)}/diagnoses`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ diagnoses: entries }),
  })
  if (!response.ok) {
    throw new Error(`Failed to save diagnoses (${response.status})`)
  }
}
