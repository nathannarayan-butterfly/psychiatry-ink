import { useCallback, useMemo, useState } from 'react'
import { Check, Mic, Pencil, Pin, PinOff, X } from 'lucide-react'
import type {
  DiscussCaseMessage,
  DiscussCaseParticipant,
  DiscussCaseResolutionSummary,
} from '../../types/discussCase'
import { setDiscussMessagePin, setDiscussResolutionSummary } from '../../services/discussCaseApi'
import {
  discussChromeT,
  type DiscussChromeLocale,
} from '../../utils/discussCase/chromeI18n'
import { discussCaseMessageDomId } from '../../utils/discussCase/messageReply'

interface DiscussCaseSummaryPanelProps {
  discussionId: string
  messages: DiscussCaseMessage[]
  resolutionSummary: DiscussCaseResolutionSummary | null
  canManage: boolean
  locale: DiscussChromeLocale
  currentUserId?: string
  participants?: DiscussCaseParticipant[]
  onMessagesChange: (messages: DiscussCaseMessage[]) => void
  onResolutionChange: (summary: DiscussCaseResolutionSummary | null) => void
}

function messagePreview(message: DiscussCaseMessage, locale: DiscussChromeLocale): string {
  if (message.messageKind === 'voice') {
    return message.transcript?.text?.trim() || discussChromeT(locale, 'exportVoiceMessage')
  }
  return message.body.trim()
}

export function DiscussCaseSummaryPanel({
  discussionId,
  messages,
  resolutionSummary,
  canManage,
  locale,
  currentUserId,
  participants,
  onMessagesChange,
  onResolutionChange,
}: DiscussCaseSummaryPanelProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(resolutionSummary?.text ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pinBusyId, setPinBusyId] = useState<string | null>(null)

  const participantByUserId = useMemo(
    () => new Map((participants ?? []).map((p) => [p.userId, p])),
    [participants],
  )

  const pinnedMessages = useMemo(
    () =>
      messages
        .filter((m) => m.pinned)
        .sort((a, b) => new Date(a.pinnedAt ?? a.createdAt).getTime() - new Date(b.pinnedAt ?? b.createdAt).getTime()),
    [messages],
  )

  const authorName = useCallback(
    (message: DiscussCaseMessage): string => {
      if (currentUserId && message.authorUserId === currentUserId) {
        return discussChromeT(locale, 'selfLabel')
      }
      const participant = participantByUserId.get(message.authorUserId)
      return message.authorDisplayName || participant?.userId.slice(0, 8) || message.authorUserId.slice(0, 8)
    },
    [currentUserId, locale, participantByUserId],
  )

  const startEdit = useCallback(() => {
    setDraft(resolutionSummary?.text ?? '')
    setEditing(true)
    setError(null)
  }, [resolutionSummary])

  const saveSummary = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const discussion = await setDiscussResolutionSummary(discussionId, draft.trim())
      onResolutionChange(discussion.resolutionSummary)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : discussChromeT(locale, 'resolutionFailed'))
    } finally {
      setBusy(false)
    }
  }, [busy, discussionId, draft, locale, onResolutionChange])

  const jumpTo = useCallback((messageId: string) => {
    document.getElementById(discussCaseMessageDomId(messageId))?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [])

  const unpin = useCallback(
    async (message: DiscussCaseMessage) => {
      if (pinBusyId) return
      setPinBusyId(message.id)
      setError(null)
      try {
        const updated = await setDiscussMessagePin(discussionId, message.id, false)
        onMessagesChange(messages.map((m) => (m.id === updated.id ? updated : m)))
      } catch (err) {
        setError(err instanceof Error ? err.message : discussChromeT(locale, 'pinFailed'))
      } finally {
        setPinBusyId(null)
      }
    },
    [discussionId, locale, messages, onMessagesChange, pinBusyId],
  )

  return (
    <div className="discuss-case-summary">
      <section className="discuss-case-summary__section">
        <header className="discuss-case-summary__heading">
          <h3>{discussChromeT(locale, 'resolutionHeading')}</h3>
          {canManage && !editing ? (
            <button
              type="button"
              className="discuss-case-summary__edit-btn icon-action-btn"
              onClick={startEdit}
              aria-label={discussChromeT(locale, 'resolutionEdit')}
              title={discussChromeT(locale, 'resolutionEdit')}
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          ) : null}
        </header>

        {editing ? (
          <div className="discuss-case-summary__editor">
            <textarea
              className="discuss-case-summary__textarea"
              rows={5}
              autoFocus
              value={draft}
              disabled={busy}
              placeholder={discussChromeT(locale, 'resolutionPlaceholder')}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="discuss-case-summary__editor-actions">
              <button
                type="button"
                className="discuss-case-summary__cancel"
                onClick={() => setEditing(false)}
                disabled={busy}
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                {discussChromeT(locale, 'cancel')}
              </button>
              <button
                type="button"
                className="discuss-case-summary__save"
                onClick={() => void saveSummary()}
                disabled={busy}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2} />
                {discussChromeT(locale, 'resolutionSave')}
              </button>
            </div>
          </div>
        ) : resolutionSummary?.text ? (
          <>
            <p className="discuss-case-summary__text">{resolutionSummary.text}</p>
            <p className="discuss-case-summary__updated">
              {discussChromeT(locale, 'resolutionUpdatedAt')}{' '}
              {new Date(resolutionSummary.updatedAt).toLocaleString()}
            </p>
          </>
        ) : (
          <p className="discuss-case-summary__empty">{discussChromeT(locale, 'resolutionEmpty')}</p>
        )}
      </section>

      <section className="discuss-case-summary__section">
        <header className="discuss-case-summary__heading">
          <h3>
            <Pin className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
            {discussChromeT(locale, 'pinnedHeading')}
            <span className="discuss-case-summary__count">{pinnedMessages.length}</span>
          </h3>
        </header>

        {pinnedMessages.length === 0 ? (
          <p className="discuss-case-summary__empty">{discussChromeT(locale, 'noPinnedMessages')}</p>
        ) : (
          <ul className="discuss-case-summary__pins">
            {pinnedMessages.map((message) => (
              <li key={message.id} className="discuss-case-summary__pin">
                <button
                  type="button"
                  className="discuss-case-summary__pin-open"
                  onClick={() => jumpTo(message.id)}
                  title={discussChromeT(locale, 'jumpToMessage')}
                >
                  <span className="discuss-case-summary__pin-author">{authorName(message)}</span>
                  <span className="discuss-case-summary__pin-preview">
                    {message.messageKind === 'voice' && !message.transcript ? (
                      <Mic className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                    ) : null}
                    {messagePreview(message, locale)}
                  </span>
                </button>
                {canManage ? (
                  <button
                    type="button"
                    className="discuss-case-summary__pin-remove icon-action-btn"
                    onClick={() => void unpin(message)}
                    disabled={pinBusyId === message.id}
                    aria-label={discussChromeT(locale, 'unpin')}
                    title={discussChromeT(locale, 'unpin')}
                  >
                    <PinOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <p className="discuss-case-summary__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
