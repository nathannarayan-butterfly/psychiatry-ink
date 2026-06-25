import type { AiMode } from '../../types/aiUsage'
import type {
  ArztbriefDocumentType,
  ArztbriefEvidenceBundle,
  ArztbriefGenerateSectionResponse,
  TherapieVerlaufLength,
} from '../../types/arztbrief'
import { API_BASE } from '../apiClient'
import { getAuthHeaders } from '../authHeaders'

export async function generateArztbriefSectionApi(params: {
  caseId?: string
  documentType: ArztbriefDocumentType
  sectionId: string
  mode: AiMode
  therapieVerlaufLength?: TherapieVerlaufLength
  evidence: ArztbriefEvidenceBundle
  language: 'de' | 'en'
  patientHints?: { patientName?: string; patientDob?: string }
}): Promise<ArztbriefGenerateSectionResponse> {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/arztbrief/generate-section`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      caseId: params.caseId,
      documentType: params.documentType,
      sectionId: params.sectionId,
      mode: params.mode,
      therapieVerlaufLength: params.therapieVerlaufLength ?? 'standard',
      evidence: params.evidence,
      language: params.language,
      patientHints: params.patientHints,
    }),
  })

  const data = (await res.json()) as ArztbriefGenerateSectionResponse & { error?: string; code?: string }

  if (!res.ok) {
    throw new Error(data.error ?? `Arztbrief generation failed (${res.status})`)
  }

  return data
}
