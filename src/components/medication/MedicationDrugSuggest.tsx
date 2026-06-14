import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useKnowledgeBaseDrugs } from '../../hooks/useKnowledgeBaseDrugs'
import { useMedicationMarketAvailability } from '../../hooks/useMedicationMarketAvailability'
import { usePrescribingCountry } from '../../hooks/usePrescribingCountry'
import type { PrescribingCountryCode } from '../../types/knowledgeBase'
import {
  searchKbDrugSuggestions,
  type KbDrugSuggestResult,
} from '../../utils/medication/kbDrugSuggest'

interface MedicationDrugSuggestProps {
  value: string
  displayBrandName?: string
  disabled?: boolean
  autoFocus?: boolean
  label: string
  onChange: (value: string) => void
  onSelect: (result: KbDrugSuggestResult) => void
}

function formatBrandSubtitle(brandName: string | undefined, brandNames: string[]): string {
  if (brandName) return brandName
  if (brandNames.length === 0) return ''
  if (brandNames.length <= 2) return brandNames.join(', ')
  return `${brandNames.slice(0, 2).join(', ')} …`
}

export function MedicationDrugSuggest({
  value,
  displayBrandName,
  disabled = false,
  autoFocus = false,
  label,
  onChange,
  onSelect,
}: MedicationDrugSuggestProps) {
  const { drugs } = useKnowledgeBaseDrugs()
  const { allPreparations } = useMedicationMarketAvailability()
  const { defaultPrescribingCountry } = usePrescribingCountry()
  const [open, setOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState(value)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(value), 200)
    return () => window.clearTimeout(timer)
  }, [value])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const suggestions = useMemo(
    () =>
      searchKbDrugSuggestions({
        query: debouncedQuery,
        kbDrugs: drugs,
        preparations: allPreparations,
        countryCode: defaultPrescribingCountry as PrescribingCountryCode,
      }),
    [allPreparations, debouncedQuery, defaultPrescribingCountry, drugs],
  )

  useEffect(() => {
    setActiveIndex(suggestions.length > 0 ? 0 : -1)
  }, [suggestions])

  const showDropdown = open && debouncedQuery.trim().length >= 2 && suggestions.length > 0

  const handleSelect = (result: KbDrugSuggestResult) => {
    onSelect(result)
    setOpen(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (event.key === 'ArrowDown' && suggestions.length > 0) {
        event.preventDefault()
        setOpen(true)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (current + 1) % suggestions.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1))
      return
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      handleSelect(suggestions[activeIndex])
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="medication-drug-suggest" ref={rootRef}>
      <label className="therapy-field">
        <span>{label}</span>
        <input
          type="text"
          value={value}
          disabled={disabled}
          className="therapy-input"
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="medication-drug-suggest-listbox"
          aria-autocomplete="list"
          onChange={(event) => {
            onChange(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </label>

      {displayBrandName ? (
        <p className="medication-drug-suggest__brand">({displayBrandName})</p>
      ) : null}

      {showDropdown ? (
        <ul
          id="medication-drug-suggest-listbox"
          className="medication-drug-suggest__dropdown"
          role="listbox"
          aria-label={label}
        >
          {suggestions.map((item, index) => {
            const subtitle = formatBrandSubtitle(item.displayBrandName, item.brandNames)
            return (
              <li key={item.key} role="presentation">
                <button
                  type="button"
                  className={`medication-drug-suggest__option${
                    index === activeIndex ? ' medication-drug-suggest__option--active' : ''
                  }`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(item)}
                >
                  <span className="medication-drug-suggest__primary">{item.substance}</span>
                  {subtitle ? (
                    <span className="medication-drug-suggest__secondary">{subtitle}</span>
                  ) : null}
                  {item.strength ? (
                    <span className="medication-drug-suggest__meta">{item.strength}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}