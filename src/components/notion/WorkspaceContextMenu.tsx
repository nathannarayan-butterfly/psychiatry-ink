import { Check, ChevronRight, FileText, FlaskConical, GitBranch, LineChart } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { NOTION_PAGES, type NotionPageId } from './notionPages'

const DOCUMENT_PAGES = NOTION_PAGES.filter((page) => page.kind === 'document')
const TOOL_PAGES = NOTION_PAGES.filter((page) => page.kind === 'lab')
const ALL_PAGES = [...DOCUMENT_PAGES, ...TOOL_PAGES]

const TOOL_ICONS: Partial<Record<NotionPageId, typeof FlaskConical>> = {
  labor: FlaskConical,
  visualisation: LineChart,
  timeline: GitBranch,
}

export interface SubsectionItem {
  id: string
  label: string
}

interface MenuPosition {
  x: number
  y: number
}

interface SubmenuState {
  pageId: NotionPageId
  top: number
  left: number
}

interface TemplateMenuAction {
  labelKey: UiTranslationKey
  onSelect: () => void
}

interface WorkspaceContextMenuProps {
  activePage: NotionPageId
  activeSectionId?: string | null
  pageSubsections?: Partial<Record<NotionPageId, SubsectionItem[]>>
  onSelect: (pageId: NotionPageId) => void
  onSelectWithSection?: (pageId: NotionPageId, sectionId: string) => void
  templateAction?: TemplateMenuAction
  children: ReactNode
}

