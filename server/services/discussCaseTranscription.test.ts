import { describe, expect, it } from 'vitest'
import {
  applyTranscriptCorrection,
  buildMachineVoiceTranscript,
} from './discussCaseTranscription'

describe('buildMachineVoiceTranscript', () => {
  it('redacts identifiers from the raw transcription text', () => {
    const transcript = buildMachineVoiceTranscript({
      rawText: 'Patient seen on 12.04.1978, reachable at jane@example.com.',
      model: 'gpt-4o-transcribe',
      language: null,
      now: new Date('2026-07-03T10:00:00.000Z'),
    })
    expect(transcript.text).not.toContain('12.04.1978')
    expect(transcript.text).not.toContain('jane@example.com')
    expect(transcript.text).toContain('[REDACTED]')
    expect(transcript.status).toBe('machine')
    expect(transcript.model).toBe('gpt-4o-transcribe')
    expect(transcript.createdAt).toBe('2026-07-03T10:00:00.000Z')
    expect(transcript.editedAt).toBeNull()
  })

  it('trims whitespace and tolerates empty output', () => {
    const transcript = buildMachineVoiceTranscript({ rawText: '   ', model: null, language: null })
    expect(transcript.text).toBe('')
    expect(transcript.status).toBe('machine')
  })
})

describe('applyTranscriptCorrection', () => {
  it('flips provenance to edited while preserving machine metadata', () => {
    const machine = buildMachineVoiceTranscript({
      rawText: 'initial machine text',
      model: 'gpt-4o-transcribe',
      language: null,
      now: new Date('2026-07-03T10:00:00.000Z'),
    })
    const edited = applyTranscriptCorrection({
      existing: machine,
      text: 'corrected by clinician',
      editedBy: 'user-123',
      now: new Date('2026-07-03T11:00:00.000Z'),
    })
    expect(edited.status).toBe('edited')
    expect(edited.text).toBe('corrected by clinician')
    expect(edited.model).toBe('gpt-4o-transcribe')
    expect(edited.createdAt).toBe('2026-07-03T10:00:00.000Z')
    expect(edited.editedAt).toBe('2026-07-03T11:00:00.000Z')
    expect(edited.editedBy).toBe('user-123')
  })

  it('still redacts identifiers pasted into a correction', () => {
    const edited = applyTranscriptCorrection({
      existing: null,
      text: 'Call back at +49 30 1234567',
      editedBy: 'user-123',
    })
    expect(edited.text).not.toContain('+49 30 1234567')
    expect(edited.text).toContain('[REDACTED]')
  })
})
