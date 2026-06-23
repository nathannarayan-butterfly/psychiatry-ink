import {
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  FlaskConical,
  GitBranch,
  LineChart,
  ScrollText,
  Stethoscope,
  Activity,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import { isCommandMenuShortcut } from '../../utils/notionKeyboardShortcuts'
import {
  getVisibleNotionPages,
  type NotionPageConfig,
  type NotionPageId,
} from './notionPages'

const TOOL_ICONS: Partial<Record<NotionPageId, typeof FlaskConical>> = {
  labor: FlaskConical,
  visualisation: LineChart,
  befundung: Activity,
  arztbrief: ScrollText,
  'discharge-summary': FileText,
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
  kind: 'page' | 'templates'
  pageId?: NotionPageId
  top: number
  left: number
}

interface TemplateMenuAction {
  labelKey: UiTranslationKey
  onSelect: () => void
}

interface TemplateSubmenuConfig {
  labelKey: UiTranslationKey
  items: SubsectionItem[]
  onSelectTemplate: (templateId: string) => void
  onOpenPicker: () => void
}

interface WorkspaceContextMenuProps {
  activePage: NotionPageId
  activeSectionId?: string | null
  pageSubsections?: Partial<Record<NotionPageId, SubsectionItem[]>>
  onSelect: (pageId: NotionPageId) => void
  onSelectWithSection?: (pageId: NotionPageId, sectionId: string) => void
  templateAction?: TemplateMenuAction
  templateSubmenu?: TemplateSubmenuConfig
  /** Optional clinical-area actions (e.g. Konsil, Anforderung) exposed at the bottom of the menu. */
  konsilAction?: TemplateMenuAction
  anforderungAction?: TemplateMenuAction
  /** Increment to open the menu programmatically (toolbar button, etc.). */
  openMenuRequest?: number
  children: ReactNode
}

export function WorkspaceContextMenu({
  activePage,
  activeSectionId,
  pageSubsections,
  onSelect,
  onSelectWithSection,
  templateAction,
  templateSubmenu,
  konsilAction,
  anforderungAction,
  openMenuRequest = 0,
  children,
}: WorkspaceContextMenuProps) {
  const { t, language } = useTranslation()
  const { documentPages, toolPages, allPages } = useMemo(() => {
    const visible = getVisibleNotionPages(language)
    const documents = visible.filter((page) => page.kind === 'document')
    const tools = visible.filter((page) => page.kind === 'lab')
    return { documentPages: documents, toolPages: tools, allPages: [...documents, ...tools] }
  }, [language])
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

  const clinicalAreaCount = (konsilAction ? 1 : 0) + (anforderungAction ? 1 : 0)
  const clinicalAreasHeight =
    clinicalAreaCount > 0 ? 60 + Math.max(0, clinicalAreaCount - 1) * 40 : 0
  const extraItemsHeight =
    (templateAction || templateSubmenu ? 60 : 0) + clinicalAreasHeight

  const openMenuAt = useCallback(
    (clientX: number, clientY: number) => {
      const MENU_WIDTH = 216
      const MENU_HEIGHT = 340 + extraItemsHeight
      const x = Math.max(8, Math.min(clientX, window.innerWidth - MENU_WIDTH - 8))
      const y = Math.max(8, Math.min(clientY, window.innerHeight - MENU_HEIGHT - 8))
      setMenu({ x, y })
      setOpenSubmenu(null)
      const activeIdx = allPages.findIndex((p) => p.id === activePage)
      setFocusedIndex(activeIdx >= 0 ? activeIdx : 0)
    },
    [activePage, allPages, extraItemsHeight],
  )

  const openMenuAtCenter = useCallback(() => {
    const MENU_WIDTH = 216
    const MENU_HEIGHT = 340 + extraItemsHeight
    openMenuAt(
      (window.innerWidth - MENU_WIDTH) / 2,
      (window.innerHeight - MENU_HEIGHT) / 2,
    )
  }, [openMenuAt, extraItemsHeight])

  useEffect(() => {
    if (openMenuRequest === 0) return
    openMenuAtCenter()
  }, [openMenuRequest, openMenuAtCenter])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isCommandMenuShortcut(event)) return
      event.preventDefault()
      event.stopPropagation()
      openMenuAtCenter()
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [openMenuAtCenter])

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
    openMenuAt(event.clientX, event.clientY)
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

  const handleKonsilSelect = () => {
    konsilAction?.onSelect()
    close()
  }

  const handleAnforderungSelect = () => {
    anforderungAction?.onSelect()
    close()
  }

  // Index layout: [...allPages, konsilAction?, anforderungAction?, templateAction?]
  const konsilIndex = konsilAction ? allPages.length : -1
  const anforderungIndex = anforderungAction
    ? allPages.length + (konsilAction ? 1 : 0)
    : -1
  const templateIndex =
    templateAction || templateSubmenu ? allPages.length + clinicalAreaCount : -1
  const menuItemCount =
    allPages.length + clinicalAreaCount + (templateAction || templateSubmenu ? 1 : 0)

  const triggerSubmenuAt = (itemEl: HTMLButtonElement, state: SubmenuState) => {
    clearHoverTimer()
    hoverTimerRef.current = setTimeout(() => {
      const rect = itemEl.getBoundingClientRect()
      const SUBMENU_WIDTH = 242
      const spaceRight = window.innerWidth - rect.right - 8
      const left =
        spaceRight >= SUBMENU_WIDTH ? rect.right + 2 : rect.left - SUBMENU_WIDTH - 2

      const SUBMENU_APPROX_HEIGHT = 280
      const top = Math.min(rect.top, window.innerHeight - SUBMENU_APPROX_HEIGHT - 8)

      setOpenSubmenu({ ...state, top: Math.max(8, top), left })
      setSubmenuFocusedIndex(0)
    }, 100)
  }

  const triggerSubmenu = (pageId: NotionPageId, itemEl: HTMLButtonElement) => {
    triggerSubmenuAt(itemEl, { kind: 'page', pageId, top: 0, left: 0 })
  }

  const triggerTemplateSubmenu = (itemEl: HTMLButtonElement) => {
    triggerSubmenuAt(itemEl, { kind: 'templates', top: 0, left: 0 })
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
    if (openSubmenu?.kind === 'page' && openSubmenu.pageId === pageId) {
      clearHoverTimer()
      hoverTimerRef.current = setTimeout(() => {
        setOpenSubmenu((prev) =>
          prev?.kind === 'page' && prev.pageId === pageId ? null : prev,
        )
      }, 200)
    }
  }

  // Main menu keyboard + outside-click
  useEffect(() => {
    if (!menu) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (openSubmenu) {
        const templateItems = templateSubmenu?.items ?? []
        const pageSections =
          openSubmenu.kind === 'page' && openSubmenu.pageId
            ? (pageSubsections?.[openSubmenu.pageId] ?? [])
            : []
        const subsections =
          openSubmenu.kind === 'templates'
            ? [
                ...templateItems,
                { id: '__browse__', label: t('workspaceVorlagenBrowseAll') },
              ]
            : pageSections
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
            if (!section) break
            if (openSubmenu.kind === 'templates') {
              if (section.id === '__browse__') {
                templateSubmenu?.onOpenPicker()
              } else {
                templateSubmenu?.onSelectTemplate(section.id)
              }
              close()
            } else if (openSubmenu.pageId) {
              handleSelectWithSection(openSubmenu.pageId, section.id)
            }
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
          const page = allPages[focusedIndex]
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
          if (konsilAction && focusedIndex === konsilIndex) {
            handleKonsilSelect()
          } else if (anforderungAction && focusedIndex === anforderungIndex) {
            handleAnforderungSelect()
          } else if (templateSubmenu && focusedIndex === templateIndex) {
            if (templateSubmenu.items.length > 0) {
              const items =
                menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
              const focusedEl = items?.[focusedIndex]
              if (focusedEl) triggerTemplateSubmenu(focusedEl)
            } else {
              templateSubmenu.onOpenPicker()
            }
          } else if (templateAction && focusedIndex === templateIndex) {
            handleTemplateSelect()
          } else {
            const page = allPages[focusedIndex]
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

  const openSubmenuSections =
    openSubmenu?.kind === 'templates'
      ? [
          ...(templateSubmenu?.items ?? []),
          { id: '__browse__', label: t('workspaceVorlagenBrowseAll') },
        ]
      : openSubmenu?.kind === 'page' && openSubmenu.pageId
        ? (pageSubsections?.[openSubmenu.pageId] ?? [])
        : []

  const renderItem = (page: NotionPageConfig, globalIndex: number) => {
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
                {documentPages.map((page, index) => renderItem(page, index))}

                <div className="workspace-context-menu__sep" role="separator" />

                <p className="workspace-context-menu__heading">
                  {t('notionContextMenuTools')}
                </p>
                {toolPages.map((page, index) => renderItem(page, documentPages.length + index))}

                {clinicalAreaCount > 0 ? (
                  <>
                    <div className="workspace-context-menu__sep" role="separator" />
                    <p className="workspace-context-menu__heading">
                      {t('notionContextMenuAreas')}
                    </p>
                    {konsilAction ? (
                      <button
                        type="button"
                        role="menuitem"
                        tabIndex={focusedIndex === konsilIndex ? 0 : -1}
                        className="workspace-context-menu__item"
                        onClick={handleKonsilSelect}
                        onMouseEnter={() => {
                          setFocusedIndex(konsilIndex)
                          setOpenSubmenu(null)
                        }}
                      >
                        <Stethoscope
                          className="workspace-context-menu__item-icon h-3.5 w-3.5"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <span className="workspace-context-menu__item-label">
                          {t(konsilAction.labelKey)}
                        </span>
                      </button>
                    ) : null}
                    {anforderungAction ? (
                      <button
                        type="button"
                        role="menuitem"
                        tabIndex={focusedIndex === anforderungIndex ? 0 : -1}
                        className="workspace-context-menu__item"
                        onClick={handleAnforderungSelect}
                        onMouseEnter={() => {
                          setFocusedIndex(anforderungIndex)
                          setOpenSubmenu(null)
                        }}
                      >
                        <ClipboardList
                          className="workspace-context-menu__item-icon h-3.5 w-3.5"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <span className="workspace-context-menu__item-label">
                          {t(anforderungAction.labelKey)}
                        </span>
                      </button>
                    ) : null}
                  </>
                ) : null}

                {templateSubmenu ? (
                  <>
                    <div className="workspace-context-menu__sep" role="separator" />
                    <p className="workspace-context-menu__heading">
                      {t('dokumenteCategoryFormulare')}
                    </p>
                    <button
                      type="button"
                      role="menuitem"
                      tabIndex={focusedIndex === templateIndex ? 0 : -1}
                      className={[
                        'workspace-context-menu__item',
                        templateSubmenu.items.length
                          ? 'workspace-context-menu__item--has-sub'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        if (templateSubmenu.items.length === 0) {
                          templateSubmenu.onOpenPicker()
                          close()
                        }
                      }}
                      onMouseEnter={(e) => {
                        setFocusedIndex(templateIndex)
                        if (templateSubmenu.items.length) {
                          triggerTemplateSubmenu(e.currentTarget)
                        } else {
                          setOpenSubmenu(null)
                        }
                      }}
                      onMouseLeave={() => {
                        if (openSubmenu?.kind === 'templates') {
                          clearHoverTimer()
                          hoverTimerRef.current = setTimeout(() => {
                            setOpenSubmenu((prev) =>
                              prev?.kind === 'templates' ? null : prev,
                            )
                          }, 200)
                        }
                      }}
                    >
                      <FileText
                        className="workspace-context-menu__item-icon h-3.5 w-3.5"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <span className="workspace-context-menu__item-label">
                        {t(templateSubmenu.labelKey)}
                      </span>
                      {templateSubmenu.items.length ? (
                        <ChevronRight
                          className="workspace-context-menu__item-arrow h-3 w-3"
                          strokeWidth={2}
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </>
                ) : templateAction ? (
                  <>
                    <div className="workspace-context-menu__sep" role="separator" />
                    <p className="workspace-context-menu__heading">
                      {t('dokumenteCategoryFormulare')}
                    </p>
                    <button
                      type="button"
                      role="menuitem"
                      tabIndex={focusedIndex === templateIndex ? 0 : -1}
                      className="workspace-context-menu__item"
                      onClick={handleTemplateSelect}
                      onMouseEnter={() => {
                        setFocusedIndex(templateIndex)
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
                            openSubmenu.kind === 'page' &&
                            activePage === openSubmenu.pageId &&
                            activeSectionId === section.id
                              ? 'workspace-context-menu__item--active'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => {
                            if (openSubmenu.kind === 'templates') {
                              if (section.id === '__browse__') {
                                templateSubmenu?.onOpenPicker()
                              } else {
                                templateSubmenu?.onSelectTemplate(section.id)
                              }
                              close()
                              return
                            }
                            if (openSubmenu.pageId) {
                              handleSelectWithSection(openSubmenu.pageId, section.id)
                            }
                          }}
                          onMouseEnter={() => setSubmenuFocusedIndex(index)}
                        >
                          <span className="workspace-context-menu__item-label">
                            {section.label}
                          </span>
                          {openSubmenu.kind === 'page' &&
                          activePage === openSubmenu.pageId &&
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
