import { Search } from 'lucide-react'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { countryName } from '../../data/countryNames'
import type { UiLanguage } from '../../types/settings'

interface CountryComboboxProps {
  value: string
  onChange: (code: string) => void
  /** Country codes to offer (ISO alpha-2, or the legacy `UK` alias). */
  codes: readonly string[]
  language: UiLanguage
  ariaLabel: string
  placeholder?: string
  id?: string
  /** Codes pinned to the top of the list when no search query is entered. */
  priorityCodes?: readonly string[]
  /** Message shown when a search matches no country. */
  noResultsLabel?: string
}

interface CountryOption {
  code: string
  name: string
}

/** Lower-case + strip diacritics so "osterreich" matches "Österreich". */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

const SETTINGS_INPUT_CLASS =
  'w-full rounded-sm border-2 border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-ink'

export function CountryCombobox({
  value,
  onChange,
  codes,
  language,
  ariaLabel,
  placeholder,
  id,
  priorityCodes = [],
  noResultsLabel = '—',
}: CountryComboboxProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const generatedId = useId()
  const fieldId = id ?? generatedId

  const allOptions = useMemo<CountryOption[]>(() => {
    const priority = new Set(priorityCodes)
    const decorated = codes.map((code) => ({ code, name: countryName(code, language) }))
    const collator = new Intl.Collator(language, { sensitivity: 'base' })
    const pinned = priorityCodes
      .filter((code) => codes.includes(code))
      .map((code) => ({ code, name: countryName(code, language) }))
    const rest = decorated
      .filter((option) => !priority.has(option.code))
      .sort((a, b) => collator.compare(a.name, b.name))
    return [...pinned, ...rest]
  }, [codes, language, priorityCodes])

  const filtered = useMemo<CountryOption[]>(() => {
    const q = normalize(query)
    if (!q) return allOptions
    const collator = new Intl.Collator(language, { sensitivity: 'base' })
    return allOptions
      .filter(
        (option) =>
          normalize(option.name).includes(q) || option.code.toLowerCase().includes(q),
      )
      .sort((a, b) => collator.compare(a.name, b.name))
  }, [allOptions, language, query])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const selectedIdx = filtered.findIndex((option) => option.code === value)
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : filtered.length > 0 ? 0 : -1)
  }, [open, filtered, value])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    const node = listRef.current?.children[activeIndex] as HTMLElement | undefined
    node?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  const commit = (code: string) => {
    onChange(code)
    setOpen(false)
    setQuery('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) return
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      if (open && activeIndex >= 0 && filtered[activeIndex]) {
        event.preventDefault()
        commit(filtered[activeIndex].code)
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        setOpen(false)
        setQuery('')
      }
    }
  }

  const selectedLabel = value ? `${value} · ${countryName(value, language)}` : ''
  const listboxId = `${fieldId}-listbox`

  return (
    <div className="country-combobox relative" ref={rootRef}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          id={fieldId}
          type="text"
          className={SETTINGS_INPUT_CLASS}
          value={open ? query : selectedLabel}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            setQuery('')
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && activeIndex >= 0 && filtered[activeIndex]
              ? `${fieldId}-opt-${filtered[activeIndex].code}`
              : undefined
          }
        />
      </div>

      {open ? (
        <ul
          id={listboxId}
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-sm border-2 border-border bg-surface py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted" role="presentation">
              {noResultsLabel}
            </li>
          ) : (
            filtered.map((option, index) => {
              const isSelected = option.code === value
              const isActive = index === activeIndex
              return (
                <li key={option.code} role="presentation">
                  <button
                    type="button"
                    id={`${fieldId}-opt-${option.code}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      isActive ? 'bg-surface-hover' : ''
                    } ${isSelected ? 'font-medium text-ink' : 'text-ink'}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commit(option.code)}
                  >
                    <span className="w-7 shrink-0 text-xs uppercase text-muted">{option.code}</span>
                    <span className="min-w-0 truncate">{option.name}</span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}
