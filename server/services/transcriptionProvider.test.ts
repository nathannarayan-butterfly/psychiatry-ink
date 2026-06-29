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

  // Guards the "wrong transcription" fix: MediaRecorder labels its output with a
  // parameterised type (audio/webm;codecs=opus). OpenAI sniffs the format from
  // the upload filename, so the multipart Content-Type and the filename
  // extension MUST agree on the canonical container. A mismatch is a classic
  // cause of garbled/empty transcripts.
  it('uploads a canonical container type + matching filename for webm/opus', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ text: 'hallo' }), { status: 200 }))

    const { transcribeAudioBuffer } = await import('./transcriptionProvider')
    await transcribeAudioBuffer(Buffer.from('fake-audio'), 'audio/webm;codecs=opus', {
      language: 'de',
    })

    const [url, options] = fetchMock.mock.calls[0] as [string, { body: FormData }]
    expect(url).toBe('https://api.openai.com/v1/audio/transcriptions')
    const file = options.body.get('file') as File
    expect(file).toBeInstanceOf(Blob)
    // Filename extension OpenAI uses for format detection.
    expect(file.name).toBe('recording.webm')
    // Content-Type stripped of the `;codecs=opus` parameter so it matches the
    // filename extension.
    expect(file.type).toBe('audio/webm')
    expect(options.body.get('model')).toBeTruthy()
    expect(options.body.get('language')).toBe('de')
  })

  it('maps mp4 captures to an m4a filename + canonical type', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ text: 'hola' }), { status: 200 }))

    const { transcribeAudioBuffer } = await import('./transcriptionProvider')
    await transcribeAudioBuffer(Buffer.from('fake-audio'), 'audio/mp4', { language: 'es' })

    const [, options] = fetchMock.mock.calls[0] as [string, { body: FormData }]
    const file = options.body.get('file') as File
    expect(file.name).toBe('recording.m4a')
    expect(file.type).toBe('audio/mp4')
  })
})
