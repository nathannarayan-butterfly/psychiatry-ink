import { API_BASE } from './apiClient'
import { clinicalApiFetch, getClinicalApiLanguage, parseClinicalApiError } from './clinicalApiFetch'
import { getAuthHeaders } from './authHeaders'
import type { EncryptedEnvelope } from '../utils/e2ee'
import type {
  CreateDiscussionInput,
  CreateInviteInput,
  DiscussCaseAnnotation,
  DiscussCaseAuditLog,
  DiscussCaseDiscussion,
  DiscussCaseInvite,
  DiscussCaseListItem,
  DiscussCaseMessage,
  DiscussCaseParticipant,
  DiscussCasePermission,
  DiscussPackageContent,
  DiscussQuoteExcerpt,
} from '../types/discussCase'

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const authHeaders = await getAuthHeaders()
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...init?.headers,
    },
  })
}

const DISCUSS_ERROR_DE: Record<string, string> = {
  'Failed to create discussion': 'Besprechung konnte nicht erstellt werden',
  'Failed to list discussions': 'Besprechungen konnten nicht geladen werden',
  'Authentication required': 'Anmeldung erforderlich',
  'DiscussCase requires Supabase configuration (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)':
    'DiscussCase ist nicht konfiguriert (Supabase fehlt)',
}

function translateDiscussError(error: string): string {
  return DISCUSS_ERROR_DE[error] ?? error
}

export async function listDiscussions(caseId: string): Promise<DiscussCaseListItem[]> {
  const response = await apiFetch(`/api/discuss-case?caseId=${encodeURIComponent(caseId)}`)
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Failed to list discussions (${response.status})`)
  }
  const data = (await response.json()) as { discussions: DiscussCaseListItem[] }
  return data.discussions ?? []
}

export async function createDiscussion(input: CreateDiscussionInput): Promise<{
  discussion: DiscussCaseDiscussion
}> {
  const response = await apiFetch('/api/discuss-case', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(
      translateDiscussError(detail?.error ?? `Besprechung konnte nicht erstellt werden (${response.status})`),
    )
  }
  return (await response.json()) as { discussion: DiscussCaseDiscussion }
}

export interface DiscussSession {
  discussion: DiscussCaseDiscussion
  /**
   * For viewers with identified access this is an E2EE ciphertext envelope that
   * must be decrypted client-side; for external viewers it is plaintext.
   */
  package: DiscussPackageContent | EncryptedEnvelope | null
  participant?: DiscussCaseParticipant
  participants?: DiscussCaseParticipant[]
  permissions: DiscussCasePermission[]
  messages: DiscussCaseMessage[]
  annotations: DiscussCaseAnnotation[]
  /** Configured voice attachment retention (days). */
  voiceRetentionDays?: number
}

export async function loadDiscussSession(discussionId: string): Promise<DiscussSession> {
  const response = await apiFetch(`/api/discuss-case/${encodeURIComponent(discussionId)}/session`)
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Failed to load session (${response.status})`)
  }
  return (await response.json()) as DiscussSession
}

export async function sendDiscussMessage(
  discussionId: string,
  body: string,
  quoteExcerpt?: DiscussQuoteExcerpt | null,
  authorDisplayName?: string,
  replyToMessageId?: string | null,
): Promise<DiscussCaseMessage> {
  const response = await apiFetch(`/api/discuss-case/${encodeURIComponent(discussionId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body, quoteExcerpt, authorDisplayName, replyToMessageId }),
  })
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Failed to send message (${response.status})`)
  }
  const data = (await response.json()) as { message: DiscussCaseMessage }
  return data.message
}

export async function sendDiscussVoiceMessage(
  discussionId: string,
  audio: Blob,
  durationMs: number,
  replyToMessageId?: string | null,
): Promise<DiscussCaseMessage> {
  const arrayBuffer = await audio.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!)
  }
  const audioBase64 = btoa(binary)

  const response = await apiFetch(
    `/api/discuss-case/${encodeURIComponent(discussionId)}/messages/voice`,
    {
      method: 'POST',
      body: JSON.stringify({
        audioBase64,
        mimeType: audio.type || 'audio/webm',
        durationMs,
        replyToMessageId,
      }),
    },
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Sprachnachricht fehlgeschlagen (${response.status})`)
  }
  const data = (await response.json()) as { message: DiscussCaseMessage }
  return data.message
}

export async function fetchDiscussVoiceAudio(
  discussionId: string,
  messageId: string,
): Promise<Blob> {
  const authHeaders = await getAuthHeaders()
  const response = await fetch(
    `${API_BASE}/api/discuss-case/${encodeURIComponent(discussionId)}/messages/${encodeURIComponent(messageId)}/voice`,
    { headers: authHeaders },
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    const error = new Error(detail?.error ?? `Sprachnachricht laden fehlgeschlagen (${response.status})`)
    ;(error as Error & { status?: number }).status = response.status
    throw error
  }
  return response.blob()
}

export async function transcribeDiscussVoiceMessage(
  discussionId: string,
  messageId: string,
  force = false,
): Promise<DiscussCaseMessage> {
  const response = await apiFetch(
    `/api/discuss-case/${encodeURIComponent(discussionId)}/messages/${encodeURIComponent(messageId)}/transcribe`,
    { method: 'POST', body: JSON.stringify({ force }) },
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Transkription fehlgeschlagen (${response.status})`)
  }
  const data = (await response.json()) as { message: DiscussCaseMessage }
  return data.message
}

