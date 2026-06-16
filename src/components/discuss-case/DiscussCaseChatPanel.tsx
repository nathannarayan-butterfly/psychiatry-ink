import { Check, Copy, MessageSquare, Pencil, RefreshCw, Send, Sparkles, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  DiscussCaseMessage,
  DiscussCaseParticipant,
  DiscussCasePermission,
  DiscussQuoteExcerpt,
} from '../../types/discussCase'
import {
  askDiscussAi,
  deleteDiscussMessage,
  editDiscussMessage,
  sendDiscussMessage,
} from '../../services/discussCaseApi'
import { getParticipantColor } from '../../utils/discussCase/participantColors'

interface DiscussCaseChatPanelProps {
  discussionId: string
  permissions: DiscussCasePermission[]
  messages: DiscussCaseMessage[]
  onMessagesChange: (messages: DiscussCaseMessage[]) => void
  quoteDraft?: DiscussQuoteExcerpt | null
  onQuoteConsumed?: () => void
  onSaveDraftToCase?: (text: string) => void
  participants?: DiscussCaseParticipant[]
  currentUserId?: string
  embedded?: boolean
}

const ROLE_TAGS: Record<DiscussCaseParticipant['role'], string> = {
  owner: 'Eigentümer',
  internal: 'Intern',
  external: 'Extern',
}

/** Group consecutive messages by the same author within this window (ms). */
const GROUP_WINDOW_MS = 5 * 60 * 1000

function authorInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return trimmed.slice(0, 2).toUpperCase()
}

function formatMessageTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function DiscussCaseChatPanel({
  discussionId,
  permissions,
  messages,
  onMessagesChange,
  quoteDraft,
  onQuoteConsumed,
  onSaveDraftToCase,
  participants,
  currentUserId,
  embedded = false,
}: DiscussCaseChatPanelProps) {
  const participantByUserId = new Map(
    (participants ?? []).map((p) => [p.userId, p]),
  )

  const resolveAuthor = (message: DiscussCaseMessage): { name: string; tag: string | null } => {
    const participant = participantByUserId.get(message.authorUserId)
    const isSelf = currentUserId && message.authorUserId === currentUserId
    const name = isSelf
      ? 'Sie'
      : message.authorDisplayName || message.authorUserId.slice(0, 8)
    return { name, tag: participant ? ROLE_TAGS[participant.role] : null }
  }
  const [messageDraft, setMessageDraft] = useState('')
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiDraft, setAiDraft] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [actionBusyId, setActionBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const canSend = permissions.includes('send_message')
  const canAskAi = permissions.includes('ask_ai')
  const canSaveToCase = permissions.includes('save_to_case')

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, aiDraft])

  useEffect(() => {
    if (!quoteDraft) return
    setMessageDraft((prev) => {
      const quote = `> ${quoteDraft.text}\n\n`
      return prev.startsWith('>') ? prev : `${quote}${prev}`
    })
    onQuoteConsumed?.()
  }, [quoteDraft, onQuoteConsumed])

  const handleSend = useCallback(async () => {
    const body = messageDraft.trim()
    if (!body || !canSend || sending) return
    setSending(true)
    try {
      const message = await sendDiscussMessage(discussionId, body)
      onMessagesChange([...messages, message])
      setMessageDraft('')
    } finally {
      setSending(false)
    }
  }, [canSend, discussionId, messageDraft, messages, sending])

  const beginEdit = useCallback((message: DiscussCaseMessage) => {
    setEditingId(message.id)
    setEditDraft(message.body)
    setActionError(null)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditDraft('')
  }, [])

  const saveEdit = useCallback(
    async (message: DiscussCaseMessage) => {
      const body = editDraft.trim()
      if (!body || actionBusyId) return
      if (body === message.body) {
        cancelEdit()
        return
      }
      setActionBusyId(message.id)
      setActionError(null)
      try {
        const updated = await editDiscussMessage(discussionId, message.id, body)
        onMessagesChange(messages.map((m) => (m.id === updated.id ? updated : m)))
        setEditingId(null)
        setEditDraft('')
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Bearbeiten fehlgeschlagen')
      } finally {
        setActionBusyId(null)
      }
    },
    [actionBusyId, cancelEdit, discussionId, editDraft, messages, onMessagesChange],
  )

  const handleDelete = useCallback(
    async (message: DiscussCaseMessage) => {
      if (actionBusyId) return
      const confirmed = window.confirm('Nachricht löschen? Dies kann nicht rückgängig gemacht werden.')
      if (!confirmed) return
      setActionBusyId(message.id)
      setActionError(null)
      try {
        await deleteDiscussMessage(discussionId, message.id)
        onMessagesChange(messages.filter((m) => m.id !== message.id))
        if (editingId === message.id) cancelEdit()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen')
      } finally {
        setActionBusyId(null)
      }
    },
    [actionBusyId, cancelEdit, discussionId, editingId, messages, onMessagesChange],
  )

  const handleAskAi = useCallback(async () => {
    const question = aiQuestion.trim()
    if (!question || !canAskAi || aiLoading) return
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await askDiscussAi(discussionId, question)
      setAiDraft(result.answer)
      setAiQuestion('')
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'KI-Anfrage fehlgeschlagen')
    } finally {
      setAiLoading(false)
    }
  }, [aiLoading, aiQuestion, canAskAi, discussionId])

  const handleInsertAiDraft = useCallback(() => {
    if (!aiDraft) return
    setMessageDraft((prev) => `${prev}${prev ? '\n\n' : ''}${aiDraft}`)
    setAiDraft(null)
  }, [aiDraft])

  return (
    <aside className={['discuss-case-chat', embedded ? 'discuss-case-chat--embedded' : ''].join(' ').trim()}>
      {!embedded ? (
        <header className="discuss-case-chat__header">
          <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
          <h2 className="discuss-case-chat__title">Diskussion</h2>
        </header>
      ) : null}

      <div className="discuss-case-chat__messages">
        {messages.length === 0 ? (
          <div className="discuss-case-chat__empty-state">
            <span className="discuss-case-chat__empty-icon" aria-hidden="true">
              <MessageSquare className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <p className="discuss-case-chat__empty-title">Noch keine Nachrichten</p>
            <p className="discuss-case-chat__empty-hint">
              Starten Sie die Diskussion oder zitieren Sie eine Stelle aus dem Dokument.
            </p>
          </div>
        ) : (
          messages.map((message, index) => {
            const author = resolveAuthor(message)
            const isSelf = Boolean(currentUserId && message.authorUserId === currentUserId)
            const color = isSelf ? null : getParticipantColor(message.authorUserId)
            const prev = messages[index - 1]
            const grouped =
              Boolean(prev) &&
              prev.authorUserId === message.authorUserId &&
              new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() <
                GROUP_WINDOW_MS
            const canModify = isSelf && canSend
            const isEditing = editingId === message.id
            const busy = actionBusyId === message.id
            return (
              <article
                key={message.id}
                className={[
                  'discuss-case-chat__message',
                  isSelf ? 'discuss-case-chat__message--self' : 'discuss-case-chat__message--other',
                  grouped ? 'discuss-case-chat__message--grouped' : '',
                ].join(' ').trim()}
              >
                {!isSelf ? (
                  <span
                    className="discuss-case-chat__avatar discuss-case-avatar"
                    style={
                      color
                        ? { backgroundColor: color.bg, color: color.text, borderColor: color.border }
                        : undefined
                    }
                    aria-hidden={grouped ? 'true' : undefined}
                  >
                    {grouped ? '' : authorInitials(author.name)}
                  </span>
                ) : null}
                <div className="discuss-case-chat__message-content">
                  {!grouped ? (
                    <header className="discuss-case-chat__message-meta">
                      <span
                        className="discuss-case-chat__message-author"
                        style={color ? { color: color.text } : undefined}
                      >
                        {author.name}
                        {author.tag ? (
                          <span className="discuss-case-chat__message-role">{author.tag}</span>
                        ) : null}
                      </span>
                      <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                    </header>
                  ) : null}
                  <div
                    className="discuss-case-chat__message-bubble"
                    style={
                      color
                        ? {
                            backgroundColor: color.bg,
                            borderColor: color.border,
                          }
                        : undefined
                    }
                  >
                    {message.quoteExcerpt ? (
                      <blockquote className="discuss-case-chat__quote">
                        {message.quoteExcerpt.text}
                      </blockquote>
                    ) : null}
                    {isEditing ? (
                      <div className="discuss-case-chat__message-edit">
                        <textarea
                          className="discuss-case-chat__input discuss-case-chat__message-edit-input"
                          rows={3}
                          autoFocus
                          value={editDraft}
                          disabled={busy}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault()
                              void saveEdit(message)
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault()
                              cancelEdit()
                            }
                          }}
                        />
                        <div className="discuss-case-chat__message-edit-actions">
                          <button
                            type="button"
                            className="discuss-case-chat__edit-cancel"
                            onClick={cancelEdit}
                            disabled={busy}
                          >
                            <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Abbrechen
                          </button>
                          <button
                            type="button"
                            className="discuss-case-chat__edit-save"
                            onClick={() => void saveEdit(message)}
                            disabled={busy || !editDraft.trim()}
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={2} />
                            Speichern
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="discuss-case-chat__message-body">{message.body}</p>
                        {message.editedAt || grouped ? (
                          <span className="discuss-case-chat__message-footer">
                            {message.editedAt ? (
                              <span className="discuss-case-chat__message-edited">bearbeitet</span>
                            ) : null}
                            {grouped ? (
                              <time
                                className="discuss-case-chat__message-time"
                                dateTime={message.createdAt}
                              >
                                {formatMessageTime(message.createdAt)}
                              </time>
                            ) : null}
                          </span>
                        ) : null}
                      </>
                    )}
                    {canModify && !isEditing ? (
                      <div className="discuss-case-chat__message-actions">
                        <button
                          type="button"
                          className="icon-action-btn"
                          onClick={() => beginEdit(message)}
                          disabled={busy}
                          aria-label="Nachricht bearbeiten"
                          title="Bearbeiten"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          className="icon-action-btn icon-action-btn--danger"
                          onClick={() => void handleDelete(message)}
                          disabled={busy}
                          aria-label="Nachricht löschen"
                          title="Löschen"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {actionError ? (
        <p className="discuss-case-chat__action-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {canSend ? (
        <div className="discuss-case-chat__composer">
          <textarea
            className="discuss-case-chat__input"
            rows={3}
            placeholder="Nachricht schreiben…"
            value={messageDraft}
            onChange={(e) => setMessageDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                void handleSend()
              }
            }}
          />
          <button
            type="button"
            className="discuss-case-chat__send-btn"
            disabled={sending || !messageDraft.trim()}
            onClick={() => void handleSend()}
          >
            <Send className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      ) : null}

      {canAskAi ? (
        <section className="discuss-case-chat__ai">
          <header className="discuss-case-chat__ai-header">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
            <span>KI fragen</span>
          </header>
          <div className="discuss-case-chat__ai-composer">
            <textarea
              className="discuss-case-chat__input"
              rows={2}
              placeholder="Frage zum sichtbaren Paket…"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
            />
            <div className="discuss-case-chat__ai-actions-row">
              <button
                type="button"
                className="discuss-case-chat__ai-btn"
                disabled={aiLoading || !aiQuestion.trim()}
                onClick={() => void handleAskAi()}
              >
                {aiLoading ? (
                  <span className="clinical-loading__spinner" aria-hidden="true" />
                ) : (
                  'Antwort generieren'
                )}
              </button>
            </div>
          </div>

          {aiError ? <p className="discuss-case-chat__ai-error">{aiError}</p> : null}

          {aiDraft ? (
            <div className="discuss-case-chat__ai-draft">
              <p className="discuss-case-chat__ai-draft-label">Entwurf — nicht in Akte gespeichert</p>
              <pre className="discuss-case-chat__ai-draft-text">{aiDraft}</pre>
              <div className="discuss-case-chat__ai-actions">
                <button type="button" onClick={() => void navigator.clipboard.writeText(aiDraft)}>
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.75} /> Kopieren
                </button>
                <button type="button" onClick={handleInsertAiDraft}>
                  <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} /> In Chat
                </button>
                {canSaveToCase && onSaveDraftToCase ? (
                  <button type="button" onClick={() => onSaveDraftToCase(aiDraft)}>
                    Als Entwurf speichern
                  </button>
                ) : null}
                <button type="button" onClick={() => void handleAskAi()}>
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} /> Neu
                </button>
                <button type="button" onClick={() => setAiDraft(null)}>
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} /> Verwerfen
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </aside>
  )
}
