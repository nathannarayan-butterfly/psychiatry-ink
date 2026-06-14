import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { DashboardCase } from '../../hooks/useCaseRegistry'
import { formatCaseRef, matchesCaseSearch } from '../../utils/caseSearch'

interface IntegrationCasePickerProps {
  cases: DashboardCase[]
  value: string
  onChange: (caseId: string) => void
  label: string
  searchPlaceholder: string
  noResultsLabel: string
  id?: string
}

export function IntegrationCasePicker({
  cases,
  value,
  onChange,
  label,
  searchPlaceholder,
  noResultsLabel,
  id,
}: IntegrationCasePickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = cases.find((item) => item.caseId === value) ?? null

  const filtered = useMemo(
    () => cases.filter((item) => matchesCaseSearch(item, query)),
    [cases, query],
  )

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const fieldId = id ?? 'integration-case-picker'

  return (
    <div className="integrations-case-picker" ref={rootRef}>
      <label className="integrations-field" htmlFor={fieldId}>
        <span className="integrations-field__label">{label}</span>
        <div className="integrations-case-picker__input-wrap">
          <Search className="integrations-case-picker__icon h-4 w-4" aria-hidden />
          <input
            id={fieldId}
            type="search"
            className="integrations-case-picker__input"
            value={open ? query : selected ? formatCaseRef(selected) : query}
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              setOpen(true)
              setQuery('')
            }}
            placeholder={searchPlaceholder}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${fieldId}-listbox`}
            aria-autocomplete="list"
          />
        </div>
      </label>

      {open ? (
        <ul
          id={`${fieldId}-listbox`}
          className="integrations-case-picker__results"
          role="listbox"
          aria-label={label}
        >
          {filtered.length === 0 ? (
            <li className="integrations-case-picker__empty" role="presentation">
              {noResultsLabel}
            </li>
          ) : (
            filtered.map((item) => (
              <li key={item.caseId} role="presentation">
                <button
                  type="button"
                  className={`integrations-case-picker__option${item.caseId === value ? ' integrations-case-picker__option--selected' : ''}`}
                  role="option"
                  aria-selected={item.caseId === value}
                  onClick={() => {
                    onChange(item.caseId)
                    setQuery('')
                    setOpen(false)
                  }}
                >
                  <span className="integrations-case-picker__title">{item.displayTitle}</span>
                  <span className="integrations-case-picker__meta">
                    {item.localName || item.localVorname || item.localNachname
                      ? [item.localVorname, item.localNachname].filter(Boolean).join(' ') || item.localName
                      : null}
                    {item.localGeburtsdatum ? ` · ${item.localGeburtsdatum}` : ''}
                    {' · '}
                    {item.caseId.slice(0, 8)}…
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
