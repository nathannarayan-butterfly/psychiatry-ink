import { Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  AI_TRANSLATION_LANGUAGES,
  AUTO_DETECT_LANGUAGE,
  type AiTranslationLanguage,
} from '../../../data/aiTranslationLanguages'

interface TranslationLanguageComboboxProps {
  value: string
  onChange: (code: string) => void
  ariaLabel: string
  id?: string
  noResultsLabel: string
  /**
   * When set, an "Automatisch erkennen" entry (code `auto`) is offered as the
   * first option — used for the SOURCE language so the model can auto-detect.
   */
  autoDetectLabel?: string
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function TranslationLanguageCombobox({
  value,
  onChange,
  ariaLabel,
  id,
  noResultsLabel,
  autoDetectLabel,
}: TranslationLanguageComboboxProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const generatedId = useId()
  const fieldId = id ?? generatedId

  const options = useMemo<AiTranslationLanguage[]>(() => {
    if (!autoDetectLabel) return AI_TRANSLATION_LANGUAGES
    return [
      { code: AUTO_DETECT_LANGUAGE, nativeName: autoDetectLabel, englishName: autoDetectLabel },
      ...AI_TRANSLATION_LANGUAGES,
    ]
  }, [autoDetectLabel])

  const selected =
    value === AUTO_DETECT_LANGUAGE && autoDetectLabel
      ? { code: AUTO_DETECT_LANGUAGE, nativeName: autoDetectLabel, englishName: autoDetectLabel }
      : findLanguage(value)

  const filtered = useMemo(() => {
    const q = normalize(query)
    if (!q) return options
    return options.filter(
      (lang) =>
        normalize(lang.nativeName).includes(q) ||
        normalize(lang.englishName).includes(q) ||
        lang.code.includes(q),
    )
  }, [options, query])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const pick = (lang: AiTranslationLanguage) => {
    onChange(lang.code)
    setQuery('')
    setOpen(false)
    setActiveIndex(-1)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && activeIndex >= 0 && filtered[activeIndex]) {
      event.preventDefault()
      pick(filtered[activeIndex])
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="swx-lang-combobox" ref={rootRef}>
      <div className="swx-lang-combobox__field">
        <Search className="swx-lang-combobox__icon" strokeWidth={1.75} aria-hidden />
        <input
          id={fieldId}
          type="text"
          className="swx-lang-combobox__input"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${fieldId}-listbox`}
          aria-label={ariaLabel}
          value={open ? query : (selected?.nativeName ?? value)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActiveIndex(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>
      {open ? (
        <ul
          id={`${fieldId}-listbox`}
          role="listbox"
          className="swx-lang-combobox__list"
        >
          {filtered.length === 0 ? (
            <li className="swx-lang-combobox__empty">{noResultsLabel}</li>
          ) : (
            filtered.map((lang, index) => (
              <li key={lang.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={lang.code === value}
                  className={`swx-lang-combobox__option${index === activeIndex ? ' swx-lang-combobox__option--active' : ''}${lang.code === value ? ' swx-lang-combobox__option--selected' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(lang)}
                >
                  <span>{lang.nativeName}</span>
                  <span className="swx-lang-combobox__code">{lang.code}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}

function findLanguage(code: string): AiTranslationLanguage | undefined {
  return AI_TRANSLATION_LANGUAGES.find((lang) => lang.code === code)
}
