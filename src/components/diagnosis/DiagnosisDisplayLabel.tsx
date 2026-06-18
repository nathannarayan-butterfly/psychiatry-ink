import type { IcdTitleVersion } from '../../../shared/icdTitle'
import { useDiagnosisDisplayTitle } from '../../hooks/useDiagnosisDisplayTitle'

interface DiagnosisDisplayLabelProps {
  code: string
  version: IcdTitleVersion
  language?: string
  criteriaLabel?: string | null
  enteredLabel?: string | null
  className?: string
  loadingClassName?: string
  title?: string
}

/**
 * Renders a diagnosis display title resolved from WHO/API with graceful fallback.
 * Shows the interim fallback immediately; hydrates when the proxy responds.
 */
export function DiagnosisDisplayLabel({
  code,
  version,
  language = 'de',
  criteriaLabel,
  enteredLabel,
  className,
  loadingClassName = 'diagnosis-display-label--loading',
  title,
}: DiagnosisDisplayLabelProps) {
  const { title: resolved, loading, fallback, apiTitle } = useDiagnosisDisplayTitle({
    code,
    version,
    language,
    criteriaLabel,
    enteredLabel,
    enabled: Boolean(code.trim()),
  })

  const text = resolved || fallback
  const showLoading = loading && Boolean(code.trim()) && !apiTitle

  return (
    <span
      className={[className, showLoading ? loadingClassName : ''].filter(Boolean).join(' ').trim()}
      title={title ?? text}
      aria-busy={showLoading || undefined}
    >
      {text}
    </span>
  )
}
