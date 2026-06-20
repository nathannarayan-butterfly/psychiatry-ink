import { Check, Copy, MessageSquare, Pencil, RefreshCw, Send, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  DiscussCaseMessage,
  DiscussCaseParticipant,
  DiscussCasePermission,
  DiscussQuoteExcerpt,
} from '../../types/discussCase'
import { ButterflyLogo } from '../ButterflyLogo'
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
  pendingQuote?: DiscussQuoteExcerpt | null
  onPendingQuoteChange?: (quote: DiscussQuoteExcerpt | null) => void
  onSaveDraftToCase?: (text: string) => void
  participants?: DiscussCaseParticipant[]
  currentUserId?: string
  embedded?: boolean
  locale?: ChatLocale
}

const ROLE_TAGS: Record<DiscussCaseParticipant['role'], string> = {
  owner: 'Eigentümer',
  internal: 'Intern',
  external: 'Extern',
}

/** Display name persisted for Butterfly answers shared into the chat thread. */
export const DISCUSS_AI_AUTHOR_LABEL = 'Butterfly'

const LEGACY_DISCUSS_AI_AUTHOR_LABEL = 'KI-Assistent'

function isButterflyAuthor(displayName: string | null | undefined): boolean {
  return displayName === DISCUSS_AI_AUTHOR_LABEL || displayName === LEGACY_DISCUSS_AI_AUTHOR_LABEL
}

const CHAT_I18N = {
  de: {
    quoteFrom: 'Zitat aus',
    sendAiToChat: 'An Chat senden',
    insertAiToComposer: 'In Entwurf',
    aiDraftLabel: 'Entwurf — nicht in Akte gespeichert',
    askButterfly: 'Butterfly fragen',
    butterflyAssistant: 'Butterfly',
    generateAnswer: 'Antwort generieren',
    aiQuestionPlaceholder: 'Frage zum sichtbaren Paket…',
    aiRequestFailed: 'Butterfly-Anfrage fehlgeschlagen',
    aiSendFailed: 'Butterfly-Antwort konnte nicht gesendet werden',
    messagePlaceholder: 'Nachricht schreiben…',
    removeQuote: 'Zitat entfernen',
    sendFailed: 'Nachricht konnte nicht gesendet werden',
  },
  en: {
    quoteFrom: 'Quote from',
    sendAiToChat: 'Send to chat',
    insertAiToComposer: 'To draft',
    aiDraftLabel: 'Draft — not saved to record',
    askButterfly: 'Ask Butterfly',
    butterflyAssistant: 'Butterfly',
    generateAnswer: 'Generate answer',
    aiQuestionPlaceholder: 'Question about the visible package…',
    aiRequestFailed: 'Butterfly request failed',
    aiSendFailed: 'Could not send Butterfly answer to chat',
    messagePlaceholder: 'Write a message…',
    removeQuote: 'Remove quote',
    sendFailed: 'Could not send message',
  },
  fr: {
    quoteFrom: 'Citation de',
    sendAiToChat: 'Envoyer au chat',
    insertAiToComposer: 'Vers brouillon',
    aiDraftLabel: 'Brouillon — non enregistré au dossier',
    askButterfly: 'Demander à Butterfly',
    butterflyAssistant: 'Butterfly',
    generateAnswer: 'Générer une réponse',
    aiQuestionPlaceholder: 'Question sur le paquet visible…',
    aiRequestFailed: 'Échec de la requête Butterfly',
    aiSendFailed: 'Impossible d\'envoyer la réponse Butterfly au chat',
    messagePlaceholder: 'Écrire un message…',
    removeQuote: 'Retirer la citation',
    sendFailed: 'Impossible d\'envoyer le message',
  },
  es: {
    quoteFrom: 'Cita de',
    sendAiToChat: 'Enviar al chat',
    insertAiToComposer: 'Al borrador',
    aiDraftLabel: 'Borrador — no guardado en el expediente',
    askButterfly: 'Preguntar a Butterfly',
    butterflyAssistant: 'Butterfly',
    generateAnswer: 'Generar respuesta',
    aiQuestionPlaceholder: 'Pregunta sobre el paquete visible…',
    aiRequestFailed: 'Error en la solicitud a Butterfly',
    aiSendFailed: 'No se pudo enviar la respuesta de Butterfly al chat',
    messagePlaceholder: 'Escribir un mensaje…',
    removeQuote: 'Quitar cita',
    sendFailed: 'No se pudo enviar el mensaje',
  },
} as const

