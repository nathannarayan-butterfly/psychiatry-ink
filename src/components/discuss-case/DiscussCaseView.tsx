import { useCallback, useEffect, useState } from 'react'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import type {
  DiscussCaseAnnotation,
  DiscussCaseMessage,
  DiscussCaseParticipant,
  DiscussCasePermission,
  DiscussPackageContent,
  DiscussQuoteExcerpt,
} from '../../types/discussCase'
import { archiveDiscussion, loadDiscussSession } from '../../services/discussCaseApi'
import {
  decryptJson,
  discussKeyStorageId,
  isEncryptedEnvelope,
  resolveKey,
} from '../../utils/e2ee'
import { DiscussCaseDocumentViewer } from './DiscussCaseDocumentViewer'
import { DiscussCaseParticipants } from './DiscussCaseParticipants'
import { DiscussCaseVoicePanel } from './DiscussCaseVoicePanel'
import { DiscussCaseChatPanel } from './DiscussCaseChatPanel'
import { createHighlightAnnotation } from '../../utils/discussCase/createHighlightAnnotation'

interface DiscussCaseViewProps {
  discussionId: string
  onSaveDraftToCase?: (text: string) => void
  onArchived?: () => void
}

export function DiscussCaseView({ discussionId, onSaveDraftToCase, onArchived }: DiscussCaseViewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [packageContent, setPackageContent] = useState<DiscussPackageContent | null>(null)
  const [permissions, setPermissions] = useState<DiscussCasePermission[]>([])
  const [messages, setMessages] = useState<DiscussCaseMessage[]>([])
  const [annotations, setAnnotations] = useState<DiscussCaseAnnotation[]>([])
  const [quoteDraft, setQuoteDraft] = useState<DiscussQuoteExcerpt | null>(null)
  const [archiving, setArchiving] = useState(false)
  const [participants, setParticipants] = useState<DiscussCaseParticipant[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)
  const [voiceConfigured, setVoiceConfigured] = useState(false)
  const [canJoinVoice, setCanJoinVoice] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'teilnehmer'>('chat')

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
        setVoiceConfigured(session.voice?.configured ?? false)
        setCanJoinVoice(
          session.voice?.canJoin ?? session.permissions.includes('join_voice'),
        )

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

  return (
    <div className="discuss-case-view">
      <header className="discuss-case-view__header">
        <h1 className="discuss-case-view__title">{title}</h1>
        <div className="discuss-case-view__header-actions">
          <span className="discuss-case-view__badge">DiscussCase</span>
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

      <div className="discuss-case-view__split">
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
          onQuoteToChat={(quote) => setQuoteDraft(quote)}
        />

        <aside className="discuss-case-view__sidebar">
          <nav className="discuss-case-sidebar-tabs" aria-label="Seitenleiste">
            <button
              type="button"
              className={[
                'discuss-case-sidebar-tabs__tab',
                sidebarTab === 'chat' ? 'discuss-case-sidebar-tabs__tab--active' : '',
              ].join(' ').trim()}
              onClick={() => setSidebarTab('chat')}
            >
              Chat
            </button>
            <button
              type="button"
              className={[
                'discuss-case-sidebar-tabs__tab',
                sidebarTab === 'teilnehmer' ? 'discuss-case-sidebar-tabs__tab--active' : '',
              ].join(' ').trim()}
              onClick={() => setSidebarTab('teilnehmer')}
            >
              Teilnehmer
              {participants.filter((p) => p.status !== 'revoked').length > 0 ? (
                <span className="discuss-case-sidebar-tabs__count">
                  {participants.filter((p) => p.status !== 'revoked').length}
                </span>
              ) : null}
            </button>
          </nav>

          {sidebarTab === 'chat' ? (
            <div className="discuss-case-view__sidebar-panel">
              <DiscussCaseVoicePanel
                discussionId={discussionId}
                canJoinVoice={canJoinVoice}
                voiceConfigured={voiceConfigured}
                currentUserId={currentUserId}
              />

              <DiscussCaseChatPanel
                discussionId={discussionId}
                permissions={permissions}
                messages={messages}
                onMessagesChange={setMessages}
                quoteDraft={quoteDraft}
                onQuoteConsumed={() => setQuoteDraft(null)}
                onSaveDraftToCase={onSaveDraftToCase}
                participants={participants}
                currentUserId={currentUserId}
                embedded
              />
            </div>
          ) : (
            <div className="discuss-case-view__sidebar-panel discuss-case-view__sidebar-panel--teilnehmer">
              <DiscussCaseParticipants
                discussionId={discussionId}
                participants={participants}
                currentUserId={currentUserId}
                canManage={permissions.includes('manage_discussion')}
                canInvite={permissions.includes('invite_others')}
                onParticipantsChange={setParticipants}
                variant="tab"
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
