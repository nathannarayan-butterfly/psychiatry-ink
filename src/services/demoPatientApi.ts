import type { DemoPatientFixture } from '../demo/types'
import { clinicalApiFetch } from './clinicalApiFetch'

export interface CanonicalDemoPatientResponse {
  seedVersion: string
  fixture: DemoPatientFixture
  publishedBy: string | null
  publishedByEmail: string | null
  publishedAt: string
}

export async function fetchCanonicalDemoPatient(): Promise<CanonicalDemoPatientResponse | null> {
  const response = await clinicalApiFetch('/api/demo-patient/canonical')
  if (response.status === 404) return null
  if (response.status === 503) return null
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Failed to fetch canonical demo patient (${response.status})`)
  }
  return (await response.json()) as CanonicalDemoPatientResponse
}

export async function publishCanonicalDemoPatient(
  fixture: DemoPatientFixture,
): Promise<CanonicalDemoPatientResponse> {
  const response = await clinicalApiFetch('/api/demo-patient/canonical', {
    method: 'PUT',
    body: JSON.stringify({ fixture }),
  })
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as {
      error?: string
      validation?: { errors?: Array<{ message: string }> }
    } | null
    const validationMsg = detail?.validation?.errors?.map((entry) => entry.message).join('; ')
    throw new Error(validationMsg ?? detail?.error ?? `Publish failed (${response.status})`)
  }
  return (await response.json()) as CanonicalDemoPatientResponse
}
