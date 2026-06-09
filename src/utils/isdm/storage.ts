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
}

export function applyIsdmAnalysis(analysis: IsdmClinicalAnalysis | null | undefined, caseId?: string): void {
  const resolved = resolveCaseId(caseId ?? analysis?.caseId)
  if (!analysis) {
    analysisCache.delete(resolved)
    return
  }
  analysisCache.set(resolved, { ...analysis, caseId: resolved })
}

export function clearIsdmCache(caseId?: string): void {
  if (caseId) {
    analysisCache.delete(caseId)
    return
  }
  analysisCache.clear()
}
