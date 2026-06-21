import { afterEach, describe, expect, it } from 'vitest'
import {
  TYPING_TTL_MS,
  listTypingParticipants,
  markParticipantTyping,
  resetDiscussCasePresence,
} from './discussCasePresence'

afterEach(() => {
  resetDiscussCasePresence()
})

describe('discuss-case presence', () => {
  it('lists participants typing in a discussion, excluding the caller', () => {
    const now = 1_000_000
    markParticipantTyping('disc-1', 'user-a', now)
    markParticipantTyping('disc-1', 'user-b', now)
    expect(listTypingParticipants('disc-1', 'user-a', now).sort()).toEqual(['user-b'])
    expect(listTypingParticipants('disc-1', undefined, now).sort()).toEqual(['user-a', 'user-b'])
  })

  it('scopes typing state per discussion (no cross-talk)', () => {
    const now = 1_000_000
    markParticipantTyping('disc-1', 'user-a', now)
    markParticipantTyping('disc-2', 'user-b', now)
    expect(listTypingParticipants('disc-1', undefined, now)).toEqual(['user-a'])
    expect(listTypingParticipants('disc-2', undefined, now)).toEqual(['user-b'])
  })

  it('drops stale entries past the TTL', () => {
    const now = 1_000_000
    markParticipantTyping('disc-1', 'user-a', now)
    const later = now + TYPING_TTL_MS + 1
    expect(listTypingParticipants('disc-1', undefined, later)).toEqual([])
  })
})
