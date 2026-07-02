import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const failStaleActiveJobs = vi.fn()
const isAiJobStoreConfigured = vi.fn(() => true)

vi.mock('../aiJobStore', () => ({
  failStaleActiveJobs: (...args: unknown[]) => failStaleActiveJobs(...args),
  isAiJobStoreConfigured: () => isAiJobStoreConfigured(),
  readAiJobStatus: vi.fn(),
  updateAiJob: vi.fn(),
}))

import { recoverStaleAiJobs } from '../aiJobRunner'

describe('recoverStaleAiJobs — cold-start retry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    failStaleActiveJobs.mockReset()
    isAiJobStoreConfigured.mockReturnValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('retries after a transient fetch failure and succeeds', async () => {
    failStaleActiveJobs
      .mockRejectedValueOnce(new Error('TypeError: fetch failed'))
      .mockResolvedValueOnce(2)

    const done = recoverStaleAiJobs()
    await vi.advanceTimersByTimeAsync(60_000)
    await done

    expect(failStaleActiveJobs).toHaveBeenCalledTimes(2)
  })

  it('gives up (non-fatal) after exhausting all attempts', async () => {
    failStaleActiveJobs.mockRejectedValue(new Error('fetch failed'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const done = recoverStaleAiJobs()
    await vi.advanceTimersByTimeAsync(120_000)
    await expect(done).resolves.toBeUndefined()

    expect(failStaleActiveJobs).toHaveBeenCalledTimes(3)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('failed after 3 attempts'),
      expect.any(Error),
    )
    warn.mockRestore()
  })

  it('does nothing when the store is not configured', async () => {
    isAiJobStoreConfigured.mockReturnValue(false)
    await recoverStaleAiJobs()
    expect(failStaleActiveJobs).not.toHaveBeenCalled()
  })
})
