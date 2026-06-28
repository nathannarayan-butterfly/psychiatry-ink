import { useCallback, useEffect, useRef, useState } from 'react'
import { getCaseMeta } from './useCaseRegistry'
import { isDemoCase } from '../demo/demoReadOnly'
import { isPsychopathExtractAiEnabled } from '../utils/featureFlags'
import {
  hashPsychopathSourceText,
  isPsychopathAiStructuredStale,
  runPsychopathAiExtract,
} from '../utils/overview/psychopathAiExtract'
import { resolveOverviewPsychopathologyText } from '../utils/overview/psychopathFindingOps'
import {
  loadPsychopathFindingState,
  subscribePsychopathFinding,
} from '../utils/overview/psychopathFindingStorage'
import type { UiLanguage } from '../types/settings'

export type PsychopathAiExtractStatus = 'idle' | 'loading' | 'error' | 'done'

export interface UsePsychopathAiExtractOptions {
  caseId: string
  language: UiLanguage
  /** Auto-run once when PPB text exists but structured extraction is stale. */
  autoRun?: boolean
}

export interface UsePsychopathAiExtractResult {
  status: PsychopathAiExtractStatus
  error: string | null
  isEnabled: boolean
}

/**
 * Runs psychopath KI extraction at most once per source-text hash per mount.
 * Reuses persisted `aiStructured` when the hash matches; skips API calls on
 * subsequent Übersicht opens until the clinician edits the PPB text.
 */
export function usePsychopathAiExtract({
  caseId,
  language,
  autoRun = true,
}: UsePsychopathAiExtractOptions): UsePsychopathAiExtractResult {
  const [status, setStatus] = useState<PsychopathAiExtractStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [storeRevision, setStoreRevision] = useState(0)
  const autoRanForKeyRef = useRef<string | null>(null)
  const isEnabled = isPsychopathExtractAiEnabled()

  useEffect(() => {
    return subscribePsychopathFinding((changedCaseId) => {
      if (changedCaseId === caseId) setStoreRevision((value) => value + 1)
    })
  }, [caseId])

  void storeRevision

  const { text } = resolveOverviewPsychopathologyText(caseId)
  const state = loadPsychopathFindingState(caseId)
  const isStale = isPsychopathAiStructuredStale(text, state.aiStructured)
  // The synthetic demo case is pre-baked and read-only: never auto-fire a live
  // AI extraction when it is merely viewed. (Explicit clinician extraction on a
  // real case is unaffected.)
  const autoRunKey =
    !isDemoCase(caseId) && text?.trim() && isStale
      ? `${caseId}:${hashPsychopathSourceText(text)}`
      : null

  const extract = useCallback(async () => {
    if (!isEnabled) {
      const message = 'KI-Extraktion ist deaktiviert (VITE_ENABLE_PSYCHOPATH_EXTRACT_AI)'
      console.warn('[psychopath-ai-extract]', message)
      setStatus('error')
      setError(message)
      return
    }

    if (!text?.trim()) {
      const message = 'Kein Befundtext für die KI-Extraktion vorhanden'
      console.warn('[psychopath-ai-extract]', message)
      setStatus('error')
      setError(message)
      return
    }

    setStatus('loading')
    setError(null)
    try {
      const meta = getCaseMeta(caseId)
      const patientNames = [
        meta?.localName,
        meta?.localVorname,
        meta?.localNachname,
        meta?.localVorname && meta?.localNachname
          ? `${meta.localVorname} ${meta.localNachname}`
          : undefined,
      ].filter((n): n is string => Boolean(n?.trim()))

      await runPsychopathAiExtract({
        caseId,
        sourceText: text,
        language,
        patientNames,
        autoAccept: true,
      })
      setStatus('done')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraktion fehlgeschlagen'
      console.error('[psychopath-ai-extract]', err)
      setStatus('error')
      setError(message)
    }
  }, [caseId, isEnabled, language, text])

  useEffect(() => {
    if (!autoRun || !autoRunKey) return
    if (autoRanForKeyRef.current === autoRunKey) return
    autoRanForKeyRef.current = autoRunKey
    void extract()
  }, [autoRun, autoRunKey, extract])

  return { status, error, isEnabled }
}
