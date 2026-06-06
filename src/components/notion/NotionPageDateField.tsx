import { Calendar } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { matchPageDateShortcut, pageDateShortcuts } from '../../data/pageDateShortcuts'
import type { UiTranslationKey } from '../../data/uiTranslations'
import {
  formatNotionPageDateDisplay,
  formatNotionPageDateInput,
  loadNotionPageDate,
  parseNotionPageDateInput,
  saveNotionPageDate,
  todayIsoDateLocal,
  yesterdayIsoDateLocal,
} from '../../utils/notionPageDate'
import { showNotionToast } from './NotionToast'

interface NotionPageDateFieldProps {
  pageId: string
  caseId: string
  disabled?: boolean
  onDateChange?: (date: string) => void
}

export function NotionPageDateField({
  pageId,
  caseId,
  disabled = false,
  onDateChange,
}: NotionPageDateFieldProps) {
  const { t, language } = useTranslation()
  const [date, setDate] = useState(() => loadNotionPageDate(pageId, caseId))
  const [expanded, setExpanded] = useState(false)
  const [textValue, setTextValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLInputElement>(null)
  const skipBlurCommitRef = useRef(false)

  useEffect(() => {
    setDate(loadNotionPageDate(pageId, caseId))
    setExpanded(false)
    setTextValue('')
  }, [caseId, pageId])

  const persistDate = useCallback(
    (value: string) => {
      setDate(value)
      saveNotionPageDate(pageId, value, caseId)
      onDateChange?.(value)
    },
    [caseId, onDateChange, pageId],
  )

  const openEditor = useCallback(() => {
    if (disabled) return
    setTextValue(date ? formatNotionPageDateInput(date) : '')
    setExpanded(true)
    requestAnimationFrame(() => textRef.current?.focus())
  }, [date, disabled])

  const commit = useCallback(() => {
    const parsed = parseNotionPageDateInput(textValue)
    if (parsed === null) {
      setExpanded(false)
      return
    }
    persistDate(parsed)
    setExpanded(false)
  }, [persistDate, textValue])

  const cancel = useCallback(() => {
    setExpanded(false)
  }, [])

  const applyShortcutDate = useCallback(
    (iso: string, toastKey: UiTranslationKey) => {
      skipBlurCommitRef.current = true
      persistDate(iso)
      setExpanded(false)
      showNotionToast(t(toastKey))
      requestAnimationFrame(() => {
        skipBlurCommitRef.current = false
      })
    },
    [persistDate, t],
  )

  useEffect(() => {
    if (!expanded) return
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return
      commit()
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [commit, expanded])

  const openPicker = useCallback(() => {
    const picker = pickerRef.current
    if (!picker || disabled) return
    if (typeof picker.showPicker === 'function') {
      picker.showPicker()
      return
    }
    picker.click()
  }, [disabled])

  const handlePickerChange = useCallback(
    (value: string) => {
      persistDate(value)
      setTextValue(value ? formatNotionPageDateInput(value) : '')
    },
    [persistDate],
  )

  const handleTextBlur = () => {
    if (skipBlurCommitRef.current) return
    commit()
  }

  const handleTextKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
      return
    }
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return

    const shortcut = matchPageDateShortcut(event.key, language)
    if (shortcut === 'today') {
      event.preventDefault()
      applyShortcutDate(todayIsoDateLocal(), 'pageDateShortcutToday')
      return
    }
    if (shortcut === 'yesterday') {
      event.preventDefault()
      applyShortcutDate(yesterdayIsoDateLocal(), 'pageDateShortcutYesterday')
    }
  }

  const shortcutHint = (() => {
    const { todayKey, yesterdayKey } = pageDateShortcuts[language]
    return t('pageDateShortcutHint')
      .replace('{todayKey}', todayKey)
      .replace('{todayLabel}', t('pageDateShortcutToday'))
      .replace('{yesterdayKey}', yesterdayKey)
      .replace('{yesterdayLabel}', t('pageDateShortcutYesterday'))
  })()

  if (expanded) {
    return (
      <div
        ref={containerRef}
        className="notion-page-date notion-page-date--expanded"
      >
        <div className="notion-page-date__input-row">
          <input
            ref={textRef}
            type="text"
            className="notion-page-date__text"
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            onKeyDown={handleTextKeyDown}
            onBlur={handleTextBlur}
            placeholder="DD.MM.YYYY"
            disabled={disabled}
            aria-label={t('pageDateLabel')}
            autoComplete="off"
          />
          <button
            type="button"
            className="notion-page-date__calendar-btn"
            onMouseDown={(event) => event.preventDefault()}
            onClick={openPicker}
            disabled={disabled}
            aria-label={t('pageDateLabel')}
          >
            <Calendar className="h-2.5 w-2.5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        <span className="notion-page-date__hint">{shortcutHint}</span>
        <input
          ref={pickerRef}
          type="date"
          className="notion-page-date__picker"
          value={date}
          onChange={(event) => handlePickerChange(event.target.value)}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden
        />
      </div>
    )
  }

  const displayValue = date ? formatNotionPageDateDisplay(date, language) : null

  return (
    <button
      type="button"
      className="notion-page-date notion-page-date__trigger"
      onClick={openEditor}
      disabled={disabled}
      aria-label={t('pageDateLabel')}
    >
      <span
        className={`notion-page-date__value${displayValue ? '' : ' notion-page-date__value--empty'}`}
      >
        {displayValue ?? t('pageDateLabel')}
      </span>
    </button>
  )
}
