import { ChevronDown, FlaskConical, GitBranch, LineChart, Mic, Pencil } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { DictationPhase } from '../../types/dictation'
import type { InputMode } from '../../types'
import { isToolPage, NOTION_PAGES, type NotionPageId } from './notionPages'

interface NotionPageSwitcherProps {
  activePage: NotionPageId
  onSelect: (pageId: NotionPageId) => void
  inputMode?: InputMode
  dictationPhase?: DictationPhase
  isGenerating?: boolean
  isDictationActive?: boolean
  showInputModes?: boolean
  onInputModeChange?: (mode: InputMode) => void
  onDictate?: () => void
}

const DOCUMENT_PAGES = NOTION_PAGES.filter((page) => page.kind === 'document')
const TOOL_PAGES = NOTION_PAGES.filter((page) => page.kind === 'lab')

const toolPageIcons: Partial<Record<NotionPageId, typeof FlaskConical>> = {
  labor: FlaskConical,
  visualisation: LineChart,
  timeline: GitBranch,
}

export function NotionPageSwitcher({
  activePage,
  onSelect,
  inputMode = 'write',
  dictationPhase = 'idle',
  isGenerating = false,
  isDictationActive = false,
  showInputModes = false,
  onInputModeChange,
  onDictate,
}: NotionPageSwitcherProps) {
  const { t } = useTranslation()
  const [toolsOpen, setToolsOpen] = useState(false)
  const toolsRef = useRef<HTMLDivElement>(null)
  const activeToolPage = isToolPage(activePage)

  useEffect(() => {
    if (!toolsOpen) return
    const handleClick = (event: MouseEvent) => {
      if (!toolsRef.current?.contains(event.target as Node)) setToolsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setToolsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [toolsOpen])

  return (
    <nav className="notion-page-switcher" aria-label={t('notionPageSwitcher')}>
      <div className="notion-page-switcher__tabs">
        {DOCUMENT_PAGES.map((page) => (
          <button
            key={page.id}
            type="button"
            className={`notion-page-switcher__tab ${
              activePage === page.id ? 'notion-page-switcher__tab--active' : ''
            }`}
            aria-current={activePage === page.id ? 'page' : undefined}
            onClick={() => onSelect(page.id)}
          >
            {t(page.labelKey)}
          </button>
        ))}
      </div>

      <div className="notion-page-switcher__right">
        {showInputModes && onInputModeChange ? (
          <div className="notion-page-switcher__input-modes">
            <button
              type="button"
              className={`notion-page-switcher__input-mode ${
                inputMode === 'write' && !isDictationActive
                  ? 'notion-page-switcher__input-mode--active'
                  : ''
              }`}
              onClick={() => onInputModeChange('write')}
              disabled={isGenerating || dictationPhase === 'transcribing'}
              title={t('write')}
              aria-label={t('write')}
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              className={`notion-page-switcher__input-mode ${
                inputMode === 'dictate' || isDictationActive
                  ? 'notion-page-switcher__input-mode--active'
                  : ''
              }`}
              onClick={() => {
                onInputModeChange('dictate')
                if (dictationPhase === 'idle') onDictate?.()
              }}
              disabled={isGenerating}
              title={t('dictate')}
              aria-label={t('dictate')}
            >
              <Mic className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        ) : null}

        <div className="notion-page-switcher__tools" ref={toolsRef}>
          <button
            type="button"
            className={`notion-page-switcher__tools-trigger ${
              activeToolPage ? 'notion-page-switcher__tools-trigger--active' : ''
            }`}
            aria-haspopup="menu"
            aria-expanded={toolsOpen}
            onClick={() => setToolsOpen((current) => !current)}
          >
            {activeToolPage
              ? t(NOTION_PAGES.find((p) => p.id === activePage)?.labelKey ?? 'notionToolsMenu')
              : t('notionToolsMenu')}
            <ChevronDown className="h-3 w-3 opacity-60" strokeWidth={2} aria-hidden />
          </button>

          {toolsOpen ? (
            <div className="notion-page-switcher__tools-menu" role="menu">
              {TOOL_PAGES.map((page) => {
                const Icon = toolPageIcons[page.id]
                return (
                  <button
                    key={page.id}
                    type="button"
                    role="menuitem"
                    className={`notion-page-switcher__tools-item ${
                      activePage === page.id ? 'notion-page-switcher__tools-item--active' : ''
                    }`}
                    onClick={() => {
                      onSelect(page.id)
                      setToolsOpen(false)
                    }}
                  >
                    {Icon ? (
                      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                    ) : null}
                    {t(page.labelKey)}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  )
}
