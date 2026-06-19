import { useCallback, useEffect, useRef, useState } from 'react'
import { getCaseMeta } from './useCaseRegistry'
import { isPsychopathExtractAiEnabled } from '../utils/featureFlags'
import {
  isPsychopathAiStructuredStale,
  runPsychopathAiExtract,
} from '../utils/overview/psychopathAiExtract'
import { resolveOverviewPsychopathologyText } from '../utils/overview/psychopathFindingOps'
import { loadPsychopathFindingState } from '../utils/overview/psychopathFindingStorage'
import type { UiLanguage } from '../types/settings'

export type PsychopathAiExtractStatus = 'idle' | 'loading' | 'error' | 'done'

export interface UsePsychopathAiExtractOptions {
  caseId: string
  language: UiLanguage
  /** Auto-run once when PPB text exists but structured extraction is stale. */
  autoRun?: boolean
  revision?: number
}

export interface UsePsychopathAiExtractResult {
  status: PsychopathAiExtractStatus
  error: string | null
  isStale: boolean
  isEnabled: boolean
  extract: (options?: { force?: boolean }) => Promise<void>
}

export function usePsychopathAiExtract({
  caseId,
  language,
  autoRun = true,
  revision = 0,
}: UsePsychopathAiExtractOptions): UsePsychopathAiExtractResult {
  const [status, setStatus] = useState<PsychopathAiExtractStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const autoRanRef = useRef(false)
  const isEnabled = isPsychopathExtractAiEnabled()

  const { text } = resolveOverviewPsychopathologyText(caseId)
  const state = loadPsychopathFindingState(caseId)
  const isStale = isPsychopathAiStructuredStale(text, state.aiStructured)

  const extract = useCallback(
    async (options?: { force?: boolean }) => {
      const force = options?.force ?? false

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
          force,
        })
        setStatus('done')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Extraktion fehlgeschlagen'
        console.error('[psychopath-ai-extract]', err)
        setStatus('error')
        setError(message)
      }
    },
    [caseId, isEnabled, language, text],
  )

  useEffect(() => {
    autoRanRef.current = false
  }, [caseId, text])

  useEffect(() => {
    void revision
    if (!autoRun || !isEnabled || !text?.trim() || !isStale) return
    if (autoRanRef.current) return
    autoRanRef.current = true
    void extract()
  }, [autoRun, extract, isEnabled, isStale, revision, text])

  return { status, error, isStale, isEnabled, extract }
}
