import type { AiMode } from '../../types/aiUsage'
import type {
  DischargeSummaryDocumentType,
  DischargeSummaryEvidenceBundle,
  DischargeSummaryGenerateSectionResponse,
  DischargeSummaryRegion,
  HospitalCourseLength,
} from '../../types/dischargeSummary'
import { API_BASE } from '../apiClient'
import { getAuthHeaders } from '../authHeaders'

export async function generateDischargeSummarySectionApi(params: {
  caseId?: string
  documentType: DischargeSummaryDocumentType
  region: DischargeSummaryRegion
  sectionId: string
  mode: AiMode
  hospitalCourseLength?: HospitalCourseLength
  evidence: DischargeSummaryEvidenceBundle
  patientHints?: { patientName?: string; patientDob?: string }
}): Promise<DischargeSummaryGenerateSectionResponse> {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/discharge-summary/generate-section`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      caseId: params.caseId,
      documentType: params.documentType,
      region: params.region,
      sectionId: params.sectionId,
      mode: params.mode,
      hospitalCourseLength: params.hospitalCourseLength ?? 'standard',
      evidence: params.evidence,
      patientHints: params.patientHints,
    }),
  })

  const data = (await res.json()) as DischargeSummaryGenerateSectionResponse & {
    error?: string
    code?: string
  }

  if (!res.ok) {
    throw new Error(data.error ?? `Discharge summary generation failed (${res.status})`)
  }

  return data
}
