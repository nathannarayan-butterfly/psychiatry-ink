import type { PsychotherapyPlan } from '../../types/psychotherapy'
import {
  createEmptyPsychotherapyPlan,
  ensurePsychotherapyPlan,
  PSYCHOTHERAPY_PLAN_VERSION,
} from '../../types/psychotherapy'
import { getActiveCaseId } from '../caseContext'
import { schedulePsychotherapyPlanImprints } from './imprint'

/** In-memory session cache — backed by localStorage for crash/close durability. */
const planCache = new Map<string, PsychotherapyPlan>()

const LS_PREFIX = 'psychiatry-ink:psychotherapy-plan:'

function lsKey(caseId: string): string {
  return `${LS_PREFIX}${caseId}`
}

function writeLocalStorage(caseId: string, plan: PsychotherapyPlan): void {
  try {
    localStorage.setItem(lsKey(caseId), JSON.stringify(plan))
  } catch {
    // quota exceeded or private browsing — ignore
  }
}

function readLocalStorage(caseId: string): PsychotherapyPlan | null {
  try {
    const raw = localStorage.getItem(lsKey(caseId))
    if (!raw) return null
    return JSON.parse(raw) as PsychotherapyPlan
  } catch {
    return null
  }
}

export type PsychotherapyPlanPersistHook = (caseId: string) => void
type PsychotherapyPlanListener = (caseId: string) => void

let persistHook: PsychotherapyPlanPersistHook | null = null
let persistTimer: number | null = null
const listeners = new Set<PsychotherapyPlanListener>()

function notifyListeners(caseId: string): void {
  listeners.forEach((listener) => listener(caseId))
}

export function subscribePsychotherapyPlan(listener: PsychotherapyPlanListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function registerPsychotherapyPlanPersistHook(hook: PsychotherapyPlanPersistHook | null): void {
  persistHook = hook
}

function notifyPersist(caseId: string): void {
  persistHook?.(caseId)
}

function resolveCaseId(caseId?: string): string {
  return caseId ?? getActiveCaseId()
}

export function loadPsychotherapyPlan(caseId?: string): PsychotherapyPlan | null {
  const resolved = resolveCaseId(caseId)
  const cached = planCache.get(resolved)
  if (cached) return cached

  // Fall back to localStorage when the in-memory cache is cold (e.g. after page reload
  // before the vault has finished decrypting, or when the vault save was missed on close).
  const persisted = readLocalStorage(resolved)
  if (persisted) {
    const normalized = ensurePsychotherapyPlan(persisted)
    planCache.set(resolved, normalized)
    return normalized
  }

  return null
}

export function savePsychotherapyPlan(plan: PsychotherapyPlan, caseId?: string): void {
  const resolved = resolveCaseId(caseId)
  const stamped: PsychotherapyPlan = {
    ...ensurePsychotherapyPlan(plan),
    version: PSYCHOTHERAPY_PLAN_VERSION,
    updatedAt: new Date().toISOString(),
  }
  planCache.set(resolved, stamped)

  // Write-through to localStorage immediately so data survives a fast patient close
  // or page reload before the vault debounce fires.
  writeLocalStorage(resolved, stamped)

  notifyListeners(resolved)
  schedulePsychotherapyPlanImprints(resolved, stamped)

  if (persistTimer !== null) window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    notifyPersist(resolved)
  }, 800)
}

export function applyPsychotherapyPlan(
  plan: PsychotherapyPlan | null | undefined,
  caseId?: string,
): void {
  const resolved = resolveCaseId(caseId)
  if (!plan) {
    // Leave any locally-cached plan intact — an absent vault field must not wipe local data.
    return
  }
  const normalized = ensurePsychotherapyPlan(plan)

  // Only overwrite a newer localStorage entry with the vault state when the vault
  // is actually more recent — prevents an older vault snapshot from wiping a plan
  // saved locally but not yet flushed into the vault.
  const local = readLocalStorage(resolved)
  const vaultTime = normalized.updatedAt ? new Date(normalized.updatedAt).getTime() : 0
  const localTime = local?.updatedAt ? new Date(local.updatedAt).getTime() : 0

  if (vaultTime >= localTime) {
    planCache.set(resolved, normalized)
    writeLocalStorage(resolved, normalized)
  } else {
    planCache.set(resolved, ensurePsychotherapyPlan(local!))
  }

  notifyListeners(resolved)
}

export function getOrCreatePsychotherapyPlan(caseId?: string): PsychotherapyPlan {
  const resolved = resolveCaseId(caseId)
  return loadPsychotherapyPlan(resolved) ?? createEmptyPsychotherapyPlan()
}
