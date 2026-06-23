import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

describe('transcribeAudioBuffer', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    process.env.OPENAI_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.OPENAI_API_KEY
  })

  it('forwards the language hint to OpenAI transcription', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ text: 'Verlauf documentieren' }), { status: 200 }),
    )

    const { transcribeAudioBuffer } = await import('./transcriptionProvider')
    const result = await transcribeAudioBuffer(Buffer.from('fake-audio'), 'audio/webm', {
      language: 'de',
    })

    expect(result.text).toBe('Verlauf documentieren')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [, options] = fetchMock.mock.calls[0] as [string, { body: FormData }]
    const form = options.body
    expect(form.get('language')).toBe('de')
    expect(form.get('model')).toBeTruthy()
    expect(form.get('file')).toBeTruthy()
  })

  it('omits language when not provided', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ text: 'hello' }), { status: 200 }))

    const { transcribeAudioBuffer } = await import('./transcriptionProvider')
    await transcribeAudioBuffer(Buffer.from('fake-audio'), 'audio/webm')

    const [, options] = fetchMock.mock.calls[0] as [string, { body: FormData }]
    expect(options.body.get('language')).toBeNull()
  })
})
