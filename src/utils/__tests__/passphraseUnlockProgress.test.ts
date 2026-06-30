// @vitest-environment node
//
// Unit tests for the passphrase-unlock state machine. The machine is the
// source of truth for the stepped UI in `components/auth/PassphraseUnlockProgress.tsx`
// — its transitions are exactly what the user sees. See RECOVERY_REPORT.md Part B.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  UNLOCK_STEP_IDS,
  activateUnlockStep,
  completeUnlockStep,
  failUnlockStep,
  finishPassphraseUnlock,
  getPassphraseUnlockProgress,
  resetPassphraseUnlockProgress,
  startPassphraseUnlock,
  subscribeToPassphraseUnlockProgress,
  updateUnlockStepCount,
} from '../passphraseUnlockProgress'

describe('passphraseUnlockProgress — state machine', () => {
  beforeEach(() => {
    resetPassphraseUnlockProgress()
  })

  afterEach(() => {
    resetPassphraseUnlockProgress()
  })

  it('starts every step in the pending state', () => {
    startPassphraseUnlock()
    const progress = getPassphraseUnlockProgress()

    expect(progress.inProgress).toBe(true)
    expect(progress.completed).toBe(false)
    expect(progress.failedStepId).toBeNull()
    expect(progress.steps).toHaveLength(UNLOCK_STEP_IDS.length)
    for (const step of progress.steps) {
      expect(step.state).toBe('pending')
      expect(step.processed).toBeUndefined()
      expect(step.total).toBeUndefined()
    }
  })

  it('progresses through every step in order — derivingKey → fetchingSnapshots → decrypting → populatingCache → done', () => {
    startPassphraseUnlock()

    activateUnlockStep('derivingKey')
    expect(getPassphraseUnlockProgress().steps[0]).toMatchObject({
      id: 'derivingKey',
      state: 'active',
    })

    completeUnlockStep('derivingKey')
    activateUnlockStep('fetchingSnapshots', 5)
    let progress = getPassphraseUnlockProgress()
    expect(progress.steps[0].state).toBe('success')
    expect(progress.steps[1]).toMatchObject({
      id: 'fetchingSnapshots',
      state: 'active',
      total: 5,
      processed: 0,
    })

    updateUnlockStepCount('fetchingSnapshots', { processed: 3, total: 5 })
    expect(getPassphraseUnlockProgress().steps[1].processed).toBe(3)

    completeUnlockStep('fetchingSnapshots')
    activateUnlockStep('decrypting', 5)
    progress = getPassphraseUnlockProgress()
    expect(progress.steps[1].state).toBe('success')
    expect(progress.steps[2]).toMatchObject({ id: 'decrypting', state: 'active', total: 5 })

    completeUnlockStep('decrypting')
    activateUnlockStep('populatingCache', 5)
    progress = getPassphraseUnlockProgress()
    expect(progress.steps[2].state).toBe('success')
    expect(progress.steps[3]).toMatchObject({ id: 'populatingCache', state: 'active' })

    completeUnlockStep('populatingCache')
    finishPassphraseUnlock()
    progress = getPassphraseUnlockProgress()

    expect(progress.inProgress).toBe(false)
    expect(progress.completed).toBe(true)
    expect(progress.failedStepId).toBeNull()
    expect(progress.steps.map((s) => s.state)).toEqual([
      'success',
      'success',
      'success',
      'success',
      'success',
    ])
  })

  it('marks a failing step as error and stops the machine', () => {
    startPassphraseUnlock()
    activateUnlockStep('derivingKey')
    failUnlockStep('derivingKey', 'Wrong passphrase')

    const progress = getPassphraseUnlockProgress()
    expect(progress.steps[0]).toMatchObject({
      id: 'derivingKey',
      state: 'error',
      errorMessage: 'Wrong passphrase',
    })
    expect(progress.failedStepId).toBe('derivingKey')
    expect(progress.inProgress).toBe(false)
    expect(progress.completed).toBe(false)
  })

  it('notifies subscribers on every transition', () => {
    const events: string[] = []
    const unsubscribe = subscribeToPassphraseUnlockProgress((progress) => {
      events.push(
        progress.steps
          .map((step) => `${step.id}:${step.state}`)
          .join('|'),
      )
    })

    startPassphraseUnlock()
    activateUnlockStep('derivingKey')
    completeUnlockStep('derivingKey')
    finishPassphraseUnlock()
    unsubscribe()

    expect(events.length).toBeGreaterThanOrEqual(4)
    expect(events[0]).toContain('derivingKey:pending')
    expect(events.at(-1)).toContain('done:success')
  })
})
