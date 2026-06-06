import { Clock } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { matchPageTimeShortcut, pageTimeShortcuts } from '../../data/pageTimeShortcuts'
import type { UiTranslationKey } from '../../data/uiTranslations'
import {
  formatNotionPageTimeDisplay,
  formatNotionPageTimeInput,
  loadNotionPageTime,
  nowLocalTime,
  parseNotionPageTimeInput,
  saveNotionPageTime,
} from '../../utils/notionPageTime'
import { showNotionToast } from './NotionToast'

interface NotionPageTimeFieldProps {
  pageId: string
  caseId: string
  disabled?: boolean
  onTimeChange?: (time: string) => void
}

export function NotionPageTimeField({
  pageId,
  caseId,
  disabled = false,
  onTimeChange,
}: NotionPageTimeFieldProps) {
  const { t, language } = useTranslation()
  const [time, setTime] = useState(() => loadNotionPageTime(pageId, caseId))
  const [expanded, setExpanded] = useState(false)
  const [textValue, setTextValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLInputElement>(null)
  const skipBlurCommitRef = useRef(false)

  useEffect(() => {
    setTime(loadNotionPageTime(pageId, caseId))
    setExpanded(false)
    setTextValue('')
  }, [caseId, pageId])

  const persistTime = useCallback(
    (value: string) => {
      setTime(value)
      saveNotionPageTime(pageId, value, caseId)
      onTimeChange?.(value)
    },
    [caseId, onTimeChange, pageId],
  )

  const openEditor = useCallback(() => {
    if (disabled) return
    setTextValue(time ? formatNotionPageTimeInput(time) : '')
    setExpanded(true)
    requestAnimationFrame(() => textRef.current?.focus())
  }, [disabled, time])

  const commit = useCallback(() => {
    const parsed = parseNotionPageTimeInput(textValue)
    if (parsed === null) {
      setExpanded(false)
      return
    }
    persistTime(parsed)
    setExpanded(false)
  }, [persistTime, textValue])

  const cancel = useCallback(() => {
    setExpanded(false)
  }, [])

  const applyShortcutTime = useCallback(
    (value: string, toastKey: UiTranslationKey) => {
      skipBlurCommitRef.current = true
      persistTime(value)
      setExpanded(false)
      showNotionToast(t(toastKey))
      requestAnimationFrame(() => {
        skipBlurCommitRef.current = false
      })
    },
    [persistTime, t],
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
      persistTime(value)
      setTextValue(value ? formatNotionPageTimeInput(value) : '')
    },
    [persistTime],
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

    if (matchPageTimeShortcut(event.key, language) === 'now') {
      event.preventDefault()
      applyShortcutTime(nowLocalTime(), 'pageTimeShortcutNow')
    }
  }

  const shortcutHint = (() => {
    const { nowKey } = pageTimeShortcuts[language]
    return t('pageTimeShortcutHint')
      .replace('{nowKey}', nowKey)
      .replace('{nowLabel}', t('pageTimeShortcutNow'))
  })()

  if (expanded) {
    return (
      <div
        ref={containerRef}
        className="notion-page-time notion-page-time--expanded"
      >
        <div className="notion-page-time__input-row">
          <input
            ref={textRef}
            type="text"
            className="notion-page-time__text"
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            onKeyDown={handleTextKeyDown}
            onBlur={handleTextBlur}
            placeholder="HH:MM"
            disabled={disabled}
            aria-label={t('pageTimeLabel')}
            autoComplete="off"
          />
          <button
            type="button"
            className="notion-page-time__picker-btn"
            onMouseDown={(event) => event.preventDefault()}
            onClick={openPicker}
            disabled={disabled}
            aria-label={t('pageTimeLabel')}
          >
            <Clock className="h-2.5 w-2.5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        <span className="notion-page-time__hint">{shortcutHint}</span>
        <input
          ref={pickerRef}
          type="time"
          className="notion-page-time__picker"
          value={time}
          onChange={(event) => handlePickerChange(event.target.value)}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden
        />
      </div>
    )
  }

  const displayValue = time ? formatNotionPageTimeDisplay(time, language) : null

  return (
    <button
      type="button"
      className="notion-page-time notion-page-time__trigger"
      onClick={openEditor}
      disabled={disabled}
      aria-label={t('pageTimeLabel')}
    >
      <span
        className={`notion-page-time__value${displayValue ? '' : ' notion-page-time__value--empty'}`}
      >
        {displayValue ?? t('pageTimeLabel')}
      </span>
    </button>
  )
}