export async function editDiscussTranscript(
  discussionId: string,
  messageId: string,
  text: string,
): Promise<DiscussCaseMessage> {
  const response = await apiFetch(
    `/api/discuss-case/${encodeURIComponent(discussionId)}/messages/${encodeURIComponent(messageId)}/transcript`,
    { method: 'PATCH', body: JSON.stringify({ text }) },
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Transkript konnte nicht gespeichert werden (${response.status})`)
  }
  const data = (await response.json()) as { message: DiscussCaseMessage }
  return data.message
}

export async function setDiscussMessagePin(
  discussionId: string,
  messageId: string,
  pinned: boolean,
): Promise<DiscussCaseMessage> {
  const response = await apiFetch(
    `/api/discuss-case/${encodeURIComponent(discussionId)}/messages/${encodeURIComponent(messageId)}/pin`,
    { method: 'POST', body: JSON.stringify({ pinned }) },
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Anpinnen fehlgeschlagen (${response.status})`)
  }
  const data = (await response.json()) as { message: DiscussCaseMessage }
  return data.message
}

export async function setDiscussResolutionSummary(
  discussionId: string,
  text: string,
): Promise<DiscussCaseDiscussion> {
  const response = await apiFetch(
    `/api/discuss-case/${encodeURIComponent(discussionId)}/resolution-summary`,
    { method: 'PUT', body: JSON.stringify({ text }) },
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Zusammenfassung konnte nicht gespeichert werden (${response.status})`)
  }
  const data = (await response.json()) as { discussion: DiscussCaseDiscussion }
  return data.discussion
}

export async function sendDiscussTyping(discussionId: string): Promise<void> {
  try {
    await apiFetch(`/api/discuss-case/${encodeURIComponent(discussionId)}/typing`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  } catch {
    /* typing heartbeat is best-effort; ignore transient failures */
  }
}

export async function fetchDiscussPresence(discussionId: string): Promise<string[]> {
  const response = await apiFetch(`/api/discuss-case/${encodeURIComponent(discussionId)}/presence`)
  if (!response.ok) return []
  const data = (await response.json().catch(() => null)) as { typing?: string[] } | null
  return data?.typing ?? []
}

export async function editDiscussMessage(
  discussionId: string,
  messageId: string,
  body: string,
): Promise<DiscussCaseMessage> {
  const response = await apiFetch(
    `/api/discuss-case/${encodeURIComponent(discussionId)}/messages/${encodeURIComponent(messageId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    },
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Nachricht konnte nicht bearbeitet werden (${response.status})`)
  }
  const data = (await response.json()) as { message: DiscussCaseMessage }
  return data.message
}

export async function deleteDiscussMessage(
  discussionId: string,
  messageId: string,
): Promise<void> {
  const response = await apiFetch(
    `/api/discuss-case/${encodeURIComponent(discussionId)}/messages/${encodeURIComponent(messageId)}`,
    { method: 'DELETE' },
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Nachricht konnte nicht gelöscht werden (${response.status})`)
  }
}

export async function fetchDiscussMessages(discussionId: string): Promise<DiscussCaseMessage[]> {
  const response = await apiFetch(`/api/discuss-case/${encodeURIComponent(discussionId)}/messages`)
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Nachrichten konnten nicht geladen werden (${response.status})`)
  }
  const data = (await response.json()) as { messages: DiscussCaseMessage[] }
  return data.messages ?? []
}

export async function toggleDiscussMessageReaction(
  discussionId: string,
  messageId: string,
  emoji: string,
): Promise<DiscussCaseMessage> {
  const response = await apiFetch(
    `/api/discuss-case/${encodeURIComponent(discussionId)}/messages/${encodeURIComponent(messageId)}/reactions`,
    {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    },
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Reaktion fehlgeschlagen (${response.status})`)
  }
  const data = (await response.json()) as { message: DiscussCaseMessage }
  return data.message
}

export async function addDiscussAnnotation(
  discussionId: string,
  input: {
    sectionId: string
    startOffset: number
    endOffset: number
    highlightedText: string
    commentBody?: string
  },
): Promise<DiscussCaseAnnotation> {
  const response = await apiFetch(`/api/discuss-case/${encodeURIComponent(discussionId)}/annotations`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Failed to add annotation (${response.status})`)
  }
  const data = (await response.json()) as { annotation: DiscussCaseAnnotation }
  return data.annotation
}

export async function resolveDiscussAnnotation(
  discussionId: string,
  annotationId: string,
): Promise<DiscussCaseAnnotation> {
  const response = await apiFetch(
    `/api/discuss-case/${encodeURIComponent(discussionId)}/annotations/${encodeURIComponent(annotationId)}/resolve`,
    { method: 'POST' },
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Failed to resolve annotation (${response.status})`)
  }
  const data = (await response.json()) as { annotation: DiscussCaseAnnotation }
  return data.annotation
}

