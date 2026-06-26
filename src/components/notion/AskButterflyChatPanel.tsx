import { Loader2, Mic, Send, Square } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useAskButterfly } from '../../contexts/AskButterflyContext'
import { useCompactDictation } from '../../hooks/useCompactDictation'
import { ButterflyLogo } from '../ButterflyLogo'
import { askButterflyChat, type AskButterflyChatMessage } from '../../services/askButterflyApi'
import { resolveLlmRequestForTaskOrTier } from '../../utils/resolveAiModel'
import { ChatMarkdownText } from '../../utils/chat/ChatMarkdownText'
import { CopyButton } from '../common/CopyButton'
import { AskButterflyTierSelector } from './AskButterflyTierSelector'

interface AskButterflyChatPanelProps {
  variant: 'floating' | 'docked'
  headerActions: ReactNode
  titleId?: string
}

// The transcript only changes when a message is sent or received. Memoising it
// keeps composer keystrokes (which update local `draft` state and re-render the
// panel) from re-rendering every bubble and re-parsing assistant markdown.
const AskButterflyMessageList = memo(function AskButterflyMessageList({
  messages,
  loading,
}: {
  messages: AskButterflyChatMessage[]
  loading: boolean
}) {
  const { t } = useTranslation()
  return (
    <>
      {messages.length === 0 ? (
        <div className="ask-butterfly-dialog__empty">
          <span className="ask-butterfly-dialog__empty-orb" aria-hidden>
            <ButterflyLogo breathing size={34} />
          </span>
          <p className="ask-butterfly-dialog__empty-text">{t('askButterflyEmpty')}</p>
        </div>
      ) : (
        messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`ask-butterfly-dialog__message ask-butterfly-dialog__message--${message.role}`}
          >
            <p className="ask-butterfly-dialog__message-role">
              {message.role === 'user' ? t('askButterflyYou') : t('askButterflyAssistant')}
            </p>
            <p className="ask-butterfly-dialog__message-text">
              {message.role === 'assistant' ? (
                <ChatMarkdownText text={message.content} />
              ) : (
                message.content
              )}
            </p>
            {message.role === 'assistant' && message.content.trim() ? (
              <div className="ask-butterfly-dialog__message-actions">
                <CopyButton text={message.content} label={t('askButterflyCopyAnswer')} />
              </div>
            ) : null}
          </div>
        ))
      )}
      {loading ? (
        <div className="ask-butterfly-dialog__message ask-butterfly-dialog__message--assistant">
          <p className="ask-butterfly-dialog__message-role">{t('askButterflyAssistant')}</p>
          <p className="ask-butterfly-dialog__message-text ask-butterfly-dialog__message-text--pending">
            <Loader2 className="ask-butterfly-dialog__spinner" strokeWidth={1.75} aria-hidden />
            {t('askButterflyThinking')}
          </p>
        </div>
      ) : null}
    </>
  )
})

export function AskButterflyChatPanel({
  variant,
  headerActions,
  titleId = 'ask-butterfly-title',
}: AskButterflyChatPanelProps) {
  const { t, language } = useTranslation()
  const { messages, setMessages, tier } = useAskButterfly()
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const appendTranscription = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setDraft((current) => (current.trim() ? `${current.trimEnd()} ${trimmed}` : trimmed))
    inputRef.current?.focus()
  }, [])

  const { isRecording, isTranscribing, toggleRecording, error: voiceError } = useCompactDictation({
    onTranscriptionComplete: appendTranscription,
    language,
  })

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-grow the composer so long / pasted text stays readable instead of
  // scrolling inside a fixed two-line box. The textarea expands with content up
  // to a sensible cap (docked panels are shorter), after which it scrolls.
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const maxHeight = variant === 'docked' ? 160 : 200
    el.style.height = 'auto'
    const next = Math.min(el.scrollHeight, maxHeight)
    el.style.height = `${next}px`
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [draft, variant])

  const handleSend = useCallback(async () => {
    const content = draft.trim()
    if (!content || loading) return

    const nextMessages: AskButterflyChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setDraft('')
    setError(null)
    setLoading(true)

    try {
      const llm = resolveLlmRequestForTaskOrTier('ask_butterfly', tier)
      const result = await askButterflyChat(nextMessages, llm)
      setMessages((current) => [...current, { role: 'assistant', content: result.answer }])
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t('askButterflyError')
      setError(message)
      setMessages((current) => current.slice(0, -1))
      setDraft(content)
    } finally {
      setLoading(false)
    }
  }, [draft, loading, messages, setMessages, t, tier])

  const voiceBusy = isRecording || isTranscribing
  const canSend = draft.trim().length > 0 && !loading && !voiceBusy

  const rootClass =
    variant === 'docked'
      ? 'ask-butterfly-panel ask-butterfly-panel--docked'
      : 'ask-butterfly-panel ask-butterfly-panel--floating'

  return (
    <div className={rootClass}>
      <header className="ask-butterfly-dialog__header">
        <div className="ask-butterfly-dialog__title-wrap">
          <span className="ask-butterfly-dialog__mark">
            <ButterflyLogo tone="silver" breathing size={variant === 'docked' ? 24 : 28} />
          </span>
          <div>
            <h2 id={titleId} className="ask-butterfly-dialog__title">
              {t('askButterflyTitle')}
            </h2>
          </div>
        </div>
        <div className="ask-butterfly-dialog__header-actions">{headerActions}</div>
      </header>

      <div className="ask-butterfly-dialog__body">
        <AskButterflyTierSelector />

        <div className="ask-butterfly-dialog__messages" aria-live="polite">
          <AskButterflyMessageList messages={messages} loading={loading} />
          <div ref={chatEndRef} />
        </div>

        {error ? (
          <p className="ask-butterfly-dialog__error" role="alert">
            {error}
          </p>
        ) : null}
        {voiceError ? (
          <p className="ask-butterfly-dialog__error" role="alert">
            {t('askButterflyVoiceError')}
          </p>
        ) : null}

        <div className="ask-butterfly-dialog__composer">
          <textarea
            ref={inputRef}
            className="ask-butterfly-dialog__input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('askButterflyPlaceholder')}
            rows={variant === 'docked' ? 2 : 3}
            disabled={loading || voiceBusy}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void handleSend()
              }
            }}
          />
          <div className="ask-butterfly-dialog__composer-actions">
            <button
              type="button"
              className={`ask-butterfly-dialog__voice-btn${isRecording ? ' ask-butterfly-dialog__voice-btn--active' : ''}`}
              onClick={() => toggleRecording()}
              disabled={loading || isTranscribing}
              title={isRecording ? t('askButterflyStopVoice') : t('askButterflyStartVoice')}
              aria-label={isRecording ? t('askButterflyStopVoice') : t('askButterflyStartVoice')}
            >
              {isTranscribing ? (
                <Loader2 className="ask-butterfly-dialog__spinner" strokeWidth={1.75} aria-hidden />
              ) : isRecording ? (
                <Square strokeWidth={1.75} aria-hidden />
              ) : (
                <Mic strokeWidth={1.75} aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="ask-butterfly-dialog__send-btn"
              onClick={() => void handleSend()}
              disabled={!canSend}
            >
              <Send strokeWidth={1.75} aria-hidden />
              {loading ? t('askButterflySending') : t('askButterflySend')}
            </button>
          </div>
        </div>

        <p className="ask-butterfly-dialog__disclaimer">{t('askButterflyDisclaimer')}</p>
      </div>
    </div>
  )
}
