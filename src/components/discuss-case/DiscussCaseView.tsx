import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ClipboardList, Copy, FileText, Printer, Users } from 'lucide-react'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import type {
  DiscussCaseAnnotation,
  DiscussCaseMessage,
  DiscussCaseParticipant,
  DiscussCasePermission,
  DiscussCaseResolutionSummary,
  DiscussPackageContent,
  DiscussQuoteExcerpt,
} from '../../types/discussCase'
import { archiveDiscussion, fetchDiscussMessages, loadDiscussSession } from '../../services/discussCaseApi'
import {
  decryptJson,
  discussKeyStorageId,
  isEncryptedEnvelope,
  resolveKey,
} from '../../utils/e2ee'
import { getParticipantColor } from '../../utils/discussCase/participantColors'
import { loadStoredUiLanguage } from '../../utils/clinicalLanguage'
import {
  discussChromeT,
  discussRoleLabel,
  resolveDiscussChromeLocale,
} from '../../utils/discussCase/chromeI18n'
import {
  copyDiscussThreadText,
  printDiscussThread,
  type DiscussThreadExportMessage,
} from '../../utils/discussCase/exportThread'
import { DiscussCaseDocumentViewer } from './DiscussCaseDocumentViewer'
import { DiscussCaseParticipants } from './DiscussCaseParticipants'
import { DiscussCaseChatPanel } from './DiscussCaseChatPanel'
import { DiscussCaseSummaryPanel } from './DiscussCaseSummaryPanel'
import { createHighlightAnnotation } from '../../utils/discussCase/createHighlightAnnotation'

interface DiscussCaseViewProps {
  discussionId: string
  onSaveDraftToCase?: (text: string) => void
  onArchived?: () => void
  onBack?: () => void
}

type RightPanel = 'document' | 'participants' | 'summary' | null

/** Window during which chat polls defer to a recent local message mutation. */
const POLL_SUPPRESS_AFTER_LOCAL_EDIT_MS = 6_000

function participantInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return trimmed.slice(0, 2).toUpperCase()
}

