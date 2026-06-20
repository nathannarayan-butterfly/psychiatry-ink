import { Loader2, Mic, Send, Square, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useCompactDictation } from '../../hooks/useCompactDictation'
import { ButterflyLogo } from '../ButterflyLogo'
import { askButterflyChat, type AskButterflyChatMessage } from '../../services/askButterflyApi'

interface AskButterflyChatDialogProps {
  onClose: () => void
}

export function AskButterflyChatDialog({ onClose }: AskButterflyChatDialogProps) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<AskButterflyChatMessage[]>([])
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
  })

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const handleSend = useCallback(async () => {
    const content = draft.trim()
    if (!content || loading) return

    const nextMessages: AskButterflyChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setDraft('')
    setError(null)
    setLoading(true)

    try {
      const result = await askButterflyChat(nextMessages)
      setMessages((current) => [...current, { role: 'assistant', content: result.answer }])
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t('askButterflyError')
      setError(message)
      setMessages((current) => current.slice(0, -1))
      setDraft(content)
    } finally {
      setLoading(false)
    }
  }, [draft, loading, messages, t])

  const voiceBusy = isRecording || isTranscribing
  const canSend = draft.trim().length > 0 && !loading && !voiceBusy

  return (
    <div
      className="ask-butterfly-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ask-butterfly-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-butterfly-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ask-butterfly-dialog__header">
          <div className="ask-butterfly-dialog__title-wrap">
            <span className="ask-butterfly-dialog__mark">
              <ButterflyLogo variant="color" size={28} />
            </span>
            <div>
              <h2 id="ask-butterfly-title" className="ask-butterfly-dialog__title">
                {t('askButterflyTitle')}
              </h2>
              <p className="ask-butterfly-dialog__subtitle">{t('askButterflySubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            className="ask-butterfly-dialog__close"
            onClick={onClose}
            aria-label={t('settingsClose')}
          >
            <X strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        <div className="ask-butterfly-dialog__body">
          <div className="ask-butterfly-dialog__messages" aria-live="polite">
            {messages.length === 0 ? (
              <p className="ask-butterfly-dialog__empty">{t('askButterflyEmpty')}</p>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`ask-butterfly-dialog__message ask-butterfly-dialog__message--${message.role}`}
                >
                  <p className="ask-butterfly-dialog__message-role">
                    {message.role === 'user' ? t('askButterflyYou') : t('askButterflyAssistant')}
                  </p>
                  <p className="ask-butterfly-dialog__message-text">{message.content}</p>
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
              rows={3}
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
    </div>
  )
}
