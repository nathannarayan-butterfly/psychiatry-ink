import type { IsdmInputState } from '../../types/isdm'
import { createEmptyIsdmInputState, ISDM_INPUT_VERSION } from '../../types/isdm'
import { getActiveCaseId } from '../caseContext'
import { scheduleIsdmRebuild } from './orchestrator'

/** In-memory session cache — persisted only via encrypted workspace vault. */
const inputCache = new Map<string, IsdmInputState>()

export type IsdmInputPersistHook = (caseId: string) => void

let persistHook: IsdmInputPersistHook | null = null
let persistTimer: number | null = null

export function registerIsdmInputPersistHook(hook: IsdmInputPersistHook | null): void {
  persistHook = hook
}

function notifyPersist(caseId: string): void {
  persistHook?.(caseId)
}

function resolveCaseId(caseId?: string): string {
  return caseId ?? getActiveCaseId()
}

function normalizeInput(raw: IsdmInputState): IsdmInputState {
  const base = createEmptyIsdmInputState()
  return {
    version: raw.version ?? ISDM_INPUT_VERSION,
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    domains: { ...base.domains, ...raw.domains },
  }
}

export function loadIsdmInput(caseId?: string): IsdmInputState | null {
  const resolved = resolveCaseId(caseId)
  const cached = inputCache.get(resolved)
  if (!cached) return null
  return normalizeInput(cached)
}

export function saveIsdmInput(input: IsdmInputState, caseId?: string): void {
  const resolved = resolveCaseId(caseId)
  inputCache.set(resolved, {
    ...normalizeInput(input),
    updatedAt: new Date().toISOString(),
  })

  if (persistTimer !== null) window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    notifyPersist(resolved)
    scheduleIsdmRebuild(resolved, 'input')
  }, 800)
}

export function applyIsdmInput(input: IsdmInputState | null | undefined, caseId?: string): void {
  const resolved = resolveCaseId(caseId)
  if (!input) {
    inputCache.delete(resolved)
    return
  }
  inputCache.set(resolved, normalizeInput(input))
}

export function clearIsdmInputCache(caseId?: string): void {
  if (caseId) {
    inputCache.delete(caseId)
    return
  }
  inputCache.clear()
}
