import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { callGenerateApi } from '../generateApi'

const fetchMock = vi.fn()

vi.mock('../clinicalApiFetch', () => ({
  clinicalApiFetch: (...args: unknown[]) => fetchMock(...args),
  parseClinicalApiError: async (response: Response, fallback: string) => {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(`KI-Anfrage fehlgeschlagen: ${detail?.error ?? fallback}`)
  },
}))

describe('callGenerateApi', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('posts to /api/generate via clinicalApiFetch with auth-capable client', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ text: 'Analyse OK' }), { status: 200 }),
    )

    const text = await callGenerateApi({
      tier: 'fast',
      systemPrompt: 'system',
      userPrompt: 'user',
      caseId: 'case-1',
    })

    expect(text).toBe('Analyse OK')
    expect(fetchMock).toHaveBeenCalledWith('/api/generate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        tier: 'fast',
        systemPrompt: 'system',
        userPrompt: 'user',
        caseId: 'case-1',
      }),
    }))
  })

  it('surfaces server auth errors instead of a generic failure', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Anmeldung erforderlich' }), { status: 401 }),
    )

    await expect(
      callGenerateApi({ tier: 'fast', systemPrompt: 's', userPrompt: 'u' }),
    ).rejects.toThrow('KI-Anfrage fehlgeschlagen: Anmeldung erforderlich')
  })
})
