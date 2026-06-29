import { MessageSquare, Send, Sparkles, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { useKnowledgeBaseAnnotations } from '../../hooks/useKnowledgeBaseAnnotations'
import { askPharmaQuestion } from '../../services/pharmaAskApi'
import type { UserComment } from '../../types/knowledgeBaseAnnotations'
import { formatSiteLocaleDate } from '../../utils/siteTimezone'
import { ChatMarkdownText } from '../../utils/chat/ChatMarkdownText'
import { showNotionToast } from '../notion/NotionToast'

export type PanelTab = 'comments' | 'askAi'

/**
 * A one-shot request from the selection toolbar to drive the panel:
 * switch tab, optionally pre-fill the comment/question and auto-send.
 * `nonce` makes each request unique so repeated actions re-trigger.
 */
export interface ReadingPanelRequest {
  nonce: number
  tab: PanelTab
  commentText?: string
  question?: string
  autoSend?: boolean
}

interface KnowledgeBaseReadingPanelProps {
  medicationId: string
  medicationName: string
  sectionId: string
  sectionLabel: string
  sectionData: string
  language: string
  collapsed?: boolean
  onToggleCollapse?: () => void
  request?: ReadingPanelRequest | null
  /** AI mode/model tier forwarded to the Ask-AI backend. */
  tier?: 'fast' | 'standard' | 'thorough'
  /** Render panel body only (no side ear / aside chrome) for floating/docked hosts. */
  embedded?: boolean
  /**
   * Surface mode. `tabbed` (default) keeps the original Comments/Ask-AI tabbed
   * reading panel used inline (e.g. clinical KB). The floating Kommentare bubble
   * uses single-purpose modes instead — `comments` renders an entry-scoped,
   * comments-only surface (no tab strip, no section header) that mirrors the
   * Notizen/Butterfly panels, and `askAi` renders the section-grounded ask flow
   * on its own. This is what removes the dead "KI Fragen" tab + "Studienbereich"
   * label from the popup.
   */
  mode?: 'tabbed' | 'comments' | 'askAi'
}

export function KnowledgeBaseReadingPanel({
  medicationId,
  medicationName,
  sectionId,
  sectionLabel,
  sectionData,
  language,
  collapsed = false,
  onToggleCollapse,
  request,
  tier,
  embedded = false,
  mode = 'tabbed',
}: KnowledgeBaseReadingPanelProps) {
  const { t } = useTranslation()
  const { comments: entryComments, forSection, addComment, removeComment, addChatMessage } =
    useKnowledgeBaseAnnotations(medicationId)
  const sectionAnnotations = forSection(sectionId)
  // Single-purpose modes (floating Kommentare bubble) show one surface with no
  // tab strip; `tabbed` (inline) keeps the original Comments/Ask-AI tabs.
  const isTabbed = mode === 'tabbed'
  // The comments bubble is entry-scoped (all sections), like Notizen; the inline
  // tabbed panel stays section-scoped.
  const commentsList = mode === 'comments' ? entryComments : sectionAnnotations.comments
  const [tab, setTab] = useState<PanelTab>('comments')
  const [commentDraft, setCommentDraft] = useState('')
  const [questionDraft, setQuestionDraft] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const questionInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sectionAnnotations.chatMessages.length, tab])

  const handleAddComment = useCallback(() => {
    const text = commentDraft.trim()
    if (!text) return
    addComment({ sectionId, text })
    setCommentDraft('')
  }, [addComment, commentDraft, sectionId])

  const handleAsk = useCallback(async (questionOverride?: string) => {
    const question = (questionOverride ?? questionDraft).trim()
    if (!question || askLoading) return
    setAskError(null)
    addChatMessage({ sectionId, role: 'user', content: question })
    setQuestionDraft('')
    setAskLoading(true)
    try {
      const result = await askPharmaQuestion({
        medicationName,
        sectionId,
        sectionData,
        question,
        language: language as 'de' | 'en' | 'fr' | 'es',
        tier,
      })
      addChatMessage({ sectionId, role: 'assistant', content: result.answer })
    } catch {
      setAskError(t('kbReadingAskError'))
      showNotionToast(t('kbReadingAskError'))
    } finally {
      setAskLoading(false)
    }
  }, [addChatMessage, askLoading, language, medicationName, questionDraft, sectionData, sectionId, t, tier])

  // React to one-shot requests coming from the in-text selection toolbar.
  useEffect(() => {
    if (!request) return
    setTab(request.tab)
    if (request.tab === 'comments') {
      if (request.commentText !== undefined) setCommentDraft(request.commentText)
      window.requestAnimationFrame(() => commentInputRef.current?.focus())
    } else {
      if (request.autoSend && request.question) {
        void handleAsk(request.question)
      } else if (request.question !== undefined) {
        setQuestionDraft(request.question)
        window.requestAnimationFrame(() => questionInputRef.current?.focus())
      }
    }
    // Only re-run when a new request arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.nonce])

  if (collapsed && !embedded) {
    return (
      <aside className="kbp-reading-panel kbp-reading-panel--collapsed">
        <button
          type="button"
          className="kbp-reading-panel__expand-btn"
          onClick={onToggleCollapse}
          title={t('kbReadingPanelExpand')}
        >
          <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
          <span className="kbp-reading-panel__rail-label">{t('kbReadingPanelRailLabel')}</span>
        </button>
      </aside>
    )
  }

  const panelBody = (
    <>
      {!embedded ? (
        <div className="kbp-reading-panel__header">
          <div className="kbp-reading-panel__title-wrap">
            <h3 className="kbp-reading-panel__title">{t('kbReadingPanelTitle')}</h3>
            <p className="kbp-reading-panel__section">{sectionLabel}</p>
          </div>
          {onToggleCollapse ? (
            <button
              type="button"
              className="kbp-icon-btn kbp-icon-btn--xs"
              onClick={onToggleCollapse}
              aria-label={t('kbReadingPanelCollapse')}
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
      ) : isTabbed ? (
        <p className="kbp-reading-panel__section kbp-reading-panel__section--embedded">{sectionLabel}</p>
      ) : null}

      {isTabbed ? (
        <div className="kbp-reading-panel__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'comments'}
            className={`kbp-reading-panel__tab${tab === 'comments' ? ' kbp-reading-panel__tab--active' : ''}`}
            onClick={() => setTab('comments')}
          >
            {t('kbReadingTabComments')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'askAi'}
            className={`kbp-reading-panel__tab${tab === 'askAi' ? ' kbp-reading-panel__tab--active' : ''}`}
            onClick={() => setTab('askAi')}
          >
            <Sparkles className="h-3 w-3" strokeWidth={1.75} aria-hidden />
            {t('kbReadingTabAskAi')}
          </button>
        </div>
      ) : null}

      {(isTabbed ? tab === 'comments' : mode === 'comments') ? (
        <div className="kbp-reading-panel__body">
          <div className="kbp-reading-panel__comment-form">
            <textarea
              ref={commentInputRef}
              className="kbp-reading-panel__textarea"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder={mode === 'comments' ? t('kbCommentsPlaceholder') : t('kbReadingCommentPlaceholder')}
              rows={3}
            />
            <button
              type="button"
              className="kbp-btn kbp-btn--primary kbp-btn--sm"
              onClick={handleAddComment}
              disabled={!commentDraft.trim()}
            >
              {t('kbReadingCommentAdd')}
            </button>
          </div>
          {commentsList.length === 0 ? (
            <p className="kbp-reading-panel__empty">
              {mode === 'comments' ? t('kbCommentsEmpty') : t('kbReadingCommentsEmpty')}
            </p>
          ) : (
            <ul className="kbp-reading-panel__list">
              {commentsList
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((comment: UserComment) => (
                  <li key={comment.id} className="kbp-reading-panel__comment">
                    <p className="kbp-reading-panel__comment-text">{comment.text}</p>
                    <div className="kbp-reading-panel__comment-meta">
                      <time dateTime={comment.createdAt}>
                        {formatSiteLocaleDate(comment.createdAt, language as 'de' | 'en' | 'fr' | 'es')}
                      </time>
                      <button
                        type="button"
                        className="kbp-icon-btn kbp-icon-btn--xs"
                        onClick={() => removeComment(comment.id)}
                        aria-label={t('kbReadingCommentDelete')}
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>
      ) : null}

      {(isTabbed ? tab === 'askAi' : mode === 'askAi') ? (
        <div className="kbp-reading-panel__body">
          <div className="kbp-reading-panel__chat">
            {sectionAnnotations.chatMessages.length === 0 ? (
              <p className="kbp-reading-panel__empty">{t('kbReadingAskEmpty')}</p>
            ) : (
              sectionAnnotations.chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`kbp-reading-panel__chat-msg kbp-reading-panel__chat-msg--${msg.role}`}
                >
                  <p className="kbp-reading-panel__chat-role">
                    {msg.role === 'user' ? t('kbReadingAskYou') : t('kbReadingAskAi')}
                  </p>
                  <p className="kbp-reading-panel__chat-text">
                    {msg.role === 'assistant' ? (
                      <ChatMarkdownText text={msg.content} />
                    ) : (
                      msg.content
                    )}
                  </p>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          {askError ? <p className="kbp-ai-error" role="alert">{askError}</p> : null}
          <div className="kbp-reading-panel__ask-form">
            <textarea
              ref={questionInputRef}
              className="kbp-reading-panel__textarea"
              value={questionDraft}
              onChange={(e) => setQuestionDraft(e.target.value)}
              placeholder={t('kbReadingAskPlaceholder')}
              rows={2}
              disabled={askLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleAsk()
                }
              }}
            />
            <button
              type="button"
              className="kbp-btn kbp-btn--ai kbp-btn--sm"
              onClick={() => void handleAsk()}
              disabled={askLoading || !questionDraft.trim()}
            >
              <Send className={`h-3.5 w-3.5${askLoading ? ' kbp-spin' : ''}`} strokeWidth={1.75} />
              {askLoading ? t('kbReadingAskSending') : t('kbReadingAskSend')}
            </button>
          </div>
        </div>
      ) : null}
    </>
  )

  if (embedded) {
    return <div className="kbp-reading-panel kbp-reading-panel--embedded">{panelBody}</div>
  }

  return <aside className="kbp-reading-panel">{panelBody}</aside>
}
