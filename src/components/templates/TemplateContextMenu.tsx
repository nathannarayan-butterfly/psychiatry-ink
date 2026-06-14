import { useEffect, useRef } from 'react'
import type { FieldMenuCategory } from '../../utils/documentTemplate/constants'
import { FIELD_MENU_CATEGORIES, FIELD_MENU_ITEMS } from '../../utils/documentTemplate/constants'
import type { TemplateFieldType } from '../../types/documentTemplate'

export interface ContextMenuState {
  x: number
  y: number
  insertAt: number
}

interface TemplateContextMenuProps {
  state: ContextMenuState
  lang: 'de' | 'en'
  onSelect: (type: TemplateFieldType | 'page_settings', insertAt: number) => void
  onClose: () => void
}

export function TemplateContextMenu({ state, lang, onSelect, onClose }: TemplateContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', handler)
    window.addEventListener('keydown', keyHandler)
    return () => {
      window.removeEventListener('mousedown', handler)
      window.removeEventListener('keydown', keyHandler)
    }
  }, [onClose])

  const itemsByCategory = FIELD_MENU_CATEGORIES.map((cat) => ({
    ...cat,
    items: FIELD_MENU_ITEMS.filter((item) => item.category === cat.id),
  })).filter((cat) => cat.items.length > 0)

  return (
    <div
      ref={ref}
      className="dt-context-menu"
      style={{ left: state.x, top: state.y }}
      role="menu"
    >
      <div className="dt-context-menu__title">
        {lang === 'de' ? 'Feld hinzufügen' : 'Add field'}
      </div>
      {itemsByCategory.map((cat) => (
        <div key={cat.id} className="dt-context-menu__section">
          <div className="dt-context-menu__section-label">
            {lang === 'de' ? cat.labelDe : cat.labelEn}
          </div>
          {cat.items.map((item, idx) => (
            <button
              key={`${item.type}-${item.defaultBinding ?? idx}`}
              type="button"
              className="dt-context-menu__item"
              role="menuitem"
              onClick={() => {
                onSelect(item.type, state.insertAt)
                onClose()
              }}
            >
              {lang === 'de' ? item.labelDe : item.labelEn}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

export function categoryLabelForMenu(cat: FieldMenuCategory, lang: 'de' | 'en'): string {
  const match = FIELD_MENU_CATEGORIES.find((c) => c.id === cat)
  if (!match) return cat
  return lang === 'de' ? match.labelDe : match.labelEn
}
