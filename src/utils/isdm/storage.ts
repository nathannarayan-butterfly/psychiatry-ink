import type { IsdmClinicalAnalysis } from '../../types/isdm'
import { getActiveCaseId } from '../caseContext'

/** In-memory session cache — persisted only via encrypted workspace vault. */
const analysisCache = new Map<string, IsdmClinicalAnalysis>()

export type IsdmPersistHook = (caseId: string) => void

let persistHook: IsdmPersistHook | null = null

export function registerIsdmPersistHook(hook: IsdmPersistHook | null): void {
  persistHook = hook
}

function notifyPersist(caseId: string): void {
  persistHook?.(caseId)
}

/**
 * Reactive completion subscription. The ISDM rebuild is debounced in the
 * orchestrator, so a consumer that loads the analysis once on mount can get
 * stuck on an idle/empty state even after the rebuild lands. Listeners
 * registered here are notified (per case) every time a fresh analysis is
 * written, letting the UI pick it up the moment it becomes available.
 */
export type IsdmAnalysisListener = () => void

const analysisListeners = new Map<string, Set<IsdmAnalysisListener>>()

export function subscribeIsdmAnalysis(caseId: string, listener: IsdmAnalysisListener): () => void {
  const resolved = resolveCaseId(caseId)
  let set = analysisListeners.get(resolved)
  if (!set) {
    set = new Set()
    analysisListeners.set(resolved, set)
  }
  set.add(listener)
  return () => {
    const current = analysisListeners.get(resolved)
    if (!current) return
    current.delete(listener)
    if (current.size === 0) analysisListeners.delete(resolved)
  }
}

function notifyAnalysisListeners(caseId: string): void {
  const set = analysisListeners.get(caseId)
  if (!set) return
  // Snapshot so a listener that unsubscribes mid-iteration can't mutate the set.
  for (const listener of [...set]) listener()
}

function resolveCaseId(caseId?: string): string {
  return caseId ?? getActiveCaseId()
}

export function loadIsdmAnalysis(caseId?: string): IsdmClinicalAnalysis | null {
  const resolved = resolveCaseId(caseId)
  return analysisCache.get(resolved) ?? null
}

export function saveIsdmAnalysis(analysis: IsdmClinicalAnalysis, caseId?: string): void {
  const resolved = resolveCaseId(caseId ?? analysis.caseId)
  analysisCache.set(resolved, {
    ...analysis,
    caseId: resolved,
    updatedAt: new Date().toISOString(),
  })
  notifyPersist(resolved)
  notifyAnalysisListeners(resolved)
}

export function applyIsdmAnalysis(analysis: IsdmClinicalAnalysis | null | undefined, caseId?: string): void {
  const resolved = resolveCaseId(caseId ?? analysis?.caseId)
  if (!analysis) {
    analysisCache.delete(resolved)
    notifyAnalysisListeners(resolved)
    return
  }
  analysisCache.set(resolved, { ...analysis, caseId: resolved })
  notifyAnalysisListeners(resolved)
}

export function clearIsdmCache(caseId?: string): void {
  if (caseId) {
    analysisCache.delete(caseId)
    return
  }
  analysisCache.clear()
}
