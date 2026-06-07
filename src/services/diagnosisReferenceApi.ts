import { API_BASE } from './apiClient'

export type DiagnosisCodeSystem = 'icd10' | 'icd11' | 'dsm5tr'

export interface DiagnosisSearchHit {
  system: DiagnosisCodeSystem
  code: string
  label: string
  icd10Code: string
  icd10Label: string
  icd11Code: string
  icd11Label: string
  dsmCode: string
  dsmLabel: string
}

export type ClientCodingSystem = 'icd10' | 'icd11' | 'dsm'

export function toApiSystem(system: ClientCodingSystem): DiagnosisCodeSystem {
  if (system === 'dsm') return 'dsm5tr'
  return system
}

export async function searchDiagnosisCodes(
  query: string,
  system: ClientCodingSystem,
  limit = 12,
): Promise<DiagnosisSearchHit[]> {
  const q = query.trim()
  if (!q) return []

  const params = new URLSearchParams({
    q,
    system: toApiSystem(system),
    limit: String(limit),
  })

  const response = await fetch(`${API_BASE}/api/diagnosis-codes/search?${params}`)
  if (!response.ok) {
    throw new Error(`Diagnosis search failed (${response.status})`)
  }

  const data = (await response.json()) as { results?: DiagnosisSearchHit[] }
  return data.results ?? []
}

export async function fetchCrosswalkByIcd10(icd10Code: string): Promise<DiagnosisSearchHit | null> {
  const code = icd10Code.trim()
  if (!code) return null

  const params = new URLSearchParams({ icd10: code })
  const response = await fetch(`${API_BASE}/api/diagnosis-codes/crosswalk?${params}`)
  if (!response.ok) {
    throw new Error(`Crosswalk lookup failed (${response.status})`)
  }

  const data = (await response.json()) as { crosswalk?: DiagnosisSearchHit | null }
  return data.crosswalk ?? null
}