export function DiscussCaseView({ discussionId, onSaveDraftToCase, onArchived, onBack }: DiscussCaseViewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [packageContent, setPackageContent] = useState<DiscussPackageContent | null>(null)
  const [permissions, setPermissions] = useState<DiscussCasePermission[]>([])
  const [messages, setMessages] = useState<DiscussCaseMessage[]>([])
  const [annotations, setAnnotations] = useState<DiscussCaseAnnotation[]>([])
  const [pendingQuote, setPendingQuote] = useState<DiscussQuoteExcerpt | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [participants, setParticipants] = useState<DiscussCaseParticipant[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)
  const [voiceRetentionDays, setVoiceRetentionDays] = useState<number | undefined>(undefined)
  const [resolutionSummary, setResolutionSummary] = useState<DiscussCaseResolutionSummary | null>(null)
  // The chat is the centerpiece — open as a clean single column. The shared
  // package document and participant roster are opt-in drawers via the header
  // toggles, so Discuss never stacks extra panels around the conversation.
  const [rightPanel, setRightPanel] = useState<RightPanel>(null)

  // UI language for the chat surface (voice / reactions / reply strings). The
  // platform supports DE + EN; without this the chat fell back to German for
  // English users despite the panel carrying full translations.
  const chatLocale = loadStoredUiLanguage()
  const chromeLocale = resolveDiscussChromeLocale(chatLocale)

  // Timestamp of the most recent *local* message mutation (send / edit / delete
  // / reaction / voice). The 12 s poll replaces the whole message list, which
  // can clobber an optimistic local change while a stale poll request that was
  // already in flight resolves. We skip applying poll results for a short
  // window after a local change so the user's own action never flickers away.
  const localEditRef = useRef(0)
  const handleMessagesChange = useCallback((next: DiscussCaseMessage[]) => {
    localEditRef.current = Date.now()
    setMessages(next)
  }, [])

  const activeParticipants = useMemo(
    () => participants.filter((p) => p.status !== 'revoked'),
    [participants],
  )

  const handleArchive = useCallback(async () => {
    if (archiving) return
    const confirmed = window.confirm(discussChromeT(chromeLocale, 'archiveConfirm'))
    if (!confirmed) return
    setArchiving(true)
    try {
      await archiveDiscussion(discussionId, 'archived')
      onArchived?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : discussChromeT(chromeLocale, 'archiveFailed'))
    } finally {
      setArchiving(false)
    }
  }, [archiving, chromeLocale, discussionId, onArchived])

  const buildExportMessages = useCallback((): DiscussThreadExportMessage[] => {
    const participantByUserId = new Map(participants.map((p) => [p.userId, p]))
    return messages.map((message) => {
      const isSelf = currentUserId && message.authorUserId === currentUserId
      const participant = participantByUserId.get(message.authorUserId)
      const authorName = isSelf
        ? discussChromeT(chromeLocale, 'selfLabel')
        : message.authorDisplayName || message.authorUserId.slice(0, 8)
      return {
        authorName,
        roleTag: participant ? discussRoleLabel(chromeLocale, participant.role) : null,
        createdAt: message.createdAt,
        pinned: message.pinned,
        edited: Boolean(message.editedAt),
        kind: message.messageKind,
        body: message.body,
        transcript: message.transcript?.text ?? null,
      }
    })
  }, [chromeLocale, currentUserId, messages, participants])

  const exportInput = useCallback(
    () => ({
      title: title || discussChromeT(chromeLocale, 'exportThreadTitle'),
      generatedAt: new Date().toISOString(),
      resolutionSummary: resolutionSummary?.text ?? null,
      messages: buildExportMessages(),
      labels: {
        voiceMessage: discussChromeT(chromeLocale, 'exportVoiceMessage'),
        transcriptLabel: discussChromeT(chromeLocale, 'exportTranscriptLabel'),
        pinned: discussChromeT(chromeLocale, 'exportPinned'),
        edited: discussChromeT(chromeLocale, 'exportEdited'),
        generatedAt: discussChromeT(chromeLocale, 'exportGeneratedAt'),
        resolution: discussChromeT(chromeLocale, 'exportResolution'),
      },
    }),
    [buildExportMessages, chromeLocale, resolutionSummary, title],
  )

  const handlePrintThread = useCallback(() => {
    printDiscussThread(exportInput())
  }, [exportInput])

  const handleCopyThread = useCallback(() => {
    void copyDiscussThreadText(exportInput())
  }, [exportInput])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const session = await loadDiscussSession(discussionId)
        if (cancelled) return
        setTitle(session.discussion.title)
        setPermissions(session.permissions)
        setMessages(session.messages)
        setAnnotations(session.annotations)
        setParticipants(session.participants ?? [])
        setCurrentUserId(session.participant?.userId)
        setVoiceRetentionDays(session.voiceRetentionDays)
        setResolutionSummary(session.discussion.resolutionSummary ?? null)

        const raw = session.package
        if (raw && isEncryptedEnvelope(raw)) {
          // Identified package is E2EE — decrypt locally with the key resolved
          // from the invite-link fragment or previously persisted locally.
          const key = await resolveKey(discussKeyStorageId(discussionId))
          if (!key) {
            if (!cancelled) {
              setError(discussChromeT(chromeLocale, 'keyMissing'))
            }
            return
          }
          try {
            const decrypted = await decryptJson<DiscussPackageContent>(key, raw)
            if (!cancelled) setPackageContent(decrypted)
          } catch {
            if (!cancelled) {
              setError(discussChromeT(chromeLocale, 'decryptFailed'))
            }
            return
          }
        } else if (!cancelled) {
          setPackageContent(raw)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : discussChromeT(chromeLocale, 'loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [discussionId])

  useEffect(() => {
    if (loading || error) return
    let cancelled = false
    const poll = async () => {
      try {
        const fresh = await fetchDiscussMessages(discussionId)
        if (cancelled) return
        // Don't overwrite a just-made local change with a poll response that
        // was generated before it (would drop a sent message or revert a
        // reaction/edit until the next cycle).
        if (Date.now() - localEditRef.current < POLL_SUPPRESS_AFTER_LOCAL_EDIT_MS) return
        setMessages(fresh)
      } catch {
        /* ignore transient poll failures */
      }
    }
    const interval = window.setInterval(() => void poll(), 12_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [discussionId, error, loading])

  const handleHighlight = useCallback(
    async (input: {
      sectionId: string
      sectionLabel: string
      startOffset: number
      endOffset: number
      text: string
    }) => {
      if (!permissions.includes('highlight')) return
      await createHighlightAnnotation(
        discussionId,
        {
          sectionId: input.sectionId,
          startOffset: input.startOffset,
          endOffset: input.endOffset,
          highlightedText: input.text,
        },
        annotations,
        setAnnotations,
      )
    },
    [annotations, discussionId, permissions],
  )

  const handleQuoteToComposer = useCallback(
    (quote: DiscussQuoteExcerpt) => {
      if (!permissions.includes('send_message')) return
      setPendingQuote(quote)
    },
    [permissions],
  )

  if (loading) {
    return (
      <div className="discuss-case-view">
        <ClinicalLoading />
      </div>
    )
  }

  if (error) {
    return (
      <div className="discuss-case-view">
        <p className="discuss-case-page__error">{error}</p>
      </div>
    )
  }

  const togglePanel = (panel: Exclude<RightPanel, null>) =>
    setRightPanel((current) => (current === panel ? null : panel))

  return (
    <div className="discuss-case-view">
      <header className="discuss-case-view__header">
        <div className="discuss-case-view__header-main">
          {onBack ? (
            <button
              type="button"
              className="discuss-case-view__back icon-action-btn"
              onClick={onBack}
              title={discussChromeT(chromeLocale, 'backToOverview')}
              aria-label={discussChromeT(chromeLocale, 'backToOverview')}
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ) : null}
          <div className="discuss-case-view__heading">
            <h1 className="discuss-case-view__title">{title}</h1>
            <span className="discuss-case-view__badge">DiscussCase</span>
          </div>
        </div>

        <div className="discuss-case-view__header-actions">
          <button
            type="button"
            className="discuss-case-view__avatars"
            onClick={() => togglePanel('participants')}
            aria-pressed={rightPanel === 'participants'}
            title={discussChromeT(chromeLocale, 'participants')}
          >
            <span className="discuss-case-view__avatar-stack">
              {activeParticipants.slice(0, 4).map((participant) => {
                const isSelf = currentUserId && participant.userId === currentUserId
                const name = isSelf ? discussChromeT(chromeLocale, 'selfLabel') : participant.userId.slice(0, 12)
                const color = getParticipantColor(participant.userId)
                return (
                  <span
                    key={participant.id}
                    className="discuss-case-avatar discuss-case-avatar--sm"
                    style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
                    title={name}
                  >
                    {participantInitials(name)}
                  </span>
                )
              })}
              {activeParticipants.length > 4 ? (
                <span className="discuss-case-avatar discuss-case-avatar--sm discuss-case-avatar--more">
                  +{activeParticipants.length - 4}
                </span>
              ) : null}
            </span>
            <span className="discuss-case-view__avatars-label">
              <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
              {activeParticipants.length}
            </span>
          </button>

          <button
            type="button"
            className={`discuss-case-view__panel-toggle${
              rightPanel === 'document' ? ' discuss-case-view__panel-toggle--active' : ''
            }`}
            onClick={() => togglePanel('document')}
            aria-pressed={rightPanel === 'document'}
          >
            <FileText className="h-4 w-4" strokeWidth={1.75} />
            {discussChromeT(chromeLocale, 'document')}
          </button>

          <button
            type="button"
            className={`discuss-case-view__panel-toggle${
              rightPanel === 'summary' ? ' discuss-case-view__panel-toggle--active' : ''
            }`}
            onClick={() => togglePanel('summary')}
            aria-pressed={rightPanel === 'summary'}
            title={discussChromeT(chromeLocale, 'resolutionHeading')}
          >
            <ClipboardList className="h-4 w-4" strokeWidth={1.75} />
          </button>

          <button
            type="button"
            className="discuss-case-view__export-btn icon-action-btn"
            onClick={handlePrintThread}
            title={discussChromeT(chromeLocale, 'exportPrint')}
            aria-label={discussChromeT(chromeLocale, 'exportPrint')}
          >
            <Printer className="h-4 w-4" strokeWidth={1.75} />
          </button>

          <button
            type="button"
            className="discuss-case-view__export-btn icon-action-btn"
            onClick={handleCopyThread}
            title={discussChromeT(chromeLocale, 'exportCopy')}
            aria-label={discussChromeT(chromeLocale, 'exportCopy')}
          >
            <Copy className="h-4 w-4" strokeWidth={1.75} />
          </button>

          {permissions.includes('manage_discussion') ? (
            <button
              type="button"
              className="discuss-case-view__archive-btn"
              disabled={archiving}
              onClick={() => void handleArchive()}
              title={discussChromeT(chromeLocale, 'archiveTitle')}
            >
              {archiving
                ? discussChromeT(chromeLocale, 'archiving')
                : discussChromeT(chromeLocale, 'archive')}
            </button>
          ) : null}
        </div>
      </header>

      <div
        className={`discuss-case-view__split${
          rightPanel ? ' discuss-case-view__split--with-aside' : ''
        }`}
      >
        <section className="discuss-case-view__chat-column">
          <DiscussCaseChatPanel
            discussionId={discussionId}
            permissions={permissions}
            messages={messages}
            onMessagesChange={handleMessagesChange}
            pendingQuote={pendingQuote}
            onPendingQuoteChange={setPendingQuote}
            onSaveDraftToCase={onSaveDraftToCase}
            participants={participants}
            currentUserId={currentUserId}
            embedded
            locale={chatLocale}
            voiceRetentionDays={voiceRetentionDays}
          />
        </section>

        {rightPanel === 'document' ? (
          <aside className="discuss-case-view__aside discuss-case-view__aside--document">
            <DiscussCaseDocumentViewer
              packageContent={packageContent}
              annotations={annotations}
              participants={participants}
              currentUserId={currentUserId}
              locale={chromeLocale}
              canHighlight={permissions.includes('highlight')}
              canComment={permissions.includes('comment')}
              canCopy={permissions.includes('copy_text')}
              canQuote={permissions.includes('send_message')}
              onHighlight={(input) => void handleHighlight(input)}
              onQuoteToChat={handleQuoteToComposer}
            />
          </aside>
        ) : rightPanel === 'participants' ? (
          <aside className="discuss-case-view__aside discuss-case-view__aside--participants">
            <DiscussCaseParticipants
              discussionId={discussionId}
              participants={participants}
              currentUserId={currentUserId}
              locale={chromeLocale}
              canManage={permissions.includes('manage_discussion')}
              canInvite={permissions.includes('invite_others')}
              onParticipantsChange={setParticipants}
              variant="tab"
            />
          </aside>
        ) : rightPanel === 'summary' ? (
          <aside className="discuss-case-view__aside discuss-case-view__aside--summary">
            <DiscussCaseSummaryPanel
              discussionId={discussionId}
              messages={messages}
              resolutionSummary={resolutionSummary}
              canManage={permissions.includes('manage_discussion')}
              locale={chromeLocale}
              currentUserId={currentUserId}
              participants={participants}
              onMessagesChange={handleMessagesChange}
              onResolutionChange={setResolutionSummary}
            />
          </aside>
        ) : null}
      </div>
    </div>
  )
}
