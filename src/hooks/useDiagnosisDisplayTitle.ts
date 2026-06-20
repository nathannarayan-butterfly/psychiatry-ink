import { useEffect, useMemo, useState } from 'react'
import type { IcdTitleVersion } from '../../shared/icdTitle'
import { fetchIcdDisplayTitle } from '../services/icdTitleApi'
import type { UiLanguage } from '../types/settings'
import { resolveDiagnosisDisplayTitle } from '../utils/diagnosisDisplayTitle'
import { resolveDisplayCriteriaLabel } from '../utils/diagnosisDisplayRequests'

export interface UseDiagnosisDisplayTitleParams {
  code: string
  version: IcdTitleVersion
  language?: string
  criteriaLabel?: string | null
  enteredLabel?: string | null
  overridden?: boolean
  enabled?: boolean
}

const KNOWN_UI_LANGUAGES: ReadonlySet<UiLanguage> = new Set(['de', 'en', 'fr', 'es'])

function toUiLanguage(language: string): UiLanguage {
  return KNOWN_UI_LANGUAGES.has(language as UiLanguage) ? (language as UiLanguage) : 'de'
}

export function useDiagnosisDisplayTitle(params: UseDiagnosisDisplayTitleParams) {
  const {
    code,
    version,
    language = 'de',
    criteriaLabel,
    enteredLabel,
    overridden = false,
    enabled = true,
  } = params

  // Resilient by construction: when the caller does not supply a criteria label,
  // resolve the synchronous bundled title from in-app data so the component never
  // renders a bare code while the (optional) WHO/API title is still loading.
  // Pass through the active UI language so the EN UI gets EN bundled titles.
  const uiLang = toUiLanguage(language)
  const effectiveCriteriaLabel = useMemo(
    () => criteriaLabel?.trim() || resolveDisplayCriteriaLabel(code, version, undefined, uiLang),
    [criteriaLabel, code, version, uiLang],
  )

  const fallback = useMemo(
    () =>
      resolveDiagnosisDisplayTitle({
        criteriaLabel: effectiveCriteriaLabel,
        enteredLabel,
        code,
        overridden,
      }),
    [effectiveCriteriaLabel, enteredLabel, code, overridden],
  )

  const [apiTitle, setApiTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmed = code.trim()
    if (!enabled || !trimmed) {
      setApiTitle(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void fetchIcdDisplayTitle(trimmed, version, language)
      .then((result) => {
        if (cancelled) return
        setApiTitle(result?.title?.trim() || null)
      })
      .catch(() => {
        if (!cancelled) setApiTitle(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [code, version, language, enabled])

  const title = resolveDiagnosisDisplayTitle({
    apiTitle,
    criteriaLabel: effectiveCriteriaLabel,
    enteredLabel,
    code,
    overridden,
  })

  return { title, fallback, loading, apiTitle }
}
