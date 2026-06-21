import type { AiMode } from '../../types/aiUsage'
import type {
  MedicationEducationDetailStyle,
  MedicationEducationEvidenceBundle,
  MedicationEducationGenerateSectionResponse,
  MedicationEducationScope,
} from '../../types/medicationEducation'
import { API_BASE } from '../apiClient'
import { getAuthHeaders } from '../authHeaders'

export async function generateMedicationEducationSectionApi(params: {
  caseId?: string
  scope: MedicationEducationScope
  documentVariant: MedicationEducationEvidenceBundle['documentVariant']
  sectionId: string
  mode: AiMode
  detailStyle: MedicationEducationDetailStyle
  evidence: MedicationEducationEvidenceBundle
  language: 'de' | 'en'
  patientHints?: { patientName?: string; patientDob?: string }
}): Promise<MedicationEducationGenerateSectionResponse> {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/medication-education/generate-section`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      caseId: params.caseId,
      scope: params.scope,
      documentVariant: params.documentVariant,
      sectionId: params.sectionId,
      mode: params.mode,
      detailStyle: params.detailStyle,
      evidence: params.evidence,
      language: params.language,
      patientHints: params.patientHints,
    }),
  })

  const data = (await res.json()) as MedicationEducationGenerateSectionResponse & {
    error?: string
    code?: string
  }

  if (!res.ok) {
    throw new Error(data.error ?? `Medication education generation failed (${res.status})`)
  }

  return data
}
