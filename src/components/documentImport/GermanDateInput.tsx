import { useEffect, useState } from 'react'
import { isoToGermanDate, parseGermanDateInput } from '../../utils/documentImport/dateAssociation'

interface GermanDateInputProps {
  isoValue?: string
  onIsoChange: (iso: string | undefined) => void
  className?: string
  placeholder?: string
}

/** Date field using German clinical DD.MM.YYYY display; stores ISO internally. */
export function GermanDateInput({
  isoValue,
  onIsoChange,
  className,
  placeholder = 'TT.MM.JJJJ',
}: GermanDateInputProps) {
  const [draft, setDraft] = useState(() => isoToGermanDate(isoValue))

  useEffect(() => {
    setDraft(isoToGermanDate(isoValue))
  }, [isoValue])

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      placeholder={placeholder}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const trimmed = draft.trim()
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
      }}
    />
  )
}
