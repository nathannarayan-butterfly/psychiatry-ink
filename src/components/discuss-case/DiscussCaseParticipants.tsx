import { useCallback, useState } from 'react'
import { Link2, Send, UserPlus, Users, X } from 'lucide-react'
import type {
  DiscussCaseParticipant,
  DiscussInviteType,
} from '../../types/discussCase'
import {
  createDiscussInvite,
  revokeDiscussParticipant,
} from '../../services/discussCaseApi'
import {
  buildKeyFragment,
  discussKeyStorageId,
  loadKeyBase64Url,
} from '../../utils/e2ee'
import { getParticipantColor } from '../../utils/discussCase/participantColors'

interface DiscussCaseParticipantsProps {
  discussionId: string
  participants: DiscussCaseParticipant[]
  currentUserId?: string
  canManage: boolean
  canInvite: boolean
  onParticipantsChange: (participants: DiscussCaseParticipant[]) => void
  variant?: 'standalone' | 'tab'
}

const ROLE_LABELS: Record<DiscussCaseParticipant['role'], string> = {
  owner: 'Eigentümer',
  internal: 'Intern',
  external: 'Extern',
}

function accessLabel(participant: DiscussCaseParticipant): string {
  return participant.permissions.includes('view_identified_data')
    ? 'Identifiziert'
    : 'De-identifiziert'
}

function displayName(participant: DiscussCaseParticipant, currentUserId?: string): string {
  if (currentUserId && participant.userId === currentUserId) return 'Sie'
  return participant.userId.slice(0, 12)
}

export function DiscussCaseParticipants({
  discussionId,
  participants,
  currentUserId,
  canManage,
  canInvite,
  onParticipantsChange,
  variant = 'standalone',
}: DiscussCaseParticipantsProps) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteeEmail, setInviteeEmail] = useState('')
  const [inviteType, setInviteType] = useState<DiscussInviteType>('internal')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const activeParticipants = participants.filter((p) => p.status !== 'revoked')

  const handleInvite = useCallback(async () => {
    if (busy || !inviteeEmail.trim()) return
    setBusy(true)
    setError(null)
    setNotice(null)
    setInviteLink(null)
    try {
      const invite = await createDiscussInvite({
        discussionId,
        inviteeEmail: inviteeEmail.trim(),
        inviteType,
      })
      if (invite.inviteToken) {
        const base = `${window.location.origin}/discuss/invite/${invite.inviteToken}`
        // Internal invitees need the E2EE key (kept locally by the creator) so
        // they can decrypt the identified package. External invitees only ever
        // receive the plaintext de-identified package — no key in the link.
        if (inviteType === 'internal') {
          const keyB64 = loadKeyBase64Url(discussKeyStorageId(discussionId))
          if (keyB64) {
            setInviteLink(`${base}${buildKeyFragment(keyB64)}`)
          } else {
            setInviteLink(base)
            setNotice(
              'Hinweis: Der Entschlüsselungs-Schlüssel ist auf diesem Gerät nicht verfügbar. ' +
                'Die eingeladene Person kann nur de-identifizierte Inhalte sehen.',
            )
          }
        } else {
          setInviteLink(base)
        }
      }
      setInviteeEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Einladung fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }, [busy, discussionId, inviteeEmail, inviteType])

  const handleRevoke = useCallback(
    async (participant: DiscussCaseParticipant) => {
      const confirmed = window.confirm(
        `Zugriff von „${displayName(participant, currentUserId)}" entziehen?`,
      )
      if (!confirmed) return
      try {
        const updated = await revokeDiscussParticipant(discussionId, participant.id)
        onParticipantsChange(
          participants.map((p) => (p.id === updated.id ? updated : p)),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Entziehen fehlgeschlagen')
      }
    },
    [currentUserId, discussionId, onParticipantsChange, participants],
  )

  return (
    <section
      className={[
        'discuss-case-participants',
        variant === 'tab' ? 'discuss-case-participants--tab' : '',
      ].join(' ').trim()}
      aria-label="Teilnehmer"
    >
      <header className="discuss-case-participants__header">
        {variant === 'standalone' ? (
          <span className="discuss-case-participants__title">
            <Users className="h-4 w-4" strokeWidth={1.75} />
            Teilnehmer
            <span className="discuss-case-participants__count">{activeParticipants.length}</span>
          </span>
        ) : (
          <span className="discuss-case-participants__tab-meta">
            {activeParticipants.length} aktiv
          </span>
        )}
        {canInvite ? (
          <button
            type="button"
            className="discuss-case-participants__invite-toggle"
            onClick={() => {
              setInviteOpen((prev) => !prev)
              setInviteLink(null)
              setError(null)
              setNotice(null)
            }}
          >
            <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
            Einladen
          </button>
        ) : null}
      </header>

      {participants.length === 0 ? (
        <p className="clinical-empty-state clinical-empty-state--compact discuss-case-participants__empty">Noch keine Teilnehmer.</p>
      ) : (
        <ul className="discuss-case-participants__list">
          {participants.map((participant) => {
            const revoked = participant.status === 'revoked'
            const color = getParticipantColor(participant.userId)
            return (
              <li
                key={participant.id}
                className={
                  revoked
                    ? 'discuss-case-participants__item discuss-case-participants__item--revoked'
                    : 'discuss-case-participants__item'
                }
              >
                <span
                  className="discuss-case-participants__color-dot"
                  style={{ backgroundColor: color.highlight, borderColor: color.border }}
                  aria-hidden="true"
                />
                <span
                  className="discuss-case-participants__name"
                  style={{ color: color.text }}
                >
                  {displayName(participant, currentUserId)}
                </span>
                <span className="discuss-case-participants__badges">
                  <span className="discuss-case-participants__badge">
                    {ROLE_LABELS[participant.role]}
                  </span>
                  <span className="discuss-case-participants__badge discuss-case-participants__badge--access">
                    {accessLabel(participant)}
                  </span>
                  {revoked ? (
                    <span className="discuss-case-participants__badge discuss-case-participants__badge--revoked">
                      Zugriff entzogen
                    </span>
                  ) : null}
                </span>
                {canManage &&
                !revoked &&
                participant.role !== 'owner' &&
                participant.userId !== currentUserId ? (
                  <button
                    type="button"
                    className="discuss-case-participants__revoke"
                    title="Zugriff entziehen"
                    onClick={() => void handleRevoke(participant)}
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {inviteOpen && canInvite ? (
        <div className="discuss-case-participants__invite">
          <input
            type="text"
            className="discuss-case-participants__invite-input"
            value={inviteeEmail}
            onChange={(e) => setInviteeEmail(e.target.value)}
            placeholder="E-Mail / Benutzername"
          />
          <div className="discuss-case-participants__invite-type">
            <label>
              <input
                type="radio"
                name="dc-invite-type"
                checked={inviteType === 'internal'}
                onChange={() => setInviteType('internal')}
              />
              Intern
            </label>
            <label>
              <input
                type="radio"
                name="dc-invite-type"
                checked={inviteType === 'external'}
                onChange={() => setInviteType('external')}
              />
              Extern (de-identifiziert)
            </label>
          </div>
          <button
            type="button"
            className="discuss-case-participants__invite-send"
            disabled={busy || !inviteeEmail.trim()}
            onClick={() => void handleInvite()}
          >
            <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
            Einladung erstellen
          </button>
          {error ? <p className="discuss-case-participants__error">{error}</p> : null}
          {notice ? <p className="discuss-case-participants__notice">{notice}</p> : null}
          {inviteLink ? (
            <p className="discuss-case-participants__link">
              <Link2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              <code>{inviteLink}</code>
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
