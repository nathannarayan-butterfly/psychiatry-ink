import type {
  GenericEducationGenerateSectionRequest,
  GenericEducationGenerateSectionResponse,
} from '../../types/patientEducationGeneric'
import { API_BASE } from '../apiClient'
import { getAuthHeaders } from '../authHeaders'

export async function generatePatientEducationGenericSectionApi(
  params: GenericEducationGenerateSectionRequest,
): Promise<GenericEducationGenerateSectionResponse> {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/patient-education-generic/generate-section`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  const data = (await res.json()) as GenericEducationGenerateSectionResponse & {
    error?: string
    code?: string
  }

  if (!res.ok) {
    throw new Error(data.error ?? `Patient education generation failed (${res.status})`)
  }

  return data
}
