import { useEffect, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { isoToGermanDate, parseGermanDateInput } from '../../utils/documentImport/dateAssociation'

interface GermanDateInputProps {
  isoValue?: string
  onIsoChange: (iso: string | undefined) => void
  className?: string
  placeholder?: string
  id?: string
  disabled?: boolean
  autoComplete?: string
  'aria-label'?: string
}

/** Date field using German clinical DD.MM.YYYY display; stores ISO internally. */
export function GermanDateInput({
  isoValue,
  onIsoChange,
  className,
  placeholder,
  id,
  disabled,
  autoComplete = 'off',
  'aria-label': ariaLabel,
}: GermanDateInputProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(() => isoToGermanDate(isoValue))
  const resolvedPlaceholder = placeholder ?? t('documentImportDatePlaceholder')

  useEffect(() => {
    setDraft(isoToGermanDate(isoValue))
  }, [isoValue])

  const commitDraft = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      onIsoChange(undefined)
      setDraft('')
      return
    }
    const parsed = parseGermanDateInput(trimmed)
    if (parsed) {
      onIsoChange(parsed)
      setDraft(isoToGermanDate(parsed))
    } else {
      setDraft(isoToGermanDate(isoValue))
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      id={id}
      className={className}
      placeholder={resolvedPlaceholder}
      value={draft}
      disabled={disabled}
      autoComplete={autoComplete}
      aria-label={ariaLabel}
      onChange={(e) => {
        const value = e.target.value
        setDraft(value)
        const trimmed = value.trim()
        if (!trimmed) {
          onIsoChange(undefined)
          return
        }
        const parsed = parseGermanDateInput(trimmed)
        if (parsed) onIsoChange(parsed)
      }}
      onBlur={() => commitDraft(draft)}
    />
  )
}
