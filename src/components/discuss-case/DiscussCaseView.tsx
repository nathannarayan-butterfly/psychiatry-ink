import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, FileText, Users } from 'lucide-react'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import type {
  DiscussCaseAnnotation,
  DiscussCaseMessage,
  DiscussCaseParticipant,
  DiscussCasePermission,
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
import { DiscussCaseDocumentViewer } from './DiscussCaseDocumentViewer'
import { DiscussCaseParticipants } from './DiscussCaseParticipants'
import { DiscussCaseChatPanel } from './DiscussCaseChatPanel'
import { createHighlightAnnotation } from '../../utils/discussCase/createHighlightAnnotation'

interface DiscussCaseViewProps {
  discussionId: string
  onSaveDraftToCase?: (text: string) => void
  onArchived?: () => void
  onBack?: () => void
}

type RightPanel = 'document' | 'participants' | null

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
  // The chat is the centerpiece — open as a clean single column. The shared
  // package document and participant roster are opt-in drawers via the header
  // toggles, so Discuss never stacks extra panels around the conversation.
  const [rightPanel, setRightPanel] = useState<RightPanel>(null)

  // UI language for the chat surface (voice / reactions / reply strings). The
  // platform supports DE + EN; without this the chat fell back to German for
  // English users despite the panel carrying full translations.
  const chatLocale = loadStoredUiLanguage()

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
    const confirmed = window.confirm(
      'Besprechung archivieren? Identifizierte Patientendaten werden anschließend aus der Datenbank gelöscht.',
    )
    if (!confirmed) return
    setArchiving(true)
    try {
      await archiveDiscussion(discussionId, 'archived')
      onArchived?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archivieren fehlgeschlagen')
    } finally {
      setArchiving(false)
    }
  }, [archiving, discussionId, onArchived])

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

        const raw = session.package
        if (raw && isEncryptedEnvelope(raw)) {
          // Identified package is E2EE — decrypt locally with the key resolved
          // from the invite-link fragment or previously persisted locally.
          const key = await resolveKey(discussKeyStorageId(discussionId))
          if (!key) {
            if (!cancelled) {
              setError(
                'Entschlüsselungs-Schlüssel fehlt. Bitte öffnen Sie die Besprechung erneut über den ursprünglichen Einladungslink.',
              )
            }
            return
          }
          try {
            const decrypted = await decryptJson<DiscussPackageContent>(key, raw)
            if (!cancelled) setPackageContent(decrypted)
          } catch {
            if (!cancelled) {
              setError('Paket konnte nicht entschlüsselt werden (ungültiger Schlüssel).')
            }
            return
          }
        } else if (!cancelled) {
          setPackageContent(raw)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen')
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
              title="Zurück zur Übersicht"
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
            title="Teilnehmer"
          >
            <span className="discuss-case-view__avatar-stack">
              {activeParticipants.slice(0, 4).map((participant) => {
                const isSelf = currentUserId && participant.userId === currentUserId
                const name = isSelf ? 'Sie' : participant.userId.slice(0, 12)
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
            Dokument
          </button>

          {permissions.includes('manage_discussion') ? (
            <button
              type="button"
              className="discuss-case-view__archive-btn"
              disabled={archiving}
              onClick={() => void handleArchive()}
              title="Besprechung beenden und identifizierte Daten löschen"
            >
              {archiving ? 'Archivieren…' : 'Archivieren'}
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
              canManage={permissions.includes('manage_discussion')}
              canInvite={permissions.includes('invite_others')}
              onParticipantsChange={setParticipants}
              variant="tab"
            />
          </aside>
        ) : null}
      </div>
    </div>
  )
}