type ChatLocale = keyof typeof CHAT_I18N

function chatT(locale: ChatLocale, key: keyof (typeof CHAT_I18N)['de']): string {
  return CHAT_I18N[locale][key]
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
  pendingQuote = null,
  onPendingQuoteChange,
  onSaveDraftToCase,
  participants,
  currentUserId,
  embedded = false,
  locale = 'de',
}: DiscussCaseChatPanelProps) {
  const participantByUserId = new Map(
    (participants ?? []).map((p) => [p.userId, p]),
  )

  const resolveAuthor = (message: DiscussCaseMessage): { name: string; tag: string | null } => {
    if (isButterflyAuthor(message.authorDisplayName)) {
      return { name: chatT(locale, 'butterflyAssistant'), tag: null }
    }
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
  const composerRef = useRef<HTMLTextAreaElement>(null)

  const canSend = permissions.includes('send_message')
  const canAskAi = permissions.includes('ask_ai')
  const canSaveToCase = permissions.includes('save_to_case')

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, aiDraft])

  useEffect(() => {
    if (pendingQuote) {
      composerRef.current?.focus()
    }
  }, [pendingQuote])

  const handleSend = useCallback(async () => {
    const body = messageDraft.trim()
    if ((!body && !pendingQuote) || !canSend || sending) return
    setSending(true)
    setActionError(null)
    try {
      const message = await sendDiscussMessage(discussionId, body, pendingQuote)
      onMessagesChange([...messages, message])
      setMessageDraft('')
      onPendingQuoteChange?.(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : chatT(locale, 'sendFailed'))
    } finally {
      setSending(false)
    }
  }, [
    canSend,
    discussionId,
    locale,
    messageDraft,
    messages,
    onMessagesChange,
    onPendingQuoteChange,
    pendingQuote,
    sending,
  ])

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
      setAiError(err instanceof Error ? err.message : chatT(locale, 'aiRequestFailed'))
    } finally {
      setAiLoading(false)
    }
  }, [aiLoading, aiQuestion, canAskAi, discussionId, locale])

  const handleSendAiToChat = useCallback(async () => {
    if (!aiDraft || !canSend || sending) return
    setSending(true)
    setActionError(null)
    try {
      const message = await sendDiscussMessage(
        discussionId,
        aiDraft,
        null,
        DISCUSS_AI_AUTHOR_LABEL,
      )
      onMessagesChange([...messages, message])
      setAiDraft(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : chatT(locale, 'aiSendFailed'))
    } finally {
      setSending(false)
    }
  }, [aiDraft, canSend, discussionId, locale, messages, onMessagesChange, sending])

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
            const isAiMessage = isButterflyAuthor(message.authorDisplayName)
            const isSelf = Boolean(currentUserId && message.authorUserId === currentUserId && !isAiMessage)
            const color = isSelf || isAiMessage ? null : getParticipantColor(message.authorUserId)
            const prev = messages[index - 1]
            const prevIsAi = isButterflyAuthor(prev?.authorDisplayName)
            const grouped =
              Boolean(prev) &&
              !isAiMessage &&
              !prevIsAi &&
              prev.authorUserId === message.authorUserId &&
              new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime() <
                GROUP_WINDOW_MS
            const canModify = isSelf && canSend
            const isEditing = editingId === message.id
            const busy = actionBusyId === message.id
            const hasBody = Boolean(message.body.trim())
            return (
              <article
                key={message.id}
                className={[
                  'discuss-case-chat__message',
                  isAiMessage
                    ? 'discuss-case-chat__message--ai'
                    : isSelf
                      ? 'discuss-case-chat__message--self'
                      : 'discuss-case-chat__message--other',
                  grouped ? 'discuss-case-chat__message--grouped' : '',
                ].join(' ').trim()}
              >
                {!isSelf ? (
                  <span
                    className={[
                      'discuss-case-chat__avatar discuss-case-avatar',
                      isAiMessage ? 'discuss-case-chat__avatar--ai' : '',
                    ].join(' ').trim()}
                    style={
                      color
                        ? { backgroundColor: color.bg, color: color.text, borderColor: color.border }
                        : undefined
                    }
                    aria-hidden={grouped ? 'true' : undefined}
                  >
                    {grouped ? '' : isAiMessage ? (
                      <ButterflyLogo variant="grey" size={14} />
                    ) : (
                      authorInitials(author.name)
                    )}
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
                        {message.quoteExcerpt.sectionLabel ? (
                          <cite className="discuss-case-chat__quote-label">
                            {chatT(locale, 'quoteFrom')} {message.quoteExcerpt.sectionLabel}
                          </cite>
                        ) : null}
                        <p className="discuss-case-chat__quote-text">{message.quoteExcerpt.text}</p>
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
                        {hasBody ? (
                          <p className="discuss-case-chat__message-body">{message.body}</p>
                        ) : null}
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
          <div className="discuss-case-chat__composer-main">
            {pendingQuote ? (
              <blockquote className="discuss-case-chat__composer-quote">
                {pendingQuote.sectionLabel ? (
                  <cite className="discuss-case-chat__quote-label">
                    {chatT(locale, 'quoteFrom')} {pendingQuote.sectionLabel}
                  </cite>
                ) : null}
                <p className="discuss-case-chat__quote-text">{pendingQuote.text}</p>
                <button
                  type="button"
                  className="discuss-case-chat__composer-quote-remove icon-action-btn"
                  onClick={() => onPendingQuoteChange?.(null)}
                  aria-label={chatT(locale, 'removeQuote')}
                  title={chatT(locale, 'removeQuote')}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </blockquote>
            ) : null}
            <textarea
              ref={composerRef}
              className="discuss-case-chat__input"
              rows={3}
              placeholder={chatT(locale, 'messagePlaceholder')}
              value={messageDraft}
              onChange={(e) => setMessageDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
            />
          </div>
          <button
            type="button"
            className="discuss-case-chat__send-btn"
            disabled={sending || (!messageDraft.trim() && !pendingQuote)}
            onClick={() => void handleSend()}
          >
            <Send className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      ) : null}

      {canAskAi ? (
        <section className="discuss-case-chat__ai">
          <header className="discuss-case-chat__ai-header">
            <ButterflyLogo variant="color" size={16} />
            <span>{chatT(locale, 'askButterfly')}</span>
          </header>
          <div className="discuss-case-chat__ai-composer">
            <textarea
              className="discuss-case-chat__input"
              rows={2}
              placeholder={chatT(locale, 'aiQuestionPlaceholder')}
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
                  chatT(locale, 'generateAnswer')
                )}
              </button>
            </div>
          </div>

          {aiError ? <p className="discuss-case-chat__ai-error">{aiError}</p> : null}

          {aiDraft ? (
            <div className="discuss-case-chat__ai-draft">
              <p className="discuss-case-chat__ai-draft-label">{chatT(locale, 'aiDraftLabel')}</p>
              <pre className="discuss-case-chat__ai-draft-text">{aiDraft}</pre>
              <div className="discuss-case-chat__ai-actions">
                <button type="button" onClick={() => void navigator.clipboard.writeText(aiDraft)}>
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.75} /> Kopieren
                </button>
                {canSend ? (
                  <button
                    type="button"
                    className="discuss-case-chat__ai-send-chat"
                    disabled={sending}
                    onClick={() => void handleSendAiToChat()}
                  >
                    <Send className="h-3.5 w-3.5" strokeWidth={1.75} /> {chatT(locale, 'sendAiToChat')}
                  </button>
                ) : null}
                {canSend ? (
                  <button type="button" onClick={handleInsertAiDraft}>
                    <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} />{' '}
                    {chatT(locale, 'insertAiToComposer')}
                  </button>
                ) : null}
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
