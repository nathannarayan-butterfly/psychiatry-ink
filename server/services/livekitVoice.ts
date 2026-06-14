/**
 * LiveKit voice token minting for DiscussCase ephemeral voice rooms.
 *
 * Required environment variables (server-only — do NOT prefix with VITE_):
 *   LIVEKIT_API_KEY    — LiveKit Cloud or self-hosted API key
 *   LIVEKIT_API_SECRET — matching API secret
 *   LIVEKIT_URL        — WebSocket URL, e.g. wss://your-project.livekit.cloud
 *                        For EU data residency use a LiveKit Cloud EU region URL.
 *
 * Recording is disabled at the token level (no egress/record grants).
 * Voice data is ephemeral — nothing is stored server-side.
 */
import { AccessToken, TrackSource } from 'livekit-server-sdk'

const TOKEN_TTL_SECONDS = 60 * 60 // 1 hour

const LIVEKIT_ENV_KEYS = ['LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'LIVEKIT_URL'] as const

function readLiveKitEnv(key: (typeof LIVEKIT_ENV_KEYS)[number]): string {
  return process.env[key]?.trim() ?? ''
}

/** Names of required LiveKit env vars that are missing or blank (never returns values). */
export function liveKitMissingEnvVars(): string[] {
  return LIVEKIT_ENV_KEYS.filter((key) => !readLiveKitEnv(key))
}

export function isLiveKitConfigured(): boolean {
  return liveKitMissingEnvVars().length === 0
}

export function liveKitWsUrl(): string | null {
  const url = readLiveKitEnv('LIVEKIT_URL')
  return url || null
}

export function discussCaseRoomName(discussionId: string): string {
  return `dc-${discussionId}`
}

export async function mintDiscussCaseVoiceToken(input: {
  discussionId: string
  userId: string
  displayName?: string | null
}): Promise<{ token: string; url: string; roomName: string }> {
  const apiKey = readLiveKitEnv('LIVEKIT_API_KEY')
  const apiSecret = readLiveKitEnv('LIVEKIT_API_SECRET')
  const url = liveKitWsUrl()

  if (!apiKey || !apiSecret || !url) {
    throw new Error('LiveKit not configured')
  }

  const roomName = discussCaseRoomName(input.discussionId)
  const displayName = input.displayName?.trim() || input.userId.slice(0, 12)

  const token = new AccessToken(apiKey, apiSecret, {
    identity: input.userId,
    name: displayName,
    ttl: TOKEN_TTL_SECONDS,
  })

  // Audio-only publish; subscribe to others. No recording/egress grants.
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
    canPublishSources: [TrackSource.MICROPHONE],
  })

  const jwt = await token.toJwt()

  return { token: jwt, url, roomName }
}