export function WorkspaceContextMenu({
  activePage,
  activeSectionId,
  pageSubsections,
  onSelect,
  onSelectWithSection,
  templateAction,
  children,
}: WorkspaceContextMenuProps) {
  const { t } = useTranslation()
  const [menu, setMenu] = useState<MenuPosition | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [openSubmenu, setOpenSubmenu] = useState<SubmenuState | null>(null)
  const [submenuFocusedIndex, setSubmenuFocusedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const submenuRef = useRef<HTMLDivElement>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHoverTimer = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }

  const close = () => {
    clearHoverTimer()
    setMenu(null)
    setOpenSubmenu(null)
  }

  const handleContextMenu = (event: React.MouseEvent) => {
    // Only respond to genuine right-click (button 2); keyboard context-menu key
    // or trackpad gestures that produce button !== 2 should not open the workspace
    // navigation menu (they may land on non-textarea ancestors inside AMDP sections).
    if (event.button !== 2) return

    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.closest('[contenteditable="true"]') ||
      // Exclude right-clicks inside any editor area (section headings, copy
      // buttons, checklist containers, section <section> wrappers, etc.) so
      // AMDP inline sections don't accidentally trigger the workspace menu.
      target.closest('.notion-editor')
    ) {
      return
    }
    event.preventDefault()
    const MENU_WIDTH = 216
    const MENU_HEIGHT = templateAction ? 400 : 340
    const x = Math.min(event.clientX, window.innerWidth - MENU_WIDTH - 8)
    const y = Math.min(event.clientY, window.innerHeight - MENU_HEIGHT - 8)
    setMenu({ x, y })
    setOpenSubmenu(null)
    const activeIdx = ALL_PAGES.findIndex((p) => p.id === activePage)
    setFocusedIndex(activeIdx >= 0 ? activeIdx : 0)
  }

  const handleSelect = (pageId: NotionPageId) => {
    onSelect(pageId)
    close()
  }

  const handleSelectWithSection = (pageId: NotionPageId, sectionId: string) => {
    if (onSelectWithSection) {
      onSelectWithSection(pageId, sectionId)
    } else {
      onSelect(pageId)
    }
    close()
  }

  const handleTemplateSelect = () => {
    templateAction?.onSelect()
    close()
  }

  const menuItemCount = ALL_PAGES.length + (templateAction ? 1 : 0)

  const triggerSubmenu = (pageId: NotionPageId, itemEl: HTMLButtonElement) => {
    clearHoverTimer()
    hoverTimerRef.current = setTimeout(() => {
      const rect = itemEl.getBoundingClientRect()
      const SUBMENU_WIDTH = 242
      const spaceRight = window.innerWidth - rect.right - 8
      const left =
        spaceRight >= SUBMENU_WIDTH ? rect.right + 2 : rect.left - SUBMENU_WIDTH - 2

      const SUBMENU_APPROX_HEIGHT = 280
      const top = Math.min(rect.top, window.innerHeight - SUBMENU_APPROX_HEIGHT - 8)

      setOpenSubmenu({ pageId, top: Math.max(8, top), left })
      setSubmenuFocusedIndex(0)
    }, 100)
  }

  const handleItemMouseEnter = (
    pageId: NotionPageId,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    clearHoverTimer()
    const subsections = pageSubsections?.[pageId]
    if (subsections?.length) {
      triggerSubmenu(pageId, event.currentTarget)
    } else {
      setOpenSubmenu(null)
    }
  }

  const handleItemMouseLeave = (pageId: NotionPageId) => {
    if (openSubmenu?.pageId === pageId) {
      clearHoverTimer()
      hoverTimerRef.current = setTimeout(() => {
        setOpenSubmenu((prev) => (prev?.pageId === pageId ? null : prev))
      }, 200)
    }
  }

  // Main menu keyboard + outside-click
  useEffect(() => {
    if (!menu) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (openSubmenu) {
        const subsections = pageSubsections?.[openSubmenu.pageId] ?? []
        switch (event.key) {
          case 'Escape':
            setOpenSubmenu(null)
            break
          case 'ArrowLeft':
            event.preventDefault()
            setOpenSubmenu(null)
            break
          case 'ArrowDown':
            event.preventDefault()
            setSubmenuFocusedIndex((i) => Math.min(i + 1, subsections.length - 1))
            break
          case 'ArrowUp':
            event.preventDefault()
            setSubmenuFocusedIndex((i) => Math.max(i - 1, 0))
            break
          case 'Enter':
          case ' ': {
            event.preventDefault()
            const section = subsections[submenuFocusedIndex]
            if (section) handleSelectWithSection(openSubmenu.pageId, section.id)
            break
          }
          default:
            break
        }
        return
      }

      switch (event.key) {
        case 'Escape':
          close()
          break
        case 'ArrowDown':
          event.preventDefault()
          setFocusedIndex((i) => Math.min(i + 1, menuItemCount - 1))
          break
        case 'ArrowUp':
          event.preventDefault()
          setFocusedIndex((i) => Math.max(i - 1, 0))
          break
        case 'ArrowRight': {
          event.preventDefault()
          const page = ALL_PAGES[focusedIndex]
          if (page && pageSubsections?.[page.id]?.length) {
            const items =
              menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
            const focusedEl = items?.[focusedIndex]
            if (focusedEl) triggerSubmenu(page.id, focusedEl)
          }
          break
        }
        case 'Enter':
        case ' ': {
          event.preventDefault()
          if (focusedIndex >= ALL_PAGES.length) {
            handleTemplateSelect()
          } else {
            const page = ALL_PAGES[focusedIndex]
            if (page) handleSelect(page.id)
          }
          break
        }
        default:
          break
      }
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !submenuRef.current?.contains(event.target as Node)
      ) {
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, focusedIndex, openSubmenu, submenuFocusedIndex, pageSubsections])

  // Sync keyboard focus to focused item in main menu
  useEffect(() => {
    if (!menu || openSubmenu) return
    const items = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    items?.[focusedIndex]?.focus()
  }, [menu, focusedIndex, openSubmenu])

  // Sync keyboard focus inside submenu
  useEffect(() => {
    if (!openSubmenu) return
    const items = submenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    items?.[submenuFocusedIndex]?.focus()
  }, [openSubmenu, submenuFocusedIndex])

  const openSubmenuSections = openSubmenu ? (pageSubsections?.[openSubmenu.pageId] ?? []) : []

  const renderItem = (page: (typeof ALL_PAGES)[number], globalIndex: number) => {
    const Icon = TOOL_ICONS[page.id]
    const subsections = pageSubsections?.[page.id]
    const hasSub = Boolean(subsections?.length)
    const isActive = activePage === page.id

    return (
      <button
        key={page.id}
        type="button"
        role="menuitem"
        tabIndex={focusedIndex === globalIndex ? 0 : -1}
        className={[
          'workspace-context-menu__item',
          isActive ? 'workspace-context-menu__item--active' : '',
          hasSub ? 'workspace-context-menu__item--has-sub' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => handleSelect(page.id)}
        onMouseEnter={(e) => {
          setFocusedIndex(globalIndex)
          handleItemMouseEnter(page.id, e)
        }}
        onMouseLeave={() => handleItemMouseLeave(page.id)}
      >
        {Icon ? (
          <Icon
            className="workspace-context-menu__item-icon h-3.5 w-3.5"
            strokeWidth={1.75}
            aria-hidden
          />
        ) : null}
        <span className="workspace-context-menu__item-label">{t(page.labelKey)}</span>
        {hasSub ? (
          <ChevronRight
            className="workspace-context-menu__item-arrow h-3 w-3"
            strokeWidth={2}
            aria-hidden
          />
        ) : isActive ? (
          <Check
            className="workspace-context-menu__item-check h-3 w-3"
            strokeWidth={2.5}
            aria-hidden
          />
        ) : null}
      </button>
    )
  }

  return (
    <div className="workspace-context-surface" onContextMenu={handleContextMenu}>
      {children}
      {menu
        ? createPortal(
            <>
              <div
                ref={menuRef}
                role="menu"
                aria-label={t('notionContextMenuLabel')}
                className="workspace-context-menu"
                style={{ top: menu.y, left: menu.x }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <p className="workspace-context-menu__heading">
                  {t('notionContextMenuDocuments')}
                </p>
                {DOCUMENT_PAGES.map((page, index) => renderItem(page, index))}

                <div className="workspace-context-menu__sep" role="separator" />

                <p className="workspace-context-menu__heading">
                  {t('notionContextMenuTools')}
                </p>
                {TOOL_PAGES.map((page, index) => renderItem(page, DOCUMENT_PAGES.length + index))}

                {templateAction ? (
                  <>
                    <div className="workspace-context-menu__sep" role="separator" />
                    <p className="workspace-context-menu__heading">
                      {t('dokumenteCategoryFormulare')}
                    </p>
                    <button
                      type="button"
                      role="menuitem"
                      tabIndex={focusedIndex === ALL_PAGES.length ? 0 : -1}
                      className="workspace-context-menu__item"
                      onClick={handleTemplateSelect}
                      onMouseEnter={() => {
                        setFocusedIndex(ALL_PAGES.length)
                        setOpenSubmenu(null)
                      }}
                    >
                      <FileText
                        className="workspace-context-menu__item-icon h-3.5 w-3.5"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <span className="workspace-context-menu__item-label">
                        {t(templateAction.labelKey)}
                      </span>
                    </button>
                  </>
                ) : null}
              </div>

              {openSubmenu && openSubmenuSections.length > 0
                ? createPortal(
                    <div
                      ref={submenuRef}
                      role="menu"
                      aria-label={t('notionContextMenuSectionsLabel')}
                      className="workspace-context-submenu"
                      style={{ top: openSubmenu.top, left: openSubmenu.left }}
                      onContextMenu={(e) => e.preventDefault()}
                      onMouseEnter={clearHoverTimer}
                      onMouseLeave={() => setOpenSubmenu(null)}
                    >
                      {openSubmenuSections.map((section, index) => (
                        <button
                          key={section.id}
                          type="button"
                          role="menuitem"
                          tabIndex={submenuFocusedIndex === index ? 0 : -1}
                          className={[
                            'workspace-context-menu__item',
                            activePage === openSubmenu.pageId &&
                            activeSectionId === section.id
                              ? 'workspace-context-menu__item--active'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() =>
                            handleSelectWithSection(openSubmenu.pageId, section.id)
                          }
                          onMouseEnter={() => setSubmenuFocusedIndex(index)}
                        >
                          <span className="workspace-context-menu__item-label">
                            {section.label}
                          </span>
                          {activePage === openSubmenu.pageId &&
                          activeSectionId === section.id ? (
                            <Check
                              className="workspace-context-menu__item-check h-3 w-3"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                          ) : null}
                        </button>
                      ))}
                    </div>,
                    document.body,
                  )
                : null}
            </>,
            document.body,
          )
        : null}
    </div>
  )
}
