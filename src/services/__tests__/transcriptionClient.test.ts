import type { UiLanguage } from '../../types/settings'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { transcribeAudio } from '../transcriptionClient'

const fetchMock = vi.fn()
const getAuthHeadersMock = vi.fn(async () => ({ Authorization: 'Bearer test' }))
const getClinicalApiLanguageMock = vi.fn((): UiLanguage => 'de')

vi.mock('../apiClient', () => ({
  API_BASE: 'http://test',
  InsufficientCreditsError: class InsufficientCreditsError extends Error {},
}))

vi.mock('../authHeaders', () => ({
  getAuthHeaders: () => getAuthHeadersMock(),
}))

vi.mock('../clinicalApiFetch', () => ({
  getClinicalApiLanguage: () => getClinicalApiLanguageMock(),
}))

describe('transcribeAudio', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    getAuthHeadersMock.mockClear()
    getClinicalApiLanguageMock.mockClear()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts audio with the active UI language in the request body', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ text: 'Verlauf documentieren' }), { status: 200 }),
    )

    const blob = new Blob(['audio'], { type: 'audio/webm' })
    const text = await transcribeAudio(blob, 'de')

    expect(text).toBe('Verlauf documentieren')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://test/api/transcribe',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      }),
    )
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      language: string
      mimeType: string
      audioBase64: string
    }
    expect(body.language).toBe('de')
    expect(body.mimeType).toBe('audio/webm')
    expect(body.audioBase64).toBeTruthy()
  })

  it('rejects an empty recording without hitting the network', async () => {
    const blob = new Blob([], { type: 'audio/webm' })
    await expect(transcribeAudio(blob, 'de')).rejects.toThrow('empty_recording')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to getClinicalApiLanguage when language is omitted', async () => {
    getClinicalApiLanguageMock.mockReturnValue('en')
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ text: 'ok' }), { status: 200 }))

    const blob = new Blob(['audio'], { type: 'audio/webm' })
    await transcribeAudio(blob)

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { language: string }
    expect(body.language).toBe('en')
    expect(getClinicalApiLanguageMock).toHaveBeenCalled()
  })
})
