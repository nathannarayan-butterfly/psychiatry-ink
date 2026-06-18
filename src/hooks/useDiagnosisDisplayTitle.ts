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
  enabled?: boolean
}

export function useDiagnosisDisplayTitle(params: UseDiagnosisDisplayTitleParams) {
  const {
    code,
    version,
    language = 'de',
    criteriaLabel,
    enteredLabel,
    enabled = true,
  } = params

  const fallback = useMemo(
    () =>
      resolveDiagnosisDisplayTitle({
        criteriaLabel,
        enteredLabel,
        code,
      }),
    [criteriaLabel, enteredLabel, code],
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
  })

  return { title, fallback, loading, apiTitle }
}
