import { Loader2, Mic, Send, Square, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import { useCompactDictation } from '../../../hooks/useCompactDictation'
import type { UseClinicalIntelligenceResult } from '../../../hooks/useClinicalIntelligence'
import { ButterflyLogo } from '../../ButterflyLogo'
import { clinicalIntelligenceDiscussChat } from '../../../services/clinicalIntelligence/discussApi'
import { buildClinicalIntelligenceDiscussContext } from '../../../services/clinicalIntelligence/discussContext'
import type { CiDiscussMessage } from '../../../types/clinicalIntelligence'
import { resolveLlmRequestForTask } from '../../../utils/resolveAiModel'

const DEFAULT_WIDTH = 360
const MIN_WIDTH = 300
const MAX_WIDTH = 520

interface ClinicalIntelligenceDiscussPanelProps {
  ci: UseClinicalIntelligenceResult
  open: boolean
  onClose: () => void
  /** `rail` = inline in the CI right column; `dock` = fixed viewport overlay. */
  placement?: 'rail' | 'dock'
}

export function ClinicalIntelligenceDiscussPanel({
  ci,
  open,
  onClose,
  placement = 'dock',
}: ClinicalIntelligenceDiscussPanelProps) {
  const { t, language } = useTranslation()
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null)

  const messages = ci.state.discussMessages

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
    if (open) {
      chatEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [messages.length, loading, open])

  const handleResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      resizeStartRef.current = { x: event.clientX, width: panelWidth }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [panelWidth],
  )

  const handleResizeMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeStartRef.current) return
    const delta = resizeStartRef.current.x - event.clientX
    const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStartRef.current.width + delta))
    setPanelWidth(next)
  }, [])

  const handleResizeEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeStartRef.current) return
    resizeStartRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }, [])

  const handleSend = useCallback(async () => {
    const content = draft.trim()
    if (!content || loading) return

    const context = buildClinicalIntelligenceDiscussContext(ci.state, ci.evidence, language)
    if (!context) {
      setError(t('ciDiscussNoContext'))
      return
    }

    const nextMessages: CiDiscussMessage[] = [...messages, { role: 'user', content }]
    ci.setDiscussMessages(nextMessages)
    setDraft('')
    setError(null)
    setLoading(true)

    try {
      const llm = resolveLlmRequestForTask('clinical_intelligence_discuss')
      const result = await clinicalIntelligenceDiscussChat(nextMessages, context, llm)
      ci.setDiscussMessages([...nextMessages, { role: 'assistant', content: result.answer }])
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t('ciDiscussError')
      setError(message)
      ci.setDiscussMessages(messages)
      setDraft(content)
    } finally {
      setLoading(false)
    }
  }, [ci, draft, language, loading, messages, t])

  if (!open) return null

  const voiceBusy = isRecording || isTranscribing
  const canSend = draft.trim().length > 0 && !loading && !voiceBusy

  const rootClass =
    placement === 'rail'
      ? 'ci-discuss-rail'
      : 'ci-discuss-dock'

  return (
    <aside
      className={rootClass}
      style={placement === 'dock' ? { width: panelWidth } : undefined}
      aria-label={t('ciDiscussTitle')}
    >
      {placement === 'dock' ? (
        <div
          className="ci-discuss-dock__resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label={t('askButterflyResize')}
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
        />
      ) : null}

      <div className="ci-discuss-dock__inner">
        <header className="ci-discuss-dock__header">
          <div className="ci-discuss-dock__title-wrap">
            <span className="ci-discuss-dock__mark">
              <ButterflyLogo variant="color" breathing size={24} />
            </span>
            <div>
              <h2 className="ci-discuss-dock__title">{t('ciDiscussTitle')}</h2>
              <p className="ci-discuss-dock__subtitle">{t('ciDiscussSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            className="ci-discuss-dock__close"
            onClick={onClose}
            aria-label={t('settingsClose')}
          >
            <X strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        <p className="ci-discuss-dock__disclaimer">{t('ciDisclaimer')}</p>

        <div className="ci-discuss-dock__messages" aria-live="polite">
          {messages.length === 0 ? (
            <p className="ci-discuss-dock__empty">{t('ciDiscussEmpty')}</p>
          ) : (
            messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={`ci-discuss-entry ci-discuss-entry--${message.role}`}
              >
                <p className="ci-discuss-entry__role">
                  {message.role === 'user' ? t('askButterflyYou') : t('ciDiscussAssistant')}
                </p>
                <p className="ci-discuss-entry__text">{message.content}</p>
              </article>
            ))
          )}
          {loading ? (
            <article className="ci-discuss-entry ci-discuss-entry--assistant">
              <p className="ci-discuss-entry__role">{t('ciDiscussAssistant')}</p>
              <p className="ci-discuss-entry__text ci-discuss-entry__text--pending">
                <Loader2 className="ci-discuss-dock__spinner" aria-hidden strokeWidth={2} />
                {t('askButterflyThinking')}
              </p>
            </article>
          ) : null}
          <div ref={chatEndRef} />
        </div>

        {error ? <p className="ci-discuss-dock__error">{error}</p> : null}
        {voiceError ? <p className="ci-discuss-dock__error">{voiceError}</p> : null}

        <footer className="ci-discuss-dock__composer">
          <textarea
            ref={inputRef}
            className="ci-discuss-dock__input"
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('ciDiscussPlaceholder')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void handleSend()
              }
            }}
            disabled={loading || voiceBusy}
          />
          <div className="ci-discuss-dock__composer-actions">
            <button
              type="button"
              className={`ci-discuss-dock__voice${isRecording ? ' ci-discuss-dock__voice--active' : ''}`}
              onClick={() => void toggleRecording()}
              disabled={loading || isTranscribing}
              title={isRecording ? t('askButterflyStopVoice') : t('askButterflyStartVoice')}
              aria-label={isRecording ? t('askButterflyStopVoice') : t('askButterflyStartVoice')}
            >
              {isRecording ? (
                <Square strokeWidth={2} aria-hidden />
              ) : isTranscribing ? (
                <Loader2 className="ci-discuss-dock__spinner" aria-hidden strokeWidth={2} />
              ) : (
                <Mic strokeWidth={2} aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="ci-discuss-dock__send"
              onClick={() => void handleSend()}
              disabled={!canSend}
              title={t('askButterflySend')}
              aria-label={t('askButterflySend')}
            >
              <Send strokeWidth={2} aria-hidden />
            </button>
          </div>
        </footer>
      </div>
    </aside>
  )
}
