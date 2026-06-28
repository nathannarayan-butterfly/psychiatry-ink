import { describe, expect, it, vi, beforeEach } from 'vitest'
import { askPharmaQuestion } from '../pharmaAskApi'

const mockGetAuthHeaders = vi.hoisted(() => vi.fn())

vi.mock('../authHeaders', () => ({
  getAuthHeaders: mockGetAuthHeaders,
}))

describe('askPharmaQuestion auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthHeaders.mockResolvedValue({ Authorization: 'Bearer test-token' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ answer: 'ok' }),
      }),
    )
  })

  it('sends Authorization header from getAuthHeaders', async () => {
    await askPharmaQuestion({
      medicationName: 'TestDrug',
      sectionId: 'interactions',
      sectionData: '',
      question: 'Any interactions?',
    })

    expect(mockGetAuthHeaders).toHaveBeenCalled()
    const fetchMock = vi.mocked(fetch)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/pharma-ask'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
      }),
    )
  })
})
