import { describe, expect, it } from 'vitest'
import {
  buildDiscussThreadPlainText,
  type DiscussThreadExportInput,
} from './exportThread'

const labels = {
  voiceMessage: 'Voice message',
  transcriptLabel: 'Transcript',
  pinned: 'Pinned',
  edited: 'edited',
  generatedAt: 'Exported on',
  resolution: 'Outcome / decision',
}

function sampleInput(overrides: Partial<DiscussThreadExportInput> = {}): DiscussThreadExportInput {
  return {
    title: 'Case discussion',
    generatedAt: '2026-07-03T10:00:00.000Z',
    resolutionSummary: null,
    messages: [],
    labels,
    ...overrides,
  }
}

describe('buildDiscussThreadPlainText', () => {
  it('includes title, author, body and the export timestamp', () => {
    const text = buildDiscussThreadPlainText(
      sampleInput({
        messages: [
          {
            authorName: 'Dr. Schmidt',
            roleTag: 'Owner',
            createdAt: '2026-07-03T09:00:00.000Z',
            pinned: false,
            edited: false,
            kind: 'text',
            body: 'Needs review',
          },
        ],
      }),
    )
    expect(text).toContain('Case discussion')
    expect(text).toContain('Exported on')
    expect(text).toContain('Dr. Schmidt')
    expect(text).toContain('Needs review')
    expect(text).toContain('(Owner)')
  })

  it('renders voice messages with their transcript and a pinned flag', () => {
    const text = buildDiscussThreadPlainText(
      sampleInput({
        messages: [
          {
            authorName: 'Dr. Lee',
            createdAt: '2026-07-03T09:00:00.000Z',
            pinned: true,
            edited: true,
            kind: 'voice',
            body: '',
            transcript: 'the patient reports improved sleep',
          },
        ],
      }),
    )
    expect(text).toContain('[Voice message]')
    expect(text).toContain('Transcript: the patient reports improved sleep')
    expect(text).toContain('Pinned')
    expect(text).toContain('(edited)')
  })

  it('prepends the resolution summary when present', () => {
    const text = buildDiscussThreadPlainText(
      sampleInput({ resolutionSummary: 'Continue current medication for 4 weeks.' }),
    )
    expect(text).toContain('Outcome / decision:')
    expect(text).toContain('Continue current medication for 4 weeks.')
  })
})
