import { Copy, MessageSquare, RefreshCw, Send, Sparkles, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  DiscussCaseMessage,
  DiscussCaseParticipant,
  DiscussCasePermission,
  DiscussQuoteExcerpt,
} from '../../types/discussCase'
import { askDiscussAi, sendDiscussMessage } from '../../services/discussCaseApi'
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
          <p className="clinical-empty-state clinical-empty-state--compact discuss-case-chat__empty">Noch keine Nachrichten.</p>
        ) : (
          messages.map((message) => {
            const author = resolveAuthor(message)
            const isSelf = currentUserId && message.authorUserId === currentUserId
            const color = isSelf ? null : getParticipantColor(message.authorUserId)
            return (
              <article
                key={message.id}
                className={[
                  'discuss-case-chat__message',
                  isSelf ? 'discuss-case-chat__message--self' : '',
                ].join(' ').trim()}
              >
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
                  <time>{new Date(message.createdAt).toLocaleString('de-DE')}</time>
                </header>
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
                  <p className="discuss-case-chat__message-body">{message.body}</p>
                </div>
              </article>
            )
          })
        )}
        <div ref={chatEndRef} />
      </div>

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