export async function createDiscussInvite(input: CreateInviteInput): Promise<DiscussCaseInvite> {
  const response = await apiFetch(
    `/api/discuss-case/${encodeURIComponent(input.discussionId)}/invites`,
    { method: 'POST', body: JSON.stringify(input) },
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Failed to create invite (${response.status})`)
  }
  const data = (await response.json()) as { invite: DiscussCaseInvite }
  return data.invite
}

export interface DiscussInvitePreview {
  discussion: DiscussCaseDiscussion
  package: DiscussPackageContent | EncryptedEnvelope
  inviteType: 'internal' | 'external'
}

export async function previewDiscussInvite(token: string): Promise<DiscussInvitePreview> {
  const response = await apiFetch('/api/discuss-case/invites/preview', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Vorschau fehlgeschlagen (${response.status})`)
  }
  return (await response.json()) as DiscussInvitePreview
}

export async function acceptDiscussInvite(token: string): Promise<{
  discussion: DiscussCaseDiscussion
}> {
  const response = await apiFetch('/api/discuss-case/invites/accept', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Failed to accept invite (${response.status})`)
  }
  return (await response.json()) as { discussion: DiscussCaseDiscussion }
}

export async function previewPackageAsViewer(input: {
  identifiedContent: DiscussPackageContent
  deidentifiedPackageContent: DiscussPackageContent
  viewAs: 'internal' | 'external'
}): Promise<DiscussPackageContent> {
  const response = await apiFetch('/api/discuss-case/preview-package', {
    method: 'POST',
    body: JSON.stringify({
      identifiedContent: input.identifiedContent,
      deidentifiedPackageContent: input.deidentifiedPackageContent,
      viewAs: input.viewAs,
    }),
  })
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Preview failed (${response.status})`)
  }
  const data = (await response.json()) as { package: DiscussPackageContent }
  return data.package
}

export async function askDiscussAi(
  discussionId: string,
  question: string,
  tier?: 'fast' | 'standard' | 'thorough',
  language = getClinicalApiLanguage(),
): Promise<{ answer: string; draft: boolean }> {
  const response = await clinicalApiFetch(`/api/discuss-case/${encodeURIComponent(discussionId)}/ask-ai`, {
    method: 'POST',
    body: JSON.stringify({ question, tier, language }),
  })
  if (!response.ok) await parseClinicalApiError(response, 'KI-Antwort fehlgeschlagen')
  return (await response.json()) as { answer: string; draft: boolean }
}

export async function listDiscussParticipants(
  discussionId: string,
): Promise<DiscussCaseParticipant[]> {
  const response = await apiFetch(
    `/api/discuss-case/${encodeURIComponent(discussionId)}/participants`,
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Failed to list participants (${response.status})`)
  }
  const data = (await response.json()) as { participants: DiscussCaseParticipant[] }
  return data.participants ?? []
}

export async function revokeDiscussParticipant(
  discussionId: string,
  participantId: string,
): Promise<DiscussCaseParticipant> {
  const response = await apiFetch(
    `/api/discuss-case/${encodeURIComponent(discussionId)}/participants/${encodeURIComponent(participantId)}/revoke`,
    { method: 'POST' },
  )
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Failed to revoke participant (${response.status})`)
  }
  const data = (await response.json()) as { participant: DiscussCaseParticipant }
  return data.participant
}

export async function listDiscussInvites(discussionId: string): Promise<DiscussCaseInvite[]> {
  const response = await apiFetch(`/api/discuss-case/${encodeURIComponent(discussionId)}/invites`)
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Failed to list invites (${response.status})`)
  }
  const data = (await response.json()) as { invites: DiscussCaseInvite[] }
  return data.invites ?? []
}

export async function archiveDiscussion(
  discussionId: string,
  status: 'archived' | 'revoked' = 'archived',
): Promise<DiscussCaseDiscussion> {
  const response = await apiFetch(`/api/discuss-case/${encodeURIComponent(discussionId)}/archive`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  })
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Failed to archive discussion (${response.status})`)
  }
  const data = (await response.json()) as { discussion: DiscussCaseDiscussion }
  return data.discussion
}

export async function deleteDiscussion(discussionId: string): Promise<void> {
  const response = await apiFetch(`/api/discuss-case/${encodeURIComponent(discussionId)}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Besprechung konnte nicht gelöscht werden (${response.status})`)
  }
}

export async function listDiscussAuditLogs(discussionId: string): Promise<DiscussCaseAuditLog[]> {
  const response = await apiFetch(`/api/discuss-case/${encodeURIComponent(discussionId)}/audit-logs`)
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(detail?.error ?? `Failed to list audit logs (${response.status})`)
  }
  const data = (await response.json()) as { logs: DiscussCaseAuditLog[] }
  return data.logs ?? []
}
