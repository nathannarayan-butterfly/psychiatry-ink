import { API_BASE } from './apiClient'

export interface RemoteUserNote {
  id: string
  title: string
  content: string
  kind: string
  category: string
  pageType: string
  deleted: boolean
  createdAt: string
  updatedAt: string
}

export interface RemoteKbPharmaComment {
  id: string
  medicationId: string
  sectionId: string
  text: string
  highlightId: string | null
  deleted: boolean
  createdAt: string
  updatedAt: string
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
    if (response.status === 503) return null
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function fetchRemoteUserNotes(): Promise<RemoteUserNote[] | null> {
  const data = await fetchJson<{ notes: RemoteUserNote[] }>('/api/user-notes')
  return data?.notes ?? null
}

export async function saveRemoteUserNote(input: {
  id?: string
  title: string
  content: string
  kind?: string
  category?: string
  pageType?: string
}): Promise<RemoteUserNote | null> {
  const data = await fetchJson<{ note: RemoteUserNote }>('/api/user-notes', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data?.note ?? null
}

export async function deleteRemoteUserNote(id: string): Promise<boolean> {
  const data = await fetchJson<{ ok: boolean }>(`/api/user-notes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  return Boolean(data?.ok)
}

export async function fetchRemoteKbPharmaComments(): Promise<RemoteKbPharmaComment[] | null> {
  const data = await fetchJson<{ comments: RemoteKbPharmaComment[] }>('/api/kb-pharma-comments')
  return data?.comments ?? null
}

export async function saveRemoteKbPharmaComment(input: {
  id?: string
  medicationId: string
  sectionId: string
  text: string
  highlightId?: string | null
}): Promise<RemoteKbPharmaComment | null> {
  const data = await fetchJson<{ comment: RemoteKbPharmaComment }>('/api/kb-pharma-comments', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data?.comment ?? null
}

export async function deleteRemoteKbPharmaComment(id: string): Promise<boolean> {
  const data = await fetchJson<{ ok: boolean }>(`/api/kb-pharma-comments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  return Boolean(data?.ok)
}
