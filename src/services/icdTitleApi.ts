import type { IcdTitleLookupItem, IcdTitleResult, IcdTitleVersion } from '../../shared/icdTitle'
import { API_BASE } from './apiClient'

export type { IcdTitleResult, IcdTitleVersion }

export async function fetchIcdDisplayTitle(
  code: string,
  version: IcdTitleVersion,
  language = 'de',
): Promise<IcdTitleResult | null> {
  const trimmed = code.trim()
  if (!trimmed) return null

  const params = new URLSearchParams({
    code: trimmed,
    version,
    language,
  })

  try {
    const response = await fetch(`${API_BASE}/api/icd/title?${params}`)
    if (!response.ok) return null
    return (await response.json()) as IcdTitleResult
  } catch {
    return null
  }
}

export async function fetchIcdDisplayTitles(
  items: IcdTitleLookupItem[],
  language = 'de',
): Promise<IcdTitleResult[]> {
  if (items.length === 0) return []

  try {
    const response = await fetch(`${API_BASE}/api/icd/titles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, language }),
    })
    if (!response.ok) return []
    const data = (await response.json()) as { titles?: IcdTitleResult[] }
    return data.titles ?? []
  } catch {
    return []
  }
}
