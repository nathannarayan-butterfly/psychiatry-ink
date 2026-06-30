/**
 * Passphrase unlock progress — explicit, observable state machine.
 *
 * Today's UX (pre-2026-06-30): passphrase input → spinner → "Erfolg" or
 * "Fehler". The user has no idea what's actually happening between those two
 * states, and a partial failure (e.g. 3 of 12 case decryptions threw) was
 * invisible.
 *
 * After this module the unlock flow exposes five named steps, each with a
 * sub-counter "Fall N / M". Components subscribe via `usePassphraseUnlockProgress()`
 * and render the stepper. The visible state machine wraps the existing
 * `passphraseRecovery.ts` / `cryptoVault.ts` calls without changing their
 * behaviour.
 *
 * Steps:
 *   1. derivingKey       — PBKDF2 over the passphrase + AES key unwrap
 *   2. fetchingSnapshots — HTTP GETs against /api/workspace/snapshot for each case
 *   3. decrypting        — AES-GCM decrypt of each fetched blob
 *   4. populatingCache   — write the decrypted payload + raw blob back into IDB
 *   5. done              — terminal success state
 */

import type { ReactNode } from 'react'

export const UNLOCK_STEP_IDS = [
  'derivingKey',
  'fetchingSnapshots',
  'decrypting',
  'populatingCache',
  'done',
] as const

export type UnlockStepId = (typeof UNLOCK_STEP_IDS)[number]

export type UnlockStepState = 'pending' | 'active' | 'success' | 'error'

export interface UnlockStep {
  id: UnlockStepId
  state: UnlockStepState
  /** Number of items processed so far (e.g. cases decrypted). */
  processed?: number
  /** Total items expected (e.g. cases to decrypt). */
  total?: number
  /** Step-specific failure message — surfaced via the red X UI. */
  errorMessage?: string
}

export interface UnlockProgress {
  /** True between `start()` and the terminal `done`/`error` transition. */
  inProgress: boolean
  /** Steps in order, each with its current state + counters. */
  steps: UnlockStep[]
  /** ID of the step that failed, or null. */
  failedStepId: UnlockStepId | null
  /** True when every non-`done` step is in 'success'. */
  completed: boolean
}

type Listener = (progress: UnlockProgress) => void

const listeners = new Set<Listener>()

function initialSteps(): UnlockStep[] {
  return UNLOCK_STEP_IDS.map((id) => ({ id, state: 'pending' as const }))
}

let progress: UnlockProgress = {
  inProgress: false,
  steps: initialSteps(),
  failedStepId: null,
  completed: false,
}

function notify(): void {
  for (const listener of listeners) {
    try {
      listener(progress)
    } catch {
      // never let a subscriber error abort the unlock
    }
  }
}

function setProgress(next: UnlockProgress): void {
  progress = next
  notify()
}

function patchStep(
  id: UnlockStepId,
  patch: Partial<Omit<UnlockStep, 'id'>>,
): void {
  setProgress({
    ...progress,
    steps: progress.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
  })
}

export function getPassphraseUnlockProgress(): UnlockProgress {
  return progress
}

export function subscribeToPassphraseUnlockProgress(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Reset every step to 'pending' and mark the unlock as active. */
export function startPassphraseUnlock(): void {
  setProgress({
    inProgress: true,
    steps: initialSteps(),
    failedStepId: null,
    completed: false,
  })
}

/** Mark the given step as currently running (and any earlier active step as success). */
export function activateUnlockStep(id: UnlockStepId, total?: number): void {
  const nextSteps = progress.steps.map((step) => {
    if (step.id === id) {
      return { ...step, state: 'active' as const, processed: 0, total }
    }
    // Auto-promote any still-active earlier step to success when we advance.
    if (step.state === 'active') {
      return { ...step, state: 'success' as const }
    }
    return step
  })
  setProgress({ ...progress, steps: nextSteps })
}

/** Bump the sub-counter on the active step (or any step in `active` state). */
export function updateUnlockStepCount(
  id: UnlockStepId,
  patch: { processed?: number; total?: number },
): void {
  patchStep(id, patch)
}

/** Mark a step as completed successfully. */
export function completeUnlockStep(id: UnlockStepId): void {
  patchStep(id, { state: 'success' })
}

/** Mark a step as failed. The state machine stops here — failedStepId set. */
export function failUnlockStep(id: UnlockStepId, message: string): void {
  setProgress({
    ...progress,
    steps: progress.steps.map((step) =>
      step.id === id ? { ...step, state: 'error', errorMessage: message } : step,
    ),
    failedStepId: id,
    inProgress: false,
    completed: false,
  })
}

/** Mark the entire unlock as finished — every step success + 'done' active+success. */
export function finishPassphraseUnlock(): void {
  const next: UnlockStep[] = progress.steps.map((step, index) => {
    if (index === progress.steps.length - 1) {
      // The `done` step is always last by construction.
      return { ...step, state: 'success' as const }
    }
    if (step.state === 'pending' || step.state === 'active') {
      return { ...step, state: 'success' as const }
    }
    return step
  })
  setProgress({
    inProgress: false,
    steps: next,
    failedStepId: null,
    completed: true,
  })
}

/** Reset to the initial pending state — used to dismiss the UI after a retry. */
export function resetPassphraseUnlockProgress(): void {
  setProgress({
    inProgress: false,
    steps: initialSteps(),
    failedStepId: null,
    completed: false,
  })
}

/** Convenience type for components that render the stepper. */
export interface UnlockStepDescriptor {
  id: UnlockStepId
  label: ReactNode
  description?: ReactNode
}
