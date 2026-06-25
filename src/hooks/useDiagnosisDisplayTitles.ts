import { useEffect, useMemo, useState } from 'react'
import type { IcdTitleVersion } from '../../shared/icdTitle'
import { fetchIcdDisplayTitles } from '../services/icdTitleApi'
import {
  diagnosisTitleCacheKey,
  resolveDiagnosisDisplayTitle,
} from '../utils/diagnosisDisplayTitle'

export interface DiagnosisTitleRequest {
  key: string
  code: string
  version: IcdTitleVersion
  criteriaLabel?: string | null
  enteredLabel?: string | null
  overridden?: boolean
}

export function useDiagnosisDisplayTitles(
  items: DiagnosisTitleRequest[],
  language = 'de',
  enabled = true,
): { titlesByKey: Map<string, string>; loading: boolean } {
  const stableItems = useMemo(
    () =>
      items
        .filter((item) => item.code.trim())
        .map((item) => ({
          key: item.key,
          code: item.code.trim(),
          version: item.version,
          criteriaLabel: item.criteriaLabel ?? null,
          enteredLabel: item.enteredLabel ?? null,
          overridden: item.overridden ?? false,
        })),
    [items],
  )

  const [apiTitlesByKey, setApiTitlesByKey] = useState<Map<string, string>>(() => new Map())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || stableItems.length === 0) {
      setApiTitlesByKey(new Map())
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void fetchIcdDisplayTitles(
      stableItems.map((item) => ({ code: item.code, version: item.version })),
      language,
    )
      .then((results) => {
        if (cancelled) return
        const byCodeVersion = new Map<string, string>()
        for (const result of results) {
          if (!result.title.trim()) continue
          byCodeVersion.set(diagnosisTitleCacheKey(result.version, result.code), result.title.trim())
        }

        const mapped = new Map<string, string>()
        for (const item of stableItems) {
          const apiTitle = byCodeVersion.get(diagnosisTitleCacheKey(item.version, item.code))
          if (apiTitle) mapped.set(item.key, apiTitle)
        }
        setApiTitlesByKey(mapped)
      })
      .catch(() => {
        if (!cancelled) setApiTitlesByKey(new Map())
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [stableItems, language, enabled])

  const titlesByKey = useMemo(() => {
    const out = new Map<string, string>()
    for (const item of stableItems) {
      out.set(
        item.key,
        resolveDiagnosisDisplayTitle({
          apiTitle: apiTitlesByKey.get(item.key),
          criteriaLabel: item.criteriaLabel,
          enteredLabel: item.enteredLabel,
          code: item.code,
          overridden: item.overridden,
          version: item.version,
        }),
      )
    }
    return out
  }, [stableItems, apiTitlesByKey])

  return { titlesByKey, loading }
}
