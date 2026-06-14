import { Mic, MicOff, Phone, PhoneOff, Users } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ConnectionState,
  Room,
  RoomEvent,
  type RemoteParticipant,
} from 'livekit-client'
import { fetchDiscussVoiceToken } from '../../services/discussCaseApi'

interface DiscussCaseVoicePanelProps {
  discussionId: string
  canJoinVoice: boolean
  voiceConfigured: boolean
  currentUserId?: string
}

type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'error'

function participantLabel(
  identity: string,
  name: string | undefined,
  currentUserId?: string,
): string {
  if (currentUserId && identity === currentUserId) return 'Sie'
  return name?.trim() || identity.slice(0, 12)
}

function isMicEnabled(participant: { isMicrophoneEnabled: boolean }): boolean {
  return participant.isMicrophoneEnabled
}

function collectVoiceParticipants(
  room: Room | null,
  currentUserId?: string,
): { identity: string; name: string; isLocal: boolean; muted: boolean }[] {
  if (!room) return []

  const list: { identity: string; name: string; isLocal: boolean; muted: boolean }[] = []

  if (room.localParticipant) {
    list.push({
      identity: room.localParticipant.identity,
      name: participantLabel(
        room.localParticipant.identity,
        room.localParticipant.name,
        currentUserId,
      ),
      isLocal: true,
      muted: !isMicEnabled(room.localParticipant),
    })
  }

  room.remoteParticipants.forEach((remote: RemoteParticipant) => {
    list.push({
      identity: remote.identity,
      name: participantLabel(remote.identity, remote.name, currentUserId),
      isLocal: false,
      muted: !isMicEnabled(remote),
    })
  })

  return list
}

export function DiscussCaseVoicePanel({
  discussionId,
  canJoinVoice,
  voiceConfigured,
  currentUserId,
}: DiscussCaseVoicePanelProps) {
  const roomRef = useRef<Room | null>(null)
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [voiceParticipants, setVoiceParticipants] = useState<
    { identity: string; name: string; isLocal: boolean; muted: boolean }[]
  >([])

  const refreshParticipants = useCallback(() => {
    setVoiceParticipants(collectVoiceParticipants(roomRef.current, currentUserId))
  }, [currentUserId])

  const disconnect = useCallback(async () => {
    const room = roomRef.current
    roomRef.current = null
    if (room) {
      room.removeAllListeners()
      await room.disconnect()
    }
    setStatus('idle')
    setMuted(false)
    setVoiceParticipants([])
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      void disconnect()
    }
  }, [disconnect])

  const handleJoin = useCallback(async () => {
    if (!canJoinVoice || status === 'connecting' || status === 'connected') return

    setStatus('connecting')
    setError(null)

    try {
      const { token, url } = await fetchDiscussVoiceToken(discussionId)

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      roomRef.current = room

      const sync = () => refreshParticipants()

      room.on(RoomEvent.ParticipantConnected, sync)
      room.on(RoomEvent.ParticipantDisconnected, sync)
      room.on(RoomEvent.TrackMuted, sync)
      room.on(RoomEvent.TrackUnmuted, sync)
      room.on(RoomEvent.LocalTrackPublished, sync)
      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (state === ConnectionState.Disconnected) {
          void disconnect()
        }
      })

      await room.connect(url, token)
      await room.localParticipant.setMicrophoneEnabled(true)

      setMuted(false)
      setStatus('connected')
      refreshParticipants()
    } catch (err) {
      roomRef.current = null
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Verbindung fehlgeschlagen')
    }
  }, [
    canJoinVoice,
    discussionId,
    disconnect,
    refreshParticipants,
    status,
  ])

  const handleLeave = useCallback(() => {
    void disconnect()
  }, [disconnect])

  const handleToggleMute = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    const nextMuted = !muted
    await room.localParticipant.setMicrophoneEnabled(!nextMuted)
    setMuted(nextMuted)
    refreshParticipants()
  }, [muted, refreshParticipants])

  if (!voiceConfigured) {
    return (
      <section className="discuss-case-voice discuss-case-voice--disabled">
        <header className="discuss-case-voice__header">
          <Phone className="h-4 w-4" strokeWidth={1.75} />
          <h2 className="discuss-case-voice__title">Sprachchat</h2>
        </header>
        <p className="discuss-case-voice__notice">Sprachchat nicht konfiguriert.</p>
        <p className="discuss-case-voice__hint">
          LiveKit-Umgebungsvariablen auf dem Server setzen: LIVEKIT_API_KEY, LIVEKIT_API_SECRET,
          LIVEKIT_URL
        </p>
      </section>
    )
  }

  if (!canJoinVoice) {
    return (
      <section className="discuss-case-voice discuss-case-voice--disabled">
        <header className="discuss-case-voice__header">
          <Phone className="h-4 w-4" strokeWidth={1.75} />
          <h2 className="discuss-case-voice__title">Sprachchat</h2>
        </header>
        <p className="discuss-case-voice__notice">
          Keine Berechtigung für Sprachchat (nur interne Teilnehmer).
        </p>
      </section>
    )
  }

  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'

  return (
    <section className="discuss-case-voice">
      <header className="discuss-case-voice__header">
        <Phone className="h-4 w-4" strokeWidth={1.75} />
        <h2 className="discuss-case-voice__title">Sprachchat</h2>
        {isConnected ? (
          <span className="discuss-case-voice__live-badge">Live</span>
        ) : null}
      </header>

      <div className="discuss-case-voice__participants">
        {voiceParticipants.length === 0 ? (
          <p className="discuss-case-voice__empty">
            <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
            Niemand im Sprachchat
          </p>
        ) : (
          <ul className="discuss-case-voice__list">
            {voiceParticipants.map((p) => (
              <li key={p.identity} className="discuss-case-voice__participant">
                <span className="discuss-case-voice__participant-name">{p.name}</span>
                {p.muted ? (
                  <MicOff className="discuss-case-voice__mic-icon discuss-case-voice__mic-icon--muted" />
                ) : (
                  <Mic className="discuss-case-voice__mic-icon" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="discuss-case-voice__error">{error}</p> : null}

      <div className="discuss-case-voice__controls">
        {!isConnected ? (
          <button
            type="button"
            className="discuss-case-voice__btn discuss-case-voice__btn--primary"
            disabled={isConnecting}
            onClick={() => void handleJoin()}
          >
            <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
            {isConnecting ? 'Verbinden…' : 'Beitreten'}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="discuss-case-voice__btn"
              onClick={() => void handleToggleMute()}
            >
              {muted ? (
                <>
                  <MicOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Mikrofon an
                </>
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Stumm
                </>
              )}
            </button>
            <button
              type="button"
              className="discuss-case-voice__btn discuss-case-voice__btn--leave"
              onClick={handleLeave}
            >
              <PhoneOff className="h-3.5 w-3.5" strokeWidth={1.75} />
              Verlassen
            </button>
          </>
        )}
      </div>
    </section>
  )
}
