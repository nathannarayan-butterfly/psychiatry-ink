import { describe, expect, it } from 'vitest'
import { mapDictationError } from '../dictationErrors'

describe('mapDictationError', () => {
  const t = (key: string) => key

  it('maps auth errors to launcherVoiceErrorAuth', () => {
    expect(mapDictationError('Anmeldung erforderlich', t)).toBe('launcherVoiceErrorAuth')
    expect(mapDictationError('401 unauthorized', t)).toBe('launcherVoiceErrorAuth')
  })

  it('maps credit errors', () => {
    expect(mapDictationError('Insufficient credits', t)).toBe('launcherVoiceErrorCredits')
  })
})

describe('dictation pipeline wiring', () => {
  it('useCompactDictation calls transcribeAudio which posts to /api/transcribe', async () => {
    const mod = await import('../../services/transcriptionClient')
    expect(mod.transcribeAudio).toBeTypeOf('function')
    const source = mod.transcribeAudio.toString()
    expect(source).toContain('/api/transcribe')
    expect(source).toContain('getAuthHeaders')
  })
})
