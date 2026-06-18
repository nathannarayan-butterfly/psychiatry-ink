import { useEffect, useMemo, useState } from 'react'
import type { IcdTitleVersion } from '../../shared/icdTitle'
import { fetchIcdDisplayTitle } from '../services/icdTitleApi'
import { resolveDiagnosisDisplayTitle } from '../utils/diagnosisDisplayTitle'

export interface UseDiagnosisDisplayTitleParams {
  code: string
  version: IcdTitleVersion
  language?: string
  criteriaLabel?: string | null
  enteredLabel?: string | null
  overridden?: boolean
  enabled?: boolean
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

  const fallback = useMemo(
    () =>
      resolveDiagnosisDisplayTitle({
        criteriaLabel,
        enteredLabel,
        code,
        overridden,
      }),
    [criteriaLabel, enteredLabel, code, overridden],
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
    criteriaLabel,
    enteredLabel,
    code,
    overridden,
  })

  return { title, fallback, loading, apiTitle }
}
