import { describe, expect, it } from 'vitest'
import {
  DC_VOICE_MAX_BYTES,
  DC_VOICE_MAX_DURATION_MS,
  normalizeVoiceMimeType,
  voiceStoragePath,
} from './discussCaseVoiceStorage'

describe('discussCaseVoiceStorage', () => {
  it('normalizes webm mime variants', () => {
    expect(normalizeVoiceMimeType('audio/webm;codecs=opus')).toBe('audio/webm;codecs=opus')
    expect(normalizeVoiceMimeType('Audio/WebM')).toBe('audio/webm')
  })

  it('rejects unsupported mime types', () => {
    expect(() => normalizeVoiceMimeType('audio/wav')).toThrow('Unsupported audio format')
  })

  it('builds storage paths from discussion and message ids', () => {
    expect(voiceStoragePath('d1', 'm1', 'audio/webm')).toBe('d1/m1.webm')
    expect(voiceStoragePath('d1', 'm1', 'audio/mp4')).toBe('d1/m1.m4a')
  })

  it('exports sensible upload limits', () => {
    expect(DC_VOICE_MAX_BYTES).toBeGreaterThan(1_000_000)
    expect(DC_VOICE_MAX_DURATION_MS).toBe(5 * 60 * 1000)
  })
})
